"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

interface SMPLXAvatarProps {
  url: string;
  /** SMPL-X parameters array (182 values) */
  smplxFrame: number[] | null;
  /** Debug: which body parts to animate */
  enabledParts?: {
    root?: boolean;
    spine?: boolean;
    arms?: boolean;
    legs?: boolean;
    hands?: boolean;
  };
}

/**
 * SMPL-X body joint indices (21 joints in body_pose, pelvis is separate in root_pose)
 * body_pose[i*3 : i*3+3] = joint i rotation (axis-angle)
 * NOTE: pelvis is NOT in body_pose, it's in root_pose!
 */
const SMPLX_BODY_JOINTS = [
  "left_hip", // 0 in body_pose
  "right_hip", // 1
  "spine1", // 2
  "left_knee", // 3
  "right_knee", // 4
  "spine2", // 5
  "left_ankle", // 6
  "right_ankle", // 7
  "spine3", // 8
  "left_foot", // 9
  "right_foot", // 10
  "neck", // 11
  "left_collar", // 12
  "right_collar", // 13
  "head", // 14
  "left_shoulder", // 15
  "right_shoulder", // 16
  "left_elbow", // 17
  "right_elbow", // 18
  "left_wrist", // 19
  "right_wrist", // 20
];

/**
 * Mapping from SMPL-X joint name to RPM bone name
 */
const SMPLX_TO_RPM: Record<string, string> = {
  pelvis: "Hips",
  spine1: "Spine",
  spine2: "Spine1",
  spine3: "Spine2",
  neck: "Neck",
  head: "Head",
  left_collar: "LeftShoulder",
  right_collar: "RightShoulder",
  left_shoulder: "LeftArm",
  right_shoulder: "RightArm",
  left_elbow: "LeftForeArm",
  right_elbow: "RightForeArm",
  left_wrist: "LeftHand",
  right_wrist: "RightHand",
  left_hip: "LeftUpLeg",
  right_hip: "RightUpLeg",
  left_knee: "LeftLeg",
  right_knee: "RightLeg",
  left_ankle: "LeftFoot",
  right_ankle: "RightFoot",
};

/**
 * SMPL-X hand joint indices (15 per hand)
 * Each finger: MCP, PIP, DIP
 */
const SMPLX_HAND_JOINTS = [
  "index1",
  "index2",
  "index3", // 0-2
  "middle1",
  "middle2",
  "middle3", // 3-5
  "pinky1",
  "pinky2",
  "pinky3", // 6-8
  "ring1",
  "ring2",
  "ring3", // 9-11
  "thumb1",
  "thumb2",
  "thumb3", // 12-14
];

const HAND_TO_RPM: Record<string, string> = {
  index1: "Index1",
  index2: "Index2",
  index3: "Index3",
  middle1: "Middle1",
  middle2: "Middle2",
  middle3: "Middle3",
  pinky1: "Pinky1",
  pinky2: "Pinky2",
  pinky3: "Pinky3",
  ring1: "Ring1",
  ring2: "Ring2",
  ring3: "Ring3",
  thumb1: "Thumb1",
  thumb2: "Thumb2",
  thumb3: "Thumb3",
};

/**
 * Convert axis-angle (3D vector) to Quaternion
 * Axis-angle: direction = axis, magnitude = angle
 */
function axisAngleToQuat(aa: [number, number, number]): THREE.Quaternion {
  const angle = Math.sqrt(aa[0] ** 2 + aa[1] ** 2 + aa[2] ** 2);
  if (angle < 0.0001) {
    return new THREE.Quaternion();
  }
  const axis = new THREE.Vector3(aa[0] / angle, aa[1] / angle, aa[2] / angle);
  return new THREE.Quaternion().setFromAxisAngle(axis, angle);
}

// Bones that are part of each body region
const LEG_BONES = [
  "LeftUpLeg",
  "RightUpLeg",
  "LeftLeg",
  "RightLeg",
  "LeftFoot",
  "RightFoot",
];
const ARM_BONES = [
  "LeftArm",
  "RightArm",
  "LeftForeArm",
  "RightForeArm",
  "LeftHand",
  "RightHand",
  "LeftShoulder",
  "RightShoulder",
];
const SPINE_BONES = ["Spine", "Spine1", "Spine2", "Neck", "Head"];

/**
 * Apply axis correction for arm bones
 * Both arms going left = need proper mirroring for right side
 * Mirror: keep X, negate Y and Z
 */
function correctArmRotation(
  quat: THREE.Quaternion,
  boneName: string,
): THREE.Quaternion {
  const isLeft = boneName.startsWith("Left");
  const euler = new THREE.Euler().setFromQuaternion(quat, "XYZ");

  if (isLeft) {
    return quat; // Left arm unchanged
  } else {
    // Right arm: negate Y and Z for proper mirroring
    return new THREE.Quaternion().setFromEuler(
      new THREE.Euler(euler.x, -euler.y, -euler.z, "XYZ"),
    );
  }
}

/**
 * Parse SMPL-X 182 parameters into structured format
 */
function parseSMPLX(params: number[]) {
  return {
    rootPose: params.slice(0, 3) as [number, number, number],
    bodyPose: params.slice(3, 66), // 21 joints * 3
    leftHandPose: params.slice(66, 111), // 15 joints * 3
    rightHandPose: params.slice(111, 156), // 15 joints * 3
    jawPose: params.slice(156, 159) as [number, number, number],
    betas: params.slice(159, 169),
    expression: params.slice(169, 179),
    camTrans: params.slice(179, 182) as [number, number, number],
  };
}

export function SMPLXAvatar({
  url,
  smplxFrame,
  enabledParts = {},
}: SMPLXAvatarProps) {
  const {
    root = true,
    spine = true,
    arms = true,
    legs = false, // Disable legs by default - often problematic
    hands = true,
  } = enabledParts;
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => cloneSkeleton(scene), [scene]);
  const bonesRef = useRef<Record<string, THREE.Bone>>({});
  const [debug, setDebug] = useState<string[]>([]);

  // Find bones
  useEffect(() => {
    const bones: Record<string, THREE.Bone> = {};
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        bones[child.name] = child;
      }
    });
    bonesRef.current = bones;

    // Debug: log available bones
    const boneNames = Object.keys(bones).sort();
    console.log("[SMPLXAvatar] Found bones:", boneNames.join(", "));
    setDebug(
      boneNames.filter(
        (n) => n.includes("Arm") || n.includes("Hand") || n.includes("Spine"),
      ),
    );
  }, [clonedScene]);

  // Apply SMPL-X rotations to bones
  useFrame(() => {
    if (!smplxFrame) return;
    const bones = bonesRef.current;
    if (Object.keys(bones).length === 0) return;

    const parsed = parseSMPLX(smplxFrame);

    // Helper: check if bone should be animated
    const shouldAnimate = (boneName: string): boolean => {
      if (LEG_BONES.includes(boneName)) return legs;
      if (ARM_BONES.includes(boneName)) return arms;
      if (SPINE_BONES.includes(boneName)) return spine;
      if (boneName === "Hips") return root;
      if (boneName.includes("Hand") && !ARM_BONES.includes(boneName))
        return hands;
      return true;
    };

    // Apply root rotation - just cancel out the -PI rotation to stand upright
    if (root && bones["Hips"]) {
      // SMPL-X root is [-π, 0, 0], meaning flipped. We just set identity to stand upright.
      // Don't apply the SMPL-X root rotation - it makes the model face down
      bones["Hips"].quaternion.set(0, 0, 0, 1); // Identity = stand upright
    }

    // Apply body joint rotations (21 joints, pelvis is NOT in this array)
    for (let i = 0; i < 21; i++) {
      const jointName = SMPLX_BODY_JOINTS[i];
      const rpmBone = SMPLX_TO_RPM[jointName];
      if (!rpmBone || !bones[rpmBone]) continue;
      if (!shouldAnimate(rpmBone)) continue;

      const aa: [number, number, number] = [
        parsed.bodyPose[i * 3],
        parsed.bodyPose[i * 3 + 1],
        parsed.bodyPose[i * 3 + 2],
      ];
      let quat = axisAngleToQuat(aa);

      // Apply arm corrections
      if (ARM_BONES.includes(rpmBone)) {
        quat = correctArmRotation(quat, rpmBone);
      }

      bones[rpmBone].quaternion.copy(quat);
    }

    // Apply hand rotations only if hands enabled
    if (hands) {
      // Left hand
      for (let i = 0; i < 15; i++) {
        const jointName = SMPLX_HAND_JOINTS[i];
        const rpmBoneName = `LeftHand${HAND_TO_RPM[jointName]}`;
        if (!bones[rpmBoneName]) continue;

        const aa: [number, number, number] = [
          parsed.leftHandPose[i * 3],
          parsed.leftHandPose[i * 3 + 1],
          parsed.leftHandPose[i * 3 + 2],
        ];
        const quat = axisAngleToQuat(aa);
        bones[rpmBoneName].quaternion.copy(quat);
      }

      // Right hand
      for (let i = 0; i < 15; i++) {
        const jointName = SMPLX_HAND_JOINTS[i];
        const rpmBoneName = `RightHand${HAND_TO_RPM[jointName]}`;
        if (!bones[rpmBoneName]) continue;

        const aa: [number, number, number] = [
          parsed.rightHandPose[i * 3],
          parsed.rightHandPose[i * 3 + 1],
          parsed.rightHandPose[i * 3 + 2],
        ];
        const quat = axisAngleToQuat(aa);
        bones[rpmBoneName].quaternion.copy(quat);
      }
    }
  });

  return (
    <group ref={group} position={[0, -1.0, 0]} scale={1}>
      <primitive object={clonedScene} />
    </group>
  );
}
