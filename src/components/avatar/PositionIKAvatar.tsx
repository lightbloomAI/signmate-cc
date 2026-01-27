"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

/**
 * Joint position data from SMPL-X export
 */
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

interface PositionIKAvatarProps {
  url: string;
  frame: FrameData | null;
}

/**
 * Two-bone IK solver for arm positioning
 */
function solveTwoBoneIK(
  shoulderWorldPos: THREE.Vector3,
  targetWorldPos: THREE.Vector3,
  upperArmLength: number,
  forearmLength: number,
  hint: THREE.Vector3, // Elbow hint direction
  isRight: boolean,
): { shoulderQuat: THREE.Quaternion; elbowAngle: number } | null {
  const toTarget = new THREE.Vector3().subVectors(
    targetWorldPos,
    shoulderWorldPos,
  );
  const distance = toTarget.length();
  const totalLength = upperArmLength + forearmLength;

  // Clamp to reachable range
  const reachDist = Math.min(distance, totalLength * 0.999);
  if (reachDist < Math.abs(upperArmLength - forearmLength) * 1.01) {
    return null; // Too close
  }

  // Law of cosines for elbow angle
  const cosElbow =
    (upperArmLength * upperArmLength +
      forearmLength * forearmLength -
      reachDist * reachDist) /
    (2 * upperArmLength * forearmLength);
  const elbowAngle = Math.acos(Math.max(-1, Math.min(1, cosElbow)));

  // Shoulder angle to target
  const cosShoulder =
    (upperArmLength * upperArmLength +
      reachDist * reachDist -
      forearmLength * forearmLength) /
    (2 * upperArmLength * reachDist);
  const shoulderAngle = Math.acos(Math.max(-1, Math.min(1, cosShoulder)));

  // Build rotation to point at target
  const direction = toTarget.clone().normalize();

  // Create rotation that points arm toward target
  // RPM arms in T-pose point along X axis (left: -X, right: +X)
  const restDir = new THREE.Vector3(isRight ? 1 : -1, 0, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(restDir, direction);

  // Adjust for shoulder angle (rotate down by shoulderAngle)
  const axis = new THREE.Vector3().crossVectors(restDir, direction).normalize();
  if (axis.length() > 0.001) {
    const adjustQuat = new THREE.Quaternion().setFromAxisAngle(
      axis,
      -shoulderAngle,
    );
    quat.premultiply(adjustQuat);
  }

  return {
    shoulderQuat: quat,
    elbowAngle: Math.PI - elbowAngle, // Bend angle
  };
}

/**
 * Calculate finger curl from joint positions
 */
function calculateFingerCurl(joints: Vec3[]): [number, number, number] {
  if (joints.length < 3) return [0, 0, 0];

  // Calculate angles between consecutive joints
  const curls: [number, number, number] = [0, 0, 0];

  for (let i = 0; i < 2 && i < joints.length - 1; i++) {
    const v1 = new THREE.Vector3(
      joints[i + 1].x - joints[i].x,
      joints[i + 1].y - joints[i].y,
      joints[i + 1].z - joints[i].z,
    );

    // Curl is roughly how much the finger bends down
    // Simplified: use y-component change as proxy for curl
    const bendAmount = Math.max(0, -v1.y) * 3; // Scale factor
    curls[i] = Math.min(1.5, bendAmount);
  }

  return curls;
}

// Static coordinate conversion for debug rendering (must match toWorld in useFrame)
const toWorldStatic = (v: Vec3): THREE.Vector3 => {
  return new THREE.Vector3(v.x, -v.y, -v.z);
};

export function PositionIKAvatar({
  url,
  frame,
  showDebug = true,
}: PositionIKAvatarProps & { showDebug?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const debugRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => cloneSkeleton(scene), [scene]);

  const bonesRef = useRef<Record<string, THREE.Bone>>({});
  const boneLengthsRef = useRef({
    leftUpperArm: 0.28,
    leftForearm: 0.25,
    rightUpperArm: 0.28,
    rightForearm: 0.25,
  });

  // Find bones and measure lengths
  useEffect(() => {
    const bones: Record<string, THREE.Bone> = {};

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        bones[child.name] = child;
      }
    });

    bonesRef.current = bones;

    // Measure bone lengths from rest pose
    const measureLength = (start: string, end: string): number => {
      if (!bones[start] || !bones[end]) return 0.25;
      const startPos = new THREE.Vector3();
      const endPos = new THREE.Vector3();
      bones[start].getWorldPosition(startPos);
      bones[end].getWorldPosition(endPos);
      return startPos.distanceTo(endPos);
    };

    boneLengthsRef.current = {
      leftUpperArm: measureLength("LeftArm", "LeftForeArm"),
      leftForearm: measureLength("LeftForeArm", "LeftHand"),
      rightUpperArm: measureLength("RightArm", "RightForeArm"),
      rightForearm: measureLength("RightForeArm", "RightHand"),
    };

    console.log("[PositionIK] Bone lengths:", boneLengthsRef.current);
  }, [clonedScene]);

  // Apply IK each frame
  useFrame(() => {
    if (!frame) return;
    const bones = bonesRef.current;
    if (Object.keys(bones).length === 0) return;

    const lengths = boneLengthsRef.current;

    // SMPL-X coordinate system (discovered from data):
    // - Y points DOWN (head y = -0.62, below pelvis origin)
    // - Z negative = in front
    // Three.js:
    // - Y points UP
    // - Z positive = toward camera (in front)
    // Avatar is at y=-1 with internal pelvis at ~1, so world pelvis ≈ 0
    // No offset needed - targets are relative to pelvis which is at y≈0

    const toWorld = (v: Vec3): THREE.Vector3 => {
      return new THREE.Vector3(
        v.x, // X stays (left-right)
        -v.y, // Flip Y (down→up), no offset
        -v.z, // Flip Z (front stays front)
      );
    };

    // Get shoulder world positions from avatar
    const getShoulderPos = (boneName: string): THREE.Vector3 => {
      const pos = new THREE.Vector3();
      if (bones[boneName]?.parent) {
        bones[boneName].parent!.getWorldPosition(pos);
      }
      return pos;
    };

    // === SIMPLE ARM POSITIONING ===
    // RPM arm bones in T-pose:
    // - RightArm points along +X (to the right)
    // - LeftArm points along -X (to the left)
    // We need to rotate from this rest pose toward the target

    const pointArmAt = (
      armBone: THREE.Bone,
      forearmBone: THREE.Bone,
      targetPos: THREE.Vector3,
      elbowPos: THREE.Vector3,
      isRight: boolean,
    ) => {
      // Get shoulder world position
      const shoulderPos = new THREE.Vector3();
      armBone.getWorldPosition(shoulderPos);

      // Direction from shoulder to target in world space
      const toTarget = new THREE.Vector3().subVectors(targetPos, shoulderPos);
      const distance = toTarget.length();

      // Normalize for direction
      const dir = toTarget.clone().normalize();

      // DEBUG
      if (Math.random() < 0.02) {
        console.log(
          `[IK ${isRight ? "R" : "L"}] dir:`,
          dir.toArray().map((v) => v.toFixed(2)),
        );
      }

      // Simple approach: calculate angles to rotate from T-pose to target
      // T-pose: right arm = +X, left arm = -X
      //
      // For RIGHT arm starting at +X direction:
      //   rotY (around world Y): swings arm forward/back in horizontal plane
      //   rotZ (around world Z): raises/lowers arm
      //
      // rotY = angle in XZ plane from +X toward +Z
      // rotZ = angle to raise/lower from horizontal

      const rotY = Math.atan2(dir.z, dir.x); // 0 when pointing +X, π/2 when +Z
      const horizontalDist = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
      const rotZ = Math.atan2(dir.y, horizontalDist); // 0 when horizontal, +π/2 when up

      // Apply to arm bone
      // Note: bone.rotation is local, but for arms the parent (shoulder) is roughly aligned with world
      // RPM arm bones: +X points along arm, Y is twist, Z is...
      // Let's try: Y rotation for forward swing, Z for up/down

      if (isRight) {
        // Right arm: rotY swings forward, -rotZ raises
        armBone.rotation.set(0, rotY, -rotZ);
      } else {
        // Left arm: mirror - starts at -X, so rotY needs adjustment
        const leftRotY = Math.atan2(dir.z, -dir.x); // angle from -X toward +Z
        armBone.rotation.set(0, -leftRotY, rotZ);
      }

      // Elbow bend based on distance vs arm length
      const totalLen = isRight
        ? lengths.rightUpperArm + lengths.rightForearm
        : lengths.leftUpperArm + lengths.leftForearm;

      // More bend when target is closer
      const bendRatio = Math.max(
        0,
        Math.min(1, 1 - distance / (totalLen * 0.9)),
      );
      const bendAngle = bendRatio * Math.PI * 0.7; // Max 126° bend

      // Forearm bends on local Y axis for RPM
      forearmBone.rotation.set(0, isRight ? bendAngle : -bendAngle, 0);
    };

    // Right arm
    if (bones["RightArm"] && bones["RightForeArm"]) {
      const targetPos = toWorld(frame.rightWrist);
      const elbowPos = toWorld(frame.rightElbow);
      pointArmAt(
        bones["RightArm"],
        bones["RightForeArm"],
        targetPos,
        elbowPos,
        true,
      );
    }

    // Left arm
    if (bones["LeftArm"] && bones["LeftForeArm"]) {
      const targetPos = toWorld(frame.leftWrist);
      const elbowPos = toWorld(frame.leftElbow);
      pointArmAt(
        bones["LeftArm"],
        bones["LeftForeArm"],
        targetPos,
        elbowPos,
        false,
      );
    }

    // === FINGERS ===
    const applyFingers = (fingers: FingerJoints, side: "Left" | "Right") => {
      const fingerNames = [
        "Index",
        "Middle",
        "Ring",
        "Pinky",
        "Thumb",
      ] as const;
      const fingerKeys = ["index", "middle", "ring", "pinky", "thumb"] as const;

      for (let f = 0; f < fingerNames.length; f++) {
        const curls = calculateFingerCurl(fingers[fingerKeys[f]]);

        for (let j = 0; j < 3; j++) {
          const boneName = `${side}Hand${fingerNames[f]}${j + 1}`;
          const bone = bones[boneName];
          if (bone) {
            // Apply curl rotation
            const curlAmount = curls[j] || 0;
            if (fingerNames[f] === "Thumb") {
              bone.rotation.set(
                curlAmount * 0.5,
                0,
                side === "Right" ? curlAmount * 0.3 : -curlAmount * 0.3,
              );
            } else {
              bone.rotation.set(curlAmount, 0, 0);
            }
          }
        }
      }
    };

    applyFingers(frame.rightFingers, "Right");
    applyFingers(frame.leftFingers, "Left");

    // === HEAD ===
    // Subtle head movement based on position
    if (bones["Head"]) {
      const headPos = frame.head;
      // Use head offset from neutral as rotation hint
      bones["Head"].rotation.set(
        -headPos.z * 0.5, // Nod
        headPos.x * 0.5, // Turn
        0,
      );
    }
  });

  // Get debug target positions for rendering
  const debugTargets = frame
    ? {
        leftWrist: toWorldStatic(frame.leftWrist),
        rightWrist: toWorldStatic(frame.rightWrist),
        leftElbow: toWorldStatic(frame.leftElbow),
        rightElbow: toWorldStatic(frame.rightElbow),
      }
    : null;

  // Log positions for debugging
  useEffect(() => {
    if (debugTargets) {
      console.log("[PositionIK] Target positions:", {
        rightWrist: debugTargets.rightWrist,
        leftWrist: debugTargets.leftWrist,
      });
    }
  }, [frame]);

  return (
    <group ref={group}>
      {/* Avatar at y=-1 to put feet at ground */}
      <group position={[0, -1.0, 0]}>
        <primitive object={clonedScene} />
      </group>

      {/* Debug markers - ALWAYS show test sphere + targets if available */}
      {showDebug && (
        <group ref={debugRef}>
          {/* Fixed test sphere - should always be visible in front of avatar */}
          <mesh position={[0, 0.3, 0.5]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial
              color="yellow"
              emissive="yellow"
              emissiveIntensity={0.8}
            />
          </mesh>

          {debugTargets && (
            <>
              {/* Left wrist - green */}
              <mesh
                position={[
                  debugTargets.leftWrist.x,
                  debugTargets.leftWrist.y - 1,
                  debugTargets.leftWrist.z,
                ]}
              >
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial
                  color="lime"
                  emissive="lime"
                  emissiveIntensity={0.5}
                />
              </mesh>
              {/* Right wrist - red */}
              <mesh
                position={[
                  debugTargets.rightWrist.x,
                  debugTargets.rightWrist.y - 1,
                  debugTargets.rightWrist.z,
                ]}
              >
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial
                  color="red"
                  emissive="red"
                  emissiveIntensity={0.5}
                />
              </mesh>
            </>
          )}
        </group>
      )}
    </group>
  );
}
