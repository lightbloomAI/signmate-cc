'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getRuntimeConfig,
  type ConfigValue,
  type ConfigSchema,
  type ConfigChangeEvent,
} from './runtimeConfig';

/**
 * Hook to get and set a configuration value
 */
export function useConfig<T extends ConfigValue>(
  key: string,
  defaultValue?: T
): [T, (value: T) => void] {
  const config = getRuntimeConfig();

  const [value, setValue] = useState<T>(() => {
    try {
      return config.get<T>(key);
    } catch {
      return defaultValue as T;
    }
  });

  useEffect(() => {
    return config.onChange(key, (event) => {
      setValue(event.newValue as T);
    });
  }, [config, key]);

  const setConfigValue = useCallback(
    (newValue: T) => {
      config.set(key, newValue);
    },
    [config, key]
  );

  return [value, setConfigValue];
}

/**
 * Hook to get a configuration value (read-only)
 */
export function useConfigValue<T extends ConfigValue>(key: string): T | undefined {
  const config = getRuntimeConfig();
  const [value, setValue] = useState<T | undefined>(() => {
    try {
      return config.get<T>(key);
    } catch {
      return undefined;
    }
  });

  useEffect(() => {
    return config.onChange(key, (event) => {
      setValue(event.newValue as T);
    });
  }, [config, key]);

  return value;
}

/**
 * Hook to get multiple configuration values
 */
export function useConfigValues(keys: string[]): Record<string, ConfigValue> {
  const config = getRuntimeConfig();

  const [values, setValues] = useState<Record<string, ConfigValue>>(() => {
    const result: Record<string, ConfigValue> = {};
    for (const key of keys) {
      try {
        result[key] = config.get(key);
      } catch {
        // Skip missing keys
      }
    }
    return result;
  });

  useEffect(() => {
    const unsubscribes = keys.map((key) =>
      config.onChange(key, (event) => {
        setValues((prev) => ({ ...prev, [key]: event.newValue }));
      })
    );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [config, keys]);

  return values;
}

/**
 * Hook to get all configurations in a category
 */
export function useConfigCategory(category: string): Record<string, ConfigValue> {
  const config = getRuntimeConfig();

  const [values, setValues] = useState<Record<string, ConfigValue>>(() =>
    config.getByCategory(category)
  );

  useEffect(() => {
    return config.onAnyChange((event) => {
      const schema = config.getSchema(event.key);
      if (schema?.category === category) {
        setValues(config.getByCategory(category));
      }
    });
  }, [config, category]);

  return values;
}

/**
 * Hook to get configuration schemas
 */
export function useConfigSchemas(category?: string): ConfigSchema[] {
  const config = getRuntimeConfig();

  return useMemo(() => {
    const schemas = config.getSchemas();
    if (category) {
      return schemas.filter((s) => s.category === category);
    }
    return schemas;
  }, [config, category]);
}

/**
 * Hook to watch configuration changes
 */
export function useConfigWatcher(
  keys?: string[],
  callback?: (event: ConfigChangeEvent) => void
): ConfigChangeEvent[] {
  const config = getRuntimeConfig();
  const [changes, setChanges] = useState<ConfigChangeEvent[]>([]);

  useEffect(() => {
    const handleChange = (event: ConfigChangeEvent) => {
      if (!keys || keys.includes(event.key)) {
        setChanges((prev) => [...prev.slice(-99), event]);
        callback?.(event);
      }
    };

    return config.onAnyChange(handleChange);
  }, [config, keys, callback]);

  return changes;
}

/**
 * Hook for configuration with validation feedback
 */
export function useConfigWithValidation<T extends ConfigValue>(
  key: string
): {
  value: T | undefined;
  setValue: (value: T) => boolean;
  isValid: boolean;
  error: string | null;
  schema: ConfigSchema | undefined;
} {
  const config = getRuntimeConfig();
  const [value, setValue] = useState<T | undefined>(() => {
    try {
      return config.get<T>(key);
    } catch {
      return undefined;
    }
  });
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(() => config.getSchema(key), [config, key]);

  useEffect(() => {
    return config.onChange(key, (event) => {
      setValue(event.newValue as T);
      setIsValid(true);
      setError(null);
    });
  }, [config, key]);

  const setConfigValue = useCallback(
    (newValue: T): boolean => {
      const success = config.set(key, newValue);
      if (!success) {
        setIsValid(false);
        setError(`Invalid value for '${key}'`);
      }
      return success;
    },
    [config, key]
  );

  return { value, setValue: setConfigValue, isValid, error, schema };
}

/**
 * Hook for boolean configuration toggle
 */
export function useConfigToggle(key: string): {
  enabled: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
} {
  const [value, setValue] = useConfig<boolean>(key, false);

  const toggle = useCallback(() => {
    setValue(!value);
  }, [value, setValue]);

  const enable = useCallback(() => {
    setValue(true);
  }, [setValue]);

  const disable = useCallback(() => {
    setValue(false);
  }, [setValue]);

  return { enabled: value, toggle, enable, disable };
}

/**
 * Hook for numeric configuration with increment/decrement
 */
export function useConfigNumber(key: string): {
  value: number;
  setValue: (value: number) => void;
  increment: (amount?: number) => void;
  decrement: (amount?: number) => void;
  min?: number;
  max?: number;
} {
  const config = getRuntimeConfig();
  const [value, setValue] = useConfig<number>(key, 0);
  const schema = useMemo(() => config.getSchema(key), [config, key]);

  const increment = useCallback(
    (amount = 1) => {
      const newValue = value + amount;
      if (schema?.max === undefined || newValue <= schema.max) {
        setValue(newValue);
      }
    },
    [value, setValue, schema]
  );

  const decrement = useCallback(
    (amount = 1) => {
      const newValue = value - amount;
      if (schema?.min === undefined || newValue >= schema.min) {
        setValue(newValue);
      }
    },
    [value, setValue, schema]
  );

  return {
    value,
    setValue,
    increment,
    decrement,
    min: schema?.min,
    max: schema?.max,
  };
}

/**
 * Hook for enum configuration
 */
export function useConfigEnum<T extends ConfigValue>(key: string): {
  value: T;
  setValue: (value: T) => void;
  options: T[];
  next: () => void;
  previous: () => void;
} {
  const config = getRuntimeConfig();
  const [value, setValue] = useConfig<T>(key);
  const schema = useMemo(() => config.getSchema(key), [config, key]);
  const options = useMemo(() => (schema?.enum as T[]) || [], [schema]);

  const next = useCallback(() => {
    const currentIndex = options.indexOf(value);
    const nextIndex = (currentIndex + 1) % options.length;
    setValue(options[nextIndex]);
  }, [value, options, setValue]);

  const previous = useCallback(() => {
    const currentIndex = options.indexOf(value);
    const prevIndex = (currentIndex - 1 + options.length) % options.length;
    setValue(options[prevIndex]);
  }, [value, options, setValue]);

  return { value, setValue, options, next, previous };
}

/**
 * Hook for configuration reset
 */
export function useConfigReset(keys?: string[]): {
  reset: () => void;
  resetAll: () => void;
} {
  const config = getRuntimeConfig();

  const reset = useCallback(() => {
    if (keys) {
      keys.forEach((key) => config.reset(key));
    }
  }, [config, keys]);

  const resetAll = useCallback(() => {
    config.resetAll();
  }, [config]);

  return { reset, resetAll };
}

/**
 * Hook for configuration export/import
 */
export function useConfigExport(): {
  exportConfig: () => string;
  importConfig: (json: string) => boolean;
} {
  const config = getRuntimeConfig();

  const exportConfig = useCallback(() => {
    return config.export();
  }, [config]);

  const importConfig = useCallback(
    (json: string) => {
      return config.import(json);
    },
    [config]
  );

  return { exportConfig, importConfig };
}
