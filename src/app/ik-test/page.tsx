"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { PositionIKAvatar } from "@/components/avatar/PositionIKAvatar";

const DEFAULT_AVATAR_URL =
  "https://models.readyplayer.me/6977720002217beb7bb9b2ae.glb?morphTargets=ARKit&textureAtlas=1024";

const AVAILABLE_SIGNS = ["deaf", "help", "dog", "year"];

interface SignData {
  gloss: string;
  frameCount: number;
  fps: number;
  frames: FrameData[];
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface FingerJoints {
  index: Vec3[];
  middle: Vec3[];
  ring: Vec3[];
  pinky: Vec3[];
  thumb: Vec3[];
}

interface FrameData {
  head: Vec3;
  neck: Vec3;
  leftShoulder: Vec3;
  rightShoulder: Vec3;
  leftElbow: Vec3;
  rightElbow: Vec3;
  leftWrist: Vec3;
  rightWrist: Vec3;
  leftFingers: FingerJoints;
  rightFingers: FingerJoints;
}

function LoadingAvatar() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 1, 0.3]} />
      <meshStandardMaterial color="#666" wireframe />
    </mesh>
  );
}

export default function IKTestPage() {
  const [signData, setSignData] = useState<SignData | null>(null);
  const [selectedSign, setSelectedSign] = useState("deaf");
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(true);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Load sign data
  useEffect(() => {
    fetch(`/ik_data/${selectedSign}.json`)
      .then((r) => r.json())
      .then((data: SignData) => {
        console.log("[IKTest] Loaded:", data.gloss, data.frameCount, "frames");
        setSignData(data);
        setCurrentFrame(0);
        setIsPlaying(false);
      })
      .catch((e) => console.error("Failed to load sign:", e));
  }, [selectedSign]);

  // Animation loop
  const animate = useCallback(
    (timestamp: number) => {
      if (!signData || !isPlaying) return;

      const delta = timestamp - lastTimeRef.current;
      const frameTime = 1000 / signData.fps / speed;

      if (delta >= frameTime) {
        lastTimeRef.current = timestamp;
        setCurrentFrame((prev) => {
          const next = prev + 1;
          if (next >= signData.frameCount) {
            if (loop) {
              return 0; // Loop back
            } else {
              setIsPlaying(false);
              return signData.frameCount - 1;
            }
          }
          return next;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    },
    [signData, isPlaying, speed, loop],
  );

  useEffect(() => {
    if (isPlaying && signData) {
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, signData, animate]);

  const currentFrameData = signData?.frames[currentFrame] ?? null;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Position-Based IK Test</h1>
        <p className="text-slate-400 text-sm mb-4">
          SMPL-X joint positions → IK → RPM avatar
        </p>

        {/* Sign Selector */}
        <div className="mb-4 flex gap-2 flex-wrap">
          {AVAILABLE_SIGNS.map((sign) => (
            <button
              key={sign}
              onClick={() => setSelectedSign(sign)}
              className={`px-4 py-2 rounded-lg font-mono uppercase transition ${
                selectedSign === sign
                  ? "bg-blue-600"
                  : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              {sign}
            </button>
          ))}
        </div>

        {/* Avatar Preview */}
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
              <PositionIKAvatar
                url={DEFAULT_AVATAR_URL}
                frame={currentFrameData}
              />
            </Suspense>

            {/* DEBUG: Test sphere directly in Canvas - should appear in front of avatar */}
            <mesh position={[0, 0, 1]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial color="magenta" />
            </mesh>

            <Environment preset="studio" />
            <OrbitControls
              enablePan={false}
              minDistance={0.8}
              maxDistance={3}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 1.5}
            />
          </Canvas>

          {/* Sign label */}
          {signData && (
            <div className="absolute top-4 left-4 bg-slate-800/80 px-4 py-2 rounded-lg">
              <span className="font-mono text-lg uppercase">
                {signData.gloss}
              </span>
            </div>
          )}

          {/* IK badge */}
          <div className="absolute top-4 right-4 bg-blue-600/80 px-3 py-1 rounded-full">
            <span className="text-sm">Position IK</span>
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
              <span>{signData?.frameCount || 0} total</span>
            </div>
            <input
              type="range"
              min={0}
              max={signData?.frameCount ? signData.frameCount - 1 : 0}
              value={currentFrame}
              onChange={(e) => {
                setCurrentFrame(parseInt(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              disabled={!signData}
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={!signData}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded-lg font-medium transition"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={() => {
                setCurrentFrame(0);
                setIsPlaying(false);
              }}
              disabled={!signData}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 rounded-lg transition"
            >
              Reset
            </button>

            {/* Loop toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={loop}
                onChange={(e) => setLoop(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Loop</span>
            </label>

            {/* Speed control */}
            <div className="flex items-center gap-2 ml-4">
              <span className="text-slate-400 text-sm">Speed:</span>
              <select
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="bg-slate-700 rounded px-2 py-1 text-sm"
              >
                <option value="0.25">0.25x</option>
                <option value="0.5">0.5x</option>
                <option value="1">1x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>

            {/* Duration */}
            {signData && (
              <span className="text-slate-400 text-sm ml-auto">
                {(signData.frameCount / signData.fps).toFixed(1)}s @{" "}
                {signData.fps}fps
              </span>
            )}
          </div>
        </div>

        {/* Debug info */}
        {currentFrameData && (
          <div className="mt-4 bg-slate-800 rounded-lg p-4">
            <h2 className="font-semibold mb-2">
              Joint Positions (Frame {currentFrame})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-green-400">L Wrist:</span>
                <br />
                x: {currentFrameData.leftWrist.x.toFixed(3)}
                <br />
                y: {currentFrameData.leftWrist.y.toFixed(3)}
                <br />
                z: {currentFrameData.leftWrist.z.toFixed(3)}
              </div>
              <div>
                <span className="text-red-400">R Wrist:</span>
                <br />
                x: {currentFrameData.rightWrist.x.toFixed(3)}
                <br />
                y: {currentFrameData.rightWrist.y.toFixed(3)}
                <br />
                z: {currentFrameData.rightWrist.z.toFixed(3)}
              </div>
              <div>
                <span className="text-blue-400">L Elbow:</span>
                <br />
                x: {currentFrameData.leftElbow.x.toFixed(3)}
                <br />
                y: {currentFrameData.leftElbow.y.toFixed(3)}
                <br />
                z: {currentFrameData.leftElbow.z.toFixed(3)}
              </div>
              <div>
                <span className="text-yellow-400">R Elbow:</span>
                <br />
                x: {currentFrameData.rightElbow.x.toFixed(3)}
                <br />
                y: {currentFrameData.rightElbow.y.toFixed(3)}
                <br />
                z: {currentFrameData.rightElbow.z.toFixed(3)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
