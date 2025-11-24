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
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
}

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

  const colStr = colMatch[0];
  let colIndex = 0;
  for (let i = 0; i < colStr.length; i++) {
    colIndex = colIndex * 26 + (colStr.charCodeAt(i) - 64);
  }

  return {
    rowIndex: parseInt(rowMatch[0], 10) - 1,
    colIndex: colIndex - 1,
  };
}

/**
 * A1記法をGridRangeに変換
 *
 * @param a1Notation - A1記法の範囲（例: "A1:B2"）
 * @param sheetId - シートID
 * @returns GridRange形式の範囲
 * @throws 無効なA1記法の場合
 * @remarks 単一セル（"A1"）や範囲（"A1:B2"）の両方に対応
 */
function parseA1Notation(a1Notation: string, sheetId: number): GridRange {
  const parts = a1Notation.split(':');
  const start = parts[0];
  const end = parts[1] || start;

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
 * スプレッドシートからシートIDを取得
 *
 * @param sheets - Sheets APIクライアント
 * @param spreadsheetId - スプレッドシートID
 * @param sheetName - シート名
 * @returns シートID
 * @throws シートが見つからない場合
 * @remarks シート名からシートIDを逆引き
 */
async function getSheetId(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string
): Promise<number> {
  const { data: ss } = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = ss.sheets?.find(s => s.properties?.title === sheetName);

  if (!sheet || typeof sheet.properties?.sheetId !== 'number') {
    throw new Error(`Sheet "${sheetName}" not found in spreadsheet.`);
  }

  return sheet.properties.sheetId;
}

/**
 * Named Rangeの存在確認
 *
 * @param sheets - Sheets APIクライアント
 * @param spreadsheetId - スプレッドシートID
 * @param rangeName - 名前付き範囲の名前
 * @returns 既存のNamed Range ID（存在しない場合はundefined）
 * @remarks 既存のNamed Rangeを更新する際に使用
 */
async function findExistingNamedRange(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  rangeName: string
): Promise<string | undefined> {
  const { data: ss } = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = ss.namedRanges?.find(nr => nr.name === rangeName);
  return existing?.namedRangeId as string | undefined;
}

/**
 * constants.tsファイルを更新
 *
 * @param rangeName - 名前付き範囲の名前
 * @param range - A1記法の範囲
 * @param messages - 実行ログを格納する配列
 * @remarks constants.tsが存在しない場合は警告のみ表示
 */
async function updateConstantsFile(
  rangeName: string,
  range: string,
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
  const exportLine = `export const ${rangeName} = '${range}';`;
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
 * Named Range設定の引数
 */
export interface SetupNamedRangeArgs {
  /** スプレッドシートID */
  spreadsheetId: string;
  /** 名前付き範囲の名前（例: "TODO_RANGE"） */
  rangeName: string;
  /** A1記法の範囲（例: "Sheet1!A1:B10"） */
  range: string;
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
    const { spreadsheetId, rangeName, range } = args;
    if (!spreadsheetId || !rangeName || !range) {
      throw new Error('spreadsheetId, rangeName, and range are required');
    }

    messages.push(
      `Setting up Named Range: ${chalk.bold(rangeName)} -> ${range}`
    );

    const sheets = await getSheetsClient();

    // A1記法をパース（例: "Sheet1!A1:B2" -> sheetName + cellRange）
    const rangeParts = range.split('!');
    const [sheetName, cellRange] = [
      rangeParts[0],
      rangeParts.slice(1).join('!'),
    ];

    if (!sheetName || !cellRange) {
      throw new Error('Range must be in format "SheetName!A1:B2"');
    }

    const sheetId = await getSheetId(sheets, spreadsheetId, sheetName);
    const existingRangeId = await findExistingNamedRange(
      sheets,
      spreadsheetId,
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

    await updateConstantsFile(rangeName, range, messages);

    messages.push(chalk.green('✅ Named Range setup complete!'));

    return {
      content: [{ type: 'text', text: messages.join('\n') }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}\nLogs:\n${messages.join('\n')}`,
        },
      ],
      isError: true,
    };
  }
}
