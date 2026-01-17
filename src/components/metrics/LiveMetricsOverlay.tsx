'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePipelineMetrics } from '@/hooks/useStreamingPipeline';
import { useConnectionHealthSafe } from '@/lib/websocket';

/**
 * Live Metrics Overlay
 *
 * Real-time performance metrics display for monitoring during live events.
 * Shows latency graphs, throughput, and system health indicators.
 */

interface MetricDataPoint {
  timestamp: number;
  value: number;
}

interface LiveMetricsOverlayProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  initiallyExpanded?: boolean;
  showChart?: boolean;
  maxDataPoints?: number;
  updateInterval?: number;
  alertThresholds?: {
    latency?: number;
    errors?: number;
  };
  onAlert?: (type: string, message: string) => void;
}

export function LiveMetricsOverlay({
  position = 'top-right',
  initiallyExpanded = false,
  showChart = true,
  maxDataPoints = 60,
  updateInterval = 1000,
  alertThresholds = { latency: 500, errors: 3 },
  onAlert,
}: LiveMetricsOverlayProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const pipelineMetrics = usePipelineMetrics();
  const connectionHealth = useConnectionHealthSafe();

  // Historical data for charts
  const [latencyHistory, setLatencyHistory] = useState<MetricDataPoint[]>([]);
  const [throughputHistory, setThroughputHistory] = useState<MetricDataPoint[]>([]);

  const lastTranscriptCount = useRef(0);
  const lastSignCount = useRef(0);
  const lastAlertTime = useRef(0);

  // Update history data
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      // Add latency data point
      setLatencyHistory((prev) => {
        const newPoint = { timestamp: now, value: pipelineMetrics.latency };
        const updated = [...prev, newPoint];
        return updated.slice(-maxDataPoints);
      });

      // Calculate throughput (signs per second)
      const signsPerSecond =
        (pipelineMetrics.signsGenerated - lastSignCount.current) / (updateInterval / 1000);
      lastSignCount.current = pipelineMetrics.signsGenerated;

      setThroughputHistory((prev) => {
        const newPoint = { timestamp: now, value: Math.max(0, signsPerSecond) };
        const updated = [...prev, newPoint];
        return updated.slice(-maxDataPoints);
      });

      // Check for alerts
      if (now - lastAlertTime.current > 5000) {
        if (
          alertThresholds.latency &&
          pipelineMetrics.latency > alertThresholds.latency
        ) {
          onAlert?.('latency', `High latency detected: ${pipelineMetrics.latency}ms`);
          lastAlertTime.current = now;
        }

        if (
          alertThresholds.errors &&
          pipelineMetrics.errorsCount > alertThresholds.errors
        ) {
          onAlert?.('errors', `Error count exceeded threshold: ${pipelineMetrics.errorsCount}`);
          lastAlertTime.current = now;
        }
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [pipelineMetrics, maxDataPoints, updateInterval, alertThresholds, onAlert]);

  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  // Health indicators
  const getHealthColor = (value: number, thresholds: { good: number; warn: number }) => {
    if (value <= thresholds.good) return 'text-green-400';
    if (value <= thresholds.warn) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthBg = (value: number, thresholds: { good: number; warn: number }) => {
    if (value <= thresholds.good) return 'bg-green-500';
    if (value <= thresholds.warn) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Mini chart renderer
  const MiniChart = ({
    data,
    color,
    height = 40,
    showArea = true,
  }: {
    data: MetricDataPoint[];
    color: string;
    height?: number;
    showArea?: boolean;
  }) => {
    if (data.length < 2) {
      return (
        <div className="flex items-center justify-center h-10 text-gray-500 text-xs">
          Collecting data...
        </div>
      );
    }

    const maxValue = Math.max(...data.map((d) => d.value), 1);
    const minValue = Math.min(...data.map((d) => d.value));
    const range = maxValue - minValue || 1;

    const points = data.map((point, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((point.value - minValue) / range) * 100;
      return `${x},${y}`;
    });

    const pathD = `M ${points.join(' L ')}`;
    const areaD = `M 0,100 L ${points.join(' L ')} L 100,100 Z`;

    return (
      <svg
        viewBox="0 0 100 100"
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        {showArea && (
          <path d={areaD} fill={color} fillOpacity="0.2" />
        )}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  // Compact view
  const renderCompact = () => (
    <div
      className="bg-gray-900/90 backdrop-blur rounded-lg p-3 cursor-pointer hover:bg-gray-900 transition-colors"
      onClick={() => setIsExpanded(true)}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full ${
            pipelineMetrics.isHealthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}
        />
        <span className="text-sm font-medium text-white">
          {pipelineMetrics.latency}ms
        </span>
        <span className="text-xs text-gray-400">
          {pipelineMetrics.signsGenerated} signs
        </span>
      </div>
    </div>
  );

  // Expanded view
  const renderExpanded = () => (
    <div className="bg-gray-900/95 backdrop-blur rounded-lg shadow-2xl border border-gray-700 w-80">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              pipelineMetrics.isHealthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <h3 className="text-sm font-semibold text-white">Live Metrics</h3>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Primary Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800 rounded p-2 text-center">
            <div className={`text-xl font-bold ${getHealthColor(pipelineMetrics.latency, { good: 200, warn: 500 })}`}>
              {Math.round(pipelineMetrics.latency)}
            </div>
            <div className="text-xs text-gray-400">Latency (ms)</div>
          </div>
          <div className="bg-gray-800 rounded p-2 text-center">
            <div className="text-xl font-bold text-white">
              {Math.round(pipelineMetrics.averageLatency)}
            </div>
            <div className="text-xs text-gray-400">Avg (ms)</div>
          </div>
          <div className="bg-gray-800 rounded p-2 text-center">
            <div className={`text-xl font-bold ${pipelineMetrics.errorsCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {pipelineMetrics.errorsCount}
            </div>
            <div className="text-xs text-gray-400">Errors</div>
          </div>
        </div>

        {/* Latency Chart */}
        {showChart && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">Latency</span>
              <span className="text-xs text-gray-500">
                {latencyHistory.length > 0 ? `${Math.round(latencyHistory[latencyHistory.length - 1]?.value || 0)}ms` : ''}
              </span>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <MiniChart data={latencyHistory} color="#60a5fa" />
            </div>
          </div>
        )}

        {/* Throughput Chart */}
        {showChart && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">Throughput (signs/s)</span>
              <span className="text-xs text-gray-500">
                {throughputHistory.length > 0 ? throughputHistory[throughputHistory.length - 1]?.value.toFixed(1) : '0'}
              </span>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <MiniChart data={throughputHistory} color="#34d399" />
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Transcripts</span>
            <span className="text-white">{pipelineMetrics.transcriptionsCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Signs</span>
            <span className="text-white">{pipelineMetrics.signsGenerated}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Translations</span>
            <span className="text-white">{pipelineMetrics.translationsCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Uptime</span>
            <span className="text-white">{formatDuration(pipelineMetrics.uptime)}</span>
          </div>
        </div>

        {/* Connection Health (if available) */}
        {connectionHealth && (
          <div className="pt-2 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Connection</span>
              <div className="flex items-center gap-2">
                <span className={`capitalize ${connectionHealth.isConnected ? 'text-green-400' : 'text-gray-400'}`}>
                  {connectionHealth.state}
                </span>
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionHealth.isConnected ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                />
              </div>
            </div>
            {connectionHealth.isConnected && (
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="text-gray-500">
                  Quality: <span className="text-white capitalize">{connectionHealth.quality}</span>
                </span>
                <span className="text-gray-500">
                  WS Latency: <span className="text-white">{connectionHealth.latency}ms</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getHealthBg(pipelineMetrics.latency, { good: 200, warn: 500 })}`} />
            <span className="text-xs text-gray-400">
              {pipelineMetrics.isHealthy ? 'System healthy' : 'System degraded'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {formatDuration(pipelineMetrics.streamingDuration)}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50`}
      style={isDragging ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined}
    >
      {isExpanded ? renderExpanded() : renderCompact()}
    </div>
  );
}

// Utility function for formatting duration
function formatDuration(ms: number): string {
  if (ms < 1000) return '0s';
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

/**
 * Floating metrics badge for minimal display
 */
export function MetricsBadge() {
  const { latency, isHealthy, state } = usePipelineMetrics();

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900/80 backdrop-blur rounded-full">
      <div
        className={`w-2 h-2 rounded-full ${
          isHealthy ? 'bg-green-500' : 'bg-red-500'
        } ${state === 'streaming' ? 'animate-pulse' : ''}`}
      />
      <span className="text-sm font-medium text-white">
        {latency > 0 ? `${Math.round(latency)}ms` : state}
      </span>
    </div>
  );
}

/**
 * Performance alert banner
 */
export function PerformanceAlertBanner({
  threshold = 500,
  onDismiss,
}: {
  threshold?: number;
  onDismiss?: () => void;
}) {
  const { latency, errorsCount, isHealthy } = usePipelineMetrics();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || (latency < threshold && errorsCount === 0)) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
        <div>
          <span className="text-yellow-400 font-medium">Performance Warning</span>
          <span className="text-yellow-300/80 ml-2">
            {latency >= threshold && `High latency: ${Math.round(latency)}ms`}
            {latency >= threshold && errorsCount > 0 && ' | '}
            {errorsCount > 0 && `${errorsCount} errors detected`}
          </span>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="text-yellow-400 hover:text-yellow-300 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
