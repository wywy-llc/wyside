import * as Factory from 'factory.ts';
import type { ScaffoldFeatureArgs } from '../../src/tools/scaffold-feature';
import type { FieldSchema } from '../../src/tools/schema-generator';
import { FeatureSchemaFactory } from './operation-catalog.factory';

// ===== Preset Definitions =====

/**
 * ScaffoldFeatureArgs プリセット定義カタログ（Single Source of Truth）
 */
const SCAFFOLD_ARGS_PRESETS = {
  /** 基本的なTask機能（getAll, create） */
  basicTask: {
    featureName: 'Task',
    operations: ['getAll', 'create'],
    spreadsheetNumber: 1,
    schema: {
      fields: [
        { name: 'id', type: 'string', row: 1, column: 'A', required: true },
        { name: 'title', type: 'string', row: 1, column: 'B', required: true },
      ] satisfies FieldSchema[],
      sheetName: 'Tasks',
      headerRange: 'A1:B1',
    },
  },
  /** 複数列のMedicalSheet（batchUpdate, getAll） */
  medicalSheet: {
    featureName: 'MedicalSheet',
    operations: ['batchUpdate', 'getAll'],
    spreadsheetNumber: 1,
    schema: {
      fields: [
        { name: 'mailId', type: 'string', row: 3, column: 'A' },
        { name: 'mailIdBranch', type: 'string', row: 3, column: 'B' },
        { name: 'subject', type: 'string', row: 3, column: 'C' },
        { name: 'receivedDate', type: 'string', row: 3, column: 'D' },
        { name: 'reviewer', type: 'string', row: 3, column: 'E' },
        { name: 'status', type: 'string', row: 3, column: 'F' },
      ] satisfies FieldSchema[],
      sheetName: 'メールボックス',
      headerRange: 'A3:R3',
    },
  },
  /** シート名なしの範囲フォーマット */
  rangeWithoutSheet: {
    featureName: 'Data',
    operations: ['getAll'],
    spreadsheetNumber: 1,
    schema: {
      fields: [
        { name: 'value', type: 'string', row: 1, column: 'A' },
      ] satisfies FieldSchema[],
      sheetName: 'Data',
      headerRange: 'A1:C1',
    },
  },
  /** 全操作を生成 */
  allOperations: {
    featureName: 'Item',
    operations: ['all'],
    spreadsheetNumber: 1,
    schema: {
      fields: [
        { name: 'id', type: 'string', row: 1, column: 'A', required: true },
        { name: 'name', type: 'string', row: 1, column: 'B', required: true },
      ] satisfies FieldSchema[],
      sheetName: 'Items',
      headerRange: 'A1:B1',
    },
  },
  /** 最小限のスキーマ（1フィールドのみ） */
  minimalSchema: {
    featureName: 'Custom',
    operations: ['getAll'],
    spreadsheetNumber: 1,
    schema: {
      fields: [
        { name: 'id', type: 'string', row: 1, column: 'A', required: true },
      ] satisfies FieldSchema[],
      sheetName: 'Custom',
      headerRange: 'A1:A1',
    },
  },
  /** 最小限の設定 */
  minimal: {
    featureName: 'Simple',
    operations: ['getAll'],
    spreadsheetNumber: 1,
    schema: {
      fields: [
        { name: 'id', type: 'string', row: 1, column: 'A' },
      ] satisfies FieldSchema[],
      sheetName: 'Simple',
      headerRange: 'A1:A1',
    },
  },
};

// ===== Factory Implementations =====

/**
 * ScaffoldFeatureArgs ファクトリー（内部）
 * @internal
 */
const scaffoldFeatureArgsFactory =
  Factory.Sync.makeFactory<ScaffoldFeatureArgs>({
    featureName: Factory.each(i => `Feature${i}`),
    operations: ['getAll', 'create'],
    spreadsheetNumber: 1,
    schema: FeatureSchemaFactory.build(),
  });

/**
 * プリセット生成ヘルパー（DRY原則適用）
 * @internal
 */
const createPreset =
  (
    definition: (typeof SCAFFOLD_ARGS_PRESETS)[keyof typeof SCAFFOLD_ARGS_PRESETS]
  ) =>
  (overrides?: Partial<ScaffoldFeatureArgs>) =>
    scaffoldFeatureArgsFactory.build({ ...definition, ...overrides });

/**
 * ScaffoldFeatureArgs ファクトリー
 *
 * @example
 * ```typescript
 * // 基本的な使用
 * const args = ScaffoldFeatureArgsFactory.build();
 *
 * // カスタム機能名
 * const args = ScaffoldFeatureArgsFactory.build({
 *   featureName: 'Todo',
 *   operations: ['getAll', 'create']
 * });
 *
 * // プリセット使用
 * const args = ScaffoldFeatureArgsFactory.medicalSheet();
 *
 * // テスト前にシーケンスをリセット
 * beforeEach(() => {
 *   ScaffoldFeatureArgsFactory.resetSequenceNumber();
 * });
 * ```
 */
export const ScaffoldFeatureArgsFactory = {
  /**
   * テストデータの独立性を保証するためにシーケンス番号をリセット
   *
   * @remarks
   * 各テストの beforeEach フック内で呼び出すことを推奨
   */
  resetSequenceNumber: () => scaffoldFeatureArgsFactory.resetSequenceNumber(),

  /**
   * ScaffoldFeatureArgs インスタンスを生成
   *
   * @param overrides - 上書きする値（オプショナル）
   * @returns ScaffoldFeatureArgs インスタンス
   */
  build: (overrides?: Partial<ScaffoldFeatureArgs>) =>
    scaffoldFeatureArgsFactory.build(overrides),

  /**
   * 基本的なTask機能プリセット（getAll, create）
   * @example const args = ScaffoldFeatureArgsFactory.basicTask();
   */
  basicTask: createPreset(SCAFFOLD_ARGS_PRESETS.basicTask),

  /**
   * 複数列のMedicalSheetプリセット（batchUpdate, getAll）
   * @example const args = ScaffoldFeatureArgsFactory.medicalSheet();
   */
  medicalSheet: createPreset(SCAFFOLD_ARGS_PRESETS.medicalSheet),

  /**
   * シート名なしの範囲フォーマットプリセット
   * @example const args = ScaffoldFeatureArgsFactory.rangeWithoutSheet();
   */
  rangeWithoutSheet: createPreset(SCAFFOLD_ARGS_PRESETS.rangeWithoutSheet),

  /**
   * 全操作を生成するプリセット
   * @example const args = ScaffoldFeatureArgsFactory.allOperations();
   */
  allOperations: createPreset(SCAFFOLD_ARGS_PRESETS.allOperations),

  /**
   * 最小限のスキーマプリセット（1フィールドのみ）
   * @example const args = ScaffoldFeatureArgsFactory.minimalSchema();
   */
  minimalSchema: createPreset(SCAFFOLD_ARGS_PRESETS.minimalSchema),

  /**
   * 最小限の設定プリセット
   * @example const args = ScaffoldFeatureArgsFactory.minimal();
   */
  minimal: createPreset(SCAFFOLD_ARGS_PRESETS.minimal),
} as const;
