import { UniversalSheetsClient } from '@/core/client';
import { TodoUseCase } from '@/features/todo/TodoUseCase';
import { UniversalTodoRepo } from '@/features/todo/UniversalTodoRepo';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const SPREADSHEET_ID = process.env.APP_SPREADSHEET_ID_1_DEV || '';

// Check if service account key is a dummy
function isValidServiceAccount(): boolean {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) return false;

  try {
    const keyContent = fs.readFileSync(path.resolve(keyPath), 'utf-8');
    const key = JSON.parse(keyContent);
    // Check if it's a dummy key
    return (
      key.private_key &&
      !key.private_key.includes('DUMMY_PRIVATE_KEY') &&
      key.project_id !== 'dummy-project'
    );
  } catch {
    return false;
  }
}

const SHOULD_RUN_TESTS =
  SPREADSHEET_ID &&
  isValidServiceAccount() &&
  !SPREADSHEET_ID.includes('_abc123');

// Helper to check if a sheet exists
async function sheetExists(
  client: UniversalSheetsClient,
  spreadsheetId: string,
  sheetName: string
): Promise<boolean> {
  try {
    await client.batchGet(spreadsheetId, [`${sheetName}!A1`]);
    return true;
  } catch (error: any) {
    if (error?.message?.includes('Unable to parse range')) {
      return false;
    }
    throw error;
  }
}

// Helper to rename the first sheet to 'Todos' and add headers
async function createSheet(
  client: UniversalSheetsClient,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  // Rename the first sheet (sheetId: 0) to 'Todos'
  await client.batchUpdate(spreadsheetId, [
    {
      updateSheetProperties: {
        properties: {
          sheetId: 0,
          title: sheetName,
        },
        fields: 'title',
      },
    },
  ]);

  // Add header row to the first sheet
  await client.batchUpdate(spreadsheetId, [
    {
      updateCells: {
        range: {
          sheetId: 0,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 5,
        },
        rows: [
          {
            values: [
              { userEnteredValue: { stringValue: 'ID' } },
              { userEnteredValue: { stringValue: 'Title' } },
              { userEnteredValue: { stringValue: 'Completed' } },
              { userEnteredValue: { stringValue: 'Created' } },
              { userEnteredValue: { stringValue: 'Updated' } },
            ],
          },
        ],
        fields: 'userEnteredValue',
      },
    },
  ]);
}

describe('TodoUseCase Integration', () => {
  let client: UniversalSheetsClient;
  let repo: UniversalTodoRepo;
  let useCase: TodoUseCase;

  beforeAll(async () => {
    if (!SHOULD_RUN_TESTS) {
      return;
    }

    // Ensure Todos sheet exists
    client = new UniversalSheetsClient();
    const exists = await sheetExists(client, SPREADSHEET_ID, 'Todos');
    if (!exists) {
      console.log('Creating Todos sheet...');
      await createSheet(client, SPREADSHEET_ID, 'Todos');
    }
  });

  beforeEach(async () => {
    if (!SHOULD_RUN_TESTS) {
      return;
    }
    client = new UniversalSheetsClient();
    repo = new UniversalTodoRepo(client, SPREADSHEET_ID);
    useCase = new TodoUseCase(repo);
  });

  it('should add and retrieve a todo', async () => {
    if (!SHOULD_RUN_TESTS) {
      console.warn('Skipping test: No valid service account or SPREADSHEET_ID');
      return;
    }
    const title = `Test Todo ${Date.now()}`;
    const todo = await useCase.addTodo(title);

    expect(todo.title).toBe(title);
    expect(todo.id).toBeDefined();
    expect(todo.completed).toBe(false);

    const list = await useCase.listTodos();
    const found = list.find(t => t.id === todo.id);
    expect(found).toBeDefined();
    expect(found?.title).toBe(title);

    // Cleanup
    await useCase.deleteTodo(todo.id);
  });

  it('should toggle completion status', async () => {
    if (!SHOULD_RUN_TESTS) {
      console.warn('Skipping test: No valid service account or SPREADSHEET_ID');
      return;
    }
    const title = `Toggle Test ${Date.now()}`;
    const todo = await useCase.addTodo(title);

    await useCase.toggleTodo(todo.id);

    const list = await useCase.listTodos();
    const updated = list.find(t => t.id === todo.id);
    expect(updated?.completed).toBe(true);

    // Cleanup
    await useCase.deleteTodo(todo.id);
  });
});
