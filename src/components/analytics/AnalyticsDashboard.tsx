'use client';

import React, { useState, useMemo } from 'react';
import {
  useSessionMetrics,
  useAggregatedAnalytics,
  usePerformanceTracking,
} from '@/lib/analytics/useAnalytics';
import type { AggregatedAnalytics, SessionMetrics, PerformanceSnapshot } from '@/lib/analytics/analyticsManager';

/**
 * AnalyticsDashboard Component
 *
 * Visual dashboard for displaying analytics and performance metrics.
 */

// Metric Card Component
interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

function MetricCard({ label, value, subValue, trend, icon }: MetricCardProps) {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500',
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
        {subValue && (
          <span className={`text-sm ${trend ? trendColors[trend] : 'text-gray-500'}`}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}

// Progress Bar Component
interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
}

function ProgressBar({ label, value, max, color = 'blue' }: ProgressBarProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {value.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[color] || colors.blue} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

// Mini Chart Component
interface MiniChartProps {
  data: number[];
  height?: number;
  color?: string;
}

function MiniChart({ data, height = 40, color = '#3b82f6' }: MiniChartProps) {
  if (data.length === 0) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// Session Stats Component
interface SessionStatsProps {
  metrics: SessionMetrics | null;
}

function SessionStats({ metrics }: SessionStatsProps) {
  if (!metrics) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          No active session
        </p>
      </div>
    );
  }

  const duration = metrics.duration || (Date.now() - metrics.startTime);
  const durationStr = formatDuration(duration);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Current Session
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Duration" value={durationStr} />
        <MetricCard
          label="Translations"
          value={metrics.translationsCompleted}
          subValue={`of ${metrics.translationsStarted}`}
        />
        <MetricCard
          label="Success Rate"
          value={`${(metrics.translationSuccessRate * 100).toFixed(1)}%`}
        />
        <MetricCard
          label="Avg Latency"
          value={`${metrics.averageTranslationLatency.toFixed(0)}ms`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <ProgressBar
            label="Words Translated"
            value={metrics.totalWordsTranslated}
            max={1000}
            color="blue"
          />
          <ProgressBar
            label="Signs Displayed"
            value={metrics.totalSignsDisplayed}
            max={500}
            color="green"
          />
        </div>
        <div>
          <ProgressBar
            label="Frame Rate"
            value={metrics.averageFrameRate}
            max={60}
            color={metrics.averageFrameRate >= 30 ? 'green' : 'red'}
          />
          <ProgressBar
            label="Errors"
            value={metrics.errorCount}
            max={10}
            color={metrics.errorCount > 5 ? 'red' : 'yellow'}
          />
        </div>
      </div>
    </div>
  );
}

// Aggregated Stats Component
interface AggregatedStatsProps {
  analytics: AggregatedAnalytics | null;
  isLoading: boolean;
}

function AggregatedStats({ analytics, isLoading }: AggregatedStatsProps) {
  if (isLoading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          No analytics data available
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Overview ({analytics.period})
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Sessions" value={analytics.totalSessions} />
        <MetricCard
          label="Total Duration"
          value={formatDuration(analytics.totalDuration)}
        />
        <MetricCard
          label="Translations"
          value={analytics.totalTranslations}
        />
        <MetricCard
          label="Success Rate"
          value={`${(analytics.overallSuccessRate * 100).toFixed(1)}%`}
        />
      </div>

      {/* Top Errors */}
      {analytics.topErrors.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Top Errors
          </h4>
          <div className="space-y-2">
            {analytics.topErrors.map((error) => (
              <div
                key={error.type}
                className="flex justify-between text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded"
              >
                <span className="text-gray-700 dark:text-gray-300">{error.type}</span>
                <span className="text-red-600 dark:text-red-400">{error.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Usage */}
      {Object.keys(analytics.featureUsage).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Feature Usage
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(analytics.featureUsage)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([feature, count]) => (
                <div
                  key={feature}
                  className="flex justify-between text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded"
                >
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  <span className="text-blue-600 dark:text-blue-400">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Performance Chart Component
interface PerformanceChartProps {
  snapshots: PerformanceSnapshot[];
}

function PerformanceChart({ snapshots }: PerformanceChartProps) {
  const frameRates = useMemo(
    () => snapshots.slice(-30).map(s => s.frameRate),
    [snapshots]
  );

  const memoryUsage = useMemo(
    () => snapshots.slice(-30).map(s => s.memoryUsage * 100),
    [snapshots]
  );

  const currentFPS = snapshots.length > 0 ? snapshots[snapshots.length - 1].frameRate : 0;
  const avgFPS = frameRates.length > 0
    ? frameRates.reduce((a, b) => a + b, 0) / frameRates.length
    : 0;

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Performance
      </h3>

      <div className="grid grid-cols-2 gap-6">
        {/* Frame Rate */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Frame Rate</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {currentFPS} FPS
            </span>
          </div>
          <MiniChart data={frameRates} color={avgFPS >= 30 ? '#22c55e' : '#ef4444'} />
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Avg: {avgFPS.toFixed(1)} FPS
          </p>
        </div>

        {/* Memory */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {memoryUsage.length > 0 ? memoryUsage[memoryUsage.length - 1].toFixed(1) : 0}%
            </span>
          </div>
          <MiniChart data={memoryUsage} color="#f59e0b" />
        </div>
      </div>
    </div>
  );
}

// Helper function
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// Main Dashboard Component
interface AnalyticsDashboardProps {
  className?: string;
  compact?: boolean;
}

export function AnalyticsDashboard({
  className = '',
  compact = false,
}: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const sessionMetrics = useSessionMetrics(2000);
  const { analytics, isLoading } = useAggregatedAnalytics(period);
  const performanceSnapshots = usePerformanceTracking(1000);

  if (compact) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="FPS"
            value={performanceSnapshots.length > 0
              ? performanceSnapshots[performanceSnapshots.length - 1].frameRate
              : '--'
            }
          />
          <MetricCard
            label="Translations"
            value={sessionMetrics?.translationsCompleted || 0}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Analytics Dashboard
        </h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as typeof period)}
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="hour">Last Hour</option>
          <option value="day">Last 24 Hours</option>
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
        </select>
      </div>

      {/* Session Stats */}
      <SessionStats metrics={sessionMetrics} />

      {/* Performance */}
      <PerformanceChart snapshots={performanceSnapshots} />

      {/* Aggregated Analytics */}
      <AggregatedStats analytics={analytics} isLoading={isLoading} />
    </div>
  );
}

export default AnalyticsDashboard;
