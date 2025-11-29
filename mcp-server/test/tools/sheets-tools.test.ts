import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NamedRangeFactory,
  resetAllFactories,
  SetupNamedRangeArgsFactory,
  SheetPropertiesFactory,
  SpreadsheetDataFactory,
} from '../factories/sheets-tools.factory.js';

// Google APIs のモック
const mockBatchUpdate = vi.fn();
const mockSpreadsheetsGet = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    sheets: vi.fn().mockReturnValue({
      spreadsheets: {
        get: mockSpreadsheetsGet,
        batchUpdate: mockBatchUpdate,
      },
    }),
  },
}));

vi.mock('google-auth-library', () => ({
  GoogleAuth: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

// fs/promises のモック
const mockFsAccess = vi.fn().mockRejectedValue(new Error('File not found'));
const mockFsReadFile = vi.fn();
const mockFsWriteFile = vi.fn();

vi.mock('fs/promises', () => ({
  default: {
    access: mockFsAccess,
    readFile: mockFsReadFile,
    writeFile: mockFsWriteFile,
  },
}));

// テスト対象のモジュールをインポート（モックの後）
const { setupNamedRange } = await import('../../src/tools/sheets-tools.js');

describe('sheets-tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setupNamedRange', () => {
    beforeEach(() => {
      // 全ファクトリーをリセット（test/factories/CLAUDE.md §必須実装）
      resetAllFactories();

      // デフォルトのモックレスポンスを設定
      mockSpreadsheetsGet.mockResolvedValue({
        data: SpreadsheetDataFactory.build(),
      });
      mockBatchUpdate.mockResolvedValue({});
    });

    it('新規Named Range設定時、正常に作成される', async () => {
      // テストデータ: TODO_RANGE（ヘッダー行 A1:E1）の設定引数
      const args = SetupNamedRangeArgsFactory.todoRange();

      // 実行
      const result = await setupNamedRange(args);

      // 検証: API呼び出しと結果の妥当性
      // (1) spreadsheetsGet API が1回のみ呼ばれる（パフォーマンス最適化）
      expect(mockSpreadsheetsGet).toHaveBeenCalledTimes(1);
      expect(mockSpreadsheetsGet).toHaveBeenCalledWith({
        spreadsheetId: args.spreadsheetId,
      });

      // (2) batchUpdate API が正しいGridRangeパラメータで呼ばれる
      expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
      expect(mockBatchUpdate).toHaveBeenCalledWith({
        spreadsheetId: args.spreadsheetId,
        requestBody: {
          requests: [
            {
              addNamedRange: {
                namedRange: {
                  name: 'TODO_RANGE',
                  range: {
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 1, // ヘッダー行のみ
                    startColumnIndex: 0, // A = 0
                    endColumnIndex: 5, // E の次
                  },
                },
              },
            },
          ],
        },
      });

      // (3) 成功結果が返される
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Named Range setup complete');
    });

    it('既存Named Range存在時、削除後に再作成される', async () => {
      // テストデータ: 既存のTODO_RANGEを持つスプレッドシート
      const existingRange = NamedRangeFactory.existing();

      // モック: 既存Named Rangeを含むデータを返す（更新操作のシミュレーション）
      mockSpreadsheetsGet.mockResolvedValue({
        data: SpreadsheetDataFactory.withNamedRanges([existingRange]),
      });

      const args = SetupNamedRangeArgsFactory.todoRange();

      // 実行
      const result = await setupNamedRange(args);

      // 検証: 削除→追加の順で実行される
      // (1) batchUpdate に削除と追加の2つのリクエストが含まれる
      expect(mockBatchUpdate).toHaveBeenCalledWith({
        spreadsheetId: args.spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteNamedRange: { namedRangeId: 'existing-id' },
            },
            {
              addNamedRange: {
                namedRange: {
                  name: 'TODO_RANGE',
                  range: expect.any(Object),
                },
              },
            },
          ],
        },
      });

      // (2) 成功結果が返される
      expect(result.isError).toBeUndefined();
    });

    it("シート名がシングルクォート付き（'Sheet Name'!A1:B2）で、正しくパースされる", async () => {
      // テストデータ: シングルクォート付きシート名の範囲指定
      const args = SetupNamedRangeArgsFactory.withQuotedSheetName();

      // モック: 空白を含むシート名のスプレッドシート
      mockSpreadsheetsGet.mockResolvedValue({
        data: SpreadsheetDataFactory.build({
          sheets: [
            {
              properties: SheetPropertiesFactory.withSpacedName({
                sheetId: 1,
              }),
            },
          ],
        }),
      });

      // 実行
      const result = await setupNamedRange(args);

      // 検証: シングルクォートが削除され、正しいsheetIdにマッピングされる
      // (1) batchUpdate に正しいGridRangeが含まれる（シート名から sheetId への変換成功）
      expect(mockBatchUpdate).toHaveBeenCalledWith({
        spreadsheetId: args.spreadsheetId,
        requestBody: {
          requests: [
            {
              addNamedRange: {
                namedRange: {
                  name: 'TEST_RANGE',
                  range: {
                    sheetId: 1,
                    startRowIndex: 0, // A1 = row 0
                    endRowIndex: 2, // B2 = row 1 (exclusive end = 2)
                    startColumnIndex: 0, // A = 0
                    endColumnIndex: 2, // B = 1 (exclusive end = 2)
                  },
                },
              },
            },
          ],
        },
      });

      // (2) 成功結果が返される
      expect(result.isError).toBeUndefined();
    });

    it('シェルエスケープされた感嘆符（\\!）で、正規化される', async () => {
      // テストデータ: シェルエスケープされた範囲指定（Todos\\!A1:B2）
      const args = SetupNamedRangeArgsFactory.withEscapedChars();

      // 実行
      const result = await setupNamedRange(args);

      // 検証: \\! が ! に正規化される
      // (1) batchUpdate が正しく呼ばれる（エスケープ文字が除去される）
      expect(mockBatchUpdate).toHaveBeenCalledWith({
        spreadsheetId: args.spreadsheetId,
        requestBody: {
          requests: [
            {
              addNamedRange: {
                namedRange: {
                  name: 'TEST_RANGE',
                  range: expect.any(Object),
                },
              },
            },
          ],
        },
      });

      // (2) 成功結果が返される
      expect(result.isError).toBeUndefined();
    });

    it('ヘッダー行範囲（A1:C1）で、endRowIndexが1となる', async () => {
      // テストデータ: ヘッダー行の範囲指定（Todos!A1:C1）
      const args = SetupNamedRangeArgsFactory.headerRange();

      // 実行
      const result = await setupNamedRange(args);

      // 検証: ヘッダー行を表すGridRangeが生成される
      // (1) batchUpdate に endRowIndex=1 が含まれる（1行分）
      expect(mockBatchUpdate).toHaveBeenCalledWith({
        spreadsheetId: args.spreadsheetId,
        requestBody: {
          requests: [
            {
              addNamedRange: {
                namedRange: {
                  name: 'COLUMN_RANGE',
                  range: {
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 1,
                    startColumnIndex: 0,
                    endColumnIndex: 3,
                  },
                },
              },
            },
          ],
        },
      });

      // (2) 成功結果が返される
      expect(result.isError).toBeUndefined();
    });

    it('行全体指定（1:5）で、endColumnIndexがundefinedとなる', async () => {
      // テストデータ: 行全体の範囲指定（Todos!1:5）
      const args = SetupNamedRangeArgsFactory.rowRange();

      // 実行
      const result = await setupNamedRange(args);

      // 検証: 行全体を表すGridRangeが生成される
      // (1) batchUpdate に endColumnIndex=undefined が含まれる（列全体を意味）
      expect(mockBatchUpdate).toHaveBeenCalledWith({
        spreadsheetId: args.spreadsheetId,
        requestBody: {
          requests: [
            {
              addNamedRange: {
                namedRange: {
                  name: 'ROW_RANGE',
                  range: {
                    sheetId: 0,
                    startRowIndex: 0, // 1行目 = 0
                    endRowIndex: 5, // 5行目 = 4 (exclusive end = 5)
                    startColumnIndex: 0,
                    endColumnIndex: undefined, // 列全体
                  },
                },
              },
            },
          ],
        },
      });

      // (2) 成功結果が返される
      expect(result.isError).toBeUndefined();
    });

    it('spreadsheetIdが空文字で、"required"エラーが返される', async () => {
      // テストデータ: 空のspreadsheetId（バリデーションエラーケース）
      const args = SetupNamedRangeArgsFactory.emptySpreadsheetId();

      // 実行
      const result = await setupNamedRange(args);

      // 検証: バリデーションエラーが返される
      // (1) isError が true である
      expect(result.isError).toBe(true);
      // (2) エラーメッセージに "required" が含まれる
      expect(result.content[0].text).toContain('required');
    });

    it('範囲形式が無効（!なし）で、"must be in format"エラーが返される', async () => {
      // テストデータ: 無効な範囲形式（"InvalidFormat" - "!"がない）
      const args = SetupNamedRangeArgsFactory.invalidRange();

      // 実行
      const result = await setupNamedRange(args);

      // 検証: フォーマットエラーが返される
      // (1) isError が true である
      expect(result.isError).toBe(true);
      // (2) エラーメッセージに "must be in format" が含まれる
      expect(result.content[0].text).toContain('must be in format');
    });

    it('存在しないシート名で、"not found"エラーが返される', async () => {
      // テストデータ: 存在しないシート名（NonExistentSheet）
      const args = SetupNamedRangeArgsFactory.build({
        headerRange: 'NonExistentSheet!A1:B2',
      });

      // モック: 異なるシート名（DifferentSheet）のスプレッドシート
      mockSpreadsheetsGet.mockResolvedValue({
        data: SpreadsheetDataFactory.build({
          sheets: [
            {
              properties: SheetPropertiesFactory.build({
                sheetId: 0,
                title: 'DifferentSheet',
              }),
            },
          ],
        }),
      });

      // 実行
      const result = await setupNamedRange(args);

      // 検証: シート未検出エラーが返される
      // (1) isError が true である
      expect(result.isError).toBe(true);
      // (2) エラーメッセージに "not found" が含まれる
      expect(result.content[0].text).toContain('not found');
    });

    it('複数Named Range操作時でもAPI呼び出しは1回のみ', async () => {
      // テストデータ: 新規TODO_RANGEの設定引数
      const args = SetupNamedRangeArgsFactory.todoRange();

      // モック: 既存の異なるNamed Range（OLD_RANGE）を持つデータ
      const oldRange = NamedRangeFactory.build({
        namedRangeId: 'existing-id',
        name: 'OLD_RANGE',
      });
      mockSpreadsheetsGet.mockResolvedValue({
        data: SpreadsheetDataFactory.withNamedRanges([oldRange]),
      });

      // 実行
      await setupNamedRange(args);

      // 検証: パフォーマンス最適化が機能している
      // (1) spreadsheetsGet API が1回のみ呼ばれる（getSheetIdとfindExistingNamedRangeが同じデータを再利用）
      expect(mockSpreadsheetsGet).toHaveBeenCalledTimes(1);
      expect(mockSpreadsheetsGet).toHaveBeenCalledWith({
        spreadsheetId: args.spreadsheetId,
      });
    });
  });
});
