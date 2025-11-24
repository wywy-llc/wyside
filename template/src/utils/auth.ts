import { google as googleApi } from 'googleapis';
import { isGasEnvironment } from '../config.js';

/**
 * 環境に応じたOAuth認証トークンを取得
 *
 * GAS環境: ScriptApp.getOAuthToken()を使用
 * Node.js環境: Service Account認証を使用
 *
 * @param scopes - 必要なOAuthスコープ
 * @returns OAuth認証トークン
 *
 * @example
 * ```typescript
 * import { getOAuthToken } from './utils/auth.js';
 *
 * const token = await getOAuthToken(['https://www.googleapis.com/auth/spreadsheets']);
 * ```
 */
export const getOAuthToken = async (scopes: string[]): Promise<string> => {
  if (isGasEnvironment()) {
    // GAS環境: ScriptApp.getOAuthToken()を使用
    return ScriptApp.getOAuthToken();
  } else {
    // Node.js環境: Service Account認証
    const auth = new googleApi.auth.GoogleAuth({
      keyFile:
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        './secrets/service-account.json',
      scopes,
    });

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    return tokenResponse.token!;
  }
};
