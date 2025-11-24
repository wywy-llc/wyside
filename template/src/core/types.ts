export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SheetsApiRequest {
  requests: any[];
}

export interface SheetsApiResponse {
  spreadsheetId: string;
  replies: any[];
}
