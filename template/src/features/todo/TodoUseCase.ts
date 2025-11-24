import { Todo } from '../../core/types.js';
import { UniversalTodoRepo } from './UniversalTodoRepo.js';

/**
 * TODO use case with methods for managing TODOs
 *
 * 🚨 重要: client.tsと完全に同じIIFEパターンで実装
 * 環境非依存な実装を提供
 *
 * @example
 * ```typescript
 * import { TodoUseCase } from './features/todo/TodoUseCase.js';
 *
 * const todos = await TodoUseCase.listTodos(spreadsheetId);
 * await TodoUseCase.addTodo(spreadsheetId, 'Buy milk');
 * ```
 */
export const TodoUseCase = (() => {
  /**
   * ✅ GASとNode.jsで完全に同一の実装
   */
  const listTodos = async (spreadsheetId: string): Promise<Todo[]> => {
    const repo = UniversalTodoRepo.create(spreadsheetId);
    return repo.getTodos();
  };

  const addTodo = async (
    spreadsheetId: string,
    title: string
  ): Promise<Todo> => {
    if (!title) throw new Error('Title is required');
    const repo = UniversalTodoRepo.create(spreadsheetId);
    return repo.addTodo(title);
  };

  const toggleTodo = async (
    spreadsheetId: string,
    id: string
  ): Promise<void> => {
    const repo = UniversalTodoRepo.create(spreadsheetId);
    const todos = await repo.getTodos();
    const todo = todos.find(t => t.id === id);
    if (!todo) throw new Error('Todo not found');

    await repo.updateTodo(id, { completed: !todo.completed });
  };

  const deleteTodo = async (
    spreadsheetId: string,
    id: string
  ): Promise<void> => {
    const repo = UniversalTodoRepo.create(spreadsheetId);
    await repo.deleteTodo(id);
  };

  return {
    listTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
  } as const;
})();
