# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**wyside** is an Apps Script IDE framework that enables modern TypeScript development for Google Apps Script projects. It's a CLI tool that scaffolds and initializes projects with comprehensive tooling including TypeScript compilation, testing, linting, and deployment automation via Google Clasp.

- **Entry point**: `npx @wywyjp/wyside init` (CLI command)
- **Architecture**: Project scaffolding tool, not a runtime framework
- **Node.js**: Requires version 22+
- **License**: Apache-2.0

## Development Commands

### Build and Development
```bash
# Clean build artifacts
npm run clean

# Run tests (Vitest)
npm test

# Lint and auto-fix (includes license header check)
npm run lint

# Full build (clean → lint → TypeScript compilation → copy files)
npm run build
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode (Vitest UI)
npx vitest --ui

# Run specific test file
npx vitest test/clasp-helper.test.ts
```

### Development Workflow
```bash
# 1. Make changes to src/ files
# 2. Run tests
npm test

# 3. Lint and build
npm run build

# 4. Test CLI locally (after build)
node dist/src/index.js init --help
```

## Source Code Architecture

### Core Components (`src/`)

The codebase follows a **modular helper pattern** with clear separation of concerns:

1. **index.ts** - CLI entry point
   - Uses `meow` for CLI argument parsing
   - Routes to `app.init()` for the `init` command
   - Handles flags: `--title`, `--yes`, `--no`, `--script-dev`, `--script-prod`

2. **app.ts** - Main orchestration logic (~452 lines)
   - `init()` - Orchestrates project initialization workflow
   - Sequential handlers:
     - `handlePackageJson()` - Creates/updates package.json with scripts and dependencies
     - `handleConfigCopy()` - Copies static config files
     - `handleConfigMerge()` - Merges .gitignore, .claspignore files (append-only)
     - `handleTemplate()` - Copies template source code
     - `handleClasp()` - Authenticates and sets up Google Apps Script project
   - Prompt functions: `query()`, `queryText()`, `querySelect()`

3. **config.ts** - Configuration templates (~200 lines)
   - Three configuration variants:
     - `config` - Base (no UI framework)
     - `configForAngular` - Angular + Material setup
     - `configForSvelte` - Svelte + Tailwind CSS setup
   - Each config defines: dependencies, npm scripts, files to copy/merge

4. **clasp-helper.ts** - Google Clasp integration (~325 lines)
   - `login()` - Google authentication
   - `create()` - Create new Apps Script project
   - `cloneAndPull()` - Clone existing Apps Script project
   - `extractScriptLink()` / `extractSheetsLink()` - Parse URLs from clasp output
   - Debug mode: Set `WYSIDE_DEBUG=1` environment variable for verbose logging

5. **package-helper.ts** - package.json manipulation (~257 lines)
   - `load()` / `init()` - Load or create package.json
   - `installPackages()` - Runs npm install with dependency diffing
   - `updateScript()` - Updates npm scripts
   - `save()` - Atomically writes package.json using `write-file-atomic`

6. **compare.ts** - Set comparison utility (~120 lines)
   - `SetComparison` class for efficient set operations
   - Used for dependency diffing to avoid redundant npm installs

### Data Flow

```
User: npx @wywyjp/wyside init
  ↓
index.ts (CLI parsing)
  ↓
app.init() (Orchestration)
  ├─→ config.ts (Select configuration)
  ├─→ package-helper.ts (Manage package.json & npm install)
  ├─→ clasp-helper.ts (Google authentication & project setup)
  └─→ compare.ts (Dependency diffing)
```

## Testing Architecture

### Test Files (`test/`)
- **compare.test.ts** - Tests SetComparison utility
- **clasp-helper.test.ts** - Tests Google Clasp operations (with fs-extra mocks)
- **package-helper.test.ts** - Tests npm package management
- **config-svelte.test.ts** - Tests Svelte configuration

### Mocking Strategy
- Uses Vitest's `vi.mock()` for external dependencies
- Key mocks: `fs-extra`, `cross-spawn`
- Test files include mocks in `__mocks__/` directory structure

### Test Coverage
Tests focus on:
- Core helper logic (package management, clasp integration)
- Configuration generation
- Set-based dependency comparison
- File operations (mocked to avoid filesystem side effects)

## Build System

### TypeScript Compilation
- **Config**: `tsconfig.json`
- **Target**: ES2020
- **Module**: ES2020 (ESM)
- **Strict mode**: Enabled
- **Output**: `dist/` directory

### Rollup Build Pipeline
```
src/index.ts
  ↓ (cleanup plugin - remove comments)
  ↓ (license plugin - add Apache 2.0 header)
  ↓ (typescript plugin - compile)
  ↓ (prettier plugin - format)
  ↓
dist/src/index.js (ESM)
```

### Code Quality
- **ESLint**: TypeScript-aware linting with Prettier integration
- **Prettier**: Code formatting (enforced as ESLint error)
- **License headers**: Automatically added to all source files

## Important Patterns and Conventions

### 1. Atomic File Operations
- All file writes use `write-file-atomic` to prevent corruption
- Critical for package.json updates during concurrent npm operations

### 2. Configuration Merging Strategy
- **filesCopy**: Overwrite if different (e.g., `.eslintrc.json`)
- **filesMerge**: Append missing lines only (e.g., `.gitignore`, `.claspignore`)
- Preserves user customizations while adding framework requirements

### 3. Cross-Platform Process Management
- Use `cross-spawn` instead of Node's native `spawn` for Windows compatibility
- Both sync (`spawnSync`) and async (`spawn`) variants available

### 4. Set-Based Dependency Tracking
- `compare.ts` provides efficient set operations to determine:
  - New packages to install
  - Already installed packages (skip)
  - Newly installed packages (for logging)
- Prevents redundant npm installs

### 5. Debug Logging
- ClaspHelper supports conditional debug logging
- Enable with: `WYSIDE_DEBUG=1 npx @wywyjp/wyside init`
- Helpful for troubleshooting clasp authentication and project creation

### 6. Template Architecture
- **template/** - Base template without UI (TypeScript only)
- **template-ui/** - Template with UI support (Angular/Svelte)
- Templates are copied during initialization, not modified
- ESLint explicitly ignores template directories

## Google Apps Script Integration

### Clasp Workflow
1. **Authentication**: `clasp login` (interactive browser flow)
2. **Project Creation**:
   - New project: `clasp create --type standalone`
   - Clone existing: `clasp clone <scriptId>`
3. **Deployment**: `clasp push` (pushes `dist/` to Apps Script)

### Multi-Environment Support
- Uses multiple `.clasp-*.json` files for different environments:
  - `.clasp-dev.json` - Development script
  - `.clasp-stg.json` - Staging script (optional)
  - `.clasp-prod.json` - Production script
- Deploy scripts switch between configs before pushing

### Link Extraction
- `extractScriptLink()` - Parses script URLs from clasp output
- `extractSheetsLink()` - Parses Google Sheets Add-on URLs
- Regex patterns account for various Google Apps Script project types

## UI Framework Support (template-ui)

### Angular Configuration
- Creates Angular project via `ng new` during preinstall
- Includes Angular Material setup
- Build: `ng build` → `deploy-ui.mjs` (convert to GAS format)

### Svelte Configuration
- Scaffolds Vite + Svelte project via `setup-svelte.mjs`
- Includes TailwindCSS configuration
- Build: `vite build` → `deploy-ui.mjs` (convert to GAS format)

### UI Deployment (`deploy-ui.mjs`)
Transforms framework output to Google Apps Script-compatible HTML:
- Converts `<script src="...">` to `<?!= include('...'); ?>`
- Wraps JS in `<script type="module">`
- Wraps CSS in `<style>` tags
- Output: `ui.html` + individual `.html` files for modules

## License Management

All source files must include Apache 2.0 license header:
```bash
# Check and add license headers
npm run license
```

Configuration: `license-config.json` + `license-header.txt`

## Common Pitfalls

1. **Modifying package.json during npm install**: Use `write-file-atomic` to prevent race conditions
2. **Windows path issues**: Always use `cross-spawn` for spawning processes
3. **Template changes not reflected**: Templates are copied during init, not symlinked
4. **ESLint errors in templates**: Template directories are ignored by ESLint
5. **Clasp authentication failures**: Run with `WYSIDE_DEBUG=1` to see detailed output

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **CLI scaffolding tool** | Apps Script needs local dev setup; wyside initializes, doesn't run during development |
| **Three config variants** | Supports no-UI, Angular, and Svelte without forcing all dependencies on every user |
| **Atomic file writes** | Prevents package.json corruption during concurrent operations |
| **Set-based diffing** | Efficient dependency comparison avoids redundant npm installs |
| **ESM module format** | Modern JavaScript standard; compatible with Apps Script |
| **Vitest over Jest** | Faster, native ESM support, better DX for TypeScript |
