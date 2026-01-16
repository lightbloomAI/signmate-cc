'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
}

interface AudioInputSelectorProps {
  onDeviceSelect?: (deviceId: string) => void;
  selectedDeviceId?: string;
  onClose?: () => void;
  compact?: boolean;
  showLevelMeter?: boolean;
}

export function AudioInputSelector({
  onDeviceSelect,
  selectedDeviceId,
  onClose,
  compact = false,
  showLevelMeter = true,
}: AudioInputSelectorProps) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>(
    selectedDeviceId || ''
  );
  const [permissionStatus, setPermissionStatus] = useState<
    'prompt' | 'granted' | 'denied' | 'checking'
  >('checking');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check for microphone permission
  useEffect(() => {
    async function checkPermission() {
      try {
        const result = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        });
        setPermissionStatus(result.state as 'prompt' | 'granted' | 'denied');

        result.addEventListener('change', () => {
          setPermissionStatus(result.state as 'prompt' | 'granted' | 'denied');
        });
      } catch {
        // Permissions API not supported, try to enumerate
        setPermissionStatus('prompt');
      }
    }

    checkPermission();
  }, []);

  // Enumerate audio devices
  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
          kind: d.kind as AudioDevice['kind'],
        }));

      setDevices(audioInputs);

      // Select first device if none selected
      if (!selectedDevice && audioInputs.length > 0) {
        setSelectedDevice(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
      setError('Failed to access audio devices');
    }
  }, [selectedDevice]);

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach((track) => track.stop());

      setPermissionStatus('granted');
      await enumerateDevices();
    } catch (err) {
      console.error('Failed to get microphone permission:', err);
      setPermissionStatus('denied');
      setError('Microphone access denied');
    }
  }, [enumerateDevices]);

  // Initial device enumeration
  useEffect(() => {
    if (permissionStatus === 'granted') {
      enumerateDevices();
    }
  }, [permissionStatus, enumerateDevices]);

  // Listen for device changes
  useEffect(() => {
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    };
  }, [enumerateDevices]);

  // Audio level monitoring
  const startAudioMonitoring = useCallback(async () => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // Create audio context and analyser
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      setIsTestingAudio(true);

      // Start level monitoring
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalizedLevel = Math.min(100, (average / 128) * 100);
        setAudioLevel(normalizedLevel);

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.error('Failed to start audio monitoring:', err);
      setError('Failed to access microphone');
    }
  }, [selectedDevice]);

  const stopAudioMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsTestingAudio(false);
    setAudioLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioMonitoring();
    };
  }, [stopAudioMonitoring]);

  const handleDeviceSelect = useCallback(
    (deviceId: string) => {
      setSelectedDevice(deviceId);
      onDeviceSelect?.(deviceId);

      // Restart monitoring with new device
      if (isTestingAudio) {
        stopAudioMonitoring();
        setTimeout(startAudioMonitoring, 100);
      }
    },
    [onDeviceSelect, isTestingAudio, stopAudioMonitoring, startAudioMonitoring]
  );

  const getLevelColor = (level: number): string => {
    if (level < 30) return '#10b981'; // Green - good
    if (level < 70) return '#f59e0b'; // Yellow - loud
    return '#ef4444'; // Red - too loud
  };

  if (compact) {
    return (
      <div className="audio-compact">
        <style jsx>{`
          .audio-compact {
            background: #1f2937;
            border-radius: 8px;
            padding: 12px;
          }
          .compact-select {
            width: 100%;
            padding: 8px 12px;
            background: #111827;
            border: 1px solid #374151;
            border-radius: 6px;
            color: #f9fafb;
            font-size: 13px;
            cursor: pointer;
          }
          .compact-select:focus {
            outline: none;
            border-color: #2563eb;
          }
          .compact-level {
            margin-top: 8px;
            height: 4px;
            background: #374151;
            border-radius: 2px;
            overflow: hidden;
          }
          .compact-level-bar {
            height: 100%;
            transition: width 0.05s ease;
          }
        `}</style>

        <select
          className="compact-select"
          value={selectedDevice}
          onChange={(e) => handleDeviceSelect(e.target.value)}
          disabled={permissionStatus !== 'granted'}
        >
          {permissionStatus !== 'granted' ? (
            <option>Microphone access required</option>
          ) : devices.length === 0 ? (
            <option>No devices found</option>
          ) : (
            devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))
          )}
        </select>

        {showLevelMeter && isTestingAudio && (
          <div className="compact-level">
            <div
              className="compact-level-bar"
              style={{
                width: `${audioLevel}%`,
                background: getLevelColor(audioLevel),
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="audio-selector">
      <style jsx>{`
        .audio-selector {
          background: #111827;
          border-radius: 12px;
          overflow: hidden;
          max-width: 400px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }

        .title {
          font-size: 16px;
          font-weight: 600;
          color: #f9fafb;
        }

        .content {
          padding: 20px;
        }

        .permission-prompt {
          text-align: center;
          padding: 20px;
        }

        .permission-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .permission-title {
          font-size: 16px;
          font-weight: 600;
          color: #f9fafb;
          margin-bottom: 8px;
        }

        .permission-desc {
          font-size: 13px;
          color: #9ca3af;
          margin-bottom: 16px;
        }

        .device-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }

        .device-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .device-item:hover {
          border-color: #4b5563;
        }

        .device-item.selected {
          border-color: #2563eb;
          background: rgba(37, 99, 235, 0.1);
        }

        .device-radio {
          width: 18px;
          height: 18px;
          border: 2px solid #4b5563;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .device-item.selected .device-radio {
          border-color: #2563eb;
        }

        .device-radio-inner {
          width: 10px;
          height: 10px;
          background: #2563eb;
          border-radius: 50%;
        }

        .device-info {
          flex: 1;
        }

        .device-name {
          font-size: 14px;
          color: #f9fafb;
        }

        .device-id {
          font-size: 11px;
          color: #6b7280;
          font-family: monospace;
        }

        .level-section {
          margin-bottom: 20px;
        }

        .level-label {
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
        }

        .level-bar-container {
          height: 24px;
          background: #1f2937;
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }

        .level-bar {
          height: 100%;
          transition: width 0.05s ease;
        }

        .level-markers {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
        }

        .level-marker {
          flex: 1;
          border-right: 1px solid #374151;
        }

        .level-marker:last-child {
          border-right: none;
        }

        .test-controls {
          display: flex;
          gap: 12px;
        }

        .error-message {
          padding: 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          border-radius: 6px;
          color: #fca5a5;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .no-devices {
          text-align: center;
          padding: 20px;
          color: #6b7280;
        }
      `}</style>

      <div className="header">
        <h3 className="title">Audio Input</h3>
        {onClose && (
          <Button variant="ghost" size="small" onClick={onClose}>
            ×
          </Button>
        )}
      </div>

      <div className="content">
        {error && <div className="error-message">{error}</div>}

        {permissionStatus === 'checking' && (
          <div className="permission-prompt">
            <p>Checking permissions...</p>
          </div>
        )}

        {permissionStatus === 'prompt' && (
          <div className="permission-prompt">
            <div className="permission-icon">🎙️</div>
            <div className="permission-title">Microphone Access Required</div>
            <div className="permission-desc">
              SignMate needs access to your microphone to transcribe speech.
            </div>
            <Button onClick={requestPermission}>Grant Access</Button>
          </div>
        )}

        {permissionStatus === 'denied' && (
          <div className="permission-prompt">
            <div className="permission-icon">🚫</div>
            <div className="permission-title">Microphone Access Denied</div>
            <div className="permission-desc">
              Please enable microphone access in your browser settings.
            </div>
          </div>
        )}

        {permissionStatus === 'granted' && (
          <>
            {devices.length === 0 ? (
              <div className="no-devices">
                <p>No audio input devices found</p>
              </div>
            ) : (
              <>
                <div className="device-list">
                  {devices.map((device) => (
                    <div
                      key={device.deviceId}
                      className={`device-item ${selectedDevice === device.deviceId ? 'selected' : ''}`}
                      onClick={() => handleDeviceSelect(device.deviceId)}
                    >
                      <div className="device-radio">
                        {selectedDevice === device.deviceId && (
                          <div className="device-radio-inner" />
                        )}
                      </div>
                      <div className="device-info">
                        <div className="device-name">{device.label}</div>
                        <div className="device-id">
                          {device.deviceId.slice(0, 16)}...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {showLevelMeter && (
                  <div className="level-section">
                    <div className="level-label">
                      <span>Input Level</span>
                      <span>{Math.round(audioLevel)}%</span>
                    </div>
                    <div className="level-bar-container">
                      <div
                        className="level-bar"
                        style={{
                          width: `${audioLevel}%`,
                          background: getLevelColor(audioLevel),
                        }}
                      />
                      <div className="level-markers">
                        <div className="level-marker" />
                        <div className="level-marker" />
                        <div className="level-marker" />
                        <div className="level-marker" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="test-controls">
                  {isTestingAudio ? (
                    <Button variant="secondary" onClick={stopAudioMonitoring}>
                      Stop Test
                    </Button>
                  ) : (
                    <Button onClick={startAudioMonitoring}>Test Microphone</Button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
