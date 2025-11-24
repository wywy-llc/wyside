import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs/promises';
import path from 'path';

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureGcloud() {
  try {
    await execa('gcloud', ['--version']);
  } catch (e) {
    throw new Error(
      'gcloud CLI is not installed or not in PATH. Please install Google Cloud SDK.'
    );
  }
}

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

export interface SyncLocalSecretsArgs {
  projectId?: string;
  spreadsheetId?: string;
}

export async function syncLocalSecrets(args: SyncLocalSecretsArgs) {
  const messages: string[] = [];
  try {
    await ensureGcloud();

    const projectId = await getGcpProject(args.projectId);
    messages.push(`Using GCP Project: ${chalk.bold(projectId)}`);

    // 1. Enable APIs (Sheets, Gmail, Drive)
    messages.push('Enabling Google APIs (Sheets, Gmail, Drive)...');
    const apis = [
      'sheets.googleapis.com',
      'gmail.googleapis.com',
      'drive.googleapis.com',
    ];
    for (const api of apis) {
      await execa('gcloud', [
        'services',
        'enable',
        api,
        '--project',
        projectId,
      ]);
    }

    // 2. Create Service Account
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

    // 3. Create Keys
    const secretsDir = path.join(process.cwd(), 'secrets');
    await fs.mkdir(secretsDir, { recursive: true });
    const keyPath = path.join(secretsDir, 'service-account.json');

    if (await fileExists(keyPath)) {
      messages.push(
        `Key file already exists at ${keyPath}. Skipping creation.`
      );
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

    // 4. Update .env
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    if (await fileExists(envPath)) {
      envContent = await fs.readFile(envPath, 'utf8');
    }

    const updates: Record<string, string> = {
      GCP_PROJECT_ID: projectId,
      GOOGLE_APPLICATION_CREDENTIALS: './secrets/service-account.json',
    };

    if (args.spreadsheetId) {
      updates.SPREADSHEET_ID = args.spreadsheetId;
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
