#!/usr/bin/env node
/**
 * Copyright 2025 wywy LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * you may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import spawn from 'cross-spawn';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import writeFileAtomic from 'write-file-atomic';

const debugLog = (...args: unknown[]) => {
  const enabled =
    process.env.WYSIDE_DEBUG === '1' ||
    process.env.WYSIDE_DEBUG?.toLowerCase() === 'true';

  if (enabled) {
    // eslint-disable-next-line no-console
    console.log('[wyside:debug]', ...args);
  }
};

/**
 * Helper class to wrap clasp utilities.
 */
export class ClaspHelper {
  /**
   * Check if ~/.clasprc.json exists.
   *
   * @returns {Promise<boolean>}
   */
  private async isLoggedIn() {
    return await fs.exists(path.join(os.homedir(), '.clasprc.json'));
  }

  /**
   * Perform 'clasp login'.
   */
  async login() {
    const loggedIn = await this.isLoggedIn();

    debugLog('clasp login check', { loggedIn });

    if (!loggedIn) {
      spawn.sync('npx', ['clasp', 'login'], { stdio: 'inherit' });
    }
  }

  /**
   * Check if clasp is already set up.
   *
   * @returns {Promise<boolean>}
   */
  async isConfigured() {
    const configured =
      (await fs.exists('.clasp-dev.json')) ||
      (await fs.exists(path.join('dist', '.clasp.json')));

    debugLog('clasp configured check', { configured });

    return configured;
  }

  /**
   * Remove all clasp related artifacts (e.g. for re-install).
   *
   * @param {string} rootDir
   */
  async clean(rootDir: string) {
    debugLog('clean clasp artifacts', { rootDir });
    // Remove all clasp project artifacts
    await fs.rm(path.join(rootDir, '.clasp.json'), {
      recursive: true,
      force: true,
    });
    await fs.rm('appsscript.json', { force: true });
    await fs.rm('.clasp.json', { force: true });
    await fs.rm('.clasp-dev.json', { force: true });
    await fs.rm('.clasp-prod.json', { force: true });

    // Make sure root dir exists
    await fs.mkdirs(rootDir);
  }

  /**
   * Extract Google Sheets link from 'clasp create' output.
   * @param {string} output
   * @returns {string}
   */
  extractSheetsLink(output: string) {
    const sheetsLink = output.match(
      /Created new (?:google\s+)?(?:document|spreadsheet|sheet)s?(?: file)?:\s*([^\s,]+)/i
    );

    return sheetsLink?.length ? sheetsLink[1] : 'Not found';
  }

  /**
   * Extract Google Apps Script link from 'clasp create' output.
   * @param {string} output
   * @returns {string}
   */
  extractScriptLink(output: string) {
    const scriptLink = output.match(
      /Created new (?:google\s+)?(?:apps\s+script\s+project|script|project):\s*([^\s,]+)/i
    );

    return scriptLink?.length ? scriptLink[1] : 'Not found';
  }

  /**
   * Perform 'clasp create'.
   *
   * @param {string} title
   * @param {string} scriptIdProd
   * @param {string} rootDir
   * @returns {Promise<{sheetLink: string, scriptLink: string}>}
   */
  async create(title: string, scriptIdProd: string, rootDir: string) {
    await this.clean(rootDir);

    debugLog('clasp create start', {
      title,
      rootDir,
      scriptIdProd: scriptIdProd ? '(provided)' : '(none)',
    });

    const res = spawn.sync(
      'npx',
      [
        'clasp',
        'create',
        '--type',
        'sheets',
        '--rootDir',
        rootDir,
        '--title',
        title,
      ],
      { encoding: 'utf-8' }
    );

    debugLog('clasp create result', {
      status: res.status,
      error: res.error?.message,
      stdout: res.stdout,
      stderr: res.stderr,
    });

    if (res.error) {
      throw res.error;
    }

    const output = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim();
    if (res.status !== 0) {
      throw new Error(
        output || `clasp create-script failed with status ${res.status}`
      );
    }

    const claspPathDist = path.join(rootDir, '.clasp.json');
    const claspPathRoot = '.clasp.json';
    const appsscriptPath = path.join(rootDir, 'appsscript.json');
    const claspExistsDist = await fs.pathExists(claspPathDist);
    const claspExistsRoot = await fs.pathExists(claspPathRoot);
    const appsscriptExists = await fs.pathExists(appsscriptPath);
    const claspExists = claspExistsDist || claspExistsRoot;

    debugLog('clasp create artifacts', {
      claspExistsDist,
      claspExistsRoot,
      appsscriptExists,
      output,
    });

    if (!claspExists || !appsscriptExists) {
      throw new Error(
        `clasp create-script did not produce ${
          claspExists ? '' : '.clasp.json '
        }${appsscriptExists ? '' : 'appsscript.json '}${
          output ? `\n${output}` : ''
        }`
      );
    }

    // Copy clasp config to project root so arrangeFiles can move it.
    if (claspExistsDist) {
      await fs.copyFile(claspPathDist, claspPathRoot);
    }

    await this.arrangeFiles(rootDir, scriptIdProd);

    // Extract URLs from output
    const outputForLinks = res.output.join();

    return {
      sheetLink: this.extractSheetsLink(outputForLinks),
      scriptLink: this.extractScriptLink(outputForLinks),
    };
  }

  /**
   * Put files in their designated place after (e.g. after create or clone).
   *
   * @param {string} rootDir
   * @param {?string} scriptIdProd
   */
  async arrangeFiles(rootDir: string, scriptIdProd?: string) {
    const rootClaspPath = '.clasp.json';
    const distClaspPath = path.join(rootDir, '.clasp.json');
    const rootExists = await fs.pathExists(rootClaspPath);

    debugLog('arrangeFiles start', {
      rootDir,
      rootExists,
      distClaspPath,
      scriptIdProd: scriptIdProd ? '(provided)' : '(none)',
    });
    if (!rootExists) {
      const distExists = await fs.pathExists(distClaspPath);

      debugLog('arrangeFiles missing root .clasp.json', { distExists });

      if (distExists) {
        await fs.copyFile(distClaspPath, rootClaspPath);
      } else {
        throw new Error(
          `Missing .clasp.json in ${rootDir} and project root. Please re-run init or clasp create.`
        );
      }
    }

    const appsscriptPath = path.join(rootDir, 'appsscript.json');
    const appsscriptExists = await fs.pathExists(appsscriptPath);

    debugLog('arrangeFiles appsscript check', {
      appsscriptPath,
      appsscriptExists,
    });

    if (!appsscriptExists) {
      throw new Error(
        `Missing appsscript.json in ${rootDir}. clasp create or pull may have failed.`
      );
    }

    await fs.move(rootClaspPath, '.clasp-dev.json', { overwrite: true });

    await fs.move(appsscriptPath, 'appsscript.json', { overwrite: true });

    if (scriptIdProd) {
      await this.writeConfig(scriptIdProd, rootDir, '.clasp-prod.json');
    } else {
      await fs.copyFile('.clasp-dev.json', '.clasp-prod.json');
    }
  }

  /**
   * Perform 'clasp clone' and 'clasp pull'.
   * @param {string} scriptIdDev
   * @param {string} scriptIdProd
   * @param {string} rootDir
   */
  async cloneAndPull(
    scriptIdDev: string,
    scriptIdProd: string,
    rootDir: string
  ) {
    debugLog('cloneAndPull start', {
      scriptIdDev: scriptIdDev ? '(provided)' : '(missing)',
      scriptIdProd: scriptIdProd ? '(provided)' : '(missing)',
      rootDir,
    });
    await this.clean(rootDir);

    // Write .clasp.json
    await this.writeConfig(scriptIdDev, rootDir);

    // Copy .clasp.json to clasp root dir
    await fs.copyFile('.clasp.json', path.join(rootDir, '.clasp.json'));

    spawn.sync('npx', ['clasp', 'clone'], { stdio: 'inherit' });
    spawn.sync('npx', ['clasp', 'pull'], { stdio: 'inherit' });

    // Copy/Move files to their designated place
    await this.arrangeFiles(rootDir, scriptIdProd);
  }

  /**
   * Generate and write clasp config.
   *
   * @param {string} scriptId
   * @param {string} rootDir
   * @param {string=} filename
   */
  async writeConfig(
    scriptId: string,
    rootDir: string,
    filename: string | undefined = '.clasp.json'
  ) {
    debugLog('writeConfig', {
      filename,
      rootDir,
      scriptId: scriptId ? '(provided)' : '(missing)',
    });
    const claspConfig = {
      scriptId: scriptId,
      rootDir: rootDir,
    };

    await writeFileAtomic(filename, JSON.stringify(claspConfig));
  }
}
