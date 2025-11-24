import { getOAuthToken } from '../utils/auth.js';
import { Fetch } from '../utils/fetch.js';

/**
 * Sheets client with methods for interacting with Google Sheets API
 *
 * 🚨 重要: GAS環境ではfetch APIが存在しないため、UrlFetchAppを使用したポリフィルを実装
 * 認証部分のみ環境依存、それ以外は完全に同一のコード
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

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `Sheets API Error [${response.status}]: ${data.error?.message || 'Unknown'}`
      );
    }
    return data;
  };

  const batchGet = async (
    spreadsheetId: string,
    ranges: string[]
  ): Promise<any> => {
    const token = await getOAuthToken([
      'https://www.googleapis.com/auth/spreadsheets',
    ]);
    const rangesQuery = ranges
      .map(r => `ranges=${encodeURIComponent(r)}`)
      .join('&');

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `Sheets API Error [${response.status}]: ${data.error?.message || 'Unknown'}`
      );
    }
    return data;
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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `Sheets API Error [${response.status}]: ${data.error?.message || 'Unknown'}`
      );
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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `Sheets API Error [${response.status}]: ${data.error?.message || 'Unknown'}`
      );
    }
    return data;
  };

  return {
    batchUpdate,
    batchGet,
    appendValues,
    updateValues,
  } as const;
})();
