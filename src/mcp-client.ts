/**
 * Copyright 2025 wywy LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * you may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-empty */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMcpSetup(_options: { title: string }) {
  // Locate the built MCP server script
  // Assuming we are running from dist/src/mcp-client.js
  // The mcp-server build is at ../../mcp-server/build/index.js relative to project root
  // When running built CLI: dist/src/mcp-client.js -> ../../mcp-server/build/index.js

  // We need to find the project root.
  // If running via npx/node from dist: __dirname is .../dist/src
  const projectRoot = path.resolve(__dirname, '../../');
  const serverPath = path.join(projectRoot, 'mcp-server/build/index.js');

  console.log(chalk.gray(`[MCP] Starting server at ${serverPath}...`));

  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
  });

  const client = new Client(
    {
      name: 'wyside-cli-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    await client.connect(transport);

    console.log(chalk.blue('[MCP] invoking sync_local_secrets...'));

    // Call the tool
    const result = await client.callTool({
      name: 'sync_local_secrets',
      arguments: {
        projectId: undefined, // Let it be interactive or detect from gcloud
        spreadsheetId: undefined, // Let it create new or use existing logic
      },
    });

    // Handle result
    if (result && result.content) {
      (result.content as any).forEach((item: any) => {
        if (item.type === 'text') {
          console.log(item.text);
        }
      });
    }

    if (result.isError) {
      throw new Error('MCP Tool execution failed');
    }
  } catch (error) {
    console.error(chalk.red('[MCP] Error:'), error);
    throw error;
  } finally {
    try {
      await client.close();
    } catch {}
  }
}
