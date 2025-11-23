# CLAUDE.md

## 1. System Identity & Context

**Project:** `@wywyjp/wyside` (Fork of `@google/aside`)
**Type:** CLI Scaffolding Tool for Google Apps Script (GAS)
**License:** Apache-2.0
**Core Directive:** Initialize and manage local GAS development environments with TypeScript, Rollup, Vitest, and Clasp.

### Technology Stack

- **Runtime:** Node.js 22+ (ESM, Strict Mode)
- **Lang:** TypeScript ES2020
- **Build:** Rollup + plugins (Cleanup, License, TS, Prettier)
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
|               | `npm run lint`       | ESLint + Prettier + License Header Check      |
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

### Coding Standards

- **Style:** TypeScript Strict Mode, ESM imports, PascalCase classes, camelCase functions.
- **Formatting:** Prettier (2-space indent, single quotes). Enforced via ESLint.
- **License Headers:** **Mandatory** Apache 2.0 header on all source files (`npm run license`).
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

- **NO** native `spawn`; use `cross-spawn`.
- **NO** direct `fs.writeFile`; use `write-file-atomic`.
- **Template Immutability:** Templates are copied once; changes require a full `npm run build` and fresh `init` to test.
- **Linting:** Do NOT lint `template/` directories (users customize these).

## 7. MCP Integration (New)

### Architecture

The system includes a local MCP server (`mcp-server/`) that acts as an AI-driven infrastructure manager.

- **Role:** Automates setup of GCP resources, Sheets API enabling, and Service Account creation.
- **Tools:** `sync_local_secrets`, `scaffold_feature`, `setup_named_range`.
- **Integration:**
  - `wyside init --setup-gcp`: Triggers the setup flow.
  - `wyside mcp`: Starts the server for IDE AI assistants.
