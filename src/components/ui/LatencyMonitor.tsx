'use client';

import { useState, useEffect, useRef } from 'react';

interface LatencyMonitorProps {
  currentLatency: number;
  targetLatency?: number;
  historySize?: number;
  compact?: boolean;
}

export function LatencyMonitor({
  currentLatency,
  targetLatency = 500,
  historySize = 30,
  compact = false,
}: LatencyMonitorProps) {
  const [history, setHistory] = useState<number[]>([]);
  const [stats, setStats] = useState({ avg: 0, min: 0, max: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update history
  useEffect(() => {
    if (currentLatency > 0) {
      setHistory((prev) => {
        const newHistory = [...prev, currentLatency].slice(-historySize);

        // Calculate stats
        if (newHistory.length > 0) {
          const avg = newHistory.reduce((a, b) => a + b, 0) / newHistory.length;
          const min = Math.min(...newHistory);
          const max = Math.max(...newHistory);
          setStats({ avg: Math.round(avg), min, max });
        }

        return newHistory;
      });
    }
  }, [currentLatency, historySize]);

  // Draw graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 4;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Find range
    const maxLatency = Math.max(targetLatency * 1.5, ...history);
    const minLatency = 0;

    // Draw target line
    const targetY = height - padding - ((targetLatency - minLatency) / (maxLatency - minLatency)) * (height - padding * 2);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding, targetY);
    ctx.lineTo(width - padding, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw history line
    ctx.strokeStyle = currentLatency <= targetLatency ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();

    history.forEach((latency, i) => {
      const x = padding + (i / (historySize - 1)) * (width - padding * 2);
      const y = height - padding - ((latency - minLatency) / (maxLatency - minLatency)) * (height - padding * 2);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw current point
    if (history.length > 0) {
      const lastX = padding + ((history.length - 1) / (historySize - 1)) * (width - padding * 2);
      const lastY = height - padding - ((history[history.length - 1] - minLatency) / (maxLatency - minLatency)) * (height - padding * 2);

      ctx.fillStyle = currentLatency <= targetLatency ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [history, targetLatency, historySize, currentLatency]);

  const getLatencyColor = (latency: number) => {
    if (latency <= targetLatency * 0.6) return '#22c55e'; // Green - excellent
    if (latency <= targetLatency) return '#84cc16'; // Lime - good
    if (latency <= targetLatency * 1.5) return '#fbbf24'; // Yellow - warning
    return '#ef4444'; // Red - poor
  };

  const getLatencyStatus = (latency: number) => {
    if (latency <= targetLatency * 0.6) return 'Excellent';
    if (latency <= targetLatency) return 'Good';
    if (latency <= targetLatency * 1.5) return 'Warning';
    return 'Poor';
  };

  if (compact) {
    return (
      <div className="latency-compact">
        <style jsx>{`
          .latency-compact {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 6px;
          }
          .latency-value {
            font-size: 14px;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
          }
          .latency-unit {
            font-size: 11px;
            color: #9ca3af;
          }
          .latency-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <div
          className="latency-dot"
          style={{ backgroundColor: getLatencyColor(currentLatency) }}
        />
        <span className="latency-value" style={{ color: getLatencyColor(currentLatency) }}>
          {currentLatency}
        </span>
        <span className="latency-unit">ms</span>
      </div>
    );
  }

  return (
    <div className="latency-monitor">
      <style jsx>{`
        .latency-monitor {
          background: #1f2937;
          border-radius: 12px;
          padding: 16px;
          min-width: 240px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .title {
          font-size: 12px;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .status-badge {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .current-value {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-bottom: 12px;
        }
        .value {
          font-size: 36px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .unit {
          font-size: 14px;
          color: #6b7280;
        }
        .graph-container {
          margin-bottom: 12px;
        }
        canvas {
          width: 100%;
          height: 60px;
          border-radius: 6px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .stat {
          text-align: center;
        }
        .stat-value {
          font-size: 14px;
          font-weight: 600;
          color: #e5e7eb;
          font-variant-numeric: tabular-nums;
        }
        .stat-label {
          font-size: 10px;
          color: #6b7280;
          text-transform: uppercase;
        }
        .target-info {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #374151;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .target-label {
          font-size: 11px;
          color: #6b7280;
        }
        .target-value {
          font-size: 12px;
          color: #fbbf24;
          font-weight: 600;
        }
      `}</style>

      <div className="header">
        <span className="title">Pipeline Latency</span>
        <span
          className="status-badge"
          style={{
            backgroundColor: `${getLatencyColor(currentLatency)}20`,
            color: getLatencyColor(currentLatency),
          }}
        >
          {getLatencyStatus(currentLatency)}
        </span>
      </div>

      <div className="current-value">
        <span className="value" style={{ color: getLatencyColor(currentLatency) }}>
          {currentLatency}
        </span>
        <span className="unit">ms</span>
      </div>

      <div className="graph-container">
        <canvas ref={canvasRef} width={200} height={60} />
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-value">{stats.min || '-'}</div>
          <div className="stat-label">Min</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.avg || '-'}</div>
          <div className="stat-label">Avg</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.max || '-'}</div>
          <div className="stat-label">Max</div>
        </div>
      </div>

      <div className="target-info">
        <span className="target-label">Target latency</span>
        <span className="target-value">{targetLatency}ms</span>
      </div>
    </div>
  );
}
