'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useSignMateStore } from '@/store';
import type { DisplayConfig, AvatarConfig, DisplayMode } from '@/types';

interface AdvancedSettingsProps {
  onClose?: () => void;
  initialTab?: 'pipeline' | 'display' | 'avatar' | 'accessibility' | 'advanced';
}

interface SettingSection {
  id: string;
  title: string;
  description: string;
}

interface PipelineConfig {
  targetLatency: number;
  maxQueueSize: number;
  enableSmoothing: boolean;
  speechEndTimeout: number;
  minConfidence: number;
}

interface LocalDisplaySettings {
  mode: DisplayMode;
  avatarPosition: 'left' | 'right' | 'center';
  showCaptions: boolean;
  captionSize: 'small' | 'medium' | 'large';
  avatarSize: 'small' | 'medium' | 'large';
  showMetrics: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

const SECTIONS: SettingSection[] = [
  {
    id: 'pipeline',
    title: 'Pipeline',
    description: 'Configure speech-to-sign translation settings',
  },
  {
    id: 'display',
    title: 'Display',
    description: 'Customize visual appearance and layout',
  },
  {
    id: 'avatar',
    title: 'Avatar',
    description: 'Personalize the signing avatar',
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    description: 'Screen reader and motion preferences',
  },
  {
    id: 'advanced',
    title: 'Advanced',
    description: 'Developer options and diagnostics',
  },
];

const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  targetLatency: 500,
  maxQueueSize: 100,
  enableSmoothing: true,
  speechEndTimeout: 1500,
  minConfidence: 0.6,
};

const DEFAULT_DISPLAY_SETTINGS: LocalDisplaySettings = {
  mode: 'stage',
  avatarPosition: 'right',
  showCaptions: true,
  captionSize: 'medium',
  avatarSize: 'large',
  showMetrics: false,
  highContrast: false,
  reducedMotion: false,
};

const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  style: 'stylized',
  skinTone: '#c4a47c',
  clothingColor: '#2563eb',
  showHands: true,
  showFace: true,
  showUpperBody: true,
};

export function AdvancedSettings({
  onClose,
  initialTab = 'pipeline',
}: AdvancedSettingsProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [hasChanges, setHasChanges] = useState(false);

  // Get current settings from store
  const { avatarConfig, setAvatarConfig, activeDisplayMode, setActiveDisplayMode } =
    useSignMateStore();

  // Local state for editing
  const [localDisplay, setLocalDisplay] =
    useState<LocalDisplaySettings>({
      ...DEFAULT_DISPLAY_SETTINGS,
      mode: activeDisplayMode,
    });
  const [localAvatar, setLocalAvatar] = useState<AvatarConfig>(avatarConfig);
  const [localPipeline, setLocalPipeline] = useState<PipelineConfig>(
    DEFAULT_PIPELINE_CONFIG
  );
  const [localAccessibility, setLocalAccessibility] = useState({
    announceTranslations: true,
    keyboardNavigation: true,
    focusIndicators: true,
    screenReaderOptimized: false,
    reducedMotion: false,
    highContrast: false,
  });
  const [localAdvanced, setLocalAdvanced] = useState({
    debugMode: false,
    logLevel: 'info' as 'debug' | 'info' | 'warn' | 'error',
    enableTelemetry: false,
    experimentalFeatures: false,
    cacheSize: 50,
    maxHistoryItems: 100,
  });

  // Track changes
  useEffect(() => {
    const displayChanged =
      localDisplay.mode !== activeDisplayMode;
    const avatarChanged =
      JSON.stringify(localAvatar) !== JSON.stringify(avatarConfig);
    setHasChanges(displayChanged || avatarChanged);
  }, [localDisplay, localAvatar, activeDisplayMode, avatarConfig]);

  const handleSave = useCallback(() => {
    setActiveDisplayMode(localDisplay.mode);
    setAvatarConfig(localAvatar);
    setHasChanges(false);
  }, [localDisplay, localAvatar, setActiveDisplayMode, setAvatarConfig]);

  const handleReset = useCallback(() => {
    setLocalDisplay(DEFAULT_DISPLAY_SETTINGS);
    setLocalAvatar(DEFAULT_AVATAR_CONFIG);
    setLocalPipeline(DEFAULT_PIPELINE_CONFIG);
    setLocalAccessibility({
      announceTranslations: true,
      keyboardNavigation: true,
      focusIndicators: true,
      screenReaderOptimized: false,
      reducedMotion: false,
      highContrast: false,
    });
    setLocalAdvanced({
      debugMode: false,
      logLevel: 'info',
      enableTelemetry: false,
      experimentalFeatures: false,
      cacheSize: 50,
      maxHistoryItems: 100,
    });
  }, []);

  const renderToggle = (
    label: string,
    description: string,
    value: boolean,
    onChange: (value: boolean) => void
  ) => (
    <div className="setting-row">
      <div className="setting-info">
        <div className="setting-label">{label}</div>
        <div className="setting-desc">{description}</div>
      </div>
      <div
        className={`toggle-switch ${value ? 'active' : ''}`}
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange(!value);
          }
        }}
      >
        <div className="toggle-knob" />
      </div>
    </div>
  );

  const renderSlider = (
    label: string,
    description: string,
    value: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    onChange: (value: number) => void
  ) => (
    <div className="setting-row">
      <div className="setting-info">
        <div className="setting-label">{label}</div>
        <div className="setting-desc">{description}</div>
      </div>
      <div className="slider-container">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider"
        />
        <span className="slider-value">
          {value}
          {unit}
        </span>
      </div>
    </div>
  );

  const renderSelect = <T extends string>(
    label: string,
    description: string,
    value: T,
    options: Array<{ value: T; label: string }>,
    onChange: (value: T) => void
  ) => (
    <div className="setting-row">
      <div className="setting-info">
        <div className="setting-label">{label}</div>
        <div className="setting-desc">{description}</div>
      </div>
      <select
        className="setting-select"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  const renderPipelineSettings = () => (
    <div className="settings-section">
      {renderSlider(
        'Target Latency',
        'Maximum delay for speech-to-sign translation',
        localPipeline.targetLatency,
        200,
        2000,
        100,
        'ms',
        (v) => setLocalPipeline({ ...localPipeline, targetLatency: v })
      )}
      {renderSlider(
        'Queue Size',
        'Maximum translation queue capacity',
        localPipeline.maxQueueSize,
        10,
        500,
        10,
        '',
        (v) => setLocalPipeline({ ...localPipeline, maxQueueSize: v })
      )}
      {renderSlider(
        'Speech End Timeout',
        'Delay before considering speech ended',
        localPipeline.speechEndTimeout,
        500,
        5000,
        100,
        'ms',
        (v) => setLocalPipeline({ ...localPipeline, speechEndTimeout: v })
      )}
      {renderSlider(
        'Min Confidence',
        'Minimum recognition confidence threshold',
        localPipeline.minConfidence * 100,
        0,
        100,
        5,
        '%',
        (v) => setLocalPipeline({ ...localPipeline, minConfidence: v / 100 })
      )}
      {renderToggle(
        'Enable Smoothing',
        'Smooth transitions between signs',
        localPipeline.enableSmoothing,
        (v) => setLocalPipeline({ ...localPipeline, enableSmoothing: v })
      )}
    </div>
  );

  const renderDisplaySettings = () => (
    <div className="settings-section">
      {renderSelect(
        'Display Mode',
        'Layout for avatar and content',
        localDisplay.mode,
        [
          { value: 'stage' as DisplayMode, label: 'Stage View' },
          { value: 'confidence-monitor' as DisplayMode, label: 'Confidence Monitor' },
          { value: 'livestream-overlay' as DisplayMode, label: 'Livestream Overlay' },
        ],
        (v) => setLocalDisplay({ ...localDisplay, mode: v })
      )}
      {renderSelect(
        'Avatar Position',
        'Location of the avatar on screen',
        localDisplay.avatarPosition,
        [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'center', label: 'Center' },
        ],
        (v) => setLocalDisplay({ ...localDisplay, avatarPosition: v })
      )}
      {renderSelect(
        'Avatar Size',
        'Size of the signing avatar',
        localDisplay.avatarSize,
        [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ],
        (v) => setLocalDisplay({ ...localDisplay, avatarSize: v })
      )}
      {renderToggle(
        'Show Captions',
        'Display text captions alongside signs',
        localDisplay.showCaptions,
        (v) => setLocalDisplay({ ...localDisplay, showCaptions: v })
      )}
      {renderSelect(
        'Caption Size',
        'Text size for captions',
        localDisplay.captionSize,
        [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ],
        (v) => setLocalDisplay({ ...localDisplay, captionSize: v })
      )}
      {renderToggle(
        'Show Metrics',
        'Display performance metrics during translation',
        localDisplay.showMetrics,
        (v) => setLocalDisplay({ ...localDisplay, showMetrics: v })
      )}
    </div>
  );

  const renderAvatarSettings = () => (
    <div className="settings-section">
      {renderSelect(
        'Avatar Style',
        'Visual style for the signing avatar',
        localAvatar.style,
        [
          { value: 'realistic', label: 'Realistic' },
          { value: 'stylized', label: 'Stylized' },
          { value: 'minimal', label: 'Minimal' },
        ],
        (v) => setLocalAvatar({ ...localAvatar, style: v })
      )}

      <div className="setting-row">
        <div className="setting-info">
          <div className="setting-label">Skin Tone</div>
          <div className="setting-desc">Avatar skin color</div>
        </div>
        <div className="color-swatches">
          {[
            { color: '#fde7d4', label: 'Light' },
            { color: '#e5c4a8', label: 'Light Medium' },
            { color: '#c4a47c', label: 'Medium' },
            { color: '#a67c52', label: 'Medium Dark' },
            { color: '#6b4423', label: 'Dark' },
            { color: '#3d2314', label: 'Deep' },
          ].map((tone) => (
            <div
              key={tone.color}
              className={`color-swatch ${localAvatar.skinTone === tone.color ? 'selected' : ''}`}
              style={{ background: tone.color }}
              onClick={() =>
                setLocalAvatar({ ...localAvatar, skinTone: tone.color })
              }
              title={tone.label}
            />
          ))}
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-info">
          <div className="setting-label">Clothing Color</div>
          <div className="setting-desc">Avatar clothing color</div>
        </div>
        <div className="color-swatches">
          {[
            { color: '#2563eb', label: 'Blue' },
            { color: '#059669', label: 'Green' },
            { color: '#7c3aed', label: 'Purple' },
            { color: '#dc2626', label: 'Red' },
            { color: '#ea580c', label: 'Orange' },
            { color: '#4b5563', label: 'Gray' },
          ].map((c) => (
            <div
              key={c.color}
              className={`color-swatch ${localAvatar.clothingColor === c.color ? 'selected' : ''}`}
              style={{ background: c.color }}
              onClick={() =>
                setLocalAvatar({ ...localAvatar, clothingColor: c.color })
              }
              title={c.label}
            />
          ))}
        </div>
      </div>

      {renderToggle(
        'Show Face',
        'Display avatar face',
        localAvatar.showFace,
        (v) => setLocalAvatar({ ...localAvatar, showFace: v })
      )}
      {renderToggle(
        'Show Hands',
        'Display avatar hands',
        localAvatar.showHands,
        (v) => setLocalAvatar({ ...localAvatar, showHands: v })
      )}
      {renderToggle(
        'Show Upper Body',
        'Display avatar torso',
        localAvatar.showUpperBody,
        (v) => setLocalAvatar({ ...localAvatar, showUpperBody: v })
      )}
    </div>
  );

  const renderAccessibilitySettings = () => (
    <div className="settings-section">
      {renderToggle(
        'Announce Translations',
        'Screen reader announces new translations',
        localAccessibility.announceTranslations,
        (v) =>
          setLocalAccessibility({ ...localAccessibility, announceTranslations: v })
      )}
      {renderToggle(
        'Keyboard Navigation',
        'Enable full keyboard control',
        localAccessibility.keyboardNavigation,
        (v) =>
          setLocalAccessibility({ ...localAccessibility, keyboardNavigation: v })
      )}
      {renderToggle(
        'Focus Indicators',
        'Show visible focus outlines',
        localAccessibility.focusIndicators,
        (v) =>
          setLocalAccessibility({ ...localAccessibility, focusIndicators: v })
      )}
      {renderToggle(
        'Screen Reader Optimized',
        'Optimize UI for screen readers',
        localAccessibility.screenReaderOptimized,
        (v) =>
          setLocalAccessibility({
            ...localAccessibility,
            screenReaderOptimized: v,
          })
      )}
      {renderToggle(
        'Reduced Motion',
        'Minimize animations and transitions',
        localAccessibility.reducedMotion,
        (v) => {
          setLocalAccessibility({ ...localAccessibility, reducedMotion: v });
          setLocalDisplay({ ...localDisplay, reducedMotion: v });
        }
      )}
      {renderToggle(
        'High Contrast',
        'Increase visual contrast',
        localAccessibility.highContrast,
        (v) => {
          setLocalAccessibility({ ...localAccessibility, highContrast: v });
          setLocalDisplay({ ...localDisplay, highContrast: v });
        }
      )}
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="settings-section">
      {renderToggle(
        'Debug Mode',
        'Show debug information in console',
        localAdvanced.debugMode,
        (v) => setLocalAdvanced({ ...localAdvanced, debugMode: v })
      )}
      {renderSelect(
        'Log Level',
        'Verbosity of console logging',
        localAdvanced.logLevel,
        [
          { value: 'debug', label: 'Debug' },
          { value: 'info', label: 'Info' },
          { value: 'warn', label: 'Warning' },
          { value: 'error', label: 'Error' },
        ],
        (v) => setLocalAdvanced({ ...localAdvanced, logLevel: v })
      )}
      {renderToggle(
        'Enable Telemetry',
        'Send anonymous usage statistics',
        localAdvanced.enableTelemetry,
        (v) => setLocalAdvanced({ ...localAdvanced, enableTelemetry: v })
      )}
      {renderToggle(
        'Experimental Features',
        'Enable beta features (may be unstable)',
        localAdvanced.experimentalFeatures,
        (v) => setLocalAdvanced({ ...localAdvanced, experimentalFeatures: v })
      )}
      {renderSlider(
        'Cache Size',
        'Number of translations to cache',
        localAdvanced.cacheSize,
        10,
        200,
        10,
        ' items',
        (v) => setLocalAdvanced({ ...localAdvanced, cacheSize: v })
      )}
      {renderSlider(
        'History Items',
        'Maximum history entries to keep',
        localAdvanced.maxHistoryItems,
        10,
        500,
        10,
        ' items',
        (v) => setLocalAdvanced({ ...localAdvanced, maxHistoryItems: v })
      )}

      <div className="setting-row danger-zone">
        <div className="setting-info">
          <div className="setting-label">Clear All Data</div>
          <div className="setting-desc">
            Reset all settings and clear stored data
          </div>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={() => {
            if (
              confirm(
                'Are you sure you want to clear all data? This cannot be undone.'
              )
            ) {
              localStorage.clear();
              window.location.reload();
            }
          }}
        >
          Clear Data
        </Button>
      </div>
    </div>
  );

  return (
    <div className="advanced-settings">
      <style jsx>{`
        .advanced-settings {
          background: #111827;
          border-radius: 12px;
          overflow: hidden;
          max-width: 700px;
          width: 100%;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }

        .title {
          font-size: 18px;
          font-weight: 600;
          color: #f9fafb;
        }

        .tabs {
          display: flex;
          border-bottom: 1px solid #374151;
          background: #1f2937;
          overflow-x: auto;
        }

        .tab {
          padding: 12px 16px;
          font-size: 13px;
          color: #9ca3af;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .tab:hover {
          color: #e5e7eb;
        }

        .tab.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }

        .content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .settings-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #1f2937;
          border-radius: 8px;
          gap: 16px;
        }

        .setting-row.danger-zone {
          border: 1px solid #dc2626;
          background: rgba(220, 38, 38, 0.1);
        }

        .setting-info {
          flex: 1;
          min-width: 0;
        }

        .setting-label {
          font-size: 14px;
          font-weight: 500;
          color: #f9fafb;
          margin-bottom: 2px;
        }

        .setting-desc {
          font-size: 12px;
          color: #6b7280;
        }

        .toggle-switch {
          width: 44px;
          height: 24px;
          background: #374151;
          border-radius: 12px;
          cursor: pointer;
          position: relative;
          transition: background 0.2s ease;
          flex-shrink: 0;
        }

        .toggle-switch:focus {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }

        .toggle-switch.active {
          background: #2563eb;
        }

        .toggle-knob {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          transition: left 0.2s ease;
        }

        .toggle-switch.active .toggle-knob {
          left: 22px;
        }

        .slider-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .slider {
          width: 120px;
          height: 4px;
          -webkit-appearance: none;
          background: #374151;
          border-radius: 2px;
          cursor: pointer;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: #2563eb;
          border-radius: 50%;
          cursor: pointer;
        }

        .slider:focus {
          outline: none;
        }

        .slider:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
        }

        .slider-value {
          font-size: 13px;
          color: #9ca3af;
          min-width: 60px;
          text-align: right;
        }

        .setting-select {
          padding: 8px 12px;
          background: #111827;
          border: 1px solid #374151;
          border-radius: 6px;
          color: #f9fafb;
          font-size: 13px;
          cursor: pointer;
          min-width: 140px;
        }

        .setting-select:focus {
          outline: none;
          border-color: #2563eb;
        }

        .color-swatches {
          display: flex;
          gap: 6px;
        }

        .color-swatch {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          cursor: pointer;
          border: 2px solid transparent;
          transition: transform 0.2s ease;
        }

        .color-swatch:hover {
          transform: scale(1.1);
        }

        .color-swatch.selected {
          border-color: #fff;
          box-shadow: 0 0 0 2px #2563eb;
        }

        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #1f2937;
          border-top: 1px solid #374151;
        }

        .footer-left {
          display: flex;
          gap: 8px;
        }

        .footer-right {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .unsaved-indicator {
          font-size: 12px;
          color: #f59e0b;
          margin-right: 8px;
        }
      `}</style>

      <div className="header">
        <h3 className="title">Settings</h3>
        {onClose && (
          <Button variant="ghost" size="small" onClick={onClose}>
            ×
          </Button>
        )}
      </div>

      <div className="tabs">
        {SECTIONS.map((section) => (
          <div
            key={section.id}
            className={`tab ${activeTab === section.id ? 'active' : ''}`}
            onClick={() => setActiveTab(section.id as typeof activeTab)}
          >
            {section.title}
          </div>
        ))}
      </div>

      <div className="content">
        {activeTab === 'pipeline' && renderPipelineSettings()}
        {activeTab === 'display' && renderDisplaySettings()}
        {activeTab === 'avatar' && renderAvatarSettings()}
        {activeTab === 'accessibility' && renderAccessibilitySettings()}
        {activeTab === 'advanced' && renderAdvancedSettings()}
      </div>

      <div className="footer">
        <div className="footer-left">
          <Button variant="ghost" size="small" onClick={handleReset}>
            Reset All
          </Button>
        </div>
        <div className="footer-right">
          {hasChanges && (
            <span className="unsaved-indicator">Unsaved changes</span>
          )}
          <Button onClick={handleSave} disabled={!hasChanges}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
