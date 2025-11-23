import cleanup from 'rollup-plugin-cleanup';
import prettier from 'rollup-plugin-prettier';
import typescript from 'rollup-plugin-typescript2';
import replace from '@rollup/plugin-replace';
import dotenv from 'dotenv';

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
        .replace(/import\s+{\s*google\s+as\s+googleApi\s*}\s+from\s+['"]googleapis['"];?/g, '')
        .replace(/import\s+path\s+from\s+['"]path['"];?/g, '')
        .replace(/import\s+{\s*GoogleAuth\s*}\s+from\s+['"]google-auth-library['"];?/g, '');

      // Remove Node.js-only methods (private node* methods)
      transformed = transformed.replace(
        /private\s+async\s+node[A-Za-z]+\([^)]*\)\s*:\s*Promise<[^>]+>\s*{[^}]*}/gs,
        ''
      );

      // Remove getNodeAuth method
      transformed = transformed.replace(
        /private\s+async\s+getNodeAuth\(\)\s*{[\s\S]*?^\s*}/gm,
        ''
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
    typescript({
      tsconfig: 'tsconfig.json',
      exclude: ['test/**/*', '**/*.test.ts'],
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
