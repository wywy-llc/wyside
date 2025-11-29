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
 * IIFEパターンで実装され、内部でクライアントインスタンスを管理
 *
 * @example
 * ```typescript
 * import { SheetsClient } from './core/client.js';
 *
 * const data = await SheetsClient.batchGet(spreadsheetId, ['Sheet1!A1:B10']);
 * await SheetsClient.batchUpdate(spreadsheetId, requests);
 * ```
 */
export const SheetsClient = (() => {
  let clientInstance: SheetsClientInstance | null = null;

  /**
   * クライアントインスタンスを取得または作成
   */
  const getClient = async (): Promise<SheetsClientInstance> => {
    if (!clientInstance) {
      clientInstance = await getSheetsClient();
    }
    return clientInstance;
  };

  return {
    /**
     * Sheets APIクライアントを作成（互換性のため維持）
     */
    create: getSheetsClient,

    /**
     * batchUpdateを実行
     *
     * @param spreadsheetId - スプレッドシートID
     * @param requests - 更新リクエストの配列
     * @returns APIレスポンス
     */
    async batchUpdate(
      spreadsheetId: string,
      requests: any[]
    ): Promise<sheets_v4.Schema$BatchUpdateSpreadsheetResponse> {
      const client = await getClient();
      const response = await client.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
      return response.data;
    },

    /**
     * batchGetを実行
     *
     * @param spreadsheetId - スプレッドシートID
     * @param ranges - 取得する範囲の配列（A1記法）
     * @returns APIレスポンス
     */
    async batchGet(
      spreadsheetId: string,
      ranges: string[]
    ): Promise<sheets_v4.Schema$BatchGetValuesResponse> {
      const client = await getClient();
      const response = await client.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges,
      });
      return response.data;
    },

    /**
     * 値を追加
     *
     * @param spreadsheetId - スプレッドシートID
     * @param range - 追加先の範囲（A1記法）
     * @param values - 追加する値の2次元配列
     * @returns APIレスポンス
     */
    async appendValues(
      spreadsheetId: string,
      range: string,
      values: any[][]
    ): Promise<sheets_v4.Schema$AppendValuesResponse> {
      const client = await getClient();
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
     * @param spreadsheetId - スプレッドシートID
     * @param range - 更新する範囲（A1記法）
     * @param values - 更新する値の2次元配列
     * @returns APIレスポンス
     */
    async updateValues(
      spreadsheetId: string,
      range: string,
      values: any[][]
    ): Promise<sheets_v4.Schema$UpdateValuesResponse> {
      const client = await getClient();
      const response = await client.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values },
      });
      return response.data;
    },

    /**
     * 複数の範囲の値を一括更新
     *
     * @param spreadsheetId - スプレッドシートID
     * @param valueRanges - 更新する範囲と値の配列
     * @returns APIレスポンス
     */
    async batchUpdateValues(
      spreadsheetId: string,
      valueRanges: Array<{ range: string; values: any[][] }>
    ): Promise<sheets_v4.Schema$BatchUpdateValuesResponse> {
      const client = await getClient();
      const response = await client.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: valueRanges,
        },
      });
      return response.data;
    },
  } as const;
})();
