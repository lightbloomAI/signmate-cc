'use client';

import { useState, useEffect } from 'react';
import { usePerformanceMonitor } from '@/hooks';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { LatencyMonitor } from '@/components/ui/LatencyMonitor';

interface MetricsDashboardProps {
  sessionStartTime?: number;
  wordsProcessed?: number;
  signsGenerated?: number;
  isCompact?: boolean;
}

export function MetricsDashboard({
  sessionStartTime = Date.now(),
  wordsProcessed = 0,
  signsGenerated = 0,
  isCompact = false,
}: MetricsDashboardProps) {
  const {
    metrics,
    memoryLevel,
    memoryUsageMB,
    isHealthy,
    getLatencyStatus,
  } = usePerformanceMonitor();

  const [sessionDuration, setSessionDuration] = useState(0);

  // Update session duration
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionDuration(Date.now() - sessionStartTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Format duration as HH:MM:SS
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    return [
      hours.toString().padStart(2, '0'),
      (minutes % 60).toString().padStart(2, '0'),
      (seconds % 60).toString().padStart(2, '0'),
    ].join(':');
  };

  const getHealthStatus = () => {
    if (!isHealthy) return 'error';
    const latencyStatus = getLatencyStatus();
    if (latencyStatus === 'excellent' || latencyStatus === 'good') return 'active';
    if (latencyStatus === 'warning') return 'warning';
    return 'error';
  };

  const getMemoryStatus = () => {
    if (memoryLevel === 'critical') return 'error';
    if (memoryLevel === 'warning') return 'warning';
    return 'active';
  };

  if (isCompact) {
    return (
      <div className="metrics-compact">
        <style jsx>{`
          .metrics-compact {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 8px 16px;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 8px;
            font-size: 12px;
          }
          .metric-item {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .metric-value {
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            color: #f9fafb;
          }
          .metric-label {
            color: #9ca3af;
          }
          .divider {
            width: 1px;
            height: 20px;
            background: #374151;
          }
        `}</style>

        <div className="metric-item">
          <StatusIndicator status={getHealthStatus()} size="small" showLabel={false} />
          <span className="metric-value">{metrics?.totalLatency || 0}ms</span>
        </div>

        <div className="divider" />

        <div className="metric-item">
          <span className="metric-label">Session:</span>
          <span className="metric-value">{formatDuration(sessionDuration)}</span>
        </div>

        <div className="divider" />

        <div className="metric-item">
          <span className="metric-label">Signs:</span>
          <span className="metric-value">{signsGenerated}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="metrics-dashboard">
      <style jsx>{`
        .metrics-dashboard {
          background: #1f2937;
          border-radius: 16px;
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .metric-card {
          background: #111827;
          border-radius: 12px;
          padding: 16px;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .card-title {
          font-size: 12px;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .card-value {
          font-size: 32px;
          font-weight: 700;
          color: #f9fafb;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .card-unit {
          font-size: 14px;
          color: #6b7280;
          margin-left: 4px;
        }
        .card-detail {
          font-size: 12px;
          color: #6b7280;
          margin-top: 8px;
        }
        .card-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
        }
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-top: 12px;
        }
        .stat-item {
          text-align: center;
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
        }
        .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #f9fafb;
          font-variant-numeric: tabular-nums;
        }
        .stat-label {
          font-size: 10px;
          color: #6b7280;
          text-transform: uppercase;
        }
        .health-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: ${isHealthy ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
          border-radius: 6px;
          margin-top: 12px;
        }
        .health-text {
          font-size: 13px;
          color: ${isHealthy ? '#22c55e' : '#ef4444'};
          font-weight: 500;
        }
        .progress-bar {
          height: 6px;
          background: #374151;
          border-radius: 3px;
          overflow: hidden;
          margin-top: 8px;
        }
        .progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        .latency-section {
          grid-column: span 2;
        }
        @media (max-width: 600px) {
          .latency-section {
            grid-column: span 1;
          }
        }
      `}</style>

      {/* Session Info */}
      <div className="metric-card">
        <div className="card-header">
          <span className="card-title">Session Duration</span>
        </div>
        <div className="card-value">
          {formatDuration(sessionDuration)}
        </div>
        <div className="health-indicator">
          <StatusIndicator status={getHealthStatus()} size="small" showLabel={false} />
          <span className="health-text">
            {isHealthy ? 'System Healthy' : 'Attention Needed'}
          </span>
        </div>
      </div>

      {/* Throughput */}
      <div className="metric-card">
        <div className="card-header">
          <span className="card-title">Throughput</span>
        </div>
        <div className="card-value">
          {signsGenerated}
          <span className="card-unit">signs</span>
        </div>
        <div className="stat-grid">
          <div className="stat-item">
            <div className="stat-value">{wordsProcessed}</div>
            <div className="stat-label">Words</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">
              {sessionDuration > 60000
                ? Math.round((signsGenerated / sessionDuration) * 60000)
                : '-'}
            </div>
            <div className="stat-label">Signs/min</div>
          </div>
        </div>
      </div>

      {/* Memory */}
      <div className="metric-card">
        <div className="card-header">
          <span className="card-title">Memory Usage</span>
          <StatusIndicator status={getMemoryStatus()} size="small" showLabel={false} />
        </div>
        <div className="card-value">
          {Math.round(memoryUsageMB)}
          <span className="card-unit">MB</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(memoryUsageMB / 2.5, 100)}%`,
              background:
                memoryLevel === 'critical'
                  ? '#ef4444'
                  : memoryLevel === 'warning'
                    ? '#fbbf24'
                    : '#22c55e',
            }}
          />
        </div>
        <div className="card-detail">
          Target: &lt;150MB | Warning: 150MB | Critical: 250MB
        </div>
      </div>

      {/* Pipeline Latency */}
      <div className="metric-card">
        <div className="card-header">
          <span className="card-title">Pipeline Breakdown</span>
        </div>
        <div className="stat-grid">
          <div className="stat-item">
            <div className="stat-value">{Math.round(metrics?.audioToSpeech || 0)}</div>
            <div className="stat-label">Audio→Speech</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{Math.round(metrics?.speechToTranslation || 0)}</div>
            <div className="stat-label">Speech→ASL</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{Math.round(metrics?.translationToRender || 0)}</div>
            <div className="stat-label">ASL→Render</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{Math.round(metrics?.totalLatency || 0)}</div>
            <div className="stat-label">Total (ms)</div>
          </div>
        </div>
      </div>

      {/* Latency Monitor Graph */}
      <div className="metric-card latency-section">
        <LatencyMonitor
          currentLatency={Math.round(metrics?.totalLatency || 0)}
          targetLatency={500}
          historySize={30}
        />
      </div>
    </div>
  );
}
