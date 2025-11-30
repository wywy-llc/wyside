/**
 * Application Configuration
 *
 * This module provides environment detection utilities.
 * Spreadsheet IDs are now managed directly in use cases via Rollup placeholders.
 */

/**
 * Check if code is running in Google Apps Script environment
 * @returns true if running in GAS, false otherwise
 */
export function isGasEnvironment(): boolean {
  return typeof ScriptApp !== 'undefined';
}

/**
 * Check if code is running in Node.js environment
 * @returns true if running in Node.js, false otherwise
 */
export function isNodeEnvironment(): boolean {
  return typeof ScriptApp === 'undefined';
}
