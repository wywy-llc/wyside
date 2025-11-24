import spawn from 'cross-spawn';
import * as fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClaspHelper } from '../src/clasp-helper';

vi.mock('fs-extra', () => {
  const exists = vi.fn();
  const pathExists = vi.fn<() => Promise<boolean>>();
  const rm = vi.fn();
  const mkdirs = vi.fn();
  const move = vi.fn();
  const copyFile = vi.fn();
  const readFile = vi.fn();
  return {
    default: { exists, pathExists, rm, mkdirs, move, copyFile, readFile },
    exists,
    pathExists,
    rm,
    mkdirs,
    move,
    copyFile,
    readFile,
  };
});

describe('clasp-helper', () => {
  const claspHelper = new ClaspHelper();
  const pathExistsMock = vi.mocked(
    fs.pathExists as unknown as (path: string) => Promise<boolean>
  );

  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    pathExistsMock.mockReset();
  });

  describe('isLoggedIn', () => {
    it('returns not logged in if clasprc does not exist', async () => {
      vi.mocked(fs.exists).mockImplementationOnce(async () => {
        return false;
      });

      const res = await claspHelper['isLoggedIn']();

      expect(res).toBe(false);
    });

    it('returns logged in if clasprc exists', async () => {
      vi.mocked(fs.exists).mockImplementationOnce(async () => {
        return true;
      });

      const res = await claspHelper['isLoggedIn']();

      expect(res).toBe(true);
    });
  });

  describe('login', () => {
    it('does clasp login if not logged in', async () => {
      const spawnSyncSpy = vi.spyOn(spawn, 'sync').mockImplementation(() => {
        return {
          status: 0,
          output: [],
          pid: 0,
          signal: null,
          stdout: '',
          stderr: '',
        };
      });

      // @ts-expect-error Testing private method
      vi.spyOn(claspHelper, 'isLoggedIn').mockReturnValue(false);

      await claspHelper.login();

      expect(spawnSyncSpy).toHaveBeenCalledWith('npx', ['clasp', 'login'], {
        stdio: 'inherit',
      });
    });

    it('does nothing if already logged in', async () => {
      const spawnSyncSpy = vi.spyOn(spawn, 'sync').mockImplementation(() => {
        return {
          status: 0,
          output: [],
          pid: 0,
          signal: null,
          stdout: '',
          stderr: '',
        };
      });

      // @ts-expect-error Testing private method
      vi.spyOn(claspHelper, 'isLoggedIn').mockImplementationOnce(async () => {
        return true;
      });

      await claspHelper.login();

      expect(spawnSyncSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('isConfigured', () => {
    it('returns false if config files do not exist', async () => {
      vi.mocked(fs.exists).mockImplementation(async () => {
        return false;
      });

      const res = await claspHelper.isConfigured();

      expect(res).toBe(false);
    });

    it('returns true if config files exist', async () => {
      vi.mocked(fs.exists).mockImplementationOnce(async () => {
        return false;
      });
      vi.mocked(fs.exists).mockImplementationOnce(async () => {
        return true;
      });

      const res = await claspHelper.isConfigured();

      expect(res).toBe(true);
    });
  });

  describe('clean', () => {
    it('removes all config files and creates root dir', async () => {
      const fsRmSpy = vi.mocked(fs.rm).mockImplementation(async () => {});
      const fsMkdirsSpy = vi
        .mocked(fs.mkdirs)
        .mockImplementation(async () => {});

      await claspHelper.clean('rootDir');

      expect(fsRmSpy).toHaveBeenCalledWith('rootDir/.clasp.json', {
        force: true,
        recursive: true,
      });
      expect(fsRmSpy).toHaveBeenCalledWith('appsscript.json', {
        force: true,
      });
      expect(fsRmSpy).toHaveBeenCalledWith('.clasp.json', {
        force: true,
      });
      expect(fsRmSpy).toHaveBeenCalledWith('.clasp-dev.json', {
        force: true,
      });
      expect(fsRmSpy).toHaveBeenCalledWith('.clasp-prod.json', {
        force: true,
      });
      expect(fsMkdirsSpy).toHaveBeenCalledWith('rootDir');
    });
  });

  describe('extractSheetsLink', () => {
    it('returns "Not found" if no sheets link', () => {
      const res = claspHelper.extractSheetsLink('');

      expect(res).toEqual('Not found');
    });

    it('extracts sheets link when clasp reports spreadsheet', () => {
      const output =
        'Created new spreadsheet: https://docs.google.com/spreadsheets/abc123/edit';

      const res = claspHelper.extractSheetsLink(output);

      expect(res).toEqual('https://docs.google.com/spreadsheets/abc123/edit');
    });

    it('extracts sheets link when clasp reports Google Sheet', () => {
      const output =
        'Created new Google Sheet: https://docs.google.com/spreadsheets/abc123/edit';

      const res = claspHelper.extractSheetsLink(output);

      expect(res).toEqual('https://docs.google.com/spreadsheets/abc123/edit');
    });
  });

  describe('extractScriptLink', () => {
    it('returns "Not found" if no script link', () => {
      const res = claspHelper.extractScriptLink('');

      expect(res).toEqual('Not found');
    });

    it('extracts script link', () => {
      const output = 'Created new script: https://drive.google.com/abc123';

      const res = claspHelper.extractScriptLink(output);

      expect(res).toEqual('https://drive.google.com/abc123');
    });

    it('extracts script link when clasp reports Google Sheets Add-on script', () => {
      const output =
        'Created new Google Sheets Add-on script: https://script.google.com/addon123';

      const res = claspHelper.extractScriptLink(output);

      expect(res).toEqual('https://script.google.com/addon123');
    });
  });

  describe('arrangeFiles', () => {
    it('arranges files appropriately with no scriptIdProd', async () => {
      const fsMoveSpy = vi.mocked(fs.move).mockImplementation(async () => {});
      const fsCopyFileSpy = vi
        .mocked(fs.copyFile)
        .mockImplementation(async () => {});
      pathExistsMock.mockResolvedValue(true);

      await claspHelper.arrangeFiles('rootDir');

      expect(fsMoveSpy).toHaveBeenCalledWith('.clasp.json', '.clasp-dev.json', {
        overwrite: true,
      });

      expect(fsMoveSpy).toHaveBeenCalledWith(
        'rootDir/appsscript.json',
        'appsscript.json',
        { overwrite: true }
      );

      expect(fsCopyFileSpy).toHaveBeenCalledWith(
        '.clasp-dev.json',
        '.clasp-prod.json'
      );
    });

    it('copies .clasp.json from rootDir when missing in root', async () => {
      const fsMoveSpy = vi.mocked(fs.move).mockImplementation(async () => {});
      const fsCopyFileSpy = vi
        .mocked(fs.copyFile)
        .mockImplementation(async () => {});
      pathExistsMock
        .mockResolvedValueOnce(false) // root .clasp.json missing
        .mockResolvedValueOnce(true) // dist/.clasp.json exists
        .mockResolvedValue(true); // appsscript move path check

      await claspHelper.arrangeFiles('rootDir');

      expect(fsCopyFileSpy).toHaveBeenCalledWith(
        'rootDir/.clasp.json',
        '.clasp.json'
      );
      expect(fsMoveSpy).toHaveBeenCalledWith('.clasp.json', '.clasp-dev.json', {
        overwrite: true,
      });
    });

    it('skips copying when .clasp.json already exists in root', async () => {
      const fsMoveSpy = vi.mocked(fs.move).mockImplementation(async () => {});
      const fsCopyFileSpy = vi.mocked(fs.copyFile);
      pathExistsMock
        .mockResolvedValueOnce(true) // root .clasp.json exists
        .mockResolvedValue(true); // appsscript move path check

      await claspHelper.arrangeFiles('rootDir');

      expect(fsCopyFileSpy).toHaveBeenCalledTimes(1);
      expect(fsCopyFileSpy).toHaveBeenCalledWith(
        '.clasp-dev.json',
        '.clasp-prod.json'
      );
      expect(fsMoveSpy).toHaveBeenCalledWith('.clasp.json', '.clasp-dev.json', {
        overwrite: true,
      });
    });

    it('arranges files appropriately with scriptIdProd', async () => {
      vi.mocked(fs.move).mockImplementation(async () => {});
      const writeConfigSpy = vi
        .spyOn(claspHelper, 'writeConfig')
        .mockImplementation(async () => {});
      pathExistsMock.mockResolvedValue(true);

      await claspHelper.arrangeFiles('rootDir', 'abc123');

      expect(writeConfigSpy).toHaveBeenCalledWith(
        'abc123',
        'rootDir',
        '.clasp-prod.json'
      );
    });
  });

  describe('cloneAndPull', () => {
    it('calls clasp clone and clasp pull', async () => {
      const spawnSyncSpy = vi.spyOn(spawn, 'sync').mockImplementation(() => {
        return {
          status: 0,
          output: [],
          pid: 0,
          signal: null,
          stdout: '',
          stderr: '',
        };
      });
      const cleanSpy = vi
        .spyOn(claspHelper, 'clean')
        .mockImplementation(async () => {});
      const writeConfigSpy = vi
        .spyOn(claspHelper, 'writeConfig')
        .mockImplementation(async () => {});
      const arrangeFilesSpy = vi
        .spyOn(claspHelper, 'arrangeFiles')
        .mockImplementation(async () => {});

      await claspHelper.cloneAndPull('1', '2', 'rootDir');

      expect(cleanSpy).toHaveBeenCalledWith('rootDir');
      expect(writeConfigSpy).toHaveBeenCalledWith('1', 'rootDir');
      expect(spawnSyncSpy).toHaveBeenCalledWith('npx', ['clasp', 'clone'], {
        stdio: 'inherit',
      });
      expect(spawnSyncSpy).toHaveBeenCalledWith('npx', ['clasp', 'pull'], {
        stdio: 'inherit',
      });
      expect(arrangeFilesSpy).toHaveBeenCalledWith('rootDir', '2');
    });
  });

  describe('create', () => {
    it('copies clasp config from rootDir and returns links', async () => {
      const spawnSyncSpy = vi.spyOn(spawn, 'sync').mockImplementation(() => ({
        status: 0,
        stdout:
          'Created new document: https://sheets\nCreated new script: https://script',
        stderr: '',
        output: [
          '',
          'Created new document: https://sheets',
          'Created new script: https://script',
        ],
        pid: 0,
        signal: null,
      }));
      pathExistsMock
        .mockResolvedValueOnce(true) // dist/.clasp.json
        .mockResolvedValueOnce(false) // .clasp.json root
        .mockResolvedValueOnce(true) // dist/appsscript.json
        .mockResolvedValue(true);
      const copySpy = vi.mocked(fs.copyFile).mockImplementation(async () => {});
      const arrangeSpy = vi
        .spyOn(claspHelper, 'arrangeFiles')
        .mockImplementation(async () => {});

      const res = await claspHelper.create('title', '', 'dist');

      expect(spawnSyncSpy).toHaveBeenCalledWith(
        'npx',
        [
          'clasp',
          'create',
          '--type',
          'sheets',
          '--rootDir',
          'dist',
          '--title',
          'title',
        ],
        { encoding: 'utf-8' }
      );
      expect(copySpy).toHaveBeenCalledWith('dist/.clasp.json', '.clasp.json');
      expect(arrangeSpy).toHaveBeenCalledWith('dist', '');
      expect(res.sheetLink).toContain('https://sheets');
      expect(res.scriptLink).toContain('https://script');
    });

    it('waits for arrangeFiles to finish when no prod scriptId is provided', async () => {
      vi.spyOn(spawn, 'sync').mockImplementation(() => ({
        status: 0,
        stdout:
          'Created new document: https://sheets\nCreated new script: https://script',
        stderr: '',
        output: [
          '',
          'Created new document: https://sheets',
          'Created new script: https://script',
        ],
        pid: 0,
        signal: null,
      }));
      pathExistsMock
        .mockResolvedValueOnce(true) // dist/.clasp.json
        .mockResolvedValueOnce(false) // .clasp.json root
        .mockResolvedValueOnce(true) // dist/appsscript.json
        .mockResolvedValue(true);
      vi.mocked(fs.copyFile).mockResolvedValue();
      let arrangeFinished = false;
      vi.spyOn(claspHelper, 'arrangeFiles').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
        arrangeFinished = true;
      });

      await claspHelper.create('title', '', 'dist');

      expect(arrangeFinished).toBe(true);
    });

    it('throws when clasp create does not emit clasp/appsscript files', async () => {
      vi.spyOn(spawn, 'sync').mockImplementation(() => ({
        status: 0,
        stdout: '',
        stderr: '',
        output: [],
        pid: 0,
        signal: null,
      }));
      pathExistsMock.mockResolvedValue(false);

      await expect(claspHelper.create('title', '', 'dist')).rejects.toThrow(
        /did not produce/i
      );
    });
  });
});
