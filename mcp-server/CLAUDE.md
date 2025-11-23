<!--
Copyright 2025 wywy LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
you may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->
# CLAUDE.md - mcp-server

## 1. Project Identity

**Project:** `@wywyjp/wyside-mcp`
**Role:** MCP Server implementation for `wyside`
**Goal:** Provide AI agents with tools to manipulate GAS infrastructure and generate unified code.

## 2. Tech Stack

- **Runtime:** Node.js (ESM)
- **Language:** TypeScript ES2022
- **Core Libs:**
  - `@modelcontextprotocol/sdk`: MCP implementation
  - `googleapis`: Google Sheets/IAM interaction
  - `execa`: Shell command execution (gcloud)
  - `handlebars`: Code generation templates
  - `inquirer`: User interaction (if needed)

## 3. Development Commands

| Command         | Description                     |
| :-------------- | :------------------------------ |
| `npm install`   | Install dependencies            |
| `npm run build` | Compile TypeScript to `build/`  |
| `npm run dev`   | Watch mode for development      |
| `npm start`     | Run the compiled server (stdio) |

## 4. Architecture

- **Entry Point:** `src/index.ts`
  - Defines server capabilities and tool schemas.
  - Routes requests to specific tool handlers.
- **Tools (`src/tools/`):**
  - `sync-local-secrets.ts`: GCP & Env setup.
  - `scaffold-feature.ts`: Template-based code gen.
  - `setup-named-range.ts`: Sheets API wrapper.
- **Templates (`src/templates/`):**
  - `.hbs` files for scaffolding.

## 5. Guidelines

- **Error Handling:** Return `isError: true` with user-friendly messages in the `content`.
- **Logging:** Use `console.error` for logs (stdout is reserved for MCP JSON-RPC).
- **Path Resolution:** Use `fileURLToPath` / `import.meta.url` for locating templates, as this runs as an ESM module.
