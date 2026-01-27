"use client";

import { useState, useRef, useEffect, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

const DEFAULT_AVATAR_URL =
  "https://models.readyplayer.me/6977720002217beb7bb9b2ae.glb?morphTargets=ARKit&textureAtlas=1024";

interface BoneControlProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}

function BoneControl({
  label,
  value,
  onChange,
  min = -3.14,
  max = 3.14,
}: BoneControlProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-xs text-slate-400">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
      />
      <span className="w-12 text-xs text-slate-300 font-mono">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

interface TestAvatarProps {
  url: string;
  rotations: {
    rightArm: { x: number; y: number; z: number };
    rightForeArm: { x: number; y: number; z: number };
    leftArm: { x: number; y: number; z: number };
    leftForeArm: { x: number; y: number; z: number };
  };
}

function TestAvatar({ url, rotations }: TestAvatarProps) {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => cloneSkeleton(scene), [scene]);
  const bonesRef = useRef<Record<string, THREE.Bone>>({});

  useEffect(() => {
    const bones: Record<string, THREE.Bone> = {};
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        bones[child.name] = child;
      }
    });
    bonesRef.current = bones;
    console.log(
      "[BoneTest] Bones:",
      Object.keys(bones)
        .filter((n) => n.includes("Arm") || n.includes("Hand"))
        .join(", "),
    );
  }, [clonedScene]);

  useFrame(() => {
    const bones = bonesRef.current;

    if (bones["RightArm"]) {
      bones["RightArm"].rotation.set(
        rotations.rightArm.x,
        rotations.rightArm.y,
        rotations.rightArm.z,
      );
    }
    if (bones["RightForeArm"]) {
      bones["RightForeArm"].rotation.set(
        rotations.rightForeArm.x,
        rotations.rightForeArm.y,
        rotations.rightForeArm.z,
      );
    }
    if (bones["LeftArm"]) {
      bones["LeftArm"].rotation.set(
        rotations.leftArm.x,
        rotations.leftArm.y,
        rotations.leftArm.z,
      );
    }
    if (bones["LeftForeArm"]) {
      bones["LeftForeArm"].rotation.set(
        rotations.leftForeArm.x,
        rotations.leftForeArm.y,
        rotations.leftForeArm.z,
      );
    }
  });

  return (
    <group position={[0, -1, 0]}>
      <primitive object={clonedScene} />
    </group>
  );
}

export default function BoneTestPage() {
  const [rightArm, setRightArm] = useState({ x: 0, y: 0, z: 0 });
  const [rightForeArm, setRightForeArm] = useState({ x: 0, y: 0, z: 0 });
  const [leftArm, setLeftArm] = useState({ x: 0, y: 0, z: 0 });
  const [leftForeArm, setLeftForeArm] = useState({ x: 0, y: 0, z: 0 });

  const resetAll = () => {
    setRightArm({ x: 0, y: 0, z: 0 });
    setRightForeArm({ x: 0, y: 0, z: 0 });
    setLeftArm({ x: 0, y: 0, z: 0 });
    setLeftForeArm({ x: 0, y: 0, z: 0 });
  };

  // Preset poses for testing (values from user's empirical testing - new avatar)
  const presets = {
    tPose: () => resetAll(),
    armsDown: () => {
      // Arms naturally at sides
      setRightArm({ x: 1.2, y: 0.0, z: 0.0 });
      setLeftArm({ x: 1.2, y: 0.0, z: 0.0 });
      setRightForeArm({ x: 0, y: 0, z: 0 });
      setLeftForeArm({ x: 0, y: 0, z: 0 });
    },
    armsForward: () => {
      // Arms forward, palm facing floor
      setRightArm({ x: 1.24, y: 0.0, z: -1.53 });
      setLeftArm({ x: 1.23, y: 0.0, z: 1.53 });
      setRightForeArm({ x: 0, y: -1.23, z: 0 });
      setLeftForeArm({ x: 0, y: 1.23, z: 0 });
    },
    elbowsBent: () => {
      // Elbows bent, holding mirror pose (palms facing face from below)
      setRightArm({ x: 1.26, y: 0.53, z: -0.14 });
      setLeftArm({ x: 1.26, y: -0.53, z: 0.14 });
      setRightForeArm({ x: 1.58, y: -0.68, z: -1.35 });
      setLeftForeArm({ x: 1.58, y: 0.68, z: 1.35 });
    },
    waveHi: () => {
      // Arm raised like asking a question (needs re-testing with new avatar)
      setRightArm({ x: 0.22, y: -0.16, z: 0.03 });
      setLeftArm({ x: 1.2, y: 0.0, z: 0.0 });
      setRightForeArm({ x: 0.63, y: 1.17, z: -2.56 });
      setLeftForeArm({ x: 0, y: 0, z: 0 });
    },
    readingBook: () => {
      // Palms up, like reading a book or Muslim praying
      setRightArm({ x: 1.26, y: -0.2, z: -0.14 });
      setLeftArm({ x: 1.26, y: 0.2, z: 0.14 });
      setRightForeArm({ x: 1.58, y: -0.12, z: -1.35 });
      setLeftForeArm({ x: 1.58, y: 0.12, z: 1.35 });
    },
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Bone Rotation Tester</h1>
        <p className="text-slate-400 text-sm mb-4">
          Manually test bone rotations to understand RPM avatar axes
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Avatar Preview */}
          <div className="lg:col-span-2">
            <div
              className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl overflow-hidden"
              style={{ aspectRatio: "4/3" }}
            >
              <Canvas camera={{ position: [0, 0.5, 2], fov: 50 }}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 5, 5]} intensity={0.8} />
                <Suspense fallback={null}>
                  <TestAvatar
                    url={DEFAULT_AVATAR_URL}
                    rotations={{ rightArm, rightForeArm, leftArm, leftForeArm }}
                  />
                </Suspense>
                <Environment preset="studio" />
                <OrbitControls minDistance={0.8} maxDistance={3} />
              </Canvas>
            </div>

            {/* Presets */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={presets.tPose}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                T-Pose (Reset)
              </button>
              <button
                onClick={presets.armsDown}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                Arms Down
              </button>
              <button
                onClick={presets.armsForward}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                Arms Forward
              </button>
              <button
                onClick={presets.elbowsBent}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                Elbows Bent
              </button>
              <button
                onClick={presets.waveHi}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                Wave Hi
              </button>
              <button
                onClick={presets.readingBook}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                Reading Book
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Right Arm */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h2 className="font-semibold mb-3 text-green-400">RightArm</h2>
              <div className="space-y-2">
                <BoneControl
                  label="X"
                  value={rightArm.x}
                  onChange={(v) => setRightArm({ ...rightArm, x: v })}
                />
                <BoneControl
                  label="Y"
                  value={rightArm.y}
                  onChange={(v) => setRightArm({ ...rightArm, y: v })}
                />
                <BoneControl
                  label="Z"
                  value={rightArm.z}
                  onChange={(v) => setRightArm({ ...rightArm, z: v })}
                />
              </div>
            </div>

            {/* Right ForeArm */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h2 className="font-semibold mb-3 text-blue-400">RightForeArm</h2>
              <div className="space-y-2">
                <BoneControl
                  label="X"
                  value={rightForeArm.x}
                  onChange={(v) => setRightForeArm({ ...rightForeArm, x: v })}
                />
                <BoneControl
                  label="Y"
                  value={rightForeArm.y}
                  onChange={(v) => setRightForeArm({ ...rightForeArm, y: v })}
                />
                <BoneControl
                  label="Z"
                  value={rightForeArm.z}
                  onChange={(v) => setRightForeArm({ ...rightForeArm, z: v })}
                />
              </div>
            </div>

            {/* Left Arm */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h2 className="font-semibold mb-3 text-green-400">LeftArm</h2>
              <div className="space-y-2">
                <BoneControl
                  label="X"
                  value={leftArm.x}
                  onChange={(v) => setLeftArm({ ...leftArm, x: v })}
                />
                <BoneControl
                  label="Y"
                  value={leftArm.y}
                  onChange={(v) => setLeftArm({ ...leftArm, y: v })}
                />
                <BoneControl
                  label="Z"
                  value={leftArm.z}
                  onChange={(v) => setLeftArm({ ...leftArm, z: v })}
                />
              </div>
            </div>

            {/* Left ForeArm */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h2 className="font-semibold mb-3 text-blue-400">LeftForeArm</h2>
              <div className="space-y-2">
                <BoneControl
                  label="X"
                  value={leftForeArm.x}
                  onChange={(v) => setLeftForeArm({ ...leftForeArm, x: v })}
                />
                <BoneControl
                  label="Y"
                  value={leftForeArm.y}
                  onChange={(v) => setLeftForeArm({ ...leftForeArm, y: v })}
                />
                <BoneControl
                  label="Z"
                  value={leftForeArm.z}
                  onChange={(v) => setLeftForeArm({ ...leftForeArm, z: v })}
                />
              </div>
            </div>

            {/* Info */}
            <div className="bg-slate-800/50 rounded-lg p-4 text-xs text-slate-400">
              <p className="mb-2">
                <strong>Observations:</strong>
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>X = forward/backward tilt</li>
                <li>Y = twist/rotation</li>
                <li>Z = raise/lower from T-pose</li>
                <li>Values in radians (π ≈ 3.14)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
