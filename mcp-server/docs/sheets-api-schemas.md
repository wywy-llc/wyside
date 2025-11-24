# Google Sheets API スキーマリファレンス

## 概要

`googleapis@166.0.0` パッケージの `sheets_v4` 名前空間で定義されている型定義。
これらの型を使用してCRUD操作のスキーマを指定できます。

## 型定義のインポート

```typescript
import { sheets_v4 } from 'googleapis';
```

## 基本スキーマ

### Schema$ValueRange

セルの範囲とその値を表す基本スキーマ。

```typescript
interface Schema$ValueRange {
  /**
   * 値のメジャーディメンション（行優先 or 列優先）
   * - "ROWS": [[1,2],[3,4]] -> A1=1, B1=2, A2=3, B2=4
   * - "COLUMNS": [[1,2],[3,4]] -> A1=1, A2=2, B1=3, B2=4
   */
  majorDimension?: string | null;

  /**
   * A1記法の範囲（例: "Sheet1!A1:E10"）
   */
  range?: string | null;

  /**
   * セルの値（2次元配列）
   * - 外側の配列: すべてのデータ
   * - 内側の配列: メジャーディメンションに沿ったデータ
   * - サポートされる型: bool, string, number
   * - null値はスキップされる
   * - 空文字列でセルをクリア
   */
  values?: any[][] | null;
}
```

## CRUD操作のスキーマ

### 1. Read (batchGet)

**リクエスト型**: `Params$Resource$Spreadsheets$Values$Batchget`

**レスポンス型**: `Schema$BatchGetValuesResponse`

```typescript
interface Schema$BatchGetValuesResponse {
  /**
   * スプレッドシートID
   */
  spreadsheetId?: string | null;

  /**
   * 取得された値の範囲（リクエスト順）
   */
  valueRanges?: Schema$ValueRange[];
}
```

**使用例**:

```typescript
const response = await SheetsClient.batchGet(spreadsheetId, ['Todos!A2:E']);
const rows = response.valueRanges?.[0]?.values || [];
```

### 2. Create/Append (appendValues)

**リクエスト型**: `Params$Resource$Spreadsheets$Values$Append`

**レスポンス型**: `Schema$AppendValuesResponse`

```typescript
interface Schema$AppendValuesResponse {
  /**
   * スプレッドシートID
   */
  spreadsheetId?: string | null;

  /**
   * 追加されたテーブルの範囲
   */
  tableRange?: string | null;

  /**
   * 更新情報
   */
  updates?: Schema$UpdateValuesResponse;
}
```

**使用例**:

```typescript
const rowValues = [id, title, 'FALSE', createdAt, updatedAt];
await SheetsClient.appendValues(spreadsheetId, 'Todos!A2:E', [rowValues]);
```

### 3. Update (batchUpdate / updateValues)

#### 単一範囲の更新 (updateValues)

**リクエスト型**: `Params$Resource$Spreadsheets$Values$Update`

**レスポンス型**: `Schema$UpdateValuesResponse`

```typescript
interface Schema$UpdateValuesResponse {
  /**
   * スプレッドシートID
   */
  spreadsheetId?: string | null;

  /**
   * 更新された範囲（A1記法）
   */
  updatedRange?: string | null;

  /**
   * 更新された行数
   */
  updatedRows?: number | null;

  /**
   * 更新された列数
   */
  updatedColumns?: number | null;

  /**
   * 更新されたセル数
   */
  updatedCells?: number | null;

  /**
   * 更新後のデータ（includeValuesInResponse=trueの場合）
   */
  updatedData?: Schema$ValueRange;
}
```

**使用例**:

```typescript
const range = `Todos!A${rowNumber}:E${rowNumber}`;
const values = [id, title, completed ? 'TRUE' : 'FALSE', createdAt, updatedAt];
await SheetsClient.updateValues(spreadsheetId, range, [values]);
```

#### 複数範囲の更新 (batchUpdate)

**リクエスト型**: `Schema$BatchUpdateValuesRequest`

```typescript
interface Schema$BatchUpdateValuesRequest {
  /**
   * 更新する範囲と値のリスト
   */
  data?: Schema$ValueRange[];

  /**
   * レスポンスに更新後の値を含めるか
   */
  includeValuesInResponse?: boolean | null;

  /**
   * 日時のレンダリングオプション
   */
  responseDateTimeRenderOption?: string | null;

  /**
   * 値のレンダリングオプション
   */
  responseValueRenderOption?: string | null;

  /**
   * 入力データの解釈方法
   * - "RAW": 入力値をそのまま保存
   * - "USER_ENTERED": ユーザー入力として解釈（式など）
   */
  valueInputOption?: string | null;
}
```

**レスポンス型**: `Schema$BatchUpdateValuesResponse`

```typescript
interface Schema$BatchUpdateValuesResponse {
  /**
   * 各範囲の更新レスポンス（リクエスト順）
   */
  responses?: Schema$UpdateValuesResponse[];

  /**
   * スプレッドシートID
   */
  spreadsheetId?: string | null;

  /**
   * 更新されたセルの総数
   */
  totalUpdatedCells?: number | null;

  /**
   * 更新された列の総数
   */
  totalUpdatedColumns?: number | null;

  /**
   * 更新された行の総数
   */
  totalUpdatedRows?: number | null;

  /**
   * 更新されたシートの総数
   */
  totalUpdatedSheets?: number | null;
}
```

**使用例**:

```typescript
await SheetsClient.batchUpdate(spreadsheetId, [
  { range: 'Todos!A2:E2', values: [[...]] },
  { range: 'Todos!A3:E3', values: [[...]] }
]);
```

### 4. Delete (clearValues / updateValues)

削除には2つのアプローチがあります:

#### A. clearValues（完全クリア）

```typescript
await SheetsClient.clearValues(spreadsheetId, range);
```

#### B. updateValues（空値で上書き）

```typescript
const range = `Todos!A${rowNumber}:E${rowNumber}`;
await SheetsClient.updateValues(spreadsheetId, range, [['', '', '', '', '']]);
```

## JSONスキーマ例

### Todoアイテムのスキーマ例

```typescript
/**
 * Todoアイテムのフィールド定義
 */
interface TodoSchema {
  id: {
    type: 'string';
    description: 'UUID (自動生成)';
    column: 'A'; // A列
  };
  title: {
    type: 'string';
    description: 'Todoのタイトル';
    column: 'B'; // B列
    required: true;
  };
  completed: {
    type: 'boolean';
    description: '完了フラグ';
    column: 'C'; // C列
    format: 'TRUE' | 'FALSE'; // Sheets内の表現
  };
  createdAt: {
    type: 'string';
    description: '作成日時（ISO8601）';
    column: 'D'; // D列
    format: 'date-time';
  };
  updatedAt: {
    type: 'string';
    description: '更新日時（ISO8601）';
    column: 'E'; // E列
    format: 'date-time';
  };
}
```

### 配列インデックスマッピング

```typescript
/**
 * Sheets APIの行配列からオブジェクトへの変換
 */
const rowToTodo = (row: string[]): Todo => ({
  id: row[0], // A列
  title: row[1], // B列
  completed: row[2] === 'TRUE', // C列
  createdAt: row[3], // D列
  updatedAt: row[4], // E列
});

/**
 * オブジェクトからSheets APIの行配列への変換
 */
const todoToRow = (todo: Todo): any[] => [
  todo.id, // A列
  todo.title, // B列
  todo.completed ? 'TRUE' : 'FALSE', // C列
  todo.createdAt, // D列
  todo.updatedAt, // E列
];
```

## プロンプトでのスキーマ指定例

scaffold_featureツールを使用する際、以下のようにスキーマを指定できます:

```typescript
// 例: スキーマをJSON形式で指定
const featureSchema = {
  fields: [
    { name: 'id', type: 'string', column: 'A' },
    { name: 'title', type: 'string', column: 'B', required: true },
    {
      name: 'completed',
      type: 'boolean',
      column: 'C',
      sheetsFormat: 'TRUE/FALSE',
    },
    { name: 'createdAt', type: 'string', column: 'D', format: 'date-time' },
    { name: 'updatedAt', type: 'string', column: 'E', format: 'date-time' },
  ],
  range: 'Todos!A2:E', // ヘッダー行を除く
};
```

## 参考リンク

- [Google Sheets API v4 - googleapis npm](https://www.npmjs.com/package/googleapis)
- [型定義ファイル](../node_modules/googleapis/build/src/apis/sheets/v4.d.ts)
- [Google Sheets API公式ドキュメント](https://developers.google.com/sheets/api)
