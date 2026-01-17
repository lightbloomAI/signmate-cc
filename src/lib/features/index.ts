export {
  FeatureFlagsManager,
  getFeatureFlags,
  createFeatureFlags,
  initSignMateFeatureFlags,
  SIGNMATE_FEATURE_FLAGS,
  type TargetingRule,
  type FeatureFlag,
  type UserContext,
  type FeatureEvaluation,
  type FeatureFlagsConfig,
} from './featureFlags';

export {
  FeatureFlagsProvider,
  useFeatureFlagsManager,
  useFeatureFlag,
  useFeatureValue,
  useFeatureVariant,
  useFeatureEvaluation,
  useFeatureFlags,
  useFeatureFlagOverrides,
  useFeatureFlagContext,
  useAllFeatureFlags,
  useABTest,
  Feature,
  withFeatureFlag,
} from './useFeatureFlags';
