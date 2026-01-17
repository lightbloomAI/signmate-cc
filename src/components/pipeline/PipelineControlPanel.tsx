'use client';

import React, { useState } from 'react';
import { useStreamingPipeline } from '@/hooks/useStreamingPipeline';
import type { PipelineState } from '@/lib/pipeline/streamingPipeline';

/**
 * Pipeline Control Panel
 *
 * Comprehensive control panel for the SignMate streaming pipeline
 */

interface PipelineControlPanelProps {
  compact?: boolean;
  showMetrics?: boolean;
  showTranscript?: boolean;
  onError?: (error: Error) => void;
}

export function PipelineControlPanel({
  compact = false,
  showMetrics = true,
  showTranscript = true,
  onError,
}: PipelineControlPanelProps) {
  const {
    state,
    status,
    metrics,
    isStreaming,
    isInitialized,
    isPaused,
    hasError,
    currentTranscript,
    interimTranscript,
    currentSigns,
    latency,
    errors,
    initialize,
    start,
    stop,
    pause,
    resume,
  } = useStreamingPipeline({
    onError: (error) => onError?.(error),
  });

  const [expanded, setExpanded] = useState(!compact);

  const getStateColor = (s: PipelineState): string => {
    switch (s) {
      case 'streaming':
        return 'text-green-400';
      case 'ready':
      case 'paused':
        return 'text-yellow-400';
      case 'initializing':
      case 'recovering':
        return 'text-blue-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBadge = (
    statusValue: 'idle' | 'active' | 'processing' | 'animating' | 'error'
  ): { color: string; label: string } => {
    switch (statusValue) {
      case 'active':
      case 'processing':
      case 'animating':
        return { color: 'bg-green-500', label: statusValue };
      case 'error':
        return { color: 'bg-red-500', label: 'error' };
      default:
        return { color: 'bg-gray-500', label: 'idle' };
    }
  };

  const handleStart = async () => {
    try {
      if (!isInitialized) {
        await initialize();
      }
      await start();
    } catch (error) {
      console.error('Failed to start pipeline:', error);
    }
  };

  const handleStop = async () => {
    try {
      await stop();
    } catch (error) {
      console.error('Failed to stop pipeline:', error);
    }
  };

  const formatDuration = (ms: number): string => {
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
  };

  if (compact && !expanded) {
    return (
      <div className="bg-gray-900 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isStreaming ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
            }`}
          />
          <span className={`font-medium ${getStateColor(state)}`}>
            {state.charAt(0).toUpperCase() + state.slice(1)}
          </span>
          {isStreaming && (
            <span className="text-sm text-gray-400">{latency}ms</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isStreaming ? (
            <button
              onClick={handleStart}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
            >
              Start
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
            >
              Stop
            </button>
          )}
          <button
            onClick={() => setExpanded(true)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isStreaming ? 'bg-green-500 animate-pulse' : hasError ? 'bg-red-500' : 'bg-gray-500'
            }`}
          />
          <h3 className="font-semibold text-white">SignMate Pipeline</h3>
          <span className={`text-sm font-medium ${getStateColor(state)}`}>
            {state.charAt(0).toUpperCase() + state.slice(1)}
          </span>
        </div>
        {compact && (
          <button
            onClick={() => setExpanded(false)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Controls */}
        <div className="flex gap-2">
          {!isStreaming ? (
            <button
              onClick={handleStart}
              disabled={state === 'initializing'}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
              {state === 'initializing' ? 'Initializing...' : 'Start Streaming'}
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  onClick={resume}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                  Resume
                </button>
              ) : (
                <button
                  onClick={pause}
                  className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
                  </svg>
                  Pause
                </button>
              )}
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.75 3A2.75 2.75 0 003 5.75v8.5A2.75 2.75 0 005.75 17h8.5A2.75 2.75 0 0017 14.25v-8.5A2.75 2.75 0 0014.25 3h-8.5z" />
                </svg>
                Stop
              </button>
            </>
          )}
        </div>

        {/* Pipeline Status */}
        <div className="grid grid-cols-4 gap-2">
          {(['audioCapture', 'speechRecognition', 'aslTranslation', 'avatarRendering'] as const).map(
            (stage) => {
              const badge = getStatusBadge(status[stage]);
              return (
                <div key={stage} className="bg-gray-800 rounded p-2 text-center">
                  <div className={`w-2 h-2 rounded-full ${badge.color} mx-auto mb-1`} />
                  <div className="text-xs text-gray-400 truncate">
                    {stage.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </div>
              );
            }
          )}
        </div>

        {/* Transcript Display */}
        {showTranscript && (currentTranscript || interimTranscript) && (
          <div className="bg-gray-800 rounded p-3">
            <div className="text-xs text-gray-400 mb-1">Transcript</div>
            <div className="text-white">
              {currentTranscript}
              {interimTranscript && (
                <span className="text-gray-400 italic"> {interimTranscript}</span>
              )}
            </div>
          </div>
        )}

        {/* Current Signs */}
        {currentSigns.length > 0 && (
          <div className="bg-gray-800 rounded p-3">
            <div className="text-xs text-gray-400 mb-2">Current Signs ({currentSigns.length})</div>
            <div className="flex flex-wrap gap-1">
              {currentSigns.map((sign, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-blue-600/30 text-blue-300 text-sm rounded"
                >
                  {sign.gloss}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metrics */}
        {showMetrics && metrics && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 font-medium">Performance Metrics</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-800 rounded p-2">
                <div className="text-lg font-bold text-white">{Math.round(latency)}</div>
                <div className="text-xs text-gray-400">Latency (ms)</div>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <div className="text-lg font-bold text-white">
                  {Math.round(metrics.averageEndToEndLatency)}
                </div>
                <div className="text-xs text-gray-400">Avg Latency</div>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <div className="text-lg font-bold text-white">
                  {formatDuration(metrics.streamingDuration)}
                </div>
                <div className="text-xs text-gray-400">Duration</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div className="text-center">
                <div className="text-white font-medium">{metrics.transcriptionsReceived}</div>
                <div className="text-xs text-gray-400">Transcripts</div>
              </div>
              <div className="text-center">
                <div className="text-white font-medium">{metrics.wordsTranscribed}</div>
                <div className="text-xs text-gray-400">Words</div>
              </div>
              <div className="text-center">
                <div className="text-white font-medium">{metrics.signsGenerated}</div>
                <div className="text-xs text-gray-400">Signs</div>
              </div>
              <div className="text-center">
                <div className={metrics.errorsCount > 0 ? 'text-red-400 font-medium' : 'text-white font-medium'}>
                  {metrics.errorsCount}
                </div>
                <div className="text-xs text-gray-400">Errors</div>
              </div>
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-900/30 border border-red-700 rounded p-3">
            <div className="text-xs text-red-400 font-medium mb-2">Recent Errors</div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {errors.slice(-3).map((error, i) => (
                <div key={i} className="text-sm text-red-300">
                  [{error.stage}] {error.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Minimal pipeline status indicator
 */
export function PipelineStatusIndicator() {
  const { state, isStreaming, latency, metrics } = useStreamingPipeline();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          isStreaming ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
        }`}
      />
      <span className="text-sm text-gray-300">
        {isStreaming ? `Streaming (${latency}ms)` : state}
      </span>
      {metrics && (
        <span className="text-xs text-gray-500">
          {metrics.signsGenerated} signs
        </span>
      )}
    </div>
  );
}
