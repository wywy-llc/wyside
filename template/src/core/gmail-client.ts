import { isGasEnvironment } from '../config.js';
import { getOAuthToken } from '../utils/auth.js';
import { Fetch } from '../utils/fetch.js';

/**
 * Convert string to UTF-8 bytes in environment-aware manner
 * Used for proper encoding of multibyte characters (Japanese, emojis, etc.)
 *
 * @param str - Input string
 * @returns UTF-8 byte array (GAS) or Buffer (Node.js)
 */
function toUTF8Bytes(str: string): number[] | Buffer {
  if (isGasEnvironment()) {
    const blob = Utilities.newBlob(str, 'text/plain', 'UTF-8');
    return blob.getBytes();
  } else {
    return Buffer.from(str, 'utf-8');
  }
}

/**
 * Environment-aware Base64 encoding (standard)
 *
 * @param bytes - UTF-8 byte array or Buffer
 * @returns Standard Base64 string
 */
function base64Encode(bytes: number[] | Buffer): string {
  if (isGasEnvironment()) {
    return Utilities.base64Encode(bytes as number[]);
  } else {
    return (bytes as Buffer).toString('base64');
  }
}

/**
 * Environment-aware Base64url encoding with proper UTF-8 handling
 * Converts Base64 to URL-safe format: + → -, / → _, remove padding =
 *
 * @param str - Input string
 * @returns Base64url encoded string
 */
function base64urlEncode(str: string): string {
  const bytes = toUTF8Bytes(str);

  if (isGasEnvironment()) {
    return Utilities.base64EncodeWebSafe(bytes as number[]);
  } else {
    return (bytes as Buffer)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

/**
 * RFC 2047 encoding for email headers (Subject, etc.)
 * Encodes non-ASCII characters as =?UTF-8?B?[base64]?=
 *
 * Supports full Unicode range including emojis and surrogate pairs.
 *
 * @param str - Header field value
 * @returns RFC 2047 encoded string (or original if ASCII only)
 *
 * @example
 * encodeRFC2047("Hello") → "Hello"
 * encodeRFC2047("こんにちは") → "=?UTF-8?B?44GT44KT44Gr44Gh44Gv?="
 * encodeRFC2047("📧 メール") → "=?UTF-8?B?8J+Sp+ODoeODvOODqw==?="
 */
function encodeRFC2047(str: string): string {
  // Check for non-ASCII characters (supports surrogate pairs)
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(str)) {
    return str; // ASCII only - no encoding needed
  }

  // Encode as UTF-8 Base64
  const bytes = toUTF8Bytes(str);
  const base64 = base64Encode(bytes);

  return `=?UTF-8?B?${base64}?=`;
}

/**
 * Gmail client with methods for interacting with Gmail API
 *
 * @example
 * ```typescript
 * import { GmailClient } from './core/gmail-client.js';
 *
 * await GmailClient.sendEmail('user@example.com', 'Subject', 'Body text');
 * ```
 */
export const GmailClient = ((authToken: string | null = null) => {
  const getAuthToken = async (): Promise<string> => {
    if (authToken) return authToken;

    authToken = await getOAuthToken([
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
    ]);
    return authToken;
  };

  /**
   * Send email via Gmail API
   * Supports Japanese and other multibyte characters (including emojis)
   *
   * @param to - Recipient email address
   * @param subject - Email subject (supports Japanese/emojis)
   * @param body - Email body (plain text, supports Japanese/emojis)
   * @throws Error if Gmail API returns an error
   */
  const sendEmail = async (
    to: string,
    subject: string,
    body: string
  ): Promise<void> => {
    const token = await getAuthToken();

    // Encode subject with RFC 2047 (supports Japanese/emojis)
    const encodedSubject = encodeRFC2047(subject);

    // Construct RFC 2822 email message header
    const header = [
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      '', // Empty line separates header from body
    ].join('\r\n');

    // Encode body as Base64 (supports Japanese/emojis)
    const bodyBytes = toUTF8Bytes(body);
    const bodyBase64 = base64Encode(bodyBytes);

    // Complete message: header + base64-encoded body
    const fullMessage = header + bodyBase64;

    // Encode entire message as Base64url for Gmail API
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
