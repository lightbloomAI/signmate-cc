export {
  lerp,
  clamp,
  lerpVector3,
  slerp,
  catmullRom,
  catmullRomVector3,
  interpolateKeyframes,
  springStep,
  spring3DStep,
  springPresets,
  easings,
  type Vector3,
  type SpringConfig,
  type SpringState,
  type Spring3DState,
  type Keyframe,
  type EasingFunction,
} from './interpolation';

export {
  PoseBlender,
  blendPoses,
  signToPose,
  REST_POSE,
  type Pose,
} from './poseBlender';
