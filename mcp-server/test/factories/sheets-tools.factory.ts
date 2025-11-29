import * as Factory from 'factory.ts';
import type { sheets_v4 } from 'googleapis';

/**
 * SetupNamedRangeArgs の型定義
 */
export interface SetupNamedRangeArgs {
  spreadsheetId: string;
  rangeName: string;
  range: string;
}

/**
 * Sheet プロパティの型定義
 */
export interface SheetProperties {
  sheetId: number;
  title: string;
}

/**
 * Named Range の型定義
 * @remarks Google Sheets API の Schema$NamedRange に対応
 */
export interface NamedRange {
  namedRangeId: string;
  name: string;
  range?: sheets_v4.Schema$GridRange;
}

// ===== Preset Definitions =====

/**
 * SetupNamedRangeArgs プリセット定義カタログ（Single Source of Truth）
 */
const SETUP_NAMED_RANGE_PRESETS = {
  todoRange: {
    rangeName: 'TODO_RANGE',
    range: 'Todos!E:E',
  },
  withQuotedSheetName: {
    rangeName: 'TEST_RANGE',
    range: "'Sheet Name'!A1:B2",
  },
  withEscapedChars: {
    rangeName: 'TEST_RANGE',
    range: 'Todos\\!A1:B2',
  },
  columnRange: {
    rangeName: 'COLUMN_RANGE',
    range: 'Todos!A:C',
  },
  rowRange: {
    rangeName: 'ROW_RANGE',
    range: 'Todos!1:5',
  },
  invalidRange: {
    range: 'InvalidFormat',
  },
  emptySpreadsheetId: {
    spreadsheetId: '',
  },
} as const;

// ============================================
// Factory Instances
// ============================================

/**
 * SetupNamedRangeArgs ファクトリー（内部）
 * @internal
 */
const setupNamedRangeArgsFactory =
  Factory.Sync.makeFactory<SetupNamedRangeArgs>({
    spreadsheetId: '1jvwUjvP8t9o8u6O42a-hvTe1HBXM7iXRqbsMhp0JH2g',
    rangeName: Factory.each(i => `TEST_RANGE_${i}`),
    range: 'Todos!E:E',
  });

/**
 * Sheet プロパティファクトリー（内部）
 * @internal
 */
const sheetPropertiesFactory = Factory.Sync.makeFactory<SheetProperties>({
  sheetId: Factory.each(i => i),
  title: 'Todos',
});

/**
 * Spreadsheet データファクトリー（内部）
 * @internal
 * @remarks Google Sheets API の Schema$Spreadsheet に基づく
 */
const spreadsheetDataFactory =
  Factory.Sync.makeFactory<sheets_v4.Schema$Spreadsheet>({
    sheets: Factory.each(() => [
      { properties: sheetPropertiesFactory.build() },
    ]),
    namedRanges: [] as sheets_v4.Schema$NamedRange[],
  });

/**
 * Named Range ファクトリー（内部）
 * @internal
 */
const namedRangeFactory = Factory.Sync.makeFactory<NamedRange>({
  namedRangeId: Factory.each(i => `range-id-${i}`),
  name: Factory.each(i => `RANGE_${i}`),
});

/**
 * プリセット生成ヘルパー（DRY原則適用）
 * @internal
 */
const createPreset =
  (
    definition: (typeof SETUP_NAMED_RANGE_PRESETS)[keyof typeof SETUP_NAMED_RANGE_PRESETS]
  ) =>
  (overrides?: Partial<SetupNamedRangeArgs>) =>
    setupNamedRangeArgsFactory.build({ ...definition, ...overrides });

// ============================================
// Exported Factory Objects
// ============================================

/**
 * SetupNamedRangeArgs ファクトリー
 *
 * @example
 * ```typescript
 * // 基本的な使用
 * const args = SetupNamedRangeArgsFactory.build();
 *
 * // 部分的にオーバーライド
 * const args = SetupNamedRangeArgsFactory.build({
 *   rangeName: 'CUSTOM_RANGE',
 * });
 *
 * // テスト前にシーケンスをリセット
 * beforeEach(() => {
 *   SetupNamedRangeArgsFactory.resetSequenceNumber();
 * });
 * ```
 */
export const SetupNamedRangeArgsFactory = {
  /**
   * テストデータの独立性を保証するためにシーケンス番号をリセット
   *
   * @remarks
   * 各テストの beforeEach フック内で呼び出すことを推奨
   */
  resetSequenceNumber: () => setupNamedRangeArgsFactory.resetSequenceNumber(),

  /**
   * SetupNamedRangeArgs インスタンスを生成
   *
   * @param overrides - 上書きする値（オプショナル）
   * @returns SetupNamedRangeArgs インスタンス
   */
  build: (overrides?: Partial<SetupNamedRangeArgs>) =>
    setupNamedRangeArgsFactory.build(overrides),

  /**
   * TODO_RANGE プリセット
   * @example const args = SetupNamedRangeArgsFactory.todoRange();
   */
  todoRange: createPreset(SETUP_NAMED_RANGE_PRESETS.todoRange),

  /**
   * シングルクォート付きシート名プリセット
   * @example const args = SetupNamedRangeArgsFactory.withQuotedSheetName();
   */
  withQuotedSheetName: createPreset(
    SETUP_NAMED_RANGE_PRESETS.withQuotedSheetName
  ),

  /**
   * シェルエスケープされた記号プリセット
   * @example const args = SetupNamedRangeArgsFactory.withEscapedChars();
   */
  withEscapedChars: createPreset(SETUP_NAMED_RANGE_PRESETS.withEscapedChars),

  /**
   * 列全体の範囲プリセット
   * @example const args = SetupNamedRangeArgsFactory.columnRange();
   */
  columnRange: createPreset(SETUP_NAMED_RANGE_PRESETS.columnRange),

  /**
   * 行全体の範囲プリセット
   * @example const args = SetupNamedRangeArgsFactory.rowRange();
   */
  rowRange: createPreset(SETUP_NAMED_RANGE_PRESETS.rowRange),

  /**
   * 無効な範囲形式プリセット（エラーテスト用）
   * @example const args = SetupNamedRangeArgsFactory.invalidRange();
   */
  invalidRange: createPreset(SETUP_NAMED_RANGE_PRESETS.invalidRange),

  /**
   * 空のスプレッドシートIDプリセット（エラーテスト用）
   * @example const args = SetupNamedRangeArgsFactory.emptySpreadsheetId();
   */
  emptySpreadsheetId: createPreset(
    SETUP_NAMED_RANGE_PRESETS.emptySpreadsheetId
  ),
} as const;

/**
 * Sheet プロパティファクトリー
 *
 * @example
 * ```typescript
 * // 基本的な使用
 * const props = SheetPropertiesFactory.build();
 *
 * // カスタムシート
 * const props = SheetPropertiesFactory.build({
 *   title: 'CustomSheet',
 * });
 * ```
 */
export const SheetPropertiesFactory = {
  /**
   * シーケンス番号をリセット
   */
  resetSequenceNumber: () => sheetPropertiesFactory.resetSequenceNumber(),

  /**
   * SheetProperties インスタンスを生成
   *
   * @param overrides - 上書きする値（オプショナル）
   * @returns SheetProperties インスタンス
   */
  build: (overrides?: Partial<SheetProperties>) =>
    sheetPropertiesFactory.build(overrides),

  /**
   * シート名に空白を含むプリセット
   *
   * @example
   * ```typescript
   * const props = SheetPropertiesFactory.withSpacedName();
   * ```
   */
  withSpacedName: (overrides?: Partial<SheetProperties>) =>
    sheetPropertiesFactory.build({
      title: 'Sheet Name',
      ...overrides,
    }),
} as const;

/**
 * Spreadsheet データファクトリー
 *
 * @example
 * ```typescript
 * // 基本的な使用
 * const data = SpreadsheetDataFactory.build();
 *
 * // Named Rangeを含む（Google Sheets API Schema準拠）
 * const data = SpreadsheetDataFactory.withNamedRanges([
 *   NamedRangeFactory.build({ name: 'RANGE_1' })
 * ]);
 * ```
 */
export const SpreadsheetDataFactory = {
  /**
   * シーケンス番号をリセット
   * @remarks テストの独立性を保証するため、beforeEach フックで呼び出すこと
   */
  resetSequenceNumber: () => spreadsheetDataFactory.resetSequenceNumber(),

  /**
   * Spreadsheet データインスタンスを生成
   *
   * @param overrides - 上書きする値（オプショナル）
   * @returns Google Sheets API Schema$Spreadsheet インスタンス
   */
  build: (overrides?: Partial<sheets_v4.Schema$Spreadsheet>) =>
    spreadsheetDataFactory.build(overrides),

  /**
   * Named Rangeを含むプリセット
   *
   * @param namedRanges - Google Sheets API Schema$NamedRange の配列
   * @param overrides - 上書きする値（オプショナル）
   * @returns Spreadsheet データインスタンス
   * @remarks Named Range は Google Sheets API の型に準拠している必要があります
   */
  withNamedRanges: (
    namedRanges: sheets_v4.Schema$NamedRange[],
    overrides?: Partial<sheets_v4.Schema$Spreadsheet>
  ) =>
    spreadsheetDataFactory.build({
      namedRanges,
      ...overrides,
    }),
} as const;

/**
 * Named Range ファクトリー
 *
 * @example
 * ```typescript
 * // 基本的な使用
 * const range = NamedRangeFactory.build();
 *
 * // カスタムNamed Range
 * const range = NamedRangeFactory.build({
 *   name: 'TODO_RANGE',
 * });
 * ```
 */
export const NamedRangeFactory = {
  /**
   * シーケンス番号をリセット
   */
  resetSequenceNumber: () => namedRangeFactory.resetSequenceNumber(),

  /**
   * Named Range インスタンスを生成
   *
   * @param overrides - 上書きする値（オプショナル）
   * @returns Named Range インスタンス
   */
  build: (overrides?: Partial<NamedRange>) =>
    namedRangeFactory.build(overrides),

  /**
   * 既存のNamed Rangeプリセット（更新テスト用）
   *
   * @example
   * ```typescript
   * const existing = NamedRangeFactory.existing();
   * ```
   */
  existing: (overrides?: Partial<NamedRange>) =>
    namedRangeFactory.build({
      namedRangeId: 'existing-id',
      name: 'TODO_RANGE',
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
  SetupNamedRangeArgsFactory.resetSequenceNumber();
  SheetPropertiesFactory.resetSequenceNumber();
  SpreadsheetDataFactory.resetSequenceNumber();
  NamedRangeFactory.resetSequenceNumber();
};
