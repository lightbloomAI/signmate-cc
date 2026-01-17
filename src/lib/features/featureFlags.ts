/**
 * Feature Flags System for SignMate
 *
 * Provides feature toggles, gradual rollouts, and A/B testing
 * capabilities for controlled feature releases.
 */

/**
 * Feature flag targeting rules
 */
export interface TargetingRule {
  attribute: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | number | string[];
}

/**
 * Feature flag definition
 */
export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  defaultValue: boolean | string | number;
  variants?: Record<string, boolean | string | number>;
  targeting?: {
    rules: TargetingRule[];
    match: 'all' | 'any';
    percentage?: number;
  };
  metadata?: Record<string, unknown>;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * User context for targeting
 */
export interface UserContext {
  userId?: string;
  email?: string;
  role?: string;
  plan?: string;
  country?: string;
  language?: string;
  platform?: string;
  version?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Feature evaluation result
 */
export interface FeatureEvaluation {
  flag: string;
  enabled: boolean;
  value: boolean | string | number;
  variant?: string;
  reason: 'default' | 'targeting' | 'percentage' | 'override' | 'disabled';
}

/**
 * Feature flags configuration
 */
export interface FeatureFlagsConfig {
  flags: FeatureFlag[];
  defaultContext?: UserContext;
  remoteEndpoint?: string;
  refreshInterval?: number;
  onFlagChange?: (key: string, evaluation: FeatureEvaluation) => void;
  onError?: (error: Error) => void;
}

/**
 * Feature Flags Manager
 *
 * Manages feature flags with targeting, percentage rollouts, and remote sync.
 */
export class FeatureFlagsManager {
  private flags = new Map<string, FeatureFlag>();
  private overrides = new Map<string, boolean | string | number>();
  private userContext: UserContext = {};
  private config: FeatureFlagsConfig;
  private listeners = new Map<string, Set<(evaluation: FeatureEvaluation) => void>>();
  private globalListeners = new Set<(key: string, evaluation: FeatureEvaluation) => void>();
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private evaluationCache = new Map<string, FeatureEvaluation>();

  constructor(config: Partial<FeatureFlagsConfig> = {}) {
    this.config = {
      flags: [],
      ...config,
    };

    // Load initial flags
    this.loadFlags(this.config.flags);

    // Set default context
    if (this.config.defaultContext) {
      this.userContext = { ...this.config.defaultContext };
    }

    // Start remote refresh if configured
    if (this.config.remoteEndpoint && this.config.refreshInterval) {
      this.startRefresh();
    }
  }

  /**
   * Load flags from array
   */
  loadFlags(flags: FeatureFlag[]): void {
    for (const flag of flags) {
      this.flags.set(flag.key, flag);
    }
    this.clearCache();
  }

  /**
   * Set user context for targeting
   */
  setContext(context: UserContext): void {
    this.userContext = { ...this.userContext, ...context };
    this.clearCache();
  }

  /**
   * Clear user context
   */
  clearContext(): void {
    this.userContext = {};
    this.clearCache();
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(key: string, context?: UserContext): boolean {
    const evaluation = this.evaluate(key, context);
    return evaluation.enabled && evaluation.value === true;
  }

  /**
   * Get feature value
   */
  getValue<T extends boolean | string | number>(key: string, context?: UserContext): T {
    const evaluation = this.evaluate(key, context);
    return evaluation.value as T;
  }

  /**
   * Get feature variant
   */
  getVariant(key: string, context?: UserContext): string | undefined {
    const evaluation = this.evaluate(key, context);
    return evaluation.variant;
  }

  /**
   * Evaluate a feature flag
   */
  evaluate(key: string, contextOverride?: UserContext): FeatureEvaluation {
    const cacheKey = this.getCacheKey(key, contextOverride);

    // Check cache
    if (this.evaluationCache.has(cacheKey)) {
      return this.evaluationCache.get(cacheKey)!;
    }

    const flag = this.flags.get(key);
    const context = { ...this.userContext, ...contextOverride };

    // Check for override
    if (this.overrides.has(key)) {
      const value = this.overrides.get(key)!;
      const evaluation: FeatureEvaluation = {
        flag: key,
        enabled: true,
        value,
        reason: 'override',
      };
      this.evaluationCache.set(cacheKey, evaluation);
      return evaluation;
    }

    // Flag not found
    if (!flag) {
      const evaluation: FeatureEvaluation = {
        flag: key,
        enabled: false,
        value: false,
        reason: 'default',
      };
      this.evaluationCache.set(cacheKey, evaluation);
      return evaluation;
    }

    // Flag is disabled globally
    if (!flag.enabled) {
      const evaluation: FeatureEvaluation = {
        flag: key,
        enabled: false,
        value: flag.defaultValue,
        reason: 'disabled',
      };
      this.evaluationCache.set(cacheKey, evaluation);
      return evaluation;
    }

    // Check targeting rules
    if (flag.targeting) {
      const matchesRules = this.evaluateTargeting(flag.targeting, context);

      if (!matchesRules) {
        const evaluation: FeatureEvaluation = {
          flag: key,
          enabled: false,
          value: flag.defaultValue,
          reason: 'targeting',
        };
        this.evaluationCache.set(cacheKey, evaluation);
        return evaluation;
      }

      // Check percentage rollout
      if (flag.targeting.percentage !== undefined && flag.targeting.percentage < 100) {
        const inPercentage = this.isInPercentage(key, context, flag.targeting.percentage);
        if (!inPercentage) {
          const evaluation: FeatureEvaluation = {
            flag: key,
            enabled: false,
            value: flag.defaultValue,
            reason: 'percentage',
          };
          this.evaluationCache.set(cacheKey, evaluation);
          return evaluation;
        }
      }
    }

    // Determine variant if applicable
    let value = flag.defaultValue;
    let variant: string | undefined;

    if (flag.variants && Object.keys(flag.variants).length > 0) {
      const variantKey = this.selectVariant(key, context, Object.keys(flag.variants));
      variant = variantKey;
      value = flag.variants[variantKey];
    }

    const evaluation: FeatureEvaluation = {
      flag: key,
      enabled: true,
      value,
      variant,
      reason: flag.targeting ? 'targeting' : 'default',
    };

    this.evaluationCache.set(cacheKey, evaluation);
    return evaluation;
  }

  /**
   * Evaluate targeting rules
   */
  private evaluateTargeting(
    targeting: NonNullable<FeatureFlag['targeting']>,
    context: UserContext
  ): boolean {
    const results = targeting.rules.map((rule) => this.evaluateRule(rule, context));

    if (targeting.match === 'all') {
      return results.every(Boolean);
    }
    return results.some(Boolean);
  }

  /**
   * Evaluate a single targeting rule
   */
  private evaluateRule(rule: TargetingRule, context: UserContext): boolean {
    const contextValue = context[rule.attribute];
    if (contextValue === undefined) return false;

    switch (rule.operator) {
      case 'equals':
        return String(contextValue) === String(rule.value);
      case 'contains':
        return String(contextValue).includes(String(rule.value));
      case 'startsWith':
        return String(contextValue).startsWith(String(rule.value));
      case 'endsWith':
        return String(contextValue).endsWith(String(rule.value));
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(String(contextValue));
      case 'gt':
        return Number(contextValue) > Number(rule.value);
      case 'lt':
        return Number(contextValue) < Number(rule.value);
      case 'gte':
        return Number(contextValue) >= Number(rule.value);
      case 'lte':
        return Number(contextValue) <= Number(rule.value);
      default:
        return false;
    }
  }

  /**
   * Check if user is in percentage rollout
   */
  private isInPercentage(key: string, context: UserContext, percentage: number): boolean {
    const identifier = context.userId || context.email || 'anonymous';
    const hash = this.simpleHash(`${key}-${identifier}`);
    return hash % 100 < percentage;
  }

  /**
   * Select a variant for the user
   */
  private selectVariant(key: string, context: UserContext, variants: string[]): string {
    const identifier = context.userId || context.email || 'anonymous';
    const hash = this.simpleHash(`${key}-variant-${identifier}`);
    return variants[hash % variants.length];
  }

  /**
   * Simple hash function for consistent bucketing
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get cache key
   */
  private getCacheKey(key: string, context?: UserContext): string {
    const ctx = { ...this.userContext, ...context };
    return `${key}:${JSON.stringify(ctx)}`;
  }

  /**
   * Clear evaluation cache
   */
  private clearCache(): void {
    this.evaluationCache.clear();
  }

  /**
   * Set an override for a flag
   */
  setOverride(key: string, value: boolean | string | number): void {
    this.overrides.set(key, value);
    this.clearCache();
    this.notifyChange(key);
  }

  /**
   * Remove an override
   */
  removeOverride(key: string): void {
    this.overrides.delete(key);
    this.clearCache();
    this.notifyChange(key);
  }

  /**
   * Clear all overrides
   */
  clearOverrides(): void {
    this.overrides.clear();
    this.clearCache();
  }

  /**
   * Get all overrides
   */
  getOverrides(): Map<string, boolean | string | number> {
    return new Map(this.overrides);
  }

  /**
   * Subscribe to flag changes
   */
  onFlagChange(key: string, callback: (evaluation: FeatureEvaluation) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  /**
   * Subscribe to all flag changes
   */
  onAnyFlagChange(
    callback: (key: string, evaluation: FeatureEvaluation) => void
  ): () => void {
    this.globalListeners.add(callback);
    return () => this.globalListeners.delete(callback);
  }

  /**
   * Notify listeners of a flag change
   */
  private notifyChange(key: string): void {
    const evaluation = this.evaluate(key);

    this.listeners.get(key)?.forEach((cb) => cb(evaluation));
    this.globalListeners.forEach((cb) => cb(key, evaluation));
    this.config.onFlagChange?.(key, evaluation);
  }

  /**
   * Get all flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get a specific flag
   */
  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  /**
   * Update a flag
   */
  updateFlag(key: string, updates: Partial<FeatureFlag>): void {
    const flag = this.flags.get(key);
    if (flag) {
      this.flags.set(key, { ...flag, ...updates, updatedAt: Date.now() });
      this.clearCache();
      this.notifyChange(key);
    }
  }

  /**
   * Add a new flag
   */
  addFlag(flag: FeatureFlag): void {
    this.flags.set(flag.key, { ...flag, createdAt: Date.now() });
    this.clearCache();
    this.notifyChange(flag.key);
  }

  /**
   * Remove a flag
   */
  removeFlag(key: string): void {
    this.flags.delete(key);
    this.clearCache();
  }

  /**
   * Start remote flag refresh
   */
  private startRefresh(): void {
    if (this.refreshTimer) return;

    this.refreshTimer = setInterval(
      () => this.fetchRemoteFlags(),
      this.config.refreshInterval
    );

    // Initial fetch
    this.fetchRemoteFlags();
  }

  /**
   * Stop remote flag refresh
   */
  stopRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Fetch flags from remote endpoint
   */
  async fetchRemoteFlags(): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      const response = await fetch(this.config.remoteEndpoint);
      if (response.ok) {
        const flags = await response.json();
        this.loadFlags(flags);
      }
    } catch (error) {
      this.config.onError?.(error as Error);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopRefresh();
    this.listeners.clear();
    this.globalListeners.clear();
  }
}

// Singleton instance
let featureFlagsManager: FeatureFlagsManager | null = null;

/**
 * Get the singleton FeatureFlagsManager
 */
export function getFeatureFlags(): FeatureFlagsManager {
  if (!featureFlagsManager) {
    featureFlagsManager = new FeatureFlagsManager();
  }
  return featureFlagsManager;
}

/**
 * Create a new FeatureFlagsManager with config
 */
export function createFeatureFlags(
  config?: Partial<FeatureFlagsConfig>
): FeatureFlagsManager {
  featureFlagsManager = new FeatureFlagsManager(config);
  return featureFlagsManager;
}

// ==================== DEFAULT FLAGS ====================

/**
 * SignMate default feature flags
 */
export const SIGNMATE_FEATURE_FLAGS: FeatureFlag[] = [
  {
    key: 'new-avatar-engine',
    name: 'New Avatar Engine',
    description: 'Enable the new WebGL-based avatar rendering engine',
    enabled: false,
    defaultValue: false,
  },
  {
    key: 'real-time-collaboration',
    name: 'Real-time Collaboration',
    description: 'Enable real-time collaboration features',
    enabled: false,
    defaultValue: false,
    targeting: {
      rules: [{ attribute: 'plan', operator: 'in', value: ['pro', 'enterprise'] }],
      match: 'any',
    },
  },
  {
    key: 'advanced-analytics',
    name: 'Advanced Analytics',
    description: 'Enable advanced analytics dashboard',
    enabled: true,
    defaultValue: true,
    targeting: {
      rules: [{ attribute: 'role', operator: 'in', value: ['admin', 'analyst'] }],
      match: 'any',
    },
  },
  {
    key: 'beta-features',
    name: 'Beta Features',
    description: 'Access to beta features',
    enabled: true,
    defaultValue: false,
    targeting: {
      rules: [{ attribute: 'email', operator: 'endsWith', value: '@lightbloom.ai' }],
      match: 'any',
      percentage: 100,
    },
  },
  {
    key: 'sign-speed-variant',
    name: 'Sign Speed A/B Test',
    description: 'A/B test for sign animation speed',
    enabled: true,
    defaultValue: 'normal',
    variants: {
      slow: 'slow',
      normal: 'normal',
      fast: 'fast',
    },
  },
];

/**
 * Initialize SignMate feature flags
 */
export function initSignMateFeatureFlags(): FeatureFlagsManager {
  const ff = createFeatureFlags({
    flags: SIGNMATE_FEATURE_FLAGS,
  });
  return ff;
}
