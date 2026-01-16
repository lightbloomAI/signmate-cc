'use client';

import { useRef, useCallback, useState } from 'react';
import { PoseBlender, REST_POSE, signToPose, type Pose } from '@/lib/animation';
import type { ASLSign } from '@/types';
import { springPresets } from '@/lib/animation/interpolation';

interface UsePoseBlenderOptions {
  springPreset?: keyof typeof springPresets;
}

interface UsePoseBlenderReturn {
  currentPose: Pose;
  update: (deltaTime: number) => Pose;
  setSign: (sign: ASLSign, progress: number) => void;
  returnToRest: () => void;
  setSpringPreset: (preset: keyof typeof springPresets) => void;
}

export function usePoseBlender(options: UsePoseBlenderOptions = {}): UsePoseBlenderReturn {
  const { springPreset = 'smooth' } = options;

  const blenderRef = useRef<PoseBlender | null>(null);
  const [currentPose, setCurrentPose] = useState<Pose>(REST_POSE);

  // Initialize blender lazily
  if (!blenderRef.current) {
    blenderRef.current = new PoseBlender(springPreset);
  }

  const update = useCallback((deltaTime: number): Pose => {
    if (!blenderRef.current) return REST_POSE;
    const pose = blenderRef.current.update(deltaTime);
    setCurrentPose(pose);
    return pose;
  }, []);

  const setSign = useCallback((sign: ASLSign, progress: number) => {
    if (!blenderRef.current) return;
    const targetPose = signToPose(sign, progress);
    blenderRef.current.setTarget(targetPose);
  }, []);

  const returnToRest = useCallback(() => {
    blenderRef.current?.returnToRest();
  }, []);

  const setSpringPreset = useCallback((preset: keyof typeof springPresets) => {
    blenderRef.current?.setSpringPreset(preset);
  }, []);

  return {
    currentPose,
    update,
    setSign,
    returnToRest,
    setSpringPreset,
  };
}
