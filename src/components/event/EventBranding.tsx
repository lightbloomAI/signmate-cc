'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';

interface BrandingConfig {
  logo?: string;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logoSize: 'small' | 'medium' | 'large';
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  showBorder: boolean;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  overlayOpacity: number;
  customCSS?: string;
}

interface EventBrandingProps {
  config?: Partial<BrandingConfig>;
  onConfigChange?: (config: BrandingConfig) => void;
  onClose?: () => void;
  compact?: boolean;
  previewMode?: boolean;
}

const DEFAULT_CONFIG: BrandingConfig = {
  logoPosition: 'top-right',
  logoSize: 'medium',
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  backgroundColor: '#111827',
  textColor: '#f9fafb',
  fontFamily: 'Inter, system-ui, sans-serif',
  showBorder: false,
  borderColor: '#374151',
  borderWidth: 2,
  borderRadius: 12,
  overlayOpacity: 0.9,
};

const PRESET_THEMES: Array<{ name: string; config: Partial<BrandingConfig> }> = [
  {
    name: 'Default Dark',
    config: {
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
      backgroundColor: '#111827',
      textColor: '#f9fafb',
    },
  },
  {
    name: 'Light Mode',
    config: {
      primaryColor: '#2563eb',
      secondaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#111827',
    },
  },
  {
    name: 'High Contrast',
    config: {
      primaryColor: '#fbbf24',
      secondaryColor: '#f59e0b',
      backgroundColor: '#000000',
      textColor: '#ffffff',
    },
  },
  {
    name: 'Corporate Blue',
    config: {
      primaryColor: '#0066cc',
      secondaryColor: '#004999',
      backgroundColor: '#f0f4f8',
      textColor: '#1a365d',
    },
  },
  {
    name: 'Nature Green',
    config: {
      primaryColor: '#059669',
      secondaryColor: '#047857',
      backgroundColor: '#0f172a',
      textColor: '#ecfdf5',
    },
  },
  {
    name: 'Warm Sunset',
    config: {
      primaryColor: '#dc2626',
      secondaryColor: '#b91c1c',
      backgroundColor: '#1c1917',
      textColor: '#fef2f2',
    },
  },
];

const FONT_OPTIONS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter (Default)' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica Neue, sans-serif', label: 'Helvetica Neue' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
];

const LOGO_SIZES = {
  small: { width: 60, height: 40 },
  medium: { width: 100, height: 60 },
  large: { width: 150, height: 90 },
};

export function EventBranding({
  config: initialConfig,
  onConfigChange,
  onClose,
  compact = false,
  previewMode = false,
}: EventBrandingProps) {
  const [config, setConfig] = useState<BrandingConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateConfig = useCallback(
    (updates: Partial<BrandingConfig>) => {
      const newConfig = { ...config, ...updates };
      setConfig(newConfig);
      onConfigChange?.(newConfig);
    },
    [config, onConfigChange]
  );

  const handleLogoUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be smaller than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        updateConfig({ logo: dataUrl });
      };
      reader.readAsDataURL(file);
    },
    [updateConfig]
  );

  const removeLogo = useCallback(() => {
    updateConfig({ logo: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [updateConfig]);

  const applyPreset = useCallback(
    (preset: (typeof PRESET_THEMES)[0]) => {
      updateConfig(preset.config);
    },
    [updateConfig]
  );

  const resetToDefaults = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    onConfigChange?.(DEFAULT_CONFIG);
  }, [onConfigChange]);

  const renderPreview = () => (
    <div
      className="branding-preview"
      style={{
        background: config.backgroundColor,
        borderRadius: config.borderRadius,
        border: config.showBorder
          ? `${config.borderWidth}px solid ${config.borderColor}`
          : 'none',
        fontFamily: config.fontFamily,
      }}
    >
      <style jsx>{`
        .branding-preview {
          position: relative;
          padding: 20px;
          min-height: 200px;
          overflow: hidden;
        }
        .preview-logo {
          position: absolute;
          object-fit: contain;
        }
        .preview-content {
          text-align: center;
          padding-top: 40px;
        }
        .preview-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .preview-subtitle {
          font-size: 14px;
          opacity: 0.8;
        }
        .preview-avatar {
          width: 80px;
          height: 100px;
          margin: 20px auto;
          border-radius: 8px;
        }
      `}</style>

      {config.logo && (
        <img
          src={config.logo}
          alt="Event logo"
          className="preview-logo"
          style={{
            ...LOGO_SIZES[config.logoSize],
            [config.logoPosition.includes('top') ? 'top' : 'bottom']: '12px',
            [config.logoPosition.includes('left') ? 'left' : 'right']: '12px',
          }}
        />
      )}

      <div className="preview-content">
        <div className="preview-title" style={{ color: config.textColor }}>
          Event Name
        </div>
        <div className="preview-subtitle" style={{ color: config.textColor }}>
          Venue Location
        </div>
        <div
          className="preview-avatar"
          style={{ background: config.primaryColor }}
        />
      </div>
    </div>
  );

  if (previewMode) {
    return renderPreview();
  }

  if (compact) {
    return (
      <div className="branding-compact">
        <style jsx>{`
          .branding-compact {
            background: #1f2937;
            border-radius: 8px;
            padding: 12px;
          }
          .compact-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
          }
          .compact-row:last-child {
            margin-bottom: 0;
          }
          .compact-label {
            font-size: 12px;
            color: #9ca3af;
            width: 60px;
          }
          .color-input {
            width: 32px;
            height: 32px;
            padding: 0;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          }
          .compact-select {
            flex: 1;
            padding: 6px 10px;
            background: #111827;
            border: 1px solid #374151;
            border-radius: 6px;
            color: #f9fafb;
            font-size: 12px;
          }
        `}</style>

        <div className="compact-row">
          <span className="compact-label">Primary</span>
          <input
            type="color"
            className="color-input"
            value={config.primaryColor}
            onChange={(e) => updateConfig({ primaryColor: e.target.value })}
          />
          <input
            type="color"
            className="color-input"
            value={config.backgroundColor}
            onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
          />
        </div>

        <div className="compact-row">
          <span className="compact-label">Preset</span>
          <select
            className="compact-select"
            onChange={(e) => {
              const preset = PRESET_THEMES.find((p) => p.name === e.target.value);
              if (preset) applyPreset(preset);
            }}
          >
            <option value="">Select preset...</option>
            {PRESET_THEMES.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="event-branding">
      <style jsx>{`
        .event-branding {
          background: #111827;
          border-radius: 12px;
          overflow: hidden;
          max-width: 600px;
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

        .content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .preview-section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #e5e7eb;
          margin-bottom: 12px;
        }

        .presets-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }

        .preset-btn {
          padding: 8px 12px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 6px;
          color: #e5e7eb;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .preset-btn:hover {
          border-color: #4b5563;
          background: #374151;
        }

        .logo-section {
          margin-bottom: 20px;
        }

        .logo-upload {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-preview {
          width: 100px;
          height: 60px;
          background: #1f2937;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .logo-preview img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .logo-placeholder {
          color: #6b7280;
          font-size: 12px;
        }

        .logo-controls {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hidden-input {
          display: none;
        }

        .color-section {
          margin-bottom: 20px;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .color-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .color-label {
          flex: 1;
          font-size: 13px;
          color: #9ca3af;
        }

        .color-input {
          width: 40px;
          height: 40px;
          padding: 0;
          border: 2px solid #374151;
          border-radius: 8px;
          cursor: pointer;
          background: none;
        }

        .color-input:focus {
          outline: none;
          border-color: #2563eb;
        }

        .settings-section {
          margin-bottom: 20px;
        }

        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #1f2937;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .setting-label {
          font-size: 13px;
          color: #e5e7eb;
        }

        .setting-select {
          padding: 6px 10px;
          background: #111827;
          border: 1px solid #374151;
          border-radius: 6px;
          color: #f9fafb;
          font-size: 13px;
        }

        .setting-slider {
          width: 120px;
        }

        .toggle-switch {
          width: 44px;
          height: 24px;
          background: #374151;
          border-radius: 12px;
          cursor: pointer;
          position: relative;
          transition: background 0.2s ease;
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

        .footer {
          display: flex;
          justify-content: space-between;
          padding: 16px 20px;
          background: #1f2937;
          border-top: 1px solid #374151;
        }
      `}</style>

      <div className="header">
        <h3 className="title">Event Branding</h3>
        {onClose && (
          <Button variant="ghost" size="small" onClick={onClose}>
            ×
          </Button>
        )}
      </div>

      <div className="content">
        <div className="preview-section">
          <div className="section-title">Preview</div>
          {renderPreview()}
        </div>

        <div className="section-title">Quick Presets</div>
        <div className="presets-grid">
          {PRESET_THEMES.map((preset) => (
            <button
              key={preset.name}
              className="preset-btn"
              onClick={() => applyPreset(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>

        <div className="logo-section">
          <div className="section-title">Logo</div>
          <div className="logo-upload">
            <div className="logo-preview">
              {config.logo ? (
                <img src={config.logo} alt="Event logo" />
              ) : (
                <span className="logo-placeholder">No logo</span>
              )}
            </div>
            <div className="logo-controls">
              <Button
                variant="secondary"
                size="small"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Logo
              </Button>
              {config.logo && (
                <Button variant="ghost" size="small" onClick={removeLogo}>
                  Remove
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden-input"
              onChange={handleLogoUpload}
            />
          </div>

          {config.logo && (
            <div className="setting-row" style={{ marginTop: '12px' }}>
              <span className="setting-label">Logo Position</span>
              <select
                className="setting-select"
                value={config.logoPosition}
                onChange={(e) =>
                  updateConfig({
                    logoPosition: e.target.value as BrandingConfig['logoPosition'],
                  })
                }
              >
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>
          )}

          {config.logo && (
            <div className="setting-row">
              <span className="setting-label">Logo Size</span>
              <select
                className="setting-select"
                value={config.logoSize}
                onChange={(e) =>
                  updateConfig({
                    logoSize: e.target.value as BrandingConfig['logoSize'],
                  })
                }
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          )}
        </div>

        <div className="color-section">
          <div className="section-title">Colors</div>
          <div className="color-grid">
            <div className="color-item">
              <span className="color-label">Primary</span>
              <input
                type="color"
                className="color-input"
                value={config.primaryColor}
                onChange={(e) => updateConfig({ primaryColor: e.target.value })}
              />
            </div>
            <div className="color-item">
              <span className="color-label">Secondary</span>
              <input
                type="color"
                className="color-input"
                value={config.secondaryColor}
                onChange={(e) => updateConfig({ secondaryColor: e.target.value })}
              />
            </div>
            <div className="color-item">
              <span className="color-label">Background</span>
              <input
                type="color"
                className="color-input"
                value={config.backgroundColor}
                onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
              />
            </div>
            <div className="color-item">
              <span className="color-label">Text</span>
              <input
                type="color"
                className="color-input"
                value={config.textColor}
                onChange={(e) => updateConfig({ textColor: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-title">Typography</div>
          <div className="setting-row">
            <span className="setting-label">Font Family</span>
            <select
              className="setting-select"
              value={config.fontFamily}
              onChange={(e) => updateConfig({ fontFamily: e.target.value })}
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-title">Border</div>
          <div className="setting-row">
            <span className="setting-label">Show Border</span>
            <div
              className={`toggle-switch ${config.showBorder ? 'active' : ''}`}
              onClick={() => updateConfig({ showBorder: !config.showBorder })}
            >
              <div className="toggle-knob" />
            </div>
          </div>

          {config.showBorder && (
            <>
              <div className="setting-row">
                <span className="setting-label">Border Color</span>
                <input
                  type="color"
                  className="color-input"
                  value={config.borderColor}
                  onChange={(e) => updateConfig({ borderColor: e.target.value })}
                />
              </div>
              <div className="setting-row">
                <span className="setting-label">Border Width</span>
                <input
                  type="range"
                  className="setting-slider"
                  min="1"
                  max="8"
                  value={config.borderWidth}
                  onChange={(e) =>
                    updateConfig({ borderWidth: parseInt(e.target.value) })
                  }
                />
              </div>
            </>
          )}

          <div className="setting-row">
            <span className="setting-label">Corner Radius</span>
            <input
              type="range"
              className="setting-slider"
              min="0"
              max="32"
              value={config.borderRadius}
              onChange={(e) =>
                updateConfig({ borderRadius: parseInt(e.target.value) })
              }
            />
          </div>
        </div>
      </div>

      <div className="footer">
        <Button variant="ghost" size="small" onClick={resetToDefaults}>
          Reset to Defaults
        </Button>
        {onClose && <Button onClick={onClose}>Done</Button>}
      </div>
    </div>
  );
}

export type { BrandingConfig };
