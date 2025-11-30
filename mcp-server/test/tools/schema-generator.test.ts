import {
  generateDefaults,
  generateHeaderRange,
  generateDataRange,
  generateObjectToRow,
  generateRowToObject,
  generateTypeDefinition,
  generateValidation,
} from '../../src/tools/schema-generator.js';
import {
  FeatureSchemaFactory,
  resetAllFactories,
} from '../factories/operation-catalog.factory.js';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Schema Generator', () => {
  // テスト独立性の保証（シーケンス番号リセット）
  beforeEach(() => {
    resetAllFactories();
  });

  describe('generateTypeDefinition', () => {
    it('should generate correct TypeScript interface', () => {
      // テストデータ: Task（id, title, completed）
      const schema = FeatureSchemaFactory.taskWithCompletion();

      // 検証: TypeScriptインターフェース生成
      const result = generateTypeDefinition('Task', schema);

      // 1. インターフェース宣言が含まれること
      expect(result).toContain('export interface Task {');
      // 2. 各フィールドが正しい型で定義されること
      expect(result).toContain('id: string;');
      expect(result).toContain('title: string;');
      // 3. optional フィールドは ? 付きで定義されること
      expect(result).toContain('completed?: boolean;');
    });

    it('should handle optional fields', () => {
      // テストデータ: User（name required, age optional）
      const schema = FeatureSchemaFactory.user();

      // 検証: optional フィールドの扱い
      const result = generateTypeDefinition('User', schema);

      // required フィールドは ? なし
      expect(result).toContain('name: string;');
      // optional フィールドは ? 付き
      expect(result).toContain('age?: number;');
    });

    it('should convert date type to string', () => {
      // テストデータ: Event（date型フィールド）
      const schema = FeatureSchemaFactory.event();

      // 検証: date型はstring型に変換されること
      const result = generateTypeDefinition('Event', schema);

      expect(result).toContain('createdAt: string;');
    });

    it('should include field descriptions as JSDoc comments', () => {
      // テストデータ: User（email with description）
      const schema = FeatureSchemaFactory.userWithEmail();

      // 検証: フィールド説明がJSDocコメントとして出力されること
      const result = generateTypeDefinition('User', schema);

      // 1. JSDocコメントが含まれること
      expect(result).toContain('/** User email address */');
      // 2. フィールド定義が続くこと
      expect(result).toContain('email?: string;');
    });
  });

  describe('generateRowToObject', () => {
    it('should generate row-to-object conversion function', () => {
      // テストデータ: Task（基本的な2フィールド）
      const schema = FeatureSchemaFactory.task();

      // 検証: 行→オブジェクト変換関数の生成
      const result = generateRowToObject('Task', schema);

      // 1. 関数シグネチャが正しいこと
      expect(result).toContain('const rowToTask = (row: string[]): Task =>');
      // 2. 各フィールドが配列インデックスでマッピングされること
      expect(result).toContain('id: row[0]');
      expect(result).toContain('title: row[1]');
    });

    it('should handle boolean conversion with TRUE/FALSE format', () => {
      // テストデータ: User（boolean TRUE/FALSE format）
      const schema = FeatureSchemaFactory.userWithActive();

      // 検証: boolean型の TRUE/FALSE 変換
      const result = generateRowToObject('User', schema);

      // TRUE文字列の比較で boolean に変換
      expect(result).toContain("active: row[0] === 'TRUE'");
    });

    it('should handle number conversion', () => {
      // テストデータ: Product（number fields）
      const schema = FeatureSchemaFactory.product();

      // 検証: number型への変換
      const result = generateRowToObject('Product', schema);

      // Number()関数で変換
      expect(result).toContain('count: Number(row[0])');
      expect(result).toContain('price: Number(row[1])');
    });

    it('should sort fields by column index', () => {
      // テストデータ: Data（ソート順テスト用 - C, A, B）
      const schema = FeatureSchemaFactory.dataUnsorted();

      // 検証: フィールドが列インデックス順にソートされること
      const result = generateRowToObject('Data', schema);

      // インデックス順（A=0, B=1, C=2）で出力されること
      const firstIndex = result.indexOf('first: row[0]');
      const secondIndex = result.indexOf('second: row[1]');
      const thirdIndex = result.indexOf('third: row[2]');

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });
  });

  describe('generateObjectToRow', () => {
    it('should generate object-to-row conversion function', () => {
      // テストデータ: User（id, name）
      const schema = FeatureSchemaFactory.user();

      // 検証: オブジェクト→行変換関数の生成
      const result = generateObjectToRow('User', schema);

      // 1. 関数シグネチャが正しいこと（パラメータ名は featureName）
      expect(result).toContain(
        'const UserToRow = (User: User): (string | undefined)[] =>'
      );
      // 2. オブジェクトのプロパティがアクセスされること
      expect(result).toContain('User.name');
    });

    it('should handle boolean conversion with TRUE/FALSE format', () => {
      // テストデータ: Setting（boolean TRUE/FALSE format）
      const schema = FeatureSchemaFactory.setting();

      // 検証: boolean型の TRUE/FALSE 文字列変換
      const result = generateObjectToRow('Setting', schema);

      // 三項演算子で TRUE/FALSE 文字列に変換
      expect(result).toContain("Setting.enabled ? 'TRUE' : 'FALSE'");
    });

    it('should convert numbers to strings', () => {
      // テストデータ: Item（quantity number field）
      const schema = FeatureSchemaFactory.itemWithQuantity();

      // 検証: number型の値がそのまま使用されること
      const result = generateObjectToRow('Item', schema);

      // Item.quantity がそのまま使用される
      expect(result).toContain('Item.quantity');
    });
  });

  describe('generateValidation', () => {
    it('should generate validation function for required fields', () => {
      // テストデータ: User（email required, age optional）
      const schema = FeatureSchemaFactory.userWithEmailRequired();

      // 検証: 必須フィールドのバリデーション処理生成
      const result = generateValidation('User', schema);

      // バリデーションチェック処理が含まれること
      expect(result).toContain(
        "if (!data.email) throw new Error('email is required')"
      );
    });

    it('should handle schemas with no required fields', () => {
      // テストデータ: Note（no required fields）
      const schema = FeatureSchemaFactory.note();

      // 検証: 必須フィールドなしの場合は空文字列を返す
      const result = generateValidation('Note', schema);

      // 空文字列が返されること
      expect(result).toBe('');
    });
  });

  describe('generateDefaults', () => {
    it('should generate default values based on field types', () => {
      // テストデータ: Item（all field types）
      const schema = FeatureSchemaFactory.itemWithAllTypes();

      // 検証: 特定フィールドのデフォルト値生成
      const result = generateDefaults(schema);

      // 特定フィールドのデフォルト値が生成されること
      // createdAtは'new Date().toISOString()'
      expect(result.createdAt).toBe('new Date().toISOString()');
      // activeはfalse
      expect(result.active).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty schema', () => {
      // テストデータ: Empty（no fields）
      const schema = FeatureSchemaFactory.empty();

      // 検証: 空のスキーマでも正しいインターフェース生成
      const result = generateTypeDefinition('Empty', schema);

      expect(result).toContain('export interface Empty {');
      expect(result).toContain('}');
    });

    it('should handle single field schema', () => {
      // テストデータ: Single（single field）
      const schema = FeatureSchemaFactory.single();

      // 検証: 単一フィールドのスキーマ処理
      const result = generateTypeDefinition('Single', schema);

      expect(result).toContain('value?: string;');
    });
  });

  describe('generateHeaderRange & generateDataRange', () => {
    it('シート名と列からヘッダー/データ範囲を自動算出（headerRange未指定）', () => {
      // テストデータ: Tasksシート、列A:B、row=1（ファクトリー既定）
      const schema = FeatureSchemaFactory.task();

      // 実行: ヘッダー/データ範囲生成
      const header = generateHeaderRange(schema);
      const data = generateDataRange(schema);

      // 検証: fields[].rowから行番号を取得（row=1）
      expect(header).toBe('Tasks!A1:B1');
      expect(data).toBe('Tasks!A2:B');
    });

    it('fields[].rowが3の場合、ヘッダー3行目・データ4行目開始', () => {
      // テストデータ: fields[].row=3（データは4行目開始）
      const schema = FeatureSchemaFactory.build({
        sheetName: 'メールボックス',
        headerRange: 'A1:R1', // 無視される
        fields: [
          { name: 'a', type: 'string', row: 3, column: 'A' },
          { name: 'b', type: 'string', row: 3, column: 'R' },
        ],
      });

      const header = generateHeaderRange(schema);
      const data = generateDataRange(schema);

      expect(header).toBe('メールボックス!A3:R3');
      expect(data).toBe('メールボックス!A4:R');
    });

    it('fields[].row=10の場合、シート名とrow値から範囲を決定', () => {
      // テストデータ: fields[].row=10を使用（headerRangeは無視される）
      const schema = FeatureSchemaFactory.build({
        sheetName: 'Todos',
        headerRange: 'CustomSheet!C1:D1', // 無視される
        fields: [
          { name: 'c', type: 'string', row: 10, column: 'C' },
          { name: 'd', type: 'string', row: 10, column: 'D' },
        ],
      });

      const header = generateHeaderRange(schema);
      const data = generateDataRange(schema);

      expect(header).toBe('Todos!C10:D10');
      expect(data).toBe('Todos!C11:D');
    });
  });
});
