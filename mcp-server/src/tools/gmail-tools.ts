import { GoogleAuth } from 'google-auth-library';
import { google, gmail_v1 } from 'googleapis';
import path from 'path';

// 定数定義
const GMAIL_SCOPES = {
  SEND: 'https://www.googleapis.com/auth/gmail.send',
  READONLY: 'https://www.googleapis.com/auth/gmail.readonly',
} as const;

const GMAIL_CONFIG = {
  VERSION: 'v1',
  USER_ID: 'me',
  KEY_FILE_PATH: 'secrets/service-account.json',
} as const;

/**
 * ツール実行結果の型
 */
interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

/**
 * Gmail APIクライアントを取得
 *
 * @returns Gmail APIクライアント
 * @remarks サービスアカウント認証を使用。送信および読み取り権限を要求
 */
async function getGmailClient(): Promise<gmail_v1.Gmail> {
  const keyFile = path.join(process.cwd(), GMAIL_CONFIG.KEY_FILE_PATH);
  const auth = new GoogleAuth({
    keyFile,
    scopes: [GMAIL_SCOPES.SEND, GMAIL_SCOPES.READONLY],
  });
  return google.gmail({ version: GMAIL_CONFIG.VERSION, auth });
}

/**
 * メールメッセージをRFC 2822形式で構築
 *
 * @param to - 送信先メールアドレス
 * @param subject - メール件名
 * @param body - メール本文
 * @returns RFC 2822形式のメール文字列
 * @remarks Content-Typeにutf-8を指定して日本語対応
 */
function buildEmailMessage(to: string, subject: string, body: string): string {
  return [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\n');
}

/**
 * メッセージをGmail API用にBase64 URL-safeエンコード
 *
 * @param message - エンコード対象のメッセージ
 * @returns Base64 URL-safe形式の文字列
 * @remarks +を-に、/を_に置換し、末尾の=を削除
 */
function encodeMessageForGmail(message: string): string {
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * エラーレスポンスを生成
 *
 * @param error - エラーオブジェクト
 * @param additionalNote - 追加の注意事項（オプション）
 * @returns ツール実行結果（エラー）
 * @remarks エラーメッセージを統一形式で返却
 */
function createErrorResult(
  error: unknown,
  additionalNote?: string
): ToolResult {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const text = additionalNote
    ? `Error: ${errorMessage}\n${additionalNote}`
    : `Error: ${errorMessage}`;

  return {
    content: [{ type: 'text', text }],
    isError: true,
  };
}

/**
 * メール送信の引数
 */
export interface SendEmailArgs {
  /** 送信先メールアドレス */
  to: string;
  /** メール件名 */
  subject: string;
  /** メール本文 */
  body: string;
}

/**
 * Gmail APIを使用してメールを送信
 *
 * @param args - 送信先、件名、本文を含む引数
 * @returns 実行結果（成功時はメッセージID、失敗時はエラー）
 * @remarks サービスアカウント使用時は、Domain-Wide Delegation設定が必要な場合がある
 */
export async function gmailSendEmail(args: SendEmailArgs): Promise<ToolResult> {
  try {
    const { to, subject, body } = args;
    if (!to || !subject || !body) {
      throw new Error('to, subject, and body are required');
    }

    const message = buildEmailMessage(to, subject, body);
    const encodedMessage = encodeMessageForGmail(message);

    const gmail = await getGmailClient();
    const res = await gmail.users.messages.send({
      userId: GMAIL_CONFIG.USER_ID,
      requestBody: { raw: encodedMessage },
    });

    return {
      content: [{ type: 'text', text: `Email sent. ID: ${res.data.id}` }],
    };
  } catch (error) {
    return createErrorResult(
      error,
      "Note: Sending email via Service Account requires 'me' to be the SA email or using impersonation (which requires Domain-Wide Delegation)."
    );
  }
}

/**
 * Gmailのラベル一覧を取得
 *
 * @returns 実行結果（成功時はラベルリスト、失敗時はエラー）
 * @remarks 各ラベルの名前、タイプ、IDを表示
 */
export async function gmailListLabels(): Promise<ToolResult> {
  try {
    const gmail = await getGmailClient();
    const res = await gmail.users.labels.list({ userId: GMAIL_CONFIG.USER_ID });
    const labels = res.data.labels;

    if (!labels || labels.length === 0) {
      return { content: [{ type: 'text', text: 'No labels found.' }] };
    }

    const list = labels
      .map(l => `- ${l.name} (${l.type}) [ID: ${l.id}]`)
      .join('\n');

    return { content: [{ type: 'text', text: `Labels:\n${list}` }] };
  } catch (error) {
    return createErrorResult(error);
  }
}
