'use client';

import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import {
  getFeatureFlags,
  type FeatureFlagsManager,
  type FeatureFlag,
  type FeatureEvaluation,
  type UserContext,
} from './featureFlags';

// Context for providing feature flags manager
const FeatureFlagsContext = createContext<FeatureFlagsManager | null>(null);

/**
 * Provider component for feature flags
 */
export function FeatureFlagsProvider({
  children,
  manager,
}: {
  children: React.ReactNode;
  manager?: FeatureFlagsManager;
}) {
  const ffManager = manager || getFeatureFlags();

  return (
    <FeatureFlagsContext.Provider value={ffManager}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Hook to access feature flags manager
 */
export function useFeatureFlagsManager(): FeatureFlagsManager {
  const context = useContext(FeatureFlagsContext);
  return context || getFeatureFlags();
}

/**
 * Hook to check if a feature is enabled
 */
export function useFeatureFlag(key: string, context?: UserContext): boolean {
  const ff = useFeatureFlagsManager();
  const [enabled, setEnabled] = useState(() => ff.isEnabled(key, context));

  useEffect(() => {
    return ff.onFlagChange(key, (evaluation) => {
      setEnabled(evaluation.enabled && evaluation.value === true);
    });
  }, [ff, key]);

  // Re-evaluate when context changes
  useEffect(() => {
    setEnabled(ff.isEnabled(key, context));
  }, [ff, key, context]);

  return enabled;
}

/**
 * Hook to get feature value
 */
export function useFeatureValue<T extends boolean | string | number>(
  key: string,
  defaultValue: T,
  context?: UserContext
): T {
  const ff = useFeatureFlagsManager();
  const [value, setValue] = useState<T>(() => {
    try {
      return ff.getValue<T>(key, context);
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    return ff.onFlagChange(key, (evaluation) => {
      setValue(evaluation.value as T);
    });
  }, [ff, key]);

  useEffect(() => {
    try {
      setValue(ff.getValue<T>(key, context));
    } catch {
      setValue(defaultValue);
    }
  }, [ff, key, context, defaultValue]);

  return value;
}

/**
 * Hook to get feature variant
 */
export function useFeatureVariant(
  key: string,
  context?: UserContext
): string | undefined {
  const ff = useFeatureFlagsManager();
  const [variant, setVariant] = useState(() => ff.getVariant(key, context));

  useEffect(() => {
    return ff.onFlagChange(key, (evaluation) => {
      setVariant(evaluation.variant);
    });
  }, [ff, key]);

  useEffect(() => {
    setVariant(ff.getVariant(key, context));
  }, [ff, key, context]);

  return variant;
}

/**
 * Hook for full feature evaluation
 */
export function useFeatureEvaluation(
  key: string,
  context?: UserContext
): FeatureEvaluation {
  const ff = useFeatureFlagsManager();
  const [evaluation, setEvaluation] = useState(() => ff.evaluate(key, context));

  useEffect(() => {
    return ff.onFlagChange(key, setEvaluation);
  }, [ff, key]);

  useEffect(() => {
    setEvaluation(ff.evaluate(key, context));
  }, [ff, key, context]);

  return evaluation;
}

/**
 * Hook to check multiple feature flags
 */
export function useFeatureFlags(keys: string[]): Record<string, boolean> {
  const ff = useFeatureFlagsManager();

  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    const result: Record<string, boolean> = {};
    for (const key of keys) {
      result[key] = ff.isEnabled(key);
    }
    return result;
  });

  useEffect(() => {
    const unsubscribes = keys.map((key) =>
      ff.onFlagChange(key, (evaluation) => {
        setFlags((prev) => ({
          ...prev,
          [key]: evaluation.enabled && evaluation.value === true,
        }));
      })
    );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [ff, keys]);

  return flags;
}

/**
 * Hook for feature flag overrides (dev tools)
 */
export function useFeatureFlagOverrides(): {
  overrides: Map<string, boolean | string | number>;
  setOverride: (key: string, value: boolean | string | number) => void;
  removeOverride: (key: string) => void;
  clearOverrides: () => void;
} {
  const ff = useFeatureFlagsManager();
  const [overrides, setOverrides] = useState(() => ff.getOverrides());

  const setOverride = useCallback(
    (key: string, value: boolean | string | number) => {
      ff.setOverride(key, value);
      setOverrides(ff.getOverrides());
    },
    [ff]
  );

  const removeOverride = useCallback(
    (key: string) => {
      ff.removeOverride(key);
      setOverrides(ff.getOverrides());
    },
    [ff]
  );

  const clearOverrides = useCallback(() => {
    ff.clearOverrides();
    setOverrides(ff.getOverrides());
  }, [ff]);

  return { overrides, setOverride, removeOverride, clearOverrides };
}

/**
 * Hook to set user context
 */
export function useFeatureFlagContext(): {
  setContext: (context: UserContext) => void;
  clearContext: () => void;
} {
  const ff = useFeatureFlagsManager();

  const setContext = useCallback(
    (context: UserContext) => {
      ff.setContext(context);
    },
    [ff]
  );

  const clearContext = useCallback(() => {
    ff.clearContext();
  }, [ff]);

  return { setContext, clearContext };
}

/**
 * Hook to get all flags for dev tools
 */
export function useAllFeatureFlags(): FeatureFlag[] {
  const ff = useFeatureFlagsManager();
  const [flags, setFlags] = useState(() => ff.getAllFlags());

  useEffect(() => {
    return ff.onAnyFlagChange(() => {
      setFlags(ff.getAllFlags());
    });
  }, [ff]);

  return flags;
}

/**
 * Hook for A/B test tracking
 */
export function useABTest(
  key: string,
  onExposure?: (variant: string | undefined) => void
): {
  variant: string | undefined;
  isControl: boolean;
  isVariant: (v: string) => boolean;
} {
  const ff = useFeatureFlagsManager();
  const variant = useFeatureVariant(key);

  // Track exposure on mount
  useEffect(() => {
    onExposure?.(variant);
  }, [variant, onExposure]);

  const isControl = useMemo(
    () => variant === undefined || variant === 'control',
    [variant]
  );

  const isVariant = useCallback(
    (v: string) => variant === v,
    [variant]
  );

  return { variant, isControl, isVariant };
}

/**
 * Conditional rendering component based on feature flag
 */
export function Feature({
  flag,
  children,
  fallback,
}: {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}): React.ReactNode {
  const isEnabled = useFeatureFlag(flag);

  if (isEnabled) {
    return children;
  }

  return fallback || null;
}

/**
 * Higher-order component for feature flags
 */
export function withFeatureFlag<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  flag: string,
  FallbackComponent?: React.ComponentType<P>
): React.FC<P> {
  return function FeatureFlaggedComponent(props: P) {
    const isEnabled = useFeatureFlag(flag);

    if (isEnabled) {
      return <WrappedComponent {...props} />;
    }

    if (FallbackComponent) {
      return <FallbackComponent {...props} />;
    }

    return null;
  };
}
