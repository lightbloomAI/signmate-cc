'use client';

import { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';

// Theme Types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  secondaryHover: string;
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceHover: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface Theme {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  colors: ThemeColors;
  customColors?: Partial<ThemeColors>;
}

// Default color palettes
const DARK_COLORS: ThemeColors = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  secondary: '#6366f1',
  secondaryHover: '#4f46e5',
  background: '#030712',
  backgroundSecondary: '#111827',
  surface: '#1f2937',
  surfaceHover: '#374151',
  border: '#374151',
  text: '#f9fafb',
  textSecondary: '#e5e7eb',
  textMuted: '#9ca3af',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

const LIGHT_COLORS: ThemeColors = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  secondary: '#6366f1',
  secondaryHover: '#4f46e5',
  background: '#ffffff',
  backgroundSecondary: '#f9fafb',
  surface: '#ffffff',
  surfaceHover: '#f3f4f6',
  border: '#e5e7eb',
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#6b7280',
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  info: '#2563eb',
};

// Theme presets
export const THEME_PRESETS = {
  default: { name: 'Default', primary: '#2563eb', secondary: '#6366f1' },
  emerald: { name: 'Emerald', primary: '#059669', secondary: '#10b981' },
  purple: { name: 'Purple', primary: '#7c3aed', secondary: '#8b5cf6' },
  rose: { name: 'Rose', primary: '#e11d48', secondary: '#f43f5e' },
  amber: { name: 'Amber', primary: '#d97706', secondary: '#f59e0b' },
  cyan: { name: 'Cyan', primary: '#0891b2', secondary: '#06b6d4' },
};

interface ThemeContextType {
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
  setCustomColors: (colors: Partial<ThemeColors>) => void;
  applyPreset: (presetKey: keyof typeof THEME_PRESETS) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

// Theme Provider
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultMode = 'dark',
  storageKey = 'signmate-theme',
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [customColors, setCustomColorsState] = useState<Partial<ThemeColors>>({});
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('dark');

  // Load theme from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.mode) setModeState(parsed.mode);
        if (parsed.customColors) setCustomColorsState(parsed.customColors);
      } catch {
        // Invalid stored data
      }
    }
  }, [storageKey]);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ mode, customColors }));
  }, [mode, customColors, storageKey]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Resolve the actual mode
  const resolvedMode = useMemo(() => {
    if (mode === 'system') return systemPreference;
    return mode;
  }, [mode, systemPreference]);

  // Compute final colors
  const colors = useMemo(() => {
    const baseColors = resolvedMode === 'dark' ? DARK_COLORS : LIGHT_COLORS;
    return { ...baseColors, ...customColors };
  }, [resolvedMode, customColors]);

  // Apply CSS variables
  useEffect(() => {
    const root = document.documentElement;
    
    Object.entries(colors).forEach(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--color-${cssKey}`, value);
    });

    // Set color scheme for browser UI
    root.style.colorScheme = resolvedMode;
    root.setAttribute('data-theme', resolvedMode);
  }, [colors, resolvedMode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
  }, []);

  const setCustomColors = useCallback((newColors: Partial<ThemeColors>) => {
    setCustomColorsState((prev) => ({ ...prev, ...newColors }));
  }, []);

  const applyPreset = useCallback((presetKey: keyof typeof THEME_PRESETS) => {
    const preset = THEME_PRESETS[presetKey];
    setCustomColorsState({
      primary: preset.primary,
      primaryHover: adjustBrightness(preset.primary, -15),
      secondary: preset.secondary,
      secondaryHover: adjustBrightness(preset.secondary, -15),
    });
  }, []);

  const resetTheme = useCallback(() => {
    setModeState(defaultMode);
    setCustomColorsState({});
  }, [defaultMode]);

  const theme: Theme = {
    mode,
    resolvedMode,
    colors,
    customColors,
  };

  return (
    <ThemeContext.Provider value={{ theme, setMode, setCustomColors, applyPreset, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper function to adjust color brightness
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

// Theme Toggle Button
interface ThemeToggleProps {
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function ThemeToggle({ showLabel = false, size = 'medium' }: ThemeToggleProps) {
  const { theme, setMode } = useTheme();

  const sizes = {
    small: { button: 28, icon: 14 },
    medium: { button: 36, icon: 18 },
    large: { button: 44, icon: 22 },
  };

  const { button: buttonSize, icon: iconSize } = sizes[size];

  const toggleMode = () => {
    if (theme.mode === 'dark') {
      setMode('light');
    } else if (theme.mode === 'light') {
      setMode('system');
    } else {
      setMode('dark');
    }
  };

  const getIcon = () => {
    if (theme.mode === 'dark') return '🌙';
    if (theme.mode === 'light') return '☀️';
    return '🖥️';
  };

  const getLabel = () => {
    if (theme.mode === 'dark') return 'Dark';
    if (theme.mode === 'light') return 'Light';
    return 'System';
  };

  return (
    <button
      className="theme-toggle"
      onClick={toggleMode}
      aria-label={`Current theme: ${getLabel()}. Click to change.`}
    >
      <style jsx>{`
        .theme-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: ${showLabel ? '6px 12px' : '0'};
          width: ${showLabel ? 'auto' : `${buttonSize}px`};
          height: ${buttonSize}px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: ${showLabel ? '8px' : '50%'};
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .theme-toggle:hover {
          background: var(--color-surface-hover);
          border-color: var(--color-primary);
        }
        .icon {
          font-size: ${iconSize}px;
          line-height: 1;
        }
        .label {
          font-size: ${size === 'small' ? '12px' : '13px'};
          font-weight: 500;
          color: var(--color-text);
        }
      `}</style>
      <span className="icon">{getIcon()}</span>
      {showLabel && <span className="label">{getLabel()}</span>}
    </button>
  );
}

// Theme Selector Panel
interface ThemeSelectorProps {
  showPresets?: boolean;
  showColorPicker?: boolean;
}

export function ThemeSelector({ showPresets = true, showColorPicker = true }: ThemeSelectorProps) {
  const { theme, setMode, setCustomColors, applyPreset, resetTheme } = useTheme();
  const [primaryColor, setPrimaryColor] = useState(theme.colors.primary);

  useEffect(() => {
    setPrimaryColor(theme.colors.primary);
  }, [theme.colors.primary]);

  const handlePrimaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setPrimaryColor(color);
    setCustomColors({
      primary: color,
      primaryHover: adjustBrightness(color, -15),
    });
  };

  return (
    <div className="theme-selector">
      <style jsx>{`
        .theme-selector {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 20px;
          background: var(--color-surface);
          border-radius: 12px;
        }
        .section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
        }
        .mode-buttons {
          display: flex;
          gap: 8px;
        }
        .mode-button {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px;
          background: var(--color-background-secondary);
          border: 2px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .mode-button:hover {
          background: var(--color-surface-hover);
        }
        .mode-button.active {
          border-color: var(--color-primary);
          background: var(--color-surface-hover);
        }
        .mode-icon {
          font-size: 24px;
        }
        .mode-label {
          font-size: 12px;
          color: var(--color-text-secondary);
        }
        .preset-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .preset-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: var(--color-background-secondary);
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .preset-button:hover {
          background: var(--color-surface-hover);
        }
        .preset-button.active {
          border-color: var(--color-primary);
        }
        .preset-swatch {
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }
        .preset-name {
          font-size: 12px;
          color: var(--color-text);
        }
        .color-picker-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .color-input {
          width: 44px;
          height: 44px;
          padding: 0;
          border: 2px solid var(--color-border);
          border-radius: 8px;
          cursor: pointer;
          overflow: hidden;
        }
        .color-input::-webkit-color-swatch-wrapper {
          padding: 0;
        }
        .color-input::-webkit-color-swatch {
          border: none;
        }
        .color-label {
          flex: 1;
        }
        .color-label-text {
          font-size: 13px;
          color: var(--color-text);
        }
        .color-value {
          font-size: 11px;
          font-family: monospace;
          color: var(--color-text-muted);
        }
        .reset-button {
          padding: 10px;
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          font-size: 13px;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .reset-button:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
        }
      `}</style>

      <div className="section">
        <h3 className="section-title">Appearance</h3>
        <div className="mode-buttons">
          <button
            className={`mode-button ${theme.mode === 'light' ? 'active' : ''}`}
            onClick={() => setMode('light')}
          >
            <span className="mode-icon">☀️</span>
            <span className="mode-label">Light</span>
          </button>
          <button
            className={`mode-button ${theme.mode === 'dark' ? 'active' : ''}`}
            onClick={() => setMode('dark')}
          >
            <span className="mode-icon">🌙</span>
            <span className="mode-label">Dark</span>
          </button>
          <button
            className={`mode-button ${theme.mode === 'system' ? 'active' : ''}`}
            onClick={() => setMode('system')}
          >
            <span className="mode-icon">🖥️</span>
            <span className="mode-label">System</span>
          </button>
        </div>
      </div>

      {showPresets && (
        <div className="section">
          <h3 className="section-title">Color Presets</h3>
          <div className="preset-grid">
            {Object.entries(THEME_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                className={`preset-button ${
                  theme.colors.primary === preset.primary ? 'active' : ''
                }`}
                onClick={() => applyPreset(key as keyof typeof THEME_PRESETS)}
              >
                <div
                  className="preset-swatch"
                  style={{ background: preset.primary }}
                />
                <span className="preset-name">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showColorPicker && (
        <div className="section">
          <h3 className="section-title">Custom Color</h3>
          <div className="color-picker-row">
            <input
              type="color"
              className="color-input"
              value={primaryColor}
              onChange={handlePrimaryChange}
            />
            <div className="color-label">
              <div className="color-label-text">Primary Color</div>
              <div className="color-value">{primaryColor.toUpperCase()}</div>
            </div>
          </div>
        </div>
      )}

      <button className="reset-button" onClick={resetTheme}>
        Reset to Default
      </button>
    </div>
  );
}

// CSS Variables stylesheet (to be included in the app)
export function ThemeStyles() {
  return (
    <style jsx global>{`
      :root {
        --color-primary: #2563eb;
        --color-primary-hover: #1d4ed8;
        --color-secondary: #6366f1;
        --color-secondary-hover: #4f46e5;
        --color-background: #030712;
        --color-background-secondary: #111827;
        --color-surface: #1f2937;
        --color-surface-hover: #374151;
        --color-border: #374151;
        --color-text: #f9fafb;
        --color-text-secondary: #e5e7eb;
        --color-text-muted: #9ca3af;
        --color-success: #10b981;
        --color-warning: #f59e0b;
        --color-error: #ef4444;
        --color-info: #3b82f6;
      }

      [data-theme='light'] {
        --color-background: #ffffff;
        --color-background-secondary: #f9fafb;
        --color-surface: #ffffff;
        --color-surface-hover: #f3f4f6;
        --color-border: #e5e7eb;
        --color-text: #111827;
        --color-text-secondary: #374151;
        --color-text-muted: #6b7280;
        --color-success: #059669;
        --color-warning: #d97706;
        --color-error: #dc2626;
        --color-info: #2563eb;
      }
    `}</style>
  );
}
