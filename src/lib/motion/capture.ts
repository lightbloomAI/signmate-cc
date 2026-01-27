/**
 * MediaPipe → SignMotion Capture Utility
 *
 * Converts real-time MediaPipe detection results into SignMotion format
 */

import type {
  HandLandmarkerResult,
  FaceLandmarkerResult,
  PoseLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

import {
  SignMotion,
  SignMotionMetadata,
  HandFrame,
  HandLandmark,
  FaceFrame,
  BodyFrame,
  Pose,
  Vec3,
  ARKitBlendshape,
  ARKIT_BLENDSHAPES,
  UPPER_BODY_JOINTS,
  UpperBodyJoint,
  extractEntryPose,
  extractExitPose,
} from "./types";

// ============================================================================
// MediaPipe Result Converters
// ============================================================================

/**
 * Convert MediaPipe NormalizedLandmark to Vec3
 */
function landmarkToVec3(landmark: NormalizedLandmark): Vec3 {
  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z ?? 0,
  };
}

/**
 * Convert MediaPipe hand result to HandFrame
 */
export function convertHandResult(
  landmarks: NormalizedLandmark[] | undefined,
  confidence: number,
): HandFrame | undefined {
  if (!landmarks || landmarks.length === 0) return undefined;

  const handLandmarks: HandLandmark[] = landmarks.map((lm) => ({
    position: landmarkToVec3(lm),
    visibility: lm.visibility ?? 1,
  }));

  return {
    landmarks: handLandmarks,
    confidence,
  };
}

/**
 * Convert MediaPipe face blendshapes to FaceFrame
 */
export function convertFaceResult(
  result: FaceLandmarkerResult,
): FaceFrame | undefined {
  if (!result.faceBlendshapes || result.faceBlendshapes.length === 0) {
    return undefined;
  }

  const categories = result.faceBlendshapes[0].categories;
  const blendshapes: Partial<Record<ARKitBlendshape, number>> = {};

  for (const cat of categories) {
    const name = cat.categoryName as ARKitBlendshape;
    if (ARKIT_BLENDSHAPES.includes(name)) {
      blendshapes[name] = cat.score;
    }
  }

  // Extract head rotation from face landmarks if available
  // (simplified - just use first face landmark position as reference)
  let headPosition: Vec3 | undefined;
  if (result.faceLandmarks && result.faceLandmarks.length > 0) {
    const noseTip = result.faceLandmarks[0][1]; // Landmark 1 is nose tip area
    if (noseTip) {
      headPosition = landmarkToVec3(noseTip);
    }
  }

  return {
    blendshapes,
    headPosition,
  };
}

/**
 * MediaPipe pose landmark indices for upper body
 */
const POSE_INDEX_MAP: Record<UpperBodyJoint, number> = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
};

/**
 * Convert MediaPipe pose result to BodyFrame
 */
export function convertPoseResult(
  result: PoseLandmarkerResult,
): BodyFrame | undefined {
  if (!result.landmarks || result.landmarks.length === 0) {
    return undefined;
  }

  const landmarks = result.landmarks[0];
  const joints: BodyFrame["joints"] = {};

  for (const joint of UPPER_BODY_JOINTS) {
    const idx = POSE_INDEX_MAP[joint];
    const lm = landmarks[idx];
    if (lm) {
      joints[joint] = {
        position: landmarkToVec3(lm),
        visibility: lm.visibility,
      };
    }
  }

  return { joints };
}

// ============================================================================
// Frame Capture
// ============================================================================

export interface CapturedFrame {
  timestamp: number;
  leftHand?: HandFrame;
  rightHand?: HandFrame;
  face?: FaceFrame;
  body?: BodyFrame;
}

/**
 * Capture a single frame from MediaPipe results
 */
export function captureFrame(
  handResult: HandLandmarkerResult,
  faceResult: FaceLandmarkerResult,
  poseResult: PoseLandmarkerResult,
  timestamp: number,
): CapturedFrame {
  let leftHand: HandFrame | undefined;
  let rightHand: HandFrame | undefined;

  // Process hands - MediaPipe labels from camera's perspective (mirrored)
  if (handResult.landmarks && handResult.handednesses) {
    handResult.landmarks.forEach((landmarks, idx) => {
      const handedness = handResult.handednesses[idx]?.[0];
      const confidence = handedness?.score ?? 0;
      const isLeft = handedness?.categoryName === "Left";

      const frame = convertHandResult(landmarks, confidence);
      if (isLeft) {
        leftHand = frame;
      } else {
        rightHand = frame;
      }
    });
  }

  return {
    timestamp,
    leftHand,
    rightHand,
    face: convertFaceResult(faceResult),
    body: convertPoseResult(poseResult),
  };
}

// ============================================================================
// Recording Session
// ============================================================================

export interface RecordingSession {
  gloss: string;
  frames: CapturedFrame[];
  startTime: number;
  fps: number;
}

/**
 * Create a new recording session
 */
export function createSession(
  gloss: string,
  fps: number = 30,
): RecordingSession {
  return {
    gloss,
    frames: [],
    startTime: 0,
    fps,
  };
}

/**
 * Add a frame to the recording session
 */
export function addFrame(
  session: RecordingSession,
  frame: CapturedFrame,
): void {
  if (session.frames.length === 0) {
    session.startTime = frame.timestamp;
  }
  session.frames.push(frame);
}

/**
 * Finalize recording session into SignMotion
 */
export function finalizeSession(
  session: RecordingSession,
  metadata?: Partial<SignMotionMetadata>,
): SignMotion {
  const { gloss, frames, startTime, fps } = session;

  if (frames.length === 0) {
    throw new Error("Cannot finalize empty recording session");
  }

  // Extract arrays for each component
  const leftHand: HandFrame[] = [];
  const rightHand: HandFrame[] = [];
  const face: FaceFrame[] = [];
  const body: BodyFrame[] = [];

  // Create empty defaults for missing frames
  const emptyHand: HandFrame = {
    landmarks: Array(21).fill({
      position: { x: 0, y: 0, z: 0 },
      visibility: 0,
    }),
    confidence: 0,
  };
  const emptyFace: FaceFrame = { blendshapes: {} };
  const emptyBody: BodyFrame = { joints: {} };

  for (const frame of frames) {
    leftHand.push(frame.leftHand ?? emptyHand);
    rightHand.push(frame.rightHand ?? emptyHand);
    face.push(frame.face ?? emptyFace);
    body.push(frame.body ?? emptyBody);
  }

  const durationMs = frames[frames.length - 1].timestamp - startTime;

  const motion: SignMotion = {
    gloss: gloss.toUpperCase(),
    body,
    leftHand,
    rightHand,
    face,
    entryPose: {} as Pose, // Will be set below
    exitPose: {} as Pose,
    fps,
    frameCount: frames.length,
    durationMs,
    metadata: {
      id: `${gloss.toLowerCase()}-${Date.now()}`,
      capturedAt: new Date().toISOString(),
      captureSource: "mediapipe",
      ...metadata,
    },
  };

  // Extract entry/exit poses
  motion.entryPose = extractEntryPose(motion);
  motion.exitPose = extractExitPose(motion);

  return motion;
}

// ============================================================================
// Storage Utilities
// ============================================================================

/**
 * Save SignMotion to localStorage (for development)
 */
export function saveMotionLocal(motion: SignMotion): void {
  const key = `signmate-motion-${motion.gloss}`;
  localStorage.setItem(key, JSON.stringify(motion));
}

/**
 * Load SignMotion from localStorage
 */
export function loadMotionLocal(gloss: string): SignMotion | null {
  const key = `signmate-motion-${gloss.toUpperCase()}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

/**
 * List all saved motions in localStorage
 */
export function listSavedMotions(): string[] {
  const motions: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("signmate-motion-")) {
      motions.push(key.replace("signmate-motion-", ""));
    }
  }
  return motions;
}

/**
 * Delete a motion from localStorage
 */
export function deleteMotionLocal(gloss: string): boolean {
  const key = `signmate-motion-${gloss.toUpperCase()}`;
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    return true;
  }
  return false;
}

/**
 * Export motion as downloadable JSON file
 */
export function downloadMotion(motion: SignMotion): void {
  const json = JSON.stringify(motion, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${motion.gloss.toLowerCase()}.signmotion.json`;
  a.click();

  URL.revokeObjectURL(url);
}
