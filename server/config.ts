/**
 * Application configuration
 * This file contains configuration settings that can be adjusted without code changes
 */

/**
 * Testing mode configuration
 * When in testing mode, certain restrictions are disabled:
 * - Toast generation ignores timing/quota restrictions
 * - Generate button is always visible regardless of timeframe
 */
export const CONFIG = {
  // Set to true during development to enable unlimited toast generation
  // Set to false in production to enforce proper timing restrictions
  TESTING_MODE: true,
  
  // Default voice settings
  DEFAULT_VOICE_STYLE: 'friendly',
  
  // Toast generation settings
  TOAST_TYPES: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly'
  }
};