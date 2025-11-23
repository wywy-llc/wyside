import { UniversalSheetsClient } from '@/core/client';
import { TodoUseCase } from '@/features/todo/TodoUseCase';
import { UniversalTodoRepo } from '@/features/todo/UniversalTodoRepo';
import { beforeEach, describe, expect, it } from 'vitest';

const SPREADSHEET_ID = process.env.APP_SPREADSHEET_ID_1_DEV || '';

describe('TodoUseCase Integration', () => {
  let client: UniversalSheetsClient;
  let repo: UniversalTodoRepo;
  let useCase: TodoUseCase;

  beforeEach(async () => {
    if (!SPREADSHEET_ID) {
      return;
    }
    client = new UniversalSheetsClient();
    repo = new UniversalTodoRepo(client, SPREADSHEET_ID);
    useCase = new TodoUseCase(repo);
  });

  it('should add and retrieve a todo', async () => {
    if (!SPREADSHEET_ID) {
      console.warn('Skipping test: No SPREADSHEET_ID');
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
    if (!SPREADSHEET_ID) return;
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
