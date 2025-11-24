import { getOAuthToken } from '../utils/auth.js';
import { Fetch } from '../utils/fetch.js';

/**
 * Gmail client with methods for interacting with Gmail API
 *
 * 🚨 重要: client.tsと完全に同じIIFEパターンで実装
 * 認証部分のみ環境依存、それ以外は完全に同一のコード
 *
 * @example
 * ```typescript
 * import { GmailClient } from './core/gmail-client.js';
 *
 * await GmailClient.sendEmail('user@example.com', 'Subject', 'Body text');
 * ```
 */
export const GmailClient = ((authToken: string | null = null) => {
  /**
   * 環境に応じた認証トークンを取得（キャッシュ機能付き）
   */
  const getAuthToken = async (): Promise<string> => {
    if (authToken) return authToken;

    authToken = await getOAuthToken([
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
    ]);
    return authToken;
  };

  /**
   * ✅ GASとNode.jsで完全に同一の実装（内部でFetch.requestを使用）
   * メール送信
   * @param to 宛先メールアドレス
   * @param subject 件名
   * @param body 本文（プレーンテキスト）
   */
  const sendEmail = async (
    to: string,
    subject: string,
    body: string
  ): Promise<void> => {
    const token = await getAuthToken();

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

    const response = await Fetch.request(
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
  };

  return {
    sendEmail,
  } as const;
})();
