"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { SignMotionAvatarIK } from "@/components/avatar/SignMotionAvatarIK";
import { loadMotionLocal, listSavedMotions } from "@/lib/motion/capture";
import type { SignMotion, Vec3 } from "@/lib/motion/types";
import type { AvatarPose, FingerPose } from "@/lib/motion/playback";

const DEFAULT_AVATAR_URL =
  "https://models.readyplayer.me/6977720002217beb7bb9b2ae.glb?morphTargets=ARKit&textureAtlas=1024";

function LoadingAvatar() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 1, 0.3]} />
      <meshStandardMaterial color="#666" wireframe />
    </mesh>
  );
}

// Extract wrist targets from motion frame
function getWristTargets(motion: SignMotion, frameIndex: number) {
  const body = motion.body[frameIndex];
  if (!body?.joints) return { rightWrist: undefined, leftWrist: undefined };

  return {
    rightWrist: body.joints.rightWrist?.position,
    leftWrist: body.joints.leftWrist?.position,
  };
}

// Extract finger curls from hand frame
function extractFingerPose(
  landmarks: { position: Vec3 }[] | undefined,
): FingerPose {
  const defaultCurl: [number, number, number] = [0, 0, 0];
  if (!landmarks || landmarks.length < 21) {
    return {
      thumb: defaultCurl,
      index: defaultCurl,
      middle: defaultCurl,
      ring: defaultCurl,
      pinky: defaultCurl,
    };
  }

  // Calculate curl from angle between joints
  const calcCurl = (
    mcp: number,
    pip: number,
    dip: number,
    tip: number,
  ): [number, number, number] => {
    const angleBetween = (a: Vec3, b: Vec3, c: Vec3): number => {
      const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
      const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
      const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
      const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2);
      const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2);
      if (magBA === 0 || magBC === 0) return Math.PI;
      return Math.acos(Math.max(-1, Math.min(1, dot / (magBA * magBC))));
    };

    const toCurl = (angle: number) =>
      Math.max(0, Math.min(1, 1 - (angle - Math.PI / 2) / (Math.PI / 2)));

    return [
      toCurl(
        angleBetween(
          landmarks[0].position,
          landmarks[mcp].position,
          landmarks[pip].position,
        ),
      ),
      toCurl(
        angleBetween(
          landmarks[mcp].position,
          landmarks[pip].position,
          landmarks[dip].position,
        ),
      ),
      toCurl(
        angleBetween(
          landmarks[pip].position,
          landmarks[dip].position,
          landmarks[tip].position,
        ),
      ),
    ];
  };

  return {
    thumb: calcCurl(1, 2, 3, 4),
    index: calcCurl(5, 6, 7, 8),
    middle: calcCurl(9, 10, 11, 12),
    ring: calcCurl(13, 14, 15, 16),
    pinky: calcCurl(17, 18, 19, 20),
  };
}

// Create minimal pose for fingers/face (IK handles arms)
function getMinimalPose(motion: SignMotion, frameIndex: number): AvatarPose {
  const rightHand = motion.rightHand[frameIndex];
  const leftHand = motion.leftHand[frameIndex];
  const face = motion.face[frameIndex];

  return {
    rightArm: { x: 0, y: 0, z: 0 },
    rightForeArm: { x: 0, y: 0, z: 0 },
    rightHand: { x: 0, y: 0, z: 0 },
    leftArm: { x: 0, y: 0, z: 0 },
    leftForeArm: { x: 0, y: 0, z: 0 },
    leftHand: { x: 0, y: 0, z: 0 },
    rightFingers: extractFingerPose(rightHand?.landmarks),
    leftFingers: extractFingerPose(leftHand?.landmarks),
    faceBlendshapes: face?.blendshapes || {},
    headRotation: { x: 0, y: 0, z: 0 },
  };
}

export default function PlaybackIKPage() {
  const [savedMotions, setSavedMotions] = useState<string[]>([]);
  const [selectedMotion, setSelectedMotion] = useState<string | null>(null);
  const [motion, setMotion] = useState<SignMotion | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Load saved motions list
  useEffect(() => {
    setSavedMotions(listSavedMotions());
  }, []);

  // Load selected motion
  const handleSelectMotion = (gloss: string) => {
    const loaded = loadMotionLocal(gloss);
    if (loaded) {
      setMotion(loaded);
      setSelectedMotion(gloss);
      setCurrentFrame(0);
      setIsPlaying(false);
      console.log("[PlaybackIK] Loaded:", gloss, loaded.frameCount, "frames");
    }
  };

  // Animation loop
  const animate = useCallback(
    (timestamp: number) => {
      if (!motion || !isPlaying) return;

      const delta = timestamp - lastTimeRef.current;
      const frameTime = 1000 / motion.fps / speed;

      if (delta >= frameTime) {
        lastTimeRef.current = timestamp;
        setCurrentFrame((prev) => {
          const next = prev + 1;
          if (next >= motion.frameCount) {
            setIsPlaying(false);
            return motion.frameCount - 1;
          }
          return next;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    },
    [motion, isPlaying, speed],
  );

  useEffect(() => {
    if (isPlaying && motion) {
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, motion, animate]);

  // Get current targets and pose
  const targets = motion ? getWristTargets(motion, currentFrame) : undefined;
  const pose = motion ? getMinimalPose(motion, currentFrame) : null;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">IK Playback</h1>
        <p className="text-slate-400 text-sm mb-4">
          Using Inverse Kinematics for arm positioning
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Avatar Preview */}
          <div className="lg:col-span-3">
            <div
              className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl overflow-hidden"
              style={{ aspectRatio: "4/3" }}
            >
              <Canvas
                camera={{ position: [0, 0.5, 2], fov: 50 }}
                shadows
                gl={{ antialias: true, alpha: true }}
              >
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 5, 5]} intensity={0.8} />
                <directionalLight position={[-3, 3, 2]} intensity={0.4} />

                <Suspense fallback={<LoadingAvatar />}>
                  <SignMotionAvatarIK
                    url={DEFAULT_AVATAR_URL}
                    pose={pose}
                    targets={targets}
                  />
                </Suspense>

                <Environment preset="studio" />
                <OrbitControls
                  enablePan={false}
                  minDistance={0.8}
                  maxDistance={3}
                  minPolarAngle={Math.PI / 4}
                  maxPolarAngle={Math.PI / 1.5}
                />
              </Canvas>

              {/* Overlay - Current Sign */}
              {motion && (
                <div className="absolute top-4 left-4 bg-slate-800/80 px-4 py-2 rounded-lg">
                  <span className="font-mono text-lg">{motion.gloss}</span>
                </div>
              )}

              {/* IK Badge */}
              <div className="absolute top-4 right-4 bg-green-600/80 px-3 py-1 rounded-full">
                <span className="text-sm">IK Mode</span>
              </div>

              {/* Playing indicator */}
              {isPlaying && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-green-600/80 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-sm">Playing</span>
                </div>
              )}
            </div>

            {/* Playback Controls */}
            <div className="mt-4 bg-slate-800 rounded-lg p-4">
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Frame {currentFrame}</span>
                  <span>{motion?.frameCount || 0} total</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={motion?.frameCount ? motion.frameCount - 1 : 0}
                  value={currentFrame}
                  onChange={(e) => {
                    setCurrentFrame(parseInt(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  disabled={!motion}
                />
              </div>

              {/* Control buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={!motion}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded-lg font-medium transition"
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  onClick={() => {
                    setCurrentFrame(0);
                    setIsPlaying(false);
                  }}
                  disabled={!motion}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 rounded-lg transition"
                >
                  Reset
                </button>

                {/* Speed control */}
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-slate-400 text-sm">Speed:</span>
                  <select
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="bg-slate-700 rounded px-2 py-1 text-sm"
                    defaultValue="1"
                  >
                    <option value="0.25">0.25x</option>
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                </div>

                {/* Duration */}
                {motion && (
                  <span className="text-slate-400 text-sm ml-auto">
                    {(motion.durationMs / 1000).toFixed(1)}s @ {motion.fps}fps
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Saved Motions */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h2 className="font-semibold mb-3">Saved Signs</h2>
              {savedMotions.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  No signs captured yet.
                  <br />
                  Go to{" "}
                  <a href="/capture" className="text-blue-400 underline">
                    /capture
                  </a>{" "}
                  to record.
                </p>
              ) : (
                <div className="space-y-2">
                  {savedMotions.map((name) => (
                    <button
                      key={name}
                      onClick={() => handleSelectMotion(name)}
                      className={`w-full text-left px-3 py-2 rounded transition ${
                        selectedMotion === name
                          ? "bg-blue-600"
                          : "bg-slate-700 hover:bg-slate-600"
                      }`}
                    >
                      <span className="font-mono">{name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Debug - IK Targets */}
            {targets && (targets.rightWrist || targets.leftWrist) && (
              <div className="bg-slate-800 rounded-lg p-4">
                <h2 className="font-semibold mb-2">IK Targets</h2>
                <div className="text-xs text-slate-400 font-mono space-y-2">
                  {targets.rightWrist && (
                    <div>
                      <div className="text-green-400">Right Wrist:</div>
                      <div>x: {targets.rightWrist.x.toFixed(3)}</div>
                      <div>y: {targets.rightWrist.y.toFixed(3)}</div>
                      <div>z: {targets.rightWrist.z.toFixed(3)}</div>
                    </div>
                  )}
                  {targets.leftWrist && (
                    <div className="mt-2">
                      <div className="text-blue-400">Left Wrist:</div>
                      <div>x: {targets.leftWrist.x.toFixed(3)}</div>
                      <div>y: {targets.leftWrist.y.toFixed(3)}</div>
                      <div>z: {targets.leftWrist.z.toFixed(3)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-slate-800/50 rounded-lg p-4 text-xs text-slate-400">
              <p className="mb-2">
                <strong>IK Mode:</strong>
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Uses wrist positions as targets</li>
                <li>IK solver calculates arm rotations</li>
                <li>More natural arm movement</li>
              </ul>
            </div>

            {/* Compare link */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h2 className="font-semibold mb-2">Compare</h2>
              <a href="/playback" className="text-blue-400 underline text-sm">
                View rotation-based playback
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
