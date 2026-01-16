'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  AudioSource,
  AudioSourceType,
  DisplayConfig,
  DisplayMode,
  AvatarConfig,
  EventConfig,
} from '@/types';
import { AudioCapture } from '@/lib/audio';

interface EventSetupProps {
  onConfigComplete: (config: EventConfig) => void;
  onStartDemo: () => void;
  initialConfig?: Partial<EventConfig>;
}

export function EventSetup({
  onConfigComplete,
  onStartDemo,
  initialConfig,
}: EventSetupProps) {
  const [eventName, setEventName] = useState(initialConfig?.name || '');
  const [venue, setVenue] = useState(initialConfig?.venue || '');
  const [audioSources, setAudioSources] = useState<AudioSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [displays, setDisplays] = useState<DisplayConfig[]>(
    initialConfig?.displays || []
  );
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(
    initialConfig?.avatarConfig || {
      style: 'stylized',
      skinTone: '#E0B0A0',
      clothingColor: '#2563EB',
      showHands: true,
      showFace: true,
      showUpperBody: true,
    }
  );
  const [streamUrl, setStreamUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'audio' | 'display' | 'avatar'>('audio');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available audio devices
  useEffect(() => {
    const loadDevices = async () => {
      setIsLoading(true);
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await AudioCapture.getAvailableDevices();
        setAudioSources(devices);
      } catch (err) {
        setError('Unable to access audio devices. Please grant microphone permissions.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDevices();
  }, []);

  const addStreamSource = useCallback(() => {
    if (!streamUrl.trim()) return;

    const newSource: AudioSource = {
      id: `stream-${Date.now()}`,
      type: 'stream' as AudioSourceType,
      name: `Stream: ${streamUrl.substring(0, 30)}...`,
      streamUrl: streamUrl.trim(),
      isActive: false,
    };

    setAudioSources((prev) => [...prev, newSource]);
    setStreamUrl('');
  }, [streamUrl]);

  const addDisplay = useCallback((mode: DisplayMode) => {
    const newDisplay: DisplayConfig = {
      mode,
      width: mode === 'livestream-overlay' ? 300 : 1920,
      height: mode === 'livestream-overlay' ? 375 : 1080,
      position: { x: 0, y: 0 },
      backgroundColor: '#1a1a2e',
      showCaptions: true,
      captionPosition: 'bottom',
      avatarSize: mode === 'livestream-overlay' ? 'medium' : 'large',
    };

    setDisplays((prev) => [...prev, newDisplay]);
  }, []);

  const removeDisplay = useCallback((index: number) => {
    setDisplays((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!eventName.trim()) {
      setError('Please enter an event name');
      return;
    }

    if (!selectedSource) {
      setError('Please select an audio source');
      return;
    }

    if (displays.length === 0) {
      setError('Please add at least one display configuration');
      return;
    }

    const selectedAudioSource = audioSources.find((s) => s.id === selectedSource);
    if (!selectedAudioSource) {
      setError('Selected audio source not found');
      return;
    }

    const config: EventConfig = {
      id: `event-${Date.now()}`,
      name: eventName.trim(),
      venue: venue.trim(),
      startTime: new Date(),
      audioSources: [{ ...selectedAudioSource, isActive: true }],
      displays,
      avatarConfig,
      isDemo: false,
    };

    onConfigComplete(config);
  }, [eventName, venue, selectedSource, audioSources, displays, avatarConfig, onConfigComplete]);

  return (
    <div className="event-setup">
      <style jsx>{`
        .event-setup {
          max-width: 900px;
          margin: 0 auto;
          padding: 32px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .demo-button {
          padding: 10px 20px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .demo-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .event-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 32px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .form-group input {
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #2563eb;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 8px;
        }

        .tab {
          padding: 12px 24px;
          background: transparent;
          border: none;
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          border-radius: 8px 8px 0 0;
          transition: all 0.2s;
        }

        .tab:hover {
          color: #2563eb;
          background: #f3f4f6;
        }

        .tab.active {
          color: #2563eb;
          background: #eff6ff;
        }

        .tab-content {
          padding: 24px;
          background: #f9fafb;
          border-radius: 12px;
          min-height: 300px;
        }

        .audio-sources {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .audio-source {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .audio-source:hover {
          border-color: #2563eb;
        }

        .audio-source.selected {
          border-color: #2563eb;
          background: #eff6ff;
        }

        .audio-source input[type="radio"] {
          width: 20px;
          height: 20px;
          accent-color: #2563eb;
        }

        .source-info {
          flex: 1;
        }

        .source-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .source-type {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stream-input {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .stream-input input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
        }

        .add-button {
          padding: 12px 24px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .add-button:hover {
          background: #1d4ed8;
        }

        .add-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .displays-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .display-option {
          padding: 20px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .display-option:hover {
          border-color: #2563eb;
          transform: translateY(-2px);
        }

        .display-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 12px;
          background: #eff6ff;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .display-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .display-desc {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }

        .active-displays {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .active-display {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
        }

        .remove-button {
          padding: 8px 16px;
          background: #fee2e2;
          color: #dc2626;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .remove-button:hover {
          background: #fecaca;
        }

        .avatar-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .color-picker {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .color-picker input[type="color"] {
          width: 48px;
          height: 48px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .checkbox-label input {
          width: 20px;
          height: 20px;
          accent-color: #2563eb;
        }

        .error-message {
          padding: 12px 16px;
          background: #fee2e2;
          color: #dc2626;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }

        .submit-button {
          padding: 14px 32px;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .submit-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }

        .submit-button:disabled {
          background: #9ca3af;
          transform: none;
          box-shadow: none;
          cursor: not-allowed;
        }

        .loading {
          text-align: center;
          padding: 24px;
          color: #6b7280;
        }
      `}</style>

      <div className="header">
        <h1>Event Setup</h1>
        <button className="demo-button" onClick={onStartDemo}>
          Try Demo Mode
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="event-info">
        <div className="form-group">
          <label>Event Name *</label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g., Annual Conference 2024"
          />
        </div>
        <div className="form-group">
          <label>Venue</label>
          <input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g., Convention Center Hall A"
          />
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'audio' ? 'active' : ''}`}
          onClick={() => setActiveTab('audio')}
        >
          Audio Source
        </button>
        <button
          className={`tab ${activeTab === 'display' ? 'active' : ''}`}
          onClick={() => setActiveTab('display')}
        >
          Display Outputs
        </button>
        <button
          className={`tab ${activeTab === 'avatar' ? 'active' : ''}`}
          onClick={() => setActiveTab('avatar')}
        >
          Avatar Settings
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'audio' && (
          <div className="audio-sources">
            {isLoading ? (
              <div className="loading">Loading audio devices...</div>
            ) : (
              <>
                {audioSources.map((source) => (
                  <label
                    key={source.id}
                    className={`audio-source ${selectedSource === source.id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="audioSource"
                      value={source.id}
                      checked={selectedSource === source.id}
                      onChange={() => setSelectedSource(source.id)}
                    />
                    <div className="source-info">
                      <div className="source-name">{source.name}</div>
                      <div className="source-type">{source.type}</div>
                    </div>
                  </label>
                ))}

                <div className="stream-input">
                  <input
                    type="text"
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    placeholder="Enter stream URL (RTMP, HLS, etc.)"
                  />
                  <button
                    className="add-button"
                    onClick={addStreamSource}
                    disabled={!streamUrl.trim()}
                  >
                    Add Stream
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'display' && (
          <>
            <div className="displays-grid">
              <div className="display-option" onClick={() => addDisplay('stage')}>
                <div className="display-icon">🎭</div>
                <div className="display-name">Stage Display</div>
                <div className="display-desc">Full-screen for venue displays</div>
              </div>
              <div className="display-option" onClick={() => addDisplay('confidence-monitor')}>
                <div className="display-icon">📊</div>
                <div className="display-name">Confidence Monitor</div>
                <div className="display-desc">Technical view for operators</div>
              </div>
              <div className="display-option" onClick={() => addDisplay('livestream-overlay')}>
                <div className="display-icon">📺</div>
                <div className="display-name">Livestream Overlay</div>
                <div className="display-desc">Picture-in-picture for streams</div>
              </div>
            </div>

            {displays.length > 0 && (
              <div className="active-displays">
                <h3 style={{ marginBottom: '12px', color: '#374151' }}>
                  Active Displays ({displays.length})
                </h3>
                {displays.map((display, index) => (
                  <div key={index} className="active-display">
                    <div>
                      <div className="source-name" style={{ textTransform: 'capitalize' }}>
                        {display.mode.replace('-', ' ')}
                      </div>
                      <div className="source-type">
                        {display.width}x{display.height}
                      </div>
                    </div>
                    <button
                      className="remove-button"
                      onClick={() => removeDisplay(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'avatar' && (
          <div className="avatar-options">
            <div className="form-group">
              <label>Avatar Style</label>
              <select
                value={avatarConfig.style}
                onChange={(e) =>
                  setAvatarConfig({
                    ...avatarConfig,
                    style: e.target.value as AvatarConfig['style'],
                  })
                }
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <option value="realistic">Realistic</option>
                <option value="stylized">Stylized</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>

            <div className="form-group">
              <label>Skin Tone</label>
              <div className="color-picker">
                <input
                  type="color"
                  value={avatarConfig.skinTone}
                  onChange={(e) =>
                    setAvatarConfig({ ...avatarConfig, skinTone: e.target.value })
                  }
                />
                <span style={{ color: '#6b7280', fontSize: '14px' }}>
                  {avatarConfig.skinTone}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>Clothing Color</label>
              <div className="color-picker">
                <input
                  type="color"
                  value={avatarConfig.clothingColor}
                  onChange={(e) =>
                    setAvatarConfig({ ...avatarConfig, clothingColor: e.target.value })
                  }
                />
                <span style={{ color: '#6b7280', fontSize: '14px' }}>
                  {avatarConfig.clothingColor}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>Visibility Options</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={avatarConfig.showHands}
                    onChange={(e) =>
                      setAvatarConfig({ ...avatarConfig, showHands: e.target.checked })
                    }
                  />
                  Show Hands
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={avatarConfig.showFace}
                    onChange={(e) =>
                      setAvatarConfig({ ...avatarConfig, showFace: e.target.checked })
                    }
                  />
                  Show Face
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={avatarConfig.showUpperBody}
                    onChange={(e) =>
                      setAvatarConfig({ ...avatarConfig, showUpperBody: e.target.checked })
                    }
                  />
                  Show Upper Body
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="actions">
        <button
          className="submit-button"
          onClick={handleSubmit}
          disabled={!eventName || !selectedSource || displays.length === 0}
        >
          Start Event
        </button>
      </div>
    </div>
  );
}
