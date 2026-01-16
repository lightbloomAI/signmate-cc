'use client';

import { useState, useCallback, useEffect } from 'react';
import { EventSetup } from '@/components/setup';
import { DemoMode } from '@/components/demo';
import { StageDisplay } from '@/components/display/StageDisplay';
import { ConfidenceMonitor } from '@/components/display/ConfidenceMonitor';
import { LivestreamOverlay } from '@/components/display/LivestreamOverlay';
import { useSignMateStore } from '@/store';
import { SignMatePipeline } from '@/lib/pipeline';
import type { EventConfig, TranscriptionSegment, ASLTranslation } from '@/types';

type AppMode = 'setup' | 'demo' | 'live';

export default function Home() {
  const [mode, setMode] = useState<AppMode>('setup');
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
    activeDisplayMode,
    setDemoMode,
    reset,
  } = useSignMateStore();

  // Handle event configuration complete
  const handleConfigComplete = useCallback(async (config: EventConfig) => {
    setCurrentEvent(config);

    // Initialize pipeline
    const newPipeline = new SignMatePipeline({
      useDeepgram: false, // Use Web Speech API for demo
      targetLatency: 500,
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
  }, [setCurrentEvent, setAvatarState, updatePipelineStatus]);

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
  }, [pipeline, reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pipeline?.stop();
    };
  }, [pipeline]);

  // Render based on current mode
  if (mode === 'demo') {
    return <DemoMode onExitDemo={handleExitDemo} />;
  }

  if (mode === 'live' && currentEvent) {
    const displayConfig = currentEvent.displays[0];

    return (
      <div style={{ minHeight: '100vh', background: '#0f0f0f', padding: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          padding: '12px 16px',
          background: '#1a1a1a',
          borderRadius: '8px'
        }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>
              {currentEvent.name}
            </h1>
            {currentEvent.venue && (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>{currentEvent.venue}</p>
            )}
          </div>
          <button
            onClick={handleExitLive}
            style={{
              padding: '8px 16px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            End Event
          </button>
        </div>

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
    );
  }

  // Setup mode (default)
  return (
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
  );
}
