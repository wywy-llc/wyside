import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs/promises';
import path from 'path';

/**
 * ファイルの存在確認
 *
 * @param path - 確認対象のファイルパス
 * @returns ファイルが存在する場合true
 * @remarks fs.accessを使用してファイルアクセス可能性を確認
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * gcloud CLIの利用可能性確認
 *
 * @throws gcloud CLIがインストールされていない、またはPATHに存在しない場合
 * @remarks GCP操作の前提条件として必須
 */
async function ensureGcloud() {
  try {
    await execa('gcloud', ['--version']);
  } catch (e) {
    throw new Error(
      'gcloud CLI is not installed or not in PATH. Please install Google Cloud SDK.'
    );
  }
}

/**
 * GCPプロジェクトIDの取得
 *
 * @param projectId - 明示的に指定されたプロジェクトID（オプション）
 * @returns 使用するGCPプロジェクトID
 * @throws プロジェクトIDが指定されておらず、gcloudのデフォルト設定もない場合
 * @remarks 明示的指定を優先し、未指定時はgcloud configから取得
 */
async function getGcpProject(projectId?: string): Promise<string> {
  if (projectId) return projectId;
  try {
    const { stdout } = await execa('gcloud', [
      'config',
      'get-value',
      'project',
    ]);
    if (stdout && stdout !== '(unset)') return stdout.trim();
  } catch {
    // Catch block intentionally empty - we throw below if no project found
  }
  throw new Error(
    'No GCP project specified and no default project set in gcloud.'
  );
}

/**
 * Google APIの有効化
 *
 * @param projectId - 対象のGCPプロジェクトID
 * @param messages - 実行ログを格納する配列
 * @remarks Sheets、Gmail、Drive APIを一括有効化。ローカル開発に必要な最小限のAPI群
 */
async function enableGoogleApis(
  projectId: string,
  messages: string[]
): Promise<void> {
  messages.push('Enabling Google APIs (Sheets, Gmail, Drive)...');
  const apis = [
    'sheets.googleapis.com',
    'gmail.googleapis.com',
    'drive.googleapis.com',
  ];
  for (const api of apis) {
    await execa('gcloud', ['services', 'enable', api, '--project', projectId]);
  }
}

/**
 * サービスアカウントの作成または確認
 *
 * @param projectId - 対象のGCPプロジェクトID
 * @param messages - 実行ログを格納する配列
 * @returns サービスアカウントのメールアドレス
 * @remarks 既存のサービスアカウントがあれば再利用、なければ新規作成。べき等性を保証
 */
async function ensureServiceAccount(
  projectId: string,
  messages: string[]
): Promise<string> {
  const saName = 'wyside';
  const saEmail = `${saName}@${projectId}.iam.gserviceaccount.com`;

  // Check if SA exists
  try {
    await execa('gcloud', [
      'iam',
      'service-accounts',
      'describe',
      saEmail,
      '--project',
      projectId,
    ]);
    messages.push(`Service Account ${saName} already exists.`);
  } catch {
    messages.push(`Creating Service Account ${saName}...`);
    await execa('gcloud', [
      'iam',
      'service-accounts',
      'create',
      saName,
      '--display-name',
      'Wyside Local Dev',
      '--project',
      projectId,
    ]);
  }

  return saEmail;
}

/**
 * サービスアカウントキーの作成
 *
 * @param saEmail - サービスアカウントのメールアドレス
 * @param projectId - 対象のGCPプロジェクトID
 * @param messages - 実行ログを格納する配列
 * @returns 作成されたキーファイルのパス
 * @remarks 既存キーがあれば再作成せず、secrets/ディレクトリに格納
 */
async function createServiceAccountKey(
  saEmail: string,
  projectId: string,
  messages: string[]
): Promise<string> {
  const secretsDir = path.join(process.cwd(), 'secrets');
  await fs.mkdir(secretsDir, { recursive: true });
  const keyPath = path.join(secretsDir, 'service-account.json');

  if (await fileExists(keyPath)) {
    messages.push(`Key file already exists at ${keyPath}. Skipping creation.`);
  } else {
    messages.push(`Creating key file at ${keyPath}...`);
    await execa('gcloud', [
      'iam',
      'service-accounts',
      'keys',
      'create',
      keyPath,
      '--iam-account',
      saEmail,
      '--project',
      projectId,
    ]);
  }

  return keyPath;
}

/**
 * .envファイルの更新
 *
 * @param projectId - GCPプロジェクトID
 * @param spreadsheetIdDev - 開発用スプレッドシートID（オプション）
 * @param spreadsheetIdProd - 本番用スプレッドシートID（オプション）
 * @param messages - 実行ログを格納する配列
 * @remarks 既存の.envファイルを読み込み、必要な環境変数を追加または更新
 */
async function updateEnvFile(
  projectId: string,
  spreadsheetIdDev: string | undefined,
  spreadsheetIdProd: string | undefined,
  messages: string[]
): Promise<void> {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  if (await fileExists(envPath)) {
    envContent = await fs.readFile(envPath, 'utf8');
  }

  const updates: Record<string, string> = {
    GCP_PROJECT_ID: projectId,
    GOOGLE_APPLICATION_CREDENTIALS: './secrets/service-account.json',
  };

  if (spreadsheetIdDev) {
    updates.APP_SPREADSHEET_ID_1_DEV = spreadsheetIdDev;
  }

  if (spreadsheetIdProd) {
    updates.APP_SPREADSHEET_ID_1_PROD = spreadsheetIdProd;
  }

  let newEnvContent = envContent;
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(newEnvContent)) {
      newEnvContent = newEnvContent.replace(regex, `${key}=${value}`);
    } else {
      newEnvContent += `\n${key}=${value}`;
    }
  }

  await fs.writeFile(envPath, newEnvContent.trim() + '\n');
  messages.push(`Updated .env file.`);
}

export interface SyncSecretsFromGcpToLocalArgs {
  projectId?: string;
  spreadsheetIdDev: string;
  spreadsheetIdProd?: string;
}

/**
 * GCPからローカル開発環境へシークレット設定を同期
 *
 * @param args - プロジェクトIDと開発用/本番用スプレッドシートIDを含む設定オブジェクト
 * @returns 実行結果メッセージ
 * @remarks GCP APIの有効化、サービスアカウント作成、キー生成、.env更新を一括実行
 */
export async function syncSecretsFromGcpToLocal(
  args: SyncSecretsFromGcpToLocalArgs
) {
  const messages: string[] = [];
  try {
    await ensureGcloud();

    const projectId = await getGcpProject(args.projectId);
    messages.push(`Using GCP Project: ${chalk.bold(projectId)}`);

    await enableGoogleApis(projectId, messages);
    const saEmail = await ensureServiceAccount(projectId, messages);
    await createServiceAccountKey(saEmail, projectId, messages);
    await updateEnvFile(
      projectId,
      args.spreadsheetIdDev,
      args.spreadsheetIdProd,
      messages
    );

    messages.push(chalk.green('✅ Local secrets setup complete!'));
    messages.push(
      chalk.yellow(
        `⚠️  Action Required: Share your Google Sheet with: ${saEmail}`
      )
    );

    return {
      content: [{ type: 'text', text: messages.join('\n') }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}\nLogs:\n${messages.join('\n')}`,
        },
      ],
      isError: true,
    };
  }
}
