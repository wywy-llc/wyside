import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import cleanup from 'rollup-plugin-cleanup';
import prettier from 'rollup-plugin-prettier';
import typescript from 'rollup-plugin-typescript2';
import { fileURLToPath } from 'url';

// Get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Plugin to copy HTML files to dist directory
function copyHtmlFiles() {
  return {
    name: 'copy-html-files',

    // buildEnd: Called when bundle generation is complete, before files are written
    buildEnd() {
      const htmlFiles = [
        { src: 'src/index.html', name: 'index.html' },
        { src: 'src/email-dialog.html', name: 'email-dialog.html' },
      ];

      console.log('\n🌐 Processing HTML files for GAS deployment...');

      htmlFiles.forEach(({ src, name }) => {
        const srcPath = path.join(__dirname, src);

        if (!fs.existsSync(srcPath)) {
          console.warn(`  ⚠️  Warning: ${name} not found at ${srcPath}`);
          return;
        }

        try {
          const htmlContent = fs.readFileSync(srcPath, 'utf-8');

          // Emit as asset - Rollup will write it to output directory
          this.emitFile({
            type: 'asset',
            fileName: name,
            source: htmlContent,
          });

          console.log(
            `  ✅ Queued ${name} for output (${htmlContent.length} bytes)`
          );
        } catch (error) {
          console.error(`  ❌ Failed to process ${name}:`, error.message);
        }
      });
    },

    // generateBundle: Called after all files are generated
    generateBundle(_options, bundle) {
      const htmlCount = Object.keys(bundle).filter(fileName =>
        fileName.endsWith('.html')
      ).length;

      if (htmlCount > 0) {
        console.log(`\n📄 ${htmlCount} HTML file(s) will be written to dist/`);
      } else {
        console.warn(
          '\n⚠️  No HTML files found in bundle! GAS UI may not work.'
        );
      }
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
        console.warn(
          '⚠️  No exported functions detected. GAS triggers may not work.'
        );
        return null;
      }

      console.log(
        `✅ Auto-detected ${functions.length} exported functions:`,
        functions.join(', ')
      );

      // Step 2a: Wrap IIFE with variable assignment
      let wrappedCode = code.replace(
        /^\(function\s*\(\)\s*\{/,
        'var WysideApp = (function() {'
      );

      // Step 2b: Generate return object dynamically based on detected exports
      const returnObject = functions
        .map(name => `    ${name}: ${name},`)
        .join('\n');
      const returnStatement = `
  // Auto-generated API object from exported functions
  return {
${returnObject}
  };
})();`;

      // Step 2c: Generate global function declarations
      const globalFunctions = functions
        .map(name => {
          return `
/**
 * Auto-generated GAS global wrapper for ${name}
 * Delegates to WysideApp.${name}
 */
function ${name}() {
  return WysideApp.${name}.apply(this, arguments);
}`;
        })
        .join('\n');

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
    // Copy HTML files to dist (must be last to ensure all files are processed)
    copyHtmlFiles(),
  ],
  context: 'this',
};
