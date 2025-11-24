import { getOAuthToken } from '../utils/auth.js';
import { Fetch } from '../utils/fetch.js';
import { isGasEnvironment } from '../config.js';

/**
 * Environment-aware Base64url encoding with proper UTF-8 handling
 * GAS: Uses Utilities.base64EncodeWebSafe() with UTF-8 Blob
 * Node.js: Uses Buffer.from().toString('base64url')
 */
function base64urlEncode(str: string): string {
  if (isGasEnvironment()) {
    // GAS環境: UTF-8 Blobに変換してからエンコード
    const blob = Utilities.newBlob(str, 'text/plain', 'temp');
    const bytes = blob.getBytes();
    return Utilities.base64EncodeWebSafe(bytes);
  } else {
    // Node.js環境: Bufferを使用
    return Buffer.from(str, 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

/**
 * RFC 2047 encoding for email headers (Subject, etc.)
 * Encodes non-ASCII characters as =?UTF-8?B?[base64]?=
 */
function encodeRFC2047(str: string): string {
  // ASCII only - no encoding needed
  // Check for any character >= U+0080 (non-ASCII)
  if (!/[\u0080-\uFFFF]/.test(str)) {
    return str;
  }

  // Encode as UTF-8 Base64
  let base64: string;
  if (isGasEnvironment()) {
    const blob = Utilities.newBlob(str, 'text/plain', 'temp');
    base64 = Utilities.base64Encode(blob.getBytes());
  } else {
    base64 = Buffer.from(str, 'utf-8').toString('base64');
  }

  return `=?UTF-8?B?${base64}?=`;
}

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
    // Subject: RFC 2047エンコーディング（日本語対応）
    const encodedSubject = encodeRFC2047(subject);

    const message = [
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      '', // 空行でヘッダーとボディを分離
    ].join('\r\n');

    // Body部分を別途Base64エンコード
    let bodyBase64: string;
    if (isGasEnvironment()) {
      const blob = Utilities.newBlob(body, 'text/plain', 'temp');
      bodyBase64 = Utilities.base64Encode(blob.getBytes());
    } else {
      bodyBase64 = Buffer.from(body, 'utf-8').toString('base64');
    }

    // ヘッダー + Base64エンコードされた本文
    const fullMessage = message + bodyBase64;

    // メッセージ全体をBase64url エンコード
    const encodedMessage = base64urlEncode(fullMessage);

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
