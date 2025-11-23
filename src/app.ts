#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import prompts from 'prompts';
import { fileURLToPath } from 'url';
import writeFileAtomic from 'write-file-atomic';

import { ClaspHelper } from './clasp-helper.js';
import { config, configForAngular, configForSvelte } from './config.js';
import { runMcpSetup } from './mcp-client.js';
import { startMcpServer } from './mcp-setup.js';
import { PackageHelper } from './package-helper.js';

/**
 * This is required to avoid treeshaking this file.
 * As long as anything from a file is being used, the entire file
 * is being kept.
 */
export const app = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEBUG_ENABLED =
  process.env.WYSIDE_DEBUG === '1' ||
  process.env.WYSIDE_DEBUG?.toLowerCase() === 'true';
const debugLog = DEBUG_ENABLED
  ? (...args: unknown[]) => {
      console.log('[wyside:debug]', ...args);
    }
  : () => {};

let CONFIG: typeof config;

export interface Options {
  yes: boolean;
  no: boolean;
  title: string;
  ui: boolean;
  uiFramework?: 'angular' | 'svelte';
  setupGcp?: boolean;
}

/**
 * Handle MCP server startup.
 */
export function handleMcpCommand() {
  startMcpServer();
}

/**
 * Handle package.json creation and update.
 *
 * @param {Options} options
 */
export async function handlePackageJson(options: Options) {
  let needsSave = false;

  // Load or initialize a package.json
  let packageJson = PackageHelper.load();
  if (!packageJson) {
    const init = await query(
      '',
      `Generate ${chalk.bold('package.json')}?`,
      true,
      options
    );
    if (init) {
      packageJson = PackageHelper.init(options.title);
    } else {
      packageJson = new PackageHelper();
    }
    needsSave = true;
  }

  // Synchronize scripts
  console.log(`${chalk.green('\u2714')}`, 'Adding scripts...');
  const existingScripts = packageJson.getScripts();
  for (const [name, script] of Object.entries(CONFIG.scripts)) {
    if (name in existingScripts && existingScripts[name] !== script) {
      const replace = await query(
        `package.json already has a script for ${chalk.bold(name)}:\n` +
          `-${chalk.red(existingScripts[name])}\n+${chalk.green(script)}`,
        'Replace',
        false,
        options
      );
      if (replace) {
        packageJson.updateScript(name, script);
        needsSave = true;
      }
    } else {
      packageJson.updateScript(name, script);
      needsSave = true;
    }
  }

  // Write if changed
  if (needsSave) {
    console.log(`${chalk.green('\u2714')}`, 'Saving package.json...');
    await packageJson.save();
  }

  // Install dev dependencies
  console.log(`${chalk.green('\u2714')}`, 'Installing dependencies...');
  packageJson.installPackages(CONFIG.dependencies);
}

/**
 * Prompt user for text input.
 *
 * @param {string} message
 * @param {string} defaultVal
 * @param {Options} options
 * @returns {Promise<string>}
 */
async function queryText(
  message: string,
  defaultVal: string,
  options: Options
): Promise<string> {
  if (options.yes) {
    return defaultVal;
  }

  const response = await prompts({
    type: 'text',
    name: 'answer',
    message: `${message}:`,
    initial: defaultVal,
  });

  return response.answer;
}

/**
 * Prompt user for toggle input.
 *
 * @param {string} message
 * @param {string} question
 * @param {string} defaultVal
 * @param {Options} options
 * @returns {Promise<boolean>}
 */
async function query(
  message: string,
  question: string,
  defaultVal: boolean,
  options: Options
): Promise<boolean> {
  if (options.yes) {
    return true;
  } else if (options.no) {
    return false;
  }

  if (message) {
    console.log(message);
  }

  const answer = await prompts({
    type: 'toggle',
    name: 'result',
    message: question,
    initial: defaultVal,
    active: 'Yes',
    inactive: 'No',
  });

  return answer.result;
}

/**
 * Prompt user for selection from a list.
 *
 * @param {string} message
 * @param {{title: string, value: string}[]}
 * @param {string} defaultVal
 * @param {Options} options
 * @returns {Promise<string>}
 */
async function querySelect(
  message: string,
  choices: { title: string; value: string }[],
  defaultVal: string,
  options: Options
): Promise<string> {
  if (options.yes) {
    return 'none'; // Default to None if yes is passed
  }
  if (options.no) {
    return 'none';
  }

  const response = await prompts({
    type: 'select',
    name: 'value',
    message: message,
    choices: choices,
    initial: choices.findIndex(c => c.value === defaultVal),
  });

  return response.value;
}

/**
 * Read file.
 *
 * @param {string} path
 * @returns {Promise<string>}
 */
async function readFile(path: string): Promise<string | undefined> {
  try {
    return await fs.readFile(path, 'utf8');
  } catch (e) {
    const err = e as Error & { code?: string };
    if (err.code !== 'ENOENT') {
      throw new Error(`Unknown error reading ${path}: ${err.message}`);
    }
  }

  return undefined;
}

/**
 * Handle config merge.
 * Compares source and target config files and merges if required.
 *
 * @param {Options} options
 */
async function handleConfigMerge(options: Options) {
  for (const filename of Object.keys(CONFIG.filesMerge)) {
    const sourcePath = path.join(__dirname, '../../', filename);
    let sourceLines = (await readFile(sourcePath))?.split('\n');

    const targetFile = await readFile(CONFIG.filesMerge[filename]);
    const targetLines = targetFile?.split('\n') ?? [];

    const missingLines =
      sourceLines?.filter(item => targetLines.indexOf(item) === -1) ?? [];

    if (missingLines.length === 0) continue;

    if (targetFile !== undefined) {
      const message =
        `${chalk.bold(
          CONFIG.filesMerge[filename]
        )} already exists but is missing content\n` +
        missingLines.map(line => `+${chalk.green(line)}`).join('\n');

      const writeFile = await query(message, 'Merge', false, options);

      if (!writeFile) continue;
    }

    sourceLines = targetLines.concat(missingLines);

    await writeFileAtomic(
      CONFIG.filesMerge[filename],
      `${sourceLines.filter(item => item).join('\n')}\n`
    );
  }
}

/**
 * Handle config copy.
 *
 * @param {Options} options
 */
async function handleConfigCopy(options: Options) {
  for (const filename of Object.keys(CONFIG.filesCopy)) {
    try {
      const sourcePath = path.join(__dirname, '../../', filename);
      const source = await readFile(sourcePath);
      const target = await readFile(CONFIG.filesCopy[filename]);

      if (source === target || typeof source === 'undefined') continue;

      const writeFile = target
        ? await query(
            `${chalk.bold(CONFIG.filesCopy[filename])} already exists`,
            'Overwrite',
            false,
            options
          )
        : true;

      if (writeFile) {
        await writeFileAtomic(CONFIG.filesCopy[filename], source);
      }
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code !== 'ENOENT') {
        throw new Error(`Unknown error reading ${path}: ${err.message}`);
      }
    }
  }
}

/**
 * Handle putting template files in place.
 *
 * @param {Options} options
 */
async function handleTemplate(options: Options) {
  const cwd = process.cwd();
  let templates;
  if (options.ui) {
    templates = path.join(__dirname, '../../template-ui');
  } else {
    templates = path.join(__dirname, '../../template');
  }

  const items = await fs.readdir(templates);

  for (const item of items) {
    const sourcePath = path.join(templates, item);
    const targetPath = path.join(cwd, item);
    const stats = await fs.stat(sourcePath);

    if (stats.isDirectory()) {
      // Create folder if not exists
      await fs.ensureDir(targetPath);

      // Only install the template if no ts files exist in target directory.
      const files = await fs.readdir(targetPath);
      const tsFiles = files.filter((file: string) =>
        file.toLowerCase().endsWith('.ts')
      );

      if (tsFiles.length === 0) {
        console.log(
          `${chalk.green('\u2714')}`,
          `Installing ${item} template...`
        );
        await fs.copy(sourcePath, targetPath, {
          overwrite: false,
        });
      }
    } else {
      // It's a file
      if (item === '.clasp.json') return;

      if (!(await fs.pathExists(targetPath))) {
        console.log(`${chalk.green('\u2714')}`, `Copying ${item}...`);
        await fs.copy(sourcePath, targetPath);
      }
    }
  }
}

/**
 * Generate .clasp-*.json files from environment variables if they exist.
 * Reads from .env file if present.
 */
async function generateClaspConfigsFromEnv() {
  // Try to load .env file if it exists
  const envPath = path.join(process.cwd(), '.env');
  if (await fs.pathExists(envPath)) {
    const envContent = await fs.readFile(envPath, 'utf8');
    const envLines = envContent.split('\n');
    for (const line of envLines) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }

  const scriptIdDev = process.env.SCRIPT_ID_DEV?.trim();
  const scriptIdProd = process.env.SCRIPT_ID_PROD?.trim();

  if (scriptIdDev && scriptIdDev.length > 0) {
    const devConfig = {
      scriptId: scriptIdDev,
      rootDir: './dist',
    };
    await writeFileAtomic(
      '.clasp-dev.json',
      JSON.stringify(devConfig, null, 2)
    );
    debugLog('Generated .clasp-dev.json from SCRIPT_ID_DEV');
  }

  if (scriptIdProd && scriptIdProd.length > 0) {
    const prodConfig = {
      scriptId: scriptIdProd,
      rootDir: './dist',
    };
    await writeFileAtomic(
      '.clasp-prod.json',
      JSON.stringify(prodConfig, null, 2)
    );
    debugLog('Generated .clasp-prod.json from SCRIPT_ID_PROD');
  }
}

/**
 * Set up clasp.
 *
 * @param {Options} options
 */
async function handleClasp(options: Options) {
  const claspHelper = new ClaspHelper();

  await claspHelper.login();

  const claspConfigExists = await claspHelper.isConfigured();

  const overrideClasp = claspConfigExists
    ? await query('', 'Override existing clasp config?', false, options)
    : false;

  if (claspConfigExists && !overrideClasp) {
    // Still try to generate from env if available
    await generateClaspConfigsFromEnv();
    return;
  }

  const scriptIdDev = await queryText('Script ID (optional)', '', options);
  const scriptIdProd = await queryText(
    'Script ID for production environment (optional)',
    scriptIdDev,
    options
  );

  // Prepare clasp project environment
  if (scriptIdDev) {
    console.log(`${chalk.green('\u2714')}`, `Cloning ${scriptIdDev}...`);
    await claspHelper.cloneAndPull(scriptIdDev, scriptIdProd, 'dist');
  } else {
    console.log(`${chalk.green('\u2714')}`, `Creating ${options.title}...`);
    const res = await claspHelper.create(options.title, scriptIdProd, './dist');

    // Output URLs
    console.log();
    console.log('-> Google Sheets Link:', res.sheetLink);
    console.log('-> Apps Script Link:', res.scriptLink);
    console.log();
  }
}

/**
 * Handle environment initialization.
 */
export async function init(
  flags: {
    title: string | undefined;
    yes: boolean | undefined;
    no: boolean | undefined;
    setupGcp: boolean | undefined;
  } & Record<string, unknown>
) {
  const projectTitle =
    flags.title ??
    (await queryText('Project Title', 'Untitled', {
      yes: flags.yes,
      no: flags.no,
    } as Options));

  const options: Options = {
    yes: flags.yes || false,
    no: flags.no || false,
    title: projectTitle,
    ui: false,
    setupGcp: flags.setupGcp || false,
  };

  const uiFramework = await querySelect(
    'Create a UI?',
    [
      { title: 'None', value: 'none' },
      { title: 'Angular', value: 'angular' },
      { title: 'Svelte', value: 'svelte' },
    ],
    'none',
    options
  );

  if (uiFramework === 'angular') {
    CONFIG = configForAngular;
    options.ui = true;
    options.uiFramework = 'angular';
  } else if (uiFramework === 'svelte') {
    CONFIG = configForSvelte;
    options.ui = true;
    options.uiFramework = 'svelte';
  } else {
    CONFIG = config;
    options.ui = false;
  }

  // Handle package.json
  await handlePackageJson(options);

  // Handle config copy
  await handleConfigCopy(options);

  // Handle config merge
  await handleConfigMerge(options);

  // Handle template
  await handleTemplate(options);

  if (options.setupGcp) {
    console.log(`${chalk.green('\u2714')}`, 'Running GCP setup via MCP...');
    debugLog('Calling runMcpSetup() for GCP setup');
    try {
      await runMcpSetup({ title: options.title });
    } catch (e) {
      console.error(
        chalk.red('GCP Setup failed:'),
        e instanceof Error ? e.message : String(e)
      );
      // We don't exit process, allow init to continue (or fail if critical?)
      // Assuming we want to continue with other steps if possible, or user can Ctrl+C
    }
  }

  // Handle clasp
  try {
    await handleClasp(options);
  } catch (e) {
    console.error(
      chalk.yellow('Clasp setup encountered an issue:'),
      e instanceof Error ? e.message : String(e)
    );
    console.log(
      chalk.yellow(
        'Continuing with initialization. You can configure clasp manually later.'
      )
    );
  }

  // Ensure appsscript.json exists (copy from template if missing)
  if (!(await fs.pathExists('appsscript.json'))) {
    const templateAppsscript = path.join(
      __dirname,
      '../../template/appsscript.json'
    );
    if (await fs.pathExists(templateAppsscript)) {
      console.log(`${chalk.green('\u2714')}`, 'Copying appsscript.json...');
      await fs.copyFile(templateAppsscript, 'appsscript.json');
    }
  }

  // Generate .clasp-*.json from environment variables if available
  // This ensures they exist even if clasp create failed or was skipped
  await generateClaspConfigsFromEnv();

  // Ensure .clasp-dev.json and .clasp-prod.json exist (create placeholders if missing)
  if (!(await fs.pathExists('.clasp-dev.json'))) {
    console.log(
      chalk.yellow(
        'Note: .clasp-dev.json not found. Creating placeholder. Update SCRIPT_ID_DEV in .env and run init again.'
      )
    );
    const placeholderConfig = {
      scriptId: 'YOUR_SCRIPT_ID_HERE',
      rootDir: './dist',
    };
    await writeFileAtomic(
      '.clasp-dev.json',
      JSON.stringify(placeholderConfig, null, 2)
    );
  }

  if (!(await fs.pathExists('.clasp-prod.json'))) {
    const placeholderConfig = {
      scriptId: 'YOUR_SCRIPT_ID_HERE',
      rootDir: './dist',
    };
    await writeFileAtomic(
      '.clasp-prod.json',
      JSON.stringify(placeholderConfig, null, 2)
    );
  }

  if (options.ui) {
    console.log();
    console.log(
      `Make sure to run npm install to install all the ${
        options.uiFramework === 'angular' ? 'Angular' : 'Svelte'
      } UI dependencies`
    );
    console.log();
  }
}
