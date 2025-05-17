/**
 * Application configuration
 * This file contains configuration settings that can be adjusted without code changes
 */

/**
 * Get a configuration value from environment variables with a fallback default
 */
function getConfigValue(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Testing mode configuration
 * When in testing mode, certain restrictions are disabled:
 * - Toast generation ignores timing/quota restrictions
 * - Generate button is always visible regardless of timeframe
 * - Database writes for reflections and toasts are skipped
 * - A visual indicator appears on every page
 */
export const CONFIG = {
  // Temporarily disabled testing mode to simplify app functionality
  ENABLE_TESTING_MODE: false,
  
  // Disabled testing mode to focus on core app functionality
  TESTING_MODE: false,
  
  // Default voice settings
  DEFAULT_VOICE_STYLE: 'friendly',
  
  // Toast generation settings
  TOAST_TYPES: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly'
  },

  // Test user settings
  TEST_USER: {
    id: 9999, // Special ID for test user
    username: 'tester',
    name: 'Tester',
    email: 'tester@example.com'
  }
};