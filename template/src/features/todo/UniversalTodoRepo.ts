import { SheetsClient } from '@/core/client.js';
import { TODO_RANGE } from '../../core/constants.js';
import { Todo } from '../../core/types.js';

// Utility for UUID
function generateUuid(): string {
  if (typeof Utilities !== 'undefined') {
    return Utilities.getUuid();
  }
  // Node.js environment setup should provide crypto
  return crypto.randomUUID();
}

/**
 * Universal TODO repository factory for GAS/Node.js environments
 *
 * 🚨 重要: client.tsのSheetsClientを直接使用
 * SheetsClientはIIFEパターンで既にインスタンス化されているため、直接メソッドを呼び出す
 *
 * @example
 * ```typescript
 * import { UniversalTodoRepo } from './features/todo/UniversalTodoRepo.js';
 *
 * const repo = UniversalTodoRepo.create(spreadsheetId);
 * const todos = await repo.getTodos();
 * ```
 */
export const UniversalTodoRepo = (() => {
  /**
   * ✅ GASとNode.jsで完全に同一の実装
   */
  const create = (spreadsheetId: string) => {
    const getTodos = async (): Promise<Todo[]> => {
      const response = await SheetsClient.batchGet(spreadsheetId, [TODO_RANGE]);
      const rows = response.valueRanges?.[0]?.values || [];
      return rows.map((row: string[]) => ({
        id: row[0],
        title: row[1],
        completed: row[2] === 'TRUE',
        createdAt: row[3],
        updatedAt: row[4],
      }));
    };

    const addTodo = async (title: string): Promise<Todo> => {
      const todo: Todo = {
        id: generateUuid(),
        title,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const rowValues = [
        todo.id,
        todo.title,
        todo.completed ? 'TRUE' : 'FALSE',
        todo.createdAt,
        todo.updatedAt,
      ];

      // Use values.append API for more reliable row appending
      await SheetsClient.appendValues(spreadsheetId, TODO_RANGE, [rowValues]);
      return todo;
    };

    const updateTodo = async (
      id: string,
      updates: Partial<Todo>
    ): Promise<void> => {
      // Fetch current data to find row index
      const todos = await getTodos();
      const index = todos.findIndex(t => t.id === id);
      if (index === -1) throw new Error(`Todo ${id} not found`);

      // Row number in Sheets notation (A2 is row 2)
      const rowNumber = index + 2;

      const current = todos[index];
      const updated = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const values = [
        updated.id,
        updated.title,
        updated.completed ? 'TRUE' : 'FALSE',
        updated.createdAt,
        updated.updatedAt,
      ];

      // Use values.update API with explicit range
      const range = `Todos!A${rowNumber}:E${rowNumber}`;
      await SheetsClient.updateValues(spreadsheetId, range, [values]);
    };

    const deleteTodo = async (id: string): Promise<void> => {
      const todos = await getTodos();
      const index = todos.findIndex(t => t.id === id);
      if (index === -1) throw new Error(`Todo ${id} not found`);

      const rowIndex = index + 1;

      const request = {
        deleteDimension: {
          range: {
            sheetId: 0,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      };

      await SheetsClient.batchUpdate(spreadsheetId, [request]);
    };

    return {
      getTodos,
      addTodo,
      updateTodo,
      deleteTodo,
    } as const;
  };

  return { create } as const;
})();
