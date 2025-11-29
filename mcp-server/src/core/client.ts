import { getOAuthToken } from '../utils/auth.js';
import { Fetch } from '../utils/fetch.js';

/**
 * Sheets API Response Types
 * 最小限の型定義でESLintエラーを回避
 */
interface ValueRange {
  range?: string;
  values?: string[][];
}

interface BatchGetValuesResponse {
  valueRanges?: ValueRange[];
}

interface SheetsApiError {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

/**
 * Generic type for Sheets API responses (success or error)
 */
type SheetsApiResponse<T> = (T & Partial<SheetsApiError>) | SheetsApiError;

/**
 * Sheets client with methods for interacting with Google Sheets API
 *
 * 🚨 重要: GAS環境ではfetch APIが存在しないため、UrlFetchAppを使用したポリフィルを実装
 * 認証部分のみ環境依存、それ以外は完全に同一のコード
 *
 * ✅ この実装はtemplate/src/core/client.tsと完全に同一
 * - Node.js環境: googleapis Service Account経由でOAuth token取得、fetch API使用
 * - GAS環境: ScriptApp.getOAuthToken()、UrlFetchApp使用
 *
 * @example
 * ```typescript
 * import { SheetsClient } from './core/client.js';
 *
 * const data = await SheetsClient.batchGet(spreadsheetId, ['Sheet1!A1:B10']);
 * await SheetsClient.batchUpdate(spreadsheetId, [requests]);
 * ```
 */
export const SheetsClient = (() => {
  /**
   * ✅ GASとNode.jsで完全に同一のfetch実装
   */
  const batchUpdate = async (
    spreadsheetId: string,
    requests: any[]
  ): Promise<any> => {
    const token = await getOAuthToken([
      'https://www.googleapis.com/auth/spreadsheets',
    ]);

    const response = await Fetch.request(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );

    const data = (await response.json()) as unknown as SheetsApiResponse<any>;
    if (!response.ok) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Sheets API error object structure
      const errorMessage = data.error?.message || 'Unknown';
      throw new Error(`Sheets API Error [${response.status}]: ${errorMessage}`);
    }
    return data;
  };

  const batchGet = async (
    spreadsheetId: string,
    ranges: string[]
  ): Promise<BatchGetValuesResponse> => {
    const token = await getOAuthToken([
      'https://www.googleapis.com/auth/spreadsheets',
    ]);
    const rangesQuery = ranges
      .map(r => `ranges=${encodeURIComponent(r)}`)
      .join('&');

    const response = await Fetch.request(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data =
      (await response.json()) as unknown as SheetsApiResponse<BatchGetValuesResponse>;
    if (!response.ok) {
      const errorMessage = data.error?.message || 'Unknown';
      throw new Error(`Sheets API Error [${response.status}]: ${errorMessage}`);
    }
    return data as BatchGetValuesResponse;
  };

  const appendValues = async (
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<any> => {
    const token = await getOAuthToken([
      'https://www.googleapis.com/auth/spreadsheets',
    ]);

    const response = await Fetch.request(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    const data = (await response.json()) as unknown as SheetsApiResponse<any>;
    if (!response.ok) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Sheets API error object structure
      const errorMessage = data.error?.message || 'Unknown';
      throw new Error(`Sheets API Error [${response.status}]: ${errorMessage}`);
    }
    return data;
  };

  const updateValues = async (
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<any> => {
    const token = await getOAuthToken([
      'https://www.googleapis.com/auth/spreadsheets',
    ]);

    const response = await Fetch.request(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    const data = (await response.json()) as unknown as SheetsApiResponse<any>;
    if (!response.ok) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Sheets API error object structure
      const errorMessage = data.error?.message || 'Unknown';
      throw new Error(`Sheets API Error [${response.status}]: ${errorMessage}`);
    }
    return data;
  };

  const batchUpdateValues = async (
    spreadsheetId: string,
    valueRanges: Array<{ range: string; values: any[][] }>
  ): Promise<any> => {
    const token = await getOAuthToken([
      'https://www.googleapis.com/auth/spreadsheets',
    ]);

    const response = await Fetch.request(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: valueRanges }),
      }
    );

    const data = (await response.json()) as unknown as SheetsApiResponse<any>;
    if (!response.ok) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Sheets API error object structure
      const errorMessage = data.error?.message || 'Unknown';
      throw new Error(`Sheets API Error [${response.status}]: ${errorMessage}`);
    }
    return data;
  };

  return {
    batchUpdate,
    batchGet,
    appendValues,
    updateValues,
    batchUpdateValues,
  } as const;
})();
