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
 * Task機能のデータ型
 */
export interface Task {
  id: string;
  title: string;
  priority?: number;
  completed?: boolean;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
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

/**
 * Item機能のデータ型
 */
export interface Item {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Custom機能のデータ型
 */
export interface Custom {
  id: string;
  title: string;
}

/**
 * Data機能のデータ型
 */
export interface Data {
  value: string;
}

/**
 * Simple機能のデータ型
 */
export interface Simple {
  id: string;
}

/**
 * Test機能のデータ型
 */
export interface Test {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * MedicalSheet機能のデータ型
 */
export interface MedicalSheet {
  id?: string;
  mailId?: string;
  mailIdBranch?: string;
  subject?: string;
  receivedDate?: string;
  reviewer?: string;
  status?: string;
  category?: string;
  emailAddress?: string;
  advertisingMedia?: string;
  firstPreferredDate?: string;
  firstPreferredClinic?: string;
  inquiryMethod?: string;
  tag?: string;
  reviewedDate?: string;
  hasDeficiency?: string;
  deficiencyDetails?: string;
  correctionCompletedDate?: string;
  forAggregation?: string;
  updatedAt?: string;
}
