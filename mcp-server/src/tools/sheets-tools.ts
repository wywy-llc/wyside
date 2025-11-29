import chalk from 'chalk';
import fs from 'fs/promises';
import { GoogleAuth } from 'google-auth-library';
import { google, sheets_v4 } from 'googleapis';
import path from 'path';

// 定数定義
const SHEETS_CONFIG = {
  VERSION: 'v4',
  SCOPE: 'https://www.googleapis.com/auth/spreadsheets',
  KEY_FILE_PATH: 'secrets/service-account.json',
  CONSTANTS_FILE_PATH: 'src/core/constants.ts',
} as const;

/**
 * ツール実行結果の型
 */
interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

/**
 * GridRange型（Named Range用）
 */
interface GridRange {
  sheetId: number;
  startRowIndex: number;
  endRowIndex?: number;
  startColumnIndex: number;
  endColumnIndex?: number;
}

/**
 * A1記法パース用の正規表現パターン
 */
const A1_PATTERNS = {
  COLUMN_ONLY: /^[A-Z]+$/,
  ROW_ONLY: /^\d+$/,
} as const;

/**
 * バッチ更新リクエストの型
 */
interface BatchUpdateRequest {
  deleteNamedRange?: { namedRangeId: string };
  addNamedRange?: {
    namedRange: {
      name: string;
      range: GridRange;
    };
  };
}

/**
 * 座標（行・列インデックス）
 */
interface Coordinate {
  rowIndex: number;
  colIndex: number;
}

/**
 * Google Sheets APIクライアントを取得
 *
 * @returns Sheets APIクライアント
 * @remarks サービスアカウント認証を使用。スプレッドシート全操作の権限を要求
 */
async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  const keyFile = path.join(process.cwd(), SHEETS_CONFIG.KEY_FILE_PATH);
  const auth = new GoogleAuth({
    keyFile,
    scopes: [SHEETS_CONFIG.SCOPE],
  });
  return google.sheets({ version: SHEETS_CONFIG.VERSION, auth });
}

/**
 * A1記法の座標文字列をインデックスに変換
 *
 * @param coord - A1記法の座標（例: "A1", "Z10"）
 * @returns 行・列のインデックス（0始まり）
 * @throws 無効な座標形式の場合
 * @remarks 列は英字（A=1, Z=26, AA=27...）、行は数字で表現
 */
function parseCoordinate(coord: string): Coordinate {
  const colMatch = coord.match(/[A-Z]+/);
  const rowMatch = coord.match(/[0-9]+/);

  if (!colMatch || !rowMatch) {
    throw new Error(`Invalid coordinate: ${coord}`);
  }

  return {
    rowIndex: parseInt(rowMatch[0], 10) - 1,
    colIndex: columnLetterToIndex(colMatch[0]),
  };
}

/**
 * A1記法をGridRangeに変換
 *
 * @param a1Notation - A1記法の範囲（例: "A1:B2", "E:E", "1:5"）
 * @param sheetId - シートID
 * @returns GridRange形式の範囲
 * @throws 無効なA1記法の場合
 * @remarks 単一セル（"A1"）、範囲（"A1:B2"）、列全体（"E:E"）、行全体（"1:5"）に対応
 */
function parseA1Notation(a1Notation: string, sheetId: number): GridRange {
  const parts = a1Notation.split(':');
  const start = parts[0];
  const end = parts[1] || start;

  // 列全体の指定（例: "E:E", "A:C"）
  if (
    A1_PATTERNS.COLUMN_ONLY.test(start) &&
    A1_PATTERNS.COLUMN_ONLY.test(end)
  ) {
    const startCol = columnLetterToIndex(start);
    const endCol = columnLetterToIndex(end);
    return {
      sheetId,
      startRowIndex: 0,
      startColumnIndex: startCol,
      endColumnIndex: endCol + 1,
    };
  }

  // 行全体の指定（例: "1:1", "5:10"）
  if (A1_PATTERNS.ROW_ONLY.test(start) && A1_PATTERNS.ROW_ONLY.test(end)) {
    const startRow = parseInt(start, 10) - 1;
    const endRow = parseInt(end, 10) - 1;
    return {
      sheetId,
      startRowIndex: startRow,
      endRowIndex: endRow + 1,
      startColumnIndex: 0,
    };
  }

  // 通常のセル範囲（例: "A1:B2", "A1"）
  const s = parseCoordinate(start);
  const e = parseCoordinate(end);

  return {
    sheetId,
    startRowIndex: s.rowIndex,
    endRowIndex: e.rowIndex + 1,
    startColumnIndex: s.colIndex,
    endColumnIndex: e.colIndex + 1,
  };
}

/**
 * 列の文字列をインデックスに変換（A=0, B=1, Z=25, AA=26...）
 *
 * @param col - 列の文字列（例: "A", "Z", "AA"）
 * @returns 列のインデックス（0始まり）
 */
function columnLetterToIndex(col: string): number {
  let index = 0;
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * スプレッドシートデータを取得（APIを1回だけ呼び出す）
 *
 * @param sheets - Sheets APIクライアント
 * @param spreadsheetId - スプレッドシートID
 * @returns スプレッドシートデータ
 * @remarks getSheetIdFromDataとfindExistingNamedRangeFromDataで共有するためのヘルパー
 */
async function getSpreadsheetData(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<sheets_v4.Schema$Spreadsheet> {
  const { data } = await sheets.spreadsheets.get({ spreadsheetId });
  return data;
}

/**
 * スプレッドシートデータからシートIDを取得
 *
 * @param spreadsheetData - スプレッドシートデータ
 * @param sheetName - シート名
 * @returns シートID
 * @throws シートが見つからない場合
 * @remarks シート名からシートIDを逆引き
 */
function getSheetIdFromData(
  spreadsheetData: sheets_v4.Schema$Spreadsheet,
  sheetName: string
): number {
  const sheet = spreadsheetData.sheets?.find(
    s => s.properties?.title === sheetName
  );

  if (!sheet || typeof sheet.properties?.sheetId !== 'number') {
    throw new Error(`Sheet "${sheetName}" not found in spreadsheet.`);
  }

  return sheet.properties.sheetId;
}

/**
 * スプレッドシートデータからNamed Rangeを検索
 *
 * @param spreadsheetData - スプレッドシートデータ
 * @param rangeName - 名前付き範囲の名前
 * @returns 既存のNamed Range ID（存在しない場合はundefined）
 * @remarks 既存のNamed Rangeを更新する際に使用
 */
function findExistingNamedRangeFromData(
  spreadsheetData: sheets_v4.Schema$Spreadsheet,
  rangeName: string
): string | undefined {
  const existing = spreadsheetData.namedRanges?.find(
    nr => nr.name === rangeName
  );
  return existing?.namedRangeId as string | undefined;
}

/**
 * constants.tsファイルを更新
 *
 * @param rangeName - 名前付き範囲の名前
 * @param headerRange - A1記法のヘッダー範囲
 * @param messages - 実行ログを格納する配列
 * @remarks constants.tsが存在しない場合は警告のみ表示
 */
async function updateConstantsFile(
  rangeName: string,
  headerRange: string,
  messages: string[]
): Promise<void> {
  const constantsPath = path.join(
    process.cwd(),
    SHEETS_CONFIG.CONSTANTS_FILE_PATH
  );

  const fileExists = await fs
    .access(constantsPath)
    .then(() => true)
    .catch(() => false);

  if (!fileExists) {
    messages.push(
      chalk.yellow(
        `⚠️  Constants file not found at ${constantsPath}. Skipping code update.`
      )
    );
    return;
  }

  let content = await fs.readFile(constantsPath, 'utf8');
  const exportLine = `export const ${rangeName} = '${headerRange}';`;
  const regex = new RegExp(`export const ${rangeName} = .*;`);

  if (regex.test(content)) {
    content = content.replace(regex, exportLine);
    messages.push(`Updated existing constant in ${constantsPath}`);
  } else {
    content += `\n${exportLine}\n`;
    messages.push(`Appended constant to ${constantsPath}`);
  }

  await fs.writeFile(constantsPath, content);
}

/**
 * A1記法の範囲文字列を正規化
 *
 * @param rawRange - 生の範囲文字列（シェルエスケープや余分なクォートを含む可能性がある）
 * @returns 正規化された範囲文字列
 * @remarks シェルエスケープ(\!)の削除、余分なクォートの除去を実施
 */
function normalizeHeaderRange(rawRange: string): string {
  let normalized = rawRange;

  // シェルエスケープされた文字を正規化
  normalized = normalized.replace(/\\!/g, '!'); // \! → !

  // 範囲全体がシングルクォートで囲まれている場合（'Todos!E:E'のような誤った形式）
  // ただし、Google Sheets形式のシート名エスケープ（'Sheet Name'!A1）は除外
  if (
    normalized.startsWith("'") &&
    normalized.endsWith("'") &&
    !normalized.includes("'!")
  ) {
    // 範囲全体を囲むクォートを削除
    normalized = normalized.slice(1, -1);
  }

  return normalized;
}

/**
 * A1記法範囲文字列からシート名とセル範囲を抽出
 *
 * @param headerRange - A1記法の範囲（例: "Sheet1!A1:B2", "'Sheet Name'!A1:B2"）
 * @returns シート名とセル範囲
 * @throws 無効な形式の場合
 */
function parseSheetNameAndRange(headerRange: string): {
  sheetName: string;
  cellRange: string;
} {
  // シート名に'!'が含まれる場合を考慮し、最初の'!'で分割
  // 例: "'My!Sheet'!A1:B2" → sheetName="'My!Sheet'", cellRange="A1:B2"
  const exclamationIndex = headerRange.indexOf('!');
  if (exclamationIndex === -1) {
    throw new Error('Range must be in format "SheetName!A1:B2"');
  }

  let sheetName = headerRange.substring(0, exclamationIndex);
  const cellRange = headerRange.substring(exclamationIndex + 1);

  // シート名がシングルクォートで囲まれている場合は削除
  if (sheetName.startsWith("'") && sheetName.endsWith("'")) {
    sheetName = sheetName.slice(1, -1);
  }

  if (!sheetName || !cellRange) {
    throw new Error('Range must be in format "SheetName!A1:B2"');
  }

  return { sheetName, cellRange };
}

/**
 * Named Range設定の引数
 */
export interface SetupNamedRangeArgs {
  /** スプレッドシートID */
  spreadsheetId: string;
  /** 名前付き範囲の名前（例: "TODO_RANGE"） */
  rangeName: string;
  /** A1記法のヘッダー行範囲（例: "Sheet1!A1:E1"） */
  headerRange: string;
}

/**
 * スプレッドシートにNamed Rangeを設定し、constants.tsを更新
 *
 * @param args - スプレッドシートID、範囲名、範囲を含む引数
 * @returns 実行結果（成功時は設定詳細、失敗時はエラー）
 * @remarks 既存のNamed Rangeがある場合は削除して再作成。constants.tsも自動更新
 */
export async function setupNamedRange(
  args: SetupNamedRangeArgs
): Promise<ToolResult> {
  const messages: string[] = [];

  try {
    const { spreadsheetId, rangeName, headerRange: rawRange } = args;

    if (!spreadsheetId || !rangeName || !rawRange) {
      throw new Error('spreadsheetId, rangeName, and headerRange are required');
    }

    // 範囲指定を正規化
    const headerRange = normalizeHeaderRange(rawRange);

    messages.push(
      `Setting up Named Range: ${chalk.bold(rangeName)} -> ${headerRange}`
    );

    const sheets = await getSheetsClient();

    // A1記法をパース
    const { sheetName, cellRange } = parseSheetNameAndRange(headerRange);

    // API呼び出しを1回だけ実行（パフォーマンス最適化）
    const spreadsheetData = await getSpreadsheetData(sheets, spreadsheetId);
    const sheetId = getSheetIdFromData(spreadsheetData, sheetName);
    const existingRangeId = findExistingNamedRangeFromData(
      spreadsheetData,
      rangeName
    );

    const requests: BatchUpdateRequest[] = [];

    if (existingRangeId) {
      messages.push(
        `Updating existing named range (ID: ${existingRangeId})...`
      );
      requests.push({
        deleteNamedRange: { namedRangeId: existingRangeId },
      });
    }

    const gridRange = parseA1Notation(cellRange, sheetId);
    requests.push({
      addNamedRange: {
        namedRange: {
          name: rangeName,
          range: gridRange,
        },
      },
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });

    await updateConstantsFile(rangeName, headerRange, messages);

    messages.push(chalk.green('✅ Named Range setup complete!'));

    return {
      content: [{ type: 'text', text: messages.join('\n') }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stackTrace = error instanceof Error ? error.stack : '';

    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}\n\nStack trace:\n${stackTrace}\n\nLogs:\n${messages.join('\n')}`,
        },
      ],
      isError: true,
    };
  }
}
