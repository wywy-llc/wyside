import { google, sheets_v4 } from 'googleapis';

/**
 * Google Sheets APIクライアントのインスタンス型
 *
 * @remarks Node.js環境専用。googleapisライブラリを使用
 */
export type SheetsClientInstance = sheets_v4.Sheets;

/**
 * Google Sheets APIクライアントを取得
 *
 * @returns Sheets APIクライアントのインスタンス
 * @remarks 環境変数GOOGLE_APPLICATION_CREDENTIALSからサービスアカウントキーを読み込み
 */
export async function getSheetsClient(): Promise<SheetsClientInstance> {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  return sheets;
}

/**
 * Sheets APIクライアントの基本操作を提供するユーティリティ
 *
 * @example
 * ```typescript
 * import { SheetsClient } from './core/client.js';
 *
 * const client = await SheetsClient.create();
 * const data = await SheetsClient.batchGet(client, spreadsheetId, ['Sheet1!A1:B10']);
 * await SheetsClient.batchUpdate(client, spreadsheetId, requests);
 * ```
 */
export const SheetsClient = {
  /**
   * Sheets APIクライアントを作成
   */
  create: getSheetsClient,

  /**
   * batchUpdateを実行
   *
   * @param client - Sheets APIクライアント
   * @param spreadsheetId - スプレッドシートID
   * @param requests - 更新リクエストの配列
   * @returns APIレスポンス
   */
  async batchUpdate(
    client: SheetsClientInstance,
    spreadsheetId: string,
    requests: any[]
  ): Promise<sheets_v4.Schema$BatchUpdateSpreadsheetResponse> {
    const response = await client.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    return response.data;
  },

  /**
   * batchGetを実行
   *
   * @param client - Sheets APIクライアント
   * @param spreadsheetId - スプレッドシートID
   * @param ranges - 取得する範囲の配列（A1記法）
   * @returns APIレスポンス
   */
  async batchGet(
    client: SheetsClientInstance,
    spreadsheetId: string,
    ranges: string[]
  ): Promise<sheets_v4.Schema$BatchGetValuesResponse> {
    const response = await client.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });
    return response.data;
  },

  /**
   * 値を追加
   *
   * @param client - Sheets APIクライアント
   * @param spreadsheetId - スプレッドシートID
   * @param range - 追加先の範囲（A1記法）
   * @param values - 追加する値の2次元配列
   * @returns APIレスポンス
   */
  async appendValues(
    client: SheetsClientInstance,
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<sheets_v4.Schema$AppendValuesResponse> {
    const response = await client.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    return response.data;
  },

  /**
   * 値を更新
   *
   * @param client - Sheets APIクライアント
   * @param spreadsheetId - スプレッドシートID
   * @param range - 更新する範囲（A1記法）
   * @param values - 更新する値の2次元配列
   * @returns APIレスポンス
   */
  async updateValues(
    client: SheetsClientInstance,
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<sheets_v4.Schema$UpdateValuesResponse> {
    const response = await client.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    return response.data;
  },
} as const;
