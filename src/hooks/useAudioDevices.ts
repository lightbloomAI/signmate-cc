'use client';

import { useState, useEffect, useCallback } from 'react';
import { AudioCapture } from '@/lib/audio';
import type { AudioSource } from '@/types';

interface UseAudioDevicesReturn {
  devices: AudioSource[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

export function useAudioDevices(): UseAudioDevicesReturn {
  const [devices, setDevices] = useState<AudioSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      return true;
    } catch (err) {
      setHasPermission(false);
      setError(new Error('Microphone permission denied'));
      return false;
    }
  }, []);

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if we have permission
      const permitted = await requestPermission();
      if (!permitted) {
        setIsLoading(false);
        return;
      }

      const availableDevices = await AudioCapture.getAvailableDevices();
      setDevices(availableDevices);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [requestPermission]);

  // Listen for device changes
  useEffect(() => {
    loadDevices();

    const handleDeviceChange = () => {
      loadDevices();
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [loadDevices]);

  return {
    devices,
    isLoading,
    error,
    refresh: loadDevices,
    hasPermission,
    requestPermission,
  };
}
