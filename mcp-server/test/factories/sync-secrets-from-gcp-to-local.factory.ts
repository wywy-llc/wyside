import * as Factory from 'factory.ts';
import type { SyncSecretsFromGcpToLocalArgs } from '../../src/tools/sync-secrets-from-gcp-to-local.js';

// ===== Preset Definitions =====

/**
 * SyncSecretsFromGcpToLocalArgs プリセット定義カタログ（Single Source of Truth）
 */
const SYNC_SECRETS_PRESETS = {
  /** 基本的なセットアップ（force=false、本番IDなし） */
  basic: {
    projectId: 'test-project-123',
    spreadsheetIdDev: '1jvwUjvP8t9o8u6O42a-hvTe1HBXM7iXRqbsMhp0JH2g',
  },
  /** 本番環境ID付きセットアップ */
  withProd: {
    projectId: 'test-project-456',
    spreadsheetIdDev: '1jvwUjvP8t9o8u6O42a-hvTe1HBXM7iXRqbsMhp0JH2g',
    spreadsheetIdProd: '1abcdefg123456789-PROD-SPREADSHEET-ID',
  },
  /** force=true での強制更新 */
  forceUpdate: {
    projectId: 'test-project-789',
    spreadsheetIdDev: '1jvwUjvP8t9o8u6O42a-hvTe1HBXM7iXRqbsMhp0JH2g',
    force: true,
  },
  /** projectId未指定（gcloudデフォルト使用） */
  noProjectId: {
    spreadsheetIdDev: '1jvwUjvP8t9o8u6O42a-hvTe1HBXM7iXRqbsMhp0JH2g',
  },
  /** 空のspreadsheetIdDev（エラーテスト用） */
  emptySpreadsheetId: {
    projectId: 'test-project-error',
    spreadsheetIdDev: '',
  },
} as const;

// ============================================
// Factory Instances
// ============================================

/**
 * SyncSecretsFromGcpToLocalArgs ファクトリー（内部）
 * @internal
 */
const syncSecretsArgsFactory =
  Factory.Sync.makeFactory<SyncSecretsFromGcpToLocalArgs>({
    projectId: Factory.each(i => `test-project-${i}`),
    spreadsheetIdDev: '1jvwUjvP8t9o8u6O42a-hvTe1HBXM7iXRqbsMhp0JH2g',
    enableTranslation: true,
  });

/**
 * プリセット生成ヘルパー（DRY原則適用）
 * @internal
 */
const createPreset =
  (
    definition: (typeof SYNC_SECRETS_PRESETS)[keyof typeof SYNC_SECRETS_PRESETS]
  ) =>
  (overrides?: Partial<SyncSecretsFromGcpToLocalArgs>) =>
    syncSecretsArgsFactory.build({ ...definition, ...overrides });

// ============================================
// Exported Factory Objects
// ============================================

/**
 * SyncSecretsFromGcpToLocalArgs ファクトリー
 *
 * @example
 * ```typescript
 * // 基本的な使用
 * const args = SyncSecretsArgsFactory.build();
 *
 * // プリセットを使用
 * const args = SyncSecretsArgsFactory.forceUpdate();
 *
 * // 部分的にオーバーライド
 * const args = SyncSecretsArgsFactory.basic({ force: true });
 *
 * // テスト前にシーケンスをリセット
 * beforeEach(() => {
 *   SyncSecretsArgsFactory.resetSequenceNumber();
 * });
 * ```
 */
export const SyncSecretsArgsFactory = {
  /**
   * テストデータの独立性を保証するためにシーケンス番号をリセット
   *
   * @remarks
   * 各テストの beforeEach フック内で呼び出すことを推奨
   */
  resetSequenceNumber: () => syncSecretsArgsFactory.resetSequenceNumber(),

  /**
   * SyncSecretsFromGcpToLocalArgs インスタンスを生成
   *
   * @param overrides - 上書きする値（オプショナル）
   * @returns SyncSecretsFromGcpToLocalArgs インスタンス
   */
  build: (overrides?: Partial<SyncSecretsFromGcpToLocalArgs>) =>
    syncSecretsArgsFactory.build(overrides),

  /**
   * 基本的なセットアップ（force=false、本番IDなし）
   * @example const args = SyncSecretsArgsFactory.basic();
   */
  basic: createPreset(SYNC_SECRETS_PRESETS.basic),

  /**
   * 本番環境ID付きセットアップ
   * @example const args = SyncSecretsArgsFactory.withProd();
   */
  withProd: createPreset(SYNC_SECRETS_PRESETS.withProd),

  /**
   * force=true での強制更新
   * @example const args = SyncSecretsArgsFactory.forceUpdate();
   */
  forceUpdate: createPreset(SYNC_SECRETS_PRESETS.forceUpdate),

  /**
   * projectId未指定（gcloudデフォルト使用）
   * @example const args = SyncSecretsArgsFactory.noProjectId();
   */
  noProjectId: createPreset(SYNC_SECRETS_PRESETS.noProjectId),

  /**
   * 空のspreadsheetIdDev（エラーテスト用）
   * @example const args = SyncSecretsArgsFactory.emptySpreadsheetId();
   */
  emptySpreadsheetId: createPreset(SYNC_SECRETS_PRESETS.emptySpreadsheetId),
} as const;
