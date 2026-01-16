'use client';

import { useState, useEffect, useCallback } from 'react';
import { runHealthCheck, type HealthReport, type HealthCheckResult } from '@/lib/health/healthCheck';
import { Button } from '@/components/ui/Button';

interface HealthCheckDisplayProps {
  autoRun?: boolean;
  onComplete?: (report: HealthReport) => void;
  compact?: boolean;
}

export function HealthCheckDisplay({
  autoRun = true,
  onComplete,
  compact = false,
}: HealthCheckDisplayProps) {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runCheck = useCallback(async () => {
    setIsRunning(true);
    const result = await runHealthCheck();
    setReport(result);
    setIsRunning(false);
    onComplete?.(result);
  }, [onComplete]);

  useEffect(() => {
    if (autoRun) {
      runCheck();
    }
  }, [autoRun, runCheck]);

  const getStatusColor = (status: 'pass' | 'warn' | 'fail' | 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'pass':
      case 'healthy':
        return '#22c55e';
      case 'warn':
      case 'degraded':
        return '#fbbf24';
      case 'fail':
      case 'unhealthy':
        return '#ef4444';
    }
  };

  const getStatusIcon = (status: 'pass' | 'warn' | 'fail') => {
    switch (status) {
      case 'pass':
        return '✓';
      case 'warn':
        return '!';
      case 'fail':
        return '✕';
    }
  };

  if (compact && report) {
    return (
      <div className="health-compact">
        <style jsx>{`
          .health-compact {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 16px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            border-left: 3px solid ${getStatusColor(report.overall)};
          }
          .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: ${getStatusColor(report.overall)};
          }
          .status-text {
            font-size: 13px;
            color: #e5e7eb;
            font-weight: 500;
          }
          .counts {
            font-size: 12px;
            color: #9ca3af;
          }
        `}</style>
        <div className="status-dot" />
        <span className="status-text">
          System {report.overall === 'healthy' ? 'Ready' : report.overall === 'degraded' ? 'Limited' : 'Issues'}
        </span>
        <span className="counts">
          {report.passCount}/{report.checks.length} checks passed
        </span>
      </div>
    );
  }

  return (
    <div className="health-check">
      <style jsx>{`
        .health-check {
          background: #1f2937;
          border-radius: 12px;
          padding: 20px;
          max-width: 500px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .title {
          font-size: 18px;
          font-weight: 700;
          color: #f9fafb;
        }
        .overall-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
        }
        .checks-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .check-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          background: #111827;
          border-radius: 8px;
          border-left: 3px solid;
        }
        .check-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
          flex-shrink: 0;
        }
        .check-content {
          flex: 1;
          min-width: 0;
        }
        .check-name {
          font-size: 14px;
          font-weight: 600;
          color: #e5e7eb;
        }
        .check-message {
          font-size: 13px;
          color: #9ca3af;
          margin-top: 2px;
        }
        .check-details {
          font-size: 11px;
          color: #6b7280;
          margin-top: 4px;
          font-family: monospace;
        }
        .check-duration {
          font-size: 11px;
          color: #6b7280;
        }
        .summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #374151;
        }
        .summary-counts {
          display: flex;
          gap: 16px;
        }
        .count {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
        }
        .count-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #9ca3af;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #374151;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 12px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="header">
        <h3 className="title">System Health Check</h3>
        <Button
          variant="ghost"
          size="small"
          onClick={runCheck}
          loading={isRunning}
          disabled={isRunning}
        >
          {isRunning ? 'Checking...' : 'Rerun'}
        </Button>
      </div>

      {isRunning && !report && (
        <div className="loading">
          <div className="spinner" />
          <span>Running health checks...</span>
        </div>
      )}

      {report && (
        <>
          <div
            className="overall-status"
            style={{
              background: `${getStatusColor(report.overall)}20`,
              color: getStatusColor(report.overall),
            }}
          >
            {report.overall === 'healthy' && '✓ System Ready'}
            {report.overall === 'degraded' && '! Limited Functionality'}
            {report.overall === 'unhealthy' && '✕ Issues Detected'}
          </div>

          <div className="checks-list" style={{ marginTop: 16 }}>
            {report.checks.map((check, index) => (
              <CheckItem key={index} check={check} />
            ))}
          </div>

          <div className="summary">
            <div className="summary-counts">
              <div className="count">
                <div className="count-dot" style={{ background: '#22c55e' }} />
                <span style={{ color: '#22c55e' }}>{report.passCount} passed</span>
              </div>
              {report.warnCount > 0 && (
                <div className="count">
                  <div className="count-dot" style={{ background: '#fbbf24' }} />
                  <span style={{ color: '#fbbf24' }}>{report.warnCount} warnings</span>
                </div>
              )}
              {report.failCount > 0 && (
                <div className="count">
                  <div className="count-dot" style={{ background: '#ef4444' }} />
                  <span style={{ color: '#ef4444' }}>{report.failCount} failed</span>
                </div>
              )}
            </div>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              {report.totalDuration.toFixed(0)}ms total
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function CheckItem({ check }: { check: HealthCheckResult }) {
  const [expanded, setExpanded] = useState(check.status !== 'pass');

  const color =
    check.status === 'pass'
      ? '#22c55e'
      : check.status === 'warn'
        ? '#fbbf24'
        : '#ef4444';

  const icon =
    check.status === 'pass' ? '✓' : check.status === 'warn' ? '!' : '✕';

  return (
    <div
      className="check-item"
      style={{ borderColor: color, cursor: check.details ? 'pointer' : 'default' }}
      onClick={() => check.details && setExpanded(!expanded)}
    >
      <div
        className="check-icon"
        style={{ background: color, color: check.status === 'warn' ? '#000' : '#fff' }}
      >
        {icon}
      </div>
      <div className="check-content">
        <div className="check-name">{check.name}</div>
        <div className="check-message">{check.message}</div>
        {expanded && check.details && (
          <div className="check-details">{check.details}</div>
        )}
      </div>
      {check.duration !== undefined && (
        <span className="check-duration">{check.duration.toFixed(0)}ms</span>
      )}
    </div>
  );
}
