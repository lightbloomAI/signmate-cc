"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { SMPLXAvatar } from "@/components/avatar/SMPLXAvatar";

const DEFAULT_AVATAR_URL =
  "https://models.readyplayer.me/6977720002217beb7bb9b2ae.glb?morphTargets=ARKit&textureAtlas=1024";

const AVAILABLE_SIGNS = ["deaf", "help", "dog", "year"];

interface SignData {
  gloss: string;
  fps: number;
  frameCount: number;
  smplx: number[][]; // [frame][182 params]
}

function LoadingAvatar() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 1, 0.3]} />
      <meshStandardMaterial color="#666" wireframe />
    </mesh>
  );
}

export default function SMPLXTestPage() {
  const [signData, setSignData] = useState<SignData | null>(null);
  const [selectedSign, setSelectedSign] = useState<string>("deaf");
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [enabledParts, setEnabledParts] = useState({
    root: true,
    spine: true,
    arms: true,
    legs: false,
    hands: true,
  });
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Load sign data
  useEffect(() => {
    fetch(`/signs/${selectedSign}.json`)
      .then((r) => r.json())
      .then((data: SignData) => {
        console.log(
          "[SMPLXTest] Loaded:",
          data.gloss,
          data.frameCount,
          "frames",
        );
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
            setIsPlaying(false);
            return signData.frameCount - 1;
          }
          return next;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    },
    [signData, isPlaying, speed],
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

  // Get current SMPL-X frame
  const smplxFrame = signData ? signData.smplx[currentFrame] : null;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">SMPL-X Retargeting Test</h1>
        <p className="text-slate-400 text-sm mb-4">
          Direct SMPL-X rotation → RPM bones
        </p>

        {/* Sign Selector */}
        <div className="mb-4 flex gap-2">
          {AVAILABLE_SIGNS.map((sign) => (
            <button
              key={sign}
              onClick={() => setSelectedSign(sign)}
              className={`px-4 py-2 rounded-lg font-mono uppercase transition ${
                selectedSign === sign
                  ? "bg-purple-600"
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
              <SMPLXAvatar
                url={DEFAULT_AVATAR_URL}
                smplxFrame={smplxFrame}
                enabledParts={enabledParts}
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
          {signData && (
            <div className="absolute top-4 left-4 bg-slate-800/80 px-4 py-2 rounded-lg">
              <span className="font-mono text-lg uppercase">
                {signData.gloss}
              </span>
            </div>
          )}

          {/* SMPL-X Badge */}
          <div className="absolute top-4 right-4 bg-purple-600/80 px-3 py-1 rounded-full">
            <span className="text-sm">SMPL-X Direct</span>
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
          <div className="flex items-center gap-3">
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
          </div>
        </div>

        {/* Body Part Toggles */}
        <div className="mt-4 bg-slate-800 rounded-lg p-4">
          <h2 className="font-semibold mb-2">Body Parts (Debug)</h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(enabledParts).map(([part, enabled]) => (
              <label
                key={part}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) =>
                    setEnabledParts((prev) => ({
                      ...prev,
                      [part]: e.target.checked,
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className={enabled ? "text-white" : "text-slate-500"}>
                  {part.charAt(0).toUpperCase() + part.slice(1)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Debug: Current SMPL-X params */}
        {smplxFrame && (
          <div className="mt-4 bg-slate-800 rounded-lg p-4">
            <h2 className="font-semibold mb-2">
              SMPL-X Parameters (Frame {currentFrame})
            </h2>
            <div className="text-xs text-slate-400 font-mono grid grid-cols-2 gap-2">
              <div>
                <span className="text-green-400">Root pose:</span>{" "}
                {smplxFrame
                  .slice(0, 3)
                  .map((v) => v.toFixed(2))
                  .join(", ")}
              </div>
              <div>
                <span className="text-blue-400">Cam trans:</span>{" "}
                {smplxFrame
                  .slice(179, 182)
                  .map((v) => v.toFixed(2))
                  .join(", ")}
              </div>
              <div>
                <span className="text-yellow-400">L-hand sum:</span>{" "}
                {smplxFrame
                  .slice(66, 111)
                  .reduce((a, b) => a + Math.abs(b), 0)
                  .toFixed(2)}
              </div>
              <div>
                <span className="text-yellow-400">R-hand sum:</span>{" "}
                {smplxFrame
                  .slice(111, 156)
                  .reduce((a, b) => a + Math.abs(b), 0)
                  .toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
