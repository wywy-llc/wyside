import { SheetsClient } from '@/core/client.js';
import { Todo } from '../../core/types.js';

// Cache crypto availability check
let hasCrypto: boolean | null = null;

// Utility for UUID
function generateUuid(): string {
  if (typeof Utilities !== 'undefined') {
    return Utilities.getUuid();
  }

  // Cache crypto check to avoid repeated typeof checks
  if (hasCrypto === null) {
    hasCrypto =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
  }

  if (hasCrypto) {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto
  throw new Error('UUID generation not available in this environment');
}

/**
 * Universal TODO repository factory for GAS/Node.js environments
 *
 * @example
 * ```typescript
 * import { UniversalTodoRepo } from './features/todo/UniversalTodoRepo.js';
 *
 * const repo = UniversalTodoRepo.create(spreadsheetId, 'Todos');
 * const todos = await repo.getTodos();
 * ```
 */
export const UniversalTodoRepo = (() => {
  /**
   * ✅ GASとNode.jsで完全に同一の実装
   */
  const create = (spreadsheetId: string, sheetName: string) => {
    // Generate range dynamically from sheetName (e.g., "Todos!A2:E")
    const dataRange = `${sheetName}!A2:E`;

    const getTodos = async (): Promise<Todo[]> => {
      const response = await SheetsClient.batchGet(spreadsheetId, [dataRange]);
      const rows = response.valueRanges?.[0]?.values || [];

      // Cache crypto availability check
      // Using filter before map avoids creating temporary Todo objects for empty rows
      return rows
        .filter((row: string[]) => row && row[0] && row[0].trim() !== '')
        .map((row: string[]) => ({
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
      await SheetsClient.appendValues(spreadsheetId, dataRange, [rowValues]);
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
      const range = `${sheetName}!A${rowNumber}:E${rowNumber}`;
      await SheetsClient.updateValues(spreadsheetId, range, [values]);
    };

    const deleteTodo = async (id: string): Promise<void> => {
      const todos = await getTodos();
      const index = todos.findIndex(t => t.id === id);
      if (index === -1) throw new Error(`Todo ${id} not found`);

      const rowNumber = index + 2; // +1 for header, +1 for 0-index

      // Use clearValues instead of deleteDimension to avoid sheetId issues
      // This marks the row as empty rather than physically deleting it
      const range = `${sheetName}!A${rowNumber}:E${rowNumber}`;
      await SheetsClient.updateValues(spreadsheetId, range, [
        ['', '', '', '', ''],
      ]);
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
