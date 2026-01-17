'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Stats Types
interface PipelineStats {
  latency: number;
  wordsPerMinute: number;
  signsPerMinute: number;
  accuracy: number;
  bufferHealth: number;
  errorRate: number;
}

interface HistoricalData {
  timestamp: number;
  latency: number;
  throughput: number;
}

// Stats Card
interface StatsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  status?: 'good' | 'warning' | 'critical';
  icon?: string;
}

export function StatsCard({
  title,
  value,
  unit,
  trend,
  trendValue,
  status = 'good',
  icon,
}: StatsCardProps) {
  const statusColors = {
    good: '#10b981',
    warning: '#f59e0b',
    critical: '#ef4444',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    stable: '→',
  };

  return (
    <div className="stats-card">
      <style jsx>{`
        .stats-card {
          padding: 16px;
          background: #1f2937;
          border-radius: 10px;
          border-left: 3px solid ${statusColors[status]};
        }
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .card-title {
          font-size: 12px;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }
        .card-icon {
          font-size: 16px;
        }
        .card-value {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .value {
          font-size: 28px;
          font-weight: 700;
          color: #f9fafb;
          font-family: monospace;
        }
        .unit {
          font-size: 14px;
          color: #6b7280;
        }
        .card-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 8px;
          font-size: 12px;
          color: ${trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#9ca3af'};
        }
      `}</style>

      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        {icon && <span className="card-icon">{icon}</span>}
      </div>

      <div className="card-value">
        <span className="value">{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>

      {trend && trendValue && (
        <div className="card-trend">
          <span>{trendIcons[trend]}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}

// Mini Chart (Sparkline)
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  color = '#2563eb',
  fillColor = 'rgba(37, 99, 235, 0.2)',
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const fillD = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

  return (
    <svg width={width} height={height} className="sparkline">
      <defs>
        <linearGradient id="sparkline-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fillColor} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#sparkline-gradient)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

// Latency Graph
interface LatencyGraphProps {
  data: HistoricalData[];
  targetLatency?: number;
  width?: number;
  height?: number;
}

export function LatencyGraph({
  data,
  targetLatency = 500,
  width = 400,
  height = 150,
}: LatencyGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Calculate bounds
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    const latencies = data.map((d) => d.latency);
    const maxLatency = Math.max(...latencies, targetLatency * 1.2);
    const minLatency = 0;

    // Draw grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (i / gridLines) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      const value = Math.round(maxLatency - (i / gridLines) * (maxLatency - minLatency));
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${value}ms`, padding.left - 8, y + 3);
    }

    // Draw target line
    const targetY = padding.top + ((maxLatency - targetLatency) / (maxLatency - minLatency)) * graphHeight;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, targetY);
    ctx.lineTo(width - padding.right, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw target label
    ctx.fillStyle = '#f59e0b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('target', width - padding.right, targetY - 4);

    // Draw line chart
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, i) => {
      const x = padding.left + (i / (data.length - 1)) * graphWidth;
      const y = padding.top + ((maxLatency - point.latency) / (maxLatency - minLatency)) * graphHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.3)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);

    data.forEach((point, i) => {
      const x = padding.left + (i / (data.length - 1)) * graphWidth;
      const y = padding.top + ((maxLatency - point.latency) / (maxLatency - minLatency)) * graphHeight;
      ctx.lineTo(x, y);
    });

    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // X-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
      const dataIndex = Math.floor((i / labelCount) * (data.length - 1));
      const x = padding.left + (i / labelCount) * graphWidth;
      const label = `-${Math.round((data.length - 1 - dataIndex) / 2)}s`;
      ctx.fillText(label, x, height - 8);
    }
  }, [data, targetLatency, width, height]);

  return (
    <div className="latency-graph">
      <style jsx>{`
        .latency-graph {
          background: #111827;
          border-radius: 8px;
          padding: 8px;
        }
        canvas {
          display: block;
        }
      `}</style>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width, height }}
      />
    </div>
  );
}

// Pipeline Health Indicator
interface PipelineHealthProps {
  stages: {
    name: string;
    status: 'active' | 'idle' | 'error' | 'warning';
    latency?: number;
  }[];
}

export function PipelineHealth({ stages }: PipelineHealthProps) {
  const statusColors = {
    active: '#10b981',
    idle: '#6b7280',
    error: '#ef4444',
    warning: '#f59e0b',
  };

  return (
    <div className="pipeline-health">
      <style jsx>{`
        .pipeline-health {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px;
          background: #1f2937;
          border-radius: 10px;
          overflow-x: auto;
        }
        .stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          min-width: 80px;
        }
        .stage-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .stage-name {
          font-size: 11px;
          color: #9ca3af;
          text-align: center;
        }
        .stage-latency {
          font-size: 10px;
          color: #6b7280;
          font-family: monospace;
        }
        .connector {
          width: 32px;
          height: 2px;
          background: #374151;
          flex-shrink: 0;
        }
        .connector.active {
          background: linear-gradient(90deg, #10b981, #2563eb);
          animation: flow 1s linear infinite;
        }
        @keyframes flow {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 100% 50%;
          }
        }
      `}</style>

      {stages.map((stage, i) => (
        <div key={stage.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="stage">
            <div
              className="stage-indicator"
              style={{
                background: statusColors[stage.status],
                animation: stage.status === 'active' ? 'pulse 2s ease-in-out infinite' : 'none',
              }}
            />
            <span className="stage-name">{stage.name}</span>
            {stage.latency !== undefined && (
              <span className="stage-latency">{stage.latency}ms</span>
            )}
          </div>
          {i < stages.length - 1 && (
            <div className={`connector ${stage.status === 'active' ? 'active' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// Stats Dashboard Component
interface StatsDashboardProps {
  pipelineStats?: PipelineStats;
  historicalData?: HistoricalData[];
  compact?: boolean;
}

export function StatsDashboard({
  pipelineStats,
  historicalData = [],
  compact = false,
}: StatsDashboardProps) {
  const [stats, setStats] = useState<PipelineStats>(
    pipelineStats || {
      latency: 0,
      wordsPerMinute: 0,
      signsPerMinute: 0,
      accuracy: 100,
      bufferHealth: 100,
      errorRate: 0,
    }
  );

  const [history, setHistory] = useState<HistoricalData[]>(historicalData);

  // Update stats when props change
  useEffect(() => {
    if (pipelineStats) {
      setStats(pipelineStats);
    }
  }, [pipelineStats]);

  useEffect(() => {
    if (historicalData.length > 0) {
      setHistory(historicalData);
    }
  }, [historicalData]);

  const getLatencyStatus = (latency: number): 'good' | 'warning' | 'critical' => {
    if (latency < 300) return 'good';
    if (latency < 500) return 'warning';
    return 'critical';
  };

  const getErrorStatus = (rate: number): 'good' | 'warning' | 'critical' => {
    if (rate < 1) return 'good';
    if (rate < 5) return 'warning';
    return 'critical';
  };

  const getBufferStatus = (health: number): 'good' | 'warning' | 'critical' => {
    if (health > 80) return 'good';
    if (health > 50) return 'warning';
    return 'critical';
  };

  if (compact) {
    return (
      <div className="stats-compact">
        <style jsx>{`
          .stats-compact {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 12px 16px;
            background: #1f2937;
            border-radius: 8px;
          }
          .stat-item {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .stat-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }
          .stat-label {
            font-size: 12px;
            color: #9ca3af;
          }
          .stat-value {
            font-size: 13px;
            font-weight: 600;
            color: #f9fafb;
            font-family: monospace;
          }
        `}</style>

        <div className="stat-item">
          <div
            className="stat-dot"
            style={{
              background:
                getLatencyStatus(stats.latency) === 'good'
                  ? '#10b981'
                  : getLatencyStatus(stats.latency) === 'warning'
                  ? '#f59e0b'
                  : '#ef4444',
            }}
          />
          <span className="stat-label">Latency:</span>
          <span className="stat-value">{stats.latency}ms</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">WPM:</span>
          <span className="stat-value">{stats.wordsPerMinute}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Accuracy:</span>
          <span className="stat-value">{stats.accuracy}%</span>
        </div>

        {history.length > 0 && (
          <Sparkline
            data={history.slice(-30).map((h) => h.latency)}
            width={60}
            height={20}
          />
        )}
      </div>
    );
  }

  return (
    <div className="stats-dashboard">
      <style jsx>{`
        .stats-dashboard {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0 0 12px 0;
        }
        .graph-section {
          margin-top: 8px;
        }
      `}</style>

      <div className="stats-grid">
        <StatsCard
          title="Latency"
          value={stats.latency}
          unit="ms"
          status={getLatencyStatus(stats.latency)}
          icon="⚡"
        />
        <StatsCard
          title="Words/Min"
          value={stats.wordsPerMinute}
          status="good"
          icon="📝"
        />
        <StatsCard
          title="Signs/Min"
          value={stats.signsPerMinute}
          status="good"
          icon="🤟"
        />
        <StatsCard
          title="Accuracy"
          value={stats.accuracy}
          unit="%"
          status={stats.accuracy > 95 ? 'good' : stats.accuracy > 85 ? 'warning' : 'critical'}
          icon="🎯"
        />
        <StatsCard
          title="Buffer Health"
          value={stats.bufferHealth}
          unit="%"
          status={getBufferStatus(stats.bufferHealth)}
          icon="📊"
        />
        <StatsCard
          title="Error Rate"
          value={stats.errorRate.toFixed(2)}
          unit="%"
          status={getErrorStatus(stats.errorRate)}
          icon="⚠️"
        />
      </div>

      {history.length > 0 && (
        <div className="graph-section">
          <h3 className="section-title">Latency Over Time</h3>
          <LatencyGraph data={history} targetLatency={500} width={400} height={150} />
        </div>
      )}

      <div>
        <h3 className="section-title">Pipeline Status</h3>
        <PipelineHealth
          stages={[
            { name: 'Audio', status: 'active', latency: 20 },
            { name: 'Speech', status: 'active', latency: 150 },
            { name: 'Translation', status: 'active', latency: 80 },
            { name: 'Rendering', status: 'active', latency: 50 },
          ]}
        />
      </div>
    </div>
  );
}

// Hook for real-time stats
interface UseStatsOptions {
  updateInterval?: number;
  historyLength?: number;
}

export function useStats(options: UseStatsOptions = {}) {
  const { updateInterval = 500, historyLength = 120 } = options;
  const [stats, setStats] = useState<PipelineStats>({
    latency: 0,
    wordsPerMinute: 0,
    signsPerMinute: 0,
    accuracy: 100,
    bufferHealth: 100,
    errorRate: 0,
  });
  const [history, setHistory] = useState<HistoricalData[]>([]);

  const updateStats = useCallback((newStats: Partial<PipelineStats>) => {
    setStats((prev) => ({ ...prev, ...newStats }));
  }, []);

  const recordLatency = useCallback((latency: number, throughput: number = 0) => {
    setHistory((prev) => {
      const newEntry: HistoricalData = {
        timestamp: Date.now(),
        latency,
        throughput,
      };
      const updated = [...prev, newEntry];
      if (updated.length > historyLength) {
        return updated.slice(-historyLength);
      }
      return updated;
    });
  }, [historyLength]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    stats,
    history,
    updateStats,
    recordLatency,
    clearHistory,
  };
}

// Real-time Stats Monitor
interface StatsMonitorProps {
  isActive: boolean;
  onStatsUpdate?: (stats: PipelineStats) => void;
}

export function StatsMonitor({ isActive, onStatsUpdate }: StatsMonitorProps) {
  const { stats, history, updateStats, recordLatency } = useStats();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulate real-time stats updates (in production, this would come from actual pipeline)
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        const newLatency = 200 + Math.random() * 200;
        const newStats: Partial<PipelineStats> = {
          latency: Math.round(newLatency),
          wordsPerMinute: 80 + Math.floor(Math.random() * 40),
          signsPerMinute: 60 + Math.floor(Math.random() * 30),
          accuracy: 95 + Math.random() * 5,
          bufferHealth: 85 + Math.random() * 15,
          errorRate: Math.random() * 2,
        };

        updateStats(newStats);
        recordLatency(newLatency, newStats.wordsPerMinute || 0);
        onStatsUpdate?.({ ...stats, ...newStats } as PipelineStats);
      }, 500);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, updateStats, recordLatency, onStatsUpdate, stats]);

  return <StatsDashboard pipelineStats={stats} historicalData={history} />;
}
