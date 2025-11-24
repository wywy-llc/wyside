import app from './api.js';
import { EmailUseCase } from './features/email/EmailUseCase.js';
import { TodoUseCase } from './features/todo/TodoUseCase.js';

// GAS/Nodeどちらでも動くグローバル参照
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const getGlobalScope = new Function('return this');
const globalScope: any =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof global !== 'undefined'
      ? global
      : // Fallback for GAS V8 where globalThis/global are missing
        getGlobalScope();

// GAS runtime lacks Fetch API (Request/Headers). Provide a minimal polyfill for Hono routing.
if (!globalScope.Headers) {
  class HeadersPolyfill {
    private map: Record<string, string> = {};

    constructor(init?: Record<string, string> | [string, string][]) {
      if (Array.isArray(init)) {
        init.forEach(([k, v]) => this.set(k, v));
      } else if (init) {
        Object.entries(init).forEach(([k, v]) => this.set(k, v));
      }
    }

    append(key: string, value: string) {
      const lower = key.toLowerCase();
      this.map[lower] = this.map[lower]
        ? `${this.map[lower]}, ${value}`
        : value;
    }

    set(key: string, value: string) {
      this.map[key.toLowerCase()] = value;
    }

    get(key: string) {
      const lower = key.toLowerCase();
      return lower in this.map ? this.map[lower] : null;
    }

    has(key: string) {
      return key.toLowerCase() in this.map;
    }

    forEach(callback: (value: string, key: string) => void, thisArg?: unknown) {
      Object.entries(this.map).forEach(([k, v]) =>
        callback.call(thisArg, v, k)
      );
    }

    entries() {
      return Object.entries(this.map)[Symbol.iterator]();
    }
  }

  globalScope.Headers = HeadersPolyfill;
}

if (!globalScope.Request) {
  class RequestPolyfill {
    url: string;
    method: string;
    headers: InstanceType<typeof globalScope.Headers>;
    body?: string;

    constructor(input: string, init: any = {}) {
      this.url = input;
      this.method = (init.method || 'GET').toString().toUpperCase();
      this.headers = new globalScope.Headers(init.headers || {});
      this.body = init.body;
    }

    async json() {
      if (!this.body) return {};
      return JSON.parse(this.body);
    }

    async text() {
      return this.body ? String(this.body) : '';
    }
  }

  globalScope.Request = RequestPolyfill;
}

if (!globalScope.Response) {
  class ResponsePolyfill {
    body: string;
    status: number;
    headers: InstanceType<typeof globalScope.Headers>;

    constructor(body?: unknown, init: any = {}) {
      if (body === undefined || body === null) {
        this.body = '';
      } else if (typeof body === 'string') {
        this.body = body;
      } else {
        this.body = JSON.stringify(body);
      }
      this.status = typeof init.status === 'number' ? init.status : 200;
      this.headers = new globalScope.Headers(init.headers || {});
    }

    get ok() {
      return this.status >= 200 && this.status < 300;
    }

    async json() {
      return JSON.parse(this.body || '{}');
    }

    async text() {
      return this.body;
    }
  }

  globalScope.Response = ResponsePolyfill;
}

/**
 * GAS用のWeb Appエントリーポイント
 * Honoアプリケーションを経由してAPIを公開
 */
export async function doGet(e: GoogleAppsScript.Events.DoGet) {
  // GASのリクエストをWeb標準Requestに変換
  const url = e.parameter.url || '/health';
  const request = new Request(`https://script.google.com${url}`, {
    method: 'GET',
  });

  // Honoアプリケーションで処理
  const response = await app.fetch(request);
  const data = await response.json();

  // ResponseをGASのContentServiceに変換
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}

export async function doPost(e: GoogleAppsScript.Events.DoPost) {
  const url = e.parameter.url || '/';
  const body = e.postData?.contents || '{}';

  const request = new Request(`https://script.google.com${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body,
  });

  const response = await app.fetch(request);
  const data = await response.json();

  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * スプレッドシート UI 用のメニューエントリ
 * GAS でメニューを表示する現行のトリガー (onOpen/onInstall)
 */
export function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('Wyside Todo');
  menu.addItem('Show Todos', 'showTodoUI');
  menu.addItem('Send TODOs by Email', 'showEmailDialog');
  menu.addToUi();
}

// Add-on install hook: ensure menu shows on first install
export function onInstall() {
  onOpen();
}

export function showTodoUI() {
  const html =
    HtmlService.createHtmlOutputFromFile('index').setTitle('Wyside Todo');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * メール送信ダイアログを表示
 */
export function showEmailDialog() {
  const html = HtmlService.createHtmlOutputFromFile('email-dialog')
    .setWidth(400)
    .setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(html, 'Send TODOs by Email');
}

/**
 * TODOリストをメール送信（ダイアログから呼び出し）
 */
export async function sendTodosEmail(email: string) {
  try {
    await EmailUseCase.sendTodosEmail(email);
    return { success: true, message: 'Email sent successfully!' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
export function apiListTodos() {
  return TodoUseCase.listTodos();
}

export function apiAddTodo(title: string) {
  return TodoUseCase.addTodo(title);
}

export function apiToggleTodo(id: string) {
  return TodoUseCase.toggleTodo(id);
}

export function apiDeleteTodo(id: string) {
  return TodoUseCase.deleteTodo(id);
}
