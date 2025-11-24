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

### Tool Testing

ツールを修正した際は以下の手順でテストを実行:

```bash
# 1. ビルド
npm run build

# 2. ツール単体テスト（手動検証）
npm run test:tool <tool-name> [args...]

# 例: sync_secrets_from_gcp_to_local
npm run test:tool sync_secrets_from_gcp_to_local my-project-123

# 例: scaffold_feature
npm run test:tool scaffold_feature Todo "create,read,update,delete"
```

**テスト対象ツール:**
- `sync_secrets_from_gcp_to_local <projectId> [spreadsheetId]`
- `scaffold_feature <featureName> <operation1,operation2,...>`
- `setup_named_range <spreadsheetId> <rangeName> <range>`
- `drive_create_folder <folderName> [parentId]`
- `gmail_send_email <to> <subject> <body>`

**検証ポイント:**
1. ✅ ビルドエラーがないこと
2. ✅ ツールが正常に実行され、期待する結果を返すこと
3. ✅ 生成されたファイル（scaffoldの場合）が正しいフォーマットであること

## 4. Architecture

- **Entry Point:** `src/index.ts`
  - Defines server capabilities and tool schemas.
  - Routes requests to specific tool handlers.
- **Tools (`src/tools/`):**
  - `sync-secrets-from-gcp-to-local.ts`: GCP & Env setup.
  - `scaffold-feature.ts`: Template-based code gen.
  - `setup-named-range.ts`: Sheets API wrapper.
- **Templates (`src/templates/`):**
  - `.hbs` files for scaffolding.

## 5. Guidelines

- **Error Handling:** Return `isError: true` with user-friendly messages in the `content`.
- **Logging:** Use `console.error` for logs (stdout is reserved for MCP JSON-RPC).
- **Path Resolution:** Use `fileURLToPath` / `import.meta.url` for locating templates, as this runs as an ESM module.
