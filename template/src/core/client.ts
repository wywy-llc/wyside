/**
 * Copyright 2025 wywy LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * you may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Copyright 2025 wywy LLC
 * Licensed under the Apache License, Version 2.0
 */

type Environment = 'gas' | 'node';

export class UniversalSheetsClient {
  private env: Environment;
  private auth: any;

  constructor() {
    this.env = this.detectEnvironment();
  }

  private detectEnvironment(): Environment {
    return typeof UrlFetchApp !== 'undefined' ? 'gas' : 'node';
  }

  async batchUpdate(spreadsheetId: string, requests: any[]): Promise<any> {
    return this.env === 'gas'
      ? this.gasBatchUpdate(spreadsheetId, requests)
      : this.nodeBatchUpdate(spreadsheetId, requests);
  }

  async batchGet(spreadsheetId: string, ranges: string[]): Promise<any> {
    return this.env === 'gas'
      ? this.gasBatchGet(spreadsheetId, ranges)
      : this.nodeBatchGet(spreadsheetId, ranges);
  }

  // === GAS Implementation ===
  private gasBatchUpdate(spreadsheetId: string, requests: any[]): any {
    const token = ScriptApp.getOAuthToken();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;

    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify({ requests }),
      muteHttpExceptions: true,
    });

    const result = JSON.parse(response.getContentText());
    if (response.getResponseCode() !== 200) {
      throw new Error(
        `Sheets API Error: ${result.error?.message || 'Unknown'}`
      );
    }
    return result;
  }

  private gasBatchGet(spreadsheetId: string, ranges: string[]): any {
    const token = ScriptApp.getOAuthToken();
    const rangesQuery = ranges
      .map(r => `ranges=${encodeURIComponent(r)}`)
      .join('&');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}`;

    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true,
    });

    return JSON.parse(response.getContentText());
  }

  // === Node.js Implementation ===
  private async nodeBatchUpdate(
    spreadsheetId: string,
    requests: any[]
  ): Promise<any> {
    const { google } = await import('googleapis');
    const auth = await this.getNodeAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    return response.data;
  }

  private async nodeBatchGet(
    spreadsheetId: string,
    ranges: string[]
  ): Promise<any> {
    const { google } = await import('googleapis');
    const auth = await this.getNodeAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });
    return response.data;
  }

  private async getNodeAuth() {
    if (this.auth) return this.auth;

    const { google } = await import('googleapis');
    const path = await import('path');

    const keyFilePath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      path.join(process.cwd(), 'secrets/service-account.json');

    this.auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return this.auth;
  }
}
