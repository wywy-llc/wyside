import { google as googleApi } from 'googleapis';

type Environment = 'gas' | 'node';

/**
 * UniversalGmailClient - GAS/Node.js両対応のGmailクライアント
 *
 * 🚨 重要: REST APIのみ使用（GmailAppは使用しない）
 * 認証部分のみ環境依存、それ以外は完全に同一のコード
 */
export class UniversalGmailClient {
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
        scopes: [
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.readonly',
        ],
      });

      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      this.authToken = tokenResponse.token!;
      return this.authToken;
    }
  }

  /**
   * メール送信
   * @param to 宛先メールアドレス
   * @param subject 件名
   * @param body 本文（プレーンテキスト）
   */
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const token = await this.getAuthToken();

    // RFC 2822形式のメールメッセージを作成
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ].join('\n');

    // Base64url エンコード
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedMessage }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `Gmail API Error [${response.status}]: ${data.error?.message || 'Unknown'}`
      );
    }
  }
}
