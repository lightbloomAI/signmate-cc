'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { ASLSign, AvatarConfig, AvatarState, ExpressionState } from '@/types';

interface AvatarRendererProps {
  config: AvatarConfig;
  state: AvatarState;
  onSignComplete?: () => void;
  className?: string;
}

// Hand shape configurations for animation
const HAND_SHAPES: Record<string, { fingers: number[]; thumb: number }> = {
  'flat-hand': { fingers: [0, 0, 0, 0], thumb: 0 },
  'open-hand': { fingers: [0.1, 0.1, 0.1, 0.1], thumb: 0.2 },
  'fist': { fingers: [1, 1, 1, 1], thumb: 0.8 },
  's-hand': { fingers: [1, 1, 1, 1], thumb: 0.5 },
  'a-hand': { fingers: [1, 1, 1, 1], thumb: 0.3 },
  'point': { fingers: [0, 1, 1, 1], thumb: 0.5 },
  'claw-hand': { fingers: [0.6, 0.6, 0.6, 0.6], thumb: 0.4 },
  'bent-hand': { fingers: [0.5, 0.5, 0.5, 0.5], thumb: 0.3 },
  'i-hand': { fingers: [1, 1, 1, 0], thumb: 0.8 },
  'y-hand': { fingers: [1, 1, 1, 0], thumb: 0 },
  'u-hand': { fingers: [0, 0, 1, 1], thumb: 0.8 },
  'h-hand': { fingers: [0, 0, 1, 1], thumb: 0.5 },
  'l-hand': { fingers: [0, 1, 1, 1], thumb: 0 },
  'x-hand': { fingers: [0.3, 1, 1, 1], thumb: 0.5 },
  'f-hand': { fingers: [0.8, 0, 0, 0], thumb: 0.8 },
  'flat-o': { fingers: [0.4, 0.4, 0.4, 0.4], thumb: 0.4 },
  'e-hand': { fingers: [0.7, 0.7, 0.7, 0.7], thumb: 0.7 },
};

// Avatar body component
function AvatarBody({ config, skinColor }: { config: AvatarConfig; skinColor: THREE.Color }) {
  const bodyRef = useRef<THREE.Group>(null);

  return (
    <group ref={bodyRef}>
      {/* Torso */}
      {config.showUpperBody && (
        <mesh position={[0, 0, 0]}>
          <capsuleGeometry args={[0.25, 0.5, 8, 16]} />
          <meshStandardMaterial color={config.clothingColor} />
        </mesh>
      )}

      {/* Neck */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.15, 16]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
    </group>
  );
}

// Avatar head component with expressions
function AvatarHead({
  config,
  expression,
  skinColor,
}: {
  config: AvatarConfig;
  expression: ExpressionState;
  skinColor: THREE.Color;
}) {
  const headRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (headRef.current) {
      // Apply head tilt from expression
      headRef.current.rotation.x = expression.headTilt.x * 0.3;
      headRef.current.rotation.y = expression.headTilt.y * 0.3;
      headRef.current.rotation.z = expression.headTilt.z * 0.2;
    }
  });

  if (!config.showFace) return null;

  return (
    <group ref={headRef} position={[0, 0.7, 0]}>
      {/* Head */}
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Eyes */}
      <group position={[0, 0.03, 0.15]}>
        {/* Left eye */}
        <mesh position={[-0.06, 0, 0]}>
          <sphereGeometry args={[0.025 * expression.eyeOpenness, 16, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.06, 0, 0.02]}>
          <sphereGeometry args={[0.012 * expression.eyeOpenness, 16, 16]} />
          <meshStandardMaterial color="#2d1810" />
        </mesh>

        {/* Right eye */}
        <mesh position={[0.06, 0, 0]}>
          <sphereGeometry args={[0.025 * expression.eyeOpenness, 16, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.06, 0, 0.02]}>
          <sphereGeometry args={[0.012 * expression.eyeOpenness, 16, 16]} />
          <meshStandardMaterial color="#2d1810" />
        </mesh>
      </group>

      {/* Eyebrows */}
      <group position={[0, 0.08 + expression.eyebrows * 0.02, 0.16]}>
        <mesh position={[-0.06, 0, 0]} rotation={[0, 0, expression.eyebrows * 0.2]}>
          <boxGeometry args={[0.05, 0.008, 0.005]} />
          <meshStandardMaterial color="#3d2817" />
        </mesh>
        <mesh position={[0.06, 0, 0]} rotation={[0, 0, -expression.eyebrows * 0.2]}>
          <boxGeometry args={[0.05, 0.008, 0.005]} />
          <meshStandardMaterial color="#3d2817" />
        </mesh>
      </group>

      {/* Nose */}
      <mesh position={[0, -0.02, 0.18]}>
        <coneGeometry args={[0.02, 0.04, 8]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Mouth */}
      <mesh position={[0, -0.08, 0.16]}>
        <boxGeometry args={[0.06, 0.015, 0.01]} />
        <meshStandardMaterial color="#c4756a" />
      </mesh>
    </group>
  );
}

// Simplified hand component
function Hand({
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
  const shape = HAND_SHAPES[handShape] || HAND_SHAPES['flat-hand'];

  return (
    <group ref={handRef} position={position} rotation={rotation}>
      {/* Palm */}
      <mesh>
        <boxGeometry args={[0.08, 0.1, 0.03]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Fingers - simplified as boxes */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[
            -0.025 + i * 0.018,
            0.07 - shape.fingers[i] * 0.03,
            shape.fingers[i] * 0.02,
          ]}
          rotation={[shape.fingers[i] * 1.2, 0, 0]}
        >
          <boxGeometry args={[0.012, 0.05, 0.012]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
      ))}

      {/* Thumb */}
      <mesh
        position={[
          isRight ? 0.05 : -0.05,
          0.02 - shape.thumb * 0.02,
          0.01 + shape.thumb * 0.01,
        ]}
        rotation={[shape.thumb * 0.8, isRight ? -0.5 : 0.5, 0]}
      >
        <boxGeometry args={[0.012, 0.04, 0.012]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
    </group>
  );
}

// Arms component
function Arms({
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
  const [rightHandPos, setRightHandPos] = useState<[number, number, number]>([0.35, -0.1, 0.2]);
  const [leftHandPos, setLeftHandPos] = useState<[number, number, number]>([-0.35, -0.1, 0.2]);
  const [rightHandRot, setRightHandRot] = useState<[number, number, number]>([0, 0, 0]);
  const [leftHandRot, setLeftHandRot] = useState<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    if (currentSign) {
      const loc = currentSign.location;
      const mov = currentSign.movement;

      // Base position from sign location
      let baseX = loc.x * 0.5;
      let baseY = loc.y * 0.8 - 0.2;
      let baseZ = loc.z * 0.5 + 0.2;

      // Apply movement based on animation progress
      if (mov.direction) {
        const eased = easeInOutCubic(animationProgress);
        baseX += mov.direction.x * eased * 0.3;
        baseY += mov.direction.y * eased * 0.3;
        baseZ += mov.direction.z * eased * 0.3;
      }

      // Handle repetitions
      if (mov.repetitions && mov.repetitions > 1) {
        const cycleProgress = (animationProgress * mov.repetitions) % 1;
        const bounce = Math.sin(cycleProgress * Math.PI * 2) * 0.05;
        baseY += bounce;
      }

      setRightHandPos([baseX + 0.15, baseY, baseZ]);
      setRightHandRot([animationProgress * 0.2, 0, 0]);

      // Non-dominant hand (if specified)
      if (currentSign.handshape.nonDominant) {
        setLeftHandPos([-baseX - 0.15, baseY, baseZ]);
        setLeftHandRot([-animationProgress * 0.2, 0, 0]);
      } else {
        // Rest position for left hand
        setLeftHandPos([-0.35, -0.1, 0.15]);
        setLeftHandRot([0, 0, 0]);
      }
    }
  }, [currentSign, animationProgress]);

  if (!config.showHands) return null;

  const rightHandShape = currentSign?.handshape.dominant || 'flat-hand';
  const leftHandShape = currentSign?.handshape.nonDominant || 'flat-hand';

  return (
    <>
      {/* Right arm */}
      <group>
        <mesh position={[0.3, 0.15, 0]}>
          <capsuleGeometry args={[0.04, 0.2, 8, 8]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
        <Hand
          position={rightHandPos}
          rotation={rightHandRot}
          handShape={rightHandShape}
          isRight={true}
          skinColor={skinColor}
        />
      </group>

      {/* Left arm */}
      <group>
        <mesh position={[-0.3, 0.15, 0]}>
          <capsuleGeometry args={[0.04, 0.2, 8, 8]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
        <Hand
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

// Easing function
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Main Avatar scene component
function AvatarScene({
  config,
  state,
  onSignComplete,
}: {
  config: AvatarConfig;
  state: AvatarState;
  onSignComplete?: () => void;
}) {
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationStartRef = useRef(0);
  const currentSignRef = useRef<ASLSign | undefined>(undefined);

  const skinColor = useMemo(() => new THREE.Color(config.skinTone), [config.skinTone]);

  useFrame((_, delta) => {
    if (state.currentSign && state.isAnimating) {
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
    } else {
      setAnimationProgress(0);
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-3, 3, 2]} intensity={0.4} />

      <group position={[0, -0.3, 0]}>
        <AvatarBody config={config} skinColor={skinColor} />
        <AvatarHead config={config} expression={state.expressionState} skinColor={skinColor} />
        <Arms
          config={config}
          currentSign={state.currentSign}
          animationProgress={animationProgress}
          skinColor={skinColor}
        />
      </group>

      <Environment preset="studio" />
    </>
  );
}

// Main exported component
export function AvatarRenderer({ config, state, onSignComplete, className }: AvatarRendererProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%', minHeight: '300px' }}>
      <Canvas
        camera={{ position: [0, 0.3, 1.5], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        <AvatarScene config={config} state={state} onSignComplete={onSignComplete} />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={1}
          maxDistance={3}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
