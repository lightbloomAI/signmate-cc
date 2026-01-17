/**
 * Runtime Configuration System for SignMate
 *
 * Provides dynamic configuration management with validation,
 * persistence, and reactive updates.
 */

/**
 * Configuration value types
 */
export type ConfigValue = string | number | boolean | string[] | Record<string, unknown>;

/**
 * Configuration schema for validation
 */
export interface ConfigSchema {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default: ConfigValue;
  required?: boolean;
  validate?: (value: ConfigValue) => boolean;
  description?: string;
  category?: string;
  min?: number;
  max?: number;
  enum?: ConfigValue[];
}

/**
 * Configuration change event
 */
export interface ConfigChangeEvent {
  key: string;
  oldValue: ConfigValue;
  newValue: ConfigValue;
  source: 'user' | 'system' | 'remote' | 'default';
  timestamp: number;
}

/**
 * Configuration listener
 */
export type ConfigListener = (event: ConfigChangeEvent) => void;

/**
 * Runtime config options
 */
export interface RuntimeConfigOptions {
  namespace: string;
  persistToStorage?: boolean;
  syncWithRemote?: boolean;
  remoteEndpoint?: string;
  syncInterval?: number;
  onError?: (error: Error) => void;
}

const DEFAULT_OPTIONS: RuntimeConfigOptions = {
  namespace: 'signmate',
  persistToStorage: true,
  syncWithRemote: false,
  syncInterval: 60000,
};

/**
 * Runtime Configuration Manager
 *
 * Manages dynamic configuration with validation, persistence, and reactive updates.
 */
export class RuntimeConfig {
  private options: RuntimeConfigOptions;
  private schemas = new Map<string, ConfigSchema>();
  private values = new Map<string, ConfigValue>();
  private listeners = new Map<string, Set<ConfigListener>>();
  private globalListeners = new Set<ConfigListener>();
  private history: ConfigChangeEvent[] = [];
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: Partial<RuntimeConfigOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.loadFromStorage();

    if (this.options.syncWithRemote) {
      this.startRemoteSync();
    }
  }

  /**
   * Register a configuration schema
   */
  register(schema: ConfigSchema | ConfigSchema[]): void {
    const schemas = Array.isArray(schema) ? schema : [schema];

    for (const s of schemas) {
      this.schemas.set(s.key, s);

      // Set default value if not already set
      if (!this.values.has(s.key)) {
        this.values.set(s.key, s.default);
      }
    }
  }

  /**
   * Get a configuration value
   */
  get<T extends ConfigValue>(key: string): T {
    const value = this.values.get(key);
    if (value !== undefined) {
      return value as T;
    }

    const schema = this.schemas.get(key);
    if (schema) {
      return schema.default as T;
    }

    throw new Error(`Configuration key '${key}' not found`);
  }

  /**
   * Get a configuration value with fallback
   */
  getOrDefault<T extends ConfigValue>(key: string, defaultValue: T): T {
    try {
      return this.get<T>(key);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Set a configuration value
   */
  set(key: string, value: ConfigValue, source: ConfigChangeEvent['source'] = 'user'): boolean {
    const schema = this.schemas.get(key);

    // Validate against schema if exists
    if (schema) {
      if (!this.validateValue(value, schema)) {
        this.options.onError?.(
          new Error(`Invalid value for '${key}': validation failed`)
        );
        return false;
      }
    }

    const oldValue = this.values.get(key);
    if (oldValue === value) {
      return true; // No change
    }

    this.values.set(key, value);

    // Create change event
    const event: ConfigChangeEvent = {
      key,
      oldValue: oldValue ?? (schema?.default ?? null as unknown as ConfigValue),
      newValue: value,
      source,
      timestamp: Date.now(),
    };

    // Add to history
    this.history.push(event);
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }

    // Notify listeners
    this.notifyListeners(event);

    // Persist to storage
    if (this.options.persistToStorage) {
      this.saveToStorage();
    }

    return true;
  }

  /**
   * Set multiple configuration values
   */
  setMany(values: Record<string, ConfigValue>, source: ConfigChangeEvent['source'] = 'user'): boolean {
    let allSuccess = true;

    for (const [key, value] of Object.entries(values)) {
      if (!this.set(key, value, source)) {
        allSuccess = false;
      }
    }

    return allSuccess;
  }

  /**
   * Reset a configuration to default
   */
  reset(key: string): void {
    const schema = this.schemas.get(key);
    if (schema) {
      this.set(key, schema.default, 'system');
    }
  }

  /**
   * Reset all configurations to defaults
   */
  resetAll(): void {
    for (const [key, schema] of this.schemas) {
      this.set(key, schema.default, 'system');
    }
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    return this.schemas.has(key) || this.values.has(key);
  }

  /**
   * Delete a configuration
   */
  delete(key: string): boolean {
    const schema = this.schemas.get(key);
    if (schema?.required) {
      return false;
    }

    this.values.delete(key);
    this.saveToStorage();
    return true;
  }

  /**
   * Get all configuration values
   */
  getAll(): Record<string, ConfigValue> {
    const result: Record<string, ConfigValue> = {};

    for (const [key] of this.schemas) {
      result[key] = this.get(key);
    }

    return result;
  }

  /**
   * Get configurations by category
   */
  getByCategory(category: string): Record<string, ConfigValue> {
    const result: Record<string, ConfigValue> = {};

    for (const [key, schema] of this.schemas) {
      if (schema.category === category) {
        result[key] = this.get(key);
      }
    }

    return result;
  }

  /**
   * Get all schemas
   */
  getSchemas(): ConfigSchema[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Get schema by key
   */
  getSchema(key: string): ConfigSchema | undefined {
    return this.schemas.get(key);
  }

  /**
   * Validate a value against a schema
   */
  private validateValue(value: ConfigValue, schema: ConfigSchema): boolean {
    // Type check
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type && schema.type !== 'object') {
      return false;
    }

    // Custom validation
    if (schema.validate && !schema.validate(value)) {
      return false;
    }

    // Range check for numbers
    if (schema.type === 'number') {
      const num = value as number;
      if (schema.min !== undefined && num < schema.min) return false;
      if (schema.max !== undefined && num > schema.max) return false;
    }

    // Enum check
    if (schema.enum && !schema.enum.includes(value)) {
      return false;
    }

    return true;
  }

  /**
   * Subscribe to changes for a specific key
   */
  onChange(key: string, listener: ConfigListener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);

    return () => {
      this.listeners.get(key)?.delete(listener);
    };
  }

  /**
   * Subscribe to all changes
   */
  onAnyChange(listener: ConfigListener): () => void {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  /**
   * Notify listeners of a change
   */
  private notifyListeners(event: ConfigChangeEvent): void {
    // Key-specific listeners
    this.listeners.get(event.key)?.forEach((listener) => listener(event));

    // Global listeners
    this.globalListeners.forEach((listener) => listener(event));
  }

  /**
   * Get change history
   */
  getHistory(): ConfigChangeEvent[] {
    return [...this.history];
  }

  /**
   * Save to local storage
   */
  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data: Record<string, ConfigValue> = {};
      for (const [key, value] of this.values) {
        data[key] = value;
      }
      localStorage.setItem(
        `${this.options.namespace}_config`,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('[RuntimeConfig] Failed to save to storage:', error);
    }
  }

  /**
   * Load from local storage
   */
  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const raw = localStorage.getItem(`${this.options.namespace}_config`);
      if (raw) {
        const data = JSON.parse(raw);
        for (const [key, value] of Object.entries(data)) {
          this.values.set(key, value as ConfigValue);
        }
      }
    } catch (error) {
      console.error('[RuntimeConfig] Failed to load from storage:', error);
    }
  }

  /**
   * Start remote sync
   */
  private startRemoteSync(): void {
    if (!this.options.remoteEndpoint) return;

    this.syncTimer = setInterval(
      () => this.syncWithRemote(),
      this.options.syncInterval
    );
  }

  /**
   * Stop remote sync
   */
  stopRemoteSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Sync with remote endpoint
   */
  async syncWithRemote(): Promise<void> {
    if (!this.options.remoteEndpoint) return;

    try {
      const response = await fetch(this.options.remoteEndpoint);
      if (response.ok) {
        const remoteConfig = await response.json();
        this.setMany(remoteConfig, 'remote');
      }
    } catch (error) {
      console.error('[RuntimeConfig] Remote sync failed:', error);
    }
  }

  /**
   * Export configuration
   */
  export(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  /**
   * Import configuration
   */
  import(json: string, source: ConfigChangeEvent['source'] = 'user'): boolean {
    try {
      const data = JSON.parse(json);
      return this.setMany(data, source);
    } catch {
      return false;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopRemoteSync();
    this.listeners.clear();
    this.globalListeners.clear();
  }
}

// Singleton instance
let runtimeConfig: RuntimeConfig | null = null;

/**
 * Get the singleton RuntimeConfig
 */
export function getRuntimeConfig(): RuntimeConfig {
  if (!runtimeConfig) {
    runtimeConfig = new RuntimeConfig();
  }
  return runtimeConfig;
}

/**
 * Create a new RuntimeConfig with custom options
 */
export function createRuntimeConfig(
  options?: Partial<RuntimeConfigOptions>
): RuntimeConfig {
  runtimeConfig = new RuntimeConfig(options);
  return runtimeConfig;
}

// ==================== DEFAULT SCHEMAS ====================

/**
 * SignMate default configuration schemas
 */
export const SIGNMATE_CONFIG_SCHEMAS: ConfigSchema[] = [
  // Pipeline settings
  {
    key: 'pipeline.autoStart',
    type: 'boolean',
    default: false,
    description: 'Automatically start pipeline on page load',
    category: 'pipeline',
  },
  {
    key: 'pipeline.bufferSize',
    type: 'number',
    default: 4096,
    min: 1024,
    max: 16384,
    description: 'Audio buffer size for processing',
    category: 'pipeline',
  },
  {
    key: 'pipeline.sampleRate',
    type: 'number',
    default: 16000,
    enum: [8000, 16000, 22050, 44100, 48000],
    description: 'Audio sample rate',
    category: 'pipeline',
  },

  // Avatar settings
  {
    key: 'avatar.quality',
    type: 'string',
    default: 'medium',
    enum: ['low', 'medium', 'high'],
    description: 'Avatar rendering quality',
    category: 'avatar',
  },
  {
    key: 'avatar.signSpeed',
    type: 'number',
    default: 1.0,
    min: 0.5,
    max: 2.0,
    description: 'Sign animation playback speed',
    category: 'avatar',
  },
  {
    key: 'avatar.showExpressions',
    type: 'boolean',
    default: true,
    description: 'Enable facial expressions',
    category: 'avatar',
  },

  // Caption settings
  {
    key: 'captions.enabled',
    type: 'boolean',
    default: true,
    description: 'Show captions',
    category: 'captions',
  },
  {
    key: 'captions.fontSize',
    type: 'number',
    default: 24,
    min: 12,
    max: 72,
    description: 'Caption font size in pixels',
    category: 'captions',
  },
  {
    key: 'captions.position',
    type: 'string',
    default: 'bottom',
    enum: ['top', 'bottom'],
    description: 'Caption position',
    category: 'captions',
  },

  // Accessibility settings
  {
    key: 'a11y.reduceMotion',
    type: 'boolean',
    default: false,
    description: 'Reduce animations for motion sensitivity',
    category: 'accessibility',
  },
  {
    key: 'a11y.highContrast',
    type: 'boolean',
    default: false,
    description: 'Enable high contrast mode',
    category: 'accessibility',
  },
  {
    key: 'a11y.screenReaderMode',
    type: 'boolean',
    default: false,
    description: 'Optimize for screen readers',
    category: 'accessibility',
  },

  // Performance settings
  {
    key: 'perf.adaptiveQuality',
    type: 'boolean',
    default: true,
    description: 'Automatically adjust quality based on performance',
    category: 'performance',
  },
  {
    key: 'perf.targetFPS',
    type: 'number',
    default: 60,
    enum: [30, 45, 60],
    description: 'Target frame rate',
    category: 'performance',
  },
];

/**
 * Initialize SignMate configuration
 */
export function initSignMateConfig(): RuntimeConfig {
  const config = getRuntimeConfig();
  config.register(SIGNMATE_CONFIG_SCHEMAS);
  return config;
}
