# CLAUDE.md

## 1. System Identity & Context

**Project:** `@wywyjp/wyside` (Fork of `@google/aside`)
**Type:** CLI Scaffolding Tool for Google Apps Script (GAS)
**License:** Apache-2.0
**Core Directive:** Initialize and manage local GAS development environments with TypeScript, Rollup, Vitest, and Clasp.

**🚨 FUNDAMENTAL RULE:**

- **NO GAS SDK usage in business logic** - ALL data operations MUST use REST APIs (`googleapis`) to enable local development and testing
- Code in `template/src/` MUST run identically in both Node.js and GAS environments

### Technology Stack

- **Runtime:** Node.js 22+ (ESM, Strict Mode)
- **Lang:** TypeScript ES2020
- **Build:** Rollup + plugins (Cleanup, TS, Prettier)
- **Test:** Vitest (V8 Coverage)
- **Deploy:** Google Clasp

## 2. Operational Matrix (CLI)

| Category      | Command              | Description                                   |
| :------------ | :------------------- | :-------------------------------------------- |
| **Lifecycle** | `npm install`        | Install dependencies (requires Node 22+)      |
|               | `npm run build`      | Full build (Clean -> Lint -> Compile -> Copy) |
|               | `npm run clean`      | Remove `build/` and `dist/` artifacts         |
|               | `wyside mcp`         | Start MCP server for AI interaction           |
| **QA**        | `npm test`           | Run Vitest suite                              |
|               | `npx vitest --ui`    | Run tests in watch mode with UI               |
| **Deploy**    | `clasp login`        | Authenticate with Google                      |
|               | `clasp push`         | Deploy `dist/` to GAS (Handled via scripts)   |
| **Debug**     | `WYSIDE_DEBUG=1 ...` | Enable verbose logging for Clasp/Init         |

## 3. Architecture & Data Flow

### Core Logic (`src/`)

- **`index.ts`**: CLI Entry (meow). Routes flags (`--title`, `--yes`) to `app.ts`.
- **`app.ts`**: Orchestrator. `init()` executes sequential handlers:
  1. `handlePackageJson`: Updates scripts/deps.
  2. `handleConfigCopy/Merge`: Manages dotfiles.
  3. `handleTemplate`: Copies `template/` or `template-ui/`.
  4. `handleMcpCommand`: Triggers MCP-based setup (if `--setup-gcp`).
  5. `handleClasp`: Auth & Project creation.
- **`mcp-setup.ts`**: MCP Server Launcher.
- **`config.ts`**: Config Templates (`base`, `angular`, `svelte`). Defines specific deps/scripts.
- **`clasp-helper.ts`**: Clasp Wrapper. Handles Login, Create, Clone, Link Extraction.
- **`package-helper.ts`**: atomic `package.json` manipulation with dependency diffing (`compare.ts`).

### Directory Structure

```text
wyside/
├── mcp-server/        # MCP Server Implementation (Tools & Templates)
├── src/               # CLI Logic (Helpers, Config, App)
├── template[-ui]/     # Project Templates (Copied to user project)
├── dist/              # Build Output (ESM)
├── [deploy|setup]*.mjs # Framework-specific helpers (Svelte/Angular)
└── test/              # Vitest Specs (Mirrors src/, uses __mocks__)
```

## 4. Development Guidelines

### **🚨 CRITICAL: GAS SDK Usage Policy 🚨**

**ABSOLUTELY FORBIDDEN in `template/src/` code:**

- ❌ **NO `ScriptApp.getActiveSpreadsheet()`** or any `ScriptApp.*` methods (except `ScriptApp.getOAuthToken()` for REST API auth)
- ❌ **NO `SpreadsheetApp.openById()`** or any direct `SpreadsheetApp.*` methods
- ❌ **NO GAS SDK dependencies** in business logic or data access layers

**WHY:** The core objective is to enable **local development and testing** with the exact same code that runs in GAS. Using GAS SDK breaks this:

- ✗ Cannot run locally (GAS SDK only works in GAS runtime)
- ✗ Cannot write meaningful tests
- ✗ Defeats the purpose of the Wyside project

**ALLOWED GAS SDK Usage:**

- ✅ `ScriptApp.getOAuthToken()` - ONLY for obtaining OAuth tokens for REST API calls
- ✅ `UrlFetchApp.fetch()` - For making HTTP requests to Google APIs
- ✅ `SpreadsheetApp.getUi()` - ONLY in UI-related functions (`onOpen()`, etc.)
- ✅ `HtmlService` - ONLY for serving HTML in GAS environment

**REQUIRED APPROACH:**

- ✅ **USE REST APIs** (`googleapis` npm package) for all Sheets operations
- ✅ **USE environment-agnostic config** (`src/config.ts`) for spreadsheet IDs
- ✅ **USE `UniversalSheetsClient`** pattern - detects environment and uses appropriate API

### Coding Standards

- **Style:** TypeScript Strict Mode, ESM imports, PascalCase classes, camelCase functions.
- **Formatting:** Prettier (2-space indent, single quotes). Enforced via ESLint.
- **File Ops:** ALWAYS use `write-file-atomic` to prevent corruption.
- **Process:** ALWAYS use `cross-spawn` for Windows compatibility.

### Testing Strategy

- **Tool:** Vitest.
- **Pattern:** Mirror source structure (`src/x.ts` -\> `test/x.test.ts`).
- **Mocking:** Use `vi.mock()` for `fs-extra` and `cross-spawn`. Focus on core helper logic without side effects.

### Commit Protocol (Conventional Commits)

- Format: `<type>: <subject>` (e.g., `feat: add svelte support`, `fix: clasp timeout`).
- **Gates:** Must pass `npm run lint` and `npm test`.

## 5. Workflow Specifics

### UI Frameworks

- **Angular:** Uses `ng new`, Angular Material, and `deploy-ui.mjs` for GAS transformation.
- **Svelte:** Uses Vite + Tailwind via `setup-svelte.mjs`.
- **Transformation:** `deploy-ui.mjs` converts JS/CSS to GAS-compatible HTML templates (`<?!= include... ?>`).

### Google Clasp

- **Env Configs:** `.clasp-dev.json`, `.clasp-prod.json`.
- **Flow:** Scripts swap config files -\> `clasp push`.
- **Urls:** Use `extractScriptLink()` to parse Clasp output.

## 6. Critical Constraints & Pitfalls

### **🚨 ABSOLUTE PROHIBITIONS 🚨**

1. **GAS SDK in Business Logic:**
   - ❌ **NEVER use `ScriptApp.getActiveSpreadsheet()`, `SpreadsheetApp.openById()`, or any GAS SDK methods** in `template/src/` code (except for OAuth tokens and UI functions)
   - ❌ Any code that uses GAS SDK **CANNOT run locally or be tested**
   - ✅ **ONLY use REST APIs** (`googleapis` package) for data operations
   - ✅ **Violation of this rule breaks the fundamental purpose of Wyside**

2. **Process & File Operations:**
   - **NO** native `spawn`; use `cross-spawn`.
   - **NO** direct `fs.writeFile`; use `write-file-atomic`.

3. **Global Exposure (GAS UI/Triggers):**
   - Use a safe global binding: `const globalScope = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : {};`
   - Export GAS entrypoints to `globalScope.*` (never bare `global.*`) to avoid `ReferenceError` in GAS runtime and keep Node/GAS parity.

4. **Template Management:**
   - **Template Immutability:** Templates are copied once; changes require a full `npm run build` and fresh `init` to test.
   - **Linting:** Do NOT lint `template/` directories (users customize these).

### **Configuration Requirements**

- **Spreadsheet IDs:** MUST use `src/config.ts` with `SpreadsheetType` enum and `APP_SPREADSHEET_ID_N_DEV/PROD` environment variables
- **NO hardcoded IDs** in code
- **Environment Detection:** Use `UniversalSheetsClient` pattern to detect Node.js vs GAS runtime
- **API Permissions (`appsscript.json`):**
  - Template includes Sheets, Drive, and Gmail API permissions
  - Gmail API: Works in GAS runtime with OAuth scopes. For local development, Service Accounts require Domain-Wide Delegation (Google Workspace) or OAuth 2.0 user flow (personal accounts)
- **Service Account Sharing:**
  - Service Account keys (`service-account.json`) can be shared among team members for local development
  - Share via secure channels (encrypted messaging, password managers). Never commit to git
  - Recommended: Use separate Service Accounts for dev/staging/prod environments

## 7. MCP Integration (New)

### Architecture

The system includes a local MCP server (`mcp-server/`) that acts as an AI-driven infrastructure manager.

- **Role:** Automates setup of GCP resources, Sheets API enabling, and Service Account creation.
- **Tools:** `sync_local_secrets`, `scaffold_feature`, `setup_named_range`.
- **Integration:**
  - `wyside init --setup-gcp`: Triggers the setup flow.
  - `wyside mcp`: Starts the server for IDE AI assistants.
