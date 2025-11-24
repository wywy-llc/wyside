# スキーマベースのクライアント自動生成

## 概要

Google Sheets APIのスキーマ定義から、完全なCRUD操作を持つクライアントコードを自動生成できます。

## 機能

✅ **完全自動生成される内容**:
- TypeScript型定義
- 行配列⇔オブジェクト変換関数
- CRUD操作（getAll, create, update, remove）
- バリデーション
- デフォルト値の設定
- IIFEパターンによる環境非依存な実装

## 使用方法

### 1. スキーマ定義

```typescript
const schema = {
  fields: [
    {
      name: 'id',              // フィールド名（camelCase）
      type: 'string',          // TypeScript型: 'string' | 'number' | 'boolean' | 'date'
      column: 'A',             // Sheets列（A, B, C...）
      description: 'ユニークID',
    },
    {
      name: 'title',
      type: 'string',
      column: 'B',
      required: true,          // 必須フィールド（バリデーション自動生成）
      description: 'タイトル',
    },
    {
      name: 'priority',
      type: 'number',
      column: 'C',
      description: '優先度（1-5）',
    },
    {
      name: 'completed',
      type: 'boolean',
      column: 'D',
      sheetsFormat: 'TRUE/FALSE', // Sheets内の表現形式
      description: '完了フラグ',
    },
    {
      name: 'dueDate',
      type: 'date',            // ISO8601形式として扱われる
      column: 'E',
      description: '期限日',
    },
    {
      name: 'createdAt',
      type: 'date',
      column: 'F',
      description: '作成日時',
    },
    {
      name: 'updatedAt',
      type: 'date',
      column: 'G',
      description: '更新日時',
    },
  ],
  range: 'Tasks!A2:G',        // Sheetsの範囲
  rangeName: 'TASK_RANGE',    // 定数名（オプション）
};
```

### 2. コード生成

```typescript
import { scaffoldFeature } from './tools/scaffold-feature.js';

const result = await scaffoldFeature({
  featureName: 'Task',
  operations: ['create', 'read', 'update', 'delete'],
  schema: schema,
});
```

### 3. 生成されるファイル

#### `src/features/task/UniversalTaskRepo.ts`

```typescript
export const UniversalTaskRepo = (() => {
  const create = (spreadsheetId: string) => {
    // ✅ 自動生成: 行配列→オブジェクト変換
    const rowToTask = (row: string[]): Task => ({
      id: row[0],
      title: row[1],
      priority: Number(row[2]),
      completed: row[3] === 'TRUE',
      dueDate: row[4],
      createdAt: row[5],
      updatedAt: row[6],
    });

    // ✅ 自動生成: オブジェクト→行配列変換
    const taskToRow = (task: Task): any[] => [
      task.id,
      task.title,
      task.priority,
      task.completed ? 'TRUE' : 'FALSE',
      task.dueDate,
      task.createdAt,
      task.updatedAt,
    ];

    // ✅ 自動生成: CRUD操作
    const getAll = async (): Promise<Task[]> => { /* ... */ };
    const createItem = async (data: Partial<Task>): Promise<Task> => { /* ... */ };
    const update = async (id: string, updates: Partial<Task>): Promise<void> => { /* ... */ };
    const remove = async (id: string): Promise<void> => { /* ... */ };

    return { getAll, create: createItem, update, remove } as const;
  };

  return { create } as const;
})();
```

#### `src/features/task/TaskUseCase.ts`

```typescript
export const TaskUseCase = (() => {
  const spreadsheetId = getSpreadsheetId(SpreadsheetType.TODOS);
  const repo = UniversalTaskRepo.create(spreadsheetId);

  // ✅ 自動生成: ユースケースメソッド
  const list = async (): Promise<Task[]> => repo.getAll();
  const create = async (data: Partial<Task>): Promise<Task> => {
    // ✅ 自動生成: バリデーション（required=trueのフィールド）
    if (!data.title) throw new Error('title is required');
    return repo.create(data);
  };
  const update = async (id: string, updates: Partial<Task>): Promise<void> => { /* ... */ };
  const remove = async (id: string): Promise<void> => { /* ... */ };

  return { list, create, update, remove } as const;
})();
```

## スキーマフィールド定義

### FieldSchema

| プロパティ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `name` | `string` | ✅ | フィールド名（camelCase） |
| `type` | `'string' \| 'number' \| 'boolean' \| 'date'` | ✅ | TypeScript型 |
| `column` | `string` | ✅ | Sheets列（A, B, C...） |
| `required` | `boolean` | | 必須フィールド（バリデーション生成） |
| `sheetsFormat` | `string` | | Sheets内の表現形式（例: 'TRUE/FALSE'） |
| `description` | `string` | | フィールドの説明（TSDoc生成） |

### FeatureSchema

| プロパティ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `fields` | `FieldSchema[]` | ✅ | フィールド定義の配列 |
| `range` | `string` | ✅ | Sheetsの範囲（例: "Tasks!A2:G"） |
| `rangeName` | `string` | | 範囲名の定数名（オプション） |

## 型変換ルール

### TypeScript → Sheets

| TypeScript型 | Sheets表現 | 備考 |
|-------------|-----------|------|
| `string` | そのまま | |
| `number` | 数値 | |
| `boolean` | `'TRUE'` / `'FALSE'` | `sheetsFormat`指定時 |
| `boolean` | `true` / `false` | 未指定時 |
| `date` | ISO8601文字列 | `new Date().toISOString()` |

### Sheets → TypeScript

| Sheets値 | TypeScript型 | 変換方法 |
|---------|-------------|---------|
| 文字列 | `string` | そのまま |
| 数値文字列 | `number` | `Number(value)` |
| `'TRUE'` / `'FALSE'` | `boolean` | `value === 'TRUE'` |
| ISO8601文字列 | `string` | そのまま（date型として扱う） |

## デフォルト値

以下のフィールド名は自動的にデフォルト値が設定されます:

| フィールド名 | デフォルト値 |
|------------|------------|
| `id` | `generateUuid()` |
| `createdAt` | `new Date().toISOString()` |
| `updatedAt` | `new Date().toISOString()` |
| 型が`boolean`のフィールド | `false` |

## バリデーション

`required: true`が指定されたフィールドは、自動的にバリデーションが生成されます:

```typescript
if (!data.title) throw new Error('title is required');
```

## 実行例

### CLIから実行

```bash
# スキーマなし（テンプレートのみ）
npm run test:tool scaffold_feature Task "create,read,update,delete"

# スキーマ付き（完全自動生成）
# JSON形式でスキーマを渡す（実装予定）
```

### プログラムから実行

```typescript
import { scaffoldFeature } from './tools/scaffold-feature.js';

const result = await scaffoldFeature({
  featureName: 'Task',
  schema: {
    fields: [
      { name: 'id', type: 'string', column: 'A' },
      { name: 'title', type: 'string', column: 'B', required: true },
      { name: 'completed', type: 'boolean', column: 'C', sheetsFormat: 'TRUE/FALSE' },
      { name: 'createdAt', type: 'date', column: 'D' },
      { name: 'updatedAt', type: 'date', column: 'E' },
    ],
    range: 'Tasks!A2:E',
    rangeName: 'TASK_RANGE',
  },
});

console.log(result.content[0].text);
```

## 生成されるコードの特徴

### ✅ 環境非依存

- GAS/Node.jsの両方で動作
- IIFEパターンによる実装
- `SheetsClient`による統一されたAPI呼び出し

### ✅ 型安全

- 完全なTypeScript型定義
- 自動生成された変換関数
- コンパイル時エラーチェック

### ✅ パフォーマンス最適化

- リポジトリインスタンスのキャッシュ
- UUID生成の最適化（crypto.randomUUID利用）
- 空行のフィルタリング

### ✅ エラーハンドリング

- 必須フィールドのバリデーション
- Not Foundエラー
- 環境チェック（UUID生成）

## トラブルシューティング

### Q: 生成されたコードがビルドエラーになる

A: 以下を確認してください:
- `core/types.ts`に型定義が存在するか
- `core/constants.ts`に範囲定数が定義されているか（`rangeName`指定時）
- `@/config.js`の`SpreadsheetType`に対応する型があるか

### Q: スキーマの列順序が重要か？

A: いいえ。内部で`column`プロパティに基づいてソートされます。

### Q: 既存のフィールドを追加/削除するには？

A: スキーマを更新して再生成してください。既存ファイルは上書きされます。

## 参考資料

- [Google Sheets APIスキーマリファレンス](./sheets-api-schemas.md)
- [googleapis型定義](../node_modules/googleapis/build/src/apis/sheets/v4.d.ts)
