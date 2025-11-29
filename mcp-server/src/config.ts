/**
 * Spreadsheet configuration utilities for MCP server
 *
 * Spreadsheet IDs are loaded from environment variables:
 * APP_SPREADSHEET_ID_{N}_DEV or APP_SPREADSHEET_ID_{N}_PROD (1-5)
 *
 * ## 環境検出関数
 *
 * GAS環境とNode.js環境を判定するためのユーティリティ関数を提供
 */

/**
 * Check if code is running in Google Apps Script environment
 * @returns true if running in GAS, false otherwise
 */
export function isGasEnvironment(): boolean {
  return typeof ScriptApp !== 'undefined';
}

/**
 * Check if code is running in Node.js environment
 * @returns true if running in Node.js, false otherwise
 */
export function isNodeEnvironment(): boolean {
  return typeof ScriptApp === 'undefined';
}

/**
 * ## wysideの初期化フローとファイル配置
 *
 * ### 1. ユーザーがwysideを初期化
 * ```bash
 * npx @wywyjp/wyside init
 * ```
 *
 * ### 2. templateディレクトリがユーザープロジェクトにコピーされる
 * **処理**: `src/app.ts:307-340 handleTemplate()`
 * ```javascript
 * // wyside/template/ の内容をユーザープロジェクト（cwd）にコピー
 * const templates = path.join(__dirname, '../../template');
 * const items = await fs.readdir(templates);
 * for (const item of items) {
 *   const targetPath = path.join(cwd, item);
 *   await fs.copy(sourcePath, targetPath);
 * }
 * ```
 *
 * ### 3. コピーされる重要ファイル
 * - `template/src/config.ts` → ユーザー環境の `src/config.ts`
 * - `template/rollup.config.mjs` → ユーザー環境の `rollup.config.mjs`
 * - `template/.env.example` → ユーザー環境の `.env.example`
 * - `template/src/` 以下すべて
 *
 * ### 4. ユーザーが環境変数を設定
 * ```bash
 * # .env ファイルを作成
 * APP_SPREADSHEET_ID_1_DEV=1ABC...
 * APP_SPREADSHEET_ID_1_PROD=1XYZ...
 * ```
 *
 * ### 5. scaffold_featureで機能を生成（MCPサーバー経由）
 * **生成場所**: `ユーザー環境/src/features/medicalRecord/MedicalRecordUseCase.ts`
 * **参照先**: `ユーザー環境/src/config.ts` (相対パス: `../../config.js`)
 * **重要**: 生成されるコードは、手順2でコピーされた`config.ts`を参照する
 *
 * ## 環境別の動作
 *
 * ### MCP Server（このファイル）
 * - **実行環境**: Node.js専用（MCPサーバーとして動作）
 * - **動作**: `process.env`から環境変数を直接読み込み
 * - **用途**: scaffold_feature等のツール内部でspreadsheetIdを管理
 * - **配置**: `wyside/mcp-server/src/config.ts` (npmパッケージ内)
 *
 * ### ユーザープロジェクト（コピーされたconfig.ts）
 * - **実行環境**: Node.js（開発）+ GAS（本番）の両対応
 * - **動作**:
 *   - Node.js環境: `process.env`から環境変数を読み込み（このファイルと同様）
 *   - GAS環境: Rollupビルド時にプレースホルダーを実際の値に置換
 * - **配置**: `ユーザープロジェクト/src/config.ts` (wysideテンプレートからコピー)
 *
 * ## Rollupビルド時の置換（GAS環境向け）
 *
 * **置換対象**: `template/src/config.ts:60`
 * ```typescript
 * // ビルド前（プレースホルダー）
 * return '__BUILD_SPREADSHEET_ID_MAP__';
 * ```
 *
 * **置換処理**: `template/rollup.config.mjs:214-227, 269`
 * ```javascript
 * // 1. ビルド時に環境変数からマップを構築
 * const isProduction = process.env.NODE_ENV === 'production';
 * const spreadsheetIdMap = {};
 * for (let i = 1; i <= 5; i++) {
 *   const key = `APP_SPREADSHEET_ID_${i}_${isProduction ? 'PROD' : 'DEV'}`;
 *   if (process.env[key]) spreadsheetIdMap[i] = process.env[key].trim();
 * }
 * const spreadsheetIdMapJson = JSON.stringify(spreadsheetIdMap);
 *
 * // 2. Rollup replace pluginで文字列置換
 * replace({
 *   "'__BUILD_SPREADSHEET_ID_MAP__'": spreadsheetIdMapJson
 * })
 * ```
 *
 * **置換結果**: `dist/main.gs`
 * ```typescript
 * // ビルド後（実際の値）
 * return {"1":"1QfRvIHbJ-UH9wdqOQQSuk70MotPdN-tr61LksM9v1mA"};
 * ```
 *
 * **重要**: GAS環境では`process.env`が存在しないため、
 * ビルド時に環境変数の値をソースコードに直接埋め込む必要がある。
 * この仕組みにより、同一のTypeScriptコードが両環境で動作可能になる。
 */
export enum SpreadsheetType {
  TODOS = 1,
}

type SpreadsheetIdMap = Record<number, string>;

/**
 * スプレッドシートIDマップを構築
 *
 * @remarks
 * このファイルはMCPサーバー内部でのみ使用され、Node.js環境で実行される。
 * ユーザープロジェクトでは`template/src/config.ts`の同名関数が使用される。
 *
 * @returns SpreadsheetTypeからIDへのマッピング
 */
function buildSpreadsheetIdMap(): SpreadsheetIdMap {
  const isProduction = process.env.NODE_ENV === 'production';
  const suffix = isProduction ? 'PROD' : 'DEV';
  const map: SpreadsheetIdMap = {};

  for (let i = 1; i <= 5; i++) {
    const key = `APP_SPREADSHEET_ID_${i}_${suffix}`;
    const id = process.env[key];
    if (id && id.trim()) {
      map[i] = id.trim();
    }
  }

  return map;
}

/**
 * Spreadsheet IDを取得
 *
 * @param type - SpreadsheetType enum value
 * @returns Spreadsheet ID string
 * @throws Error when ID is missing
 */
export function getSpreadsheetId(type: SpreadsheetType): string {
  const map = buildSpreadsheetIdMap();
  const id = map[type];

  if (!id) {
    const typeName = SpreadsheetType[type] ?? type;
    throw new Error(
      `Spreadsheet ID for type ${typeName} (${type}) is not configured. ` +
        'Set APP_SPREADSHEET_ID_{N}_DEV/PROD in your environment.'
    );
  }

  return id;
}
