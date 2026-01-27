/**
 * SignMotion Playback System
 *
 * Converts SignMotion frame data to avatar bone rotations and morph targets
 */

import type {
  SignMotion,
  HandFrame,
  FaceFrame,
  BodyFrame,
  Vec3,
  ARKitBlendshape,
} from "./types";

// ============================================================================
// Types
// ============================================================================

export interface PlaybackState {
  motion: SignMotion;
  currentFrame: number;
  isPlaying: boolean;
  startTime: number;
  playbackSpeed: number;
}

export interface AvatarPose {
  // Arm rotations (euler angles in radians)
  rightArm: Vec3;
  rightForeArm: Vec3;
  rightHand: Vec3;
  leftArm: Vec3;
  leftForeArm: Vec3;
  leftHand: Vec3;

  // Finger curls (0-1 per finger, per joint)
  rightFingers: FingerPose;
  leftFingers: FingerPose;

  // Face morph targets
  faceBlendshapes: Partial<Record<ARKitBlendshape, number>>;

  // Head rotation
  headRotation: Vec3;
}

export interface FingerPose {
  thumb: [number, number, number]; // 3 joints
  index: [number, number, number];
  middle: [number, number, number];
  ring: [number, number, number];
  pinky: [number, number, number];
}

// ============================================================================
// MediaPipe Landmark Indices
// ============================================================================

const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

// ============================================================================
// Playback Controller
// ============================================================================

export function createPlaybackState(
  motion: SignMotion,
  speed: number = 1.0,
): PlaybackState {
  return {
    motion,
    currentFrame: 0,
    isPlaying: false,
    startTime: 0,
    playbackSpeed: speed,
  };
}

export function startPlayback(
  state: PlaybackState,
  timestamp: number,
): PlaybackState {
  return {
    ...state,
    isPlaying: true,
    startTime: timestamp,
    currentFrame: 0,
  };
}

export function stopPlayback(state: PlaybackState): PlaybackState {
  return {
    ...state,
    isPlaying: false,
  };
}

export function updatePlayback(
  state: PlaybackState,
  timestamp: number,
): { state: PlaybackState; frame: number; finished: boolean } {
  if (!state.isPlaying) {
    return { state, frame: state.currentFrame, finished: false };
  }

  const elapsed = (timestamp - state.startTime) * state.playbackSpeed;
  const frameTime = 1000 / state.motion.fps;
  const frame = Math.floor(elapsed / frameTime);

  if (frame >= state.motion.frameCount) {
    return {
      state: {
        ...state,
        isPlaying: false,
        currentFrame: state.motion.frameCount - 1,
      },
      frame: state.motion.frameCount - 1,
      finished: true,
    };
  }

  return {
    state: { ...state, currentFrame: frame },
    frame,
    finished: false,
  };
}

// ============================================================================
// Landmark to Pose Conversion
// ============================================================================

/**
 * Calculate angle between three points (in radians)
 */
function angleBetweenPoints(a: Vec3, b: Vec3, c: Vec3): number {
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y + ba.z * ba.z);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y + bc.z * bc.z);

  if (magBA === 0 || magBC === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return Math.acos(cosAngle);
}

/**
 * Convert angle to curl value (0 = straight, 1 = fully curled)
 */
function angleToCurl(angle: number): number {
  // Straight finger ≈ π radians (180°)
  // Fully curled ≈ π/2 radians (90°)
  const straight = Math.PI;
  const curled = Math.PI / 2;
  const curl = 1 - (angle - curled) / (straight - curled);
  return Math.max(0, Math.min(1, curl));
}

/**
 * Extract finger curl from hand landmarks
 */
function extractFingerCurl(
  landmarks: HandFrame["landmarks"],
  mcp: number,
  pip: number,
  dip: number,
  tip: number,
): [number, number, number] {
  const mcpPos = landmarks[mcp].position;
  const pipPos = landmarks[pip].position;
  const dipPos = landmarks[dip].position;
  const tipPos = landmarks[tip].position;

  // Calculate curl at each joint
  const curl1 = angleToCurl(
    angleBetweenPoints(landmarks[0].position, mcpPos, pipPos),
  ); // MCP
  const curl2 = angleToCurl(angleBetweenPoints(mcpPos, pipPos, dipPos)); // PIP
  const curl3 = angleToCurl(angleBetweenPoints(pipPos, dipPos, tipPos)); // DIP

  return [curl1, curl2, curl3];
}

/**
 * Extract finger pose from hand frame
 */
function extractFingerPose(hand: HandFrame | undefined): FingerPose {
  const defaultCurl: [number, number, number] = [0, 0, 0];

  if (!hand || hand.landmarks.length < 21) {
    return {
      thumb: defaultCurl,
      index: defaultCurl,
      middle: defaultCurl,
      ring: defaultCurl,
      pinky: defaultCurl,
    };
  }

  const lm = hand.landmarks;

  return {
    thumb: extractFingerCurl(
      lm,
      HAND_LANDMARKS.THUMB_CMC,
      HAND_LANDMARKS.THUMB_MCP,
      HAND_LANDMARKS.THUMB_IP,
      HAND_LANDMARKS.THUMB_TIP,
    ),
    index: extractFingerCurl(
      lm,
      HAND_LANDMARKS.INDEX_MCP,
      HAND_LANDMARKS.INDEX_PIP,
      HAND_LANDMARKS.INDEX_DIP,
      HAND_LANDMARKS.INDEX_TIP,
    ),
    middle: extractFingerCurl(
      lm,
      HAND_LANDMARKS.MIDDLE_MCP,
      HAND_LANDMARKS.MIDDLE_PIP,
      HAND_LANDMARKS.MIDDLE_DIP,
      HAND_LANDMARKS.MIDDLE_TIP,
    ),
    ring: extractFingerCurl(
      lm,
      HAND_LANDMARKS.RING_MCP,
      HAND_LANDMARKS.RING_PIP,
      HAND_LANDMARKS.RING_DIP,
      HAND_LANDMARKS.RING_TIP,
    ),
    pinky: extractFingerCurl(
      lm,
      HAND_LANDMARKS.PINKY_MCP,
      HAND_LANDMARKS.PINKY_PIP,
      HAND_LANDMARKS.PINKY_DIP,
      HAND_LANDMARKS.PINKY_TIP,
    ),
  };
}

/**
 * Calculate arm pose from body landmarks
 *
 * RPM bone axes (empirically tested by user):
 * - Arm.X: controls up/down (1.20 = down, 0.22 = raised)
 * - Arm.Z: inward movement (0 = side, ±1.53 = forward)
 * - ForeArm.Y: palm rotation (-1.23 = down, 1.17 = up for right)
 * - ForeArm.Z: elbow bend (0 = straight, -1.35/-2.56 = bent for right)
 *
 * MediaPipe coordinates:
 * - x: 0-1, left to right in camera view
 * - y: 0-1, top to bottom (0 = top)
 */
function calculateArmPose(
  shoulderPos: Vec3 | undefined,
  elbowPos: Vec3 | undefined,
  wristPos: Vec3 | undefined,
  isRight: boolean,
): { arm: Vec3; foreArm: Vec3; hand: Vec3 } | null {
  if (!shoulderPos || !elbowPos || !wristPos) return null;

  // === Calculate vectors ===
  const seX = elbowPos.x - shoulderPos.x;
  const seY = elbowPos.y - shoulderPos.y; // positive = elbow below shoulder
  const swX = wristPos.x - shoulderPos.x;
  const swY = wristPos.y - shoulderPos.y; // positive = wrist below shoulder
  const ewX = wristPos.x - elbowPos.x;
  const ewY = wristPos.y - elbowPos.y;

  // === Detect arm position type ===
  // Check if arm is extended FORWARD (zombie pose) vs BENT at elbow
  // Forward arm: elbow close to shoulder AND wrist FAR from shoulder (arm extended)
  // Bent arm: elbow close to shoulder BUT wrist CLOSE to shoulder (arm bent back)
  const elbowHorizDist = Math.abs(seX); // How far elbow is horizontally from shoulder
  const wristDist = Math.sqrt(swX * swX + swY * swY); // Total distance from shoulder to wrist
  const elbowDist = Math.sqrt(seX * seX + seY * seY); // Total distance from shoulder to elbow

  // Arm is forward if: elbow close to shoulder AND wrist is far (arm extended straight)
  // wristDist > elbowDist * 1.5 means arm is extended (wrist much farther than elbow)
  const isArmExtended = wristDist > elbowDist * 1.5;
  const isArmForward =
    elbowHorizDist < 0.08 && Math.abs(seY) < 0.15 && isArmExtended;

  // Calculate upper arm angle for raised/lowered detection
  const seAngle = Math.atan2(seY, Math.abs(seX)); // Angle of upper arm

  // Determine if arm is truly raised (elbow above shoulder AND not forward)
  const isArmRaised = seAngle < -0.2 && !isArmForward;

  // === ARM.X: Up/Down ===
  let clampedArmX: number;
  if (isArmForward) {
    // Arms forward (zombie): Arm.X ≈ 1.24 (arms horizontal, not raised)
    clampedArmX = 1.24;
  } else if (isArmRaised) {
    // Arm raised: use angle to determine how high
    // seAngle ≈ -π/2 -> Arm.X ≈ 0.22
    const armX = 0.71 + seAngle * 0.62;
    clampedArmX = Math.max(0.0, Math.min(0.5, armX)); // Raised arm: 0 to 0.5
  } else {
    // Arm down: use angle
    // seAngle ≈ π/2 -> Arm.X ≈ 1.20
    const armX = 0.71 + seAngle * 0.62;
    clampedArmX = Math.max(0.7, Math.min(1.3, armX)); // Down arm: 0.7 to 1.30
  }

  // === ARM.Z: Inward/forward movement ===
  let armZ: number;
  if (isArmForward) {
    // Arms extended forward: Z ≈ -1.53
    armZ = isRight ? -1.53 : 1.53;
  } else if (isArmRaised) {
    // Arm raised: Z near 0
    armZ = isRight ? 0.03 : -0.03;
  } else {
    // Arm down: calculate Z based on elbow position
    const expectedElbowX = isRight ? 0.08 : -0.08;
    const inwardAmount = expectedElbowX - seX;

    if (isRight) {
      armZ = inwardAmount * 12;
      armZ = Math.max(-1.6, Math.min(0.3, armZ));
    } else {
      armZ = -inwardAmount * 12;
      armZ = Math.max(-0.3, Math.min(1.6, armZ));
    }
  }

  // === FOREARM.Z: Elbow bend ===
  // Calculate angle between upper arm (shoulder->elbow) and forearm (elbow->wrist)
  const dot = seX * ewX + seY * ewY;
  const magSE = Math.sqrt(seX * seX + seY * seY);
  const magEW = Math.sqrt(ewX * ewX + ewY * ewY);

  let elbowAngle = 0; // Raw angle in radians
  if (magSE > 0.01 && magEW > 0.01) {
    const cosAngle = Math.max(-1, Math.min(1, dot / (magSE * magEW)));
    elbowAngle = Math.acos(cosAngle); // 0 = straight arm, PI = fully bent back
  }

  // Determine forearm direction: is wrist moving toward body center or outward?
  // For right arm: ewX < 0 means wrist is left of elbow (toward center) = "curling in"
  // For right arm: ewX >= 0 means wrist is right of elbow (forward/out) = "reaching out"
  const isForearmInward = isRight ? ewX < -0.02 : ewX > 0.02;

  // Scale elbow bend differently based on pose type:
  // - Arms forward: straight arm, ForeArm.Z ≈ 0
  // - Wave hi (raised arm): needs up to -2.56 (tight bend)
  // - Reading book (forearm outward): needs ~-1.35 (moderate)
  let elbowBend: number;
  if (isArmForward) {
    // Arms forward: straight arm
    elbowBend = elbowAngle * 0.1; // Minimal bend
  } else if (isArmRaised) {
    // Raised arm can have tighter bends (wave hi needs -2.56)
    elbowBend = elbowAngle * 0.95; // Increased to reach -2.56
  } else {
    // Lowered arm - moderate scaling
    elbowBend = elbowAngle * 0.55;
  }

  // === FOREARM.Y: Palm orientation ===
  // Determine palm orientation based on arm position, elbow bend, and forearm direction
  let palmY: number;
  if (isArmForward) {
    // Arms forward (zombie): palm faces DOWN
    palmY = isRight ? -1.23 : 1.23;
  } else if (isArmRaised) {
    // Raised arm (wave hi): palm faces outward
    palmY = isRight ? 1.17 : -1.17;
  } else if (elbowBend > 0.7) {
    // Elbow is bent - check forearm direction for palm orientation
    if (isForearmInward) {
      // Forearm curling in toward body: palms toward face (-0.68)
      palmY = isRight ? -0.68 : 0.68;
    } else {
      // Forearm reaching out/forward: palms UP (-0.12)
      palmY = isRight ? -0.12 : 0.12;
    }
  } else {
    // Arm at side, straight: neutral
    palmY = 0;
  }

  // === FOREARM.X: Forearm tilt ===
  // For wave hi: ForeArm.X ≈ 0.63
  // For arms forward: ForeArm.X ≈ 0
  // For reading book: ForeArm.X ≈ 1.58
  let foreArmX = 0;
  if (isArmForward) {
    // Arms forward: straight arm, no forearm tilt
    foreArmX = 0;
  } else if (isArmRaised && elbowBend > 1.0) {
    // Raised arm with elbow bend (wave hi)
    foreArmX = 0.63;
  } else if (elbowBend > 0.7 && !isForearmInward) {
    // Reading book type pose: forearm pointing forward with bent elbow
    foreArmX = 1.2 + elbowBend * 0.3; // Scales to ~1.58 for moderate bend
  } else if (elbowBend > 0.7) {
    // Curling in pose
    foreArmX = elbowBend * 0.6;
  }

  return {
    arm: {
      x: clampedArmX,
      y: 0,
      z: armZ,
    },
    foreArm: {
      x: foreArmX,
      y: palmY,
      z: isRight ? -elbowBend : elbowBend,
    },
    hand: { x: 0, y: 0, z: 0 },
  };
}

/**
 * Default arm pose (neutral, slightly forward)
 */
const DEFAULT_ARM = {
  arm: { x: 0, y: 0, z: 0 },
  foreArm: { x: 0, y: 0, z: 0 },
  hand: { x: 0, y: 0, z: 0 },
};

/**
 * Convert a SignMotion frame to avatar pose
 */
export function frameToAvatarPose(
  rightHand: HandFrame | undefined,
  leftHand: HandFrame | undefined,
  face: FaceFrame | undefined,
  body: BodyFrame | undefined,
): AvatarPose {
  // Get body joint positions
  const rightShoulder = body?.joints?.rightShoulder?.position;
  const rightElbow = body?.joints?.rightElbow?.position;
  const rightWrist = body?.joints?.rightWrist?.position;
  const leftShoulder = body?.joints?.leftShoulder?.position;
  const leftElbow = body?.joints?.leftElbow?.position;
  const leftWrist = body?.joints?.leftWrist?.position;

  // Calculate arm poses from body landmarks
  // Use hand wrist as fallback if body wrist not available
  const rightHandWrist = rightHand?.landmarks?.[HAND_LANDMARKS.WRIST]?.position;
  const leftHandWrist = leftHand?.landmarks?.[HAND_LANDMARKS.WRIST]?.position;

  const rightArmPose =
    calculateArmPose(
      rightShoulder,
      rightElbow,
      rightWrist || rightHandWrist,
      true,
    ) || DEFAULT_ARM;

  const leftArmPose =
    calculateArmPose(
      leftShoulder,
      leftElbow,
      leftWrist || leftHandWrist,
      false,
    ) || DEFAULT_ARM;

  return {
    rightArm: rightArmPose.arm,
    rightForeArm: rightArmPose.foreArm,
    rightHand: rightArmPose.hand,
    leftArm: leftArmPose.arm,
    leftForeArm: leftArmPose.foreArm,
    leftHand: leftArmPose.hand,
    rightFingers: extractFingerPose(rightHand),
    leftFingers: extractFingerPose(leftHand),
    faceBlendshapes: face?.blendshapes || {},
    headRotation: { x: 0, y: 0, z: 0 },
  };
}

/**
 * Get avatar pose for a specific frame of SignMotion
 */
export function getFramePose(
  motion: SignMotion,
  frameIndex: number,
): AvatarPose {
  const idx = Math.max(0, Math.min(frameIndex, motion.frameCount - 1));

  return frameToAvatarPose(
    motion.rightHand[idx],
    motion.leftHand[idx],
    motion.face[idx],
    motion.body[idx],
  );
}

/**
 * Interpolate between two avatar poses
 */
export function lerpAvatarPose(
  a: AvatarPose,
  b: AvatarPose,
  t: number,
): AvatarPose {
  const lerpVec3 = (v1: Vec3, v2: Vec3): Vec3 => ({
    x: v1.x + (v2.x - v1.x) * t,
    y: v1.y + (v2.y - v1.y) * t,
    z: v1.z + (v2.z - v1.z) * t,
  });

  const lerpFingerJoint = (
    j1: [number, number, number],
    j2: [number, number, number],
  ): [number, number, number] => [
    j1[0] + (j2[0] - j1[0]) * t,
    j1[1] + (j2[1] - j1[1]) * t,
    j1[2] + (j2[2] - j1[2]) * t,
  ];

  const lerpFingers = (f1: FingerPose, f2: FingerPose): FingerPose => ({
    thumb: lerpFingerJoint(f1.thumb, f2.thumb),
    index: lerpFingerJoint(f1.index, f2.index),
    middle: lerpFingerJoint(f1.middle, f2.middle),
    ring: lerpFingerJoint(f1.ring, f2.ring),
    pinky: lerpFingerJoint(f1.pinky, f2.pinky),
  });

  // Merge blendshapes
  const blendshapes: Partial<Record<ARKitBlendshape, number>> = {};
  const allKeys = new Set([
    ...Object.keys(a.faceBlendshapes),
    ...Object.keys(b.faceBlendshapes),
  ]) as Set<ARKitBlendshape>;

  for (const key of allKeys) {
    const v1 = a.faceBlendshapes[key] || 0;
    const v2 = b.faceBlendshapes[key] || 0;
    blendshapes[key] = v1 + (v2 - v1) * t;
  }

  return {
    rightArm: lerpVec3(a.rightArm, b.rightArm),
    rightForeArm: lerpVec3(a.rightForeArm, b.rightForeArm),
    rightHand: lerpVec3(a.rightHand, b.rightHand),
    leftArm: lerpVec3(a.leftArm, b.leftArm),
    leftForeArm: lerpVec3(a.leftForeArm, b.leftForeArm),
    leftHand: lerpVec3(a.leftHand, b.leftHand),
    rightFingers: lerpFingers(a.rightFingers, b.rightFingers),
    leftFingers: lerpFingers(a.leftFingers, b.leftFingers),
    faceBlendshapes: blendshapes,
    headRotation: lerpVec3(a.headRotation, b.headRotation),
  };
}

/**
 * Get smoothly interpolated pose for a given time
 */
export function getPoseAtTime(motion: SignMotion, timeMs: number): AvatarPose {
  const frameTime = 1000 / motion.fps;
  const exactFrame = timeMs / frameTime;
  const frame1 = Math.floor(exactFrame);
  const frame2 = Math.min(frame1 + 1, motion.frameCount - 1);
  const t = exactFrame - frame1;

  if (frame1 === frame2 || t === 0) {
    return getFramePose(motion, frame1);
  }

  const pose1 = getFramePose(motion, frame1);
  const pose2 = getFramePose(motion, frame2);

  return lerpAvatarPose(pose1, pose2, t);
}
