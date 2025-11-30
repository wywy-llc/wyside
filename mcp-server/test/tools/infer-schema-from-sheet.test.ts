import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inferSchemaFromSheet } from '../../src/tools/infer-schema-from-sheet.js';
import { TranslateListResponseFactory } from '../factories/googleapis.factory.js';

const mockGetMeta = vi.fn();
const mockBatchGet = vi.fn();
const mockValuesGet = vi.fn();
const mockTranslateList = vi.fn();

vi.mock('google-auth-library', () => {
  // コンストラクタとして new GoogleAuth() を許容するモック
  function GoogleAuthMock(this: unknown) {
    return { getClient: vi.fn() };
  }
  return { GoogleAuth: vi.fn(GoogleAuthMock) };
});

vi.mock('googleapis', () => {
  const sheetsMock = vi.fn(() => ({
    spreadsheets: {
      get: mockGetMeta,
      values: {
        batchGetByDataFilter: mockBatchGet,
        get: mockValuesGet,
      },
    },
  }));
  const translateMock = vi.fn(() => ({
    translations: {
      list: mockTranslateList,
    },
  }));
  return {
    google: {
      sheets: sheetsMock,
      translate: translateMock,
    },
  };
});

// テストデータ定数
const TEST_SPREADSHEET_ID = 'test-spreadsheet-id';
const TEST_SHEET_NAME = 'Sheet1';
const TEST_HEADERS_JA = ['ID', '名前'];
const TEST_HEADERS_JA_EXTENDED = ['ID', '名前', '数値'];
const TEST_TRANSLATIONS = ['ID', 'Name'];
const TEST_TRANSLATIONS_EXTENDED = ['ID', 'Name', 'Number'];
const TEST_SHEET_NAME_SPECIAL = '【東美】メール';
const EXPECTED_HEADER_RANGE_SPECIAL = `'${TEST_SHEET_NAME_SPECIAL}'!A1:B1`;
const EXPECTED_DATA_RANGE_SPECIAL = `'${TEST_SHEET_NAME_SPECIAL}'!A2:B`;

// Expected値定数
const EXPECTED_HEADER_RANGE_2_COLS = `${TEST_SHEET_NAME}!A1:B1`;
const EXPECTED_DATA_RANGE_2_COLS = `${TEST_SHEET_NAME}!A2:B`;
const EXPECTED_HEADER_RANGE_3_COLS = `${TEST_SHEET_NAME}!A1:C1`;
const EXPECTED_DATA_RANGE_3_COLS = `${TEST_SHEET_NAME}!A2:C`;

/**
 * モックセットアップヘルパー: Sheets API と Translate API の正常応答を設定
 *
 * @param sheetValues - Sheets API が返す2次元配列
 * @param translations - Translate API が返す翻訳結果
 */
const setupSuccessfulMocks = (
  sheetValues: string[][],
  translations: string[],
  sheetName: string = TEST_SHEET_NAME,
  sheetId: number = 0
) => {
  mockGetMeta.mockResolvedValueOnce({
    data: {
      sheets: [
        {
          properties: {
            title: sheetName,
            sheetId,
          },
        },
      ],
    },
  });
  mockBatchGet.mockResolvedValueOnce({
    data: {
      valueRanges: [
        {
          valueRange: {
            range: `${sheetName}!A1:${String.fromCharCode(64 + sheetValues[0].length)}${sheetValues.length}`,
            values: sheetValues,
          },
        },
      ],
    },
  });
  mockValuesGet.mockResolvedValueOnce({
    data: {
      values: sheetValues,
    },
  });
  mockTranslateList.mockResolvedValueOnce(
    TranslateListResponseFactory.withTranslations(translations)
  );
};

describe('inferSchemaFromSheet', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    TranslateListResponseFactory.resetSequenceNumber();
    mockGetMeta.mockImplementation(() =>
      Promise.resolve({
        data: {
          sheets: [
            { properties: { title: TEST_SHEET_NAME, sheetId: 0 } },
            { properties: { title: TEST_SHEET_NAME_SPECIAL, sheetId: 1 } },
          ],
        },
      })
    );
    mockBatchGet.mockImplementation(() =>
      Promise.resolve({
        data: {
          valueRanges: [
            {
              valueRange: {
                range: `${TEST_SHEET_NAME}!A1:A1`,
                values: [],
              },
            },
          ],
        },
      })
    );
    mockValuesGet.mockImplementation(() =>
      Promise.resolve({
        data: { values: [] },
      })
    );
  });

  describe('正常系', () => {
    it('2列のヘッダーを持つシートからFeatureSchemaを推論できる', async () => {
      // モック: 日本語ヘッダー（ID, 名前）→ 英語翻訳（ID, Name）
      setupSuccessfulMocks([TEST_HEADERS_JA, ['1', 'foo']], TEST_TRANSLATIONS);

      const result = await inferSchemaFromSheet({
        spreadsheetId: TEST_SPREADSHEET_ID,
        sheetName: TEST_SHEET_NAME,
        headers: TEST_HEADERS_JA,
        headerStartCell: 'A1',
        lang: 'ja',
      });

      // 検証1: エラーなし
      expect(result.isError).toBeUndefined();

      // 検証2: レスポンス構造
      const payload = JSON.parse(result.content[0].text);
      expect(payload.sheetName).toBe(TEST_SHEET_NAME);
      expect(payload.headerRange).toBe(EXPECTED_HEADER_RANGE_2_COLS);
      expect(payload.dataRange).toBe(EXPECTED_DATA_RANGE_2_COLS);
      expect(payload.spreadsheetId).toBe(TEST_SPREADSHEET_ID);

      // 検証3: フィールド定義（2列: A, B）
      expect(payload.fields).toHaveLength(2);
      expect(payload.fields[0]).toMatchObject({
        name: 'id',
        column: 'A',
      });
      expect(payload.fields[1]).toMatchObject({
        name: 'name',
        column: 'B',
      });
    });

    it('3列以上のヘッダーを持つシートからFeatureSchemaを推論できる', async () => {
      // モック: 日本語ヘッダー（ID, 名前, 数値）→ 英語翻訳（ID, Name, Number）
      setupSuccessfulMocks(
        [TEST_HEADERS_JA_EXTENDED, ['1', 'foo', '123']],
        TEST_TRANSLATIONS_EXTENDED
      );

      const result = await inferSchemaFromSheet({
        spreadsheetId: TEST_SPREADSHEET_ID,
        sheetName: TEST_SHEET_NAME,
        headers: TEST_HEADERS_JA_EXTENDED,
        headerStartCell: 'A1',
        lang: 'ja',
      });

      // 検証1: エラーなし
      expect(result.isError).toBeUndefined();

      // 検証2: レスポンス構造
      const payload = JSON.parse(result.content[0].text);
      expect(payload.headerRange).toBe(EXPECTED_HEADER_RANGE_3_COLS);
      expect(payload.dataRange).toBe(EXPECTED_DATA_RANGE_3_COLS);

      // 検証3: フィールド定義（3列: A, B, C）
      expect(payload.fields).toHaveLength(3);
      expect(payload.fields[2]).toMatchObject({
        name: 'number',
        column: 'C',
      });
    });

    it('langパラメータなしの場合、翻訳せずに英語ヘッダーをそのまま使用できる', async () => {
      // モック: 英語ヘッダー（翻訳不要）
      const englishHeaders = ['ID', 'Name'];
      mockGetMeta.mockResolvedValueOnce({
        data: {
          sheets: [
            {
              properties: { title: TEST_SHEET_NAME, sheetId: 0 },
            },
          ],
        },
      });
      mockBatchGet.mockResolvedValueOnce({
        data: {
          valueRanges: [
            {
              valueRange: {
                range: `${TEST_SHEET_NAME}!A1:B2`,
                values: [englishHeaders, ['1', 'foo']],
              },
            },
          ],
        },
      });
      mockValuesGet.mockResolvedValueOnce({
        data: {
          values: [englishHeaders, ['1', 'foo']],
        },
      });

      const result = await inferSchemaFromSheet({
        spreadsheetId: TEST_SPREADSHEET_ID,
        sheetName: TEST_SHEET_NAME,
        headers: englishHeaders,
        headerStartCell: 'A1',
        // lang: undefined → 翻訳スキップ
      });

      if (result.isError) {
        throw new Error(result.content?.[0]?.text ?? 'unexpected error');
      }

      // 検証1: エラーなし
      expect(result.isError).toBeUndefined();

      // 検証2: 翻訳APIが呼ばれていない
      expect(mockTranslateList).not.toHaveBeenCalled();

      // 検証3: フィールド名が小文字化されている
      const payload = JSON.parse(result.content[0].text);
      expect(payload.fields[0].name).toBe('id');
      expect(payload.fields[1].name).toBe('name');
    });

    it('シート名に特殊文字が含まれても正しくRangeを組み立てる', async () => {
      setupSuccessfulMocks(
        [TEST_HEADERS_JA, ['1', 'foo']],
        TEST_TRANSLATIONS,
        TEST_SHEET_NAME_SPECIAL,
        1
      );

      const result = await inferSchemaFromSheet({
        spreadsheetId: TEST_SPREADSHEET_ID,
        sheetName: TEST_SHEET_NAME_SPECIAL,
        headers: TEST_HEADERS_JA,
        headerStartCell: 'A1',
        lang: 'ja',
      });

      expect(result.isError).toBeUndefined();
      const payload = JSON.parse(result.content[0].text);
      expect(payload.sheetName).toBe(TEST_SHEET_NAME_SPECIAL);
      expect(payload.headerRange).toBe(EXPECTED_HEADER_RANGE_SPECIAL);
      expect(payload.dataRange).toBe(EXPECTED_DATA_RANGE_SPECIAL);
    });
  });

  describe('異常系', () => {
    it('指定したヘッダーが見つからない場合、エラーを返す', async () => {
      // テストデータ: 異なるヘッダー（X, Y）
      mockGetMeta.mockResolvedValueOnce({
        data: {
          sheets: [
            {
              properties: { title: TEST_SHEET_NAME, sheetId: 0 },
            },
          ],
        },
      });
      mockBatchGet.mockResolvedValueOnce({
        data: {
          valueRanges: [
            {
              valueRange: {
                range: `${TEST_SHEET_NAME}!A1:B1`,
                values: [['X', 'Y']],
              },
            },
          ],
        },
      });
      mockValuesGet.mockResolvedValueOnce({
        data: { values: [['X', 'Y']] },
      });

      const result = await inferSchemaFromSheet({
        spreadsheetId: TEST_SPREADSHEET_ID,
        sheetName: TEST_SHEET_NAME,
        headers: TEST_HEADERS_JA,
        headerStartCell: 'A1',
      });

      if (!result.isError) {
        throw new Error(
          `expected error but got success: ${JSON.stringify(result.content)}`
        );
      }

      // 検証1: エラーフラグ
      expect(result.isError).toBe(true);

      // 検証2: エラーメッセージ（実装の文言に合わせる）
      expect(result.content[0].text).toContain(
        'header row not found in the provided sheet/headers'
      );
    });

    it('空のシートデータの場合、エラーを返す', async () => {
      // テストデータ: 空の values
      mockGetMeta.mockResolvedValueOnce({
        data: {
          sheets: [
            {
              properties: { title: TEST_SHEET_NAME, sheetId: 0 },
            },
          ],
        },
      });
      mockBatchGet.mockResolvedValueOnce({
        data: {
          valueRanges: [
            {
              valueRange: {
                range: `${TEST_SHEET_NAME}!A1:A1`,
                values: [],
              },
            },
          ],
        },
      });
      mockValuesGet.mockResolvedValueOnce({
        data: { values: [] },
      });

      const result = await inferSchemaFromSheet({
        spreadsheetId: TEST_SPREADSHEET_ID,
        sheetName: TEST_SHEET_NAME,
        headers: TEST_HEADERS_JA,
        headerStartCell: 'A1',
      });

      // 検証: エラーレスポンス
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'header row not found in the provided sheet/headers'
      );
    });
  });
});
