'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import type { AvatarConfig } from '@/types';

interface AvatarCustomizerProps {
  config: AvatarConfig;
  onConfigChange?: (config: AvatarConfig) => void;
  onClose?: () => void;
  compact?: boolean;
}

const SKIN_TONES = [
  { id: 'light', color: '#fde7d4', label: 'Light' },
  { id: 'light-medium', color: '#e5c4a8', label: 'Light Medium' },
  { id: 'medium', color: '#c4a47c', label: 'Medium' },
  { id: 'medium-dark', color: '#a67c52', label: 'Medium Dark' },
  { id: 'dark', color: '#6b4423', label: 'Dark' },
  { id: 'deep', color: '#3d2314', label: 'Deep' },
];

const CLOTHING_COLORS = [
  { id: 'blue', color: '#2563eb', label: 'Blue' },
  { id: 'green', color: '#059669', label: 'Green' },
  { id: 'purple', color: '#7c3aed', label: 'Purple' },
  { id: 'red', color: '#dc2626', label: 'Red' },
  { id: 'orange', color: '#ea580c', label: 'Orange' },
  { id: 'gray', color: '#4b5563', label: 'Gray' },
  { id: 'black', color: '#1f2937', label: 'Black' },
  { id: 'white', color: '#f9fafb', label: 'White' },
];

const AVATAR_STYLES: Array<{ id: AvatarConfig['style']; label: string; description: string }> = [
  {
    id: 'realistic',
    label: 'Realistic',
    description: 'Detailed, lifelike appearance',
  },
  {
    id: 'stylized',
    label: 'Stylized',
    description: 'Clean, modern cartoon style',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Simple, low-detail silhouette',
  },
];

export function AvatarCustomizer({
  config,
  onConfigChange,
  onClose,
  compact = false,
}: AvatarCustomizerProps) {
  const [localConfig, setLocalConfig] = useState<AvatarConfig>(config);

  const updateConfig = useCallback(
    (updates: Partial<AvatarConfig>) => {
      const newConfig = { ...localConfig, ...updates };
      setLocalConfig(newConfig);
      onConfigChange?.(newConfig);
    },
    [localConfig, onConfigChange]
  );

  const resetToDefaults = useCallback(() => {
    const defaults: AvatarConfig = {
      style: 'stylized',
      skinTone: '#c4a47c',
      clothingColor: '#2563eb',
      showHands: true,
      showFace: true,
      showUpperBody: true,
    };
    setLocalConfig(defaults);
    onConfigChange?.(defaults);
  }, [onConfigChange]);

  if (compact) {
    return (
      <div className="customizer-compact">
        <style jsx>{`
          .customizer-compact {
            background: #1f2937;
            border-radius: 8px;
            padding: 12px;
          }
          .compact-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
          }
          .compact-row:last-child {
            margin-bottom: 0;
          }
          .compact-label {
            font-size: 12px;
            color: #9ca3af;
            width: 60px;
          }
          .color-swatches {
            display: flex;
            gap: 4px;
          }
          .color-swatch {
            width: 20px;
            height: 20px;
            border-radius: 4px;
            cursor: pointer;
            border: 2px solid transparent;
          }
          .color-swatch:hover {
            transform: scale(1.1);
          }
          .color-swatch.selected {
            border-color: #fff;
          }
        `}</style>

        <div className="compact-row">
          <span className="compact-label">Skin</span>
          <div className="color-swatches">
            {SKIN_TONES.map((tone) => (
              <div
                key={tone.id}
                className={`color-swatch ${localConfig.skinTone === tone.color ? 'selected' : ''}`}
                style={{ background: tone.color }}
                onClick={() => updateConfig({ skinTone: tone.color })}
                title={tone.label}
              />
            ))}
          </div>
        </div>

        <div className="compact-row">
          <span className="compact-label">Clothing</span>
          <div className="color-swatches">
            {CLOTHING_COLORS.slice(0, 6).map((color) => (
              <div
                key={color.id}
                className={`color-swatch ${localConfig.clothingColor === color.color ? 'selected' : ''}`}
                style={{ background: color.color }}
                onClick={() => updateConfig({ clothingColor: color.color })}
                title={color.label}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="avatar-customizer">
      <style jsx>{`
        .avatar-customizer {
          background: #111827;
          border-radius: 12px;
          overflow: hidden;
          max-width: 500px;
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
          padding: 20px;
        }

        .preview-section {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }

        .avatar-preview {
          width: 150px;
          height: 180px;
          background: #1f2937;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .preview-head {
          width: 60px;
          height: 70px;
          border-radius: 50% 50% 45% 45%;
          margin-bottom: 8px;
        }

        .preview-body {
          width: 80px;
          height: 70px;
          border-radius: 20px 20px 0 0;
        }

        .section {
          margin-bottom: 24px;
        }

        .section:last-child {
          margin-bottom: 0;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #e5e7eb;
          margin-bottom: 12px;
        }

        .style-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .style-option {
          padding: 16px 12px;
          background: #1f2937;
          border: 2px solid #374151;
          border-radius: 8px;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s ease;
        }

        .style-option:hover {
          border-color: #4b5563;
        }

        .style-option.selected {
          border-color: #2563eb;
          background: rgba(37, 99, 235, 0.1);
        }

        .style-name {
          font-size: 14px;
          font-weight: 600;
          color: #f9fafb;
          margin-bottom: 4px;
        }

        .style-desc {
          font-size: 11px;
          color: #9ca3af;
        }

        .color-section {
          margin-bottom: 16px;
        }

        .color-label {
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 8px;
        }

        .color-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .color-option {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          cursor: pointer;
          border: 3px solid transparent;
          transition: all 0.2s ease;
        }

        .color-option:hover {
          transform: scale(1.1);
        }

        .color-option.selected {
          border-color: #fff;
          box-shadow: 0 0 0 2px #2563eb;
        }

        .toggle-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .toggle-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #1f2937;
          border-radius: 8px;
        }

        .toggle-label {
          font-size: 14px;
          color: #e5e7eb;
        }

        .toggle-switch {
          width: 48px;
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
          left: 26px;
        }

        .footer {
          display: flex;
          justify-content: space-between;
          padding-top: 20px;
          border-top: 1px solid #374151;
          margin-top: 20px;
        }
      `}</style>

      <div className="header">
        <h3 className="title">Avatar Customization</h3>
        {onClose && (
          <Button variant="ghost" size="small" onClick={onClose}>
            ×
          </Button>
        )}
      </div>

      <div className="content">
        <div className="preview-section">
          <div className="avatar-preview">
            {localConfig.showFace && (
              <div
                className="preview-head"
                style={{ background: localConfig.skinTone }}
              />
            )}
            {localConfig.showUpperBody && (
              <div
                className="preview-body"
                style={{ background: localConfig.clothingColor }}
              />
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-title">Avatar Style</div>
          <div className="style-grid">
            {AVATAR_STYLES.map((style) => (
              <div
                key={style.id}
                className={`style-option ${localConfig.style === style.id ? 'selected' : ''}`}
                onClick={() => updateConfig({ style: style.id })}
              >
                <div className="style-name">{style.label}</div>
                <div className="style-desc">{style.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="section-title">Appearance</div>

          <div className="color-section">
            <div className="color-label">Skin Tone</div>
            <div className="color-grid">
              {SKIN_TONES.map((tone) => (
                <div
                  key={tone.id}
                  className={`color-option ${localConfig.skinTone === tone.color ? 'selected' : ''}`}
                  style={{ background: tone.color }}
                  onClick={() => updateConfig({ skinTone: tone.color })}
                  title={tone.label}
                />
              ))}
            </div>
          </div>

          <div className="color-section">
            <div className="color-label">Clothing Color</div>
            <div className="color-grid">
              {CLOTHING_COLORS.map((color) => (
                <div
                  key={color.id}
                  className={`color-option ${localConfig.clothingColor === color.color ? 'selected' : ''}`}
                  style={{ background: color.color }}
                  onClick={() => updateConfig({ clothingColor: color.color })}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">Visibility</div>
          <div className="toggle-group">
            <div className="toggle-item">
              <span className="toggle-label">Show Face</span>
              <div
                className={`toggle-switch ${localConfig.showFace ? 'active' : ''}`}
                onClick={() => updateConfig({ showFace: !localConfig.showFace })}
              >
                <div className="toggle-knob" />
              </div>
            </div>
            <div className="toggle-item">
              <span className="toggle-label">Show Hands</span>
              <div
                className={`toggle-switch ${localConfig.showHands ? 'active' : ''}`}
                onClick={() => updateConfig({ showHands: !localConfig.showHands })}
              >
                <div className="toggle-knob" />
              </div>
            </div>
            <div className="toggle-item">
              <span className="toggle-label">Show Upper Body</span>
              <div
                className={`toggle-switch ${localConfig.showUpperBody ? 'active' : ''}`}
                onClick={() =>
                  updateConfig({ showUpperBody: !localConfig.showUpperBody })
                }
              >
                <div className="toggle-knob" />
              </div>
            </div>
          </div>
        </div>

        <div className="footer">
          <Button variant="ghost" size="small" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
