import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scaffoldFeature } from '../../src/tools/scaffold-feature.js';
import { ScaffoldFeatureArgsFactory } from '../factories/scaffold-feature.factory.js';

// モック設定
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
  },
}));

vi.mock('chalk', () => ({
  default: {
    bold: (text: string) => text,
    green: (text: string) => text,
  },
}));

describe('scaffoldFeature', () => {
  // モック関数への参照を取得
  let mockMkdir: ReturnType<typeof vi.fn>;
  let mockWriteFile: ReturnType<typeof vi.fn>;
  let mockReadFile: ReturnType<typeof vi.fn>;

  // テスト独立性の保証（シーケンス番号リセット + モッククリア）
  beforeEach(async () => {
    ScaffoldFeatureArgsFactory.resetSequenceNumber();
    vi.clearAllMocks();

    // モック関数への参照を取得
    const fs = await import('fs/promises');
    mockMkdir = fs.default.mkdir as ReturnType<typeof vi.fn>;
    mockWriteFile = fs.default.writeFile as ReturnType<typeof vi.fn>;
    mockReadFile = fs.default.readFile as ReturnType<typeof vi.fn>;

    // モック: ディレクトリ・ファイル操作を成功させる
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue('// Template content');
  });

  describe('正常系 - スキーマあり', () => {
    it('基本的なTask機能でファイル生成成功', async () => {
      // テストデータ: 基本的なTask機能（getAll, create）
      const args = ScaffoldFeatureArgsFactory.basicTask();

      // 実行
      const result = await scaffoldFeature(args);

      // 検証1: 成功メッセージが含まれること
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain(
        '✅ Feature Task scaffolded successfully'
      );

      // 検証2: 2つの操作が生成されること
      expect(result.content[0].text).toContain('📦 Generated 2 operations');

      // 検証3: ディレクトリが作成されること
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('src/features/task'),
        { recursive: true }
      );

      // 検証4: 2ファイル（Repo + UseCase）が生成されること
      expect(mockWriteFile).toHaveBeenCalledTimes(2);
      const calls = mockWriteFile.mock.calls;
      const filePaths = calls.map(call => call[0] as string);
      expect(filePaths.some(p => p.includes('UniversalTaskRepo.ts'))).toBe(
        true
      );
      expect(filePaths.some(p => p.includes('TaskUseCase.ts'))).toBe(true);
    });

    it('MedicalSheetでシート名なし範囲をサポート', async () => {
      // テストデータ: 複数列のMedicalSheet（A3:R形式）
      const args = ScaffoldFeatureArgsFactory.medicalSheet();

      // 実行
      const result = await scaffoldFeature(args);

      // 検証1: 成功すること
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain(
        '✅ Feature MedicalSheet scaffolded successfully'
      );

      // 検証2: batchUpdate, getAll 操作が生成されること
      expect(result.content[0].text).toContain('📦 Generated 2 operations');

      // 検証3: 生成されたファイル名が正しいこと
      const writeFileCalls = mockWriteFile.mock.calls;
      const filePaths = writeFileCalls.map(call => call[0] as string);
      expect(
        filePaths.some(p => p.includes('UniversalMedicalSheetRepo.ts'))
      ).toBe(true);
      expect(filePaths.some(p => p.includes('MedicalSheetUseCase.ts'))).toBe(
        true
      );
    });

    it('rangeWithoutSheetでシート名なし範囲（A2:C）をサポート', async () => {
      // テストデータ: シート名なしの範囲フォーマット
      const args = ScaffoldFeatureArgsFactory.rangeWithoutSheet();

      // 実行
      const result = await scaffoldFeature(args);

      // 検証: 正常に処理されること
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain(
        '✅ Feature Data scaffolded successfully'
      );
    });

    it('all操作指定で全16操作が生成される', async () => {
      // テストデータ: 全操作を生成
      const args = ScaffoldFeatureArgsFactory.allOperations();

      // 実行
      const result = await scaffoldFeature(args);

      // 検証: 全操作が生成されること
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toMatch(/Generated \d+ operations/);
      expect(result.content[0].text).toContain(
        'Using all available operations'
      );
    });
  });

  describe('正常系 - スキーマなし', () => {
    it('スキーマなしでTODOコメント付きファイル生成', async () => {
      // テストデータ: スキーマなし（操作のみ）
      const args = ScaffoldFeatureArgsFactory.noSchema();

      // 実行
      const result = await scaffoldFeature(args);

      // 検証1: 成功すること
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain(
        '✅ Feature Custom scaffolded successfully'
      );

      // 検証2: ファイルが生成されること
      expect(mockWriteFile).toHaveBeenCalledTimes(2);
      const filePaths = mockWriteFile.mock.calls.map(call => call[0] as string);
      expect(filePaths.some(p => p.includes('UniversalCustomRepo.ts'))).toBe(
        true
      );
      expect(filePaths.some(p => p.includes('CustomUseCase.ts'))).toBe(true);
    });
  });

  describe('異常系', () => {
    it('featureName未指定でエラー', async () => {
      // テストデータ: featureNameなし
      const args = ScaffoldFeatureArgsFactory.build({ featureName: '' });

      // 実行
      const result = await scaffoldFeature(args);

      // 検証: エラーが返されること
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Error: featureName is required'
      );
    });

    it('ディレクトリ作成失敗でエラー', async () => {
      // テストデータ: 正常なデータ
      const args = ScaffoldFeatureArgsFactory.basicTask();

      // モック: ディレクトリ作成が失敗
      mockMkdir.mockRejectedValue(new Error('Permission denied'));

      // 実行
      const result = await scaffoldFeature(args);

      // 検証: エラーが返されること
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Permission denied');
    });

    it('ファイル書き込み失敗でエラー', async () => {
      // テストデータ: 正常なデータ
      const args = ScaffoldFeatureArgsFactory.basicTask();

      // モック: ファイル書き込みが失敗
      mockWriteFile.mockRejectedValue(new Error('Disk full'));

      // 実行
      const result = await scaffoldFeature(args);

      // 検証: エラーが返されること
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Disk full');
    });
  });

  describe('エッジケース', () => {
    it('最小限の設定で動作', async () => {
      // テストデータ: 最小限の設定
      const args = ScaffoldFeatureArgsFactory.minimal();

      // 実行
      const result = await scaffoldFeature(args);

      // 検証: 成功すること
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain(
        '✅ Feature Simple scaffolded successfully'
      );
    });

    it('operations未指定で全操作が生成される', async () => {
      // テストデータ: operations未指定
      const args = ScaffoldFeatureArgsFactory.build({
        featureName: 'Test',
        operations: undefined,
        schema: ScaffoldFeatureArgsFactory.basicTask().schema,
      });

      // 実行
      const result = await scaffoldFeature(args);

      // 検証: 全操作が生成されること
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain(
        'Using all available operations'
      );
    });

    it('operations空配列で全操作が生成される', async () => {
      // テストデータ: operations空配列
      const args = ScaffoldFeatureArgsFactory.build({
        featureName: 'Test',
        operations: [],
        schema: ScaffoldFeatureArgsFactory.basicTask().schema,
      });

      // 実行
      const result = await scaffoldFeature(args);

      // 検証: 全操作が生成されること
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain(
        'Using all available operations'
      );
    });
  });
});
