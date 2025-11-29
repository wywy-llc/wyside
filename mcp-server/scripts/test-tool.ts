#!/usr/bin/env node
/**
 * Manual tool testing script
 * Usage: npx tsx scripts/test-tool.ts <tool-name> [args...]
 */

import { config } from 'dotenv';
import {
  driveCreateFolder,
  type CreateFolderArgs,
} from '../src/tools/drive-tools.js';
import {
  gmailSendEmail,
  type SendEmailArgs,
} from '../src/tools/gmail-tools.js';
import {
  scaffoldFeature,
  type ScaffoldFeatureArgs,
} from '../src/tools/scaffold-feature.js';
import {
  setupNamedRange,
  type SetupNamedRangeArgs,
} from '../src/tools/sheets-tools.js';
import {
  syncSecretsFromGcpToLocal,
  type SyncSecretsFromGcpToLocalArgs,
} from '../src/tools/sync-secrets-from-gcp-to-local.js';
import {
  inferSchemaFromSheet,
  type InferSchemaArgs,
} from '../src/tools/infer-schema-from-sheet.js';

// Load .env
config();

// ===== Type Definitions =====

interface ArgumentDefinition {
  name: string;
  required: boolean;
  index: number;
  transform?: (value: string) => unknown;
}

interface ToolDefinition<T = Record<string, unknown>> {
  args: ArgumentDefinition[];
  handler: (params: T) => Promise<unknown>;
}

// ===== Tool Registry =====

const TOOL_REGISTRY = {
  sync_secrets_from_gcp_to_local: {
    args: [
      { name: 'projectId', required: true, index: 1 },
      { name: 'spreadsheetIdDev', required: false, index: 2 },
      { name: 'spreadsheetIdProd', required: false, index: 3 },
    ],
    handler: syncSecretsFromGcpToLocal,
  } satisfies ToolDefinition<SyncSecretsFromGcpToLocalArgs>,

  scaffold_feature: {
    args: [
      { name: 'featureName', required: true, index: 1 },
      {
        name: 'operations',
        required: false,
        index: 2,
        transform: (value: string) => {
          try {
            return JSON.parse(value);
          } catch {
            return value.split(',');
          }
        },
      },
      {
        name: 'schema',
        required: false,
        index: 3,
        transform: (value: string) => JSON.parse(value),
      },
      {
        name: 'spreadsheetIdDev',
        required: true,
        index: 4,
      },
      {
        name: 'spreadsheetIdProd',
        required: true,
        index: 5,
      },
    ],
    handler: scaffoldFeature,
  } satisfies ToolDefinition<ScaffoldFeatureArgs>,

  setup_named_range: {
    args: [
      { name: 'spreadsheetId', required: true, index: 1 },
      { name: 'rangeName', required: true, index: 2 },
      { name: 'range', required: true, index: 3 },
    ],
    handler: setupNamedRange,
  } satisfies ToolDefinition<SetupNamedRangeArgs>,

  drive_create_folder: {
    args: [
      { name: 'name', required: true, index: 1 },
      { name: 'parentId', required: false, index: 2 },
    ],
    handler: driveCreateFolder,
  } satisfies ToolDefinition<CreateFolderArgs>,

  gmail_send_email: {
    args: [
      { name: 'to', required: true, index: 1 },
      { name: 'subject', required: true, index: 2 },
      { name: 'body', required: true, index: 3 },
    ],
    handler: gmailSendEmail,
  } satisfies ToolDefinition<SendEmailArgs>,

  infer_schema_from_sheet: {
    args: [
      { name: 'spreadsheetIdDev', required: true, index: 1 },
      { name: 'sheetName', required: true, index: 2 },
      {
        name: 'headers',
        required: true,
        index: 3,
        transform: (value: string) => JSON.parse(value),
      },
      { name: 'headerStartCell', required: true, index: 4 },
      { name: 'lang', required: false, index: 5 },
    ],
    handler: inferSchemaFromSheet,
  } satisfies ToolDefinition<InferSchemaArgs>,
} as const;

type ToolName = keyof typeof TOOL_REGISTRY;

// ===== Helper Functions =====

function buildParams(
  rawArgs: string[],
  argDefs: ArgumentDefinition[]
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  for (const def of argDefs) {
    const value = rawArgs[def.index];

    if (def.required && !value) {
      throw new Error(`Missing required argument: ${def.name}`);
    }

    if (value) {
      params[def.name] = def.transform ? def.transform(value) : value;
    }
  }

  return params;
}

function generateHelpMessage(): string {
  const toolLines = Object.keys(TOOL_REGISTRY).map(name => {
    const tool = TOOL_REGISTRY[name as ToolName];
    const args = tool.args
      .map(a => (a.required ? `<${a.name}>` : `[${a.name}]`))
      .join(' ');
    return `  ${name} ${args}`;
  });

  return `
Usage: npx tsx scripts/test-tool.ts <tool-name> [args...]

Available tools:
${toolLines.join('\n')}

Examples:
  npx tsx scripts/test-tool.ts sync_secrets_from_gcp_to_local my-project-123
  npx tsx scripts/test-tool.ts sync_secrets_from_gcp_to_local my-project-123 1ABC_DEV 1XYZ_PROD
  npx tsx scripts/test-tool.ts scaffold_feature Todo '["create","read","update"]' '{"fields":[{"name":"id","type":"string","column":"A"}],"range":"A2:Z"}'
  npx tsx scripts/test-tool.ts setup_named_range 1ABC123 TODO_RANGE "Sheet1!A2:E"
  npx tsx scripts/test-tool.ts drive_create_folder "Test Folder"
  npx tsx scripts/test-tool.ts gmail_send_email "test@example.com" "Subject" "Body"
`;
}

// ===== Main Execution =====

async function main() {
  const args = process.argv.slice(2);
  const toolName = args[0] as ToolName | undefined;

  if (!toolName) {
    console.error(generateHelpMessage());
    process.exit(1);
  }

  const tool = TOOL_REGISTRY[toolName];
  if (!tool) {
    console.error(`Unknown tool: ${toolName}`);
    console.error(generateHelpMessage());
    process.exit(1);
  }

  try {
    const params = buildParams(args, tool.args);
    console.log(`Running ${toolName} with:`, params);

    // Type assertion is safe here because buildParams constructs params according to tool.args
    const result = await tool.handler(params as never);

    console.log('\n✅ Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ Error:');
    console.error(error);
    process.exit(1);
  }
}

main();
