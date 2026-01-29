// Feature flags configuration
// These can be controlled via environment variables or other configuration methods

export const FEATURE_FLAGS = {
  // Single flag to control all subscription-related features
  SUBSCRIPTION_USAGE: process.env.REACT_APP_ENABLE_SUBSCRIPTION_USAGE === 'true' || false,
};

// Helper function to check if a feature is enabled
export const isFeatureEnabled = (featureName) => {
  return FEATURE_FLAGS[featureName] === true;
};
