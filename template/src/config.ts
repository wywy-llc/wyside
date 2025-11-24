/**
 * Application Configuration
 *
 * This module provides environment-agnostic configuration.
 * Values are injected at build time via Rollup for GAS environment,
 * and loaded from .env for Node.js environment.
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

/**
 * Spreadsheet Type Enumeration
 *
 * Maps to APP_SPREADSHEET_ID_N_DEV/PROD environment variables
 * where N is the enum value (1-5)
 */
export enum SpreadsheetType {
  TODOS = 1,
}

/**
 * Internal: Get all configured spreadsheet IDs as a map
 *
 * @returns Map of spreadsheet type (1-5) to ID
 */
function getSpreadsheetIdMap(): Record<number, string> {
  // For Node.js environment - load from process.env
  if (typeof process !== 'undefined' && process.env) {
    const isProduction = process.env.NODE_ENV === 'production';
    const suffix = isProduction ? 'PROD' : 'DEV';
    const map: Record<number, string> = {};

    for (let i = 1; i <= 5; i++) {
      const key = `APP_SPREADSHEET_ID_${i}_${suffix}`;
      const id = process.env[key];
      if (id && id.trim()) {
        map[i] = id.trim();
      }
    }

    return map;
  }

  // For GAS environment - this will be replaced at build time by Rollup
  // DO NOT refactor this line - Rollup replace plugin depends on exact string match
  return '__BUILD_SPREADSHEET_ID_MAP__';
}

/**
 * Get a Spreadsheet ID by type
 *
 * @param type - SpreadsheetType enum value
 * @returns Spreadsheet ID for the given type
 * @throws Error if the spreadsheet ID is not configured
 *
 * @example
 * ```typescript
 * import { SpreadsheetType, getSpreadsheetId } from './config';
 *
 * const mainId = getSpreadsheetId(SpreadsheetType.MAIN);
 * const todoId = getSpreadsheetId(SpreadsheetType.TODO);
 * ```
 */
export function getSpreadsheetId(type: SpreadsheetType): string {
  const map = getSpreadsheetIdMap();

  if (typeof map !== 'object' || map === null) {
    throw new Error(
      'Spreadsheet ID configuration is invalid. ' +
        'Please check your .env file or build configuration.'
    );
  }

  const id = map[type];

  if (!id || !id.trim()) {
    const typeName = SpreadsheetType[type] || type;
    throw new Error(
      `Spreadsheet ID for type ${typeName} (${type}) is not configured. ` +
        `Please set APP_SPREADSHEET_ID_${type}_DEV or APP_SPREADSHEET_ID_${type}_PROD in .env file.`
    );
  }

  return id;
}
