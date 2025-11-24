import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';

import {
  driveCreateFolder,
  driveListFiles,
  type CreateFolderArgs,
  type ListFilesArgs,
} from './tools/drive-tools.js';
import {
  gmailListLabels,
  gmailSendEmail,
  type SendEmailArgs,
} from './tools/gmail-tools.js';
import {
  scaffoldFeature,
  type ScaffoldFeatureArgs,
} from './tools/scaffold-feature.js';
import {
  setupNamedRange,
  type SetupNamedRangeArgs,
} from './tools/sheets-tools.js';
import {
  syncSecretsFromGcpToLocal,
  type SyncSecretsFromGcpToLocalArgs,
} from './tools/sync-secrets-from-gcp-to-local.js';

// 環境変数を読み込み
config();

// サーバー設定
const SERVER_CONFIG = {
  NAME: 'wyside-mcp',
  VERSION: '1.0.0',
} as const;

// ツール定義
const TOOL_DEFINITIONS = [
  {
    name: 'sync_secrets_from_gcp_to_local',
    description:
      'Auto-configure GCP project, enable APIs, create Service Account, prepare local Sheets API access',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'GCP Project ID (interactive if omitted)',
        },
        spreadsheetIdDev: {
          type: 'string',
          description: 'Development Spreadsheet ID (required)',
        },
        spreadsheetIdProd: {
          type: 'string',
          description: 'Production Spreadsheet ID (optional)',
        },
      },
      required: ['spreadsheetIdDev'],
    },
  },
  {
    name: 'scaffold_feature',
    description: 'Generate REST API unified repository (GAS/Local dual-mode)',
    inputSchema: {
      type: 'object',
      properties: {
        featureName: {
          type: 'string',
          description: 'Feature name (e.g., "Highlight")',
        },
        operations: {
          type: 'array',
          items: { type: 'string' },
          description: 'Operations (e.g., ["setBackground"])',
        },
      },
      required: ['featureName', 'operations'],
    },
  },
  {
    name: 'setup_named_range',
    description:
      'Configure named ranges in spreadsheet and sync with code constants',
    inputSchema: {
      type: 'object',
      properties: {
        spreadsheetId: { type: 'string' },
        rangeName: {
          type: 'string',
          description: 'Range name (e.g., "TODO_RANGE")',
        },
        range: {
          type: 'string',
          description: 'A1 notation (e.g., "Todos!A2:E")',
        },
      },
      required: ['spreadsheetId', 'rangeName', 'range'],
    },
  },
  {
    name: 'drive_create_folder',
    description: 'Create a new folder in Google Drive',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Folder name' },
        parentId: {
          type: 'string',
          description: 'Parent folder ID (optional)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'drive_list_files',
    description: 'List files in Google Drive',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Drive search query (optional)',
        },
        pageSize: {
          type: 'number',
          description: 'Number of files to return',
        },
      },
    },
  },
  {
    name: 'gmail_send_email',
    description: 'Send an email via Gmail API',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'gmail_list_labels',
    description: 'List Gmail labels',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
] as const;

/**
 * MCPサーバーインスタンス
 */
const server = new Server(
  { name: SERVER_CONFIG.NAME, version: SERVER_CONFIG.VERSION },
  { capabilities: { tools: {} } }
);

/**
 * ツール一覧リクエストのハンドラー
 *
 * @remarks 利用可能なツールのリストと各ツールのスキーマを返却
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS,
}));

/**
 * ツール実行リクエストのハンドラー
 *
 * @remarks ツール名に基づいて適切な関数を呼び出し、結果を返却
 */
server.setRequestHandler(
  CallToolRequestSchema,
  async (request, _extra): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'sync_secrets_from_gcp_to_local':
          return (await syncSecretsFromGcpToLocal(
            (args || {}) as unknown as SyncSecretsFromGcpToLocalArgs
          )) as CallToolResult;
        case 'scaffold_feature':
          return (await scaffoldFeature(
            (args || {}) as unknown as ScaffoldFeatureArgs
          )) as CallToolResult;
        case 'setup_named_range':
          return (await setupNamedRange(
            (args || {}) as unknown as SetupNamedRangeArgs
          )) as CallToolResult;
        case 'drive_create_folder':
          return (await driveCreateFolder(
            (args || {}) as unknown as CreateFolderArgs
          )) as CallToolResult;
        case 'drive_list_files':
          return (await driveListFiles(
            (args || {}) as unknown as ListFilesArgs
          )) as CallToolResult;
        case 'gmail_send_email':
          return (await gmailSendEmail(
            (args || {}) as unknown as SendEmailArgs
          )) as CallToolResult;
        case 'gmail_list_labels':
          return (await gmailListLabels()) as CallToolResult;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
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
      } as CallToolResult;
    }
  }
);

/**
 * sync_secrets_from_gcp_to_localツールのテストを実行
 *
 * @remarks TEST_PROJECT_ID環境変数が設定されている場合にのみ実行
 */
async function testSyncSecrets(): Promise<void> {
  if (!process.env.TEST_PROJECT_ID || !process.env.TEST_SPREADSHEET_ID_DEV)
    return;

  console.error('\n📋 Testing sync_secrets_from_gcp_to_local...');
  try {
    const result = await syncSecretsFromGcpToLocal({
      projectId: process.env.TEST_PROJECT_ID,
      spreadsheetIdDev: process.env.TEST_SPREADSHEET_ID_DEV,
      spreadsheetIdProd: process.env.TEST_SPREADSHEET_ID_PROD,
    });
    console.error('✅ Test result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * scaffold_featureツールのテストを実行
 *
 * @remarks TEST_FEATURE_NAME環境変数が設定されている場合にのみ実行
 */
async function testScaffoldFeature(): Promise<void> {
  if (!process.env.TEST_FEATURE_NAME) return;

  console.error('\n📋 Testing scaffold_feature...');
  try {
    const operations = process.env.TEST_FEATURE_OPERATIONS?.split(',') || [
      'create',
      'read',
    ];
    const result = await scaffoldFeature({
      featureName: process.env.TEST_FEATURE_NAME,
      operations,
    });
    console.error('✅ Test result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * テストモードを実行
 *
 * @remarks TEST_MODE=true環境変数が設定されている場合に各ツールのテストを実行
 */
async function runTestMode(): Promise<void> {
  console.error('🧪 Running in TEST MODE');

  await testSyncSecrets();
  await testScaffoldFeature();

  console.error('\n✨ Test mode completed. Exiting...');
  process.exit(0);
}

/**
 * MCPサーバーを起動
 *
 * @remarks TEST_MODE=true の場合はテストモード、それ以外は通常のMCPサーバーとして起動
 */
async function main(): Promise<void> {
  if (process.env.TEST_MODE === 'true') {
    await runTestMode();
    return;
  }

  // 通常モード: MCPサーバーを起動
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('wyside MCP server running on stdio');
}

main().catch(console.error);
