"use client";

import { useRef, useEffect, useMemo, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type {
  ASLSign,
  AvatarConfig,
  AvatarState,
  ExpressionState,
} from "@/types";
import { ReadyPlayerMeAvatar } from "./ReadyPlayerMeAvatar";

interface AvatarRendererProps {
  config: AvatarConfig;
  state: AvatarState;
  onSignComplete?: () => void;
  className?: string;
  avatarUrl?: string; // Optional ReadyPlayerMe avatar URL
}

// Hand shape configurations for animation
const HAND_SHAPES: Record<string, { fingers: number[]; thumb: number }> = {
  "flat-hand": { fingers: [0, 0, 0, 0], thumb: 0 },
  "open-hand": { fingers: [0.1, 0.1, 0.1, 0.1], thumb: 0.2 },
  fist: { fingers: [1, 1, 1, 1], thumb: 0.8 },
  "s-hand": { fingers: [1, 1, 1, 1], thumb: 0.5 },
  "a-hand": { fingers: [1, 1, 1, 1], thumb: 0.3 },
  point: { fingers: [0, 1, 1, 1], thumb: 0.5 },
  "claw-hand": { fingers: [0.6, 0.6, 0.6, 0.6], thumb: 0.4 },
  "bent-hand": { fingers: [0.5, 0.5, 0.5, 0.5], thumb: 0.3 },
  "i-hand": { fingers: [1, 1, 1, 0], thumb: 0.8 },
  "y-hand": { fingers: [1, 1, 1, 0], thumb: 0 },
  "u-hand": { fingers: [0, 0, 1, 1], thumb: 0.8 },
  "h-hand": { fingers: [0, 0, 1, 1], thumb: 0.5 },
  "l-hand": { fingers: [0, 1, 1, 1], thumb: 0 },
  "x-hand": { fingers: [0.3, 1, 1, 1], thumb: 0.5 },
  "f-hand": { fingers: [0.8, 0, 0, 0], thumb: 0.8 },
  "flat-o": { fingers: [0.4, 0.4, 0.4, 0.4], thumb: 0.4 },
  "e-hand": { fingers: [0.7, 0.7, 0.7, 0.7], thumb: 0.7 },
  "v-hand": { fingers: [0, 0, 1, 1], thumb: 0.5 },
  "w-hand": { fingers: [0, 0, 0, 1], thumb: 0.5 },
  "r-hand": { fingers: [0, 0, 1, 1], thumb: 0.5 },
  "k-hand": { fingers: [0, 0, 1, 1], thumb: 0.3 },
  "d-hand": { fingers: [0, 1, 1, 1], thumb: 0.8 },
  "g-hand": { fingers: [0, 1, 1, 1], thumb: 0 },
  "letter-a": { fingers: [1, 1, 1, 1], thumb: 0.3 },
  "letter-b": { fingers: [0, 0, 0, 0], thumb: 1 },
  "letter-c": { fingers: [0.5, 0.5, 0.5, 0.5], thumb: 0.5 },
  "letter-d": { fingers: [0, 1, 1, 1], thumb: 0.8 },
  "letter-e": { fingers: [0.8, 0.8, 0.8, 0.8], thumb: 0.8 },
  "letter-f": { fingers: [0.8, 0, 0, 0], thumb: 0.8 },
  "letter-g": { fingers: [0, 1, 1, 1], thumb: 0 },
  "letter-h": { fingers: [0, 0, 1, 1], thumb: 0.5 },
  "letter-i": { fingers: [1, 1, 1, 0], thumb: 0.8 },
  "letter-j": { fingers: [1, 1, 1, 0], thumb: 0.8 },
  "letter-k": { fingers: [0, 0, 1, 1], thumb: 0.3 },
  "letter-l": { fingers: [0, 1, 1, 1], thumb: 0 },
  "letter-m": { fingers: [0.9, 0.9, 0.9, 1], thumb: 0.9 },
  "letter-n": { fingers: [0.9, 0.9, 1, 1], thumb: 0.9 },
  "letter-o": { fingers: [0.6, 0.6, 0.6, 0.6], thumb: 0.6 },
  "letter-p": { fingers: [0, 0, 1, 1], thumb: 0.3 },
  "letter-q": { fingers: [0, 1, 1, 1], thumb: 0 },
  "letter-r": { fingers: [0, 0, 1, 1], thumb: 0.5 },
  "letter-s": { fingers: [1, 1, 1, 1], thumb: 0.5 },
  "letter-t": { fingers: [0.9, 1, 1, 1], thumb: 0.3 },
  "letter-u": { fingers: [0, 0, 1, 1], thumb: 0.8 },
  "letter-v": { fingers: [0, 0, 1, 1], thumb: 0.5 },
  "letter-w": { fingers: [0, 0, 0, 1], thumb: 0.5 },
  "letter-x": { fingers: [0.3, 1, 1, 1], thumb: 0.5 },
  "letter-y": { fingers: [1, 1, 1, 0], thumb: 0 },
  "letter-z": { fingers: [0, 1, 1, 1], thumb: 0.5 },
};

// Improved human-like body
function HumanBody({
  config,
  skinColor,
}: {
  config: AvatarConfig;
  skinColor: THREE.Color;
}) {
  const clothingColor = useMemo(
    () => new THREE.Color(config.clothingColor),
    [config.clothingColor],
  );

  return (
    <group>
      {/* Torso - more human proportions */}
      {config.showUpperBody && (
        <>
          {/* Chest */}
          <mesh position={[0, 0.05, 0]}>
            <capsuleGeometry args={[0.22, 0.35, 12, 24]} />
            <meshStandardMaterial color={clothingColor} roughness={0.8} />
          </mesh>

          {/* Shoulders */}
          <mesh position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.08, 0.45, 8, 16]} />
            <meshStandardMaterial color={clothingColor} roughness={0.8} />
          </mesh>

          {/* Collar/Neck area */}
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.12, 0.15, 0.08, 16]} />
            <meshStandardMaterial color={clothingColor} roughness={0.8} />
          </mesh>
        </>
      )}

      {/* Neck */}
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.12, 16]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>
    </group>
  );
}

// Improved human-like head with hair
function HumanHead({
  config,
  expression,
  skinColor,
}: {
  config: AvatarConfig;
  expression: ExpressionState;
  skinColor: THREE.Color;
}) {
  const headRef = useRef<THREE.Group>(null);
  const hairColor = useMemo(() => new THREE.Color("#2d1810"), []);
  const lipColor = useMemo(() => new THREE.Color("#c4756a"), []);
  const eyeWhite = useMemo(() => new THREE.Color("#f5f5f5"), []);
  const irisColor = useMemo(() => new THREE.Color("#4a6741"), []);

  useFrame(() => {
    if (headRef.current) {
      headRef.current.rotation.x = expression.headTilt.x * 0.25;
      headRef.current.rotation.y = expression.headTilt.y * 0.25;
      headRef.current.rotation.z = expression.headTilt.z * 0.15;
    }
  });

  if (!config.showFace) return null;

  return (
    <group ref={headRef} position={[0, 0.78, 0]}>
      {/* Head - more oval shape */}
      <mesh>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Face shape - slight chin */}
      <mesh position={[0, -0.08, 0.08]}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Hair - back */}
      <mesh position={[0, 0.05, -0.05]}>
        <sphereGeometry args={[0.19, 24, 24]} />
        <meshStandardMaterial color={hairColor} roughness={0.9} />
      </mesh>

      {/* Hair - top */}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.17, 24, 24]} />
        <meshStandardMaterial color={hairColor} roughness={0.9} />
      </mesh>

      {/* Hair - sides */}
      <mesh position={[-0.12, 0.02, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={hairColor} roughness={0.9} />
      </mesh>
      <mesh position={[0.12, 0.02, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={hairColor} roughness={0.9} />
      </mesh>

      {/* Eyes */}
      <group position={[0, 0.02, 0.14]}>
        {/* Left eye white */}
        <mesh position={[-0.055, 0, 0]}>
          <sphereGeometry args={[0.028 * expression.eyeOpenness, 16, 16]} />
          <meshStandardMaterial color={eyeWhite} roughness={0.3} />
        </mesh>
        {/* Left iris */}
        <mesh position={[-0.055, 0, 0.015]}>
          <sphereGeometry args={[0.015 * expression.eyeOpenness, 16, 16]} />
          <meshStandardMaterial color={irisColor} roughness={0.3} />
        </mesh>
        {/* Left pupil */}
        <mesh position={[-0.055, 0, 0.025]}>
          <sphereGeometry args={[0.007 * expression.eyeOpenness, 12, 12]} />
          <meshStandardMaterial color="black" />
        </mesh>

        {/* Right eye white */}
        <mesh position={[0.055, 0, 0]}>
          <sphereGeometry args={[0.028 * expression.eyeOpenness, 16, 16]} />
          <meshStandardMaterial color={eyeWhite} roughness={0.3} />
        </mesh>
        {/* Right iris */}
        <mesh position={[0.055, 0, 0.015]}>
          <sphereGeometry args={[0.015 * expression.eyeOpenness, 16, 16]} />
          <meshStandardMaterial color={irisColor} roughness={0.3} />
        </mesh>
        {/* Right pupil */}
        <mesh position={[0.055, 0, 0.025]}>
          <sphereGeometry args={[0.007 * expression.eyeOpenness, 12, 12]} />
          <meshStandardMaterial color="black" />
        </mesh>
      </group>

      {/* Eyebrows */}
      <group position={[0, 0.07 + expression.eyebrows * 0.015, 0.15]}>
        <mesh
          position={[-0.055, 0, 0]}
          rotation={[0, 0, expression.eyebrows * 0.15]}
        >
          <boxGeometry args={[0.04, 0.008, 0.006]} />
          <meshStandardMaterial color={hairColor} />
        </mesh>
        <mesh
          position={[0.055, 0, 0]}
          rotation={[0, 0, -expression.eyebrows * 0.15]}
        >
          <boxGeometry args={[0.04, 0.008, 0.006]} />
          <meshStandardMaterial color={hairColor} />
        </mesh>
      </group>

      {/* Nose */}
      <mesh position={[0, -0.02, 0.16]}>
        <coneGeometry args={[0.018, 0.04, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Mouth */}
      <mesh position={[0, -0.08, 0.14]}>
        <boxGeometry args={[0.045, 0.012, 0.008]} />
        <meshStandardMaterial color={lipColor} roughness={0.5} />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.17, 0, 0]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>
      <mesh position={[0.17, 0, 0]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>
    </group>
  );
}

// Improved realistic hand
function RealisticHand({
  position,
  rotation,
  handShape,
  isRight,
  skinColor,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  handShape: string;
  isRight: boolean;
  skinColor: THREE.Color;
}) {
  const handRef = useRef<THREE.Group>(null);
  const shape = HAND_SHAPES[handShape] || HAND_SHAPES["flat-hand"];

  // Finger lengths (index, middle, ring, pinky)
  const fingerLengths = [0.055, 0.06, 0.055, 0.045];
  const fingerWidths = [0.014, 0.014, 0.013, 0.011];

  return (
    <group ref={handRef} position={position} rotation={rotation}>
      {/* Palm - more realistic shape */}
      <mesh>
        <boxGeometry args={[0.09, 0.11, 0.025]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Palm detail - slight curve */}
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[0.08, 0.1, 0.015]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Fingers with joints */}
      {[0, 1, 2, 3].map((i) => {
        const curl = shape.fingers[i];
        const xPos = -0.03 + i * 0.02;
        const length = fingerLengths[i];
        const width = fingerWidths[i];

        return (
          <group key={i} position={[xPos, 0.055, 0]}>
            {/* First segment */}
            <mesh
              position={[0, length * 0.4 * (1 - curl * 0.3), curl * 0.015]}
              rotation={[curl * 0.8, 0, 0]}
            >
              <capsuleGeometry args={[width / 2, length * 0.4, 6, 8]} />
              <meshStandardMaterial color={skinColor} roughness={0.6} />
            </mesh>

            {/* Second segment */}
            <mesh
              position={[0, length * 0.7 * (1 - curl * 0.5), curl * 0.035]}
              rotation={[curl * 1.2, 0, 0]}
            >
              <capsuleGeometry
                args={[(width / 2) * 0.9, length * 0.35, 6, 8]}
              />
              <meshStandardMaterial color={skinColor} roughness={0.6} />
            </mesh>

            {/* Fingertip */}
            <mesh
              position={[0, length * 0.95 * (1 - curl * 0.7), curl * 0.05]}
              rotation={[curl * 1.4, 0, 0]}
            >
              <sphereGeometry args={[(width / 2) * 0.85, 8, 8]} />
              <meshStandardMaterial color={skinColor} roughness={0.6} />
            </mesh>
          </group>
        );
      })}

      {/* Thumb - more realistic positioning */}
      <group
        position={[isRight ? 0.055 : -0.055, 0, 0.01]}
        rotation={[
          shape.thumb * 0.6,
          isRight ? -0.4 : 0.4,
          isRight ? -0.3 : 0.3,
        ]}
      >
        <mesh position={[0, 0.02, 0]}>
          <capsuleGeometry args={[0.012, 0.03, 6, 8]} />
          <meshStandardMaterial color={skinColor} roughness={0.6} />
        </mesh>
        <mesh
          position={[0, 0.045 - shape.thumb * 0.01, shape.thumb * 0.01]}
          rotation={[shape.thumb * 0.5, 0, 0]}
        >
          <capsuleGeometry args={[0.01, 0.025, 6, 8]} />
          <meshStandardMaterial color={skinColor} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.065 - shape.thumb * 0.02, shape.thumb * 0.02]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <meshStandardMaterial color={skinColor} roughness={0.6} />
        </mesh>
      </group>

      {/* Wrist */}
      <mesh position={[0, -0.07, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 0.03, 12]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>
    </group>
  );
}

// Arms with improved positioning
function HumanArms({
  config,
  currentSign,
  animationProgress,
  skinColor,
}: {
  config: AvatarConfig;
  currentSign?: ASLSign;
  animationProgress: number;
  skinColor: THREE.Color;
}) {
  const [rightHandPos, setRightHandPos] = useState<[number, number, number]>([
    0.4, 0, 0.25,
  ]);
  const [leftHandPos, setLeftHandPos] = useState<[number, number, number]>([
    -0.4, 0, 0.25,
  ]);
  const [rightHandRot, setRightHandRot] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [leftHandRot, setLeftHandRot] = useState<[number, number, number]>([
    0, 0, 0,
  ]);

  useEffect(() => {
    if (currentSign) {
      const loc = currentSign.location;
      const mov = currentSign.movement;

      // More pronounced positions
      let baseX = loc.x * 0.9;
      let baseY = loc.y * 1.1 - 0.05;
      let baseZ = loc.z * 0.9 + 0.35;

      // Larger movements
      if (mov.direction) {
        const eased = easeInOutCubic(animationProgress);
        baseX += mov.direction.x * eased * 0.7;
        baseY += mov.direction.y * eased * 0.7;
        baseZ += mov.direction.z * eased * 0.6;
      }

      // Visible repetition bounce
      if (mov.repetitions && mov.repetitions > 1) {
        const cycleProgress = (animationProgress * mov.repetitions) % 1;
        const bounce = Math.sin(cycleProgress * Math.PI * 2) * 0.15;
        baseY += bounce;
      }

      // Smooth motion
      const wobble = Math.sin(animationProgress * Math.PI * 2) * 0.025;

      setRightHandPos([baseX + 0.22 + wobble, baseY, baseZ]);
      setRightHandRot([animationProgress * 0.5, wobble * 3, -0.2]);

      if (currentSign.handshape.nonDominant) {
        setLeftHandPos([-baseX - 0.22 - wobble, baseY, baseZ]);
        setLeftHandRot([-animationProgress * 0.5, -wobble * 3, 0.2]);
      } else {
        setLeftHandPos([-0.45, -0.1, 0.2]);
        setLeftHandRot([0, 0, 0.15]);
      }
    }
  }, [currentSign, animationProgress]);

  if (!config.showHands) return null;

  const rightHandShape = currentSign?.handshape.dominant || "flat-hand";
  const leftHandShape = currentSign?.handshape.nonDominant || "flat-hand";
  const clothingColor = useMemo(
    () => new THREE.Color(config.clothingColor),
    [config.clothingColor],
  );

  return (
    <>
      {/* Right arm */}
      <group>
        {/* Upper arm */}
        <mesh position={[0.32, 0.2, 0]} rotation={[0, 0, -0.3]}>
          <capsuleGeometry args={[0.045, 0.18, 8, 12]} />
          <meshStandardMaterial color={clothingColor} roughness={0.8} />
        </mesh>
        {/* Forearm */}
        <mesh position={[0.38, 0.05, 0.1]} rotation={[0.4, 0, -0.2]}>
          <capsuleGeometry args={[0.04, 0.16, 8, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.6} />
        </mesh>
        <RealisticHand
          position={rightHandPos}
          rotation={rightHandRot}
          handShape={rightHandShape}
          isRight={true}
          skinColor={skinColor}
        />
      </group>

      {/* Left arm */}
      <group>
        {/* Upper arm */}
        <mesh position={[-0.32, 0.2, 0]} rotation={[0, 0, 0.3]}>
          <capsuleGeometry args={[0.045, 0.18, 8, 12]} />
          <meshStandardMaterial color={clothingColor} roughness={0.8} />
        </mesh>
        {/* Forearm */}
        <mesh position={[-0.38, 0.05, 0.1]} rotation={[0.4, 0, 0.2]}>
          <capsuleGeometry args={[0.04, 0.16, 8, 12]} />
          <meshStandardMaterial color={skinColor} roughness={0.6} />
        </mesh>
        <RealisticHand
          position={leftHandPos}
          rotation={leftHandRot}
          handShape={leftHandShape}
          isRight={false}
          skinColor={skinColor}
        />
      </group>
    </>
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Main Avatar scene
function AvatarScene({
  config,
  state,
  onSignComplete,
  avatarUrl,
}: {
  config: AvatarConfig;
  state: AvatarState;
  onSignComplete?: () => void;
  avatarUrl?: string;
}) {
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationStartRef = useRef(0);
  const currentSignRef = useRef<ASLSign | undefined>(undefined);

  const skinColor = useMemo(
    () => new THREE.Color(config.skinTone),
    [config.skinTone],
  );

  useFrame((_, delta) => {
    // Only handle animation for primitive avatar
    // ReadyPlayerMe avatar handles its own animation
    if (!avatarUrl && state.currentSign && state.isAnimating) {
      if (currentSignRef.current !== state.currentSign) {
        currentSignRef.current = state.currentSign;
        animationStartRef.current = 0;
        setAnimationProgress(0);
      }

      animationStartRef.current += delta * 1000;
      const duration = state.currentSign.duration;
      const progress = Math.min(animationStartRef.current / duration, 1);
      setAnimationProgress(progress);

      if (progress >= 1) {
        onSignComplete?.();
      }
    } else if (!avatarUrl) {
      setAnimationProgress(0);
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-3, 3, 2]} intensity={0.4} />
      <directionalLight position={[0, 0, 5]} intensity={0.5} />

      {avatarUrl ? (
        // Use ReadyPlayerMe avatar
        <Suspense fallback={<LoadingAvatar />}>
          <ReadyPlayerMeAvatar
            url={avatarUrl}
            config={config}
            state={state}
            onSignComplete={onSignComplete}
          />
        </Suspense>
      ) : (
        // Use primitive avatar
        <group position={[0, -0.35, 0]}>
          <HumanBody config={config} skinColor={skinColor} />
          <HumanHead
            config={config}
            expression={state.expressionState}
            skinColor={skinColor}
          />
          <HumanArms
            config={config}
            currentSign={state.currentSign}
            animationProgress={animationProgress}
            skinColor={skinColor}
          />
        </group>
      )}

      <Environment preset="studio" />
    </>
  );
}

// Loading placeholder while avatar loads
function LoadingAvatar() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 1, 0.3]} />
      <meshStandardMaterial color="#666" wireframe />
    </mesh>
  );
}

// Check if current sign is fingerspelling
function isFingerspelling(sign?: ASLSign): boolean {
  return sign?.gloss?.startsWith("FS:") || false;
}

// Extract letter from fingerspelling gloss
function getFingerspellingLetter(sign?: ASLSign): string {
  if (!sign?.gloss?.startsWith("FS:")) return "";
  return sign.gloss.replace("FS:", "");
}

// Main exported component
export function AvatarRenderer({
  config,
  state,
  onSignComplete,
  className,
  avatarUrl,
}: AvatarRendererProps) {
  const currentSignName = state.currentSign?.gloss || "";
  const queueLength = state.queue?.length || 0;
  const isAnimating = state.isAnimating;
  const isFS = isFingerspelling(state.currentSign);
  const fsLetter = getFingerspellingLetter(state.currentSign);

  // Build fingerspelling word from queue
  const fingerspellingWord = useMemo(() => {
    if (!isFS) return "";
    const letters = [fsLetter];
    state.queue?.forEach((sign) => {
      if (sign.gloss?.startsWith("FS:")) {
        letters.push(sign.gloss.replace("FS:", ""));
      }
    });
    return letters.join("");
  }, [isFS, fsLetter, state.queue]);

  return (
    <div
      className={`relative ${className || ""}`}
      style={{ width: "100%", height: "100%", minHeight: "300px" }}
    >
      <Canvas
        camera={{ position: [0, 1.2, 2.2], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        <AvatarScene
          config={config}
          state={state}
          onSignComplete={onSignComplete}
          avatarUrl={avatarUrl}
        />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={0.8}
          maxDistance={3}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      {/* Sign Name Overlay */}
      {currentSignName && !isFS && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div
            className={`px-6 py-3 rounded-xl text-white font-bold text-2xl shadow-lg transition-all duration-300 ${
              isAnimating ? "bg-green-600 scale-110" : "bg-gray-700"
            }`}
          >
            {currentSignName}
          </div>
        </div>
      )}

      {/* Fingerspelling Display - Large and Clear */}
      {isFS && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-blue-600 px-8 py-4 rounded-2xl shadow-xl">
            <div className="text-white text-lg mb-1 text-center opacity-75">
              Fingerspelling
            </div>
            <div className="flex items-center justify-center gap-1">
              {fingerspellingWord.split("").map((letter, i) => (
                <span
                  key={i}
                  className={`text-5xl font-bold transition-all duration-200 ${
                    i === 0 ? "text-yellow-300 scale-125" : "text-white/60"
                  }`}
                >
                  {letter}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Animation Indicator */}
      {isAnimating && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <span className="text-white text-sm bg-gray-800/80 px-2 py-1 rounded">
            LIVE
          </span>
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}

      {/* Queue Indicator */}
      {queueLength > 0 && (
        <div className="absolute bottom-4 right-4 z-10 bg-gray-800/90 px-4 py-2 rounded-lg">
          <span className="text-gray-300 text-sm font-medium">
            {queueLength} signs queued
          </span>
        </div>
      )}

      {/* Current Sign Info Panel */}
      {state.currentSign && !isFS && (
        <div className="absolute bottom-4 left-4 z-10 bg-gray-900/95 px-5 py-4 rounded-xl border border-gray-700 max-w-xs">
          <div className="text-white font-bold text-xl mb-2">
            {state.currentSign.gloss}
          </div>
          <div className="text-gray-400 text-sm space-y-1">
            <div className="flex justify-between">
              <span>Hand shape:</span>
              <span className="text-gray-200">
                {state.currentSign.handshape.dominant}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Movement:</span>
              <span className="text-gray-200">
                {state.currentSign.movement.type}
              </span>
            </div>
            {state.currentSign.nonManualMarkers?.length > 0 && (
              <div className="flex justify-between">
                <span>Expression:</span>
                <span className="text-gray-200">
                  {state.currentSign.nonManualMarkers[0].expression}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
