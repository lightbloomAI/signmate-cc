/**
 * Pose blending system for smooth transitions between ASL signs
 */

import type { ASLSign, ExpressionState } from '@/types';
import {
  lerp,
  lerpVector3,
  springPresets,
  spring3DStep,
  type Vector3,
  type Spring3DState,
  type SpringConfig,
} from './interpolation';

// Pose representation for a single frame
export interface Pose {
  rightHand: {
    position: Vector3;
    rotation: Vector3;
    fingerCurls: number[]; // Index 0-3 for fingers
    thumbCurl: number;
  };
  leftHand: {
    position: Vector3;
    rotation: Vector3;
    fingerCurls: number[];
    thumbCurl: number;
  };
  expression: ExpressionState;
}

// Default rest pose
export const REST_POSE: Pose = {
  rightHand: {
    position: { x: 0.35, y: -0.1, z: 0.2 },
    rotation: { x: 0, y: 0, z: 0 },
    fingerCurls: [0.1, 0.1, 0.1, 0.1],
    thumbCurl: 0.2,
  },
  leftHand: {
    position: { x: -0.35, y: -0.1, z: 0.15 },
    rotation: { x: 0, y: 0, z: 0 },
    fingerCurls: [0.1, 0.1, 0.1, 0.1],
    thumbCurl: 0.2,
  },
  expression: {
    eyebrows: 0,
    eyeOpenness: 1,
    mouthShape: 'neutral',
    headTilt: { x: 0, y: 0, z: 0 },
  },
};

// Hand shape to finger curl mapping
const HAND_SHAPE_CURLS: Record<string, { fingers: number[]; thumb: number }> = {
  'flat-hand': { fingers: [0, 0, 0, 0], thumb: 0 },
  'open-hand': { fingers: [0.1, 0.1, 0.1, 0.1], thumb: 0.2 },
  fist: { fingers: [1, 1, 1, 1], thumb: 0.8 },
  's-hand': { fingers: [1, 1, 1, 1], thumb: 0.5 },
  'a-hand': { fingers: [1, 1, 1, 1], thumb: 0.3 },
  point: { fingers: [0, 1, 1, 1], thumb: 0.5 },
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

// Convert ASL sign to target pose
export function signToPose(sign: ASLSign, progress: number = 0): Pose {
  const loc = sign.location;
  const mov = sign.movement;
  const rightShape = HAND_SHAPE_CURLS[sign.handshape.dominant] || HAND_SHAPE_CURLS['flat-hand'];
  const leftShape = sign.handshape.nonDominant
    ? HAND_SHAPE_CURLS[sign.handshape.nonDominant] || HAND_SHAPE_CURLS['flat-hand']
    : HAND_SHAPE_CURLS['open-hand'];

  // Calculate base position from sign location
  let rightX = loc.x * 0.5 + 0.15;
  let rightY = loc.y * 0.8 - 0.2;
  let rightZ = loc.z * 0.5 + 0.2;

  // Apply movement direction based on progress
  if (mov.direction) {
    rightX += mov.direction.x * progress * 0.3;
    rightY += mov.direction.y * progress * 0.3;
    rightZ += mov.direction.z * progress * 0.3;
  }

  // Handle repetitive movements
  if (mov.repetitions && mov.repetitions > 1) {
    const cycleProgress = (progress * mov.repetitions) % 1;
    const bounce = Math.sin(cycleProgress * Math.PI * 2) * 0.05;
    rightY += bounce;
  }

  // Expression from non-manual markers
  const expression = { ...REST_POSE.expression };
  for (const marker of sign.nonManualMarkers) {
    if (marker.type === 'facial') {
      switch (marker.expression) {
        case 'raised-eyebrows':
          expression.eyebrows = marker.intensity;
          break;
        case 'furrowed-brows':
          expression.eyebrows = -marker.intensity;
          break;
        case 'wide-eyes':
          expression.eyeOpenness = 1 + marker.intensity * 0.3;
          break;
        case 'squint':
          expression.eyeOpenness = 1 - marker.intensity * 0.5;
          break;
      }
    } else if (marker.type === 'head') {
      switch (marker.expression) {
        case 'nod':
          expression.headTilt.x = Math.sin(progress * Math.PI * 2) * marker.intensity * 0.3;
          break;
        case 'shake':
          expression.headTilt.y = Math.sin(progress * Math.PI * 2) * marker.intensity * 0.3;
          break;
        case 'tilt':
          expression.headTilt.z = marker.intensity * 0.2;
          break;
      }
    }
  }

  // Calculate left hand position
  const hasLeftHand = !!sign.handshape.nonDominant;
  const leftX = hasLeftHand ? -rightX : -0.35;
  const leftY = hasLeftHand ? rightY : -0.1;
  const leftZ = hasLeftHand ? rightZ : 0.15;

  return {
    rightHand: {
      position: { x: rightX, y: rightY, z: rightZ },
      rotation: { x: progress * 0.2, y: 0, z: 0 },
      fingerCurls: rightShape.fingers,
      thumbCurl: rightShape.thumb,
    },
    leftHand: {
      position: { x: leftX, y: leftY, z: leftZ },
      rotation: { x: hasLeftHand ? -progress * 0.2 : 0, y: 0, z: 0 },
      fingerCurls: leftShape.fingers,
      thumbCurl: leftShape.thumb,
    },
    expression,
  };
}

// Blend between two poses
export function blendPoses(from: Pose, to: Pose, t: number): Pose {
  return {
    rightHand: {
      position: lerpVector3(from.rightHand.position, to.rightHand.position, t),
      rotation: lerpVector3(from.rightHand.rotation, to.rightHand.rotation, t),
      fingerCurls: from.rightHand.fingerCurls.map((f, i) => lerp(f, to.rightHand.fingerCurls[i], t)),
      thumbCurl: lerp(from.rightHand.thumbCurl, to.rightHand.thumbCurl, t),
    },
    leftHand: {
      position: lerpVector3(from.leftHand.position, to.leftHand.position, t),
      rotation: lerpVector3(from.leftHand.rotation, to.leftHand.rotation, t),
      fingerCurls: from.leftHand.fingerCurls.map((f, i) => lerp(f, to.leftHand.fingerCurls[i], t)),
      thumbCurl: lerp(from.leftHand.thumbCurl, to.leftHand.thumbCurl, t),
    },
    expression: {
      eyebrows: lerp(from.expression.eyebrows, to.expression.eyebrows, t),
      eyeOpenness: lerp(from.expression.eyeOpenness, to.expression.eyeOpenness, t),
      mouthShape: t < 0.5 ? from.expression.mouthShape : to.expression.mouthShape,
      headTilt: lerpVector3(from.expression.headTilt, to.expression.headTilt, t),
    },
  };
}

// Pose blender class with spring physics for smooth transitions
export class PoseBlender {
  private currentPose: Pose = REST_POSE;
  private targetPose: Pose = REST_POSE;
  private rightHandSpring: Spring3DState;
  private leftHandSpring: Spring3DState;
  private springConfig: SpringConfig;

  constructor(springPreset: keyof typeof springPresets = 'smooth') {
    this.springConfig = springPresets[springPreset];
    this.rightHandSpring = {
      position: { ...REST_POSE.rightHand.position },
      velocity: { x: 0, y: 0, z: 0 },
    };
    this.leftHandSpring = {
      position: { ...REST_POSE.leftHand.position },
      velocity: { x: 0, y: 0, z: 0 },
    };
  }

  setTarget(pose: Pose): void {
    this.targetPose = pose;
  }

  setTargetFromSign(sign: ASLSign, progress: number): void {
    this.targetPose = signToPose(sign, progress);
  }

  returnToRest(): void {
    this.targetPose = REST_POSE;
  }

  update(deltaTime: number): Pose {
    // Update springs for hand positions
    this.rightHandSpring = spring3DStep(
      this.rightHandSpring,
      this.targetPose.rightHand.position,
      this.springConfig,
      deltaTime
    );

    this.leftHandSpring = spring3DStep(
      this.leftHandSpring,
      this.targetPose.leftHand.position,
      this.springConfig,
      deltaTime
    );

    // Lerp the rest of the values for smooth transitions
    const lerpFactor = 1 - Math.exp(-8 * deltaTime); // Exponential smoothing

    this.currentPose = {
      rightHand: {
        position: this.rightHandSpring.position,
        rotation: lerpVector3(this.currentPose.rightHand.rotation, this.targetPose.rightHand.rotation, lerpFactor),
        fingerCurls: this.currentPose.rightHand.fingerCurls.map((f, i) =>
          lerp(f, this.targetPose.rightHand.fingerCurls[i], lerpFactor)
        ),
        thumbCurl: lerp(this.currentPose.rightHand.thumbCurl, this.targetPose.rightHand.thumbCurl, lerpFactor),
      },
      leftHand: {
        position: this.leftHandSpring.position,
        rotation: lerpVector3(this.currentPose.leftHand.rotation, this.targetPose.leftHand.rotation, lerpFactor),
        fingerCurls: this.currentPose.leftHand.fingerCurls.map((f, i) =>
          lerp(f, this.targetPose.leftHand.fingerCurls[i], lerpFactor)
        ),
        thumbCurl: lerp(this.currentPose.leftHand.thumbCurl, this.targetPose.leftHand.thumbCurl, lerpFactor),
      },
      expression: {
        eyebrows: lerp(this.currentPose.expression.eyebrows, this.targetPose.expression.eyebrows, lerpFactor),
        eyeOpenness: lerp(this.currentPose.expression.eyeOpenness, this.targetPose.expression.eyeOpenness, lerpFactor),
        mouthShape: this.targetPose.expression.mouthShape,
        headTilt: lerpVector3(this.currentPose.expression.headTilt, this.targetPose.expression.headTilt, lerpFactor),
      },
    };

    return this.currentPose;
  }

  getCurrentPose(): Pose {
    return this.currentPose;
  }

  setSpringPreset(preset: keyof typeof springPresets): void {
    this.springConfig = springPresets[preset];
  }
}
