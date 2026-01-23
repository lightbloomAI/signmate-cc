'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useStreamingPipeline } from '@/hooks/useStreamingPipeline';
import { useSignMateStore } from '@/store';
import { AvatarRenderer } from '@/components/avatar/AvatarRenderer';
import { PipelineControlPanel, PipelineStatusIndicator } from '@/components/pipeline';
import { ConnectionHealthMonitor, ConnectionIndicator } from '@/components/connection';
import { CaptionDisplay } from '@/components/captions/CaptionDisplay';
import { SignQueueDisplay } from '@/components/signs/SignQueueDisplay';
import type { ASLSign, TranscriptionSegment, PipelineError, AvatarState, ExpressionState } from '@/types';
import { getASLTranslator } from '@/lib/asl/translator';

/**
 * Interpreter Interface
 *
 * Main workspace for SignMate operators during live events.
 * Provides multiple views and controls for managing real-time interpretation.
 */

type ViewMode = 'operator' | 'stage' | 'monitor' | 'minimal';
type PanelId = 'pipeline' | 'avatar' | 'transcript' | 'signs' | 'connection' | 'metrics';

const defaultExpressionState: ExpressionState = {
  eyebrows: 0,
  eyeOpenness: 1,
  mouthShape: 'neutral',
  headTilt: { x: 0, y: 0, z: 0 },
};

interface InterpreterInterfaceProps {
  eventName?: string;
  onEndEvent?: () => void;
  initialView?: ViewMode;
}

export function InterpreterInterface({
  eventName = 'Live Event',
  onEndEvent,
  initialView = 'operator',
}: InterpreterInterfaceProps) {
  const {
    avatarConfig,
    avatarState,
    setAvatarState,
    pipelineStatus,
    updatePipelineStatus,
  } = useSignMateStore();

  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [expandedPanels, setExpandedPanels] = useState<Set<PanelId>>(
    () => new Set<PanelId>(['pipeline', 'avatar', 'transcript'])
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Update clock on client only
  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Pipeline hook
  const {
    state: pipelineState,
    isStreaming,
    currentTranscript,
    interimTranscript,
    currentSigns,
    latency,
    errors,
    metrics,
    start,
    stop,
    pause,
    resume,
  } = useStreamingPipeline({
    autoInitialize: true,
    onSigns: handleSigns,
    onError: handlePipelineError,
  });

  // Transcript history
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptionSegment[]>([]);

  // Handle incoming signs
  function handleSigns(signs: ASLSign[], text: string) {
    if (signs.length > 0) {
      setAvatarState({
        currentSign: signs[0],
        queue: signs.slice(1),
        isAnimating: true,
      });
    }

    // Add to transcript history
    const segment: TranscriptionSegment = {
      id: `seg-${Date.now()}`,
      text,
      startTime: Date.now(),
      endTime: Date.now(),
      confidence: 0.9,
      isFinal: true,
    };
    setTranscriptHistory((prev) => [...prev.slice(-50), segment]);
  }

  // Handle pipeline errors
  function handlePipelineError(error: Error, stage: PipelineError['stage'], recoverable: boolean) {
    console.error(`[Interpreter] Pipeline error in ${stage}:`, error);
    // Could show toast notification here
  }

  // Demo mode - test avatar without speech recognition
  async function runDemo() {
    const translator = getASLTranslator();
    const phrases = [
      'Hello',
      'Thank you',
      'How are you',
      'Good morning',
      'Welcome',
    ];

    for (const phrase of phrases) {
      const translation = await translator.translate(phrase);
      // Slow down each sign for better visibility
      const slowedSigns = translation.signs.map(sign => ({
        ...sign,
        duration: Math.max(sign.duration * 2, 1200), // At least 1.2 seconds per sign
      }));
      handleSigns(slowedSigns, phrase);
      // Wait for signs to animate before next phrase (longer pause)
      await new Promise(resolve => setTimeout(resolve, slowedSigns.length * 1500 + 800));
    }
  }

  // Handle sign animation complete
  const handleSignComplete = useCallback(() => {
    const { queue } = avatarState;
    if (queue.length > 0) {
      setAvatarState({
        currentSign: queue[0],
        queue: queue.slice(1),
        isAnimating: true,
      });
    } else {
      setAvatarState({
        currentSign: undefined,
        isAnimating: false,
      });
    }
  }, [avatarState, setAvatarState]);

  // Compute avatar state for renderer
  const computedAvatarState = useMemo<AvatarState>(() => ({
    currentSign: avatarState.currentSign,
    queue: avatarState.queue,
    isAnimating: avatarState.isAnimating,
    expressionState: avatarState.expressionState || defaultExpressionState,
  }), [avatarState]);

  // Create current transcription segment for caption display
  const currentSegment = useMemo<TranscriptionSegment | undefined>(() => {
    if (!currentTranscript && !interimTranscript) return undefined;
    return {
      id: `current-${Date.now()}`,
      text: currentTranscript || interimTranscript,
      startTime: Date.now() - 100,
      endTime: Date.now(),
      confidence: 0.9,
      isFinal: !!currentTranscript && !interimTranscript,
    };
  }, [currentTranscript, interimTranscript]);

  // Toggle panel expansion
  const togglePanel = (panelId: PanelId) => {
    setExpandedPanels((prev) => {
      const next = new Set(prev);
      if (next.has(panelId)) {
        next.delete(panelId);
      } else {
        next.add(panelId);
      }
      return next;
    });
  };

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + key shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case ' ':
            e.preventDefault();
            if (isStreaming) {
              pause();
            } else {
              start();
            }
            break;
          case 'f':
            e.preventDefault();
            toggleFullscreen();
            break;
          case '1':
            e.preventDefault();
            setViewMode('operator');
            break;
          case '2':
            e.preventDefault();
            setViewMode('stage');
            break;
          case '3':
            e.preventDefault();
            setViewMode('monitor');
            break;
          case '4':
            e.preventDefault();
            setViewMode('minimal');
            break;
        }
      }

      // Escape to exit fullscreen or stop
      if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming, isFullscreen, start, pause, toggleFullscreen]);

  // Get full transcript
  const fullTranscript = useMemo(() => {
    const history = transcriptHistory.map(s => s.text).join(' ');
    const current = currentTranscript;
    const interim = interimTranscript;
    return `${history} ${current}${interim ? ' ' + interim : ''}`.trim();
  }, [transcriptHistory, currentTranscript, interimTranscript]);

  // Render header
  const renderHeader = () => (
    <header className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-white">SignMate</h1>
        <span className="text-gray-400">|</span>
        <span className="text-gray-300">{eventName}</span>
        <ConnectionIndicator />
      </div>

      <div className="flex items-center gap-3">
        {/* View Mode Selector */}
        <div className="flex bg-gray-800 rounded-lg p-0.5">
          {(['operator', 'stage', 'monitor', 'minimal'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Actions */}
        <button
          onClick={toggleFullscreen}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title={isFullscreen ? 'Exit Fullscreen (Ctrl+F)' : 'Fullscreen (Ctrl+F)'}
        >
          {isFullscreen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v5m0-5h5m6 6l5 5m0 0v-5m0 5h-5M9 15l-5 5m0 0h5m-5 0v-5m15-5l-5-5m0 0h5m-5 0v5" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>

        <button
          onClick={runDemo}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded transition-colors"
          title="Run demo animation"
        >
          Demo
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {onEndEvent && (
          <button
            onClick={onEndEvent}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
          >
            End Event
          </button>
        )}
      </div>
    </header>
  );

  // Render status bar
  const renderStatusBar = () => (
    <footer className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-4">
        <PipelineStatusIndicator />
        <span className="text-gray-500">|</span>
        <span className="text-gray-400">
          {metrics?.signsGenerated || 0} signs generated
        </span>
        <span className="text-gray-500">|</span>
        <span className="text-gray-400">
          {transcriptHistory.length} segments
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-gray-400">
          Latency: <span className={latency > 500 ? 'text-yellow-400' : 'text-green-400'}>{latency}ms</span>
        </span>
        <span className="text-gray-400">
          {currentTime}
        </span>
      </div>
    </footer>
  );

  // Render operator view (full controls)
  const renderOperatorView = () => (
    <div className="flex-1 flex gap-4 p-4 overflow-hidden">
      {/* Left Panel - Pipeline Controls & Connection */}
      <div className="w-80 flex-shrink-0 space-y-4 overflow-y-auto">
        <PipelineControlPanel showMetrics={true} showTranscript={false} />
        <ConnectionHealthMonitor compact={!expandedPanels.has('connection')} />
      </div>

      {/* Center - Avatar Display */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden relative">
          <AvatarRenderer
            config={avatarConfig}
            state={computedAvatarState}
            onSignComplete={handleSignComplete}
          />

          {/* Overlay info */}
          <div className="absolute bottom-4 left-4 right-4">
            <CaptionDisplay
              currentSegment={currentSegment}
              recentSegments={transcriptHistory}
            />
          </div>
        </div>

        {/* Sign Queue */}
        <div className="mt-4">
          <SignQueueDisplay />
        </div>
      </div>

      {/* Right Panel - Transcript History */}
      <div className="w-80 flex-shrink-0 bg-gray-900 rounded-lg p-4 overflow-hidden flex flex-col">
        <h3 className="text-sm font-semibold text-white mb-3">Transcript History</h3>
        <div className="flex-1 overflow-y-auto space-y-2">
          {transcriptHistory.slice(-20).map((segment, i) => (
            <div
              key={segment.id || i}
              className="text-sm text-gray-300 p-2 bg-gray-800 rounded"
            >
              {segment.text}
            </div>
          ))}
          {interimTranscript && (
            <div className="text-sm text-gray-500 italic p-2 bg-gray-800/50 rounded">
              {interimTranscript}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render stage view (avatar focused)
  const renderStageView = () => (
    <div className="flex-1 relative bg-black">
      <AvatarRenderer
        config={avatarConfig}
        state={computedAvatarState}
        onSignComplete={handleSignComplete}
      />

      {/* Caption overlay */}
      <div className="absolute bottom-8 left-8 right-8">
        <CaptionDisplay
          currentSegment={currentSegment}
          recentSegments={transcriptHistory}
          fontSize={32}
        />
      </div>

      {/* Mini controls overlay */}
      <div className="absolute top-4 right-4">
        <div className="bg-gray-900/80 backdrop-blur rounded-lg p-2 flex items-center gap-2">
          {!isStreaming ? (
            <button
              onClick={() => start()}
              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => stop()}
              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.75 3A2.75 2.75 0 003 5.75v8.5A2.75 2.75 0 005.75 17h8.5A2.75 2.75 0 0017 14.25v-8.5A2.75 2.75 0 0014.25 3h-8.5z" />
              </svg>
            </button>
          )}
          <ConnectionIndicator />
        </div>
      </div>
    </div>
  );

  // Render monitor view (metrics focused)
  const renderMonitorView = () => (
    <div className="flex-1 grid grid-cols-2 gap-4 p-4">
      {/* Avatar */}
      <div className="bg-gray-900 rounded-lg overflow-hidden relative">
        <AvatarRenderer
          config={avatarConfig}
          state={computedAvatarState}
          onSignComplete={handleSignComplete}
        />
        <div className="absolute bottom-4 left-4 right-4">
          <CaptionDisplay
            currentSegment={currentSegment}
            recentSegments={transcriptHistory}
          />
        </div>
      </div>

      {/* Metrics & Controls */}
      <div className="space-y-4 overflow-y-auto">
        <PipelineControlPanel showMetrics={true} showTranscript={true} />
        <ConnectionHealthMonitor showDetails={true} />

        {/* Error Log */}
        {errors.length > 0 && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-red-400 mb-2">Recent Errors</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {errors.map((err, i) => (
                <div key={i} className="text-xs text-red-300">
                  [{err.stage}] {err.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render minimal view (just avatar and caption)
  const renderMinimalView = () => (
    <div className="flex-1 relative bg-black">
      <AvatarRenderer
        config={avatarConfig}
        state={computedAvatarState}
        onSignComplete={handleSignComplete}
      />

      <div className="absolute bottom-4 left-4 right-4">
        <CaptionDisplay
          currentSegment={currentSegment}
          recentSegments={transcriptHistory}
        />
      </div>

      {/* Minimal status */}
      <div className="absolute top-4 left-4">
        <div
          className={`w-3 h-3 rounded-full ${
            isStreaming ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
          }`}
        />
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-950 flex flex-col text-white">
      {viewMode !== 'minimal' && renderHeader()}

      {viewMode === 'operator' && renderOperatorView()}
      {viewMode === 'stage' && renderStageView()}
      {viewMode === 'monitor' && renderMonitorView()}
      {viewMode === 'minimal' && renderMinimalView()}

      {viewMode !== 'minimal' && viewMode !== 'stage' && renderStatusBar()}
    </div>
  );
}

/**
 * Simplified stage display component
 */
export function InterpreterStageDisplay() {
  return <InterpreterInterface initialView="stage" />;
}

/**
 * Simplified minimal display component
 */
export function InterpreterMinimalDisplay() {
  return <InterpreterInterface initialView="minimal" />;
}
