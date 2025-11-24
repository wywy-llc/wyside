import chalk from 'chalk';
import { GoogleAuth } from 'google-auth-library';
import { google, drive_v3 } from 'googleapis';
import path from 'path';

// 定数定義
const DRIVE_CONFIG = {
  VERSION: 'v3',
  SCOPE: 'https://www.googleapis.com/auth/drive',
  KEY_FILE_PATH: 'secrets/service-account.json',
} as const;

const DRIVE_DEFAULTS = {
  PAGE_SIZE: 10,
} as const;

const MIME_TYPES = {
  FOLDER: 'application/vnd.google-apps.folder',
} as const;

/**
 * ツール実行結果の型
 */
interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

/**
 * Google Drive APIクライアントを取得
 *
 * @returns Drive APIクライアント
 * @remarks サービスアカウント認証を使用。Drive全操作の権限を要求
 */
async function getDriveClient(): Promise<drive_v3.Drive> {
  const keyFile = path.join(process.cwd(), DRIVE_CONFIG.KEY_FILE_PATH);
  const auth = new GoogleAuth({
    keyFile,
    scopes: [DRIVE_CONFIG.SCOPE],
  });
  return google.drive({ version: DRIVE_CONFIG.VERSION, auth });
}

/**
 * エラーレスポンスを生成
 *
 * @param error - エラーオブジェクト
 * @returns ツール実行結果（エラー）
 * @remarks エラーメッセージを統一形式で返却
 */
function createErrorResult(error: unknown): ToolResult {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text', text: `Error: ${errorMessage}` }],
    isError: true,
  };
}

/**
 * フォルダ作成の引数
 */
export interface CreateFolderArgs {
  /** フォルダ名 */
  name: string;
  /** 親フォルダID（オプション） */
  parentId?: string;
}

/**
 * Google Driveにフォルダを作成
 *
 * @param args - フォルダ名と親フォルダIDを含む引数
 * @returns 実行結果（成功時はフォルダID、失敗時はエラー）
 * @remarks 親フォルダIDを指定しない場合はルートに作成
 */
export async function driveCreateFolder(
  args: CreateFolderArgs
): Promise<ToolResult> {
  const messages: string[] = [];

  try {
    const { name, parentId } = args;
    if (!name) throw new Error('Folder name is required');

    const drive = await getDriveClient();

    const fileMetadata: drive_v3.Schema$File = {
      name,
      mimeType: MIME_TYPES.FOLDER,
      ...(parentId && { parents: [parentId] }),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name',
    });

    messages.push(
      `Created folder: ${chalk.bold(file.data.name)} (ID: ${file.data.id})`
    );

    return {
      content: [{ type: 'text', text: messages.join('\n') }],
    };
  } catch (error) {
    return createErrorResult(error);
  }
}

/**
 * ファイル一覧取得の引数
 */
export interface ListFilesArgs {
  /** 検索クエリ（オプション） */
  query?: string;
  /** 取得件数（デフォルト: 10） */
  pageSize?: number;
}

/**
 * Google Driveのファイル一覧を取得
 *
 * @param args - 検索クエリと取得件数を含む引数
 * @returns 実行結果（成功時はファイルリスト、失敗時はエラー）
 * @remarks 各ファイルの名前、MIMEタイプ、IDを表示
 */
export async function driveListFiles(args: ListFilesArgs): Promise<ToolResult> {
  try {
    const { query, pageSize = DRIVE_DEFAULTS.PAGE_SIZE } = args;
    const drive = await getDriveClient();

    const res = await drive.files.list({
      q: query,
      pageSize,
      fields: 'files(id, name, mimeType)',
    });

    const files = res.data.files;
    if (!files || files.length === 0) {
      return { content: [{ type: 'text', text: 'No files found.' }] };
    }

    const fileList = files
      .map(f => `- ${f.name} (${f.mimeType}) [ID: ${f.id}]`)
      .join('\n');

    return { content: [{ type: 'text', text: `Files found:\n${fileList}` }] };
  } catch (error) {
    return createErrorResult(error);
  }
}
