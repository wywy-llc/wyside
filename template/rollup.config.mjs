import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import dotenv from 'dotenv';
import { babel } from '@rollup/plugin-babel';
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

// Plugin to automatically detect exported functions and expose them to GAS global scope
function exposeGasFunctions() {
  const exportedFunctions = new Set();

  return {
    name: 'expose-gas-functions',

    // Step 1: Scan source files to detect exported functions
    transform(code, id) {
      // Only process main.ts - the entry point for GAS
      // This prevents detecting helper functions from other modules
      if (!id.endsWith('/main.ts')) {
        return null;
      }

      // Detect exported functions with various patterns:
      // - export function name() { ... }
      // - export async function name() { ... }
      const exportPatterns = [
        /export\s+function\s+(\w+)\s*\(/g,
        /export\s+async\s+function\s+(\w+)\s*\(/g,
      ];

      exportPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(code)) !== null) {
          exportedFunctions.add(match[1]);
        }
      });

      return null; // Don't modify the code in transform phase
    },

    // Step 2: Modify the final bundled code
    renderChunk(code) {
      // Convert Set to sorted array for consistent output
      const functions = Array.from(exportedFunctions).sort();

      if (functions.length === 0) {
        console.warn('⚠️  No exported functions detected. GAS triggers may not work.');
        return null;
      }

      console.log(`✅ Auto-detected ${functions.length} exported functions:`, functions.join(', '));

      // Step 2a: Wrap IIFE with variable assignment
      let wrappedCode = code.replace(
        /^\(function\s*\(\)\s*\{/,
        'var WysideApp = (function() {'
      );

      // Step 2b: Generate return object dynamically based on detected exports
      const returnObject = functions.map(name => `    ${name}: ${name},`).join('\n');
      const returnStatement = `
  // Auto-generated API object from exported functions
  return {
${returnObject}
  };
})();`;

      // Step 2c: Generate global function declarations
      const globalFunctions = functions.map(name => {
        return `
/**
 * Auto-generated GAS global wrapper for ${name}
 * Delegates to WysideApp.${name}
 */
function ${name}() {
  return WysideApp.${name}.apply(this, arguments);
}`;
      }).join('\n');

      // Step 2d: Remove CommonJS exports (if any)
      wrappedCode = wrappedCode.replace(/\s+exports\.\w+\s*=\s*\w+;/g, '');

      // Step 2e: Replace IIFE closing with return + global functions
      wrappedCode = wrappedCode.replace(
        /return exports;\s*\}\)\(\{?\}?\);[\s]*$/,
        returnStatement + '\n' + globalFunctions + '\n'
      );

      return { code: wrappedCode, map: null };
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
    // Transpile modern syntax (e.g., class fields) for GAS runtime compatibility
    babel({
      babelHelpers: 'bundled',
      extensions: ['.ts', '.js'],
      include: ['src/**/*', 'node_modules/hono/**'],
      presets: [
        [
          '@babel/preset-env',
          {
            targets: { esmodules: false },
            bugfixes: true,
          },
        ],
      ],
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
    // Expose GAS functions to global scope (must be before prettier)
    exposeGasFunctions(),
    prettier({ parser: 'typescript' }),
  ],
  context: 'this',
};
