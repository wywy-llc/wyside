import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import type { sheets_v4, translate_v2 } from 'googleapis';
import type { FeatureSchema, FieldSchema } from './schema-generator.js';

interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export interface InferSchemaArgs {
  spreadsheetIdDev: string;
  sheetName: string;
  headers: string[];
  lang?: string;
  /** ヘッダー開始セル(例: "A3" または "シート名!A3")。終了列は headers 長から算出。 */
  headerStartCell: string;
}

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const SHEETS_SCOPE_FULL = 'https://www.googleapis.com/auth/spreadsheets';
const TRANSLATE_SCOPE = 'https://www.googleapis.com/auth/cloud-translation';

// ============================================================================
// Internal Type Definitions
// ============================================================================

/** Sheet metadata resolution result */
interface SheetMetadata {
  exactSheetName: string;
  sheetId?: number;
}

/** Parsed header cell reference */
interface HeaderCellReference {
  sheet: string;
  startCol: string;
  startRow: number;
}

/** Range strings for Sheets API */
interface RangeStrings {
  headerRange: string;
  dataRange: string;
}

/** Google API clients container */
interface GoogleClients {
  sheets: sheets_v4.Sheets;
  translate: translate_v2.Translate;
}

// ============================================================================
// Debug Logger
// ============================================================================

/**
 * Centralized debug information collector
 * @remarks Provides type-safe, mutable debug state management
 */
class DebugLogger {
  private data: Record<string, unknown> = {};

  set(key: string, value: unknown): void {
    this.data[key] = value;
  }

  delete(key: string): void {
    delete this.data[key];
  }

  getData(): Record<string, unknown> {
    return this.data;
  }

  isEmpty(): boolean {
    return Object.keys(this.data).length === 0;
  }

  toJSON(): string {
    return JSON.stringify(this.data, null, 2);
  }
}

// ============================================================================
// Utility Functions (Pure, No Side Effects)
// ============================================================================

/**
 * Formats sheet name for A1 notation range strings
 * @remarks Escapes single quotes and wraps in quotes if contains special chars
 */
function formatSheetNameForRange(sheetName: string): string {
  const normalized = sheetName.trim();
  const needsQuote = /[^A-Za-z0-9_]/.test(normalized);
  const escaped = normalized.replace(/'/g, "''");
  return needsQuote ? `'${escaped}'` : normalized;
}

/**
 * Converts 0-based column index to Excel-style letter (0='A', 25='Z', 26='AA')
 */
function columnIndexToLetter(index: number): string {
  let num = index + 1;
  let letters = '';
  while (num > 0) {
    const rem = (num - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    num = Math.floor((num - 1) / 26);
  }
  return letters;
}

/**
 * Converts Excel-style column letter to 0-based index ('A'=0, 'Z'=25, 'AA'=26)
 */
function columnLetterToIndex(column: string): number {
  let index = 0;
  for (let i = 0; i < column.length; i++) {
    index = index * 26 + (column.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * Converts header string to camelCase for field names
 * @param value - Original header text
 * @param fallback - Fallback name if conversion fails
 * @remarks Preserves existing camelCase format if detected
 */
function toCamelCase(value: string, fallback = 'field'): string {
  const trimmed = value.trim();

  // If already in camelCase format (starts with lowercase, contains uppercase), preserve it
  if (/^[a-z][a-zA-Z0-9]*$/.test(trimmed)) {
    return trimmed;
  }

  // Otherwise, convert to camelCase
  const cleaned = trimmed.replace(/[^a-zA-Z0-9]+/g, ' ');
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 0) return fallback;

  return (
    parts[0].toLowerCase() +
    parts
      .slice(1)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join('')
  );
}

/**
 * Formats error as ToolResult with optional debug information
 */
function formatToolError(error: unknown, debug: DebugLogger): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  const debugInfo = debug.isEmpty() ? '' : `\nDebug: ${debug.toJSON()}`;

  return {
    content: [{ type: 'text', text: `Error: ${message}${debugInfo}` }],
    isError: true,
  };
}

// ============================================================================
// API Client Factory
// ============================================================================

/**
 * Creates authenticated Google API clients
 * @remarks Extracted for dependency injection and testability
 */
async function createGoogleClients(): Promise<GoogleClients> {
  const auth = new GoogleAuth({
    scopes: [SHEETS_SCOPE, SHEETS_SCOPE_FULL, TRANSLATE_SCOPE],
  });

  return {
    sheets: google.sheets({ version: 'v4', auth }),
    translate: google.translate({ version: 'v2', auth }),
  };
}

// ============================================================================
// Extracted Business Logic Functions
// ============================================================================

/**
 * Validates input arguments for schema inference
 * @throws {Error} If required parameters are missing or invalid
 */
function validateInferSchemaArgs(args: InferSchemaArgs): void {
  const { spreadsheetIdDev, sheetName, headers, headerStartCell } = args;

  if (!spreadsheetIdDev || !sheetName) {
    throw new Error('spreadsheetIdDev and sheetName are required');
  }
  if (!headers || headers.length === 0) {
    throw new Error('headers must be a non-empty array');
  }
  if (!headerStartCell) {
    throw new Error('headerStartCell is required');
  }
}

/**
 * Resolves exact sheet name and ID from spreadsheet metadata
 * @returns Sheet metadata with exact name (case-sensitive) and optional sheetId
 * @throws {Error} If sheet not found in spreadsheet
 */
async function resolveSheetMetadata(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  debug: DebugLogger
): Promise<SheetMetadata> {
  try {
    const metadata = await sheets.spreadsheets.get({ spreadsheetId });
    debug.set('metadataFetched', 'success');

    const sheet = metadata.data.sheets?.find(
      s => s.properties?.title === sheetName
    );

    if (!sheet?.properties?.title) {
      debug.set('sheetNotFound', true);
      const availableSheets =
        metadata.data.sheets?.map(s => s.properties?.title).join(', ') ||
        'none';
      debug.set('availableSheets', availableSheets);

      throw new Error(
        `Sheet "${sheetName}" not found in the spreadsheet. ` +
          `Available sheets: ${availableSheets}. ` +
          `Please verify the spreadsheetId (${spreadsheetId}) and sheetName are correct.`
      );
    }

    const result: SheetMetadata = {
      exactSheetName: sheet.properties.title,
    };

    if (
      sheet.properties.sheetId !== null &&
      sheet.properties.sheetId !== undefined
    ) {
      result.sheetId = sheet.properties.sheetId;
      debug.set('sheetId', sheet.properties.sheetId);
    }

    debug.set('exactSheetName', result.exactSheetName);
    return result;
  } catch (err) {
    // Re-throw sheet not found errors
    if (
      err instanceof Error &&
      err.message.includes('not found in the spreadsheet')
    ) {
      throw err;
    }
    // Non-fatal metadata errors: log warning and use provided sheet name
    debug.set(
      'metadataWarning',
      err instanceof Error ? err.message : String(err)
    );
    return { exactSheetName: sheetName };
  }
}

/**
 * Parses header start cell reference into components
 * @param headerStartCell - Cell reference like "A3" or "Sheet!A3"
 * @param fallbackSheetName - Sheet name to use if not specified in cell reference
 * @throws {Error} If cell reference format is invalid
 */
function parseHeaderStartCell(
  headerStartCell: string,
  fallbackSheetName: string
): HeaderCellReference {
  const cellWithSheet = headerStartCell.includes('!')
    ? headerStartCell
    : `${fallbackSheetName}!${headerStartCell}`;

  const match = cellWithSheet.match(
    /^(?<sheet>[^!]+)!(?<startCol>[A-Z]+)(?<startRow>\d+)$/
  );

  if (!match?.groups) {
    throw new Error('invalid headerStartCol format');
  }

  return {
    sheet: match.groups.sheet,
    startCol: match.groups.startCol,
    startRow: Number(match.groups.startRow),
  };
}

/**
 * Fetches header row values from spreadsheet with fallback handling
 * @returns 2D array of cell values
 */
async function fetchHeaderRange(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  primaryRange: string,
  fallbackRange: string,
  debug: DebugLogger
): Promise<string[][]> {
  debug.set('headerRangeInput', primaryRange);

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: primaryRange,
      majorDimension: 'ROWS',
    });
    return res.data.values || [];
  } catch (err) {
    debug.set(
      'headerRangeError',
      err instanceof Error ? err.message : String(err)
    );
    debug.set('headerRangeFallback', fallbackRange);

    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: fallbackRange,
        majorDimension: 'ROWS',
      });
      debug.delete('headerRangeError'); // Clear error on successful fallback
      return res.data.values || [];
    } catch (err2) {
      debug.set(
        'headerRangeErrorFallback',
        err2 instanceof Error ? err2.message : String(err2)
      );
      return [];
    }
  }
}

/**
 * Validates that fetched header row matches expected headers
 * @throws {Error} If headers don't match or are missing
 */
function validateHeaderMatch(
  expectedHeaders: string[],
  fetchedValues: string[][],
  startColIndex: number,
  startRow: number
): void {
  if (startColIndex === -1 || startRow === -1) {
    throw new Error('header row not found in the provided sheet/headers');
  }

  const normalizedExpected = expectedHeaders.map(h => h.trim());
  const headerRow = fetchedValues[0] || [];
  const headerSlice = headerRow
    .slice(0, normalizedExpected.length)
    .map(h => String(h || '').trim());

  const isMatch =
    headerSlice.length === normalizedExpected.length &&
    normalizedExpected.every((h, i) => h === headerSlice[i]);

  if (!isMatch) {
    throw new Error('header row not found in the provided sheet/headers');
  }
}

/**
 * Generates A1 notation range strings for header and data rows
 */
function generateRangeStrings(
  formattedSheetName: string,
  startColIndex: number,
  headerRowIndex: number,
  headerLength: number
): RangeStrings {
  const endColIndex = startColIndex + headerLength - 1;
  const startColLetter = columnIndexToLetter(startColIndex);
  const endColLetter = columnIndexToLetter(endColIndex);
  const headerRowNumber = headerRowIndex + 1; // Convert to 1-based

  return {
    headerRange: `${formattedSheetName}!${startColLetter}${headerRowNumber}:${endColLetter}${headerRowNumber}`,
    dataRange: `${formattedSheetName}!${startColLetter}${headerRowNumber + 1}:${endColLetter}`,
  };
}

/**
 * Simple Japanese to English translation dictionary
 * @remarks Used as fallback when Translation API is unavailable
 */
const JA_EN_DICTIONARY: Record<string, string> = {
  // ID-related
  ID: 'id',
  メールID: 'mailId',
  メールID枝番: 'mailIdBranch',
  ユーザーID: 'userId',
  顧客ID: 'customerId',

  // Common fields
  件名: 'subject',
  名前: 'name',
  氏名: 'fullName',
  受信日: 'receivedDate',
  確認者: 'confirmer',
  ステータス: 'status',
  分類: 'category',
  メールアドレス: 'email',
  広告媒体: 'advertisingMedium',
  初回希望日: 'firstPreferredDate',
  初回希望院: 'firstPreferredClinic',
  問い合わせ方法: 'inquiryMethod',
  タグ: 'tags',
  確認日: 'confirmationDate',
  '不備なし／あり': 'defectStatus',
  不備内容詳細: 'defectDetails',
  修正完了日: 'correctionCompletedDate',
  集計用: 'forAggregation',

  // Date fields
  作成日: 'createdDate',
  更新日: 'updatedDate',
  削除日: 'deletedDate',
  登録日: 'registeredDate',

  // Status/Type fields
  種類: 'type',
  状態: 'state',
  区分: 'division',

  // User/Person fields
  担当者: 'assignee',
  作成者: 'creator',
  更新者: 'updater',

  // Content fields
  内容: 'content',
  詳細: 'details',
  備考: 'remarks',
  メモ: 'memo',
  コメント: 'comment',
  説明: 'description',

  // Numeric fields
  数: 'count',
  数値: 'number',
  金額: 'amount',
  価格: 'price',
  合計: 'total',
};

/**
 * Translates a single header using dictionary or API
 * @param text - Header text to translate
 * @returns Translated text or original if no translation found
 */
function translateHeaderText(text: string): string {
  const trimmed = text.trim();

  // Try exact match first
  if (JA_EN_DICTIONARY[trimmed]) {
    return JA_EN_DICTIONARY[trimmed];
  }

  // Try partial matches for compound words
  for (const [jaKey, enValue] of Object.entries(JA_EN_DICTIONARY)) {
    if (trimmed.includes(jaKey)) {
      // If the header contains a known word, use it
      return enValue;
    }
  }

  return trimmed;
}

/**
 * Translates headers to English if language is specified
 * @returns Translated headers or original if translation fails/skipped
 */
async function translateHeaders(
  translate: translate_v2.Translate,
  headers: string[],
  debug: DebugLogger,
  lang?: string
): Promise<string[]> {
  if (!lang) return headers;

  // Try dictionary-based translation first (fast and reliable)
  const dictionaryTranslations = headers.map(h => translateHeaderText(h));
  const successfulTranslations = dictionaryTranslations.filter(
    (t, idx) => t !== headers[idx]
  ).length;

  debug.set('dictionaryTranslations', {
    successCount: successfulTranslations,
    totalCount: headers.length,
    mappings: headers.map((h, idx) => ({
      original: h,
      translated: dictionaryTranslations[idx],
    })),
  });

  // If dictionary translation was successful for all headers, use it
  if (successfulTranslations === headers.length) {
    debug.set('translationMethod', 'dictionary');
    return dictionaryTranslations;
  }

  // Otherwise, try Translation API for remaining headers
  try {
    const response = await translate.translations.list({
      q: headers,
      target: 'en',
      source: lang,
      format: 'text',
    });

    const translations = response.data.translations;
    debug.set('translationResponse', {
      receivedCount: translations?.length ?? 0,
      translations: translations?.map(t => t.translatedText) ?? [],
    });

    if (!translations || translations.length === 0) {
      debug.set(
        'translationWarning',
        'No translations returned from API, using dictionary fallback'
      );
      debug.set('translationMethod', 'dictionary-fallback');
      return dictionaryTranslations;
    }

    // Extract translated texts and validate
    const apiTranslations = translations.map(t => t.translatedText ?? '');
    const validTranslations = apiTranslations.filter(Boolean);

    if (validTranslations.length === 0) {
      debug.set(
        'translationWarning',
        'All API translations were empty, using dictionary fallback'
      );
      debug.set('translationMethod', 'dictionary-fallback');
      return dictionaryTranslations;
    }

    // Merge API and dictionary translations (prefer API if available)
    debug.set('translationMethod', 'api+dictionary');
    return apiTranslations.map(
      (apiText, idx) => apiText || dictionaryTranslations[idx] || headers[idx]
    );
  } catch (error) {
    // Log translation failure and use dictionary fallback
    debug.set(
      'translationError',
      error instanceof Error ? error.message : String(error)
    );
    debug.set('translationMethod', 'dictionary-fallback-error');
    return dictionaryTranslations;
  }
}

/**
 * Builds FieldSchema array from translated and original headers
 */
function buildFieldSchemas(
  translatedHeaders: string[],
  originalHeaders: string[],
  startColIndex: number,
  headerRowNumber: number,
  lang?: string
): FieldSchema[] {
  const headerLength = translatedHeaders.length;
  const columnLetters = Array.from({ length: headerLength }, (_, i) =>
    columnIndexToLetter(startColIndex + i)
  );

  return translatedHeaders.map((translated, idx) => {
    const original = originalHeaders[idx];
    const fallbackName = `field${idx + 1}`;

    // Use translated text if available, otherwise use original
    const base = translated || original || fallbackName;
    const name = toCamelCase(base, fallbackName);

    return {
      name,
      type: 'string',
      row: headerRowNumber,
      column: columnLetters[idx],
      description: lang ? `source(${lang}): ${original}` : original,
    };
  });
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Infers TypeScript schema from Google Sheets structure
 * @remarks Orchestrates validation, API calls, translation, and schema generation
 */
export async function inferSchemaFromSheet(
  args: InferSchemaArgs
): Promise<ToolResult> {
  const debug = new DebugLogger();

  try {
    // 1. Validate input
    validateInferSchemaArgs(args);

    const { spreadsheetIdDev, sheetName, headers, lang, headerStartCell } =
      args;

    // 2. Initialize Google API clients
    const { sheets, translate } = await createGoogleClients();

    // 3. Resolve exact sheet metadata
    const { exactSheetName } = await resolveSheetMetadata(
      sheets,
      spreadsheetIdDev,
      sheetName,
      debug
    );

    // 4. Parse header start cell reference
    const parsed = parseHeaderStartCell(headerStartCell, exactSheetName);
    const startColIndex = columnLetterToIndex(parsed.startCol);
    const headerRowIndex = parsed.startRow - 1; // Convert to 0-based

    // 5. Build range strings for API call
    const endCol = columnIndexToLetter(startColIndex + headers.length - 1);
    const formattedSheetName = formatSheetNameForRange(parsed.sheet);
    const headerRangeFull = `${formattedSheetName}!${parsed.startCol}${parsed.startRow}:${endCol}${parsed.startRow}`;
    const fallbackRange = `${parsed.sheet}!${parsed.startCol}${parsed.startRow}:${endCol}${parsed.startRow}`;

    // 6. Fetch header row values
    const values = await fetchHeaderRange(
      sheets,
      spreadsheetIdDev,
      headerRangeFull,
      fallbackRange,
      debug
    );

    // 7. Validate header match
    validateHeaderMatch(headers, values, startColIndex, headerRowIndex);

    // 8. Generate range strings for schema
    const { headerRange, dataRange } = generateRangeStrings(
      formatSheetNameForRange(sheetName),
      startColIndex,
      headerRowIndex,
      headers.length
    );

    debug.set('headerRange', headerRange);
    debug.set('dataRange', dataRange);
    debug.set('headerRowIndex', headerRowIndex);
    debug.set('startColIndex', startColIndex);

    // 9. Translate headers (if lang specified)
    const translatedHeaders = await translateHeaders(
      translate,
      headers,
      debug,
      lang
    );

    // 10. Build field schemas
    const fields = buildFieldSchemas(
      translatedHeaders,
      headers,
      startColIndex,
      parsed.startRow,
      lang
    );

    // 11. Construct final schema
    const schema: FeatureSchema = {
      sheetName,
      headerRange,
      fields,
      spreadsheetIdDev,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ ...schema, dataRange }, null, 2),
        },
      ],
    };
  } catch (error) {
    return formatToolError(error, debug);
  }
}
