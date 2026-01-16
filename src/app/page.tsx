'use client';

import { useState, useCallback, useEffect } from 'react';
import { EventSetup } from '@/components/setup';
import { DemoMode } from '@/components/demo';
import { StageDisplay } from '@/components/display/StageDisplay';
import { ConfidenceMonitor } from '@/components/display/ConfidenceMonitor';
import { LivestreamOverlay } from '@/components/display/LivestreamOverlay';
import { AppShell } from '@/components/layout';
import { WelcomeScreen } from '@/components/welcome';
import { ErrorBoundary } from '@/components/error';
import { useSignMateStore } from '@/store';
import { SignMatePipeline } from '@/lib/pipeline';
import { getSettings } from '@/lib/config/settings';
import type { EventConfig, TranscriptionSegment, ASLTranslation } from '@/types';

type AppMode = 'welcome' | 'setup' | 'demo' | 'live';

export default function Home() {
  const settings = getSettings();
  const [mode, setMode] = useState<AppMode>(
    settings.general.showWelcomeScreen ? 'welcome' : 'setup'
  );
  const [pipeline, setPipeline] = useState<SignMatePipeline | null>(null);
  const [currentTranscription, setCurrentTranscription] = useState<TranscriptionSegment | undefined>();
  const [recentTranscriptions, setRecentTranscriptions] = useState<TranscriptionSegment[]>([]);

  const {
    currentEvent,
    setCurrentEvent,
    avatarConfig,
    avatarState,
    setAvatarState,
    pipelineStatus,
    updatePipelineStatus,
    setDemoMode,
    reset,
  } = useSignMateStore();

  // Handle event configuration complete
  const handleConfigComplete = useCallback(async (config: EventConfig) => {
    setCurrentEvent(config);

    // Initialize pipeline
    const newPipeline = new SignMatePipeline({
      useDeepgram: settings.speech.provider === 'deepgram',
      targetLatency: settings.performance.targetLatency,
      batchTranslation: true,
      batchDelay: 150,
    });

    setPipeline(newPipeline);

    // Start the pipeline with the selected audio source
    if (config.audioSources.length > 0) {
      try {
        await newPipeline.start(config.audioSources[0], {
          onTranscription: (segment: TranscriptionSegment) => {
            setCurrentTranscription(segment);
            if (segment.isFinal) {
              setRecentTranscriptions((prev) => [...prev.slice(-10), segment]);
            }
          },
          onTranslation: (translation: ASLTranslation) => {
            // Queue signs for avatar
            if (translation.signs.length > 0) {
              setAvatarState({
                currentSign: translation.signs[0],
                queue: translation.signs.slice(1),
                isAnimating: true,
              });
            }
          },
          onStatus: (status) => {
            updatePipelineStatus(status);
          },
          onError: (error) => {
            console.error('Pipeline error:', error);
          },
        });

        setMode('live');
      } catch (error) {
        console.error('Failed to start pipeline:', error);
      }
    }
  }, [setCurrentEvent, setAvatarState, updatePipelineStatus, settings]);

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

  // Handle entering demo mode
  const handleStartDemo = useCallback(() => {
    setDemoMode(true);
    setMode('demo');
  }, [setDemoMode]);

  // Handle exiting demo mode
  const handleExitDemo = useCallback(() => {
    setDemoMode(false);
    setMode('setup');
    reset();
  }, [setDemoMode, reset]);

  // Handle exiting live mode
  const handleExitLive = useCallback(async () => {
    if (pipeline) {
      await pipeline.stop();
      setPipeline(null);
    }
    setMode('setup');
    reset();
    setCurrentTranscription(undefined);
    setRecentTranscriptions([]);
  }, [pipeline, reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pipeline?.stop();
    };
  }, [pipeline]);

  // Welcome screen
  if (mode === 'welcome') {
    return (
      <ErrorBoundary>
        <WelcomeScreen
          onStartSetup={() => setMode('setup')}
          onStartDemo={handleStartDemo}
          showHealthCheck={true}
        />
      </ErrorBoundary>
    );
  }

  // Demo mode
  if (mode === 'demo') {
    return (
      <ErrorBoundary>
        <DemoMode onExitDemo={handleExitDemo} />
      </ErrorBoundary>
    );
  }

  // Live mode with event
  if (mode === 'live' && currentEvent) {
    const displayConfig = currentEvent.displays[0];

    return (
      <ErrorBoundary>
        <AppShell
          showHeader={true}
          showStatusBar={true}
          eventName={currentEvent.name}
          onEndEvent={handleExitLive}
        >
          <div style={{ padding: '16px', height: 'calc(100vh - 120px)' }}>
            {displayConfig?.mode === 'stage' && (
              <StageDisplay
                avatarConfig={avatarConfig}
                avatarState={avatarState}
                transcription={currentTranscription}
                showCaptions={displayConfig.showCaptions}
                onSignComplete={handleSignComplete}
              />
            )}

            {displayConfig?.mode === 'confidence-monitor' && (
              <ConfidenceMonitor
                avatarConfig={avatarConfig}
                avatarState={avatarState}
                transcription={currentTranscription}
                pipelineStatus={pipelineStatus}
                recentTranscriptions={recentTranscriptions}
                onSignComplete={handleSignComplete}
              />
            )}

            {displayConfig?.mode === 'livestream-overlay' && (
              <LivestreamOverlay
                avatarConfig={avatarConfig}
                avatarState={avatarState}
                transcription={currentTranscription}
                showCaptions={displayConfig.showCaptions}
                position="bottom-right"
                size={displayConfig.avatarSize === 'small' ? 'small' : displayConfig.avatarSize === 'large' ? 'large' : 'medium'}
                onSignComplete={handleSignComplete}
              />
            )}
          </div>
        </AppShell>
      </ErrorBoundary>
    );
  }

  // Setup mode (default)
  return (
    <ErrorBoundary>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '40px 20px'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{
              color: 'white',
              fontSize: '48px',
              fontWeight: 800,
              marginBottom: '12px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
            }}>
              SignMate
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: '20px',
              fontWeight: 500
            }}>
              Real-time AI Sign Language Interpreter for Live Events
            </p>
          </div>

          <EventSetup
            onConfigComplete={handleConfigComplete}
            onStartDemo={handleStartDemo}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
