"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type {
  ASLSign,
  AvatarConfig,
  AvatarState,
  ExpressionState,
} from "@/types";

interface ReadyPlayerMeAvatarProps {
  url: string;
  config: AvatarConfig;
  state: AvatarState;
  onSignComplete?: () => void;
}

// Bone name mappings for ReadyPlayerMe avatars
const BONE_NAMES = {
  // Spine
  hips: "Hips",
  spine: "Spine",
  spine1: "Spine1",
  spine2: "Spine2",
  neck: "Neck",
  head: "Head",

  // Right arm
  rightShoulder: "RightShoulder",
  rightArm: "RightArm",
  rightForeArm: "RightForeArm",
  rightHand: "RightHand",

  // Left arm
  leftShoulder: "LeftShoulder",
  leftArm: "LeftArm",
  leftForeArm: "LeftForeArm",
  leftHand: "LeftHand",

  // Right hand fingers
  rightThumb1: "RightHandThumb1",
  rightThumb2: "RightHandThumb2",
  rightThumb3: "RightHandThumb3",
  rightIndex1: "RightHandIndex1",
  rightIndex2: "RightHandIndex2",
  rightIndex3: "RightHandIndex3",
  rightMiddle1: "RightHandMiddle1",
  rightMiddle2: "RightHandMiddle2",
  rightMiddle3: "RightHandMiddle3",
  rightRing1: "RightHandRing1",
  rightRing2: "RightHandRing2",
  rightRing3: "RightHandRing3",
  rightPinky1: "RightHandPinky1",
  rightPinky2: "RightHandPinky2",
  rightPinky3: "RightHandPinky3",

  // Left hand fingers
  leftThumb1: "LeftHandThumb1",
  leftThumb2: "LeftHandThumb2",
  leftThumb3: "LeftHandThumb3",
  leftIndex1: "LeftHandIndex1",
  leftIndex2: "LeftHandIndex2",
  leftIndex3: "LeftHandIndex3",
  leftMiddle1: "LeftHandMiddle1",
  leftMiddle2: "LeftHandMiddle2",
  leftMiddle3: "LeftHandMiddle3",
  leftRing1: "LeftHandRing1",
  leftRing2: "LeftHandRing2",
  leftRing3: "LeftHandRing3",
  leftPinky1: "LeftHandPinky1",
  leftPinky2: "LeftHandPinky2",
  leftPinky3: "LeftHandPinky3",
};

// Hand shape to finger curl mappings (index, middle, ring, pinky, thumb)
const HAND_SHAPES: Record<string, { fingers: number[]; thumb: number }> = {
  "flat-hand": { fingers: [0, 0, 0, 0], thumb: 0 },
  "open-hand": { fingers: [0.1, 0.1, 0.1, 0.1], thumb: 0.2 },
  fist: { fingers: [1, 1, 1, 1], thumb: 0.8 },
  point: { fingers: [0, 1, 1, 1], thumb: 0.5 },
  "letter-a": { fingers: [1, 1, 1, 1], thumb: 0.3 },
  "letter-b": { fingers: [0, 0, 0, 0], thumb: 1 },
  "letter-c": { fingers: [0.5, 0.5, 0.5, 0.5], thumb: 0.5 },
  "letter-d": { fingers: [0, 1, 1, 1], thumb: 0.8 },
  "letter-e": { fingers: [0.8, 0.8, 0.8, 0.8], thumb: 0.8 },
  "letter-f": { fingers: [0.8, 0, 0, 0], thumb: 0.8 },
  "letter-g": { fingers: [0, 1, 1, 1], thumb: 0 },
  "letter-h": { fingers: [0, 0, 1, 1], thumb: 0.5 },
  "letter-i": { fingers: [1, 1, 1, 0], thumb: 0.8 },
  "letter-k": { fingers: [0, 0, 1, 1], thumb: 0.3 },
  "letter-l": { fingers: [0, 1, 1, 1], thumb: 0 },
  "letter-o": { fingers: [0.6, 0.6, 0.6, 0.6], thumb: 0.6 },
  "letter-r": { fingers: [0, 0, 1, 1], thumb: 0.5 },
  "letter-s": { fingers: [1, 1, 1, 1], thumb: 0.5 },
  "letter-u": { fingers: [0, 0, 1, 1], thumb: 0.8 },
  "letter-v": { fingers: [0, 0, 1, 1], thumb: 0.5 },
  "letter-w": { fingers: [0, 0, 0, 1], thumb: 0.5 },
  "letter-y": { fingers: [1, 1, 1, 0], thumb: 0 },
};

// ARKit blend shape names for facial expressions
const FACE_SHAPES = {
  mouthOpen: "jawOpen",
  mouthSmile: "mouthSmileLeft",
  mouthFrown: "mouthFrownLeft",
  browUp: "browInnerUp",
  browDown: "browDownLeft",
  eyesClosed: "eyeBlinkLeft",
  eyesWide: "eyeWideLeft",
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function ReadyPlayerMeAvatar({
  url,
  config,
  state,
  onSignComplete,
}: ReadyPlayerMeAvatarProps) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  // Clone the scene properly with skeleton using SkeletonUtils
  const clonedScene = useMemo(() => {
    const clone = cloneSkeleton(scene);
    console.log("[Avatar] Cloned scene with SkeletonUtils");
    return clone;
  }, [scene]);

  // Get skeleton and bones
  const bonesRef = useRef<Record<string, THREE.Bone>>({});
  const meshRef = useRef<THREE.SkinnedMesh | null>(null);

  // Animation state
  const animationProgress = useRef(0);
  const animationStartTime = useRef(0);
  const currentSignRef = useRef<ASLSign | undefined>(undefined);

  // Initial pose storage
  const initialPose = useRef<Record<string, THREE.Quaternion>>({});

  // Find bones and mesh on mount
  useEffect(() => {
    const bones: Record<string, THREE.Bone> = {};
    let skinnedMesh: THREE.SkinnedMesh | null = null;

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        bones[child.name] = child;
        // Store initial pose
        initialPose.current[child.name] = child.quaternion.clone();
      }
      if (child instanceof THREE.SkinnedMesh) {
        skinnedMesh = child;
        // Enable morph targets
        if (child.morphTargetInfluences) {
          child.morphTargetInfluences.fill(0);
        }
      }
    });

    bonesRef.current = bones;
    meshRef.current = skinnedMesh;

    console.log("[Avatar] Found bones:", Object.keys(bones).length);

    const mesh = skinnedMesh as THREE.SkinnedMesh | null;
    if (mesh && mesh.morphTargetDictionary) {
      console.log(
        "[Avatar] Morph targets:",
        Object.keys(mesh.morphTargetDictionary).length,
      );
    }
  }, [clonedScene]);

  // Apply facial expressions via morph targets
  const applyFacialExpression = (expression: ExpressionState) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;
    if (!dict || !influences) return;

    // Map expression state to morph targets
    // Eyebrows
    if (dict["browInnerUp"] !== undefined) {
      influences[dict["browInnerUp"]] = Math.max(0, expression.eyebrows) * 0.5;
    }
    if (dict["browDownLeft"] !== undefined) {
      influences[dict["browDownLeft"]] =
        Math.max(0, -expression.eyebrows) * 0.5;
    }
    if (dict["browDownRight"] !== undefined) {
      influences[dict["browDownRight"]] =
        Math.max(0, -expression.eyebrows) * 0.5;
    }

    // Eyes
    if (dict["eyeBlinkLeft"] !== undefined) {
      influences[dict["eyeBlinkLeft"]] = 1 - expression.eyeOpenness;
    }
    if (dict["eyeBlinkRight"] !== undefined) {
      influences[dict["eyeBlinkRight"]] = 1 - expression.eyeOpenness;
    }

    // Mouth
    if (expression.mouthShape === "open" && dict["jawOpen"] !== undefined) {
      influences[dict["jawOpen"]] = 0.3;
    }
    if (expression.mouthShape === "smile") {
      if (dict["mouthSmileLeft"] !== undefined)
        influences[dict["mouthSmileLeft"]] = 0.5;
      if (dict["mouthSmileRight"] !== undefined)
        influences[dict["mouthSmileRight"]] = 0.5;
    }
  };

  // Apply hand shape to finger bones
  const applyHandShape = (handShape: string, isRight: boolean) => {
    const bones = bonesRef.current;
    const shape = HAND_SHAPES[handShape] || HAND_SHAPES["flat-hand"];

    const side = isRight ? "Right" : "Left";
    const fingerNames = ["Index", "Middle", "Ring", "Pinky"];

    fingerNames.forEach((finger, i) => {
      const curl = shape.fingers[i];

      // Apply curl to each finger joint
      [1, 2, 3].forEach((joint) => {
        const boneName = `${side}Hand${finger}${joint}`;
        const bone = bones[boneName];
        if (bone) {
          // Curl the finger by rotating around X axis
          const curlAngle = curl * (joint === 1 ? 0.6 : 0.8);
          bone.rotation.x = curlAngle;
        }
      });
    });

    // Thumb
    const thumbCurl = shape.thumb;
    [1, 2, 3].forEach((joint) => {
      const boneName = `${side}HandThumb${joint}`;
      const bone = bones[boneName];
      if (bone) {
        bone.rotation.x = thumbCurl * 0.4;
        if (joint === 1) {
          bone.rotation.z = thumbCurl * 0.3 * (isRight ? 1 : -1);
        }
      }
    });
  };

  // Apply arm position for sign
  const applyArmPosition = (sign: ASLSign, progress: number) => {
    const bones = bonesRef.current;
    const eased = easeInOutCubic(progress);

    // Get target position from sign (normalized -1 to 1)
    const loc = sign.location;
    const mov = sign.movement;

    // Base position from sign location
    let targetY = loc.y; // Vertical: -1 (low) to 1 (high)
    let targetX = loc.x; // Horizontal: -1 (left) to 1 (right)
    let targetZ = loc.z; // Forward: 0 (close) to 1 (far)

    // Apply movement direction
    if (mov.direction) {
      targetX += mov.direction.x * eased * 0.3;
      targetY += mov.direction.y * eased * 0.3;
      targetZ += mov.direction.z * eased * 0.3;
    }

    // Repetition bounce
    if (mov.repetitions && mov.repetitions > 1) {
      const cycleProgress = (progress * mov.repetitions) % 1;
      const bounce = Math.sin(cycleProgress * Math.PI * 2) * 0.15;
      targetY += bounce;
    }

    // Right arm positioning
    const rightArm = bones["RightArm"];
    const rightForeArm = bones["RightForeArm"];
    const rightHand = bones["RightHand"];

    if (rightArm) {
      // X rotation: tilts arm forward (positive = forward)
      // Y rotation: rotates arm in/out
      // Z rotation: raises/lowers from T-pose (0 = T-pose, negative = down, positive = up)
      const armForward = 0.4 + targetZ * 0.4; // Forward tilt
      const armRaise = -0.2 + targetY * 0.8; // Raise/lower (negative starts low)
      rightArm.rotation.set(armForward, 0, armRaise);
    }
    if (rightForeArm) {
      // Bend the elbow naturally
      const elbowBend = 0.3 + targetZ * 0.5; // More forward = more bend
      rightForeArm.rotation.set(0, 0, elbowBend);
    }
    if (rightHand) {
      rightHand.rotation.set(0, 0, 0);
    }

    // Left arm (mirror or resting)
    const leftArm = bones["LeftArm"];
    const leftForeArm = bones["LeftForeArm"];
    const leftHand = bones["LeftHand"];

    if (sign.handshape.nonDominant) {
      // Two-handed sign - mirror the right arm
      if (leftArm) {
        const armForward = 0.4 + targetZ * 0.4;
        const armRaise = 0.2 - targetY * 0.8; // Mirror (positive for left side)
        leftArm.rotation.set(armForward, 0, armRaise);
      }
      if (leftForeArm) {
        const elbowBend = -0.3 - targetZ * 0.5;
        leftForeArm.rotation.set(0, 0, elbowBend);
      }
      if (leftHand) {
        leftHand.rotation.set(0, 0, 0);
      }
    } else {
      // Left arm stays in natural resting pose
      if (leftArm) {
        leftArm.rotation.set(0.15, 0, -0.25);
      }
      if (leftForeArm) {
        leftForeArm.rotation.set(0, 0, -0.1);
      }
    }
  };

  // Set natural resting pose for arms
  const setRestingPose = () => {
    const bones = bonesRef.current;

    // Right arm - natural hang with slight forward angle
    const rightShoulder = bones["RightShoulder"];
    const rightArm = bones["RightArm"];
    const rightForeArm = bones["RightForeArm"];
    const rightHand = bones["RightHand"];

    if (rightShoulder) {
      rightShoulder.rotation.set(0, 0, 0);
    }
    if (rightArm) {
      // Rotate down from T-pose: positive X tilts forward, positive Z brings down
      rightArm.rotation.set(0.15, 0, 0.25);
    }
    if (rightForeArm) {
      rightForeArm.rotation.set(0, 0, 0.1);
    }
    if (rightHand) {
      rightHand.rotation.set(0, 0, 0);
    }

    // Left arm - mirror of right
    const leftShoulder = bones["LeftShoulder"];
    const leftArm = bones["LeftArm"];
    const leftForeArm = bones["LeftForeArm"];
    const leftHand = bones["LeftHand"];

    if (leftShoulder) {
      leftShoulder.rotation.set(0, 0, 0);
    }
    if (leftArm) {
      leftArm.rotation.set(0.15, 0, -0.25);
    }
    if (leftForeArm) {
      leftForeArm.rotation.set(0, 0, -0.1);
    }
    if (leftHand) {
      leftHand.rotation.set(0, 0, 0);
    }
  };

  // Animation frame
  useFrame((_, delta) => {
    if (!bonesRef.current || Object.keys(bonesRef.current).length === 0) return;

    const bones = bonesRef.current;

    // Apply facial expression
    if (state.expressionState) {
      applyFacialExpression(state.expressionState);
    }

    // Handle sign animation
    if (state.currentSign && state.isAnimating) {
      // New sign started
      if (currentSignRef.current !== state.currentSign) {
        currentSignRef.current = state.currentSign;
        animationStartTime.current = 0;
        animationProgress.current = 0;
        console.log(
          "[Avatar] Starting animation for:",
          state.currentSign.gloss,
        );
      }

      // Update animation progress
      animationStartTime.current += delta * 1000;
      const duration = state.currentSign.duration;
      const progress = Math.min(animationStartTime.current / duration, 1);
      animationProgress.current = progress;

      // Apply hand shapes
      const rightShape = state.currentSign.handshape.dominant || "flat-hand";
      const leftShape = state.currentSign.handshape.nonDominant || "flat-hand";
      applyHandShape(rightShape, true);
      applyHandShape(leftShape, false);

      // Apply arm positions
      applyArmPosition(state.currentSign, progress);

      // Check if animation complete
      if (progress >= 1) {
        onSignComplete?.();
      }
    } else {
      // Reset to natural resting pose
      setRestingPose();
      applyHandShape("open-hand", true);
      applyHandShape("open-hand", false);
    }

    // Head tilt - subtle
    const head = bones["Head"];
    if (head && state.expressionState) {
      head.rotation.x = state.expressionState.headTilt.x * 0.15;
      head.rotation.y = state.expressionState.headTilt.y * 0.2;
      head.rotation.z = state.expressionState.headTilt.z * 0.08;
    }
  });

  return (
    <group ref={group} position={[0, -1.0, 0]} scale={1}>
      <primitive object={clonedScene} />
    </group>
  );
}

// Preload helper
export function preloadAvatar(url: string) {
  useGLTF.preload(url);
}
