'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import {
  SpokenLanguageCode,
  SignLanguageCode,
  LocaleCode,
  SPOKEN_LANGUAGES,
  SIGN_LANGUAGES,
  LOCALES,
  DEFAULT_SPOKEN_LANGUAGE,
  DEFAULT_SIGN_LANGUAGE,
  DEFAULT_LOCALE,
  getSpokenLanguage,
  getSignLanguage,
  getLocale,
  getSpeechRecognitionCode,
} from './config';

/**
 * Language Context
 *
 * Provides language and locale settings throughout the application.
 */

interface LanguageContextValue {
  // Current settings
  spokenLanguage: SpokenLanguageCode;
  signLanguage: SignLanguageCode;
  locale: LocaleCode;

  // Derived values
  speechRecognitionCode: string;
  textDirection: 'ltr' | 'rtl';
  dateFormat: string;
  timeFormat: '12h' | '24h';

  // Language info
  spokenLanguageInfo: ReturnType<typeof getSpokenLanguage>;
  signLanguageInfo: ReturnType<typeof getSignLanguage>;
  localeInfo: ReturnType<typeof getLocale>;

  // Lists for selection
  availableSpokenLanguages: typeof SPOKEN_LANGUAGES;
  availableSignLanguages: typeof SIGN_LANGUAGES;
  availableLocales: typeof LOCALES;

  // Actions
  setSpokenLanguage: (code: SpokenLanguageCode) => void;
  setSignLanguage: (code: SignLanguageCode) => void;
  setLocale: (code: LocaleCode) => void;

  // Utilities
  formatNumber: (value: number, decimals?: number) => string;
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Storage key for persisting language preferences
const STORAGE_KEY = 'signmate-language-preferences';

interface StoredPreferences {
  spokenLanguage: SpokenLanguageCode;
  signLanguage: SignLanguageCode;
  locale: LocaleCode;
}

function loadPreferences(): Partial<StoredPreferences> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return {};
}

function savePreferences(prefs: StoredPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    // Ignore localStorage errors
  }
}

// Detect browser language
function detectBrowserLanguage(): SpokenLanguageCode {
  if (typeof window === 'undefined') return DEFAULT_SPOKEN_LANGUAGE;

  const browserLang = navigator.language.split('-')[0] as SpokenLanguageCode;
  if (SPOKEN_LANGUAGES[browserLang]) {
    return browserLang;
  }
  return DEFAULT_SPOKEN_LANGUAGE;
}

// Detect browser locale
function detectBrowserLocale(): LocaleCode {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const browserLocale = navigator.language as LocaleCode;
  if (LOCALES[browserLocale]) {
    return browserLocale;
  }

  // Try to find a matching locale for the language
  const browserLang = navigator.language.split('-')[0] as SpokenLanguageCode;
  const matchingLocale = Object.values(LOCALES).find(
    (locale) => locale.language === browserLang
  );
  return matchingLocale?.code || DEFAULT_LOCALE;
}

interface LanguageProviderProps {
  children: React.ReactNode;
  defaultSpokenLanguage?: SpokenLanguageCode;
  defaultSignLanguage?: SignLanguageCode;
  defaultLocale?: LocaleCode;
  detectFromBrowser?: boolean;
}

export function LanguageProvider({
  children,
  defaultSpokenLanguage,
  defaultSignLanguage,
  defaultLocale,
  detectFromBrowser = true,
}: LanguageProviderProps) {
  // Load initial state from storage or defaults
  const [spokenLanguage, setSpokenLanguageState] = useState<SpokenLanguageCode>(() => {
    const stored = loadPreferences();
    if (stored.spokenLanguage && SPOKEN_LANGUAGES[stored.spokenLanguage]) {
      return stored.spokenLanguage;
    }
    if (defaultSpokenLanguage) return defaultSpokenLanguage;
    if (detectFromBrowser) return detectBrowserLanguage();
    return DEFAULT_SPOKEN_LANGUAGE;
  });

  const [signLanguage, setSignLanguageState] = useState<SignLanguageCode>(() => {
    const stored = loadPreferences();
    if (stored.signLanguage && SIGN_LANGUAGES[stored.signLanguage]) {
      return stored.signLanguage;
    }
    return defaultSignLanguage || DEFAULT_SIGN_LANGUAGE;
  });

  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    const stored = loadPreferences();
    if (stored.locale && LOCALES[stored.locale]) {
      return stored.locale;
    }
    if (defaultLocale) return defaultLocale;
    if (detectFromBrowser) return detectBrowserLocale();
    return DEFAULT_LOCALE;
  });

  // Setters that also persist to storage
  const setSpokenLanguage = useCallback((code: SpokenLanguageCode) => {
    if (!SPOKEN_LANGUAGES[code]) {
      console.warn(`Unknown spoken language code: ${code}`);
      return;
    }
    setSpokenLanguageState(code);
    const stored = loadPreferences();
    savePreferences({ ...stored, spokenLanguage: code } as StoredPreferences);
  }, []);

  const setSignLanguage = useCallback((code: SignLanguageCode) => {
    if (!SIGN_LANGUAGES[code]) {
      console.warn(`Unknown sign language code: ${code}`);
      return;
    }
    setSignLanguageState(code);
    const stored = loadPreferences();
    savePreferences({ ...stored, signLanguage: code } as StoredPreferences);
  }, []);

  const setLocale = useCallback((code: LocaleCode) => {
    if (!LOCALES[code]) {
      console.warn(`Unknown locale code: ${code}`);
      return;
    }
    setLocaleState(code);
    const stored = loadPreferences();
    savePreferences({ ...stored, locale: code } as StoredPreferences);
  }, []);

  // Derived values
  const spokenLanguageInfo = useMemo(() => getSpokenLanguage(spokenLanguage), [spokenLanguage]);
  const signLanguageInfo = useMemo(() => getSignLanguage(signLanguage), [signLanguage]);
  const localeInfo = useMemo(() => getLocale(locale), [locale]);
  const speechRecognitionCode = useMemo(() => getSpeechRecognitionCode(locale), [locale]);

  // Formatting utilities
  const formatNumber = useCallback(
    (value: number, decimals = 0) => {
      const { decimal, thousands } = localeInfo.numberFormat;
      const fixed = value.toFixed(decimals);
      const [intPart, decPart] = fixed.split('.');

      // Add thousands separators
      const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);

      if (decPart && decimals > 0) {
        return `${withThousands}${decimal}${decPart}`;
      }
      return withThousands;
    },
    [localeInfo]
  );

  const formatDate = useCallback(
    (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString();

      return localeInfo.dateFormat
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year);
    },
    [localeInfo]
  );

  const formatTime = useCallback(
    (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');

      if (localeInfo.timeFormat === '12h') {
        const period = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes} ${period}`;
      }
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    },
    [localeInfo]
  );

  // Update document direction for RTL languages
  useEffect(() => {
    document.documentElement.dir = spokenLanguageInfo.direction;
    document.documentElement.lang = spokenLanguage;
  }, [spokenLanguage, spokenLanguageInfo.direction]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      spokenLanguage,
      signLanguage,
      locale,
      speechRecognitionCode,
      textDirection: spokenLanguageInfo.direction,
      dateFormat: localeInfo.dateFormat,
      timeFormat: localeInfo.timeFormat,
      spokenLanguageInfo,
      signLanguageInfo,
      localeInfo,
      availableSpokenLanguages: SPOKEN_LANGUAGES,
      availableSignLanguages: SIGN_LANGUAGES,
      availableLocales: LOCALES,
      setSpokenLanguage,
      setSignLanguage,
      setLocale,
      formatNumber,
      formatDate,
      formatTime,
    }),
    [
      spokenLanguage,
      signLanguage,
      locale,
      speechRecognitionCode,
      spokenLanguageInfo,
      signLanguageInfo,
      localeInfo,
      setSpokenLanguage,
      setSignLanguage,
      setLocale,
      formatNumber,
      formatDate,
      formatTime,
    ]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access language context
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

/**
 * Hook for just getting the speech recognition code
 */
export function useSpeechRecognitionLanguage(): string {
  const { speechRecognitionCode } = useLanguage();
  return speechRecognitionCode;
}

/**
 * Hook for formatting utilities
 */
export function useFormatters() {
  const { formatNumber, formatDate, formatTime, dateFormat, timeFormat } = useLanguage();
  return { formatNumber, formatDate, formatTime, dateFormat, timeFormat };
}
