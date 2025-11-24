import { google as googleApi } from 'googleapis';

type Environment = 'gas' | 'node';

/**
 * UniversalSheetsClient - GAS/Node.js両対応のSheetsクライアント
 *
 * 🚨 重要: GAS V8は標準fetch APIをサポートしているため、Polyfill不要
 * 認証部分のみ環境依存、それ以外は完全に同一のコード
 */
export class UniversalSheetsClient {
  private env: Environment;
  private authToken: string | null = null;

  constructor() {
    this.env = this.detectEnvironment();
  }

  private detectEnvironment(): Environment {
    // GAS環境判定
    return typeof ScriptApp !== 'undefined' ? 'gas' : 'node';
  }

  /**
   * 環境に応じた認証トークンを取得
   * GAS: ScriptApp.getOAuthToken()
   * Node.js: googleapis経由でService Account認証
   */
  private async getAuthToken(): Promise<string> {
    if (this.authToken) return this.authToken;

    if (this.env === 'gas') {
      // GAS環境
      return ScriptApp.getOAuthToken();
    } else {
      // Node.js環境: Service Account認証
      const auth = new googleApi.auth.GoogleAuth({
        keyFile:
          process.env.GOOGLE_APPLICATION_CREDENTIALS ||
          './secrets/service-account.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      this.authToken = tokenResponse.token!;
      return this.authToken;
    }
  }

  /**
   * ✅ GASとNode.jsで完全に同一のfetch実装
   */
  async batchUpdate(spreadsheetId: string, requests: any[]): Promise<any> {
    const token = await this.getAuthToken();

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
  }

  async batchGet(spreadsheetId: string, ranges: string[]): Promise<any> {
    const token = await this.getAuthToken();
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
  }

  async appendValues(
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<any> {
    const token = await this.getAuthToken();

    const response = await fetch(
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
  }

  async updateValues(
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<any> {
    const token = await this.getAuthToken();

    const response = await fetch(
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
  }
}
