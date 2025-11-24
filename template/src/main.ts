import app from './api.js';
import { SpreadsheetType, getSpreadsheetId } from './config.js';
import { UniversalSheetsClient } from './core/client.js';
import { UniversalGmailClient } from './core/gmail-client.js';
import { TodoUseCase } from './features/todo/TodoUseCase.js';
import { EmailUseCase } from './features/email/EmailUseCase.js';
import { UniversalTodoRepo } from './features/todo/UniversalTodoRepo.js';

// GAS/Nodeどちらでも動くグローバル参照
const globalScope: any =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof global !== 'undefined'
      ? global
      : {};

// Use MAIN spreadsheet for this Todo app
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

/**
 * GAS用のWeb Appエントリーポイント
 * Honoアプリケーションを経由してAPIを公開
 */
async function doGet(e: GoogleAppsScript.Events.DoGet) {
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

async function doPost(e: GoogleAppsScript.Events.DoPost) {
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
 * 従来のGAS UI関数（互換性のため維持）
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Wyside Todo')
    .addItem('Show Todos', 'showTodoUI')
    .addItem('Send TODOs by Email', 'showEmailDialog')
    .addToUi();
}

function showTodoUI() {
  const html =
    HtmlService.createHtmlOutputFromFile('index').setTitle('Wyside Todo');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * メール送信ダイアログを表示
 */
function showEmailDialog() {
  const html = HtmlService.createHtmlOutputFromFile('email-dialog')
    .setWidth(400)
    .setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(html, 'Send TODOs by Email');
}

/**
 * TODOリストをメール送信（ダイアログから呼び出し）
 */
async function sendTodosEmail(email: string) {
  try {
    await getEmailUseCase().sendTodosEmail(email);
    return { success: true, message: 'Email sent successfully!' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// 従来のAPI Functions（互換性のため維持）
function apiListTodos() {
  return getTodoUseCase().listTodos();
}

function apiAddTodo(title: string) {
  return getTodoUseCase().addTodo(title);
}

function apiToggleTodo(id: string) {
  return getTodoUseCase().toggleTodo(id);
}

function apiDeleteTodo(id: string) {
  return getTodoUseCase().deleteTodo(id);
}

// Expose to global for GAS
globalScope.doGet = doGet;
globalScope.doPost = doPost;
globalScope.onOpen = onOpen;
globalScope.showTodoUI = showTodoUI;
globalScope.showEmailDialog = showEmailDialog;
globalScope.sendTodosEmail = sendTodosEmail;
globalScope.apiListTodos = apiListTodos;
globalScope.apiAddTodo = apiAddTodo;
globalScope.apiToggleTodo = apiToggleTodo;
globalScope.apiDeleteTodo = apiDeleteTodo;
