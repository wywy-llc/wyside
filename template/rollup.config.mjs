import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import dotenv from 'dotenv';
import cleanup from 'rollup-plugin-cleanup';
import prettier from 'rollup-plugin-prettier';
import typescript from 'rollup-plugin-typescript2';

// Load environment variables from .env
dotenv.config();

// Custom plugin to remove Node.js-only code blocks for GAS deployment
function removeNodeCode() {
  return {
    name: 'remove-node-code',
    transform(code, id) {
      if (!id.endsWith('.ts') && !id.endsWith('.js')) return null;

      // Remove Node.js-specific imports
      let transformed = code
        .replace(
          /import\s+{\s*google\s+as\s+googleApi\s*}\s+from\s+['"]googleapis['"];?/g,
          ''
        )
        .replace(/import\s+path\s+from\s+['"]path['"];?/g, '')
        .replace(
          /import\s+{\s*GoogleAuth\s*}\s+from\s+['"]google-auth-library['"];?/g,
          ''
        )
        .replace(
          /import\s+{\s*serve\s*}\s+from\s+['"]@hono\/node-server['"];?/g,
          ''
        )
        .replace(/import\s+{\s*config\s*}\s+from\s+['"]dotenv['"];?/g, '');

      // Remove server.ts specific code
      if (id.includes('server.ts')) {
        return { code: '', map: null };
      }

      // Remove Node.js environment code block in getAuthToken
      transformed = transformed.replace(
        /\/\/ Node\.js環境: Service Account認証[\s\S]*?return this\.authToken;[\s\S]*?}/g,
        '// Node.js環境: Service Account認証\n      throw new Error("Node.js authentication not available in GAS");\n    }'
      );

      return { code: transformed, map: null };
    },
  };
}

// Determine environment (prod or dev)
const isProduction = process.env.NODE_ENV === 'production';
const suffix = isProduction ? 'PROD' : 'DEV';

// Build spreadsheet ID map from environment variables
const spreadsheetIdMap = {};
for (let i = 1; i <= 5; i++) {
  const key = `APP_SPREADSHEET_ID_${i}_${suffix}`;
  const id = process.env[key];
  if (id && id.trim()) {
    spreadsheetIdMap[i] = id.trim();
  }
}

const spreadsheetIdMapJson = JSON.stringify(spreadsheetIdMap);

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/main.gs',
    format: 'iife',
    name: 'WysideApp',
  },
  plugins: [
    // Resolve Node modules (Hono等)
    nodeResolve({
      preferBuiltins: false,
      browser: true,
    }),
    commonjs(),
    typescript({
      tsconfig: 'tsconfig.json',
      exclude: ['test/**/*', '**/*.test.ts', 'src/server.ts'],
    }),
    // Remove Node.js-only code for GAS deployment
    removeNodeCode(),
    // Replace environment variables at build time (must run after TypeScript)
    replace({
      preventAssignment: true,
      delimiters: ['', ''],
      values: {
        "'__BUILD_SPREADSHEET_ID_MAP__'": spreadsheetIdMapJson,
      },
    }),
    cleanup({ comments: 'none', extensions: ['.ts', '.js'] }),
    prettier({ parser: 'typescript' }),
  ],
  context: 'this',
};
