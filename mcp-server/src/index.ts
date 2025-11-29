import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { z } from 'zod';

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
  inferSchemaFromSheet,
  type InferSchemaArgs,
} from './tools/infer-schema-from-sheet.js';
import {
  scaffoldFeature,
  type ScaffoldFeatureArgs,
} from './tools/scaffold-feature.js';
import type { FeatureSchema } from './tools/schema-generator.js';
import {
  setupNamedRange,
  type SetupNamedRangeArgs,
} from './tools/sheets-tools.js';
import {
  syncSecretsFromGcpToLocal,
  type SyncSecretsFromGcpToLocalArgs,
} from './tools/sync-secrets-from-gcp-to-local.js';

// 環境変数を読み込み
config({ quiet: true });

// サーバー設定
const SERVER_CONFIG = {
  NAME: 'wyside-mcp',
  VERSION: '1.0.0',
} as const;

/**
 * MCPサーバーインスタンス
 */
const server = new McpServer({
  name: SERVER_CONFIG.NAME,
  version: SERVER_CONFIG.VERSION,
});

// FieldSchemaのZod定義
const fieldSchemaZod = z.object({
  name: z
    .string()
    .describe('Field name in camelCase (e.g., "taskTitle", "isCompleted")'),

  type: z
    .enum(['string', 'number', 'boolean', 'date'])
    .describe('TypeScript type of the field'),

  row: z
    .number()
    .int()
    .positive()
    .describe('Header row number (1-based, e.g., 1 for row 1)'),

  column: z
    .string()
    .regex(/^[A-Z]+$/, 'Must be uppercase letters (A, B, C, ..., AA, AB, ...)')
    .describe('Google Sheets column letter'),

  required: z
    .boolean()
    .optional()
    .describe('Whether this field is required (generates validation code)'),

  sheetsFormat: z
    .string()
    .optional()
    .describe('Sheets representation format (e.g., "TRUE/FALSE" for booleans)'),

  description: z
    .string()
    .optional()
    .describe('Field description for TSDoc comments'),
});

// FeatureSchemaのZod定義
const featureSchemaZod = z.object({
  fields: z
    .array(fieldSchemaZod)
    .min(1, 'At least one field is required')
    .describe('Array of field definitions for the feature'),

  sheetName: z
    .string()
    .min(1, 'Sheet name is required')
    .describe('Sheet name that stores the feature data'),

  headerRange: z
    .string()
    .regex(
      /^[A-Z]+\d+:[A-Z]+\d+$/,
      'Must be in A1 notation format for header row without sheet name (e.g., "A3:R3")'
    )
    .describe(
      'Header row range without sheet name; data starts from the next row'
    ),
});

// ツール登録
server.registerTool(
  'sync_secrets_from_gcp_to_local',
  {
    title: 'Sync Secrets from GCP to Local',
    description:
      'Auto-configure GCP project, enable APIs, create Service Account, prepare local Sheets API access',
    inputSchema: {
      projectId: z
        .string()
        .describe('GCP Project ID (interactive if omitted)')
        .optional(),
      spreadsheetIdDev: z
        .string()
        .describe('Development Spreadsheet ID (required)'),
      spreadsheetIdProd: z
        .string()
        .describe('Production Spreadsheet ID (optional)')
        .optional(),
      force: z
        .boolean()
        .describe('Force regenerate service account key (delete existing file)')
        .optional(),
    },
  },
  async (args: SyncSecretsFromGcpToLocalArgs) => {
    try {
      return (await syncSecretsFromGcpToLocal(args)) as CallToolResult;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      } as CallToolResult;
    }
  }
);

server.registerTool(
  'scaffold_feature',
  {
    title: 'Scaffold Feature',
    description:
      'Generate REST API unified repository (GAS/Local dual-mode) and upsert shared types',
    inputSchema: {
      featureName: z
        .string()
        .describe('Feature name in PascalCase (e.g., "Task", "TodoItem")'),

      operations: z
        .array(z.string())
        .min(1, 'operations is required')
        .describe(
          'Operation IDs to generate. Use ["all"] to generate all 16 operations. ' +
            'Available: getAll, getById, create, update, delete, search, count, etc.'
        ),

      schema: featureSchemaZod.describe(
        'Schema definition for auto-generating CRUD operations with type-safe code. ' +
          'Generates TypeScript types, row/object converters, validation, and updates core/types.ts.'
      ),

      spreadsheetIdDev: z
        .string()
        .describe('Spreadsheet ID for development environment'),

      spreadsheetIdProd: z
        .string()
        .describe('Spreadsheet ID for production environment'),
    },
  },
  async (args: ScaffoldFeatureArgs) => {
    try {
      return (await scaffoldFeature(args)) as CallToolResult;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      } as CallToolResult;
    }
  }
);

server.registerTool(
  'setup_named_range',
  {
    title: 'Setup Named Range',
    description:
      'Configure named ranges in spreadsheet and sync with code constants',
    inputSchema: {
      spreadsheetId: z.string(),
      rangeName: z.string().describe('Range name (e.g., "TODO_RANGE")'),
      headerRange: z.string().describe('A1 header range (e.g., "Todos!A1:E1")'),
    },
  },
  async (args: SetupNamedRangeArgs) => {
    try {
      return (await setupNamedRange(args)) as CallToolResult;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      } as CallToolResult;
    }
  }
);

server.registerTool(
  'infer_schema_from_sheet',
  {
    title: 'Infer Schema From Sheet',
    description:
      'Fetch header row from a sheet and infer FeatureSchema (columns → FieldSchema)',
    inputSchema: {
      spreadsheetIdDev: z
        .string()
        .describe('Spreadsheet ID for development environment'),
      sheetName: z.string().describe('Sheet name that contains the header row'),
      headers: z
        .array(z.string())
        .min(1, 'headers must have at least one column name')
        .describe('Array of header labels to search for'),
      headerStartCell: z
        .string()
        .describe('Header start cell (e.g. "A3"). Sheet name optional.'),
      lang: z
        .string()
        .optional()
        .describe(
          'Optional language label. Stored in description as "<lang>: <headerText>"'
        ),
    },
  },
  async (args: InferSchemaArgs) => {
    try {
      return (await inferSchemaFromSheet(args)) as CallToolResult;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      } as CallToolResult;
    }
  }
);

server.registerTool(
  'drive_create_folder',
  {
    title: 'Create Drive Folder',
    description: 'Create a new folder in Google Drive',
    inputSchema: {
      name: z.string().describe('Folder name'),
      parentId: z.string().describe('Parent folder ID (optional)').optional(),
    },
  },
  async (args: CreateFolderArgs) => {
    try {
      return (await driveCreateFolder(args)) as CallToolResult;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      } as CallToolResult;
    }
  }
);

server.registerTool(
  'drive_list_files',
  {
    title: 'List Drive Files',
    description: 'List files in Google Drive',
    inputSchema: {
      query: z.string().describe('Drive search query (optional)').optional(),
      pageSize: z.number().describe('Number of files to return').optional(),
    },
  },
  async (args: ListFilesArgs) => {
    try {
      return (await driveListFiles(args)) as CallToolResult;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      } as CallToolResult;
    }
  }
);

server.registerTool(
  'gmail_send_email',
  {
    title: 'Send Email',
    description: 'Send an email via Gmail API',
    inputSchema: {
      to: z.string().describe('Recipient email address'),
      subject: z.string().describe('Email subject'),
      body: z.string().describe('Email body'),
    },
  },
  async (args: SendEmailArgs) => {
    try {
      return (await gmailSendEmail(args)) as CallToolResult;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      } as CallToolResult;
    }
  }
);

server.registerTool(
  'gmail_list_labels',
  {
    title: 'List Gmail Labels',
    description: 'List Gmail labels',
    inputSchema: {},
  },
  async () => {
    try {
      return (await gmailListLabels()) as CallToolResult;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
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
      'getAll',
      'create',
    ];
    const schema: FeatureSchema = process.env.TEST_FEATURE_SCHEMA
      ? JSON.parse(process.env.TEST_FEATURE_SCHEMA)
      : {
          sheetName: 'TestSheet',
          headerRange: 'A1:A1',
          fields: [{ name: 'id', type: 'string', column: 'A', required: true }],
        };

    const result = await scaffoldFeature({
      featureName: process.env.TEST_FEATURE_NAME,
      operations,
      schema,
      spreadsheetIdDev: process.env.TEST_SPREADSHEET_ID_DEV || '1ABC-DEV',
      spreadsheetIdProd: process.env.TEST_SPREADSHEET_ID_PROD || '1XYZ-PROD',
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
