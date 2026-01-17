/**
 * Internationalization Configuration
 *
 * Defines supported languages, locales, and sign language variants.
 */

// Spoken language codes (ISO 639-1)
export type SpokenLanguageCode =
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'it' // Italian
  | 'pt' // Portuguese
  | 'nl' // Dutch
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'zh' // Chinese
  | 'ar' // Arabic
  | 'ru'; // Russian

// Sign language codes
export type SignLanguageCode =
  | 'ASL' // American Sign Language
  | 'BSL' // British Sign Language
  | 'LSE' // Spanish Sign Language (Lengua de Signos Española)
  | 'LSF' // French Sign Language (Langue des Signes Française)
  | 'DGS' // German Sign Language (Deutsche Gebärdensprache)
  | 'LIS' // Italian Sign Language (Lingua dei Segni Italiana)
  | 'LGP' // Portuguese Sign Language (Língua Gestual Portuguesa)
  | 'NGT' // Dutch Sign Language (Nederlandse Gebarentaal)
  | 'JSL' // Japanese Sign Language (日本手話)
  | 'KSL' // Korean Sign Language (한국 수어)
  | 'CSL' // Chinese Sign Language (中国手语)
  | 'ArSL' // Arabic Sign Language
  | 'RSL' // Russian Sign Language
  | 'Auslan' // Australian Sign Language
  | 'NZSL'; // New Zealand Sign Language

// Locale codes (language-region)
export type LocaleCode =
  | 'en-US'
  | 'en-GB'
  | 'en-AU'
  | 'en-NZ'
  | 'es-ES'
  | 'es-MX'
  | 'es-AR'
  | 'fr-FR'
  | 'fr-CA'
  | 'de-DE'
  | 'de-AT'
  | 'de-CH'
  | 'it-IT'
  | 'pt-BR'
  | 'pt-PT'
  | 'nl-NL'
  | 'ja-JP'
  | 'ko-KR'
  | 'zh-CN'
  | 'zh-TW'
  | 'ar-SA'
  | 'ru-RU';

export interface SpokenLanguage {
  code: SpokenLanguageCode;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  defaultLocale: LocaleCode;
  speechRecognitionCode?: string; // Code used by speech recognition APIs
}

export interface SignLanguage {
  code: SignLanguageCode;
  name: string;
  nativeName: string;
  region: string;
  associatedSpoken: SpokenLanguageCode[];
}

export interface Locale {
  code: LocaleCode;
  language: SpokenLanguageCode;
  region: string;
  name: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  numberFormat: {
    decimal: string;
    thousands: string;
  };
}

// Spoken languages configuration
export const SPOKEN_LANGUAGES: Record<SpokenLanguageCode, SpokenLanguage> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    defaultLocale: 'en-US',
    speechRecognitionCode: 'en-US',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    defaultLocale: 'es-ES',
    speechRecognitionCode: 'es-ES',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    defaultLocale: 'fr-FR',
    speechRecognitionCode: 'fr-FR',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    defaultLocale: 'de-DE',
    speechRecognitionCode: 'de-DE',
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    direction: 'ltr',
    defaultLocale: 'it-IT',
    speechRecognitionCode: 'it-IT',
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    defaultLocale: 'pt-BR',
    speechRecognitionCode: 'pt-BR',
  },
  nl: {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    direction: 'ltr',
    defaultLocale: 'nl-NL',
    speechRecognitionCode: 'nl-NL',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    defaultLocale: 'ja-JP',
    speechRecognitionCode: 'ja-JP',
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    direction: 'ltr',
    defaultLocale: 'ko-KR',
    speechRecognitionCode: 'ko-KR',
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    direction: 'ltr',
    defaultLocale: 'zh-CN',
    speechRecognitionCode: 'zh-CN',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    defaultLocale: 'ar-SA',
    speechRecognitionCode: 'ar-SA',
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    defaultLocale: 'ru-RU',
    speechRecognitionCode: 'ru-RU',
  },
};

// Sign languages configuration
export const SIGN_LANGUAGES: Record<SignLanguageCode, SignLanguage> = {
  ASL: {
    code: 'ASL',
    name: 'American Sign Language',
    nativeName: 'American Sign Language',
    region: 'United States, Canada',
    associatedSpoken: ['en', 'es', 'fr'],
  },
  BSL: {
    code: 'BSL',
    name: 'British Sign Language',
    nativeName: 'British Sign Language',
    region: 'United Kingdom',
    associatedSpoken: ['en'],
  },
  LSE: {
    code: 'LSE',
    name: 'Spanish Sign Language',
    nativeName: 'Lengua de Signos Española',
    region: 'Spain',
    associatedSpoken: ['es'],
  },
  LSF: {
    code: 'LSF',
    name: 'French Sign Language',
    nativeName: 'Langue des Signes Française',
    region: 'France',
    associatedSpoken: ['fr'],
  },
  DGS: {
    code: 'DGS',
    name: 'German Sign Language',
    nativeName: 'Deutsche Gebärdensprache',
    region: 'Germany, Austria',
    associatedSpoken: ['de'],
  },
  LIS: {
    code: 'LIS',
    name: 'Italian Sign Language',
    nativeName: 'Lingua dei Segni Italiana',
    region: 'Italy',
    associatedSpoken: ['it'],
  },
  LGP: {
    code: 'LGP',
    name: 'Portuguese Sign Language',
    nativeName: 'Língua Gestual Portuguesa',
    region: 'Portugal',
    associatedSpoken: ['pt'],
  },
  NGT: {
    code: 'NGT',
    name: 'Dutch Sign Language',
    nativeName: 'Nederlandse Gebarentaal',
    region: 'Netherlands',
    associatedSpoken: ['nl'],
  },
  JSL: {
    code: 'JSL',
    name: 'Japanese Sign Language',
    nativeName: '日本手話',
    region: 'Japan',
    associatedSpoken: ['ja'],
  },
  KSL: {
    code: 'KSL',
    name: 'Korean Sign Language',
    nativeName: '한국 수어',
    region: 'South Korea',
    associatedSpoken: ['ko'],
  },
  CSL: {
    code: 'CSL',
    name: 'Chinese Sign Language',
    nativeName: '中国手语',
    region: 'China',
    associatedSpoken: ['zh'],
  },
  ArSL: {
    code: 'ArSL',
    name: 'Arabic Sign Language',
    nativeName: 'لغة الإشارة العربية',
    region: 'Middle East',
    associatedSpoken: ['ar'],
  },
  RSL: {
    code: 'RSL',
    name: 'Russian Sign Language',
    nativeName: 'Русский жестовый язык',
    region: 'Russia',
    associatedSpoken: ['ru'],
  },
  Auslan: {
    code: 'Auslan',
    name: 'Australian Sign Language',
    nativeName: 'Auslan',
    region: 'Australia',
    associatedSpoken: ['en'],
  },
  NZSL: {
    code: 'NZSL',
    name: 'New Zealand Sign Language',
    nativeName: 'New Zealand Sign Language',
    region: 'New Zealand',
    associatedSpoken: ['en'],
  },
};

// Locales configuration
export const LOCALES: Record<LocaleCode, Locale> = {
  'en-US': {
    code: 'en-US',
    language: 'en',
    region: 'United States',
    name: 'English (US)',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    numberFormat: { decimal: '.', thousands: ',' },
  },
  'en-GB': {
    code: 'en-GB',
    language: 'en',
    region: 'United Kingdom',
    name: 'English (UK)',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: { decimal: '.', thousands: ',' },
  },
  'en-AU': {
    code: 'en-AU',
    language: 'en',
    region: 'Australia',
    name: 'English (Australia)',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    numberFormat: { decimal: '.', thousands: ',' },
  },
  'en-NZ': {
    code: 'en-NZ',
    language: 'en',
    region: 'New Zealand',
    name: 'English (New Zealand)',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    numberFormat: { decimal: '.', thousands: ',' },
  },
  'es-ES': {
    code: 'es-ES',
    language: 'es',
    region: 'Spain',
    name: 'Español (España)',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: { decimal: ',', thousands: '.' },
  },
  'es-MX': {
    code: 'es-MX',
    language: 'es',
    region: 'Mexico',
    name: 'Español (México)',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    numberFormat: { decimal: '.', thousands: ',' },
  },
  'es-AR': {
    code: 'es-AR',
    language: 'es',
    region: 'Argentina',
    name: 'Español (Argentina)',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: { decimal: ',', thousands: '.' },
  },
  'fr-FR': {
    code: 'fr-FR',
    language: 'fr',
    region: 'France',
    name: 'Français (France)',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: { decimal: ',', thousands: ' ' },
  },
  'fr-CA': {
    code: 'fr-CA',
    language: 'fr',
    region: 'Canada',
    name: 'Français (Canada)',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    numberFormat: { decimal: ',', thousands: ' ' },
  },
  'de-DE': {
    code: 'de-DE',
    language: 'de',
    region: 'Germany',
    name: 'Deutsch (Deutschland)',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
    numberFormat: { decimal: ',', thousands: '.' },
  },
  'de-AT': {
    code: 'de-AT',
    language: 'de',
    region: 'Austria',
    name: 'Deutsch (Österreich)',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
    numberFormat: { decimal: ',', thousands: '.' },
  },
  'de-CH': {
    code: 'de-CH',
    language: 'de',
    region: 'Switzerland',
    name: 'Deutsch (Schweiz)',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
    numberFormat: { decimal: '.', thousands: "'" },
  },
  'it-IT': {
    code: 'it-IT',
    language: 'it',
    region: 'Italy',
    name: 'Italiano (Italia)',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: { decimal: ',', thousands: '.' },
  },
  'pt-BR': {
    code: 'pt-BR',
    language: 'pt',
    region: 'Brazil',
    name: 'Português (Brasil)',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: { decimal: ',', thousands: '.' },
  },
  'pt-PT': {
    code: 'pt-PT',
    language: 'pt',
    region: 'Portugal',
    name: 'Português (Portugal)',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: { decimal: ',', thousands: ' ' },
  },
  'nl-NL': {
    code: 'nl-NL',
    language: 'nl',
    region: 'Netherlands',
    name: 'Nederlands (Nederland)',
    dateFormat: 'DD-MM-YYYY',
    timeFormat: '24h',
    numberFormat: { decimal: ',', thousands: '.' },
  },
  'ja-JP': {
    code: 'ja-JP',
    language: 'ja',
    region: 'Japan',
    name: '日本語 (日本)',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: '24h',
    numberFormat: { decimal: '.', thousands: ',' },
  },
  'ko-KR': {
    code: 'ko-KR',
    language: 'ko',
    region: 'South Korea',
    name: '한국어 (대한민국)',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    numberFormat: { decimal: '.', thousands: ',' },
  },
  'zh-CN': {
    code: 'zh-CN',
    language: 'zh',
    region: 'China',
    name: '中文 (中国)',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    numberFormat: { decimal: '.', thousands: ',' },
  },
  'zh-TW': {
    code: 'zh-TW',
    language: 'zh',
    region: 'Taiwan',
    name: '中文 (台灣)',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: '12h',
    numberFormat: { decimal: '.', thousands: ',' },
  },
  'ar-SA': {
    code: 'ar-SA',
    language: 'ar',
    region: 'Saudi Arabia',
    name: 'العربية (السعودية)',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    numberFormat: { decimal: '٫', thousands: '٬' },
  },
  'ru-RU': {
    code: 'ru-RU',
    language: 'ru',
    region: 'Russia',
    name: 'Русский (Россия)',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
    numberFormat: { decimal: ',', thousands: ' ' },
  },
};

// Default configuration
export const DEFAULT_SPOKEN_LANGUAGE: SpokenLanguageCode = 'en';
export const DEFAULT_SIGN_LANGUAGE: SignLanguageCode = 'ASL';
export const DEFAULT_LOCALE: LocaleCode = 'en-US';

// Helper functions
export function getSpokenLanguage(code: SpokenLanguageCode): SpokenLanguage {
  return SPOKEN_LANGUAGES[code];
}

export function getSignLanguage(code: SignLanguageCode): SignLanguage {
  return SIGN_LANGUAGES[code];
}

export function getLocale(code: LocaleCode): Locale {
  return LOCALES[code];
}

export function getLocalesForLanguage(language: SpokenLanguageCode): Locale[] {
  return Object.values(LOCALES).filter((locale) => locale.language === language);
}

export function getSignLanguagesForSpoken(spoken: SpokenLanguageCode): SignLanguage[] {
  return Object.values(SIGN_LANGUAGES).filter((sl) =>
    sl.associatedSpoken.includes(spoken)
  );
}

export function getSpeechRecognitionCode(locale: LocaleCode): string {
  const language = LOCALES[locale].language;
  return SPOKEN_LANGUAGES[language].speechRecognitionCode || locale;
}
