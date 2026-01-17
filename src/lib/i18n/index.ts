export {
  SPOKEN_LANGUAGES,
  SIGN_LANGUAGES,
  LOCALES,
  DEFAULT_SPOKEN_LANGUAGE,
  DEFAULT_SIGN_LANGUAGE,
  DEFAULT_LOCALE,
  getSpokenLanguage,
  getSignLanguage,
  getLocale,
  getLocalesForLanguage,
  getSignLanguagesForSpoken,
  getSpeechRecognitionCode,
  type SpokenLanguageCode,
  type SignLanguageCode,
  type LocaleCode,
  type SpokenLanguage,
  type SignLanguage,
  type Locale,
} from './config';

export {
  LanguageProvider,
  useLanguage,
  useSpeechRecognitionLanguage,
  useFormatters,
} from './LanguageContext';
