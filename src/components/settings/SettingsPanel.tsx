'use client';

import { useState, useEffect } from 'react';
import {
  settingsManager,
  DEFAULT_SETTINGS,
  type SignMateSettings,
} from '@/lib/config/settings';
import { Button } from '@/components/ui/Button';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsSection = keyof SignMateSettings;

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<SignMateSettings>(settingsManager.getAll());
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with settings manager
  useEffect(() => {
    const unsubscribe = settingsManager.subscribe((newSettings) => {
      setSettings(newSettings);
      setHasChanges(false);
    });

    return unsubscribe;
  }, []);

  const handleChange = <K extends SettingsSection>(
    section: K,
    key: keyof SignMateSettings[K],
    value: SignMateSettings[K][keyof SignMateSettings[K]]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    Object.keys(settings).forEach((section) => {
      settingsManager.update(
        section as SettingsSection,
        settings[section as SettingsSection]
      );
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    settingsManager.resetSection(activeSection);
  };

  const handleExport = () => {
    const json = settingsManager.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signmate-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const sections: { id: SettingsSection; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: '⚙' },
    { id: 'audio', label: 'Audio', icon: '🎤' },
    { id: 'speech', label: 'Speech', icon: '💬' },
    { id: 'translation', label: 'Translation', icon: '🤟' },
    { id: 'avatar', label: 'Avatar', icon: '👤' },
    { id: 'display', label: 'Display', icon: '🖥' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
    { id: 'accessibility', label: 'Accessibility', icon: '♿' },
  ];

  if (!isOpen) return null;

  return (
    <div className="settings-panel">
      <style jsx>{`
        .settings-panel {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .settings-modal {
          background: #1f2937;
          border-radius: 16px;
          width: 90%;
          max-width: 900px;
          height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #374151;
        }
        .settings-title {
          font-size: 20px;
          font-weight: 700;
          color: #f9fafb;
        }
        .settings-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        .settings-nav {
          width: 200px;
          background: #111827;
          padding: 16px 0;
          overflow-y: auto;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          color: #9ca3af;
          cursor: pointer;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          font-size: 14px;
          transition: all 0.15s;
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #e5e7eb;
        }
        .nav-item.active {
          background: rgba(37, 99, 235, 0.2);
          color: #60a5fa;
          border-right: 2px solid #2563eb;
        }
        .settings-content {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #f9fafb;
          margin-bottom: 20px;
        }
        .setting-group {
          margin-bottom: 24px;
        }
        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #374151;
        }
        .setting-info {
          flex: 1;
        }
        .setting-label {
          font-size: 14px;
          color: #e5e7eb;
          font-weight: 500;
        }
        .setting-description {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }
        .setting-control {
          margin-left: 16px;
        }
        input[type="text"],
        input[type="number"],
        input[type="password"],
        select {
          background: #374151;
          border: 1px solid #4b5563;
          border-radius: 6px;
          padding: 8px 12px;
          color: #f9fafb;
          font-size: 14px;
          min-width: 200px;
        }
        input[type="text"]:focus,
        input[type="number"]:focus,
        input[type="password"]:focus,
        select:focus {
          outline: none;
          border-color: #2563eb;
        }
        input[type="range"] {
          width: 150px;
        }
        input[type="color"] {
          width: 50px;
          height: 32px;
          padding: 2px;
          background: #374151;
          border: 1px solid #4b5563;
          border-radius: 4px;
          cursor: pointer;
        }
        .toggle {
          position: relative;
          width: 48px;
          height: 26px;
          background: #374151;
          border-radius: 13px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .toggle.active {
          background: #2563eb;
        }
        .toggle-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }
        .toggle.active .toggle-knob {
          transform: translateX(22px);
        }
        .settings-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-top: 1px solid #374151;
          background: #111827;
        }
        .footer-left {
          display: flex;
          gap: 12px;
        }
        .footer-right {
          display: flex;
          gap: 12px;
        }
        .changes-indicator {
          color: #fbbf24;
          font-size: 13px;
        }
      `}</style>

      <div className="settings-modal">
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <Button variant="ghost" size="small" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="settings-body">
          <nav className="settings-nav">
            {sections.map((section) => (
              <button
                key={section.id}
                className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span>{section.icon}</span>
                {section.label}
              </button>
            ))}
          </nav>

          <div className="settings-content">
            <h3 className="section-title">
              {sections.find((s) => s.id === activeSection)?.label} Settings
            </h3>

            {activeSection === 'general' && (
              <div className="setting-group">
                <SettingRow
                  label="Event Name"
                  description="Name of the current event"
                >
                  <input
                    type="text"
                    value={settings.general.eventName}
                    onChange={(e) => handleChange('general', 'eventName', e.target.value)}
                    placeholder="Enter event name"
                  />
                </SettingRow>
                <SettingRow
                  label="Venue"
                  description="Location of the event"
                >
                  <input
                    type="text"
                    value={settings.general.venue}
                    onChange={(e) => handleChange('general', 'venue', e.target.value)}
                    placeholder="Enter venue"
                  />
                </SettingRow>
                <SettingRow
                  label="Auto Start"
                  description="Automatically start interpretation on load"
                >
                  <Toggle
                    active={settings.general.autoStart}
                    onChange={(v) => handleChange('general', 'autoStart', v)}
                  />
                </SettingRow>
                <SettingRow
                  label="Session Recording"
                  description="Record sessions for playback"
                >
                  <Toggle
                    active={settings.general.sessionRecording}
                    onChange={(v) => handleChange('general', 'sessionRecording', v)}
                  />
                </SettingRow>
              </div>
            )}

            {activeSection === 'audio' && (
              <div className="setting-group">
                <SettingRow
                  label="Default Source"
                  description="Primary audio input source"
                >
                  <select
                    value={settings.audio.defaultSource}
                    onChange={(e) => handleChange('audio', 'defaultSource', e.target.value as 'microphone' | 'av-system' | 'stream')}
                  >
                    <option value="microphone">Microphone</option>
                    <option value="av-system">AV System</option>
                    <option value="stream">Stream URL</option>
                  </select>
                </SettingRow>
                <SettingRow
                  label="Noise Reduction"
                  description="Enable background noise suppression"
                >
                  <Toggle
                    active={settings.audio.noiseReduction}
                    onChange={(v) => handleChange('audio', 'noiseReduction', v)}
                  />
                </SettingRow>
                <SettingRow
                  label="Echo Cancellation"
                  description="Reduce echo feedback"
                >
                  <Toggle
                    active={settings.audio.echoCancellation}
                    onChange={(v) => handleChange('audio', 'echoCancellation', v)}
                  />
                </SettingRow>
                <SettingRow
                  label="Input Volume"
                  description="Audio input level"
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.audio.inputVolume}
                    onChange={(e) => handleChange('audio', 'inputVolume', Number(e.target.value))}
                  />
                  <span style={{ marginLeft: 8, color: '#9ca3af' }}>{settings.audio.inputVolume}%</span>
                </SettingRow>
              </div>
            )}

            {activeSection === 'speech' && (
              <div className="setting-group">
                <SettingRow
                  label="Speech Provider"
                  description="Speech recognition service"
                >
                  <select
                    value={settings.speech.provider}
                    onChange={(e) => handleChange('speech', 'provider', e.target.value as 'browser' | 'deepgram')}
                  >
                    <option value="browser">Browser (Free)</option>
                    <option value="deepgram">Deepgram (Professional)</option>
                  </select>
                </SettingRow>
                <SettingRow
                  label="Language"
                  description="Speech recognition language"
                >
                  <select
                    value={settings.speech.language}
                    onChange={(e) => handleChange('speech', 'language', e.target.value)}
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="es-ES">Spanish</option>
                    <option value="fr-FR">French</option>
                    <option value="de-DE">German</option>
                  </select>
                </SettingRow>
                {settings.speech.provider === 'deepgram' && (
                  <>
                    <SettingRow
                      label="Deepgram API Key"
                      description="Your Deepgram API key"
                    >
                      <input
                        type="password"
                        value={settings.speech.deepgramApiKey}
                        onChange={(e) => handleChange('speech', 'deepgramApiKey', e.target.value)}
                        placeholder="Enter API key"
                      />
                    </SettingRow>
                    <SettingRow
                      label="Model"
                      description="Deepgram recognition model"
                    >
                      <select
                        value={settings.speech.deepgramModel}
                        onChange={(e) => handleChange('speech', 'deepgramModel', e.target.value as 'nova-2' | 'nova' | 'enhanced' | 'base')}
                      >
                        <option value="nova-2">Nova 2 (Best)</option>
                        <option value="nova">Nova</option>
                        <option value="enhanced">Enhanced</option>
                        <option value="base">Base</option>
                      </select>
                    </SettingRow>
                  </>
                )}
                <SettingRow
                  label="Interim Results"
                  description="Show results as you speak"
                >
                  <Toggle
                    active={settings.speech.interimResults}
                    onChange={(v) => handleChange('speech', 'interimResults', v)}
                  />
                </SettingRow>
              </div>
            )}

            {activeSection === 'display' && (
              <div className="setting-group">
                <SettingRow
                  label="Default Mode"
                  description="Initial display mode"
                >
                  <select
                    value={settings.display.defaultMode}
                    onChange={(e) => handleChange('display', 'defaultMode', e.target.value as 'stage' | 'confidence-monitor' | 'livestream-overlay')}
                  >
                    <option value="stage">Stage Display</option>
                    <option value="confidence-monitor">Confidence Monitor</option>
                    <option value="livestream-overlay">Livestream Overlay</option>
                  </select>
                </SettingRow>
                <SettingRow
                  label="Show Captions"
                  description="Display text captions"
                >
                  <Toggle
                    active={settings.display.showCaptions}
                    onChange={(v) => handleChange('display', 'showCaptions', v)}
                  />
                </SettingRow>
                <SettingRow
                  label="Background Color"
                  description="Display background"
                >
                  <input
                    type="color"
                    value={settings.display.backgroundColor}
                    onChange={(e) => handleChange('display', 'backgroundColor', e.target.value)}
                  />
                </SettingRow>
                <SettingRow
                  label="Chroma Key"
                  description="Enable green screen mode"
                >
                  <Toggle
                    active={settings.display.chromaKeyEnabled}
                    onChange={(v) => handleChange('display', 'chromaKeyEnabled', v)}
                  />
                </SettingRow>
                {settings.display.chromaKeyEnabled && (
                  <SettingRow
                    label="Chroma Key Color"
                    description="Background color for keying"
                  >
                    <input
                      type="color"
                      value={settings.display.chromaKeyColor}
                      onChange={(e) => handleChange('display', 'chromaKeyColor', e.target.value)}
                    />
                  </SettingRow>
                )}
              </div>
            )}

            {activeSection === 'performance' && (
              <div className="setting-group">
                <SettingRow
                  label="Target Latency"
                  description="Target end-to-end latency (ms)"
                >
                  <input
                    type="number"
                    value={settings.performance.targetLatency}
                    onChange={(e) => handleChange('performance', 'targetLatency', Number(e.target.value))}
                    min="100"
                    max="2000"
                    step="50"
                  />
                </SettingRow>
                <SettingRow
                  label="Memory Warning"
                  description="Warning threshold (MB)"
                >
                  <input
                    type="number"
                    value={settings.performance.memoryWarningThreshold}
                    onChange={(e) => handleChange('performance', 'memoryWarningThreshold', Number(e.target.value))}
                    min="50"
                    max="500"
                  />
                </SettingRow>
                <SettingRow
                  label="Enable Metrics"
                  description="Track performance metrics"
                >
                  <Toggle
                    active={settings.performance.enableMetrics}
                    onChange={(v) => handleChange('performance', 'enableMetrics', v)}
                  />
                </SettingRow>
              </div>
            )}

            {activeSection === 'accessibility' && (
              <div className="setting-group">
                <SettingRow
                  label="Reduced Motion"
                  description="Minimize animations"
                >
                  <Toggle
                    active={settings.accessibility.reducedMotion}
                    onChange={(v) => handleChange('accessibility', 'reducedMotion', v)}
                  />
                </SettingRow>
                <SettingRow
                  label="High Contrast"
                  description="Increase visual contrast"
                >
                  <Toggle
                    active={settings.accessibility.highContrast}
                    onChange={(v) => handleChange('accessibility', 'highContrast', v)}
                  />
                </SettingRow>
                <SettingRow
                  label="Keyboard Shortcuts"
                  description="Enable keyboard controls"
                >
                  <Toggle
                    active={settings.accessibility.keyboardShortcutsEnabled}
                    onChange={(v) => handleChange('accessibility', 'keyboardShortcutsEnabled', v)}
                  />
                </SettingRow>
                <SettingRow
                  label="Screen Reader"
                  description="Announce status changes"
                >
                  <Toggle
                    active={settings.accessibility.screenReaderAnnouncements}
                    onChange={(v) => handleChange('accessibility', 'screenReaderAnnouncements', v)}
                  />
                </SettingRow>
              </div>
            )}

            {/* Add remaining sections similarly */}
          </div>
        </div>

        <div className="settings-footer">
          <div className="footer-left">
            <Button variant="ghost" size="small" onClick={handleExport}>
              Export
            </Button>
            <Button variant="ghost" size="small" onClick={handleReset}>
              Reset Section
            </Button>
          </div>
          <div className="footer-right">
            {hasChanges && <span className="changes-indicator">Unsaved changes</span>}
            <Button variant="secondary" size="small" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="small" onClick={handleSave} disabled={!hasChanges}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper components
function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="setting-row">
      <div className="setting-info">
        <div className="setting-label">{label}</div>
        {description && <div className="setting-description">{description}</div>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

function Toggle({
  active,
  onChange,
}: {
  active: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      className={`toggle ${active ? 'active' : ''}`}
      onClick={() => onChange(!active)}
      role="switch"
      aria-checked={active}
    >
      <div className="toggle-knob" />
    </button>
  );
}
