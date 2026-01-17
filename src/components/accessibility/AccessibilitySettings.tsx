'use client';

import React, { useCallback } from 'react';
import { useAccessibility } from '@/lib/accessibility/useAccessibility';
import type { AccessibilityPreferences } from '@/lib/accessibility/accessibilityManager';

/**
 * AccessibilitySettings Component
 *
 * A comprehensive settings panel for accessibility preferences.
 */

interface ToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ id, label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <label htmlFor={id} className="font-medium text-gray-900 dark:text-white">
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
        `}
      >
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full
            bg-white shadow ring-0 transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}

interface SelectProps<T extends string> {
  id: string;
  label: string;
  description?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

function Select<T extends string>({
  id,
  label,
  description,
  value,
  options,
  onChange,
}: SelectProps<T>) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={id} className="font-medium text-gray-900 dark:text-white">
          {label}
        </label>
      </div>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{description}</p>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        {title}
      </h3>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">{children}</div>
    </div>
  );
}

interface AccessibilitySettingsProps {
  className?: string;
  compact?: boolean;
}

export function AccessibilitySettings({
  className = '',
  compact = false,
}: AccessibilitySettingsProps) {
  const { preferences, updatePreferences, resetPreferences, announce } = useAccessibility();

  const handleChange = useCallback(
    <K extends keyof AccessibilityPreferences>(
      key: K,
      value: AccessibilityPreferences[K]
    ) => {
      updatePreferences({ [key]: value });
      announce(`${key} setting changed`);
    },
    [updatePreferences, announce]
  );

  const handleReset = useCallback(() => {
    resetPreferences();
    announce('Accessibility settings reset to defaults');
  }, [resetPreferences, announce]);

  if (compact) {
    return (
      <div className={`p-4 ${className}`}>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Quick Accessibility Options
        </h2>

        <div className="space-y-2">
          <Toggle
            id="compact-reduced-motion"
            label="Reduce Motion"
            checked={preferences.reducedMotion}
            onChange={(v) => handleChange('reducedMotion', v)}
          />
          <Toggle
            id="compact-high-contrast"
            label="High Contrast"
            checked={preferences.highContrast}
            onChange={(v) => handleChange('highContrast', v)}
          />
          <Toggle
            id="compact-large-text"
            label="Large Text"
            checked={preferences.largeText}
            onChange={(v) => handleChange('largeText', v)}
          />
          <Toggle
            id="compact-visual-alerts"
            label="Visual Alerts"
            checked={preferences.visualAlerts}
            onChange={(v) => handleChange('visualAlerts', v)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Accessibility Settings
        </h2>
        <button
          onClick={handleReset}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Visual Section */}
      <Section title="Visual">
        <Toggle
          id="reduced-motion"
          label="Reduce Motion"
          description="Minimize animations and transitions throughout the app"
          checked={preferences.reducedMotion}
          onChange={(v) => handleChange('reducedMotion', v)}
        />
        <Toggle
          id="high-contrast"
          label="High Contrast"
          description="Increase contrast for better visibility"
          checked={preferences.highContrast}
          onChange={(v) => handleChange('highContrast', v)}
        />
        <Toggle
          id="large-text"
          label="Large Text"
          description="Increase font sizes throughout the app"
          checked={preferences.largeText}
          onChange={(v) => handleChange('largeText', v)}
        />
        <Select
          id="color-blind-mode"
          label="Color Blind Mode"
          description="Adjust colors for different types of color vision"
          value={preferences.colorBlindMode}
          options={[
            { value: 'none', label: 'None' },
            { value: 'protanopia', label: 'Protanopia (Red-Blind)' },
            { value: 'deuteranopia', label: 'Deuteranopia (Green-Blind)' },
            { value: 'tritanopia', label: 'Tritanopia (Blue-Blind)' },
          ]}
          onChange={(v) => handleChange('colorBlindMode', v)}
        />
      </Section>

      {/* Audio & Captions Section */}
      <Section title="Audio & Captions">
        <Toggle
          id="visual-alerts"
          label="Visual Alerts"
          description="Show visual indicators for audio events"
          checked={preferences.visualAlerts}
          onChange={(v) => handleChange('visualAlerts', v)}
        />
        <Toggle
          id="captions-enabled"
          label="Captions Enabled"
          description="Show captions for speech and audio"
          checked={preferences.captionsEnabled}
          onChange={(v) => handleChange('captionsEnabled', v)}
        />
        <Select
          id="caption-size"
          label="Caption Size"
          description="Adjust the size of caption text"
          value={preferences.captionSize}
          options={[
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
            { value: 'extra-large', label: 'Extra Large' },
          ]}
          onChange={(v) => handleChange('captionSize', v)}
        />
        <Select
          id="caption-background"
          label="Caption Background"
          description="Choose the background style for captions"
          value={preferences.captionBackground}
          options={[
            { value: 'transparent', label: 'Transparent' },
            { value: 'semi-transparent', label: 'Semi-Transparent' },
            { value: 'solid', label: 'Solid' },
          ]}
          onChange={(v) => handleChange('captionBackground', v)}
        />
      </Section>

      {/* Interaction Section */}
      <Section title="Interaction">
        <Select
          id="focus-indicators"
          label="Focus Indicators"
          description="Choose the visibility of keyboard focus indicators"
          value={preferences.focusIndicators}
          options={[
            { value: 'default', label: 'Default' },
            { value: 'enhanced', label: 'Enhanced' },
            { value: 'high-visibility', label: 'High Visibility' },
          ]}
          onChange={(v) => handleChange('focusIndicators', v)}
        />
        <Toggle
          id="keyboard-only"
          label="Keyboard Only Mode"
          description="Optimize interface for keyboard-only navigation"
          checked={preferences.keyboardOnly}
          onChange={(v) => handleChange('keyboardOnly', v)}
        />
        <Toggle
          id="auto-focus-disabled"
          label="Disable Auto-Focus"
          description="Prevent automatic focus changes"
          checked={preferences.autoFocusDisabled}
          onChange={(v) => handleChange('autoFocusDisabled', v)}
        />
      </Section>

      {/* Screen Reader Section */}
      <Section title="Screen Reader">
        <Toggle
          id="screen-reader-optimized"
          label="Screen Reader Optimized"
          description="Optimize content structure for screen readers"
          checked={preferences.screenReaderOptimized}
          onChange={(v) => handleChange('screenReaderOptimized', v)}
        />
        <Toggle
          id="verbose-descriptions"
          label="Verbose Descriptions"
          description="Include detailed descriptions for sign translations"
          checked={preferences.verboseDescriptions}
          onChange={(v) => handleChange('verboseDescriptions', v)}
        />
        <Toggle
          id="announce-translations"
          label="Announce Translations"
          description="Announce sign translations to screen readers"
          checked={preferences.announceTranslations}
          onChange={(v) => handleChange('announceTranslations', v)}
        />
      </Section>

      {/* Information */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">
          Keyboard Shortcuts
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li><kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">Tab</kbd> - Navigate between elements</li>
          <li><kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">Space/Enter</kbd> - Activate buttons and links</li>
          <li><kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">Escape</kbd> - Close dialogs and modals</li>
          <li><kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">Arrow Keys</kbd> - Navigate within components</li>
        </ul>
      </div>
    </div>
  );
}

export default AccessibilitySettings;
