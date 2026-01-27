/**
 * SignMate Motion Format
 *
 * Avatar-agnostic motion data format for ASL signs.
 * Designed for capture once, retarget to any avatar.
 */

// ============================================================================
// Core Vector Types
// ============================================================================

/** 3D position or rotation */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Quaternion rotation */
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

// ============================================================================
// Hand Data (21 landmarks per hand)
// ============================================================================

/**
 * MediaPipe hand landmark indices:
 * 0: WRIST
 * 1-4: THUMB (CMC, MCP, IP, TIP)
 * 5-8: INDEX (MCP, PIP, DIP, TIP)
 * 9-12: MIDDLE (MCP, PIP, DIP, TIP)
 * 13-16: RING (MCP, PIP, DIP, TIP)
 * 17-20: PINKY (MCP, PIP, DIP, TIP)
 */
export const HAND_LANDMARK_COUNT = 21;

export interface HandLandmark {
  position: Vec3;
  /** Visibility/confidence 0-1 */
  visibility?: number;
}

export interface HandFrame {
  /** 21 landmarks in MediaPipe order */
  landmarks: HandLandmark[];
  /** Overall hand confidence 0-1 */
  confidence: number;
}

// ============================================================================
// Face Data (ARKit blendshapes)
// ============================================================================

/**
 * ARKit-compatible blendshapes (52 total)
 * These map directly to RPM avatar morph targets
 */
export const ARKIT_BLENDSHAPES = [
  // Brows
  "browDownLeft",
  "browDownRight",
  "browInnerUp",
  "browOuterUpLeft",
  "browOuterUpRight",
  // Eyes
  "eyeBlinkLeft",
  "eyeBlinkRight",
  "eyeLookDownLeft",
  "eyeLookDownRight",
  "eyeLookInLeft",
  "eyeLookInRight",
  "eyeLookOutLeft",
  "eyeLookOutRight",
  "eyeLookUpLeft",
  "eyeLookUpRight",
  "eyeSquintLeft",
  "eyeSquintRight",
  "eyeWideLeft",
  "eyeWideRight",
  // Jaw
  "jawForward",
  "jawLeft",
  "jawOpen",
  "jawRight",
  // Mouth
  "mouthClose",
  "mouthDimpleLeft",
  "mouthDimpleRight",
  "mouthFrownLeft",
  "mouthFrownRight",
  "mouthFunnel",
  "mouthLeft",
  "mouthLowerDownLeft",
  "mouthLowerDownRight",
  "mouthPressLeft",
  "mouthPressRight",
  "mouthPucker",
  "mouthRight",
  "mouthRollLower",
  "mouthRollUpper",
  "mouthShrugLower",
  "mouthShrugUpper",
  "mouthSmileLeft",
  "mouthSmileRight",
  "mouthStretchLeft",
  "mouthStretchRight",
  "mouthUpperUpLeft",
  "mouthUpperUpRight",
  // Nose
  "noseSneerLeft",
  "noseSneerRight",
  // Cheeks
  "cheekPuff",
  "cheekSquintLeft",
  "cheekSquintRight",
  // Tongue
  "tongueOut",
] as const;

export type ARKitBlendshape = (typeof ARKIT_BLENDSHAPES)[number];

export interface FaceFrame {
  /** Blendshape values keyed by ARKit name, 0-1 */
  blendshapes: Partial<Record<ARKitBlendshape, number>>;
  /** Head rotation */
  headRotation?: Quat;
  /** Head position offset */
  headPosition?: Vec3;
}

// ============================================================================
// Upper Body Data
// ============================================================================

/**
 * Upper body joints relevant for ASL
 * Subset of MediaPipe pose landmarks
 */
export const UPPER_BODY_JOINTS = [
  "nose",
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
  "leftHip",
  "rightHip",
] as const;

export type UpperBodyJoint = (typeof UPPER_BODY_JOINTS)[number];

export interface JointData {
  position: Vec3;
  rotation?: Quat;
  visibility?: number;
}

export interface BodyFrame {
  joints: Partial<Record<UpperBodyJoint, JointData>>;
}

// ============================================================================
// Entry/Exit Poses (for blending)
// ============================================================================

/**
 * Pose snapshot for sign transitions
 * Used to blend between signs without rest poses
 */
export interface Pose {
  leftHand?: HandFrame;
  rightHand?: HandFrame;
  body?: BodyFrame;
  face?: FaceFrame;
}

// ============================================================================
// SignMotion - The Main Format
// ============================================================================

export interface SignMotionMetadata {
  /** Unique identifier */
  id: string;
  /** When captured */
  capturedAt: string;
  /** Tool used: "mediapipe", "freemocap", "manual" */
  captureSource: string;
  /** Additional notes */
  notes?: string;
  /** Tags for search/filtering */
  tags?: string[];
}

/**
 * Complete motion data for a single ASL sign
 */
export interface SignMotion {
  /** Sign gloss in caps: "HELLO", "THANK-YOU" */
  gloss: string;

  /** Upper body frames */
  body: BodyFrame[];

  /** Left hand frames (may be empty for one-handed signs) */
  leftHand: HandFrame[];

  /** Right hand frames (dominant hand for most signers) */
  rightHand: HandFrame[];

  /** Face blendshape frames */
  face: FaceFrame[];

  /** Where hands start (for blending from previous sign) */
  entryPose: Pose;

  /** Where hands end (for blending to next sign) */
  exitPose: Pose;

  /** Frames per second (typically 30) */
  fps: number;

  /** Total frame count */
  frameCount: number;

  /** Total duration in milliseconds */
  durationMs: number;

  /** Optional metadata */
  metadata?: SignMotionMetadata;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create empty pose (neutral position)
 */
export function createEmptyPose(): Pose {
  return {
    leftHand: undefined,
    rightHand: undefined,
    body: undefined,
    face: undefined,
  };
}

/**
 * Extract first frame as entry pose
 */
export function extractEntryPose(motion: SignMotion): Pose {
  return {
    leftHand: motion.leftHand[0],
    rightHand: motion.rightHand[0],
    body: motion.body[0],
    face: motion.face[0],
  };
}

/**
 * Extract last frame as exit pose
 */
export function extractExitPose(motion: SignMotion): Pose {
  const lastIdx = motion.frameCount - 1;
  return {
    leftHand: motion.leftHand[lastIdx],
    rightHand: motion.rightHand[lastIdx],
    body: motion.body[lastIdx],
    face: motion.face[lastIdx],
  };
}

/**
 * Linear interpolation between two numbers
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Linear interpolation between two Vec3
 */
export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

/**
 * Spherical linear interpolation between two quaternions
 */
export function slerpQuat(a: Quat, b: Quat, t: number): Quat {
  // Simplified slerp - for production use a proper math library
  let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;

  // If dot is negative, negate one quaternion to take shorter path
  if (dot < 0) {
    b = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
    dot = -dot;
  }

  // If very close, use linear interpolation
  if (dot > 0.9995) {
    return {
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      z: lerp(a.z, b.z, t),
      w: lerp(a.w, b.w, t),
    };
  }

  const theta0 = Math.acos(dot);
  const theta = theta0 * t;
  const sinTheta = Math.sin(theta);
  const sinTheta0 = Math.sin(theta0);

  const s0 = Math.cos(theta) - (dot * sinTheta) / sinTheta0;
  const s1 = sinTheta / sinTheta0;

  return {
    x: a.x * s0 + b.x * s1,
    y: a.y * s0 + b.y * s1,
    z: a.z * s0 + b.z * s1,
    w: a.w * s0 + b.w * s1,
  };
}

/**
 * Interpolate between two hand frames
 */
export function lerpHandFrame(
  a: HandFrame | undefined,
  b: HandFrame | undefined,
  t: number,
): HandFrame | undefined {
  if (!a || !b) return a || b;

  return {
    landmarks: a.landmarks.map((la, i) => ({
      position: lerpVec3(la.position, b.landmarks[i].position, t),
      visibility: lerp(la.visibility ?? 1, b.landmarks[i].visibility ?? 1, t),
    })),
    confidence: lerp(a.confidence, b.confidence, t),
  };
}

/**
 * Interpolate between two poses (for sign blending)
 */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    leftHand: lerpHandFrame(a.leftHand, b.leftHand, t),
    rightHand: lerpHandFrame(a.rightHand, b.rightHand, t),
    // Body and face interpolation can be added as needed
    body: t < 0.5 ? a.body : b.body,
    face: t < 0.5 ? a.face : b.face,
  };
}

/**
 * Calculate blend duration based on sign properties
 * Faster signs = shorter blends
 */
export function calculateBlendDuration(
  fromSign: SignMotion,
  toSign: SignMotion,
): number {
  const avgDuration = (fromSign.durationMs + toSign.durationMs) / 2;
  // Blend is ~20% of average sign duration, clamped to 100-300ms
  return Math.max(100, Math.min(300, avgDuration * 0.2));
}
