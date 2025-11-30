import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateDataRange,
  generateHeaderRange,
  generateRowToObject,
  generateTypeDefinition,
  type FeatureSchema,
} from '../../src/tools/schema-generator.js';
import { inferSchemaFromSheet } from '../../src/tools/infer-schema-from-sheet.js';
import { TranslateListResponseFactory } from '../factories/googleapis.factory.js';

const mockGetMeta = vi.fn();
const mockBatchGet = vi.fn();
const mockValuesGet = vi.fn();
const mockTranslateList = vi.fn();

vi.mock('google-auth-library', () => {
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

describe('infer-schema-from-sheet + schema-generator integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TranslateListResponseFactory.resetSequenceNumber();
  });

  it('inferSchemaFromSheetで推論したスキーマをschema-generatorに渡して正常に型定義とコンバータを生成できる', async () => {
    // テストデータ: 日本語ヘッダー付きシートデータ（ID, 名前, 数値）
    mockGetMeta.mockResolvedValueOnce({
      data: {
        sheets: [
          {
            properties: { title: 'Sheet1', sheetId: 0 },
          },
        ],
      },
    });
    mockBatchGet.mockResolvedValueOnce({
      data: {
        valueRanges: [
          {
            valueRange: {
              range: 'Sheet1!A1:C2',
              values: [
                ['ID', '名前', '数値'],
                ['1', 'foo', '123'],
              ],
            },
          },
        ],
      },
    });
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          ['ID', '名前', '数値'],
          ['1', 'foo', '123'],
        ],
      },
    });

    // モック: Google翻訳APIで日本語→英語変換（id, name, number）
    mockTranslateList.mockResolvedValueOnce(
      TranslateListResponseFactory.withTranslations(['ID', 'Name', 'Number'])
    );

    const result = await inferSchemaFromSheet({
      spreadsheetId: 'dummy',
      sheetName: 'Sheet1',
      headers: ['ID', '名前', '数値'],
      headerStartCell: 'A1',
      lang: 'ja',
    });

    // 検証1: スキーマ推論成功
    expect(result.isError).toBeUndefined();

    const inferredSchema = JSON.parse(
      result.content[0].text
    ) as FeatureSchema & {
      dataRange: string;
    };
    const { dataRange, ...schema } = inferredSchema;

    // 検証1-2: spreadsheetIdが出力に含まれる
    expect(inferredSchema.spreadsheetId).toBe('dummy');

    // 検証2: TypeScript型定義生成（MedicalSheet interface）
    const typeDef = generateTypeDefinition('MedicalSheet', schema);
    expect(typeDef).toContain('export interface MedicalSheet');
    expect(typeDef).toContain('id?: string;');
    expect(typeDef).toContain('name?: string;');
    expect(typeDef).toContain('number?: string;');

    // 検証3: 行データ→オブジェクト変換コード生成（row[0], row[1], row[2]）
    const rowToObject = generateRowToObject('MedicalSheet', schema);
    expect(rowToObject).toContain('row[0]');
    expect(rowToObject).toContain('row[1]');
    expect(rowToObject).toContain('row[2]');

    // 検証4: ヘッダー範囲とデータ範囲の整合性
    expect(generateHeaderRange(schema)).toBe(inferredSchema.headerRange);
    expect(generateDataRange(schema)).toBe(dataRange);
  });
});
