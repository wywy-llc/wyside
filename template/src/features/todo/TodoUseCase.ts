import { Todo } from '../../core/types.js';
import { UniversalTodoRepo } from './UniversalTodoRepo.js';

/**
 * TODO use case with methods for managing TODOs
 *
 * @example
 * ```typescript
 * import { TodoUseCase } from './features/todo/TodoUseCase.js';
 *
 * const todos = await TodoUseCase.listTodos();
 * await TodoUseCase.addTodo('Buy milk');
 * ```
 */
export const TodoUseCase = (() => {
  // Rollup replace plugin will substitute this with actual spreadsheet ID from .env
  // - For GAS build: NODE_ENV=production uses APP_SPREADSHEET_ID_1_PROD
  // - For Node.js development: uses APP_SPREADSHEET_ID_1_DEV at runtime
  const spreadsheetId = '__SPREADSHEET_ID_1_DEV__';
  const sheetName = 'Todos';

  // Cache repository instance to avoid redundant creation
  const repo = UniversalTodoRepo.create(spreadsheetId, sheetName);

  /**
   * ✅ GASとNode.jsで完全に同一の実装
   */
  const listTodos = async (): Promise<Todo[]> => {
    return repo.getTodos();
  };

  const addTodo = async (title: string): Promise<Todo> => {
    if (!title) throw new Error('Title is required');
    return repo.addTodo(title);
  };

  const toggleTodo = async (id: string): Promise<void> => {
    const todos = await repo.getTodos();
    const todo = todos.find(t => t.id === id);
    if (!todo) throw new Error('Todo not found');

    await repo.updateTodo(id, { completed: !todo.completed });
  };

  const deleteTodo = async (id: string): Promise<void> => {
    await repo.deleteTodo(id);
  };

  return {
    listTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
  } as const;
})();
