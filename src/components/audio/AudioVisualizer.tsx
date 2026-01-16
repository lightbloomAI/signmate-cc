'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface AudioVisualizerProps {
  stream?: MediaStream | null;
  type?: 'waveform' | 'bars' | 'levels';
  width?: number;
  height?: number;
  barCount?: number;
  barColor?: string;
  backgroundColor?: string;
  showPeakIndicator?: boolean;
  showLevel?: boolean;
  smoothing?: number;
  className?: string;
}

export function AudioVisualizer({
  stream,
  type = 'bars',
  width = 300,
  height = 80,
  barCount = 32,
  barColor = '#667eea',
  backgroundColor = 'transparent',
  showPeakIndicator = true,
  showLevel = true,
  smoothing = 0.8,
  className = '',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const peakDecayRef = useRef<number>(0);
  const peakHoldRef = useRef<number>(0);

  // Initialize audio context and analyzer
  useEffect(() => {
    if (!stream) return;

    const audioContext = new AudioContext();
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    analyzer.smoothingTimeConstant = smoothing;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyzer);

    audioContextRef.current = audioContext;
    analyzerRef.current = analyzer;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      source.disconnect();
      audioContext.close();
    };
  }, [stream, smoothing]);

  // Draw visualization
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyzer = analyzerRef.current;
    if (!canvas || !analyzer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationRef.current = requestAnimationFrame(render);

      if (type === 'waveform') {
        analyzer.getByteTimeDomainData(dataArray);
      } else {
        analyzer.getByteFrequencyData(dataArray);
      }

      // Clear canvas
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      if (type === 'waveform') {
        drawWaveform(ctx, dataArray, bufferLength);
      } else if (type === 'bars') {
        drawBars(ctx, dataArray, bufferLength);
      } else {
        drawLevels(ctx, dataArray, bufferLength);
      }

      // Calculate average level
      const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
      const normalizedLevel = Math.min(1, average / 128);
      setCurrentLevel(normalizedLevel);

      // Peak detection with hold and decay
      if (normalizedLevel > peakDecayRef.current) {
        peakDecayRef.current = normalizedLevel;
        peakHoldRef.current = 30; // Hold for 30 frames
        setPeakLevel(normalizedLevel);
      } else {
        if (peakHoldRef.current > 0) {
          peakHoldRef.current--;
        } else {
          peakDecayRef.current = Math.max(0, peakDecayRef.current - 0.01);
          setPeakLevel(peakDecayRef.current);
        }
      }
    };

    const drawWaveform = (
      context: CanvasRenderingContext2D,
      data: Uint8Array,
      length: number
    ) => {
      context.lineWidth = 2;
      context.strokeStyle = barColor;
      context.beginPath();

      const sliceWidth = width / length;
      let x = 0;

      for (let i = 0; i < length; i++) {
        const v = data[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }

        x += sliceWidth;
      }

      context.lineTo(width, height / 2);
      context.stroke();
    };

    const drawBars = (
      context: CanvasRenderingContext2D,
      data: Uint8Array,
      length: number
    ) => {
      const barWidth = (width / barCount) * 0.8;
      const gap = (width / barCount) * 0.2;
      const step = Math.floor(length / barCount);

      for (let i = 0; i < barCount; i++) {
        // Get average of frequency range for this bar
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += data[i * step + j];
        }
        const average = sum / step;
        const barHeight = (average / 255) * height;

        const x = i * (barWidth + gap);
        const y = height - barHeight;

        // Gradient based on height
        const gradient = context.createLinearGradient(x, height, x, y);
        gradient.addColorStop(0, barColor);
        gradient.addColorStop(1, adjustColor(barColor, 40));

        context.fillStyle = gradient;
        context.fillRect(x, y, barWidth, barHeight);

        // Peak indicator
        if (showPeakIndicator) {
          const peakY = height - (peakDecayRef.current * height);
          context.fillStyle = '#ef4444';
          context.fillRect(x, peakY - 2, barWidth, 2);
        }
      }
    };

    const drawLevels = (
      context: CanvasRenderingContext2D,
      data: Uint8Array,
      length: number
    ) => {
      // Single horizontal bar showing overall level
      const average = data.reduce((a, b) => a + b, 0) / length;
      const level = (average / 255) * width;

      // Background track
      context.fillStyle = adjustColor(barColor, -60);
      context.fillRect(0, (height - 20) / 2, width, 20);

      // Level bar
      const gradient = context.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#22c55e');
      gradient.addColorStop(0.6, '#fbbf24');
      gradient.addColorStop(1, '#ef4444');
      context.fillStyle = gradient;
      context.fillRect(0, (height - 20) / 2, level, 20);

      // Peak indicator line
      if (showPeakIndicator) {
        const peakX = peakDecayRef.current * width;
        context.fillStyle = '#ffffff';
        context.fillRect(peakX - 1, (height - 24) / 2, 2, 24);
      }

      // Level markers
      context.fillStyle = 'rgba(255,255,255,0.3)';
      for (let i = 1; i < 10; i++) {
        const x = (i / 10) * width;
        context.fillRect(x, (height - 20) / 2, 1, 20);
      }
    };

    render();
  }, [type, width, height, barCount, barColor, backgroundColor, showPeakIndicator]);

  useEffect(() => {
    if (analyzerRef.current) {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  // Helper function to adjust color brightness
  function adjustColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  return (
    <div className={`audio-visualizer ${className}`}>
      <style jsx>{`
        .audio-visualizer {
          position: relative;
          display: inline-block;
        }

        canvas {
          border-radius: 8px;
          display: block;
        }

        .level-display {
          position: absolute;
          bottom: 4px;
          right: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-family: monospace;
          color: rgba(255, 255, 255, 0.8);
          background: rgba(0, 0, 0, 0.5);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .level-bar {
          width: 40px;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          overflow: hidden;
        }

        .level-fill {
          height: 100%;
          transition: width 0.05s ease;
          border-radius: 3px;
        }

        .level-fill.low {
          background: #22c55e;
        }

        .level-fill.medium {
          background: #fbbf24;
        }

        .level-fill.high {
          background: #ef4444;
        }

        .no-signal {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ backgroundColor }}
      />

      {!stream && <span className="no-signal">No audio signal</span>}

      {showLevel && stream && (
        <div className="level-display">
          <div className="level-bar">
            <div
              className={`level-fill ${currentLevel < 0.5 ? 'low' : currentLevel < 0.8 ? 'medium' : 'high'}`}
              style={{ width: `${currentLevel * 100}%` }}
            />
          </div>
          <span>{Math.round(currentLevel * 100)}%</span>
          {showPeakIndicator && <span>pk:{Math.round(peakLevel * 100)}</span>}
        </div>
      )}
    </div>
  );
}

// Hook for getting audio level without visualization
export function useAudioLevel(stream: MediaStream | null): {
  level: number;
  peak: number;
  isActive: boolean;
} {
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const peakDecayRef = useRef<number>(0);
  const peakHoldRef = useRef<number>(0);

  useEffect(() => {
    if (!stream) {
      setIsActive(false);
      setLevel(0);
      setPeak(0);
      return;
    }

    const audioContext = new AudioContext();
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    analyzer.smoothingTimeConstant = 0.8;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyzer);

    audioContextRef.current = audioContext;
    analyzerRef.current = analyzer;

    const dataArray = new Uint8Array(analyzer.frequencyBinCount);

    const update = () => {
      animationRef.current = requestAnimationFrame(update);

      analyzer.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedLevel = Math.min(1, average / 128);

      setLevel(normalizedLevel);
      setIsActive(normalizedLevel > 0.01);

      // Peak with hold and decay
      if (normalizedLevel > peakDecayRef.current) {
        peakDecayRef.current = normalizedLevel;
        peakHoldRef.current = 30;
        setPeak(normalizedLevel);
      } else {
        if (peakHoldRef.current > 0) {
          peakHoldRef.current--;
        } else {
          peakDecayRef.current = Math.max(0, peakDecayRef.current - 0.01);
          setPeak(peakDecayRef.current);
        }
      }
    };

    update();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      source.disconnect();
      audioContext.close();
    };
  }, [stream]);

  return { level, peak, isActive };
}
