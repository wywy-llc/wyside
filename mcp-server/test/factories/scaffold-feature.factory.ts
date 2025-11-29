import * as Factory from 'factory.ts';
import type { ScaffoldFeatureArgs } from '../../src/tools/scaffold-feature';
import { FeatureSchemaFactory } from './operation-catalog.factory';

// ===== Preset Definitions =====

/**
 * ScaffoldFeatureArgs プリセット定義カタログ（Single Source of Truth）
 */
const SCAFFOLD_ARGS_PRESETS = {
  /** 基本的なTask機能（getAll, create） */
  basicTask: {
    featureName: 'Task',
    operations: ['getAll', 'create'] as string[],
    schema: {
      fields: [
        { name: 'id', type: 'string' as const, column: 'A', required: true },
        { name: 'title', type: 'string' as const, column: 'B', required: true },
      ],
      range: 'Tasks!A2:E',
      rangeName: 'TASK_RANGE',
    },
  },
  /** 複数列のMedicalSheet（batchUpdate, getAll） */
  medicalSheet: {
    featureName: 'MedicalSheet',
    operations: ['batchUpdate', 'getAll'] as string[],
    schema: {
      fields: [
        { name: 'mailId', type: 'string' as const, column: 'A' },
        { name: 'mailIdBranch', type: 'string' as const, column: 'B' },
        { name: 'subject', type: 'string' as const, column: 'C' },
        { name: 'receivedDate', type: 'string' as const, column: 'D' },
        { name: 'reviewer', type: 'string' as const, column: 'E' },
        { name: 'status', type: 'string' as const, column: 'F' },
      ],
      range: 'A3:R',
    },
  },
  /** シート名なしの範囲フォーマット */
  rangeWithoutSheet: {
    featureName: 'Data',
    operations: ['getAll'] as string[],
    schema: {
      fields: [{ name: 'value', type: 'string' as const, column: 'A' }],
      range: 'A2:C',
    },
  },
  /** 全操作を生成 */
  allOperations: {
    featureName: 'Item',
    operations: ['all'] as string[],
    schema: {
      fields: [
        { name: 'id', type: 'string' as const, column: 'A', required: true },
        { name: 'name', type: 'string' as const, column: 'B', required: true },
      ],
      range: 'Items!A2:B',
      rangeName: 'ITEM_RANGE',
    },
  },
  /** スキーマなし（操作のみ） */
  noSchema: {
    featureName: 'Custom',
    operations: ['getAll'] as string[],
  },
  /** 最小限の設定 */
  minimal: {
    featureName: 'Simple',
    operations: ['getAll'] as string[],
    schema: {
      fields: [{ name: 'id', type: 'string' as const, column: 'A' }],
      range: 'A2:A',
    },
  },
} as const;

// ===== Factory Implementations =====

/**
 * ScaffoldFeatureArgs ファクトリー（内部）
 * @internal
 */
const scaffoldFeatureArgsFactory =
  Factory.Sync.makeFactory<ScaffoldFeatureArgs>({
    featureName: Factory.each(i => `Feature${i}`),
    operations: ['getAll', 'create'],
    schema: Factory.each(() => FeatureSchemaFactory.build()),
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
   * スキーマなしプリセット（操作のみ）
   * @example const args = ScaffoldFeatureArgsFactory.noSchema();
   */
  noSchema: createPreset(SCAFFOLD_ARGS_PRESETS.noSchema),

  /**
   * 最小限の設定プリセット
   * @example const args = ScaffoldFeatureArgsFactory.minimal();
   */
  minimal: createPreset(SCAFFOLD_ARGS_PRESETS.minimal),
} as const;
