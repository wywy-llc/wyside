/**
 * スキーマベースのコード生成ヘルパー
 *
 * @remarks Google Sheets APIのスキーマ定義からTypeScriptコードを自動生成
 */

/**
 * フィールドスキーマ定義
 */
export interface FieldSchema {
  /** フィールド名（camelCase） */
  name: string;
  /** TypeScript型 */
  type: 'string' | 'number' | 'boolean' | 'date';
  /** Sheets列（A, B, C...） */
  column: string;
  /** 必須フィールド */
  required?: boolean;
  /** Sheets内の表現形式（例: 'TRUE/FALSE'） */
  sheetsFormat?: string;
  /** フィールドの説明 */
  description?: string;
}

/**
 * 機能スキーマ定義
 */
export interface FeatureSchema {
  /** フィールド定義 */
  fields: FieldSchema[];
  /** データを保持するシート名 */
  sheetName: string;
  /** ヘッダー行の範囲（例: "A1:E1"） ※シート名は含めない */
  headerRange: string;
}

/**
 * 列文字をインデックスに変換
 *
 * @param column - 列文字（A, B, C...）
 * @returns 0始まりのインデックス
 */
function columnToIndex(column: string): number {
  let index = 0;
  for (let i = 0; i < column.length; i++) {
    index = index * 26 + (column.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * TypeScript型定義を生成
 *
 * @param featureName - 機能名（PascalCase）
 * @param schema - 機能スキーマ
 * @returns TypeScript interface定義
 */
export function generateTypeDefinition(
  featureName: string,
  schema: FeatureSchema
): string {
  const fields = schema.fields.map(field => {
    const optional = field.required ? '' : '?';
    let tsType = field.type;
    if (field.type === 'date') tsType = 'string'; // ISO8601形式

    const comment = field.description ? `  /** ${field.description} */\n` : '';
    return `${comment}  ${field.name}${optional}: ${tsType};`;
  });

  return `export interface ${featureName} {
${fields.join('\n')}
}`;
}

/**
 * 行配列→オブジェクト変換関数を生成
 *
 * @param featureName - 機能名（PascalCase）
 * @param schema - 機能スキーマ
 * @returns 変換関数のコード
 */
export function generateRowToObject(
  featureName: string,
  schema: FeatureSchema
): string {
  const sortedFields = [...schema.fields].sort(
    (a, b) => columnToIndex(a.column) - columnToIndex(b.column)
  );

  const mappings = sortedFields.map(field => {
    const index = columnToIndex(field.column);
    let value = `row[${index}]`;

    // 型変換
    if (field.type === 'boolean') {
      if (field.sheetsFormat === 'TRUE/FALSE') {
        value = `row[${index}] === 'TRUE'`;
      } else {
        value = `Boolean(row[${index}])`;
      }
    } else if (field.type === 'number') {
      value = `Number(row[${index}])`;
    }

    return `    ${field.name}: ${value},`;
  });

  return `  const rowTo${featureName} = (row: string[]): ${featureName} => ({
${mappings.join('\n')}
  });`;
}

/**
 * オブジェクト→行配列変換関数を生成
 *
 * @param featureName - 機能名（camelCase）
 * @param schema - 機能スキーマ
 * @returns 変換関数のコード
 */
export function generateObjectToRow(
  featureName: string,
  schema: FeatureSchema
): string {
  const sortedFields = [...schema.fields].sort(
    (a, b) => columnToIndex(a.column) - columnToIndex(b.column)
  );

  const mappings = sortedFields.map(field => {
    let value = `${featureName}.${field.name}`;

    // 型変換
    if (field.type === 'boolean' && field.sheetsFormat === 'TRUE/FALSE') {
      value = `${value} ? 'TRUE' : 'FALSE'`;
    }

    return `    ${value},`;
  });

  return `  const ${featureName}ToRow = (${featureName}: ${featureName.charAt(0).toUpperCase() + featureName.slice(1)}): any[] => [
${mappings.join('\n')}
  ];`;
}

/**
 * CRUD操作の列範囲を生成
 *
 * @param schema - 機能スキーマ
 * @returns 列範囲（例: "A:E"）
 */
function getColumnBounds(schema: FeatureSchema): {
  firstCol: string;
  lastCol: string;
} {
  const columns = schema.fields.map(f => f.column).sort();
  const firstCol = columns[0];
  const lastCol = columns[columns.length - 1];
  return { firstCol, lastCol };
}

type NormalizedHeaderRange = {
  sheet: string;
  startCol: string;
  endCol: string;
  headerRow: number;
  headerRange: string;
  dataRange: string;
};

function normalizeHeaderRange(schema: FeatureSchema): NormalizedHeaderRange {
  const { firstCol, lastCol } = getColumnBounds(schema);
  const rawHeader = schema.headerRange || `${firstCol}1:${lastCol}1`;
  const headerWithSheet = `${schema.sheetName}!${rawHeader}`;

  const match = headerWithSheet.match(
    /^(?:(?<sheet>[^!]+)!)?(?<startCol>[A-Z]+)(?<startRow>\d+):(?<endCol>[A-Z]+)(?<endRow>\d+)$/
  );

  const sheet = match?.groups?.sheet || schema.sheetName;
  const startCol = match?.groups?.startCol || firstCol;
  const endCol = match?.groups?.endCol || lastCol;
  const headerRow = match?.groups?.startRow ? Number(match.groups.startRow) : 1;

  return {
    sheet,
    startCol,
    endCol,
    headerRow,
    headerRange: `${sheet}!${startCol}${headerRow}:${endCol}${headerRow}`,
    dataRange: `${sheet}!${startCol}${headerRow + 1}:${endCol}`,
  };
}

export function generateHeaderRange(schema: FeatureSchema): string {
  return normalizeHeaderRange(schema).headerRange;
}

export function generateDataRange(schema: FeatureSchema): string {
  return normalizeHeaderRange(schema).dataRange;
}

/**
 * フィールド数を取得
 *
 * @param schema - 機能スキーマ
 * @returns フィールド数
 */
export function getFieldCount(schema: FeatureSchema): number {
  return schema.fields.length;
}

/**
 * 必須フィールドのバリデーションコードを生成
 *
 * @param featureName - 機能名（camelCase）
 * @param schema - 機能スキーマ
 * @returns バリデーションコード
 */
export function generateValidation(
  featureName: string,
  schema: FeatureSchema
): string {
  const requiredFields = schema.fields.filter(f => f.required);

  if (requiredFields.length === 0) return '';

  const checks = requiredFields
    .map(
      field =>
        `    if (!data.${field.name}) throw new Error('${field.name} is required');`
    )
    .join('\n');

  return checks;
}

/**
 * デフォルト値を持つフィールドを生成
 *
 * @param schema - 機能スキーマ
 * @returns デフォルト値のオブジェクト
 */
export function generateDefaults(schema: FeatureSchema): Record<string, any> {
  const defaults: Record<string, any> = {};

  for (const field of schema.fields) {
    if (field.name === 'id') {
      defaults[field.name] = 'generateUuid()';
    } else if (field.name === 'createdAt' || field.name === 'updatedAt') {
      defaults[field.name] = 'new Date().toISOString()';
    } else if (field.type === 'boolean') {
      defaults[field.name] = false;
    }
  }

  return defaults;
}
