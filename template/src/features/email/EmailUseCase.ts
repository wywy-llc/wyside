import { GmailClient } from '@/core/gmail-client';
import { UniversalTodoRepo } from '../todo/UniversalTodoRepo';

/**
 * Email use case with methods for sending TODO emails
 *
 * @example
 * ```typescript
 * import { EmailUseCase } from './features/email/EmailUseCase.js';
 *
 * await EmailUseCase.sendTodosEmail('user@example.com');
 * ```
 */
export const EmailUseCase = (() => {
  /**
   * TODOリストをメール本文形式にフォーマット
   */
  const formatTodosAsEmail = (
    todos: Array<{
      id: string;
      title: string;
      completed: boolean;
      createdAt: string;
      updatedAt: string;
    }>
  ): string => {
    if (todos.length === 0) {
      return 'No TODOs found.\n\n---\nSent from Wyside TODO App';
    }

    const pendingTodos = todos.filter(t => !t.completed);
    const completedTodos = todos.filter(t => t.completed);

    let body = '📋 TODO List\n\n';

    // Pending TODOs
    if (pendingTodos.length > 0) {
      body += '⏳ Pending:\n';
      pendingTodos.forEach((todo, index) => {
        body += `${index + 1}. [ ] ${todo.title}\n`;
      });
      body += '\n';
    }

    // Completed TODOs
    if (completedTodos.length > 0) {
      body += '✅ Completed:\n';
      completedTodos.forEach((todo, index) => {
        body += `${index + 1}. [x] ${todo.title}\n`;
      });
      body += '\n';
    }

    body += `Total: ${todos.length} (Pending: ${pendingTodos.length}, Completed: ${completedTodos.length})\n\n`;
    body += '---\nSent from Wyside TODO App';

    return body;
  };

  /**
   * ✅ GASとNode.jsで完全に同一の実装
   * TODOリストをメール送信
   * @param to 宛先メールアドレス
   */
  const sendTodosEmail = async (to: string): Promise<void> => {
    // Rollup replace plugin will substitute this with actual spreadsheet ID from .env
    const spreadsheetId = '__SPREADSHEET_ID_1_DEV__';
    const sheetName = 'Todos';

    // TODOリスト取得
    const todoRepo = UniversalTodoRepo.create(spreadsheetId, sheetName);
    const todos = await todoRepo.getTodos();

    // メール本文作成
    const subject = '📋 TODO List';
    const body = formatTodosAsEmail(todos);

    // メール送信
    await GmailClient.sendEmail(to, subject, body);
  };

  return {
    sendTodosEmail,
  } as const;
})();
