/**
 * スキーマベースのコード生成ヘルパー
 *
 * @remarks Google Sheets APIのスキーマ定義からTypeScriptコードを自動生成
 * @example
 * ```ts
 * const schema: FeatureSchema = {
 *   fields: [
 *     { name: 'id', type: 'string', column: 'A' },
 *     { name: 'completed', type: 'boolean', column: 'C', sheetsFormat: 'TRUE/FALSE' }
 *   ],
 *   sheetName: 'Tasks',
 *   headerRange: 'A1:E1'
 * };
 * const typeDef = generateTypeDefinition('Task', schema);
 * ```
 */

/**
 * フィールドスキーマ定義
 */
export interface FieldSchema {
  /** フィールド名（camelCase） */
  name: string;
  /** TypeScript型 */
  type: 'string' | 'number' | 'boolean' | 'date';
  /** ヘッダー行番号（1ベース） */
  row: number;
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
  /** スプレッドシートID (infer_schema_from_sheetから渡される) */
  spreadsheetId?: string;
}

/**
 * デフォルト値生成のルール設定
 */
export interface DefaultValueRule {
  /** フィールド名のパターン */
  fieldNamePattern: string | RegExp;
  /** 生成する値（文字列または生成関数） */
  value: string | ((field: FieldSchema) => string);
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
 * camelCaseをPascalCaseに変換
 *
 * @param str - camelCase文字列
 * @returns PascalCase文字列
 */
function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * フィールドを列インデックスでソート
 *
 * @param fields - フィールド配列
 * @returns ソート済みフィールド配列
 */
function sortFieldsByColumn(fields: FieldSchema[]): FieldSchema[] {
  return [...fields].sort(
    (a, b) => columnToIndex(a.column) - columnToIndex(b.column)
  );
}

/**
 * 型変換ロジックを集約するクラス
 */
class ValueConverter {
  /**
   * Sheets値→TypeScript値への変換コードを生成
   *
   * @param field - フィールドスキーマ
   * @param arrayAccessor - 配列アクセス式（例: `row[0]`）
   * @returns 変換後の式
   */
  static sheetsToTypeScript(field: FieldSchema, arrayAccessor: string): string {
    switch (field.type) {
      case 'boolean':
        return field.sheetsFormat === 'TRUE/FALSE'
          ? `${arrayAccessor} === 'TRUE'`
          : `Boolean(${arrayAccessor})`;
      case 'number':
        return `Number(${arrayAccessor})`;
      default:
        return arrayAccessor;
    }
  }

  /**
   * TypeScript値→Sheets値への変換コードを生成
   *
   * @param field - フィールドスキーマ
   * @param objectAccessor - オブジェクトアクセス式（例: `task.completed`）
   * @returns 変換後の式
   */
  static typeScriptToSheets(
    field: FieldSchema,
    objectAccessor: string
  ): string {
    if (field.type === 'boolean' && field.sheetsFormat === 'TRUE/FALSE') {
      return `${objectAccessor} ? 'TRUE' : 'FALSE'`;
    }
    return objectAccessor;
  }
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
  const sortedFields = sortFieldsByColumn(schema.fields);

  const mappings = sortedFields.map(field => {
    const index = columnToIndex(field.column);
    const value = ValueConverter.sheetsToTypeScript(field, `row[${index}]`);
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
  const sortedFields = sortFieldsByColumn(schema.fields);
  const pascalName = toPascalCase(featureName);

  const mappings = sortedFields.map(field => {
    const accessor = `${featureName}.${field.name}`;
    const value = ValueConverter.typeScriptToSheets(field, accessor);
    return `    ${value},`;
  });

  return `  const ${featureName}ToRow = (${featureName}: ${pascalName}): (string | undefined)[] => [
${mappings.join('\n')}
  ];`;
}

/**
 * 列範囲計算を責務とするクラス
 */
class ColumnRangeCalculator {
  /**
   * スキーマから列境界を取得
   *
   * @param schema - 機能スキーマ
   * @returns 最初と最後の列文字
   */
  static getColumnBounds(schema: FeatureSchema): {
    firstCol: string;
    lastCol: string;
  } {
    const columns = schema.fields.map(f => f.column).sort();
    return {
      firstCol: columns[0],
      lastCol: columns[columns.length - 1],
    };
  }

  /**
   * ヘッダー範囲を正規化
   *
   * @param schema - 機能スキーマ
   * @returns 正規化された範囲情報
   */
  static normalize(schema: FeatureSchema): NormalizedHeaderRange {
    const { firstCol, lastCol } = this.getColumnBounds(schema);
    const headerRow = schema.fields[0]?.row ?? 1;

    return {
      sheet: schema.sheetName,
      startCol: firstCol,
      endCol: lastCol,
      headerRow,
      headerRange: `${schema.sheetName}!${firstCol}${headerRow}:${lastCol}${headerRow}`,
      dataRange: `${schema.sheetName}!${firstCol}${headerRow + 1}:${lastCol}`,
    };
  }
}

type NormalizedHeaderRange = {
  sheet: string;
  startCol: string;
  endCol: string;
  headerRow: number;
  headerRange: string;
  dataRange: string;
};

export function generateHeaderRange(schema: FeatureSchema): string {
  return ColumnRangeCalculator.normalize(schema).headerRange;
}

export function generateDataRange(schema: FeatureSchema): string {
  return ColumnRangeCalculator.normalize(schema).dataRange;
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
 * スキーマの整合性を検証
 *
 * @param schema - 検証対象のスキーマ
 * @throws {Error} 全フィールドが同じ行番号を持たない場合
 */
export function validateSchema(schema: FeatureSchema): void {
  if (schema.fields.length === 0) return;

  const firstRow = schema.fields[0].row;
  const hasInconsistentRows = schema.fields.some(f => f.row !== firstRow);

  if (hasInconsistentRows) {
    throw new Error('All fields must have the same row number');
  }
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
 * デフォルトルール: 一般的なフィールド名パターンに対応
 */
const DEFAULT_RULES: DefaultValueRule[] = [
  { fieldNamePattern: 'id', value: 'generateUuid()' },
  { fieldNamePattern: /^createdAt$/i, value: 'new Date().toISOString()' },
  { fieldNamePattern: /^updatedAt$/i, value: 'new Date().toISOString()' },
];

/**
 * デフォルト値を持つフィールドを生成
 *
 * @param schema - 機能スキーマ
 * @param customRules - カスタムルール（省略時はデフォルトルールのみ使用）
 * @returns デフォルト値のオブジェクト
 */
export function generateDefaults(
  schema: FeatureSchema,
  customRules: DefaultValueRule[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaults: Record<string, any> = {};
  const allRules = [...DEFAULT_RULES, ...customRules];

  for (const field of schema.fields) {
    // ルールマッチング
    const matchedRule = allRules.find(rule => {
      if (typeof rule.fieldNamePattern === 'string') {
        return field.name === rule.fieldNamePattern;
      }
      return rule.fieldNamePattern.test(field.name);
    });

    if (matchedRule) {
      defaults[field.name] =
        typeof matchedRule.value === 'function'
          ? matchedRule.value(field)
          : matchedRule.value;
    } else if (field.type === 'boolean') {
      // 型ベースのデフォルト
      defaults[field.name] = false;
    }
  }

  return defaults;
}
