export {
  settingsManager,
  getSettings,
  getSetting,
  updateSettings,
  DEFAULT_SETTINGS,
  type SignMateSettings,
  type GeneralSettings,
  type AudioSettings,
  type SpeechSettings,
  type TranslationSettings,
  type AvatarSettings,
  type DisplaySettings,
  type PerformanceSettings,
  type AccessibilitySettings,
} from './settings';

// Runtime Configuration
export {
  RuntimeConfig,
  getRuntimeConfig,
  createRuntimeConfig,
  initSignMateConfig,
  SIGNMATE_CONFIG_SCHEMAS,
  type ConfigValue,
  type ConfigSchema,
  type ConfigChangeEvent,
  type ConfigListener,
  type RuntimeConfigOptions,
} from './runtimeConfig';

export {
  useConfig,
  useConfigValue,
  useConfigValues,
  useConfigCategory,
  useConfigSchemas,
  useConfigWatcher,
  useConfigWithValidation,
  useConfigToggle,
  useConfigNumber,
  useConfigEnum,
  useConfigReset,
  useConfigExport,
} from './useConfig';
