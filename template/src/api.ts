import { Hono } from 'hono';
import { EmailUseCase } from './features/email/EmailUseCase.js';
import { TodoUseCase } from './features/todo/TodoUseCase.js';

/**
 * Hono APIサーバー - GAS/Node.js両対応
 *
 * このファイルは環境に関係なく動作する統一APIサーバーを提供します
 * - GAS: doGet()/doPost()から呼び出し
 * - Node.js: @hono/node-serverでホスティング
 */

const app = new Hono();

// CORS設定（Node.js開発環境用）
app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('Access-Control-Allow-Origin', '*');
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
});

// ===== TODOs API Routes =====

/**
 * GET /api/todos - TODOリスト取得
 */
app.get('/api/todos', async context => {
  try {
    const todos = await TodoUseCase.listTodos();
    return context.json({ success: true, data: todos });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return context.json({ success: false, error: message }, 500);
  }
});

/**
 * POST /api/todos - TODO追加
 * Body: { title: string }
 */
app.post('/api/todos', async context => {
  try {
    const body = await context.req.json();
    const { title } = body;

    if (!title) {
      return context.json({ success: false, error: 'Title is required' }, 400);
    }

    const todo = await TodoUseCase.addTodo(title);
    return context.json({ success: true, data: todo }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return context.json({ success: false, error: message }, 500);
  }
});

/**
 * PUT /api/todos/:id - TODO更新（toggle）
 */
app.put('/api/todos/:id', async context => {
  try {
    const id = context.req.param('id');
    await TodoUseCase.toggleTodo(id);
    return context.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return context.json({ success: false, error: message }, 500);
  }
});

/**
 * DELETE /api/todos/:id - TODO削除
 */
app.delete('/api/todos/:id', async context => {
  try {
    const id = context.req.param('id');
    await TodoUseCase.deleteTodo(id);
    return context.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return context.json({ success: false, error: message }, 500);
  }
});

// ===== Email API Routes =====

/**
 * POST /api/todos/email - TODOリストをメール送信
 * Body: { to: string }
 */
app.post('/api/todos/email', async context => {
  try {
    const body = await context.req.json();
    const { to } = body;

    if (!to) {
      return context.json(
        { success: false, error: 'Email address is required' },
        400
      );
    }

    // 簡易的なメールアドレス検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return context.json(
        { success: false, error: 'Invalid email address' },
        400
      );
    }

    await EmailUseCase.sendTodosEmail(to);
    return context.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return context.json({ success: false, error: message }, 500);
  }
});

// ヘルスチェック
app.get('/health', c =>
  c.json({ status: 'ok', timestamp: new Date().toISOString() })
);

export default app;
