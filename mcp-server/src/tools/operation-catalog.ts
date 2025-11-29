/**
 * 操作カタログ - Sheets API操作の定義と生成パターン
 *
 * @remarks あらゆるSheets操作をコード生成できる拡張可能なシステム
 */

import type { FeatureSchema } from './schema-generator.js';

/**
 * 操作パラメータ定義
 */
export interface OperationParameter {
  /** パラメータ名 */
  name: string;
  /** TypeScript型 */
  type: string;
  /** 必須パラメータ */
  required?: boolean;
  /** デフォルト値 */
  default?: string;
  /** 説明 */
  description?: string;
}

/**
 * 操作定義
 */
export interface OperationDefinition {
  /** 操作ID */
  id: string;
  /** 操作名 */
  name: string;
  /** カテゴリ */
  category: 'data' | 'format' | 'structure' | 'analysis' | 'custom';
  /** 説明 */
  description: string;
  /** パラメータ */
  parameters: OperationParameter[];
  /** 戻り値の型 */
  returnType: string;
  /** コード生成関数 */
  generate: (context: OperationContext) => string;
}

/**
 * 操作生成コンテキスト
 */
export interface OperationContext {
  /** 機能名（PascalCase） */
  featureName: string;
  /** 機能名（camelCase） */
  featureNameCamel: string;
  /** スキーマ */
  schema?: FeatureSchema;
  /** 範囲名 */
  rangeName?: string;
  /** カスタムパラメータ */
  params?: Record<string, any>;
}

/**
 * 操作カタログ
 */
export const OPERATION_CATALOG: Record<string, OperationDefinition> = {
  // ================== データ操作 ==================
  getAll: {
    id: 'getAll',
    name: 'Get All',
    category: 'data',
    description: '全データを取得',
    parameters: [],
    returnType: '{{featureName}}[]',
    generate: ctx => `
    const getAll = async (): Promise<${ctx.featureName}[]> => {
      const response = await SheetsClient.batchGet(spreadsheetId, [${ctx.rangeName || `'${ctx.schema?.range}'`}]);
      const rows = response.valueRanges?.[0]?.values || [];

      return rows
        .filter((row: string[]) => row && row[0] && row[0].trim() !== '')
        .map((row: string[]) => rowTo${ctx.featureName}(row));
    };`,
  },

  getById: {
    id: 'getById',
    name: 'Get By ID',
    category: 'data',
    description: 'IDで単一データを取得',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'データID' },
    ],
    returnType: '{{featureName}} | null',
    generate: ctx => {
      const keyField = ctx.schema?.fields?.[0]?.name ?? 'id';
      return `
    const getById = async (${keyField}: string): Promise<${ctx.featureName} | null> => {
      const items = await getAll();
      return items.find(item => item.${keyField} === ${keyField}) || null;
    };`;
    },
  },

  create: {
    id: 'create',
    name: 'Create',
    category: 'data',
    description: '新規データを作成',
    parameters: [
      {
        name: 'data',
        type: 'Partial<{{featureName}}>',
        required: true,
        description: '作成データ',
      },
    ],
    returnType: '{{featureName}}',
    generate: ctx => {
      const hasIdField =
        ctx.schema?.fields?.some(f => f.name === 'id') ?? false;
      return `
    const create = async (data: Partial<${ctx.featureName}>): Promise<${ctx.featureName}> => {
      const item: ${ctx.featureName} = {
        ${hasIdField ? 'id: generateUuid(),' : ''}
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as ${ctx.featureName};

      const rowValues = ${ctx.featureNameCamel}ToRow(item);
      await SheetsClient.appendValues(spreadsheetId, ${ctx.rangeName || `'${ctx.schema?.range}'`}, [rowValues]);
      return item;
    };`;
    },
  },

  update: {
    id: 'update',
    name: 'Update',
    category: 'data',
    description: 'データを更新',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'データID' },
      {
        name: 'updates',
        type: 'Partial<{{featureName}}>',
        required: true,
        description: '更新データ',
      },
    ],
    returnType: 'void',
    generate: ctx => {
      const keyField = ctx.schema?.fields?.[0]?.name ?? 'id';
      return `
    const update = async (${keyField}: string, updates: Partial<${ctx.featureName}>): Promise<void> => {
      const items = await getAll();
      const index = items.findIndex(item => item.${keyField} === ${keyField});
      if (index === -1) throw new Error(\`${ctx.featureName} \${${keyField}} not found\`);

      const rowNumber = index + 2;
      const current = items[index];
      const updated = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const values = ${ctx.featureNameCamel}ToRow(updated);
      const sheetName = ${ctx.rangeName ? `${ctx.rangeName}.split('!')[0]` : `'${ctx.schema?.range}'.split('!')[0]`};
      const range = \`\${sheetName}!A\${rowNumber}:Z\${rowNumber}\`;
      await SheetsClient.updateValues(spreadsheetId, range, [values]);
    };`;
    },
  },

  delete: {
    id: 'delete',
    name: 'Delete',
    category: 'data',
    description: 'データを削除（クリア）',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'データID' },
    ],
    returnType: 'void',
    generate: ctx => {
      const keyField = ctx.schema?.fields?.[0]?.name ?? 'id';
      return `
    const deleteById = async (${keyField}: string): Promise<void> => {
      const items = await getAll();
      const index = items.findIndex(item => item.${keyField} === ${keyField});
      if (index === -1) throw new Error(\`${ctx.featureName} \${${keyField}} not found\`);

      const rowNumber = index + 2;
      const sheetName = ${ctx.rangeName ? `${ctx.rangeName}.split('!')[0]` : `'${ctx.schema?.range}'.split('!')[0]`};
      const range = \`\${sheetName}!A\${rowNumber}:Z\${rowNumber}\`;

      const emptyValues = new Array(${ctx.schema?.fields.length || 10}).fill('');
      await SheetsClient.updateValues(spreadsheetId, range, [emptyValues]);
    };`;
    },
  },

  // ================== 範囲操作 ==================
  getRange: {
    id: 'getRange',
    name: 'Get Range',
    category: 'data',
    description: '指定範囲のデータを取得',
    parameters: [
      {
        name: 'range',
        type: 'string',
        required: true,
        description: 'A1記法の範囲',
      },
    ],
    returnType: 'any[][]',
    generate: () => `
    const getRange = async (range: string): Promise<any[][]> => {
      const response = await SheetsClient.batchGet(spreadsheetId, [range]);
      return response.valueRanges?.[0]?.values || [];
    };`,
  },

  setRange: {
    id: 'setRange',
    name: 'Set Range',
    category: 'data',
    description: '指定範囲にデータを設定',
    parameters: [
      {
        name: 'range',
        type: 'string',
        required: true,
        description: 'A1記法の範囲',
      },
      {
        name: 'values',
        type: 'any[][]',
        required: true,
        description: '設定する値（2次元配列）',
      },
    ],
    returnType: 'void',
    generate: () => `
    const setRange = async (range: string, values: any[][]): Promise<void> => {
      await SheetsClient.updateValues(spreadsheetId, range, values);
    };`,
  },

  clearRange: {
    id: 'clearRange',
    name: 'Clear Range',
    category: 'data',
    description: '指定範囲をクリア',
    parameters: [
      {
        name: 'range',
        type: 'string',
        required: true,
        description: 'A1記法の範囲',
      },
    ],
    returnType: 'void',
    generate: () => `
    const clearRange = async (range: string): Promise<void> => {
      await SheetsClient.clearValues(spreadsheetId, range);
    };`,
  },

  // ================== 書式操作 ==================
  formatCells: {
    id: 'formatCells',
    name: 'Format Cells',
    category: 'format',
    description: 'セルの書式を設定',
    parameters: [
      {
        name: 'range',
        type: 'string',
        required: true,
        description: 'A1記法の範囲',
      },
      {
        name: 'format',
        type: 'any',
        required: true,
        description: '書式設定オブジェクト',
      },
    ],
    returnType: 'void',
    generate: () => `
    const formatCells = async (range: string, format: any): Promise<void> => {
      await SheetsClient.batchUpdate(spreadsheetId, [
        {
          repeatCell: {
            range: SheetsClient.a1ToGridRange(range),
            cell: { userEnteredFormat: format },
            fields: 'userEnteredFormat',
          },
        },
      ]);
    };`,
  },

  // ================== 検索・フィルタ ==================
  search: {
    id: 'search',
    name: 'Search',
    category: 'data',
    description: '条件でデータを検索',
    parameters: [
      {
        name: 'predicate',
        type: '(item: {{featureName}}) => boolean',
        required: true,
        description: '検索条件関数',
      },
    ],
    returnType: '{{featureName}}[]',
    generate: ctx => `
    const search = async (predicate: (item: ${ctx.featureName}) => boolean): Promise<${ctx.featureName}[]> => {
      const items = await getAll();
      return items.filter(predicate);
    };`,
  },

  count: {
    id: 'count',
    name: 'Count',
    category: 'analysis',
    description: 'データ件数を取得',
    parameters: [],
    returnType: 'number',
    generate: () => `
    const count = async (): Promise<number> => {
      const items = await getAll();
      return items.length;
    };`,
  },

  // ================== バッチ操作 ==================
  batchCreate: {
    id: 'batchCreate',
    name: 'Batch Create',
    category: 'data',
    description: '複数データを一括作成',
    parameters: [
      {
        name: 'items',
        type: 'Partial<{{featureName}}>[]',
        required: true,
        description: '作成データの配列',
      },
    ],
    returnType: '{{featureName}}[]',
    generate: ctx => {
      const hasIdField =
        ctx.schema?.fields?.some(f => f.name === 'id') ?? false;
      return `
    const batchCreate = async (items: Partial<${ctx.featureName}>[]): Promise<${ctx.featureName}[]> => {
      const created = items.map(data => ({
        ${hasIdField ? 'id: generateUuid(),' : ''}
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as ${ctx.featureName}));

      const rows = created.map(item => ${ctx.featureNameCamel}ToRow(item));
      await SheetsClient.appendValues(spreadsheetId, ${ctx.rangeName || `'${ctx.schema?.range}'`}, rows);
      return created;
    };`;
    },
  },

  batchUpdate: {
    id: 'batchUpdate',
    name: 'Batch Update',
    category: 'data',
    description: '複数データを一括更新',
    parameters: [
      {
        name: 'updates',
        type: 'Array<{ id: string; data: Partial<{{featureName}}> }>',
        required: true,
        description: '更新データの配列',
      },
    ],
    returnType: 'void',
    generate: ctx => {
      const keyField = ctx.schema?.fields?.[0]?.name ?? 'id';
      return `
    const batchUpdate = async (updates: Array<{ id: string; data: Partial<${ctx.featureName}> }>): Promise<void> => {
      const items = await getAll();
      const updateMap = new Map(updates.map(u => [u.id, u.data]));

      const valueRanges = items
        .map((item, index) => {
          const key = item.${keyField};
          if (!key) return null;
          const updateData = updateMap.get(key);
          if (!updateData) return null;

          const updated = { ...item, ...updateData, updatedAt: new Date().toISOString() };
          const rowNumber = index + 2;
          const sheetName = ${ctx.rangeName ? `${ctx.rangeName}.split('!')[0]` : `'${ctx.schema?.range}'.split('!')[0]`};

          return {
            range: \`\${sheetName}!A\${rowNumber}:Z\${rowNumber}\`,
            values: [${ctx.featureNameCamel}ToRow(updated)],
          };
        })
        .filter((vr): vr is { range: string; values: any[][] } => vr !== null);

      if (valueRanges.length > 0) {
        await SheetsClient.batchUpdateValues(spreadsheetId, valueRanges);
      }
    };`;
    },
  },
};

/**
 * 操作IDから定義を取得
 */
export function getOperationDefinition(
  operationId: string
): OperationDefinition | undefined {
  return OPERATION_CATALOG[operationId];
}

/**
 * カテゴリで操作を取得
 */
export function getOperationsByCategory(
  category: OperationDefinition['category']
): OperationDefinition[] {
  return Object.values(OPERATION_CATALOG).filter(
    op => op.category === category
  );
}

/**
 * すべての操作IDを取得
 */
export function getAllOperationIds(): string[] {
  return Object.keys(OPERATION_CATALOG);
}

/**
 * 操作コードを生成
 */
export function generateOperationCode(
  operationId: string,
  context: OperationContext
): string {
  const definition = getOperationDefinition(operationId);
  if (!definition) {
    throw new Error(`Unknown operation: ${operationId}`);
  }

  return definition.generate(context);
}

/**
 * 複数の操作コードを生成
 */
export function generateOperationsCodes(
  operationIds: string[],
  context: OperationContext
): string[] {
  return operationIds.map(id => generateOperationCode(id, context));
}

/**
 * 操作のエクスポートリストを生成
 */
export function generateExportsList(operationIds: string[]): string {
  const exports = operationIds
    .map(id => {
      const def = getOperationDefinition(id);
      if (!def) return null;

      // 'delete' -> 'deleteById' のマッピング
      const exportName = id === 'delete' ? 'deleteById' : id;
      return exportName;
    })
    .filter(Boolean);

  return exports.join(',\n      ');
}
