"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { AvatarPose, FingerPose } from "@/lib/motion/playback";
import type { ARKitBlendshape } from "@/lib/motion/types";

interface SignMotionAvatarIKProps {
  url: string;
  pose: AvatarPose | null;
  /** Target positions for IK (in normalized 0-1 space) */
  targets?: {
    rightWrist?: { x: number; y: number; z: number };
    leftWrist?: { x: number; y: number; z: number };
  };
}

/**
 * Simple two-bone IK solver
 * Given shoulder position, target position, and bone lengths,
 * calculates the elbow position and arm rotations
 */
function solveTwoBoneIK(
  shoulderPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  upperArmLength: number,
  forearmLength: number,
  isRight: boolean,
): { armRotation: THREE.Euler; forearmRotation: THREE.Euler } | null {
  const direction = new THREE.Vector3().subVectors(targetPos, shoulderPos);
  const distance = direction.length();
  const totalLength = upperArmLength + forearmLength;

  // Clamp distance to reachable range
  const clampedDistance = Math.min(distance, totalLength * 0.99);

  if (clampedDistance < Math.abs(upperArmLength - forearmLength) * 1.01) {
    // Target too close, use minimum reach
    return null;
  }

  // Calculate elbow angle using law of cosines
  const cosElbowAngle =
    (upperArmLength * upperArmLength +
      forearmLength * forearmLength -
      clampedDistance * clampedDistance) /
    (2 * upperArmLength * forearmLength);
  const elbowAngle = Math.acos(Math.max(-1, Math.min(1, cosElbowAngle)));

  // Calculate shoulder angle
  const cosShoulderAngle =
    (upperArmLength * upperArmLength +
      clampedDistance * clampedDistance -
      forearmLength * forearmLength) /
    (2 * upperArmLength * clampedDistance);
  const shoulderAngle = Math.acos(Math.max(-1, Math.min(1, cosShoulderAngle)));

  // Convert direction to angles
  direction.normalize();

  // Calculate arm rotation to point toward target
  // RPM avatar: X = up/down, Z = forward/back
  const armX = Math.asin(-direction.y) + shoulderAngle; // Vertical angle
  const armZ = Math.atan2(-direction.z, direction.x * (isRight ? 1 : -1)); // Horizontal angle

  // Elbow bend
  const forearmZ = -(Math.PI - elbowAngle); // Bend inward

  return {
    armRotation: new THREE.Euler(
      Math.max(0, Math.min(1.5, armX)),
      0,
      isRight
        ? Math.max(-1.6, Math.min(0.3, armZ))
        : Math.max(-0.3, Math.min(1.6, -armZ)),
    ),
    forearmRotation: new THREE.Euler(0, 0, isRight ? forearmZ : -forearmZ),
  };
}

/**
 * RPM Avatar with IK-based arm positioning
 */
export function SignMotionAvatarIK({
  url,
  pose,
  targets,
}: SignMotionAvatarIKProps) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  const clonedScene = useMemo(() => cloneSkeleton(scene), [scene]);

  const bonesRef = useRef<Record<string, THREE.Bone>>({});
  const meshRef = useRef<THREE.SkinnedMesh | null>(null);
  const boneLengthsRef = useRef<{ upperArm: number; forearm: number }>({
    upperArm: 0.25,
    forearm: 0.22,
  });

  // Find bones
  useEffect(() => {
    const bones: Record<string, THREE.Bone> = {};

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        bones[child.name] = child;
      }
      if (child instanceof THREE.SkinnedMesh) {
        meshRef.current = child;
        if (child.morphTargetInfluences) {
          child.morphTargetInfluences.fill(0);
        }
      }
    });

    bonesRef.current = bones;

    // Calculate bone lengths from T-pose
    if (bones["RightArm"] && bones["RightForeArm"] && bones["RightHand"]) {
      const shoulderPos = new THREE.Vector3();
      const elbowPos = new THREE.Vector3();
      const wristPos = new THREE.Vector3();

      bones["RightArm"].getWorldPosition(shoulderPos);
      bones["RightForeArm"].getWorldPosition(elbowPos);
      bones["RightHand"].getWorldPosition(wristPos);

      boneLengthsRef.current = {
        upperArm: shoulderPos.distanceTo(elbowPos),
        forearm: elbowPos.distanceTo(wristPos),
      };

      console.log("[AvatarIK] Bone lengths:", boneLengthsRef.current);
    }

    console.log(
      "[AvatarIK] Bones found:",
      Object.keys(bones)
        .filter((n) => n.includes("Arm") || n.includes("Hand"))
        .join(", "),
    );
  }, [clonedScene]);

  // Apply finger pose to bones
  const applyFingerPose = (fingers: FingerPose, isRight: boolean) => {
    const bones = bonesRef.current;
    const side = isRight ? "Right" : "Left";

    const fingerMap: Record<keyof FingerPose, string> = {
      thumb: "Thumb",
      index: "Index",
      middle: "Middle",
      ring: "Ring",
      pinky: "Pinky",
    };

    for (const [key, name] of Object.entries(fingerMap)) {
      const curls = fingers[key as keyof FingerPose];

      [1, 2, 3].forEach((joint, idx) => {
        const boneName = `${side}Hand${name}${joint}`;
        const bone = bones[boneName];
        if (bone) {
          const curlAngle = curls[idx] * (key === "thumb" ? 0.6 : 0.9);
          bone.rotation.x = curlAngle;

          if (key === "thumb" && joint === 1) {
            bone.rotation.z = curls[idx] * 0.4 * (isRight ? 1 : -1);
          }
        }
      });
    }
  };

  // Apply face blendshapes
  const applyFaceBlendshapes = (
    blendshapes: Partial<Record<ARKitBlendshape, number>>,
  ) => {
    const mesh = meshRef.current;
    if (!mesh?.morphTargetDictionary || !mesh.morphTargetInfluences) return;

    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;

    influences.fill(0);
    for (const [name, value] of Object.entries(blendshapes)) {
      if (dict[name] !== undefined && value !== undefined) {
        influences[dict[name]] = value;
      }
    }
  };

  // Animation frame
  useFrame(() => {
    const bones = bonesRef.current;
    if (Object.keys(bones).length === 0) return;

    // Apply IK if we have target positions
    if (targets) {
      const { upperArm, forearm } = boneLengthsRef.current;

      // Get shoulder positions
      const rightShoulderPos = new THREE.Vector3();
      const leftShoulderPos = new THREE.Vector3();

      if (bones["RightArm"]) {
        bones["RightArm"].parent?.getWorldPosition(rightShoulderPos);
      }
      if (bones["LeftArm"]) {
        bones["LeftArm"].parent?.getWorldPosition(leftShoulderPos);
      }

      // Right arm IK
      if (targets.rightWrist && bones["RightArm"] && bones["RightForeArm"]) {
        // Convert normalized coordinates to world space
        // MediaPipe: x 0-1 left to right, y 0-1 top to bottom
        const scale = 1.2;
        const x = (targets.rightWrist.x - 0.5) * scale;
        const y = (0.5 - targets.rightWrist.y) * scale + 0.3; // Flip Y, offset to chest
        const z = 0.2 + (targets.rightWrist.z || 0) * 0.5;

        const targetPos = new THREE.Vector3(x, y, z);
        const result = solveTwoBoneIK(
          rightShoulderPos,
          targetPos,
          upperArm,
          forearm,
          true,
        );

        if (result) {
          bones["RightArm"].rotation.copy(result.armRotation);
          bones["RightForeArm"].rotation.copy(result.forearmRotation);
        }
      }

      // Left arm IK
      if (targets.leftWrist && bones["LeftArm"] && bones["LeftForeArm"]) {
        const scale = 1.2;
        const x = (targets.leftWrist.x - 0.5) * scale;
        const y = (0.5 - targets.leftWrist.y) * scale + 0.3;
        const z = 0.2 + (targets.leftWrist.z || 0) * 0.5;

        const targetPos = new THREE.Vector3(x, y, z);
        const result = solveTwoBoneIK(
          leftShoulderPos,
          targetPos,
          upperArm,
          forearm,
          false,
        );

        if (result) {
          bones["LeftArm"].rotation.copy(result.armRotation);
          bones["LeftForeArm"].rotation.copy(result.forearmRotation);
        }
      }
    }

    // Apply finger poses and face blendshapes from pose data
    if (pose) {
      applyFingerPose(pose.rightFingers, true);
      applyFingerPose(pose.leftFingers, false);
      applyFaceBlendshapes(pose.faceBlendshapes);

      const head = bones["Head"];
      if (head) {
        head.rotation.set(
          pose.headRotation.x,
          pose.headRotation.y,
          pose.headRotation.z,
        );
      }
    }
  });

  return (
    <group ref={group} position={[0, -1.0, 0]} scale={1}>
      <primitive object={clonedScene} />
    </group>
  );
}
