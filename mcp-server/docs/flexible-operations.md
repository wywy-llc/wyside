# 柔軟な操作システム - あらゆるSheets操作を生成

## 概要

CRUD操作に限定されない、拡張可能な操作カタログシステムを実装しました。
ユーザーの要望に応じて、必要な操作だけを選んでコード生成できます。

## 📦 利用可能な操作カタログ

### データ操作 (category: 'data')

| 操作ID    | 説明                   | パラメータ                              | 戻り値            |
| --------- | ---------------------- | --------------------------------------- | ----------------- |
| `getAll`  | 全データを取得         | なし                                    | `Feature[]`       |
| `getById` | IDで単一データを取得   | `id: string`                            | `Feature \| null` |
| `create`  | 新規データを作成       | `data: Partial<Feature>`                | `Feature`         |
| `update`  | データを更新           | `id: string, updates: Partial<Feature>` | `void`            |
| `delete`  | データを削除（クリア） | `id: string`                            | `void`            |
| `search`  | 条件でデータを検索     | `predicate: (item) => boolean`          | `Feature[]`       |

### 範囲操作 (category: 'data')

| 操作ID       | 説明                   | パラメータ                       | 戻り値    |
| ------------ | ---------------------- | -------------------------------- | --------- |
| `getRange`   | 指定範囲のデータを取得 | `range: string`                  | `any[][]` |
| `setRange`   | 指定範囲にデータを設定 | `range: string, values: any[][]` | `void`    |
| `clearRange` | 指定範囲をクリア       | `range: string`                  | `void`    |

### 書式操作 (category: 'format')

| 操作ID        | 説明             | パラメータ                   | 戻り値 |
| ------------- | ---------------- | ---------------------------- | ------ |
| `formatCells` | セルの書式を設定 | `range: string, format: any` | `void` |

### 分析操作 (category: 'analysis')

| 操作ID  | 説明             | パラメータ | 戻り値   |
| ------- | ---------------- | ---------- | -------- |
| `count` | データ件数を取得 | なし       | `number` |

### バッチ操作 (category: 'data')

| 操作ID        | 説明                 | パラメータ                   | 戻り値      |
| ------------- | -------------------- | ---------------------------- | ----------- |
| `batchCreate` | 複数データを一括作成 | `items: Partial<Feature>[]`  | `Feature[]` |
| `batchUpdate` | 複数データを一括更新 | `updates: Array<{id, data}>` | `void`      |

## 🚀 使用方法

### 1. 基本的なCRUD操作のみ生成

```typescript
const result = await scaffoldFeature({
  featureName: 'Task',
  operations: ['getAll', 'create', 'update', 'delete'],
  schema: taskSchema,
});
```

生成されるメソッド:

- `getAll()`
- `create(data)`
- `update(id, updates)`
- `remove(id)` ← delete操作は`remove`として生成

### 2. 検索・分析機能を追加

```typescript
const result = await scaffoldFeature({
  featureName: 'Product',
  operations: ['getAll', 'search', 'count'],
  schema: productSchema,
});
```

生成されるメソッド:

- `getAll()`
- `search(predicate)` ← ラムダ関数で柔軟な検索
- `count()`

使用例:

```typescript
// 在庫切れ商品を検索
const outOfStock = await ProductRepo.search(p => p.stock === 0);

// 総商品数を取得
const total = await ProductRepo.count();
```

### 3. 範囲操作に特化

```typescript
const result = await scaffoldFeature({
  featureName: 'DataSheet',
  operations: ['getRange', 'setRange', 'clearRange'],
  schema: dataSchema,
});
```

生成されるメソッド:

- `getRange(range)` ← 任意の範囲を取得
- `setRange(range, values)` ← 任意の範囲に設定
- `clearRange(range)` ← 任意の範囲をクリア

使用例:

```typescript
// A1:C10の範囲を取得
const data = await DataSheetRepo.getRange('Sheet1!A1:C10');

// データを設定
await DataSheetRepo.setRange('Sheet1!A1:C10', [
  [1, 2, 3],
  [4, 5, 6],
]);

// 範囲をクリア
await DataSheetRepo.clearRange('Sheet1!A1:C10');
```

### 4. バッチ操作で高速化

```typescript
const result = await scaffoldFeature({
  featureName: 'BulkImport',
  operations: ['batchCreate', 'batchUpdate'],
  schema: importSchema,
});
```

生成されるメソッド:

- `batchCreate(items)` ← 複数データを一括作成
- `batchUpdate(updates)` ← 複数データを一括更新

使用例:

```typescript
// 100件のデータを一括作成
const items = Array.from({ length: 100 }, (_, i) => ({
  title: `Item ${i}`,
  value: i * 10,
}));
await BulkImportRepo.batchCreate(items);

// 複数データを一括更新
await BulkImportRepo.batchUpdate([
  { id: 'id1', data: { status: 'completed' } },
  { id: 'id2', data: { status: 'completed' } },
  { id: 'id3', data: { status: 'completed' } },
]);
```

### 5. 全操作を生成

```typescript
const result = await scaffoldFeature({
  featureName: 'FullFeature',
  operations: ['all'], // または operations: [] (空配列)
  schema: fullSchema,
});
```

利用可能な全操作が生成されます（現在16種類）。

## 📝 操作の組み合わせ例

### パターン1: シンプルな台帳管理

```typescript
operations: ['getAll', 'create', 'update', 'delete', 'count'];
```

### パターン2: 検索可能なマスタデータ

```typescript
operations: ['getAll', 'getById', 'search', 'count'];
```

### パターン3: 大量データのインポート

```typescript
operations: ['batchCreate', 'batchUpdate', 'count'];
```

### パターン4: 柔軟なデータ操作

```typescript
operations: ['getRange', 'setRange', 'clearRange', 'formatCells'];
```

### パターン5: フル機能

```typescript
operations: ['all'];
```

## 🔧 カスタム操作の追加

新しい操作を追加するには、`operation-catalog.ts`に定義を追加します:

```typescript
export const OPERATION_CATALOG: Record<string, OperationDefinition> = {
  // ... 既存の操作

  // カスタム操作を追加
  customOperation: {
    id: 'customOperation',
    name: 'Custom Operation',
    category: 'custom',
    description: 'カスタム操作の説明',
    parameters: [{ name: 'param1', type: 'string', required: true }],
    returnType: 'CustomResult',
    generate: ctx => `
    const customOperation = async (param1: string): Promise<CustomResult> => {
      // カスタムロジック
      return result;
    };`,
  },
};
```

## 💡 操作定義の構造

```typescript
interface OperationDefinition {
  id: string; // 操作ID（一意）
  name: string; // 表示名
  category: string; // カテゴリ（data, format, structure, analysis, custom）
  description: string; // 説明
  parameters: OperationParameter[]; // パラメータ定義
  returnType: string; // 戻り値の型（テンプレート変数使用可）
  generate: (context) => string; // コード生成関数
}
```

### コンテキストオブジェクト

```typescript
interface OperationContext {
  featureName: string; // PascalCase（例: "Task"）
  featureNameCamel: string; // camelCase（例: "task"）
  schema?: FeatureSchema; // スキーマ定義
  rangeName?: string; // 範囲定数名（例: "TASK_RANGE"）
  params?: Record<string, any>; // カスタムパラメータ
}
```

## 📊 カテゴリ別の操作一覧

### データ操作 (data)

全8種類: `getAll`, `getById`, `create`, `update`, `delete`, `search`, `getRange`, `setRange`, `clearRange`

### 書式操作 (format)

全1種類: `formatCells`

### 分析操作 (analysis)

全1種類: `count`

### バッチ操作 (data)

全2種類: `batchCreate`, `batchUpdate`

## 🎯 ベストプラクティス

### 1. 必要最小限の操作を選択

不要な操作を生成すると、コードが肥大化します。
実際に使用する操作だけを指定しましょう。

```typescript
// ❌ 悪い例: 全操作を生成
operations: ['all'];

// ✅ 良い例: 必要な操作だけ
operations: ['getAll', 'create', 'update'];
```

### 2. パフォーマンスを考慮

大量データを扱う場合は、バッチ操作を使用しましょう。

```typescript
// ❌ 悪い例: ループでcreateを呼ぶ
for (const item of items) {
  await repo.create(item); // N回のAPI呼び出し
}

// ✅ 良い例: batchCreateを使う
await repo.batchCreate(items); // 1回のAPI呼び出し
```

### 3. 操作の命名規則

| 操作ID   | 生成されるメソッド名 | 理由                           |
| -------- | -------------------- | ------------------------------ |
| `delete` | `remove`             | JavaScriptの予約語を避けるため |
| その他   | そのまま             | 直感的な命名                   |

## 🔍 トラブルシューティング

### Q: 操作が生成されない

A: 操作IDが正しいか確認してください。利用可能な操作IDは:

```typescript
import { getAllOperationIds } from './tools/operation-catalog.js';
console.log(getAllOperationIds());
```

### Q: カスタム操作を追加したい

A: `operation-catalog.ts`に定義を追加し、再ビルドしてください。

### Q: 特定のカテゴリの操作だけ使いたい

A: カテゴリでフィルタして指定してください:

```typescript
import { getOperationsByCategory } from './tools/operation-catalog.js';

const dataOps = getOperationsByCategory('data');
const operationIds = dataOps.map(op => op.id);
```

## 📚 参考資料

- [操作カタログソースコード](../src/tools/operation-catalog.ts)
- [Google Sheets API リファレンス](./sheets-api-schemas.md)
- [スキーマベース生成ガイド](./schema-based-generation.md)
