'use client';

import React, { useState, useEffect } from 'react';
import { useConnectionHealth, useConnectionManager } from '@/lib/websocket';
import type { ConnectionMetrics } from '@/lib/websocket';

/**
 * Connection Health Monitor Component
 *
 * Displays real-time connection health metrics and quality indicators
 */

interface ConnectionHealthMonitorProps {
  compact?: boolean;
  showDetails?: boolean;
  onQualityChange?: (quality: ConnectionMetrics['connectionQuality']) => void;
}

export function ConnectionHealthMonitor({
  compact = false,
  showDetails = true,
  onQualityChange,
}: ConnectionHealthMonitorProps) {
  const health = useConnectionHealth();
  const { connectionState, connect, disconnect } = useConnectionManager();
  const [prevQuality, setPrevQuality] = useState(health.quality);

  useEffect(() => {
    if (health.quality !== prevQuality) {
      setPrevQuality(health.quality);
      onQualityChange?.(health.quality);
    }
  }, [health.quality, prevQuality, onQualityChange]);

  const getQualityColor = (quality: ConnectionMetrics['connectionQuality']) => {
    switch (quality) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-green-400';
      case 'fair':
        return 'bg-yellow-400';
      case 'poor':
        return 'bg-orange-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
      case 'reconnecting':
        return 'text-yellow-600';
      case 'disconnected':
        return 'text-gray-500';
      case 'error':
        return 'text-red-600';
      case 'suspended':
        return 'text-blue-500';
      default:
        return 'text-gray-400';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(0)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50">
        <div
          className={`w-2 h-2 rounded-full ${getQualityColor(health.quality)} ${
            health.isConnected ? 'animate-pulse' : ''
          }`}
        />
        <span className={`text-xs font-medium ${getStateColor(connectionState)}`}>
          {connectionState}
        </span>
        {health.isConnected && (
          <span className="text-xs text-gray-400">{health.latency}ms</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Connection Health</h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${getQualityColor(health.quality)} ${
              health.isConnected ? 'animate-pulse' : ''
            }`}
          />
          <span className={`text-sm font-medium capitalize ${getStateColor(connectionState)}`}>
            {connectionState}
          </span>
        </div>
      </div>

      {/* Quality Indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Connection Quality</span>
          <span className="capitalize">{health.quality}</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getQualityColor(health.quality)}`}
            style={{
              width:
                health.quality === 'excellent'
                  ? '100%'
                  : health.quality === 'good'
                  ? '80%'
                  : health.quality === 'fair'
                  ? '60%'
                  : health.quality === 'poor'
                  ? '40%'
                  : '20%',
            }}
          />
        </div>
      </div>

      {showDetails && (
        <>
          {/* Latency Stats */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-gray-800 rounded p-2">
              <div className="text-lg font-bold text-white">{Math.round(health.latency)}</div>
              <div className="text-xs text-gray-400">Latency (ms)</div>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <div className="text-lg font-bold text-white">{Math.round(health.averageLatency)}</div>
              <div className="text-xs text-gray-400">Avg (ms)</div>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <div className="text-lg font-bold text-white">{Math.round(health.jitter)}</div>
              <div className="text-xs text-gray-400">Jitter (ms)</div>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <div className="text-lg font-bold text-white">{health.packetLoss.toFixed(1)}%</div>
              <div className="text-xs text-gray-400">Packet Loss</div>
            </div>
          </div>

          {/* Connection Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Messages In</span>
                <span className="text-white">{health.messagesReceived}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Messages Out</span>
                <span className="text-white">{health.messagesSent}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Data In</span>
                <span className="text-white">{formatBytes(health.bytesReceived)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Data Out</span>
                <span className="text-white">{formatBytes(health.bytesSent)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Duration</span>
                <span className="text-white">{formatDuration(health.connectionDuration)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Reconnects</span>
                <span className="text-white">{health.reconnectCount}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Missed HBs</span>
                <span className={health.missedHeartbeats > 0 ? 'text-yellow-400' : 'text-white'}>
                  {health.missedHeartbeats}
                </span>
              </div>
            </div>
          </div>

          {/* Connection Controls */}
          <div className="flex gap-2 pt-2">
            {!health.isConnected ? (
              <button
                onClick={connect}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
              >
                Connect
              </button>
            ) : (
              <button
                onClick={disconnect}
                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Mini connection indicator for headers/status bars
 */
export function ConnectionIndicator() {
  const health = useConnectionHealth();

  const getColor = () => {
    if (!health.isConnected) return 'bg-gray-400';
    switch (health.quality) {
      case 'excellent':
      case 'good':
        return 'bg-green-500';
      case 'fair':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-orange-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${getColor()} ${health.isConnected ? 'animate-pulse' : ''}`} />
      {health.isConnected && <span className="text-xs text-gray-400">{health.latency}ms</span>}
    </div>
  );
}

/**
 * Connection quality badge for display
 */
export function ConnectionQualityBadge() {
  const health = useConnectionHealth();

  const getBadgeStyle = () => {
    switch (health.quality) {
      case 'excellent':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'good':
        return 'bg-green-500/10 text-green-300 border-green-500/20';
      case 'fair':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'poor':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (!health.isConnected) {
    return (
      <div className="px-2 py-1 text-xs font-medium rounded border bg-gray-500/20 text-gray-400 border-gray-500/30">
        Disconnected
      </div>
    );
  }

  return (
    <div className={`px-2 py-1 text-xs font-medium rounded border capitalize ${getBadgeStyle()}`}>
      {health.quality} ({health.latency}ms)
    </div>
  );
}
