import { beforeEach, describe, expect, it } from 'vitest';
import {
  generateExportsList,
  generateOperationCode,
  generateOperationsCodes,
  getAllOperationIds,
  getOperationDefinition,
  getOperationsByCategory,
  type OperationContext,
} from '../../src/tools/operation-catalog.js';
import {
  FeatureSchemaFactory,
  OperationContextFactory,
  resetAllFactories,
} from '../factories/operation-catalog.factory.js';

describe('Operation Catalog', () => {
  // テスト独立性の保証（シーケンス番号リセット）
  beforeEach(() => {
    resetAllFactories();
  });

  describe('getOperationDefinition', () => {
    it('should return operation definition for valid ID', () => {
      // 検証: 正常系 - 有効なID（getAll）で操作定義取得
      const operation = getOperationDefinition('getAll');

      // 1. 操作定義が存在すること
      expect(operation).toBeDefined();
      // 2. IDが一致すること
      expect(operation?.id).toBe('getAll');
      // 3. カテゴリが'data'であること
      expect(operation?.category).toBe('data');
      // 4. 説明が存在すること
      expect(operation?.description).toBeTruthy();
    });

    it('should return undefined for invalid ID', () => {
      // 検証: 異常系 - 存在しないIDでundefinedを返す
      const operation = getOperationDefinition('nonexistent');

      expect(operation).toBeUndefined();
    });

    it('should have all required properties', () => {
      // 検証: 操作定義の必須プロパティ存在確認
      const operation = getOperationDefinition('create');

      // 各プロパティの存在確認
      expect(operation).toHaveProperty('id');
      expect(operation).toHaveProperty('category');
      expect(operation).toHaveProperty('description');
      expect(operation).toHaveProperty('parameters');
      expect(operation).toHaveProperty('returnType');
      expect(operation).toHaveProperty('generate');
      // generate は関数型であること
      expect(typeof operation?.generate).toBe('function');
    });
  });

  describe('getOperationsByCategory', () => {
    it('should return operations for data category', () => {
      // 検証: 'data'カテゴリの操作一覧取得
      const operations = getOperationsByCategory('data');

      // 1. 結果が存在すること
      expect(operations.length).toBeGreaterThan(0);
      // 2. すべての操作がdataカテゴリであること
      operations.forEach(op => {
        expect(op.category).toBe('data');
      });
    });

    it('should return operations for format category', () => {
      // 検証: 'format'カテゴリの操作一覧取得
      const operations = getOperationsByCategory('format');

      expect(operations.length).toBeGreaterThan(0);
      operations.forEach(op => {
        expect(op.category).toBe('format');
      });
    });

    it('should return operations for analysis category', () => {
      // 検証: 'analysis'カテゴリの操作一覧取得
      const operations = getOperationsByCategory('analysis');

      expect(operations.length).toBeGreaterThan(0);
      operations.forEach(op => {
        expect(op.category).toBe('analysis');
      });
    });
  });

  describe('getAllOperationIds', () => {
    it('should return all operation IDs', () => {
      // 検証: 全操作IDの取得と主要IDの存在確認
      const ids = getAllOperationIds();

      // 1. 結果が存在すること
      expect(ids.length).toBeGreaterThan(0);
      // 2. 主要な操作が含まれること
      expect(ids).toContain('getAll');
      expect(ids).toContain('create');
      expect(ids).toContain('update');
      expect(ids).toContain('delete');
    });

    it('should return unique IDs', () => {
      // 検証: IDの一意性（重複なし）
      const ids = getAllOperationIds();
      const uniqueIds = [...new Set(ids)];

      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('generateOperationCode', () => {
    // テストデータ: Todo機能のコンテキスト
    let context: OperationContext;

    beforeEach(() => {
      context = OperationContextFactory.todo();
    });

    it('should generate code for getAll operation', () => {
      // 検証: getAll操作のコード生成
      const code = generateOperationCode('getAll', context);

      // 生成コードに必要な要素が含まれること
      expect(code).toContain('const getAll');
      expect(code).toContain('${sheetName}!A2:B');
      expect(code).toContain('SheetsClient.batchGet');
      expect(code).toContain('async');
    });

    it('should generate code for create operation', () => {
      // 検証: create操作のコード生成
      const code = generateOperationCode('create', context);

      expect(code).toContain('const create');
      expect(code).toContain('Todo');
      expect(code).toContain('SheetsClient');
    });

    it('should generate code for update operation', () => {
      // 検証: update操作のコード生成（ID指定で更新）
      const code = generateOperationCode('update', context);

      expect(code).toContain('const update');
      expect(code).toContain('id: string');
      expect(code).toContain('SheetsClient');
    });

    it('should generate code for delete operation', () => {
      // 検証: delete操作のコード生成（ID指定で削除）
      const code = generateOperationCode('delete', context);

      expect(code).toContain('deleteById');
      expect(code).toContain('id: string');
      expect(code).toContain('SheetsClient');
    });

    it('should throw error for unknown operation', () => {
      // 検証: 異常系 - 未知の操作でエラースロー
      expect(() => {
        generateOperationCode('nonexistent', context);
      }).toThrow('Unknown operation: nonexistent');
    });

    it('should use feature name in generated function names', () => {
      // テストデータ: 'Task'機能名でカスタマイズ
      const customContext = OperationContextFactory.task();

      // 検証: 生成コードに機能名が反映されること
      const code = generateOperationCode('getById', customContext);

      expect(code).toContain('Task');
    });
  });

  describe('generateOperationsCodes', () => {
    // テストデータ: Item機能のコンテキスト
    let context: OperationContext;

    beforeEach(() => {
      context = OperationContextFactory.item();
    });

    it('should generate code for multiple operations', () => {
      // 検証: 複数操作の一括コード生成
      const codes = generateOperationsCodes(
        ['create', 'getAll', 'update'],
        context
      );

      // 各操作のコードが含まれること
      const code = codes.join('\n\n');
      expect(code).toContain('create');
      expect(code).toContain('getAll');
      expect(code).toContain('update');
    });

    it('should separate operations with double newlines', () => {
      // 検証: 操作間の改行区切り（\n\n）
      const codes = generateOperationsCodes(['create', 'getAll'], context);
      const code = codes.join('\n\n');

      expect(code).toMatch(/create[\s\S]+\n\n[\s\S]+getAll/);
    });

    it('should handle empty operations array', () => {
      // 検証: 空配列で空配列を返す
      const codes = generateOperationsCodes([], context);

      expect(codes.length).toBe(0);
    });

    it('should maintain order of operations', () => {
      // 検証: 操作の順序保持
      const codes = generateOperationsCodes(
        ['delete', 'create', 'getAll'],
        context
      );

      // 配列の順序で操作が生成されること
      expect(codes.length).toBe(3);
      expect(codes[0]).toContain('deleteById');
      expect(codes[1]).toContain('create');
      expect(codes[2]).toContain('getAll');
    });
  });

  describe('generateExportsList', () => {
    it('should generate exports list for operations', () => {
      // 検証: エクスポートリストの生成（カンマ区切り形式）
      const exports = generateExportsList([
        'create',
        'getAll',
        'update',
        'delete',
      ]);

      // カンマ区切りのリスト形式確認
      expect(exports).toContain('create');
      expect(exports).toContain('getAll');
      expect(exports).toContain('update');
      // delete は deleteById に変換される
      expect(exports).toContain('deleteById');
    });

    it('should handle single operation', () => {
      // 検証: 単一操作のエクスポート
      const exports = generateExportsList(['create']);

      expect(exports).toBe('create');
    });

    it('should handle empty array', () => {
      // 検証: 空配列で空文字列を返す
      const exports = generateExportsList([]);

      expect(exports).toBe('');
    });

    it('should format with proper separators', () => {
      // 検証: カンマと改行での区切り
      const exports = generateExportsList(['create', 'getAll']);

      expect(exports).toMatch(/create,\n\s+getAll/);
    });
  });

  describe('Operation Parameters Validation', () => {
    it('should have valid parameters for getAll', () => {
      // 検証: getAll操作のパラメータ定義
      const operation = getOperationDefinition('getAll');

      expect(operation?.parameters).toBeDefined();
      expect(Array.isArray(operation?.parameters)).toBe(true);
    });

    it('should have required parameters for create', () => {
      // 検証: create操作に必須パラメータ存在
      const operation = getOperationDefinition('create');

      expect(operation?.parameters.length).toBeGreaterThan(0);
      const hasRequiredParam = operation?.parameters.some(p => p.required);
      expect(hasRequiredParam).toBe(true);
    });

    it('should have id parameter for update', () => {
      // 検証: update操作にidパラメータ存在
      const operation = getOperationDefinition('update');

      const hasIdParam = operation?.parameters.some(p => p.name === 'id');
      expect(hasIdParam).toBe(true);
    });
  });

  describe('Return Types', () => {
    it('should have appropriate return types', () => {
      // 検証: 主要操作の戻り値型存在確認
      const getAll = getOperationDefinition('getAll');
      const create = getOperationDefinition('create');
      const update = getOperationDefinition('update');

      expect(getAll?.returnType).toBeTruthy();
      expect(create?.returnType).toBeTruthy();
      expect(update?.returnType).toBeTruthy();
    });

    it('should have array return type for getAll operation', () => {
      // 検証: getAll操作は配列型を返す
      const getAll = getOperationDefinition('getAll');

      expect(getAll?.returnType).toContain('[]');
    });
  });

  describe('Integration Test', () => {
    it('should work with complete workflow', () => {
      // 統合検証: 全機能を組み合わせたワークフロー

      // 1. 全操作ID取得
      const allIds = getAllOperationIds();
      expect(allIds.length).toBeGreaterThan(0);

      // 2. カテゴリ別操作取得
      const dataOps = getOperationsByCategory('data');
      expect(dataOps.length).toBeGreaterThan(0);

      // 3. テストデータ: Test機能のコンテキスト
      const context: OperationContext = OperationContextFactory.build({
        featureName: 'Test',
        featureNameCamel: 'test',
        schema: FeatureSchemaFactory.build({
          fields: [
            { name: 'id', type: 'string', row: 1, column: 'A', required: true },
            {
              name: 'title',
              type: 'string',
              row: 1,
              column: 'B',
              required: true,
            },
          ],
          sheetName: 'TestSheet',
          headerRange: 'A1:B1',
        }),
      });

      // 4. 選択操作のコード生成
      const selectedOps = dataOps.slice(0, 2).map(op => op.id);
      const codes = generateOperationsCodes(selectedOps, context);
      expect(codes.length).toBeGreaterThan(0);
      expect(codes.every(code => code.length > 0)).toBe(true);

      // 5. エクスポートリスト生成（カンマ区切り形式）
      const exports = generateExportsList(selectedOps);
      expect(exports).toBeTruthy();
      expect(exports.length).toBeGreaterThan(0);
    });
  });
});
