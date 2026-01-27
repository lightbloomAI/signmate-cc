"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { AvatarPose, FingerPose } from "@/lib/motion/playback";
import type { ARKitBlendshape } from "@/lib/motion/types";

interface SignMotionAvatarProps {
  url: string;
  pose: AvatarPose | null;
}

/**
 * RPM Avatar that renders based on AvatarPose from SignMotion playback
 */
export function SignMotionAvatar({ url, pose }: SignMotionAvatarProps) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  const clonedScene = useMemo(() => {
    const clone = cloneSkeleton(scene);
    return clone;
  }, [scene]);

  const bonesRef = useRef<Record<string, THREE.Bone>>({});
  const meshRef = useRef<THREE.SkinnedMesh | null>(null);

  // Find bones and mesh on mount
  useEffect(() => {
    const bones: Record<string, THREE.Bone> = {};
    let skinnedMesh: THREE.SkinnedMesh | null = null;

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        bones[child.name] = child;
      }
      if (child instanceof THREE.SkinnedMesh) {
        skinnedMesh = child;
        if (child.morphTargetInfluences) {
          child.morphTargetInfluences.fill(0);
        }
      }
    });

    bonesRef.current = bones;
    meshRef.current = skinnedMesh;

    console.log("[SignMotionAvatar] Bones:", Object.keys(bones).length);
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
          // Apply curl rotation
          const curlAngle = curls[idx] * (key === "thumb" ? 0.6 : 0.9);
          bone.rotation.x = curlAngle;

          // Thumb needs Z rotation too
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
    if (!mesh) return;

    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;
    if (!dict || !influences) return;

    // Reset all to 0 first
    influences.fill(0);

    // Apply each blendshape
    for (const [name, value] of Object.entries(blendshapes)) {
      if (dict[name] !== undefined && value !== undefined) {
        influences[dict[name]] = value;
      }
    }
  };

  // Animation frame - apply pose
  useFrame(() => {
    const bones = bonesRef.current;
    if (Object.keys(bones).length === 0) return;

    // If no pose, don't override - let avatar stay in its default pose
    if (!pose) return;

    const activePose = pose;

    // Apply arm rotations
    const rightArm = bones["RightArm"];
    const rightForeArm = bones["RightForeArm"];
    const rightHand = bones["RightHand"];
    const leftArm = bones["LeftArm"];
    const leftForeArm = bones["LeftForeArm"];
    const leftHand = bones["LeftHand"];

    if (rightArm) {
      rightArm.rotation.set(
        activePose.rightArm.x,
        activePose.rightArm.y,
        activePose.rightArm.z,
      );
    }
    if (rightForeArm) {
      rightForeArm.rotation.set(
        activePose.rightForeArm.x,
        activePose.rightForeArm.y,
        activePose.rightForeArm.z,
      );
    }
    if (rightHand) {
      rightHand.rotation.set(
        activePose.rightHand.x,
        activePose.rightHand.y,
        activePose.rightHand.z,
      );
    }

    if (leftArm) {
      leftArm.rotation.set(
        activePose.leftArm.x,
        activePose.leftArm.y,
        activePose.leftArm.z,
      );
    }
    if (leftForeArm) {
      leftForeArm.rotation.set(
        activePose.leftForeArm.x,
        activePose.leftForeArm.y,
        activePose.leftForeArm.z,
      );
    }
    if (leftHand) {
      leftHand.rotation.set(
        activePose.leftHand.x,
        activePose.leftHand.y,
        activePose.leftHand.z,
      );
    }

    // Apply finger poses
    applyFingerPose(activePose.rightFingers, true);
    applyFingerPose(activePose.leftFingers, false);

    // Apply face blendshapes
    applyFaceBlendshapes(activePose.faceBlendshapes);

    // Apply head rotation
    const head = bones["Head"];
    if (head) {
      head.rotation.set(
        activePose.headRotation.x,
        activePose.headRotation.y,
        activePose.headRotation.z,
      );
    }
  });

  return (
    <group ref={group} position={[0, -1.0, 0]} scale={1}>
      <primitive object={clonedScene} />
    </group>
  );
}
