/**
 * Copyright 2025 wywy LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * you may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UniversalSheetsClient } from '../../src/core/client.js';
import { UniversalTodoRepo } from '../../src/features/todo/UniversalTodoRepo.js';
import { TodoUseCase } from '../../src/features/todo/TodoUseCase.js';

const SPREADSHEET_ID = process.env.TEST_SPREADSHEET_ID || '';

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
