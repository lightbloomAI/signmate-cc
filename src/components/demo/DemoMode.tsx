'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AvatarRenderer } from '@/components/avatar';
import type { AvatarConfig, AvatarState, ASLSign, TranscriptionSegment } from '@/types';
import { ASLTranslator } from '@/lib/asl';

interface DemoModeProps {
  onExitDemo: () => void;
}

// Pre-written demo scripts for sales presentations
const DEMO_SCRIPTS = [
  {
    name: 'Welcome Message',
    text: 'Hello and welcome to SignMate. Today we will show you how our real-time sign language interpreter works.',
  },
  {
    name: 'Feature Overview',
    text: 'SignMate provides instant translation from speech to American Sign Language with less than five hundred milliseconds of latency.',
  },
  {
    name: 'Event Setup',
    text: 'Our system is easy to set up. Just connect your audio source, configure your displays, and you are ready to go.',
  },
  {
    name: 'Accessibility Statement',
    text: 'We believe everyone deserves equal access to live events. SignMate helps make that possible.',
  },
  {
    name: 'Q&A Prompt',
    text: 'Do you have any questions about how SignMate can help your organization?',
  },
];

export function DemoMode({ onExitDemo }: DemoModeProps) {
  const [avatarConfig] = useState<AvatarConfig>({
    style: 'stylized',
    skinTone: '#E0B0A0',
    clothingColor: '#2563EB',
    showHands: true,
    showFace: true,
    showUpperBody: true,
  });

  const [avatarState, setAvatarState] = useState<AvatarState>({
    queue: [],
    isAnimating: false,
    expressionState: {
      eyebrows: 0,
      eyeOpenness: 1,
      mouthShape: 'neutral',
      headTilt: { x: 0, y: 0, z: 0 },
    },
  });

  const [currentText, setCurrentText] = useState('');
  const [inputText, setInputText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [signQueue, setSignQueue] = useState<ASLSign[]>([]);
  const [currentSignIndex, setCurrentSignIndex] = useState(0);
  const [selectedScript, setSelectedScript] = useState<number | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionSegment | null>(null);

  const translatorRef = useRef(new ASLTranslator());
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Handle sign completion
  const handleSignComplete = useCallback(() => {
    setCurrentSignIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex < signQueue.length) {
        setAvatarState((state) => ({
          ...state,
          currentSign: signQueue[nextIndex],
          isAnimating: true,
        }));
        return nextIndex;
      } else {
        setAvatarState((state) => ({
          ...state,
          currentSign: undefined,
          isAnimating: false,
        }));
        setIsPlaying(false);
        return 0;
      }
    });
  }, [signQueue]);

  // Play text through TTS and avatar
  const playText = useCallback(async (text: string) => {
    if (isPlaying) return;

    setCurrentText(text);
    setIsPlaying(true);

    // Translate text to ASL
    const translation = await translatorRef.current.translate(text);
    setSignQueue(translation.signs);
    setCurrentSignIndex(0);

    // Start avatar animation
    if (translation.signs.length > 0) {
      setAvatarState((state) => ({
        ...state,
        currentSign: translation.signs[0],
        isAnimating: true,
      }));
    }

    // Start text-to-speech
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          // Update transcription to show current word position
          const spokenText = text.substring(0, event.charIndex + event.charLength);
          setTranscription({
            id: 'demo-transcript',
            text: spokenText,
            startTime: Date.now(),
            endTime: Date.now(),
            confidence: 1,
            isFinal: false,
          });
        }
      };

      utterance.onend = () => {
        setTranscription({
          id: 'demo-transcript',
          text: text,
          startTime: Date.now(),
          endTime: Date.now(),
          confidence: 1,
          isFinal: true,
        });
      };

      speechSynthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, [isPlaying]);

  // Stop current playback
  const stopPlayback = useCallback(() => {
    if (speechSynthRef.current) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setAvatarState((state) => ({
      ...state,
      currentSign: undefined,
      isAnimating: false,
    }));
    setSignQueue([]);
    setCurrentSignIndex(0);
  }, []);

  // Handle custom text input
  const handleCustomText = useCallback(() => {
    if (inputText.trim()) {
      playText(inputText.trim());
      setInputText('');
    }
  }, [inputText, playText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  return (
    <div className="demo-mode">
      <style jsx>{`
        .demo-mode {
          min-height: 100vh;
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%);
          padding: 24px;
        }

        .demo-container {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
        }

        .main-display {
          background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .display-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .demo-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          border-radius: 20px;
        }

        .demo-badge span {
          color: white;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .exit-button {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .exit-button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .avatar-display {
          height: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .current-sign-label {
          position: absolute;
          top: 20px;
          right: 20px;
          padding: 8px 16px;
          background: rgba(37, 99, 235, 0.9);
          border-radius: 8px;
          color: white;
          font-size: 18px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .caption-display {
          padding: 24px;
          background: rgba(0, 0, 0, 0.4);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          min-height: 80px;
        }

        .caption-text {
          color: white;
          font-size: 20px;
          line-height: 1.5;
          text-align: center;
        }

        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .panel {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .panel-title {
          font-size: 14px;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 16px;
        }

        .scripts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .script-button {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .script-button:hover {
          border-color: #2563eb;
          background: #eff6ff;
        }

        .script-button.active {
          border-color: #2563eb;
          background: #eff6ff;
        }

        .script-button.playing {
          border-color: #22c55e;
          background: #f0fdf4;
        }

        .script-number {
          width: 28px;
          height: 28px;
          background: #e5e7eb;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: #374151;
        }

        .script-button.playing .script-number {
          background: #22c55e;
          color: white;
        }

        .script-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .custom-input-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .text-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;
          min-height: 80px;
        }

        .text-input:focus {
          outline: none;
          border-color: #2563eb;
        }

        .play-button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .play-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .play-button:disabled {
          background: #9ca3af;
          transform: none;
          box-shadow: none;
          cursor: not-allowed;
        }

        .stop-button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .status-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #2563eb;
        }

        .stat-label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .feature-icon {
          width: 32px;
          height: 32px;
          background: #eff6ff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .feature-text {
          font-size: 13px;
          color: #374151;
        }
      `}</style>

      <div className="demo-container">
        <div className="main-display">
          <div className="display-header">
            <div className="demo-badge">
              <span>Demo Mode</span>
            </div>
            <button className="exit-button" onClick={onExitDemo}>
              Exit Demo
            </button>
          </div>

          <div className="avatar-display">
            {avatarState.currentSign && (
              <div className="current-sign-label">{avatarState.currentSign.gloss}</div>
            )}
            <AvatarRenderer
              config={avatarConfig}
              state={avatarState}
              onSignComplete={handleSignComplete}
              className="w-full h-full"
            />
          </div>

          <div className="caption-display">
            <p className="caption-text">
              {transcription?.text || currentText || 'Select a script or enter custom text to begin the demo'}
            </p>
          </div>
        </div>

        <div className="sidebar">
          <div className="panel">
            <div className="panel-title">Demo Scripts</div>
            <div className="scripts-list">
              {DEMO_SCRIPTS.map((script, index) => (
                <button
                  key={index}
                  className={`script-button ${
                    selectedScript === index ? 'active' : ''
                  } ${isPlaying && selectedScript === index ? 'playing' : ''}`}
                  onClick={() => {
                    setSelectedScript(index);
                    playText(script.text);
                  }}
                  disabled={isPlaying}
                >
                  <span className="script-number">{index + 1}</span>
                  <span className="script-name">{script.name}</span>
                </button>
              ))}
            </div>

            <div className="custom-input-section">
              <div className="input-group">
                <textarea
                  className="text-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter custom text to demonstrate..."
                  disabled={isPlaying}
                />
                {isPlaying ? (
                  <button className="stop-button" onClick={stopPlayback}>
                    Stop
                  </button>
                ) : (
                  <button
                    className="play-button"
                    onClick={handleCustomText}
                    disabled={!inputText.trim()}
                  >
                    Play Custom Text
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">Live Statistics</div>
            <div className="status-panel">
              <div className="stat-item">
                <div className="stat-value">{signQueue.length}</div>
                <div className="stat-label">Signs Queued</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{currentSignIndex + 1}</div>
                <div className="stat-label">Current Sign</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">&lt;500</div>
                <div className="stat-label">Latency (ms)</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{isPlaying ? 'Active' : 'Ready'}</div>
                <div className="stat-label">Status</div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">Key Features</div>
            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">⚡</div>
                <span className="feature-text">Real-time translation under 500ms</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🎙️</div>
                <span className="feature-text">Multiple audio source support</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🎭</div>
                <span className="feature-text">Expressive 3D avatar animation</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📺</div>
                <span className="feature-text">Flexible display configurations</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
