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

// Load .env
config();

const args = process.argv.slice(2);
const toolName = args[0];

async function main() {
  if (!toolName) {
    console.error(`
Usage: npx tsx scripts/test-tool.ts <tool-name> [args...]

Available tools:
  sync_secrets_from_gcp_to_local <projectId> [spreadsheetIdDev] [spreadsheetIdProd]
  scaffold_feature <featureName> <operation1,operation2,...>
  setup_named_range <spreadsheetId> <rangeName> <range>
  drive_create_folder <folderName> [parentId]
  gmail_send_email <to> <subject> <body>

Examples:
  npx tsx scripts/test-tool.ts sync_secrets_from_gcp_to_local my-project-123
  npx tsx scripts/test-tool.ts sync_secrets_from_gcp_to_local my-project-123 1ABC_DEV 1XYZ_PROD
  npx tsx scripts/test-tool.ts scaffold_feature Todo "create,read,update,delete"
  npx tsx scripts/test-tool.ts setup_named_range 1ABC123 TODO_RANGE "Sheet1!A2:E"
  npx tsx scripts/test-tool.ts drive_create_folder "Test Folder"
  npx tsx scripts/test-tool.ts gmail_send_email "test@example.com" "Subject" "Body"
`);
    process.exit(1);
  }

  try {
    let result;

    switch (toolName) {
      case 'sync_secrets_from_gcp_to_local': {
        const params: SyncSecretsFromGcpToLocalArgs = {
          projectId: args[1],
          spreadsheetIdDev: args[2],
          spreadsheetIdProd: args[3],
        };
        console.log('Running sync_secrets_from_gcp_to_local with:', params);
        result = await syncSecretsFromGcpToLocal(params);
        break;
      }

      case 'scaffold_feature': {
        const params: ScaffoldFeatureArgs = {
          featureName: args[1],
          operations: args[2]?.split(',') || [],
        };
        console.log('Running scaffold_feature with:', params);
        result = await scaffoldFeature(params);
        break;
      }

      case 'setup_named_range': {
        const params: SetupNamedRangeArgs = {
          spreadsheetId: args[1],
          rangeName: args[2],
          range: args[3],
        };
        console.log('Running setup_named_range with:', params);
        result = await setupNamedRange(params);
        break;
      }

      case 'drive_create_folder': {
        const params: CreateFolderArgs = {
          name: args[1],
          parentId: args[2],
        };
        console.log('Running drive_create_folder with:', params);
        result = await driveCreateFolder(params);
        break;
      }

      case 'gmail_send_email': {
        const params: SendEmailArgs = {
          to: args[1],
          subject: args[2],
          body: args[3],
        };
        console.log('Running gmail_send_email with:', params);
        result = await gmailSendEmail(params);
        break;
      }

      default:
        console.error(`Unknown tool: ${toolName}`);
        process.exit(1);
    }

    console.log('\n✅ Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ Error:');
    console.error(error);
    process.exit(1);
  }
}

main();
