import chalk from 'chalk';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import path from 'path';

async function getDriveClient() {
  const keyFile = path.join(process.cwd(), 'secrets/service-account.json');
  const auth = new GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
}

interface CreateFolderArgs {
  name: string;
  parentId?: string;
}

export async function driveCreateFolder(args: CreateFolderArgs) {
  const messages: string[] = [];
  try {
    const { name, parentId } = args;
    if (!name) throw new Error('Folder name is required');

    const drive = await getDriveClient();

    const fileMetadata: {
      name: string;
      mimeType: string;
      parents?: string[];
    } = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentId) {
      fileMetadata.parents = [parentId];
    }

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
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

interface ListFilesArgs {
  query?: string;
  pageSize?: number;
}

export async function driveListFiles(args: ListFilesArgs) {
  try {
    const { query, pageSize = 10 } = args;
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
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
