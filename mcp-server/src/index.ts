import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
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

// Load environment variables from .env
config();

const server = new Server(
  { name: 'wyside-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'sync_local_secrets',
      description:
        'Auto-configure GCP project, enable APIs, create Service Account, prepare local Sheets API access',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'GCP Project ID (interactive if omitted)',
          },
          spreadsheetId: {
            type: 'string',
            description: 'Spreadsheet ID (creates new if omitted)',
          },
        },
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
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'sync_local_secrets':
        return await syncSecretsFromGcpToLocal(
          (args || {}) as unknown as SyncSecretsFromGcpToLocalArgs
        );
      case 'scaffold_feature':
        return await scaffoldFeature(
          (args || {}) as unknown as ScaffoldFeatureArgs
        );
      case 'setup_named_range':
        return await setupNamedRange(
          (args || {}) as unknown as SetupNamedRangeArgs
        );
      case 'drive_create_folder':
        return await driveCreateFolder(
          (args || {}) as unknown as CreateFolderArgs
        );
      case 'drive_list_files':
        return await driveListFiles((args || {}) as unknown as ListFilesArgs);
      case 'gmail_send_email':
        return await gmailSendEmail((args || {}) as unknown as SendEmailArgs);
      case 'gmail_list_labels':
        return await gmailListLabels();
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
    };
  }
});

async function main() {
  // Test mode: Run tool tests if TEST_MODE=true in .env
  if (process.env.TEST_MODE === 'true') {
    console.error('🧪 Running in TEST MODE');

    // Test sync_local_secrets if TEST_PROJECT_ID is set
    if (process.env.TEST_PROJECT_ID) {
      console.error('\n📋 Testing sync_local_secrets...');
      try {
        const result = await syncSecretsFromGcpToLocal({
          projectId: process.env.TEST_PROJECT_ID,
          spreadsheetId: process.env.TEST_SPREADSHEET_ID,
        });
        console.error('✅ Test result:', JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('❌ Test failed:', error);
      }
    }

    // Test scaffold_feature if TEST_FEATURE_NAME is set
    if (process.env.TEST_FEATURE_NAME) {
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

    console.error('\n✨ Test mode completed. Exiting...');
    process.exit(0);
  }

  // Normal mode: Start MCP server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('wyside MCP server running on stdio');
}

main().catch(console.error);
