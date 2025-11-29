import chalk from 'chalk';
import fs from 'fs/promises';
import Handlebars from 'handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateExportsList,
  generateOperationsCodes,
  getAllOperationIds,
} from './operation-catalog.js';
import {
  type FeatureSchema,
  generateColumnRange,
  generateDefaults,
  generateObjectToRow,
  generateRowToObject,
  generateTypeDefinition,
  generateValidation,
  getFieldCount,
} from './schema-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定数定義
const TEMPLATE_FILES = {
  REPO: 'universal-repo.ts.hbs',
  USE_CASE: 'usecase.ts.hbs',
} as const;

const TEMPLATE_DIRS = {
  BUILD: '../templates',
  DEV: '../../src/templates',
} as const;

/**
 * Scaffold機能の引数インターフェース
 *
 * 新しい機能を scaffolding する際に必要なパラメータを定義します。
 * 機能名、操作リスト、およびスキーマ情報を含みます。
 *
 * @interface ScaffoldFeatureArgs
 *
 * @property {string} featureName - 生成する機能の名前（例: "Todo", "Schedule"）
 * @property {string[]} [operations] - 生成する操作のリスト（例: ["create", "read", "update"]）。省略可能
 * @property {FeatureSchema} [schema] - 機能のスキーマ定義。省略可能
 *
 * @example
 * ```typescript
 * const args: ScaffoldFeatureArgs = {
 *   featureName: "Todo",
 *   operations: ["create", "read", "update"],
 *   schema: {
 *     fields: [
 *       { name: "id", type: "string", column: "A" },
 *       { name: "name", type: "string", column: "B" }
 *     ],
 *     range: "Items!A2:B"
 *   }
 * };
 * ```
 */
export interface ScaffoldFeatureArgs {
  featureName: string;
  operations?: string[];
  schema?: FeatureSchema;
}

/**
 * スキャフォールド結果の型
 */
interface ScaffoldResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

/**
 * 名前変換の結果
 */
interface NameVariants {
  /** PascalCase（例: "TodoList"） */
  pascal: string;
  /** camelCase（例: "todoList"） */
  camel: string;
}

/**
 * テンプレートデータの型
 */
interface TemplateData {
  featureName: string;
  featureNameCamel: string;
  operations: string[];
  timestamp: string;
  hasSchema: boolean;
  typeDefinition?: string;
  rowToObject?: string;
  objectToRow?: string;
  columnRange?: string;
  fieldCount?: number;
  validation?: string;
  defaults?: Record<string, any>;
  range?: string;
  rangeName?: string;
  operationCodes: string;
  exportsList: string;
}

/**
 * 機能名を各種命名規則に変換
 *
 * @param featureName - 元の機能名
 * @returns PascalCaseとcamelCaseの変換結果
 * @remarks 先頭文字の大文字/小文字を変換してコード生成に使用
 */
function convertFeatureName(featureName: string): NameVariants {
  const str = String(featureName);
  return {
    pascal: str.charAt(0).toUpperCase() + str.slice(1),
    camel: str.charAt(0).toLowerCase() + str.slice(1),
  };
}

/**
 * テンプレートディレクトリのパスを解決
 *
 * @returns テンプレートディレクトリの絶対パス
 * @remarks ビルド環境とdev環境の両方に対応。存在確認してフォールバック
 */
async function resolveTemplatesDir(): Promise<string> {
  const buildPath = path.resolve(__dirname, TEMPLATE_DIRS.BUILD);

  try {
    await fs.access(buildPath);
    return buildPath;
  } catch {
    return path.resolve(__dirname, TEMPLATE_DIRS.DEV);
  }
}

/**
 * Handlebarsテンプレートを読み込んでコンパイル
 *
 * @param templatesDir - テンプレートディレクトリのパス
 * @returns コンパイル済みのテンプレート関数群
 * @remarks テンプレートファイルの読み込みとコンパイルを一括処理
 */
async function loadTemplates(templatesDir: string) {
  const [repoSrc, useCaseSrc] = await Promise.all([
    fs.readFile(path.join(templatesDir, TEMPLATE_FILES.REPO), 'utf8'),
    fs.readFile(path.join(templatesDir, TEMPLATE_FILES.USE_CASE), 'utf8'),
  ]);

  return {
    repo: Handlebars.compile(repoSrc),
    useCase: Handlebars.compile(useCaseSrc),
  };
}

/**
 * 生成されたコードをファイルに書き込み
 *
 * @param targetDir - 出力先ディレクトリ
 * @param pascalName - PascalCase変換後の機能名
 * @param templates - コンパイル済みテンプレート
 * @param data - テンプレートに渡すデータ
 * @param messages - 実行ログを格納する配列
 * @remarks リポジトリとユースケースの2ファイルを生成
 */
async function writeGeneratedFiles(
  targetDir: string,
  pascalName: string,
  templates: {
    repo: HandlebarsTemplateDelegate;
    useCase: HandlebarsTemplateDelegate;
  },
  data: TemplateData,
  messages: string[]
): Promise<void> {
  const files = [
    {
      path: path.join(targetDir, `Universal${pascalName}Repo.ts`),
      content: templates.repo(data),
    },
    {
      path: path.join(targetDir, `${pascalName}UseCase.ts`),
      content: templates.useCase(data),
    },
  ];

  await Promise.all(
    files.map(async file => {
      await fs.writeFile(file.path, file.content);
      messages.push(`Created: ${file.path}`);
    })
  );
}

async function upsertCoreTypes(
  pascalName: string,
  typeDefinition: string | undefined,
  messages: string[]
): Promise<void> {
  if (!typeDefinition) return;

  const typesPath = path.join(process.cwd(), 'src/core/types.ts');
  let content = '';
  try {
    content = await fs.readFile(typesPath, 'utf-8');
  } catch {
    content = '/** Auto-generated types */\n';
  }

  const pattern = new RegExp(
    `export interface ${pascalName}[\\s\\S]*?\\n}`,
    'm'
  );
  if (pattern.test(content)) {
    content = content.replace(pattern, typeDefinition);
  } else {
    if (!content.endsWith('\n')) content += '\n';
    content += `${typeDefinition}\n`;
  }

  await fs.writeFile(typesPath, content);
  messages.push(`Updated core types: ${pascalName}`);
}

async function upsertCoreConstants(
  rangeName: string | undefined,
  range: string | undefined,
  messages: string[]
): Promise<void> {
  if (!rangeName || !range) return;

  const constantsPath = path.join(process.cwd(), 'src/core/constants.ts');
  let content = '';
  try {
    content = await fs.readFile(constantsPath, 'utf-8');
  } catch {
    content = '/** Auto-generated range constants */\n';
  }

  const declaration = `export const ${rangeName} = '${range}';`;
  const pattern = new RegExp(`export const ${rangeName} = ['\`"].*['\`"];`);
  if (pattern.test(content)) {
    content = content.replace(pattern, declaration);
  } else {
    if (!content.endsWith('\n')) content += '\n';
    content += `${declaration}\n`;
  }

  await fs.writeFile(constantsPath, content);
  messages.push(`Updated core constants: ${rangeName}`);
}

/**
 * 操作リストを解決
 *
 * @param operations - ユーザー指定の操作リスト
 * @param messages - ログメッセージ配列
 * @returns 解決された操作ID配列
 * @remarks 未指定または'all'指定時は全操作を返す
 */
function resolveOperationList(
  operations: string[] | undefined,
  messages: string[]
): string[] {
  // 未指定または'all'指定時は全操作
  if (!operations || operations.length === 0 || operations.includes('all')) {
    const allOperations = getAllOperationIds();
    messages.push(
      `Using all available operations: ${allOperations.join(', ')}`
    );
    return allOperations;
  }

  messages.push(`Using operations: ${operations.join(', ')}`);
  return operations;
}

/**
 * スキーマデータを構築
 *
 * @param names - 機能名のバリエーション
 * @param schema - スキーマ定義
 * @param operationIds - 操作ID配列
 * @returns スキーマデータオブジェクト
 * @remarks スキーマが未定義の場合は空のデータを返す
 */
function buildSchemaData(
  names: NameVariants,
  schema: FeatureSchema | undefined,
  operationIds: string[]
): Partial<TemplateData> {
  if (!schema) {
    return {
      hasSchema: false,
      operationCodes: '',
      exportsList: '',
    };
  }

  const rangeName = schema.rangeName || `${names.pascal.toUpperCase()}_RANGE`;

  const operationContext = {
    featureName: names.pascal,
    featureNameCamel: names.camel,
    schema,
    rangeName,
  };

  const operationCodes = generateOperationsCodes(
    operationIds,
    operationContext
  );
  const exportsList = generateExportsList(operationIds);

  return {
    hasSchema: true,
    typeDefinition: generateTypeDefinition(names.pascal, schema),
    rowToObject: generateRowToObject(names.pascal, schema),
    objectToRow: generateObjectToRow(names.camel, schema),
    columnRange: generateColumnRange(schema),
    fieldCount: getFieldCount(schema),
    validation: generateValidation(names.camel, schema),
    defaults: generateDefaults(schema),
    range: schema.range,
    rangeName,
    operationCodes: operationCodes.join('\n'),
    exportsList,
  };
}

/**
 * テンプレートデータを構築
 *
 * @param names - 機能名のバリエーション
 * @param operationIds - 操作ID配列
 * @param schemaData - スキーマデータ
 * @returns 完全なテンプレートデータ
 */
function buildTemplateData(
  names: NameVariants,
  operationIds: string[],
  schemaData: Partial<TemplateData>
): TemplateData {
  return {
    featureName: names.pascal,
    featureNameCamel: names.camel,
    operations: operationIds,
    timestamp: new Date().toISOString(),
    hasSchema: false,
    operationCodes: '',
    exportsList: '',
    ...schemaData,
  };
}

/**
 * 機能のスキャフォールディングを実行
 *
 * @param args.featureName - 機能名
 * @param args.operations - 生成する操作のリスト(例: ["create", "read", "update"]）)
 * @param args.schema - スキーマ定義(例: { fields: [...], range: "A1:D", rangeName: "TODO_RANGE" }）
 * @returns ツール実行結果
 */
export async function scaffoldFeature(
  args: ScaffoldFeatureArgs
): Promise<ScaffoldResult> {
  const messages: string[] = [];

  try {
    // Early validation
    const { featureName, operations, schema } = args;
    if (!featureName) {
      throw new Error('featureName is required');
    }

    // 名前変換
    const names = convertFeatureName(featureName);
    messages.push(`Scaffolding feature: ${chalk.bold(names.pascal)}`);

    // ディレクトリ準備
    const templatesDir = await resolveTemplatesDir();
    const targetDir = path.join(process.cwd(), 'src/features', names.camel);
    await fs.mkdir(targetDir, { recursive: true });

    // テンプレート読み込み
    const templates = await loadTemplates(templatesDir);

    // 操作リスト解決
    const operationIds = resolveOperationList(operations, messages);

    // データ構築
    const schemaData = buildSchemaData(names, schema, operationIds);
    const templateData = buildTemplateData(names, operationIds, schemaData);

    // コア定義を更新
    await upsertCoreTypes(names.pascal, templateData.typeDefinition, messages);
    await upsertCoreConstants(
      templateData.rangeName,
      templateData.range,
      messages
    );

    // ファイル生成
    await writeGeneratedFiles(
      targetDir,
      names.pascal,
      templates,
      templateData,
      messages
    );

    messages.push(
      chalk.green(`✅ Feature ${names.pascal} scaffolded successfully.`)
    );
    messages.push(`📦 Generated ${operationIds.length} operations`);

    return {
      content: [{ type: 'text', text: messages.join('\n') }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}\nLogs:\n${messages.join('\n')}`,
        },
      ],
      isError: true,
    };
  }
}
