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
  - `schema-generator.ts`: Schema-based code generation.
  - `operation-catalog.ts`: Flexible operation definitions.
- **Templates (`src/templates/`):**
  - `.hbs` files for scaffolding.

## 5. Schema-Based Code Generation

### 5.1 Overview

スキーマ定義から完全なCRUD操作を持つクライアントコードを自動生成するシステム。
現在はGoogle Sheets APIに対応しているが、Drive/Gmail/Calendar等の他のGoogle APIにも拡張可能。

### 5.2 Current Implementation (Sheets API)

**参考ファイル:**

- `src/tools/schema-generator.ts`: フィールドスキーマから型定義・変換関数を生成
- `src/tools/operation-catalog.ts`: Sheets操作のカタログ（16種類）
- `docs/sheets-api-schemas.md`: Sheets API型定義リファレンス
- `docs/flexible-operations.md`: 柔軟な操作システムガイド

**スキーマ例:**

```typescript
const schema = {
  fields: [
    { name: 'id', type: 'string', column: 'A' },
    { name: 'title', type: 'string', column: 'B', required: true },
  ],
  range: 'Tasks!A2:E',
  rangeName: 'TASK_RANGE',
};
```

### 5.3 Reference Files

**理解すべきファイル（優先度順）:**

1. `docs/flexible-operations.md` - 操作システムの全体像
2. `docs/schema-based-generation.md` - スキーマベース生成の詳細
3. `docs/sheets-api-schemas.md` - Sheets API型定義リファレンス
4. `src/tools/operation-catalog.ts` - 操作定義の実装パターン
5. `src/tools/schema-generator.ts` - スキーマ生成の実装パターン
6. `src/templates/universal-repo.ts.hbs` - テンプレートの構造

## 6. API Extension Guide

新しいGoogle API（Drive, Gmail, Calendar等）に対応する際のガイド。

### 6.1 Type Definition Discovery

**googleapis型定義の場所:**

```bash
node_modules/googleapis/build/src/apis/{api-name}/{version}.d.ts

# 例:
# - Sheets: node_modules/googleapis/build/src/apis/sheets/v4.d.ts
# - Drive: node_modules/googleapis/build/src/apis/drive/v3.d.ts
# - Gmail: node_modules/googleapis/build/src/apis/gmail/v1.d.ts
# - Calendar: node_modules/googleapis/build/src/apis/calendar/v3.d.ts
```

**抽出対象:**

1. **クライアントクラス**: `export class {ApiName}`
2. **スキーマ定義**: `export interface Schema${ResourceName}`
3. **リクエストパラメータ**: `Params$Resource${Path}${Method}`
4. **レスポンス型**: スキーマのプロパティ型

**抽出方法:**

```bash
# Schema定義を検索
grep -n "export interface Schema" node_modules/googleapis/build/src/apis/drive/v3.d.ts | head -20

# 特定のリソース（例: File）の型を確認
grep -A 50 "export interface Schema\$File {" node_modules/googleapis/build/src/apis/drive/v3.d.ts
```

**Context7での調査:**

```typescript
// 1. Library IDを解決
mcp__context7__resolve - library - id({ libraryName: 'googleapis' });
// Result: /websites/googleapis_dev_nodejs_googleapis

// 2. API固有のドキュメントを取得
mcp__context7__get -
  library -
  docs({
    context7CompatibleLibraryID: '/websites/googleapis_dev_nodejs_googleapis',
    topic: 'drive_v3 Schema File create update',
    mode: 'code',
  });

// 3. 型定義の詳細を確認
Read({ file_path: 'node_modules/googleapis/build/src/apis/drive/v3.d.ts' });
```

### 6.2 API Data Structure Patterns

| API      | データ構造             | 主な操作                            |
| -------- | ---------------------- | ----------------------------------- |
| Sheets   | 2次元配列（行×列）     | batchGet, batchUpdate, appendValues |
| Drive    | ファイルオブジェクト   | list, get, create, update, delete   |
| Gmail    | メッセージオブジェクト | list, get, send, modify             |
| Calendar | イベントオブジェクト   | list, get, insert, update, delete   |

**スキーマ変換の方針:**

```typescript
// Sheets型（行列データ）: フィールド → 列のマッピング
{ name: 'title', column: 'B' }

// オブジェクト型（Drive/Gmail/Calendar）: プロパティ直接マッピング
{ name: 'title', property: 'name' }
{ name: 'mimeType', property: 'mimeType' }
```

**Drive API型定義例:**

```typescript
// drive/v3.d.ts
export interface Schema$File {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  parents?: string[] | null;
  createdTime?: string | null;
  modifiedTime?: string | null;
}
```

### 6.3 Schema Generator & Operation Catalog

**ファイル構成:**

```bash
src/tools/
  ├── schema-generator.ts         # 共通インターフェース
  ├── sheets-schema-generator.ts  # Sheets専用（現行）
  ├── drive-schema-generator.ts   # Drive用（新規）
  └── gmail-schema-generator.ts   # Gmail用（新規）
  ├── operation-catalog.ts           # 共通インターフェース
  ├── sheets-operation-catalog.ts    # Sheets操作（現行）
  ├── drive-operation-catalog.ts     # Drive操作（新規）
  └── gmail-operation-catalog.ts     # Gmail操作（新規）
```

**Drive用スキーマジェネレーター例:**

```typescript
// src/tools/drive-schema-generator.ts
export interface DriveFieldSchema {
  name: string; // TypeScriptのフィールド名
  property: string; // Drive APIのプロパティ名
  type: string; // TypeScript型
  required?: boolean;
  description?: string;
}

export interface DriveFeatureSchema {
  fields: DriveFieldSchema[];
  resourceType: string; // 'file' | 'folder' | 'permission'
  parentFolder?: string; // 親フォルダID
}

export function generateDriveTypeDefinition(
  featureName: string,
  schema: DriveFeatureSchema
): string {
  // Schema$File を元に型定義を生成
}

export function generateObjectToDriveFile(
  featureName: string,
  schema: DriveFeatureSchema
): string {
  // オブジェクト → Drive File への変換関数を生成
}
```

**Drive用操作カタログ例:**

```typescript
// src/tools/drive-operation-catalog.ts
export const DRIVE_OPERATION_CATALOG = {
  listFiles: {
    id: 'listFiles',
    category: 'query',
    description: 'ファイル一覧を取得',
    parameters: [
      { name: 'query', type: 'string', description: '検索クエリ' },
      { name: 'pageSize', type: 'number', description: '取得件数' },
    ],
    returnType: 'drive_v3.Schema$File[]',
    generate: ctx => `
    const listFiles = async (query?: string, pageSize = 100) => {
      const response = await DriveClient.files.list({
        q: query,
        pageSize,
        fields: 'files(id, name, mimeType, createdTime)',
      });
      return response.data.files || [];
    };`,
  },
  createFile: {
    id: 'createFile',
    category: 'write',
    description: 'ファイルを作成',
    parameters: [
      { name: 'file', type: 'drive_v3.Schema$File', required: true },
    ],
    returnType: 'drive_v3.Schema$File',
    generate: ctx => `
    const createFile = async (file: drive_v3.Schema$File) => {
      const response = await DriveClient.files.create({
        requestBody: file,
        fields: 'id, name, mimeType, createdTime',
      });
      return response.data;
    };`,
  },
  // ... その他の操作
};
```

### 6.4 Implementation Checklist

新しいGoogle APIに対応する際のチェックリスト:

- [ ] **Step 1**: googleapis型定義ファイルを特定
- [ ] **Step 2**: 主要なSchema型を抽出（list, get, create等）
- [ ] **Step 3**: APIのデータ構造を理解（行列 or オブジェクト）
- [ ] **Step 4**: `{api}-schema-generator.ts`を作成
  - [ ] FieldSchemaインターフェース定義
  - [ ] FeatureSchemaインターフェース定義
  - [ ] 型定義生成関数
  - [ ] オブジェクト変換関数
- [ ] **Step 5**: `{api}-operation-catalog.ts`を作成
  - [ ] 主要な操作を10-15個定義
  - [ ] カテゴリ分類（query, write, delete, batch等）
  - [ ] コード生成関数の実装
- [ ] **Step 6**: `scaffold-feature.ts`を拡張
  - [ ] API種別の判定ロジック
  - [ ] 適切なジェネレーター/カタログの選択
- [ ] **Step 7**: テンプレート作成
  - [ ] `universal-{api}-repo.ts.hbs`
  - [ ] `{api}-usecase.ts.hbs`
- [ ] **Step 8**: ドキュメント作成
  - [ ] `docs/{api}-schemas.md`
  - [ ] `docs/{api}-operations.md`

## 7. Guidelines

- **Error Handling:** Return `isError: true` with user-friendly messages in the `content`.
- **Logging:** Use `console.error` for logs (stdout is reserved for MCP JSON-RPC).
- **Path Resolution:** Use `fileURLToPath` / `import.meta.url` for locating templates, as this runs as an ESM module.
