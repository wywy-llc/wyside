import chalk from 'chalk';
import fs from 'fs/promises';
import Handlebars from 'handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  type FeatureSchema,
  generateTypeDefinition,
  generateRowToObject,
  generateObjectToRow,
  generateColumnRange,
  getFieldCount,
  generateValidation,
  generateDefaults,
} from './schema-generator.js';
import {
  generateOperationsCodes,
  generateExportsList,
  getAllOperationIds,
} from './operation-catalog.js';

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
 * スキャフォールド機能の引数
 */
export interface ScaffoldFeatureArgs {
  /** 機能名（例: "Todo", "Schedule"） */
  featureName: string;
  /** 生成する操作のリスト（例: ["create", "read", "update"]） */
  operations?: string[];
  /** スキーマ定義（オプション） */
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
  data: Record<string, unknown>,
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

/**
 * 機能のスキャフォールディングを実行
 *
 * @param args - 機能名と操作のリストを含む引数
 * @returns 実行結果メッセージ
 * @remarks Handlebarsテンプレートから機能のコードを生成し、src/features/配下に出力
 */
export async function scaffoldFeature(
  args: ScaffoldFeatureArgs
): Promise<ScaffoldResult> {
  const messages: string[] = [];

  try {
    const { featureName, operations, schema } = args;
    if (!featureName) throw new Error('featureName is required');

    const names = convertFeatureName(featureName);
    messages.push(`Scaffolding feature: ${chalk.bold(names.pascal)}`);

    const templatesDir = await resolveTemplatesDir();
    const targetDir = path.join(process.cwd(), 'src/features', names.camel);
    await fs.mkdir(targetDir, { recursive: true });

    const templates = await loadTemplates(templatesDir);

    // 操作リストの処理（未指定時は全操作、'all'指定時も全操作）
    let operationIds = operations || [];
    if (operationIds.length === 0 || operationIds.includes('all')) {
      operationIds = getAllOperationIds();
      messages.push(
        `Using all available operations: ${operationIds.join(', ')}`
      );
    } else {
      messages.push(`Using operations: ${operationIds.join(', ')}`);
    }

    // 操作コードを生成
    const operationContext = {
      featureName: names.pascal,
      featureNameCamel: names.camel,
      schema,
      rangeName:
        schema?.rangeName ||
        (schema ? `${names.pascal.toUpperCase()}_RANGE` : undefined),
    };

    const operationCodes = generateOperationsCodes(
      operationIds,
      operationContext
    );
    const exportsList = generateExportsList(operationIds);

    // スキーマからコード生成データを準備
    const schemaData = schema
      ? {
          hasSchema: true,
          typeDefinition: generateTypeDefinition(names.pascal, schema),
          rowToObject: generateRowToObject(names.pascal, schema),
          objectToRow: generateObjectToRow(names.camel, schema),
          columnRange: generateColumnRange(schema),
          fieldCount: getFieldCount(schema),
          validation: generateValidation(names.camel, schema),
          defaults: generateDefaults(schema),
          range: schema.range,
          rangeName: schema.rangeName || `${names.pascal.toUpperCase()}_RANGE`,
          operationCodes: operationCodes.join('\n'),
          exportsList,
        }
      : { hasSchema: false, operationCodes: '', exportsList: '' };

    const templateData = {
      featureName: names.pascal,
      featureNameCamel: names.camel,
      operations: operationIds,
      timestamp: new Date().toISOString(),
      ...schemaData,
    };

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
