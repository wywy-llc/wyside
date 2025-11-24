// Setup file for Vitest - runs before all tests
// Mock environment variables for template tests

if (!process.env.APP_SPREADSHEET_ID_1_DEV) {
  process.env.APP_SPREADSHEET_ID_1_DEV = 'mock-spreadsheet-id_abc123';
}
if (!process.env.APP_SPREADSHEET_ID_1_PROD) {
  process.env.APP_SPREADSHEET_ID_1_PROD = 'mock-spreadsheet-id_abc123';
}
if (!process.env.APP_SPREADSHEET_ID_2_DEV) {
  process.env.APP_SPREADSHEET_ID_2_DEV = 'mock-spreadsheet-id_abc123';
}
if (!process.env.APP_SPREADSHEET_ID_2_PROD) {
  process.env.APP_SPREADSHEET_ID_2_PROD = 'mock-spreadsheet-id_abc123';
}
