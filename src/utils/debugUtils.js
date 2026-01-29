/**
 * Debug utilities for the application
 */

// Levels of debug
const LEVELS = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
};

// Current debug level - can be changed at runtime
let debugLevel = LEVELS.ERROR;

/**
 * Set the debug level
 * @param {number} level - Debug level from LEVELS
 */
export const setDebugLevel = level => {
  if (Object.values(LEVELS).includes(level)) {
    debugLevel = level;

  } else {
    console.error(`Invalid debug level: ${level}`);
  }
};

/**
 * Get the name of a debug level
 * @param {number} level - Debug level
 * @returns {string} - Name of the debug level
 */
export const getDebugLevelName = level => {
  return Object.keys(LEVELS).find(key => LEVELS[key] === level) || 'UNKNOWN';
};

/**
 * Logger for transition effect selection
 */
export const TransitionDebugger = {
  /**
   * Log effect selection attempt
   * @param {string} source - Source of the log (e.g., 'pendingEffectSelection', 'customEvent')
   * @param {Object} details - Additional details
   */
  logEffectSelection: (source, details) => {
    if (debugLevel >= LEVELS.DEBUG) {
      console.group(`🎬 Effect Selection [${source}]`);
console.groupEnd();
    }
  },

  /**
   * Log effect found
   * @param {string} source - Source of the log
   * @param {Object} effect - The found effect
   * @param {string} method - Method used to find the effect
   */
  logEffectFound: (source, effect, method) => {
    if (debugLevel >= LEVELS.INFO) {
      console.group(`✅ Effect Found [${source}]`);
console.groupEnd();
    }
  },

  /**
   * Log effect not found
   * @param {string} source - Source of the log
   * @param {string} targetEffect - The effect that was being searched for
   * @param {Array} availableEffects - Available effects
   */
  logEffectNotFound: (source, targetEffect, availableEffects) => {
    if (debugLevel >= LEVELS.WARN) {
      console.group(`⚠️ Effect Not Found [${source}]`);
console.groupEnd();
    }
  },

  /**
   * Log error during effect selection
   * @param {string} source - Source of the log
   * @param {Error} error - The error that occurred
   * @param {Object} context - Additional context
   */
  logError: (source, error, context = {}) => {
    if (debugLevel >= LEVELS.ERROR) {
      console.group(`❌ Effect Selection Error [${source}]`);
      console.error('Error:', error);
console.groupEnd();
    }
  },

  /**
   * Enable detailed debugging for effect selection
   */
  enableDetailedLogging: () => {
    setDebugLevel(LEVELS.DEBUG);
    console.info('🔍 Detailed transition effect debugging enabled');
  },

  /**
   * Disable detailed debugging for effect selection
   */
  disableDetailedLogging: () => {
    setDebugLevel(LEVELS.ERROR);
    console.info('🔍 Detailed transition effect debugging disabled');
  },
};

export default {
  LEVELS,
  setDebugLevel,
  TransitionDebugger,
};
