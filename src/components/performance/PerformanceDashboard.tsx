'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import {
  performanceMonitor,
  type PipelineMetrics,
} from '@/lib/performance';

interface PerformanceDashboardProps {
  onClose?: () => void;
  compact?: boolean;
}

type TimeRange = '1m' | '5m' | '15m' | 'all';

interface MetricHistory {
  timestamp: number;
  metrics: PipelineMetrics;
}

export function PerformanceDashboard({
  onClose,
  compact = false,
}: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [history, setHistory] = useState<MetricHistory[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('5m');
  const [refreshRate, setRefreshRate] = useState(1000);
  const [isMonitoring, setIsMonitoring] = useState(true);

  const historyRef = useRef<MetricHistory[]>([]);
  const maxHistoryLength = 900; // 15 minutes at 1 second intervals

  // Update metrics periodically
  useEffect(() => {
    if (!isMonitoring) return;

    const updateMetrics = () => {
      const currentMetrics = performanceMonitor.getMetrics();
      setMetrics(currentMetrics);

      // Add to history
      const entry: MetricHistory = {
        timestamp: Date.now(),
        metrics: currentMetrics,
      };

      historyRef.current = [...historyRef.current, entry].slice(-maxHistoryLength);
      setHistory(historyRef.current);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, refreshRate);

    return () => clearInterval(interval);
  }, [isMonitoring, refreshRate]);

  const handleClearMetrics = useCallback(() => {
    performanceMonitor.reset();
    historyRef.current = [];
    setHistory([]);
    setMetrics(null);
  }, []);

  const getFilteredHistory = useCallback(() => {
    const now = Date.now();
    const ranges: Record<TimeRange, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      all: Infinity,
    };

    const cutoff = now - ranges[timeRange];
    return history.filter((h) => h.timestamp >= cutoff);
  }, [history, timeRange]);

  const formatLatency = (ms: number): string => {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
  };

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  const getLatencyColor = (latency: number): string => {
    if (latency <= 200) return '#10b981'; // green
    if (latency <= 400) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getStatusIndicator = (metrics: PipelineMetrics): {
    status: 'healthy' | 'warning' | 'critical';
    label: string;
    color: string;
  } => {
    const totalLatency = metrics.totalLatency;

    if (totalLatency <= 300) {
      return { status: 'healthy', label: 'Healthy', color: '#10b981' };
    }
    if (totalLatency <= 500) {
      return { status: 'warning', label: 'Degraded', color: '#f59e0b' };
    }
    return { status: 'critical', label: 'Critical', color: '#ef4444' };
  };

  // Compact view
  if (compact) {
    const status = metrics ? getStatusIndicator(metrics) : null;

    return (
      <div className="perf-compact">
        <style jsx>{`
          .perf-compact {
            background: #1f2937;
            border-radius: 8px;
            padding: 12px;
          }
          .compact-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
          .status-indicator {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }
          .status-label {
            font-size: 12px;
            color: #e5e7eb;
          }
          .compact-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
          .stat {
            text-align: center;
          }
          .stat-value {
            font-size: 16px;
            font-weight: 600;
            color: #f9fafb;
          }
          .stat-label {
            font-size: 10px;
            color: #9ca3af;
          }
        `}</style>

        <div className="compact-header">
          <div className="status-indicator">
            <div
              className="status-dot"
              style={{ background: status?.color || '#6b7280' }}
            />
            <span className="status-label">{status?.label || 'No data'}</span>
          </div>
        </div>

        <div className="compact-stats">
          <div className="stat">
            <div className="stat-value">
              {metrics ? formatLatency(metrics.totalLatency) : '--'}
            </div>
            <div className="stat-label">Latency</div>
          </div>
          <div className="stat">
            <div className="stat-value">
              {metrics ? Math.round(metrics.wordsPerMinute) : '--'}
            </div>
            <div className="stat-label">Words/min</div>
          </div>
          <div className="stat">
            <div className="stat-value">
              {metrics ? Math.round(metrics.signsPerMinute) : '--'}
            </div>
            <div className="stat-label">Signs/min</div>
          </div>
        </div>
      </div>
    );
  }

  const filteredHistory = getFilteredHistory();
  const status = metrics ? getStatusIndicator(metrics) : null;

  return (
    <div className="perf-dashboard">
      <style jsx>{`
        .perf-dashboard {
          background: #111827;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 600px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }

        .title-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .title {
          font-size: 18px;
          font-weight: 600;
          color: #f9fafb;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .header-controls {
          display: flex;
          gap: 8px;
        }

        .toolbar {
          display: flex;
          gap: 12px;
          padding: 12px 20px;
          border-bottom: 1px solid #374151;
          align-items: center;
          flex-wrap: wrap;
        }

        .toolbar-group {
          display: flex;
          gap: 4px;
        }

        .toolbar-btn {
          padding: 6px 12px;
          font-size: 12px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 4px;
          color: #9ca3af;
          cursor: pointer;
        }

        .toolbar-btn:hover {
          background: #374151;
        }

        .toolbar-btn.active {
          background: #2563eb;
          border-color: #2563eb;
          color: #fff;
        }

        .toolbar-label {
          font-size: 11px;
          color: #6b7280;
          margin-right: 8px;
        }

        .content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        @media (max-width: 768px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .metric-card {
          background: #1f2937;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 700;
          color: #f9fafb;
          margin-bottom: 4px;
        }

        .metric-label {
          font-size: 12px;
          color: #9ca3af;
        }

        .metric-trend {
          font-size: 11px;
          margin-top: 6px;
        }

        .trend-up {
          color: #10b981;
        }

        .trend-down {
          color: #ef4444;
        }

        .section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #e5e7eb;
          margin-bottom: 12px;
        }

        .latency-bars {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .latency-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .latency-label {
          width: 100px;
          font-size: 12px;
          color: #9ca3af;
        }

        .latency-bar-container {
          flex: 1;
          height: 20px;
          background: #1f2937;
          border-radius: 4px;
          overflow: hidden;
        }

        .latency-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .latency-value {
          width: 60px;
          text-align: right;
          font-size: 12px;
          font-family: monospace;
          color: #f9fafb;
        }

        .error-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .error-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: #1f2937;
          border-radius: 6px;
        }

        .error-type {
          font-size: 13px;
          color: #e5e7eb;
        }

        .error-count {
          font-size: 13px;
          font-weight: 600;
          color: #f87171;
        }

        .chart-placeholder {
          height: 120px;
          background: #1f2937;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          padding: 12px;
        }

        .chart-bars {
          flex: 1;
          display: flex;
          align-items: flex-end;
          gap: 2px;
        }

        .chart-bar {
          flex: 1;
          background: #2563eb;
          border-radius: 2px 2px 0 0;
          min-height: 4px;
        }

        .chart-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 10px;
          color: #6b7280;
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }
      `}</style>

      <div className="header">
        <div className="title-section">
          <h2 className="title">Performance</h2>
          {status && (
            <div
              className="status-badge"
              style={{
                background: `${status.color}20`,
                color: status.color,
              }}
            >
              <div className="status-dot" style={{ background: status.color }} />
              {status.label}
            </div>
          )}
        </div>
        <div className="header-controls">
          <Button
            variant={isMonitoring ? 'primary' : 'secondary'}
            size="small"
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? 'Pause' : 'Resume'}
          </Button>
          {onClose && (
            <Button variant="ghost" size="small" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </div>

      <div className="toolbar">
        <span className="toolbar-label">Time Range:</span>
        <div className="toolbar-group">
          {(['1m', '5m', '15m', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              className={`toolbar-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range === 'all' ? 'All' : range}
            </button>
          ))}
        </div>

        <span className="toolbar-label" style={{ marginLeft: 'auto' }}>
          Refresh:
        </span>
        <div className="toolbar-group">
          {[500, 1000, 2000].map((rate) => (
            <button
              key={rate}
              className={`toolbar-btn ${refreshRate === rate ? 'active' : ''}`}
              onClick={() => setRefreshRate(rate)}
            >
              {rate / 1000}s
            </button>
          ))}
        </div>

        <Button variant="ghost" size="small" onClick={handleClearMetrics}>
          Clear
        </Button>
      </div>

      <div className="content">
        {!metrics ? (
          <div className="no-data">
            <p>No performance data available</p>
            <p style={{ marginTop: 8, fontSize: 13 }}>
              Start interpreting to see metrics
            </p>
          </div>
        ) : (
          <>
            <div className="metrics-grid">
              <div className="metric-card">
                <div
                  className="metric-value"
                  style={{ color: getLatencyColor(metrics.totalLatency) }}
                >
                  {formatLatency(metrics.totalLatency)}
                </div>
                <div className="metric-label">Total Latency</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {Math.round(metrics.wordsPerMinute)}
                </div>
                <div className="metric-label">Words/min</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {Math.round(metrics.signsPerMinute)}
                </div>
                <div className="metric-label">Signs/min</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{Math.round(metrics.memoryUsageMB)}MB</div>
                <div className="metric-label">Memory</div>
              </div>
            </div>

            <div className="section">
              <div className="section-title">Latency Breakdown</div>
              <div className="latency-bars">
                {[
                  {
                    label: 'Audio to Speech',
                    value: metrics.audioToSpeech,
                    max: 300,
                  },
                  {
                    label: 'Speech to Translation',
                    value: metrics.speechToTranslation,
                    max: 200,
                  },
                  { label: 'Translation to Render', value: metrics.translationToRender, max: 100 },
                ].map((item) => (
                  <div key={item.label} className="latency-row">
                    <div className="latency-label">{item.label}</div>
                    <div className="latency-bar-container">
                      <div
                        className="latency-bar"
                        style={{
                          width: `${Math.min(100, (item.value / item.max) * 100)}%`,
                          background: getLatencyColor(item.value),
                        }}
                      />
                    </div>
                    <div className="latency-value">{formatLatency(item.value)}</div>
                  </div>
                ))}
              </div>
            </div>

            {filteredHistory.length > 10 && (
              <div className="section">
                <div className="section-title">Latency History</div>
                <div className="chart-placeholder">
                  <div className="chart-bars">
                    {filteredHistory.slice(-60).map((h, i) => {
                      const maxLatency = Math.max(
                        ...filteredHistory.slice(-60).map((x) => x.metrics.totalLatency),
                        100
                      );
                      const height =
                        (h.metrics.totalLatency / maxLatency) * 100;
                      return (
                        <div
                          key={i}
                          className="chart-bar"
                          style={{
                            height: `${Math.max(4, height)}%`,
                            background: getLatencyColor(h.metrics.totalLatency),
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="chart-labels">
                    <span>Oldest</span>
                    <span>Now</span>
                  </div>
                </div>
              </div>
            )}

            <div className="section">
              <div className="section-title">Quality Metrics</div>
              <div className="latency-bars">
                {[
                  {
                    label: 'Speech Confidence',
                    value: metrics.speechConfidence * 100,
                    max: 100,
                  },
                  {
                    label: 'Translation Coverage',
                    value: metrics.translationCoverage * 100,
                    max: 100,
                  },
                ].map((item) => (
                  <div key={item.label} className="latency-row">
                    <div className="latency-label">{item.label}</div>
                    <div className="latency-bar-container">
                      <div
                        className="latency-bar"
                        style={{
                          width: `${item.value}%`,
                          background: item.value >= 80 ? '#10b981' : item.value >= 60 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                    <div className="latency-value">{Math.round(item.value)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
