'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

// Level Meter Component
interface LevelMeterProps {
  level: number; // 0-100
  peak?: number;
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function LevelMeter({
  level,
  peak,
  orientation = 'horizontal',
  showLabels = false,
  size = 'medium',
}: LevelMeterProps) {
  const sizes = {
    small: { width: 80, height: 8 },
    medium: { width: 120, height: 12 },
    large: { width: 200, height: 16 },
  };

  const { width, height } = sizes[size];
  const isVertical = orientation === 'vertical';

  const getColor = (level: number) => {
    if (level > 90) return '#ef4444';
    if (level > 75) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="level-meter">
      <style jsx>{`
        .level-meter {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .meter-track {
          position: relative;
          background: #374151;
          border-radius: 2px;
          overflow: hidden;
        }
        .meter-fill {
          position: absolute;
          border-radius: 2px;
          transition: all 0.05s linear;
        }
        .meter-peak {
          position: absolute;
          background: #f9fafb;
          transition: all 0.1s linear;
        }
        .meter-label {
          font-size: 10px;
          font-family: monospace;
          color: #9ca3af;
          min-width: 32px;
        }
        .meter-segments {
          position: absolute;
          inset: 0;
          display: flex;
        }
        .segment {
          flex: 1;
          border-right: 1px solid #111827;
        }
        .segment:last-child {
          border-right: none;
        }
      `}</style>

      <div
        className="meter-track"
        style={{
          width: isVertical ? height : width,
          height: isVertical ? width : height,
        }}
      >
        <div
          className="meter-fill"
          style={{
            background: getColor(level),
            ...(isVertical
              ? {
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${level}%`,
                }
              : {
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: `${level}%`,
                }),
          }}
        />

        {peak !== undefined && (
          <div
            className="meter-peak"
            style={{
              ...(isVertical
                ? {
                    bottom: `${peak}%`,
                    left: 0,
                    right: 0,
                    height: 2,
                  }
                : {
                    left: `${peak}%`,
                    top: 0,
                    bottom: 0,
                    width: 2,
                  }),
            }}
          />
        )}

        <div className="meter-segments">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="segment" />
          ))}
        </div>
      </div>

      {showLabels && (
        <span className="meter-label">{Math.round(level)}%</span>
      )}
    </div>
  );
}

// Stereo Level Meter
interface StereoMeterProps {
  leftLevel: number;
  rightLevel: number;
  leftPeak?: number;
  rightPeak?: number;
}

export function StereoMeter({ leftLevel, rightLevel, leftPeak, rightPeak }: StereoMeterProps) {
  return (
    <div className="stereo-meter">
      <style jsx>{`
        .stereo-meter {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .channel {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .channel-label {
          font-size: 10px;
          color: #6b7280;
          width: 12px;
        }
      `}</style>

      <div className="channel">
        <span className="channel-label">L</span>
        <LevelMeter level={leftLevel} peak={leftPeak} />
      </div>
      <div className="channel">
        <span className="channel-label">R</span>
        <LevelMeter level={rightLevel} peak={rightPeak} />
      </div>
    </div>
  );
}

// Waveform Display
interface WaveformProps {
  data: Float32Array | number[];
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  lineWidth?: number;
}

export function Waveform({
  data,
  width = 200,
  height = 60,
  color = '#2563eb',
  backgroundColor = '#1f2937',
  lineWidth = 2,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Center line
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Waveform
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    const samples = Array.from(data);
    const step = width / samples.length;

    samples.forEach((sample, i) => {
      const x = i * step;
      const y = (1 - (sample + 1) / 2) * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }, [data, width, height, color, backgroundColor, lineWidth]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width,
        height,
        borderRadius: 6,
        display: 'block',
      }}
    />
  );
}

// Frequency Bars
interface FrequencyBarsProps {
  data: Uint8Array | number[];
  width?: number;
  height?: number;
  barCount?: number;
  barGap?: number;
  colorStart?: string;
  colorEnd?: string;
}

export function FrequencyBars({
  data,
  width = 200,
  height = 60,
  barCount = 32,
  barGap = 2,
  colorStart = '#10b981',
  colorEnd = '#ef4444',
}: FrequencyBarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    const samples = Array.from(data);
    const samplesPerBar = Math.floor(samples.length / barCount);
    const barWidth = (width - barGap * (barCount - 1)) / barCount;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(0.5, '#f59e0b');
    gradient.addColorStop(1, colorEnd);

    for (let i = 0; i < barCount; i++) {
      // Average the samples for this bar
      let sum = 0;
      for (let j = 0; j < samplesPerBar; j++) {
        const index = i * samplesPerBar + j;
        if (index < samples.length) {
          sum += samples[index];
        }
      }
      const avg = sum / samplesPerBar;
      const normalized = avg / 255;
      const barHeight = normalized * height;

      const x = i * (barWidth + barGap);
      const y = height - barHeight;

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }, [data, width, height, barCount, barGap, colorStart, colorEnd]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width,
        height,
        borderRadius: 6,
        display: 'block',
      }}
    />
  );
}

// Circular Visualizer
interface CircularVisualizerProps {
  data: Uint8Array | number[];
  size?: number;
  color?: string;
  innerRadius?: number;
}

export function CircularVisualizer({
  data,
  size = 120,
  color = '#2563eb',
  innerRadius = 30,
}: CircularVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = (size / 2) - 4;
    const samples = Array.from(data);
    const barCount = 64;
    const samplesPerBar = Math.floor(samples.length / barCount);

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < samplesPerBar; j++) {
        const index = i * samplesPerBar + j;
        if (index < samples.length) {
          sum += samples[index];
        }
      }
      const avg = sum / samplesPerBar;
      const normalized = avg / 255;
      const barHeight = normalized * (maxRadius - innerRadius);

      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      const startX = centerX + Math.cos(angle) * innerRadius;
      const startY = centerY + Math.sin(angle) * innerRadius;
      const endX = centerX + Math.cos(angle) * (innerRadius + barHeight);
      const endY = centerY + Math.sin(angle) * (innerRadius + barHeight);

      ctx.strokeStyle = normalized > 0.7 ? '#ef4444' : normalized > 0.4 ? '#f59e0b' : color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Center circle
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius - 2, 0, Math.PI * 2);
    ctx.fill();
  }, [data, size, color, innerRadius]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'block',
      }}
    />
  );
}

// Audio Visualizer Hook
interface UseAudioVisualizerOptions {
  fftSize?: number;
  smoothingTimeConstant?: number;
}

export function useAudioVisualizer(
  audioContext: AudioContext | null,
  source: MediaStreamAudioSourceNode | AudioBufferSourceNode | null,
  options: UseAudioVisualizerOptions = {}
) {
  const { fftSize = 256, smoothingTimeConstant = 0.8 } = options;
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(0));
  const [waveformData, setWaveformData] = useState<Float32Array>(new Float32Array(0));
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const peakDecayRef = useRef(0);

  useEffect(() => {
    if (!audioContext || !source) return;

    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = fftSize;
    analyzer.smoothingTimeConstant = smoothingTimeConstant;
    analyzerRef.current = analyzer;

    source.connect(analyzer);

    const frequencyArray = new Uint8Array(analyzer.frequencyBinCount);
    const waveformArray = new Float32Array(analyzer.fftSize);

    const update = () => {
      analyzer.getByteFrequencyData(frequencyArray);
      analyzer.getFloatTimeDomainData(waveformArray);

      let sum = 0;
      for (let i = 0; i < waveformArray.length; i++) {
        sum += waveformArray[i] * waveformArray[i];
      }
      const rms = Math.sqrt(sum / waveformArray.length);
      const db = 20 * Math.log10(rms);
      const normalizedLevel = Math.max(0, Math.min(100, (db + 50) * 2));

      setFrequencyData(new Uint8Array(frequencyArray));
      setWaveformData(new Float32Array(waveformArray));
      setLevel(normalizedLevel);

      if (normalizedLevel > peakDecayRef.current) {
        peakDecayRef.current = normalizedLevel;
        setPeak(normalizedLevel);
      } else {
        peakDecayRef.current = Math.max(0, peakDecayRef.current - 1);
        setPeak(peakDecayRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      analyzer.disconnect();
    };
  }, [audioContext, source, fftSize, smoothingTimeConstant]);

  return { frequencyData, waveformData, level, peak };
}

// Combined Audio Visualizer Component
interface AudioVisualizerProps {
  frequencyData?: Uint8Array | number[];
  waveformData?: Float32Array | number[];
  level?: number;
  peak?: number;
  mode?: 'bars' | 'waveform' | 'circular' | 'all';
  width?: number;
  height?: number;
}

export function AudioVisualizer({
  frequencyData = new Uint8Array(0),
  waveformData = new Float32Array(0),
  level = 0,
  peak = 0,
  mode = 'bars',
  width = 200,
  height = 60,
}: AudioVisualizerProps) {
  const memoizedFrequencyData = useMemo(() => Array.from(frequencyData), [frequencyData]);
  const memoizedWaveformData = useMemo(() => Array.from(waveformData), [waveformData]);

  if (mode === 'all') {
    return (
      <div className="audio-visualizer-all">
        <style jsx>{`
          .audio-visualizer-all {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px;
            background: #1f2937;
            border-radius: 10px;
          }
          .viz-row {
            display: flex;
            gap: 16px;
            align-items: center;
          }
          .viz-label {
            font-size: 11px;
            color: #6b7280;
            width: 60px;
          }
        `}</style>

        <div className="viz-row">
          <span className="viz-label">Level</span>
          <LevelMeter level={level} peak={peak} size="large" />
        </div>

        <div className="viz-row">
          <span className="viz-label">Waveform</span>
          <Waveform data={memoizedWaveformData} width={width} height={height} />
        </div>

        <div className="viz-row">
          <span className="viz-label">Spectrum</span>
          <FrequencyBars data={memoizedFrequencyData} width={width} height={height} />
        </div>
      </div>
    );
  }

  if (mode === 'waveform') {
    return <Waveform data={memoizedWaveformData} width={width} height={height} />;
  }

  if (mode === 'circular') {
    return <CircularVisualizer data={memoizedFrequencyData} size={Math.min(width, height)} />;
  }

  return <FrequencyBars data={memoizedFrequencyData} width={width} height={height} />;
}

// Audio Input Selector
interface AudioInputSelectorProps {
  selectedDeviceId?: string;
  onDeviceSelect: (deviceId: string) => void;
}

export function AudioInputSelector({ selectedDeviceId, onDeviceSelect }: AudioInputSelectorProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = allDevices.filter((d) => d.kind === 'audioinput');
        setDevices(audioInputs);
      } catch (error) {
        console.error('Failed to enumerate audio devices:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDevices();

    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, []);

  if (loading) {
    return <div className="loading">Loading audio devices...</div>;
  }

  return (
    <div className="audio-input-selector">
      <style jsx>{`
        .audio-input-selector {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .selector-label {
          font-size: 13px;
          font-weight: 500;
          color: #e5e7eb;
        }
        .device-select {
          padding: 10px 14px;
          font-size: 14px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 8px;
          color: #f9fafb;
          cursor: pointer;
          outline: none;
          transition: all 0.2s ease;
        }
        .device-select:focus {
          border-color: #2563eb;
        }
        .device-select:hover {
          border-color: #4b5563;
        }
        .loading {
          font-size: 13px;
          color: #9ca3af;
        }
      `}</style>

      <label className="selector-label">Audio Input</label>
      <select
        className="device-select"
        value={selectedDeviceId || ''}
        onChange={(e) => onDeviceSelect(e.target.value)}
      >
        <option value="">Select audio input...</option>
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
          </option>
        ))}
      </select>
    </div>
  );
}

// Hook for simple audio level from MediaStream
export function useAudioLevel(stream: MediaStream | null) {
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const peakDecayRef = useRef(0);

  useEffect(() => {
    if (!stream) {
      setLevel(0);
      setPeak(0);
      setIsActive(false);
      return;
    }

    // Create audio context
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    audioContextRef.current = audioContext;

    // Create analyzer
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    analyzer.smoothingTimeConstant = 0.8;
    analyzerRef.current = analyzer;

    // Connect stream to analyzer
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyzer);

    setIsActive(true);

    // Data array for level measurement
    const dataArray = new Float32Array(analyzer.fftSize);

    const update = () => {
      analyzer.getFloatTimeDomainData(dataArray);

      // Calculate RMS level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const normalizedLevel = Math.min(1, rms * 4); // Amplify and clamp

      setLevel(normalizedLevel);

      // Peak with decay
      if (normalizedLevel > peakDecayRef.current) {
        peakDecayRef.current = normalizedLevel;
        setPeak(normalizedLevel);
      } else {
        peakDecayRef.current = Math.max(0, peakDecayRef.current - 0.01);
        setPeak(peakDecayRef.current);
      }

      animationRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      source.disconnect();
      analyzer.disconnect();
      audioContext.close();
      setIsActive(false);
    };
  }, [stream]);

  return { level, peak, isActive };
}
