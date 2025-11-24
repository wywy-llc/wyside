import { UniversalGmailClient } from '../../core/gmail-client.js';
import { UniversalTodoRepo } from '../todo/UniversalTodoRepo.js';

export class EmailUseCase {
  constructor(
    private gmailClient: UniversalGmailClient,
    private todoRepo: UniversalTodoRepo
  ) {}

  /**
   * TODOリストをメール送信
   * @param to 宛先メールアドレス
   */
  async sendTodosEmail(to: string): Promise<void> {
    // TODOリスト取得
    const todos = await this.todoRepo.getTodos();

    // メール本文作成
    const subject = '📋 TODO List';
    const body = this.formatTodosAsEmail(todos);

    // メール送信
    await this.gmailClient.sendEmail(to, subject, body);
  }

  /**
   * TODOリストをメール本文形式にフォーマット
   */
  private formatTodosAsEmail(
    todos: Array<{
      id: string;
      title: string;
      completed: boolean;
      createdAt: string;
      updatedAt: string;
    }>
  ): string {
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
  }
}
