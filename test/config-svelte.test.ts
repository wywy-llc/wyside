import { describe, expect, it } from 'vitest';
import { configForSvelte } from '../src/config';

describe('configForSvelte', () => {
  it('should have fs-extra for deploy-ui.mjs', () => {
    // Check if any dependency string starts with "fs-extra"
    const hasFsExtra = configForSvelte.dependencies.some(dep =>
      dep.startsWith('fs-extra')
    );
    expect(hasFsExtra).toBe(true);
  });

  it('should have correct scripts', () => {
    expect(configForSvelte.scripts['serve-ui']).toBe(
      'cd src/ui && npm run dev'
    );

    expect(configForSvelte.scripts['deploy-ui']).toBe(
      'node deploy-ui.mjs src/ui/dist'
    );

    expect(configForSvelte.scripts['preinstall']).toBe('node setup-svelte.mjs');
  });

  it('should have deploy-ui.mjs in filesCopy', () => {
    expect(configForSvelte.filesCopy['deploy-ui.mjs']).toBe('deploy-ui.mjs');

    expect(configForSvelte.filesCopy['setup-svelte.mjs']).toBe(
      'setup-svelte.mjs'
    );
  });
});
