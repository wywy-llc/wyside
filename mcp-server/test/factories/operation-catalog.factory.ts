import * as Factory from 'factory.ts';
import { OperationContext } from '../../src/tools/operation-catalog';
import { FeatureSchema, FieldSchema } from '../../src/tools/schema-generator';

// ===== Preset Definitions =====

/**
 * FeatureSchema プリセット定義カタログ（Single Source of Truth）
 */
const FEATURE_SCHEMA_PRESETS = {
  task: {
    fields: [
      { name: 'id', type: 'string', column: 'A', required: true },
      { name: 'title', type: 'string', column: 'B', required: true },
    ] as FieldSchema[],
    range: 'Tasks!A2:E',
    rangeName: 'TASK_RANGE',
  },
  item: {
    fields: [
      { name: 'id', type: 'string', column: 'A', required: true },
      { name: 'title', type: 'string', column: 'B', required: true },
    ] as FieldSchema[],
    range: 'Items!A2:E',
    rangeName: 'ITEM_RANGE',
  },
  taskWithCompletion: {
    fields: [
      { name: 'id', type: 'string', column: 'A', required: true },
      { name: 'title', type: 'string', column: 'B', required: true },
      { name: 'completed', type: 'boolean', column: 'C' },
    ] as FieldSchema[],
    range: 'Tasks!A2:E',
    rangeName: 'TASK_RANGE',
  },
  user: {
    fields: [
      { name: 'name', type: 'string', column: 'A', required: true },
      { name: 'age', type: 'number', column: 'B' },
    ] as FieldSchema[],
    range: 'Users!A2:B',
    rangeName: 'USER_RANGE',
  },
  event: {
    fields: [
      { name: 'createdAt', type: 'date', column: 'A', required: true },
    ] as FieldSchema[],
    range: 'Events!A2:A',
    rangeName: 'EVENT_RANGE',
  },
  userWithEmail: {
    fields: [
      {
        name: 'email',
        type: 'string',
        column: 'A',
        description: 'User email address',
      },
    ] as FieldSchema[],
    range: 'Users!A2:A',
    rangeName: 'USER_RANGE',
  },
  userWithActive: {
    fields: [
      {
        name: 'active',
        type: 'boolean',
        column: 'A',
        sheetsFormat: 'TRUE/FALSE',
      },
    ] as FieldSchema[],
    range: 'Users!A2:A',
    rangeName: 'USER_RANGE',
  },
  product: {
    fields: [
      { name: 'count', type: 'number', column: 'A' },
      { name: 'price', type: 'number', column: 'B' },
    ] as FieldSchema[],
    range: 'Products!A2:B',
    rangeName: 'PRODUCT_RANGE',
  },
  dataUnsorted: {
    fields: [
      { name: 'third', type: 'string', column: 'C' },
      { name: 'first', type: 'string', column: 'A' },
      { name: 'second', type: 'string', column: 'B' },
    ] as FieldSchema[],
    range: 'Data!A2:C',
    rangeName: 'DATA_RANGE',
  },
  setting: {
    fields: [
      {
        name: 'enabled',
        type: 'boolean',
        column: 'A',
        sheetsFormat: 'TRUE/FALSE',
      },
    ] as FieldSchema[],
    range: 'Settings!A2:A',
    rangeName: 'SETTING_RANGE',
  },
  itemWithQuantity: {
    fields: [
      { name: 'quantity', type: 'number', column: 'A' },
    ] as FieldSchema[],
    range: 'Items!A2:A',
    rangeName: 'ITEM_RANGE',
  },
  userWithEmailRequired: {
    fields: [
      { name: 'email', type: 'string', column: 'A', required: true },
      { name: 'age', type: 'number', column: 'B' },
    ] as FieldSchema[],
    range: 'Users!A2:B',
    rangeName: 'USER_RANGE',
  },
  note: {
    fields: [
      { name: 'note', type: 'string', column: 'A' },
      { name: 'tag', type: 'string', column: 'B' },
    ] as FieldSchema[],
    range: 'Notes!A2:B',
    rangeName: 'NOTE_RANGE',
  },
  itemWithAllTypes: {
    fields: [
      { name: 'name', type: 'string', column: 'A' },
      { name: 'count', type: 'number', column: 'B' },
      { name: 'active', type: 'boolean', column: 'C' },
      { name: 'createdAt', type: 'date', column: 'D' },
    ] as FieldSchema[],
    range: 'Items!A2:D',
    rangeName: 'ITEM_RANGE',
  },
  empty: {
    fields: [] as FieldSchema[],
    range: 'Empty!A2:A',
    rangeName: 'EMPTY_RANGE',
  },
  single: {
    fields: [{ name: 'value', type: 'string', column: 'A' }] as FieldSchema[],
    range: 'Single!A2:A',
    rangeName: 'SINGLE_RANGE',
  },
} as const;

// ===== Factory Implementations =====

/**
 * FeatureSchema ファクトリー（内部）
 * @internal
 */
const featureSchemaFactory = Factory.Sync.makeFactory<FeatureSchema>({
  fields: [
    { name: 'id', type: 'string', column: 'A', required: true },
    { name: 'title', type: 'string', column: 'B', required: true },
  ],
  range: Factory.each(i => `Sheet${i}!A2:E`),
  rangeName: Factory.each(i => `RANGE_${i}`),
});

/**
 * プリセット生成ヘルパー（DRY原則適用）
 * @internal
 */
const createPreset =
  (
    definition: (typeof FEATURE_SCHEMA_PRESETS)[keyof typeof FEATURE_SCHEMA_PRESETS]
  ) =>
  (overrides?: Partial<FeatureSchema>) =>
    featureSchemaFactory.build({ ...definition, ...overrides });

/**
 * OperationContext ファクトリー（内部）
 * @internal
 */
const operationContextFactory = Factory.Sync.makeFactory<OperationContext>({
  featureName: Factory.each(i => `Feature${i}`),
  featureNameCamel: Factory.each(i => `feature${i}`),
  schema: Factory.each(() => featureSchemaFactory.build()),
  rangeName: Factory.each(i => `RANGE_${i}`),
});

/**
 * FeatureSchema ファクトリー
 *
 * @example
 * ```typescript
 * // 基本的な使用
 * const schema = FeatureSchemaFactory.build();
 *
 * // カスタムフィールド
 * const schema = FeatureSchemaFactory.build({
 *   fields: [
 *     { name: 'id', type: 'string', column: 'A' },
 *     { name: 'name', type: 'string', column: 'B' }
 *   ]
 * });
 *
 * // テスト前にシーケンスをリセット
 * beforeEach(() => {
 *   FeatureSchemaFactory.resetSequenceNumber();
 * });
 * ```
 */
export const FeatureSchemaFactory = {
  /**
   * テストデータの独立性を保証するためにシーケンス番号をリセット
   *
   * @remarks
   * 各テストの beforeEach フック内で呼び出すことを推奨
   */
  resetSequenceNumber: () => featureSchemaFactory.resetSequenceNumber(),

  /**
   * FeatureSchema インスタンスを生成
   *
   * @param overrides - 上書きする値（オプショナル）
   * @returns FeatureSchema インスタンス
   */
  build: (overrides?: Partial<FeatureSchema>) =>
    featureSchemaFactory.build(overrides),

  /**
   * Task プリセット（Todos シート）
   * @example const schema = FeatureSchemaFactory.task();
   */
  task: createPreset(FEATURE_SCHEMA_PRESETS.task),

  /**
   * Item プリセット（Items シート）
   * @example const schema = FeatureSchemaFactory.item();
   */
  item: createPreset(FEATURE_SCHEMA_PRESETS.item),

  /**
   * 完全なTask プリセット（id, title, completed）
   * @example const schema = FeatureSchemaFactory.taskWithCompletion();
   */
  taskWithCompletion: createPreset(FEATURE_SCHEMA_PRESETS.taskWithCompletion),

  /**
   * User プリセット（name, age - ageはoptional）
   * @example const schema = FeatureSchemaFactory.user();
   */
  user: createPreset(FEATURE_SCHEMA_PRESETS.user),

  /**
   * Event プリセット（date型フィールド含む）
   * @example const schema = FeatureSchemaFactory.event();
   */
  event: createPreset(FEATURE_SCHEMA_PRESETS.event),

  /**
   * User（email with description）プリセット
   * @example const schema = FeatureSchemaFactory.userWithEmail();
   */
  userWithEmail: createPreset(FEATURE_SCHEMA_PRESETS.userWithEmail),

  /**
   * User（boolean TRUE/FALSE format）プリセット
   * @example const schema = FeatureSchemaFactory.userWithActive();
   */
  userWithActive: createPreset(FEATURE_SCHEMA_PRESETS.userWithActive),

  /**
   * Product（number fields）プリセット
   * @example const schema = FeatureSchemaFactory.product();
   */
  product: createPreset(FEATURE_SCHEMA_PRESETS.product),

  /**
   * Data（ソート順テスト用 - C, A, B）プリセット
   * @example const schema = FeatureSchemaFactory.dataUnsorted();
   */
  dataUnsorted: createPreset(FEATURE_SCHEMA_PRESETS.dataUnsorted),

  /**
   * Setting（boolean TRUE/FALSE format）プリセット
   * @example const schema = FeatureSchemaFactory.setting();
   */
  setting: createPreset(FEATURE_SCHEMA_PRESETS.setting),

  /**
   * Item（quantity number field）プリセット
   * @example const schema = FeatureSchemaFactory.itemWithQuantity();
   */
  itemWithQuantity: createPreset(FEATURE_SCHEMA_PRESETS.itemWithQuantity),

  /**
   * User（email required, age optional）プリセット
   * @example const schema = FeatureSchemaFactory.userWithEmailRequired();
   */
  userWithEmailRequired: createPreset(
    FEATURE_SCHEMA_PRESETS.userWithEmailRequired
  ),

  /**
   * Note（no required fields）プリセット
   * @example const schema = FeatureSchemaFactory.note();
   */
  note: createPreset(FEATURE_SCHEMA_PRESETS.note),

  /**
   * Item（all field types）プリセット
   * @example const schema = FeatureSchemaFactory.itemWithAllTypes();
   */
  itemWithAllTypes: createPreset(FEATURE_SCHEMA_PRESETS.itemWithAllTypes),

  /**
   * Empty（no fields）プリセット
   * @example const schema = FeatureSchemaFactory.empty();
   */
  empty: createPreset(FEATURE_SCHEMA_PRESETS.empty),

  /**
   * Single（single field）プリセット
   * @example const schema = FeatureSchemaFactory.single();
   */
  single: createPreset(FEATURE_SCHEMA_PRESETS.single),
} as const;

/**
 * OperationContext ファクトリー
 *
 * @example
 * ```typescript
 * // 基本的な使用
 * const context = OperationContextFactory.build();
 *
 * // カスタム機能名
 * const context = OperationContextFactory.build({
 *   featureName: 'Todo',
 *   featureNameCamel: 'todo'
 * });
 *
 * // テスト前にシーケンスをリセット
 * beforeEach(() => {
 *   OperationContextFactory.resetSequenceNumber();
 * });
 * ```
 */
export const OperationContextFactory = {
  /**
   * テストデータの独立性を保証するためにシーケンス番号をリセット
   *
   * @remarks
   * 各テストの beforeEach フック内で呼び出すことを推奨
   */
  resetSequenceNumber: () => operationContextFactory.resetSequenceNumber(),

  /**
   * OperationContext インスタンスを生成
   *
   * @param overrides - 上書きする値（オプショナル）
   * @returns OperationContext インスタンス
   */
  build: (overrides?: Partial<OperationContext>) =>
    operationContextFactory.build(overrides),

  /**
   * Todo プリセット
   *
   * @example
   * ```typescript
   * const context = OperationContextFactory.todo();
   * ```
   */
  todo: (overrides?: Partial<OperationContext>) =>
    operationContextFactory.build({
      featureName: 'Todo',
      featureNameCamel: 'todo',
      schema: FeatureSchemaFactory.task(),
      rangeName: 'TASK_RANGE',
      ...overrides,
    }),

  /**
   * Item プリセット
   *
   * @example
   * ```typescript
   * const context = OperationContextFactory.item();
   * ```
   */
  item: (overrides?: Partial<OperationContext>) =>
    operationContextFactory.build({
      featureName: 'Item',
      featureNameCamel: 'item',
      schema: FeatureSchemaFactory.item(),
      rangeName: 'ITEM_RANGE',
      ...overrides,
    }),

  /**
   * Task プリセット
   *
   * @example
   * ```typescript
   * const context = OperationContextFactory.task();
   * ```
   */
  task: (overrides?: Partial<OperationContext>) =>
    operationContextFactory.build({
      featureName: 'Task',
      featureNameCamel: 'task',
      schema: FeatureSchemaFactory.task(),
      rangeName: 'TASK_RANGE',
      ...overrides,
    }),
} as const;

/**
 * すべてのファクトリーのシーケンス番号を一括リセット
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   resetAllFactories();
 * });
 * ```
 */
export const resetAllFactories = () => {
  FeatureSchemaFactory.resetSequenceNumber();
  OperationContextFactory.resetSequenceNumber();
};
