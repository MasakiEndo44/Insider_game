/**
 * Logger Utility
 *
 * Provides environment-aware logging to prevent debug information
 * leakage in production environments.
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Debug logging (development only)
   * Use for detailed debugging information
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info logging (all environments)
   * Use for general informational messages
   */
  info: (...args: any[]) => {
    console.info('[INFO]', ...args);
  },

  /**
   * Warning logging (all environments)
   * Use for potentially problematic situations
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error logging (all environments)
   * Use for error conditions
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
};
