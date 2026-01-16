'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  signLanguage?: string;
  flag?: string;
}

interface LanguageSelectorProps {
  selectedLanguage?: string;
  onLanguageChange?: (languageCode: string) => void;
  onClose?: () => void;
  compact?: boolean;
  showSignLanguages?: boolean;
}

const SPOKEN_LANGUAGES: Language[] = [
  { code: 'en-US', name: 'English (US)', nativeName: 'English', direction: 'ltr', signLanguage: 'ase', flag: 'US' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English', direction: 'ltr', signLanguage: 'bfi', flag: 'GB' },
  { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español', direction: 'ltr', signLanguage: 'ssp', flag: 'ES' },
  { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español', direction: 'ltr', signLanguage: 'mfs', flag: 'MX' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', direction: 'ltr', signLanguage: 'fsl', flag: 'FR' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', direction: 'ltr', signLanguage: 'gsg', flag: 'DE' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano', direction: 'ltr', signLanguage: 'ise', flag: 'IT' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português', direction: 'ltr', signLanguage: 'bzs', flag: 'BR' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', direction: 'ltr', signLanguage: 'jsl', flag: 'JP' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어', direction: 'ltr', signLanguage: 'kvk', flag: 'KR' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', direction: 'ltr', signLanguage: 'csl', flag: 'CN' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', signLanguage: 'sdl', flag: 'SA' },
];

const SIGN_LANGUAGES: Language[] = [
  { code: 'ase', name: 'American Sign Language', nativeName: 'ASL', direction: 'ltr', flag: 'US' },
  { code: 'bfi', name: 'British Sign Language', nativeName: 'BSL', direction: 'ltr', flag: 'GB' },
  { code: 'auslan', name: 'Australian Sign Language', nativeName: 'Auslan', direction: 'ltr', flag: 'AU' },
  { code: 'fsl', name: 'French Sign Language', nativeName: 'LSF', direction: 'ltr', flag: 'FR' },
  { code: 'gsg', name: 'German Sign Language', nativeName: 'DGS', direction: 'ltr', flag: 'DE' },
  { code: 'jsl', name: 'Japanese Sign Language', nativeName: '日本手話', direction: 'ltr', flag: 'JP' },
  { code: 'csl', name: 'Chinese Sign Language', nativeName: '中国手语', direction: 'ltr', flag: 'CN' },
  { code: 'isl', name: 'International Sign', nativeName: 'IS', direction: 'ltr' },
];

const FLAG_EMOJI: Record<string, string> = {
  US: '🇺🇸',
  GB: '🇬🇧',
  ES: '🇪🇸',
  MX: '🇲🇽',
  FR: '🇫🇷',
  DE: '🇩🇪',
  IT: '🇮🇹',
  BR: '🇧🇷',
  JP: '🇯🇵',
  KR: '🇰🇷',
  CN: '🇨🇳',
  SA: '🇸🇦',
  AU: '🇦🇺',
};

const STORAGE_KEY = 'signmate_language_preferences';

interface LanguagePreferences {
  spokenLanguage: string;
  signLanguage: string;
  autoDetect: boolean;
}

function loadPreferences(): LanguagePreferences {
  if (typeof window === 'undefined') {
    return { spokenLanguage: 'en-US', signLanguage: 'ase', autoDetect: true };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }

  // Try to detect from browser
  const browserLang = navigator.language;
  const matchedLang = SPOKEN_LANGUAGES.find((l) => l.code.startsWith(browserLang.split('-')[0]));

  return {
    spokenLanguage: matchedLang?.code || 'en-US',
    signLanguage: matchedLang?.signLanguage || 'ase',
    autoDetect: true,
  };
}

function savePreferences(prefs: LanguagePreferences): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  onClose,
  compact = false,
  showSignLanguages = true,
}: LanguageSelectorProps) {
  const [preferences, setPreferences] = useState<LanguagePreferences>(() =>
    loadPreferences()
  );
  const [activeTab, setActiveTab] = useState<'spoken' | 'sign'>('spoken');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync with external selection
  useEffect(() => {
    if (selectedLanguage && selectedLanguage !== preferences.spokenLanguage) {
      setPreferences((prev) => ({ ...prev, spokenLanguage: selectedLanguage }));
    }
  }, [selectedLanguage, preferences.spokenLanguage]);

  const handleLanguageSelect = useCallback(
    (lang: Language) => {
      const newPrefs = {
        ...preferences,
        [activeTab === 'spoken' ? 'spokenLanguage' : 'signLanguage']: lang.code,
        autoDetect: false,
      };

      // Auto-select corresponding sign language
      if (activeTab === 'spoken' && lang.signLanguage) {
        newPrefs.signLanguage = lang.signLanguage;
      }

      setPreferences(newPrefs);
      savePreferences(newPrefs);
      onLanguageChange?.(lang.code);
    },
    [activeTab, preferences, onLanguageChange]
  );

  const toggleAutoDetect = useCallback(() => {
    const newPrefs = { ...preferences, autoDetect: !preferences.autoDetect };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  }, [preferences]);

  const filteredLanguages = (
    activeTab === 'spoken' ? SPOKEN_LANGUAGES : SIGN_LANGUAGES
  ).filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedSpoken = SPOKEN_LANGUAGES.find(
    (l) => l.code === preferences.spokenLanguage
  );
  const selectedSign = SIGN_LANGUAGES.find(
    (l) => l.code === preferences.signLanguage
  );

  if (compact) {
    return (
      <div className="lang-compact">
        <style jsx>{`
          .lang-compact {
            background: #1f2937;
            border-radius: 8px;
            padding: 12px;
          }
          .compact-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
          }
          .compact-row:last-child {
            margin-bottom: 0;
          }
          .compact-label {
            font-size: 12px;
            color: #9ca3af;
            width: 50px;
          }
          .compact-select {
            flex: 1;
            padding: 6px 10px;
            background: #111827;
            border: 1px solid #374151;
            border-radius: 6px;
            color: #f9fafb;
            font-size: 13px;
            cursor: pointer;
          }
          .compact-select:focus {
            outline: none;
            border-color: #2563eb;
          }
        `}</style>

        <div className="compact-row">
          <span className="compact-label">Input</span>
          <select
            className="compact-select"
            value={preferences.spokenLanguage}
            onChange={(e) => {
              const lang = SPOKEN_LANGUAGES.find((l) => l.code === e.target.value);
              if (lang) handleLanguageSelect(lang);
            }}
          >
            {SPOKEN_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag ? FLAG_EMOJI[lang.flag] : ''} {lang.name}
              </option>
            ))}
          </select>
        </div>

        {showSignLanguages && (
          <div className="compact-row">
            <span className="compact-label">Output</span>
            <select
              className="compact-select"
              value={preferences.signLanguage}
              onChange={(e) => {
                const lang = SIGN_LANGUAGES.find((l) => l.code === e.target.value);
                if (lang) handleLanguageSelect(lang);
              }}
            >
              {SIGN_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag ? FLAG_EMOJI[lang.flag] : ''} {lang.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="language-selector">
      <style jsx>{`
        .language-selector {
          background: #111827;
          border-radius: 12px;
          overflow: hidden;
          max-width: 450px;
          width: 100%;
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
          font-size: 16px;
          font-weight: 600;
          color: #f9fafb;
        }

        .current-selection {
          display: flex;
          gap: 16px;
          padding: 16px 20px;
          background: #1f2937;
        }

        .selection-card {
          flex: 1;
          padding: 12px;
          background: #111827;
          border-radius: 8px;
          border: 1px solid #374151;
        }

        .selection-label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .selection-value {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .selection-flag {
          font-size: 20px;
        }

        .selection-info {
          flex: 1;
        }

        .selection-name {
          font-size: 14px;
          font-weight: 500;
          color: #f9fafb;
        }

        .selection-native {
          font-size: 12px;
          color: #9ca3af;
        }

        .tabs {
          display: flex;
          border-bottom: 1px solid #374151;
        }

        .tab {
          flex: 1;
          padding: 12px 16px;
          font-size: 13px;
          color: #9ca3af;
          cursor: pointer;
          text-align: center;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
        }

        .tab:hover {
          color: #e5e7eb;
        }

        .tab.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }

        .search-container {
          padding: 12px 20px;
        }

        .search-input {
          width: 100%;
          padding: 10px 12px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 8px;
          color: #f9fafb;
          font-size: 14px;
        }

        .search-input::placeholder {
          color: #6b7280;
        }

        .search-input:focus {
          outline: none;
          border-color: #2563eb;
        }

        .language-list {
          max-height: 280px;
          overflow-y: auto;
          padding: 0 20px 20px;
        }

        .language-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 8px;
          cursor: pointer;
          margin-bottom: 8px;
          transition: all 0.2s ease;
        }

        .language-item:last-child {
          margin-bottom: 0;
        }

        .language-item:hover {
          border-color: #4b5563;
        }

        .language-item.selected {
          border-color: #2563eb;
          background: rgba(37, 99, 235, 0.1);
        }

        .language-flag {
          font-size: 24px;
          width: 32px;
          text-align: center;
        }

        .language-info {
          flex: 1;
        }

        .language-name {
          font-size: 14px;
          font-weight: 500;
          color: #f9fafb;
        }

        .language-native {
          font-size: 12px;
          color: #9ca3af;
        }

        .language-code {
          font-size: 11px;
          color: #6b7280;
          font-family: monospace;
          background: #111827;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .auto-detect {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: #1f2937;
          border-top: 1px solid #374151;
        }

        .auto-detect-label {
          font-size: 13px;
          color: #e5e7eb;
        }

        .auto-detect-desc {
          font-size: 11px;
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

        .no-results {
          text-align: center;
          padding: 24px;
          color: #6b7280;
        }
      `}</style>

      <div className="header">
        <h3 className="title">Language Settings</h3>
        {onClose && (
          <Button variant="ghost" size="small" onClick={onClose}>
            ×
          </Button>
        )}
      </div>

      <div className="current-selection">
        <div className="selection-card">
          <div className="selection-label">Input Language</div>
          <div className="selection-value">
            {selectedSpoken?.flag && (
              <span className="selection-flag">{FLAG_EMOJI[selectedSpoken.flag]}</span>
            )}
            <div className="selection-info">
              <div className="selection-name">{selectedSpoken?.name}</div>
              <div className="selection-native">{selectedSpoken?.nativeName}</div>
            </div>
          </div>
        </div>

        {showSignLanguages && (
          <div className="selection-card">
            <div className="selection-label">Sign Language</div>
            <div className="selection-value">
              {selectedSign?.flag && (
                <span className="selection-flag">{FLAG_EMOJI[selectedSign.flag]}</span>
              )}
              <div className="selection-info">
                <div className="selection-name">{selectedSign?.name}</div>
                <div className="selection-native">{selectedSign?.nativeName}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="tabs">
        <div
          className={`tab ${activeTab === 'spoken' ? 'active' : ''}`}
          onClick={() => setActiveTab('spoken')}
        >
          Spoken Languages
        </div>
        {showSignLanguages && (
          <div
            className={`tab ${activeTab === 'sign' ? 'active' : ''}`}
            onClick={() => setActiveTab('sign')}
          >
            Sign Languages
          </div>
        )}
      </div>

      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search languages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="language-list">
        {filteredLanguages.length === 0 ? (
          <div className="no-results">No languages found</div>
        ) : (
          filteredLanguages.map((lang) => (
            <div
              key={lang.code}
              className={`language-item ${
                (activeTab === 'spoken' ? preferences.spokenLanguage : preferences.signLanguage) ===
                lang.code
                  ? 'selected'
                  : ''
              }`}
              onClick={() => handleLanguageSelect(lang)}
            >
              <span className="language-flag">
                {lang.flag ? FLAG_EMOJI[lang.flag] : '🌐'}
              </span>
              <div className="language-info">
                <div className="language-name">{lang.name}</div>
                <div className="language-native">{lang.nativeName}</div>
              </div>
              <span className="language-code">{lang.code}</span>
            </div>
          ))
        )}
      </div>

      <div className="auto-detect">
        <div>
          <div className="auto-detect-label">Auto-detect language</div>
          <div className="auto-detect-desc">
            Automatically detect spoken language
          </div>
        </div>
        <div
          className={`toggle-switch ${preferences.autoDetect ? 'active' : ''}`}
          onClick={toggleAutoDetect}
        >
          <div className="toggle-knob" />
        </div>
      </div>
    </div>
  );
}

// Hook for using language preferences
export function useLanguagePreferences() {
  const [preferences, setPreferences] = useState<LanguagePreferences>(() =>
    loadPreferences()
  );

  const updatePreferences = useCallback((updates: Partial<LanguagePreferences>) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, ...updates };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, []);

  return {
    ...preferences,
    updatePreferences,
    spokenLanguageInfo: SPOKEN_LANGUAGES.find(
      (l) => l.code === preferences.spokenLanguage
    ),
    signLanguageInfo: SIGN_LANGUAGES.find(
      (l) => l.code === preferences.signLanguage
    ),
  };
}
