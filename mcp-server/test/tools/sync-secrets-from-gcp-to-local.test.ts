import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncSecretsArgsFactory } from '../factories/sync-secrets-from-gcp-to-local.factory.js';

// execa のモック
const mockExeca = vi.fn();
vi.mock('execa', () => ({
  execa: mockExeca,
}));

// fs/promises のモック
const mockFsAccess = vi.fn();
const mockFsReadFile = vi.fn();
const mockFsWriteFile = vi.fn();
const mockFsMkdir = vi.fn();
const mockFsRm = vi.fn();

vi.mock('fs/promises', () => ({
  default: {
    access: mockFsAccess,
    readFile: mockFsReadFile,
    writeFile: mockFsWriteFile,
    mkdir: mockFsMkdir,
    rm: mockFsRm,
  },
}));

// chalk のモック
vi.mock('chalk', () => ({
  default: {
    bold: (str: string) => str,
    green: (str: string) => str,
    yellow: (str: string) => str,
    red: (str: string) => str,
  },
}));

// テスト対象のモジュールをインポート（モックの後）
const { syncSecretsFromGcpToLocal } =
  await import('../../src/tools/sync-secrets-from-gcp-to-local.js');

describe('sync-secrets-from-gcp-to-local', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    SyncSecretsArgsFactory.resetSequenceNumber();
  });

  describe('syncSecretsFromGcpToLocal', () => {
    beforeEach(() => {
      // デフォルトのモック設定: 成功シナリオ

      // gcloud コマンドのモック
      mockExeca.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === 'gcloud' && args[0] === 'version') {
          return Promise.resolve({ stdout: 'Google Cloud SDK 400.0.0' });
        }
        if (cmd === 'gcloud' && args[0] === 'config') {
          return Promise.resolve({ stdout: 'test-project-default' });
        }
        if (cmd === 'gcloud' && args[0] === 'services') {
          return Promise.resolve({});
        }
        if (cmd === 'gcloud' && args[0] === 'iam') {
          if (args[1] === 'service-accounts' && args[2] === 'describe') {
            return Promise.resolve({
              stdout: 'email: wyside@test-project.iam.gserviceaccount.com',
            });
          }
          if (
            args[1] === 'service-accounts' &&
            args[2] === 'keys' &&
            args[3] === 'create'
          ) {
            return Promise.resolve({});
          }
        }
        return Promise.resolve({});
      });

      // fs操作のモック: デフォルトでキーファイルが存在しない
      mockFsAccess.mockRejectedValue(new Error('File not found'));
      mockFsMkdir.mockResolvedValue(undefined);
      mockFsRm.mockResolvedValue(undefined);

      // .envファイル操作のモック
      mockFsReadFile.mockResolvedValue('');
      mockFsWriteFile.mockResolvedValue(undefined);
    });

    describe('force フラグなし（既存動作）', () => {
      it('キーファイル不存在時、新規作成される', async () => {
        // テストデータ: 基本的なセットアップ引数（force=false）
        const args = SyncSecretsArgsFactory.basic();

        // モック: キーファイルが存在しない
        mockFsAccess.mockRejectedValue(new Error('File not found'));

        // 実行
        const result = await syncSecretsFromGcpToLocal(args);

        // 検証:
        // (1) 新規キー作成コマンドが実行された
        expect(mockExeca).toHaveBeenCalledWith(
          'gcloud',
          expect.arrayContaining([
            'iam',
            'service-accounts',
            'keys',
            'create',
            expect.stringContaining('service-account.json'),
          ])
        );

        // (2) 成功メッセージを返す
        expect(result.content[0].text).toContain(
          'Local secrets setup complete'
        );
        expect(result.isError).toBeUndefined();
      });

      it('キーファイル存在時、スキップメッセージが表示される', async () => {
        // テストデータ: 基本的なセットアップ引数（force=false）
        const args = SyncSecretsArgsFactory.basic();

        // モック: キーファイルが既に存在
        mockFsAccess.mockResolvedValue(undefined);

        // 実行
        const result = await syncSecretsFromGcpToLocal(args);

        // 検証:
        // (1) キー作成コマンドは呼ばれない
        const keyCreateCalls = mockExeca.mock.calls.filter(
          call =>
            call[0] === 'gcloud' &&
            call[1]?.includes('keys') &&
            call[1]?.includes('create')
        );
        expect(keyCreateCalls).toHaveLength(0);

        // (2) スキップメッセージが含まれる
        expect(result.content[0].text).toContain('Key file already exists');
        expect(result.content[0].text).toContain('Use force=true to update');

        // (3) 成功として完了
        expect(result.content[0].text).toContain(
          'Local secrets setup complete'
        );
      });
    });

    describe('force=true（強制更新）', () => {
      it('キーファイル存在時、削除後に新規作成される', async () => {
        // テストデータ: force=true の強制更新引数
        const args = SyncSecretsArgsFactory.forceUpdate();

        // モック: キーファイルが既に存在
        mockFsAccess.mockResolvedValue(undefined);

        // 実行
        const result = await syncSecretsFromGcpToLocal(args);

        // 検証:
        // (1) 古いキーが削除された
        expect(mockFsRm).toHaveBeenCalledWith(
          expect.stringContaining('service-account.json'),
          { force: true }
        );

        // (2) 削除成功メッセージが含まれる
        expect(result.content[0].text).toContain(
          'Force update: Removing old key'
        );
        expect(result.content[0].text).toContain(
          'Old key deleted successfully'
        );

        // (3) 新規キーが作成された
        expect(mockExeca).toHaveBeenCalledWith(
          'gcloud',
          expect.arrayContaining([
            'iam',
            'service-accounts',
            'keys',
            'create',
            expect.stringContaining('service-account.json'),
          ])
        );

        // (4) 新規作成成功メッセージが含まれる
        expect(result.content[0].text).toContain('Creating key file');
        expect(result.content[0].text).toContain(
          'New key created successfully'
        );
      });

      it('キーファイル不存在時、通常通り新規作成される', async () => {
        // テストデータ: force=true だが既存キーなし
        const args = SyncSecretsArgsFactory.forceUpdate();

        // モック: キーファイルが存在しない
        mockFsAccess.mockRejectedValue(new Error('File not found'));

        // 実行
        const result = await syncSecretsFromGcpToLocal(args);

        // 検証:
        // (1) 削除は試みられない
        expect(mockFsRm).not.toHaveBeenCalled();

        // (2) 新規キー作成が実行される
        expect(mockExeca).toHaveBeenCalledWith(
          'gcloud',
          expect.arrayContaining(['iam', 'service-accounts', 'keys', 'create'])
        );

        // (3) 成功メッセージを返す
        expect(result.content[0].text).toContain(
          'New key created successfully'
        );
      });

      it('削除失敗時、警告を表示して新規作成を続行', async () => {
        // テストデータ: force=true の強制更新引数
        const args = SyncSecretsArgsFactory.forceUpdate();

        // モック:
        // - キーファイルが既に存在
        mockFsAccess.mockResolvedValue(undefined);
        // - 削除は失敗（権限エラー）
        mockFsRm.mockRejectedValue(new Error('EACCES: permission denied'));

        // 実行
        const result = await syncSecretsFromGcpToLocal(args);

        // 検証:
        // (1) 削除が試みられた
        expect(mockFsRm).toHaveBeenCalled();

        // (2) 警告メッセージが含まれる
        expect(result.content[0].text).toContain(
          'Warning: Failed to delete old key'
        );
        expect(result.content[0].text).toContain('permission denied');
        expect(result.content[0].text).toContain(
          'Continuing with new key creation'
        );

        // (3) 新規キー作成は続行される
        expect(mockExeca).toHaveBeenCalledWith(
          'gcloud',
          expect.arrayContaining(['keys', 'create'])
        );

        // (4) 成功として完了
        expect(result.content[0].text).toContain(
          'Local secrets setup complete'
        );
        expect(result.isError).toBeUndefined();
      });
    });

    describe('本番環境ID指定', () => {
      it('本番環境IDが.envファイルに追加される', async () => {
        // テストデータ: 本番環境ID付きセットアップ
        const args = SyncSecretsArgsFactory.withProd();

        // モック: キーファイルが存在しない
        mockFsAccess.mockRejectedValue(new Error('File not found'));

        // 実行
        const result = await syncSecretsFromGcpToLocal(args);

        // 検証:
        // (1) .envファイルが書き込まれた
        expect(mockFsWriteFile).toHaveBeenCalled();

        // (2) 本番環境IDが含まれる
        const writeCall = mockFsWriteFile.mock.calls.find(call =>
          call[0].endsWith('.env')
        );
        expect(writeCall).toBeDefined();
        expect(writeCall?.[1]).toContain('APP_SPREADSHEET_ID_1_PROD');
        expect(writeCall?.[1]).toContain(args.spreadsheetIdProd);
      });
    });

    describe('エラーハンドリング', () => {
      it('gcloudコマンドエラー時、エラー情報を返す', async () => {
        // テストデータ: 基本的なセットアップ引数
        const args = SyncSecretsArgsFactory.basic();

        // モック: gcloudコマンドがエラー
        mockExeca.mockRejectedValue(new Error('gcloud command not found'));

        // 実行
        const result = await syncSecretsFromGcpToLocal(args);

        // 検証:
        // (1) isError フラグが設定される
        expect(result.isError).toBe(true);

        // (2) エラーメッセージが含まれる
        expect(result.content[0].text).toContain('Error:');
        expect(result.content[0].text).toContain('gcloud CLI');
      });
    });
  });
});
