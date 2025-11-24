import { Hono } from 'hono';
import { SpreadsheetType, getSpreadsheetId } from './config.js';
import { UniversalSheetsClient } from './core/client.js';
import { UniversalGmailClient } from './core/gmail-client.js';
import { EmailUseCase } from './features/email/EmailUseCase.js';
import { TodoUseCase } from './features/todo/TodoUseCase.js';
import { UniversalTodoRepo } from './features/todo/UniversalTodoRepo.js';

/**
 * Hono APIサーバー - GAS/Node.js両対応
 *
 * このファイルは環境に関係なく動作する統一APIサーバーを提供します
 * - GAS: doGet()/doPost()から呼び出し
 * - Node.js: @hono/node-serverでホスティング
 */

const SPREADSHEET_ID = getSpreadsheetId(SpreadsheetType.MAIN);

function getTodoUseCase() {
  const client = new UniversalSheetsClient();
  const repo = new UniversalTodoRepo(client, SPREADSHEET_ID);
  return new TodoUseCase(repo);
}

function getEmailUseCase() {
  const sheetsClient = new UniversalSheetsClient();
  const gmailClient = new UniversalGmailClient();
  const todoRepo = new UniversalTodoRepo(sheetsClient, SPREADSHEET_ID);
  return new EmailUseCase(gmailClient, todoRepo);
}

const app = new Hono();

// CORS設定（Node.js開発環境用）
app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('Access-Control-Allow-Origin', '*');
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
});

// ===== TODO API Routes =====

/**
 * GET /api/todos - TODOリスト取得
 */
app.get('/api/todos', async c => {
  try {
    const todos = await getTodoUseCase().listTodos();
    return c.json({ success: true, data: todos });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * POST /api/todos - TODO追加
 * Body: { title: string }
 */
app.post('/api/todos', async c => {
  try {
    const body = await c.req.json();
    const { title } = body;

    if (!title) {
      return c.json({ success: false, error: 'Title is required' }, 400);
    }

    const todo = await getTodoUseCase().addTodo(title);
    return c.json({ success: true, data: todo }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * PUT /api/todos/:id - TODO更新（toggle）
 */
app.put('/api/todos/:id', async c => {
  try {
    const id = c.req.param('id');
    await getTodoUseCase().toggleTodo(id);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * DELETE /api/todos/:id - TODO削除
 */
app.delete('/api/todos/:id', async c => {
  try {
    const id = c.req.param('id');
    await getTodoUseCase().deleteTodo(id);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ success: false, error: message }, 500);
  }
});

// ===== Email API Routes =====

/**
 * POST /api/todos/email - TODOリストをメール送信
 * Body: { to: string }
 */
app.post('/api/todos/email', async c => {
  try {
    const body = await c.req.json();
    const { to } = body;

    if (!to) {
      return c.json(
        { success: false, error: 'Email address is required' },
        400
      );
    }

    // 簡易的なメールアドレス検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return c.json({ success: false, error: 'Invalid email address' }, 400);
    }

    await getEmailUseCase().sendTodosEmail(to);
    return c.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ success: false, error: message }, 500);
  }
});

// ヘルスチェック
app.get('/health', c =>
  c.json({ status: 'ok', timestamp: new Date().toISOString() })
);

export default app;
