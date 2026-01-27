"use client";

import { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { SignMotionAvatar } from "@/components/avatar/SignMotionAvatar";
import { useMotionPlayback } from "@/lib/motion/useMotionPlayback";
import { loadMotionLocal, listSavedMotions } from "@/lib/motion/capture";
import type { SignMotion } from "@/lib/motion/types";

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

export default function PlaybackPage() {
  const [savedMotions, setSavedMotions] = useState<string[]>([]);
  const [selectedMotion, setSelectedMotion] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR_URL);

  const {
    isPlaying,
    currentFrame,
    currentPose,
    progress,
    play,
    pause,
    stop,
    seek,
    setSpeed,
    loadMotion,
    motion,
  } = useMotionPlayback();

  // Load saved motions list on mount
  useEffect(() => {
    setSavedMotions(listSavedMotions());
  }, []);

  // Load selected motion
  const handleSelectMotion = (gloss: string) => {
    const loaded = loadMotionLocal(gloss);
    if (loaded) {
      loadMotion(loaded);
      setSelectedMotion(gloss);
      console.log("[Playback] Loaded:", gloss, loaded.frameCount, "frames");
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        loadMotion(json as SignMotion);
        setSelectedMotion(json.gloss);
        console.log("[Playback] Loaded from file:", json.gloss);
      } catch (err) {
        console.error("[Playback] Failed to parse file:", err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Motion Playback</h1>
        <p className="text-slate-400 text-sm mb-4">
          Play captured SignMotion on avatar
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
                  <SignMotionAvatar url={avatarUrl} pose={currentPose} />
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

              {/* Overlay - Playing indicator */}
              {isPlaying && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-600/80 px-3 py-1 rounded-full">
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
                  onChange={(e) => seek(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  disabled={!motion}
                />
              </div>

              {/* Control buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={isPlaying ? pause : play}
                  disabled={!motion}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded-lg font-medium transition"
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  onClick={stop}
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

            {/* Load from file */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h2 className="font-semibold mb-3">Load from File</h2>
              <label className="block">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="block w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-center cursor-pointer transition">
                  Choose .signmotion.json
                </span>
              </label>
            </div>

            {/* Motion Info */}
            {motion && (
              <div className="bg-slate-800 rounded-lg p-4">
                <h2 className="font-semibold mb-3">Motion Info</h2>
                <div className="text-sm space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>Gloss:</span>
                    <span className="text-white">{motion.gloss}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frames:</span>
                    <span className="text-white">{motion.frameCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="text-white">
                      {(motion.durationMs / 1000).toFixed(2)}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>FPS:</span>
                    <span className="text-white">{motion.fps}</span>
                  </div>
                  {motion.metadata && (
                    <>
                      <div className="flex justify-between">
                        <span>Source:</span>
                        <span className="text-white">
                          {motion.metadata.captureSource}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Captured:</span>
                        <span className="text-white text-xs">
                          {new Date(
                            motion.metadata.capturedAt,
                          ).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Debug - Current Pose */}
            {currentPose && (
              <div className="bg-slate-800 rounded-lg p-4">
                <h2 className="font-semibold mb-2">Debug: Pose</h2>
                <div className="text-xs text-slate-400 font-mono space-y-1">
                  <div className="text-green-400">Right Arm:</div>
                  <div>x: {currentPose.rightArm.x.toFixed(3)}</div>
                  <div>y: {currentPose.rightArm.y.toFixed(3)}</div>
                  <div>z: {currentPose.rightArm.z.toFixed(3)}</div>
                  <div className="text-blue-400 mt-2">Right ForeArm:</div>
                  <div>x: {currentPose.rightForeArm.x.toFixed(3)}</div>
                  <div>y: {currentPose.rightForeArm.y.toFixed(3)}</div>
                  <div>z: {currentPose.rightForeArm.z.toFixed(3)}</div>
                  <div className="text-yellow-400 mt-2">R.Index Curl:</div>
                  <div>
                    [
                    {currentPose.rightFingers.index
                      .map((v) => v.toFixed(2))
                      .join(", ")}
                    ]
                  </div>
                </div>
              </div>
            )}

            {/* Manual Test Controls */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h2 className="font-semibold mb-2">Bone Tester</h2>
              <p className="text-xs text-slate-500 mb-2">
                Go to{" "}
                <a href="/bone-test" className="text-blue-400 underline">
                  /bone-test
                </a>{" "}
                to manually test bone rotations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
