# wyside TODO App + MCP Server Integration Plan

## Executive Summary

**Objective:** Extend wyside CLI with AI-native unified architecture (per `docs/index.html`).

**Deliverables:**

1. Test-Separated Hybrid template (`template/`)
2. MCP Server (`mcp-server/`)
3. REST API unified TODO app (GAS/Local dual-mode)
4. GCP auto-setup CLI (`wyside init --setup-gcp`)
5. Validation env (`test-projects/todo-app/`)

**Tech Stack:**

```yaml
runtime: [Node.js 22+, Google Apps Script V8]
lang: TypeScript ES2020 Strict
api: Google Sheets API v4 (Advanced Service)
auth: { gas: OAuth, local: Service Account }
build: [Rollup, TSC]
test: Vitest + V8 Coverage
mcp: '@modelcontextprotocol/sdk'
cli: [meow, inquirer]
```

---

## Architecture Design

### System Overview

```text
Developer (VS Code)
├─ wyside init --setup-gcp → GCP auto-setup
├─ wyside mcp              → MCP server
└─ npm test                → Local integration tests
    │
    ▼
MCP Server (embedded)
├─ sync_local_secrets  → GCP automation
├─ scaffold_feature    → Code generation
└─ setup_named_range   → Range config
    │
    ▼
Generated Project (test-projects/todo/)
├─ src/      → GAS production code
├─ test/     → Local-only tests
└─ secrets/  → Service Account keys
    │
    ├──────┬──────┐
    │ GAS  │ Local│
    │Deploy│Vitest│
    └──────┴──────┘
         │
    Google Spreadsheet (TODO Data)
```

### Universal Client Environment Detection

```typescript
// src/core/client.ts
class UniversalSheetsClient {
  private detectEnvironment(): 'gas' | 'node' {
    return typeof UrlFetchApp !== 'undefined' ? 'gas' : 'node';
  }

  async batchUpdate(spreadsheetId, requests) {
    return this.env === 'gas'
      ? this.gasRequest(spreadsheetId, requests) // UrlFetchApp + OAuth
      : this.nodeRequest(spreadsheetId, requests); // googleapis + SA
  }
}
```

---

## Directory Structure

### wyside Project

```text
wyside/
├── docs/
│   ├── index.html                # Architecture spec
│   └── implementation-plan.md    # This document
│
├── mcp-server/                   # 🆕 MCP implementation
│   ├── src/
│   │   ├── index.ts              # MCP entry
│   │   ├── tools/
│   │   │   ├── sync-local-secrets.ts
│   │   │   ├── scaffold-feature.ts
│   │   │   └── setup-named-range.ts
│   │   └── templates/
│   │       ├── universal-repo.ts.hbs
│   │       └── usecase.ts.hbs
│   └── build/
│
├── template/                     # 🔄 Major refactor
│   ├── .clasp.json
│   ├── .claspignore
│   ├── appsscript.json           # 🆕 Advanced Services
│   ├── .env.example              # 🆕
│   ├── vitest.config.ts          # 🆕
│   │
│   ├── secrets/                  # 🆕 Local auth
│   │   └── .gitkeep
│   │
│   ├── src/                      # 🔄 GAS production
│   │   ├── main.ts
│   │   ├── core/
│   │   │   ├── client.ts         # Universal Client
│   │   │   ├── auth.ts
│   │   │   ├── types.ts
│   │   │   └── constants.ts
│   │   └── features/
│   │       └── todo/
│   │           ├── TodoUseCase.ts
│   │           └── UniversalTodoRepo.ts
│   │
│   └── test/                     # 🆕 Local-only tests
│       ├── setup.ts
│       └── features/todo/
│           └── TodoUseCase.test.ts
│
├── test-projects/                # 🆕 Validation env
│   └── todo-app/
│
└── src/                          # Existing CLI
    ├── app.ts                    # 🔄 MCP integration
    ├── config.ts                 # 🔄 configForTodoRest
    └── mcp-setup.ts              # 🆕
```

### template/ Test-Separated Hybrid Structure

```text
template/
│
├── 🔧 Config Files
│   ├── .clasp.json          # rootID + src/ deploy
│   ├── .claspignore         # Exclude: test/, secrets/, mcp-server/
│   ├── appsscript.json      # Advanced Services: Sheets v4
│   ├── .env.example         # SPREADSHEET_ID, GCP_PROJECT_ID
│   ├── .gitignore           # secrets/, .env
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── 🔐 secrets/              # Local-only (gitignored)
│   └── service-account.json
│
├── 🚀 src/                  # GAS Production (.clasp deploy)
│   ├── main.ts              # Entry: onOpen(), doGet(), api*()
│   ├── core/
│   │   ├── client.ts        # 💜 Universal Sheets Client
│   │   ├── auth.ts
│   │   ├── types.ts         # Todo interface
│   │   └── constants.ts     # TODO_RANGE
│   └── features/todo/
│       ├── TodoUseCase.ts   # Business logic
│       └── UniversalTodoRepo.ts  # 💜 REST API unified
│
└── ✅ test/                 # Local-only (.claspignore)
    ├── setup.ts             # dotenv + validation
    └── features/todo/
        └── TodoUseCase.test.ts  # Integration tests
```

---

## Phase 1: Template Foundation

### Objectives

Build Test-Separated Hybrid template + Universal Client

### Tasks

#### 1.1 Config Files

**`.clasp.json`**

```json
{ "scriptId": "", "rootDir": "./src", "parentId": [] }
```

**`.claspignore`**

```text
**/**
!src/**
!appsscript.json
test/**
secrets/**
mcp-server/**
node_modules/**
*.test.ts
*.config.ts
.env
```

**`appsscript.json`**

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {
    "enabledAdvancedServices": [
      { "userSymbol": "Sheets", "serviceId": "sheets", "version": "v4" }
    ]
  },
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.container.ui"
  ]
}
```

**`.env.example`**

```bash
GCP_PROJECT_ID=your-gcp-project-id
SPREADSHEET_ID=your-spreadsheet-id
TEST_SPREADSHEET_ID=your-test-spreadsheet-id
GOOGLE_APPLICATION_CREDENTIALS=./secrets/service-account.json
```

**`.gitignore`** (additions)

```gitignore
secrets/
*.json
!package.json
!tsconfig.json
!appsscript.json
.env
.env.local
```

**`vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['test/**', 'dist/**'],
    },
  },
});
```

#### 1.2 Universal Client

**`src/core/client.ts`**

```typescript
type Environment = 'gas' | 'node';

export class UniversalSheetsClient {
  private env: Environment;
  private auth: any;

  constructor() {
    this.env = this.detectEnvironment();
  }

  private detectEnvironment(): Environment {
    return typeof UrlFetchApp !== 'undefined' ? 'gas' : 'node';
  }

  async batchUpdate(spreadsheetId: string, requests: any[]): Promise<any> {
    return this.env === 'gas'
      ? this.gasBatchUpdate(spreadsheetId, requests)
      : this.nodeBatchUpdate(spreadsheetId, requests);
  }

  async batchGet(spreadsheetId: string, ranges: string[]): Promise<any> {
    return this.env === 'gas'
      ? this.gasBatchGet(spreadsheetId, ranges)
      : this.nodeBatchGet(spreadsheetId, ranges);
  }

  // === GAS Implementation ===
  private gasBatchUpdate(spreadsheetId: string, requests: any[]): any {
    const token = ScriptApp.getOAuthToken();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;

    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify({ requests }),
      muteHttpExceptions: true,
    });

    const result = JSON.parse(response.getContentText());
    if (response.getResponseCode() !== 200) {
      throw new Error(
        `Sheets API Error: ${result.error?.message || 'Unknown'}`
      );
    }
    return result;
  }

  private gasBatchGet(spreadsheetId: string, ranges: string[]): any {
    const token = ScriptApp.getOAuthToken();
    const rangesQuery = ranges
      .map(r => `ranges=${encodeURIComponent(r)}`)
      .join('&');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}`;

    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true,
    });

    return JSON.parse(response.getContentText());
  }

  // === Node.js Implementation ===
  private async nodeBatchUpdate(
    spreadsheetId: string,
    requests: any[]
  ): Promise<any> {
    const { google } = await import('googleapis');
    const auth = await this.getNodeAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    return response.data;
  }

  private async nodeBatchGet(
    spreadsheetId: string,
    ranges: string[]
  ): Promise<any> {
    const { google } = await import('googleapis');
    const auth = await this.getNodeAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });
    return response.data;
  }

  private async getNodeAuth() {
    if (this.auth) return this.auth;

    const { google } = await import('googleapis');
    const path = await import('path');

    const keyFilePath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      path.join(process.cwd(), 'secrets/service-account.json');

    this.auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return this.auth;
  }
}
```

**`src/core/types.ts`**

```typescript
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SheetsApiRequest {
  requests: any[];
}

export interface SheetsApiResponse {
  spreadsheetId: string;
  replies: any[];
}
```

**`src/core/constants.ts`**

```typescript
export const TODO_RANGE = 'Todos!A2:E';
export const TODO_HEADER_RANGE = 'Todos!A1:E1';
export const SHEET_NAMES = { TODOS: 'Todos' } as const;
```

### Deliverables

- [ ] Config files: `.clasp.json`, `.claspignore`, `appsscript.json`, `.env.example`, `.gitignore`, `vitest.config.ts`
- [ ] `src/core/client.ts` (Universal Client)
- [ ] `src/core/types.ts`, `src/core/constants.ts`
- [ ] `secrets/.gitkeep`

---

## Phase 2: MCP Server Integration

### Objectives

Add MCP Server for AI-driven automation

### Tasks

#### 2.1 MCP Server Setup

**`mcp-server/package.json`**

```json
{
  "name": "@wywyjp/wyside-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "build/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node build/index.js",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "googleapis": "^140.0.0",
    "google-auth-library": "^9.14.1",
    "handlebars": "^4.7.8",
    "inquirer": "^12.2.0",
    "execa": "^9.5.2",
    "chalk": "^5.4.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "typescript": "^5.7.3"
  }
}
```

**`mcp-server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build"]
}
```

#### 2.2 MCP Server Core

**`mcp-server/src/index.ts`**

```typescript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { syncLocalSecrets } from './tools/sync-local-secrets.js';
import { scaffoldFeature } from './tools/scaffold-feature.js';
import { setupNamedRange } from './tools/setup-named-range.js';

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
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'sync_local_secrets':
        return await syncLocalSecrets(args);
      case 'scaffold_feature':
        return await scaffoldFeature(args);
      case 'setup_named_range':
        return await setupNamedRange(args);
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
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('wyside MCP server running on stdio');
}

main().catch(console.error);
```

#### 2.3 Tool: sync_local_secrets (Outline)

**`mcp-server/src/tools/sync-local-secrets.ts`**

Implementation steps:

1. Verify `gcloud auth login`
2. Select/create GCP project
3. Enable `sheets.googleapis.com`
4. Create Service Account & download key
5. Place `secrets/service-account.json`
6. Create or configure Spreadsheet sharing
7. Generate `.env` file

_(Full implementation to be documented during Phase 2 execution)_

#### 2.4 CLI Integration

**`src/mcp-setup.ts`** (new)

```typescript
import { spawn } from 'cross-spawn';
import path from 'path';

export function startMcpServer(): void {
  const mcpPath = path.join(__dirname, '../mcp-server/build/index.js');
  const proc = spawn('node', [mcpPath], { stdio: 'inherit' });
  proc.on('exit', code => process.exit(code || 0));
}
```

**`src/app.ts`** (extend)

```typescript
import { startMcpServer } from './mcp-setup.js';

export async function init(options: InitOptions) {
  // ... existing template copy ...

  if (options.setupGcp) {
    console.log('🤖 Running GCP setup via MCP...');
    // Invoke MCP tool or spawn `wyside mcp`
  }
}

export function handleMcpCommand() {
  startMcpServer();
}
```

### Deliverables

- [ ] `mcp-server/package.json`, `tsconfig.json`
- [ ] `mcp-server/src/index.ts`
- [ ] `mcp-server/src/tools/sync-local-secrets.ts`
- [ ] `mcp-server/src/tools/scaffold-feature.ts` (minimal)
- [ ] `mcp-server/src/tools/setup-named-range.ts` (minimal)
- [ ] `src/mcp-setup.ts`
- [ ] `src/app.ts` MCP integration

---

## Phase 3: TODO App Implementation

### Objectives

Implement REST API unified TODO app (CRUD) with GAS/Local dual-mode

### Tasks

#### 3.1 UniversalTodoRepo

**`template/src/features/todo/UniversalTodoRepo.ts`**

Key methods:

- `addTodo(title)`: appendCells API
- `getTodos()`: batchGet API
- `updateTodo(id, updates)`: updateCells API
- `deleteTodo(id)`: deleteDimension API
- `parseRows()`: API response → Todo conversion

#### 3.2 TodoUseCase

**`template/src/features/todo/TodoUseCase.ts`**

Business logic:

- Validation (title required, etc.)
- Error handling
- Repository layer calls

#### 3.3 GAS Entry Point

**`template/src/main.ts`**

Functions:

- `onOpen()`: Add menu
- `showTodoUI()`: Sidebar display
- `apiAddTodo()`, `apiListTodos()`, `apiToggleTodo()`, `apiDeleteTodo()`

### Deliverables

- [ ] `src/features/todo/UniversalTodoRepo.ts`
- [ ] `src/features/todo/TodoUseCase.ts`
- [ ] `src/main.ts` (onOpen, API functions)
- [ ] Manual CRUD operation verification

---

## Phase 4: Test Environment

### Objectives

Implement local integration tests using real Spreadsheet

### Tasks

#### 4.1 Test Setup

**`template/test/setup.ts`**

- dotenv loading
- Environment variable validation

#### 4.2 Integration Tests

**`template/test/features/todo/TodoUseCase.test.ts`**

Test cases:

- `addTodo`: Success, validation error
- `listTodos`: Empty array, multiple records
- `toggleTodo`: Toggle completion, error
- `deleteTodo`: Delete, error
- Full CRUD cycle

#### 4.3 package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Deliverables

- [ ] `test/setup.ts`
- [ ] `test/features/todo/TodoUseCase.test.ts`
- [ ] `vitest.config.ts` configuration
- [ ] Test scripts in `package.json`
- [ ] Local test execution (`npm test`)

---

## Phase 5: E2E Validation

### Objectives

Complete wyside validation in `test-projects/todo-app/`

### Tasks

#### 5.1 Validation Project Procedure

1. `npm run build` (wyside build)
2. `mkdir -p test-projects/todo-app`
3. `npx ../../dist/index.js init --setup-gcp --yes`
4. `npm install`
5. `npm test` (local tests)
6. `npm run deploy` (GAS deploy)
7. GAS UI verification

#### 5.2 Documentation

**`docs/testing-guide.md`**

- Complete E2E test procedure
- Troubleshooting
- Verification checklist

### Deliverables

- [ ] `test-projects/todo-app/` directory
- [ ] `wyside init --setup-gcp` success
- [ ] `npm test` all tests PASS
- [ ] `npm run deploy` GAS deploy success
- [ ] GAS UI TODO operations verified
- [ ] `docs/testing-guide.md`

---

## Phase 6: Dependencies & Build Config

### template/package.json

```json
{
  "dependencies": {
    "googleapis": "^140.0.0",
    "google-auth-library": "^9.14.1",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/google-apps-script": "^1.0.83",
    "@types/node": "^22.10.5",
    "typescript": "^5.7.3",
    "vitest": "^2.1.8",
    "@vitest/coverage-v8": "^2.1.8"
  }
}
```

### src/config.ts Update

```typescript
export const configForTodoRest = {
  dependencies: [
    'googleapis@^140.0.0',
    'google-auth-library@^9.14.1',
    'dotenv@^16.4.5',
  ],
  // ...
};
```

---

## Phase 7: Documentation

### Document List

```yaml
docs/implementation-plan.md: Implementation plan (this doc)
docs/testing-guide.md: E2E test procedure
docs/mcp-tools-reference.md: MCP tools reference
template/README.md: Template user guide
CLAUDE.md: Project overview (add MCP integration notes)
```

---

## Implementation Milestones

```yaml
m1_foundation: # 3-5 days
  tasks: [Template structure, Universal Client, Config files]

m2_mcp_integration: # 5-7 days
  tasks: [MCP server, GCP automation, CLI integration]

m3_todo_app: # 3-4 days
  tasks: [CRUD operations, GAS entry point]

m4_test_env: # 2-3 days
  tasks: [Integration tests, Vitest config]

m5_e2e_validation: # 2-3 days
  tasks: [Full verification, dual-env testing]

m6_documentation: # 1-2 days
  tasks: [Complete all docs]

total_estimate: 14-21 days (1 FTE)
```
