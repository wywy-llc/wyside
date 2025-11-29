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
      { name: 'id', type: 'string', row: 1, column: 'A', required: true },
      { name: 'title', type: 'string', row: 1, column: 'B', required: true },
    ] as FieldSchema[],
    sheetName: 'Tasks',
    headerRange: 'A1:E1',
  },
  item: {
    fields: [
      { name: 'id', type: 'string', row: 1, column: 'A', required: true },
      { name: 'title', type: 'string', row: 1, column: 'B', required: true },
    ] as FieldSchema[],
    sheetName: 'Items',
    headerRange: 'A1:E1',
  },
  taskWithCompletion: {
    fields: [
      { name: 'id', type: 'string', row: 1, column: 'A', required: true },
      { name: 'title', type: 'string', row: 1, column: 'B', required: true },
      { name: 'completed', type: 'boolean', row: 1, column: 'C' },
    ] as FieldSchema[],
    sheetName: 'Tasks',
    headerRange: 'A1:E1',
  },
  user: {
    fields: [
      { name: 'name', type: 'string', row: 1, column: 'A', required: true },
      { name: 'age', type: 'number', row: 1, column: 'B' },
    ] as FieldSchema[],
    sheetName: 'Users',
    headerRange: 'A1:B1',
  },
  event: {
    fields: [
      { name: 'createdAt', type: 'date', row: 1, column: 'A', required: true },
    ] as FieldSchema[],
    sheetName: 'Events',
    headerRange: 'A1:A1',
  },
  userWithEmail: {
    fields: [
      {
        name: 'email',
        type: 'string',
        row: 1,
        column: 'A',
        description: 'User email address',
      },
    ] as FieldSchema[],
    sheetName: 'Users',
    headerRange: 'A1:A1',
  },
  userWithActive: {
    fields: [
      {
        name: 'active',
        type: 'boolean',
        row: 1,
        column: 'A',
        sheetsFormat: 'TRUE/FALSE',
      },
    ] as FieldSchema[],
    sheetName: 'Users',
    headerRange: 'A1:A1',
  },
  product: {
    fields: [
      { name: 'count', type: 'number', row: 1, column: 'A' },
      { name: 'price', type: 'number', row: 1, column: 'B' },
    ] as FieldSchema[],
    sheetName: 'Products',
    headerRange: 'A1:B1',
  },
  dataUnsorted: {
    fields: [
      { name: 'third', type: 'string', row: 1, column: 'C' },
      { name: 'first', type: 'string', row: 1, column: 'A' },
      { name: 'second', type: 'string', row: 1, column: 'B' },
    ] as FieldSchema[],
    sheetName: 'Data',
    headerRange: 'A1:C1',
  },
  setting: {
    fields: [
      {
        name: 'enabled',
        type: 'boolean',
        row: 1,
        column: 'A',
        sheetsFormat: 'TRUE/FALSE',
      },
    ] as FieldSchema[],
    sheetName: 'Settings',
    headerRange: 'A1:A1',
  },
  itemWithQuantity: {
    fields: [
      { name: 'quantity', type: 'number', row: 1, column: 'A' },
    ] as FieldSchema[],
    sheetName: 'Items',
    headerRange: 'A1:A1',
  },
  userWithEmailRequired: {
    fields: [
      { name: 'email', type: 'string', row: 1, column: 'A', required: true },
      { name: 'age', type: 'number', row: 1, column: 'B' },
    ] as FieldSchema[],
    sheetName: 'Users',
    headerRange: 'A1:B1',
  },
  note: {
    fields: [
      { name: 'note', type: 'string', row: 1, column: 'A' },
      { name: 'tag', type: 'string', row: 1, column: 'B' },
    ] as FieldSchema[],
    sheetName: 'Notes',
    headerRange: 'A1:B1',
  },
  itemWithAllTypes: {
    fields: [
      { name: 'name', type: 'string', row: 1, column: 'A' },
      { name: 'count', type: 'number', row: 1, column: 'B' },
      { name: 'active', type: 'boolean', row: 1, column: 'C' },
      { name: 'createdAt', type: 'date', row: 1, column: 'D' },
    ] as FieldSchema[],
    sheetName: 'Items',
    headerRange: 'A1:D1',
  },
  empty: {
    fields: [] as FieldSchema[],
    sheetName: 'Empty',
    headerRange: 'A1:A1',
  },
  single: {
    fields: [
      { name: 'value', type: 'string', row: 1, column: 'A' },
    ] as FieldSchema[],
    sheetName: 'Single',
    headerRange: 'A1:A1',
  },
} as const;

// ===== Factory Implementations =====

/**
 * FeatureSchema ファクトリー（内部）
 * @internal
 */
const featureSchemaFactory = Factory.Sync.makeFactory<FeatureSchema>({
  fields: [
    { name: 'id', type: 'string', row: 1, column: 'A', required: true },
    { name: 'title', type: 'string', row: 1, column: 'B', required: true },
  ],
  sheetName: Factory.each(i => `Sheet${i}`),
  headerRange: 'A1:E1',
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
