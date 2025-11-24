/**
 * Core型定義
 *
 * @remarks scaffold_featureツールで生成される機能のベース型定義
 */

/**
 * Todo機能のデータ型
 */
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Schedule機能のデータ型
 */
export interface Schedule {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Google Sheets API batchUpdateリクエストの型
 */
export interface SheetsApiRequest {
  requests: any[];
}

/**
 * Google Sheets API batchUpdateレスポンスの型
 */
export interface SheetsApiResponse {
  spreadsheetId: string;
  replies: any[];
}
