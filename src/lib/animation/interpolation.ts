/**
 * Animation interpolation utilities for smooth avatar movements
 */

// Easing functions for natural motion
export const easings = {
  // Standard easing functions
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic easing for more natural motion
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

  // Elastic for bouncy, organic motion
  easeOutElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  // Back easing for anticipation/follow-through
  easeInBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  // Smooth step for very natural transitions
  smoothStep: (t: number) => t * t * (3 - 2 * t),
  smootherStep: (t: number) => t * t * t * (t * (t * 6 - 15) + 10),
};

export type EasingFunction = keyof typeof easings | ((t: number) => number);

// Get easing function by name or direct function
function getEasing(easing: EasingFunction): (t: number) => number {
  if (typeof easing === 'function') return easing;
  return easings[easing] || easings.easeInOutCubic;
}

// Linear interpolation between two numbers
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Clamp value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// 3D vector type
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Interpolate between two 3D positions
export function lerpVector3(start: Vector3, end: Vector3, t: number): Vector3 {
  return {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
    z: lerp(start.z, end.z, t),
  };
}

// Spherical linear interpolation for rotations (quaternion-like)
export function slerp(start: Vector3, end: Vector3, t: number): Vector3 {
  // Simplified slerp for Euler angles
  const result = lerpVector3(start, end, t);
  return result;
}

// Catmull-Rom spline interpolation for smooth curves through keyframes
export function catmullRom(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

// Catmull-Rom for 3D positions
export function catmullRomVector3(
  p0: Vector3,
  p1: Vector3,
  p2: Vector3,
  p3: Vector3,
  t: number
): Vector3 {
  return {
    x: catmullRom(p0.x, p1.x, p2.x, p3.x, t),
    y: catmullRom(p0.y, p1.y, p2.y, p3.y, t),
    z: catmullRom(p0.z, p1.z, p2.z, p3.z, t),
  };
}

// Keyframe interface for animation
export interface Keyframe<T> {
  time: number; // 0-1 normalized
  value: T;
  easing?: EasingFunction;
}

// Interpolate through keyframes
export function interpolateKeyframes<T>(
  keyframes: Keyframe<T>[],
  t: number,
  interpolator: (a: T, b: T, t: number) => T
): T {
  if (keyframes.length === 0) {
    throw new Error('No keyframes provided');
  }
  if (keyframes.length === 1) {
    return keyframes[0].value;
  }

  // Clamp t to valid range
  t = clamp(t, 0, 1);

  // Find the two keyframes to interpolate between
  let startFrame = keyframes[0];
  let endFrame = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (t >= keyframes[i].time && t <= keyframes[i + 1].time) {
      startFrame = keyframes[i];
      endFrame = keyframes[i + 1];
      break;
    }
  }

  // Calculate local t within this segment
  const segmentDuration = endFrame.time - startFrame.time;
  const localT = segmentDuration > 0 ? (t - startFrame.time) / segmentDuration : 0;

  // Apply easing
  const easing = getEasing(endFrame.easing || 'easeInOutCubic');
  const easedT = easing(localT);

  return interpolator(startFrame.value, endFrame.value, easedT);
}

// Spring physics for responsive, organic motion
export interface SpringConfig {
  stiffness: number; // How fast the spring pulls (higher = snappier)
  damping: number; // How quickly it settles (higher = less bouncy)
  mass: number; // Weight of the object
}

export interface SpringState {
  position: number;
  velocity: number;
}

const DEFAULT_SPRING_CONFIG: SpringConfig = {
  stiffness: 170,
  damping: 26,
  mass: 1,
};

export function springStep(
  current: SpringState,
  target: number,
  config: Partial<SpringConfig> = {},
  deltaTime: number // in seconds
): SpringState {
  const { stiffness, damping, mass } = { ...DEFAULT_SPRING_CONFIG, ...config };

  const displacement = current.position - target;
  const springForce = -stiffness * displacement;
  const dampingForce = -damping * current.velocity;
  const acceleration = (springForce + dampingForce) / mass;

  const newVelocity = current.velocity + acceleration * deltaTime;
  const newPosition = current.position + newVelocity * deltaTime;

  return {
    position: newPosition,
    velocity: newVelocity,
  };
}

// Spring state for 3D
export interface Spring3DState {
  position: Vector3;
  velocity: Vector3;
}

export function spring3DStep(
  current: Spring3DState,
  target: Vector3,
  config: Partial<SpringConfig> = {},
  deltaTime: number
): Spring3DState {
  const xState = springStep(
    { position: current.position.x, velocity: current.velocity.x },
    target.x,
    config,
    deltaTime
  );
  const yState = springStep(
    { position: current.position.y, velocity: current.velocity.y },
    target.y,
    config,
    deltaTime
  );
  const zState = springStep(
    { position: current.position.z, velocity: current.velocity.z },
    target.z,
    config,
    deltaTime
  );

  return {
    position: { x: xState.position, y: yState.position, z: zState.position },
    velocity: { x: xState.velocity, y: yState.velocity, z: zState.velocity },
  };
}

// Presets for different movement qualities
export const springPresets = {
  snappy: { stiffness: 400, damping: 30, mass: 0.8 },
  smooth: { stiffness: 120, damping: 20, mass: 1 },
  bouncy: { stiffness: 180, damping: 12, mass: 1 },
  gentle: { stiffness: 80, damping: 15, mass: 1.2 },
  stiff: { stiffness: 300, damping: 40, mass: 1 },
};
