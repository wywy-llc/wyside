# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Table of Contents

---

## Project Overview

**wyside** is an Apps Script IDE framework that enables modern TypeScript development for Google Apps Script projects. It's a CLI tool that scaffolds and initializes projects with comprehensive tooling including TypeScript compilation, testing, linting, and deployment automation via Google Clasp.

### Key Characteristics

- **Entry point**: `npx @wywyjp/wyside init` (CLI command)
- **Architecture**: Project scaffolding tool, not a runtime framework
- **License**: Apache-2.0
- **Fork of**: `@google/aside` by Google, maintained by wywy LLC (wywyjp inc.)

### Technology Stack

- **Language**: TypeScript (ES2020, strict mode)
- **Runtime**: Node.js 22+
- **Build**: Rollup with TypeScript plugin
- **Testing**: Vitest with V8 coverage
- **Linting**: ESLint + Prettier
- **Deployment**: Google Clasp

---

## Environment Requirements

- **Node.js**: Version 22+ (use `nvm use 22` or similar)
- **npm**: Latest stable version
- **Google Clasp**: For Apps Script deployment (installed as dependency)

---

## Development Commands

### Essential Commands

```bash
# Install dependencies
npm install

# Run tests (Vitest)
npm test

# Lint and auto-fix (includes license header check)
npm run lint

# Full build (clean → lint → TypeScript compilation → copy files)
npm run build

# Clean build artifacts
npm run clean
```

### Testing Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (Vitest UI)
npx vitest --ui

# Run tests with coverage
vitest run --coverage

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

---

## Source Code Architecture

### Core Components (`src/`)

The codebase follows a **modular helper pattern** with clear separation of concerns:

#### 1. index.ts - CLI Entry Point

- Uses `meow` for CLI argument parsing
- Routes to `app.init()` for the `init` command
- Handles flags: `--title`, `--yes`, `--no`, `--script-dev`, `--script-prod`

#### 2. app.ts - Main Orchestration Logic (~452 lines)

**Primary Function**: `init()` - Orchestrates project initialization workflow

**Sequential Handlers**:

- `handlePackageJson()` - Creates/updates package.json with scripts and dependencies
- `handleConfigCopy()` - Copies static config files
- `handleConfigMerge()` - Merges .gitignore, .claspignore files (append-only)
- `handleTemplate()` - Copies template source code
- `handleClasp()` - Authenticates and sets up Google Apps Script project

**Prompt Functions**: `query()`, `queryText()`, `querySelect()`

#### 3. config.ts - Configuration Templates (~200 lines)

**Three Configuration Variants**:

- `config` - Base (no UI framework)
- `configForAngular` - Angular + Material setup
- `configForSvelte` - Svelte + Tailwind CSS setup

Each config defines: dependencies, npm scripts, files to copy/merge

#### 4. clasp-helper.ts - Google Clasp Integration (~325 lines)

**Key Methods**:

- `login()` - Google authentication
- `create()` - Create new Apps Script project
- `cloneAndPull()` - Clone existing Apps Script project
- `extractScriptLink()` / `extractSheetsLink()` - Parse URLs from clasp output

**Debug Mode**: Set `WYSIDE_DEBUG=1` environment variable for verbose logging

#### 5. package-helper.ts - package.json Manipulation (~257 lines)

**Key Methods**:

- `load()` / `init()` - Load or create package.json
- `installPackages()` - Runs npm install with dependency diffing
- `updateScript()` - Updates npm scripts
- `save()` - Atomically writes package.json using `write-file-atomic`

#### 6. compare.ts - Set Comparison Utility (~120 lines)

- `SetComparison` class for efficient set operations
- Used for dependency diffing to avoid redundant npm installs

### Data Flow

```text
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

### Testing Architecture

#### Test Files (`test/`)

- `compare.test.ts` - Tests SetComparison utility
- `clasp-helper.test.ts` - Tests Google Clasp operations (with fs-extra mocks)
- `package-helper.test.ts` - Tests npm package management
- `config-svelte.test.ts` - Tests Svelte configuration

#### Mocking Strategy

- Uses Vitest's `vi.mock()` for external dependencies
- Key mocks: `fs-extra`, `cross-spawn`
- Test files include mocks in `__mocks__/` directory structure

#### Test Coverage

Tests focus on:

- Core helper logic (package management, clasp integration)
- Configuration generation
- Set-based dependency comparison
- File operations (mocked to avoid filesystem side effects)

---

## Module Organization

```text
wyside/
├── src/                          # Core TypeScript sources
│   ├── index.ts                  # CLI entry point
│   ├── app.ts                    # Main orchestration
│   ├── config.ts                 # Configuration templates
│   ├── clasp-helper.ts           # Google Clasp integration
│   ├── package-helper.ts         # package.json management
│   └── compare.ts                # Set comparison utility
│
├── test/                         # Test files (mirror src/ structure)
│   ├── compare.test.ts
│   ├── clasp-helper.test.ts
│   ├── package-helper.test.ts
│   └── config-svelte.test.ts
│
├── template/                     # Base Apps Script template (no UI)
│   ├── src/
│   └── test/
│
├── template-ui/                  # Apps Script template with UI support
│   ├── src/
│   └── test/
│
├── dist/                         # Build output (TypeScript + Rollup)
│
├── deploy-ui.mjs                 # UI deployment helper (GAS format conversion)
├── setup-svelte.mjs              # Svelte project scaffolder
├── fix-animations.mjs            # Angular animation fix
│
├── rollup.config.mjs             # Build pipeline
├── tsconfig.json                 # TypeScript configuration
├── vitest.config.ts              # Test configuration
├── .eslintrc.json                # Linting rules
├── .prettierrc.json              # Formatting rules
├── license-config.json           # License header config
└── package.json                  # Project metadata
```

---

## Build System

### TypeScript Compilation

- **Config**: `tsconfig.json`
- **Target**: ES2020
- **Module**: ES2020 (ESM)
- **Strict mode**: Enabled
- **Output**: `dist/` directory

### Rollup Build Pipeline

```text
src/index.ts
  ↓ cleanup plugin     (remove comments)
  ↓ license plugin     (add Apache 2.0 header)
  ↓ typescript plugin  (compile TypeScript)
  ↓ prettier plugin    (format output)
  ↓
dist/src/index.js (ESM)
```

### Code Quality Tools

| Tool                | Purpose                                            | Enforcement                            |
| ------------------- | -------------------------------------------------- | -------------------------------------- |
| **ESLint**          | TypeScript-aware linting with Prettier integration | Error on lint violations               |
| **Prettier**        | Code formatting (2-space indentation)              | Enforced as ESLint error               |
| **License Headers** | Apache 2.0 header on all source files              | Auto-added via `license-check-and-add` |

---

## Key Design Decisions

| Decision                  | Rationale                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------- |
| **CLI scaffolding tool**  | Apps Script needs local dev setup; wyside initializes, doesn't run during development |
| **Three config variants** | Supports no-UI, Angular, and Svelte without forcing all dependencies on every user    |
| **Atomic file writes**    | Prevents package.json corruption during concurrent operations                         |
| **Set-based diffing**     | Efficient dependency comparison avoids redundant npm installs                         |
| **ESM module format**     | Modern JavaScript standard; compatible with Apps Script                               |
| **Vitest over Jest**      | Faster, native ESM support, better DX for TypeScript                                  |

---

## Coding Style & Naming Conventions

### TypeScript Guidelines

- Use `const`/`let` (never `var`)
- ES modules (`import`/`export`)
- Explicit return types on exported functions
- Strict mode enabled

### Formatting

- **Indentation**: 2 spaces
- **Quotes**: Single quotes (enforced by Prettier)
- **Auto-fix**: Run `npm run lint` before commits

### Naming Conventions

| Type                    | Convention                 | Example                                |
| ----------------------- | -------------------------- | -------------------------------------- |
| **Types/Classes**       | PascalCase                 | `ClaspHelper`, `SetComparison`         |
| **Functions/Variables** | camelCase                  | `handlePackageJson`, `installPackages` |
| **Files**               | kebab-case                 | `clasp-helper.ts`, `package-helper.ts` |
| **Test Files**          | Mirror source + `.test.ts` | `compare.ts` ↔ `compare.test.ts`       |

### Comments

- Include **minimal, purposeful** comments
- Avoid duplication of obvious intent
- Explain "WHY" not "WHAT" (business context)

### License Headers

- **Required**: All source files must have Apache 2.0 header
- **Enforcement**: `npm run license` (runs automatically in lint script)

---

## Testing Guidelines

### Framework & Tools

- **Framework**: Vitest with V8 coverage support
- **Globals**: Enabled (`describe`, `it`, `expect` available globally)
- **Environment**: Node.js

### Test Organization

- **Location**: Add new specs under `test/` with `.test.ts` suffix
- **Naming**: Mirror source file names (e.g., `compare.ts` → `compare.test.ts`)
- **Isolation**: Keep tests deterministic and file-system isolated
- **Fixtures**: Use `__mocks__/` directory for mock data

### Best Practices

1. **Pre-PR**: Run `npm test` before sending a PR
2. **Coverage**: Optionally run `vitest run --coverage` when changing core build/deploy logic
3. **Mocking**: Use Vitest's `vi.mock()` for external dependencies (`fs-extra`, `cross-spawn`)
4. **Focus**: Test core helper logic, configuration generation, and set operations

---

## Commit & Pull Request Guidelines

### Commit Format

Follow **Conventional Commits**:

```text
<type>: <subject>

Examples:
feat: add support for Svelte UI framework
fix: resolve Clasp authentication timeout
chore: update dependencies to latest versions
refactor: simplify package-helper dependency diffing
```

**Types**: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`

**Rules**:

- Keep subjects imperative and under ~72 characters
- Reference commit history for examples

### Quality Gates

Ensure each commit passes:

- `npm run lint` (includes license check)
- `npm test` (all tests pass)

### PR Requirements

Include in PR description:

1. **Summary**: Short description of changes
2. **Linked Issue**: Reference issue number (if applicable)
3. **Test Evidence**: Commands run and results
4. **Deployment Impact**: Notes on UI templates or Apps Script deploy flow
5. **Template Changes**: Call out `deploy-ui.mjs` or `setup-svelte.mjs` behavior impact (if applicable)

---

## Important Patterns and Conventions

### 1. Atomic File Operations

**Pattern**: All file writes use `write-file-atomic`

**Rationale**: Prevents corruption during concurrent operations (critical for package.json updates during npm install)

**Implementation**: See `package-helper.ts` → `save()` method

### 2. Configuration Merging Strategy

| Type           | Behavior                  | Use Case                                                |
| -------------- | ------------------------- | ------------------------------------------------------- |
| **filesCopy**  | Overwrite if different    | Static config files (`.eslintrc.json`, `tsconfig.json`) |
| **filesMerge** | Append missing lines only | Ignore files (`.gitignore`, `.claspignore`)             |

**Rationale**: Preserves user customizations while adding framework requirements

### 3. Cross-Platform Process Management

**Pattern**: Use `cross-spawn` instead of Node's native `spawn`

**Rationale**: Windows compatibility (handles .cmd/.bat files automatically)

**Variants**:

- `spawnSync` - Synchronous execution
- `spawn` - Asynchronous execution

### 4. Set-Based Dependency Tracking

**Component**: `compare.ts` → `SetComparison` class

**Operations**:

- `left` - New packages to install
- `right` - Packages that were installed
- `both` - Already installed packages (skip)

**Rationale**: Prevents redundant npm installs, provides user feedback on changes

### 5. Debug Logging

**Component**: `clasp-helper.ts`

**Activation**: Set `WYSIDE_DEBUG=1` environment variable

**Use Case**: Troubleshooting clasp authentication and project creation

**Example**:

```bash
WYSIDE_DEBUG=1 npx @wywyjp/wyside init
```

### 6. Template Architecture

**Design**: Templates are **copied** during initialization, not modified or symlinked

**Structure**:

- `template/` - Base template without UI (TypeScript only)
- `template-ui/` - Template with UI support (Angular/Svelte)

**ESLint**: Template directories are explicitly ignored (see `.eslintrc.json`)

---

## Google Apps Script Integration

### Clasp Workflow

1. **Authentication**

   - Command: `clasp login`
   - Mechanism: Interactive browser flow
   - Result: OAuth credentials stored locally

2. **Project Creation**

   - New project: `clasp create --type standalone`
   - Clone existing: `clasp clone <scriptId>`
   - Result: `.clasp.json` file created

3. **Deployment**
   - Command: `clasp push`
   - Source: `dist/` directory
   - Destination: Google Apps Script cloud

### Multi-Environment Support

**Configuration Files**:

- `.clasp-dev.json` - Development script
- `.clasp-stg.json` - Staging script (optional)
- `.clasp-prod.json` - Production script

**Deployment Flow**:

1. Deploy scripts switch between configs before pushing
2. Example: `npm run deploy:dev` switches to `.clasp-dev.json` → `clasp push`

### Link Extraction

**Purpose**: Parse URLs from clasp output for user convenience

**Methods**:

- `extractScriptLink()` - Parses Apps Script editor URLs
- `extractSheetsLink()` - Parses Google Sheets Add-on URLs

**Implementation**: Regex patterns account for various Google Apps Script project types

---

## UI Framework Support

### Angular Configuration

**Setup**:

- Creates Angular project via `ng new` during preinstall
- Includes Angular Material setup
- Vite-based development server

**Build Flow**:

```text
ng build → deploy-ui.mjs (convert to GAS format) → dist/
```

**Key Files**:

- `fix-animations.mjs` - Resolves Angular animation issues
- `deploy-ui.mjs` - Transforms Angular output for Apps Script

### Svelte Configuration

**Setup**:

- Scaffolds Vite + Svelte project via `setup-svelte.mjs`
- Includes TailwindCSS configuration
- PostCSS for CSS processing

**Build Flow**:

```text
vite build → deploy-ui.mjs (convert to GAS format) → dist/
```

**Serve**: `npm run dev` (Vite dev server)

### UI Deployment (`deploy-ui.mjs`)

**Purpose**: Transform framework output to Google Apps Script-compatible HTML

**Transformations**:

1. Convert `<script src="...">` to `<?!= include('...'); ?>`
2. Wrap JavaScript in `<script type="module">` tags
3. Wrap CSS in `<style>` tags
4. Generate individual `.html` files for each module

**Output Structure**:

```text
dist/
├── ui.html              # Main HTML template
├── main.js.html         # JavaScript module (wrapped)
└── styles.css.html      # CSS module (wrapped)
```

---

## Publishing & Distribution

### Local Testing

```bash
# Build and test CLI locally
npm run build
./dist/src/index.js init --help
```

### Package Verification

```bash
# Create tarball without publishing (dry run)
npm pack --dry-run

# Inspect tarball contents
npm pack
tar -tzf wywyjp-wyside-*.tgz
```

### Publishing

```bash
# Publish to npm registry
npm publish --access public
```

**Prerequisites**:

- Increment version in `package.json`
- Update changelog/release notes
- Run full build and test suite
- Verify license headers

---

## Configuration Files Reference

| File                  | Purpose                                 | Key Settings                               |
| --------------------- | --------------------------------------- | ------------------------------------------ |
| `package.json`        | Project metadata, scripts, dependencies | Node ≥22, ESM type, bin entry              |
| `tsconfig.json`       | TypeScript compiler options             | ES2020 target, strict mode, ESM modules    |
| `rollup.config.mjs`   | Build pipeline configuration            | Cleanup, license, TS compilation, Prettier |
| `vitest.config.ts`    | Test framework configuration            | Node environment, global test functions    |
| `.eslintrc.json`      | Linting rules                           | TypeScript parser, Prettier integration    |
| `.prettierrc.json`    | Code formatting rules                   | 2-space indent, single quotes              |
| `license-config.json` | License header management               | Apache 2.0, file patterns, header template |

---

## Common Pitfalls

### 1. Modifying package.json During npm Install

**Problem**: Race condition can corrupt package.json

**Solution**: Use `write-file-atomic` for all file writes

**Reference**: `package-helper.ts` → `save()` method

### 2. Windows Path Issues

**Problem**: Node's native `spawn` doesn't handle Windows .cmd/.bat files

**Solution**: Always use `cross-spawn` for spawning processes

**Reference**: `package-helper.ts`, `clasp-helper.ts`

### 3. Template Changes Not Reflected

**Problem**: Templates are copied during init, not symlinked

**Solution**: Run `npm run build` to update dist/, then test with fresh init

**Context**: Template changes require full rebuild

### 4. ESLint Errors in Templates

**Problem**: Templates may have intentional style deviations

**Solution**: Template directories are explicitly ignored in `.eslintrc.json`

**Note**: Don't add linting to templates; users will customize them

### 5. Clasp Authentication Failures

**Problem**: Clasp login timeouts or credential issues

**Solution**: Run with debug mode for detailed output

**Command**: `WYSIDE_DEBUG=1 npx @wywyjp/wyside init`

---

## Project History & Context

### Fork History

- **Original**: `@google/aside` by Google
- **Current**: `@wywyjp/wyside` maintained by wywy LLC (wywyjp inc.)
- **Customization**: Tailored for specific project requirements with updated dependencies

### Recent Changes

#### Testing Migration (Vitest)

- **From**: Jest
- **To**: Vitest
- **Rationale**: Better ESM support, faster execution, improved TypeScript DX

#### Svelte Dependency Fix

**Problem**:

- `npm install` failures were hidden (`--silent` flag, status unchecked)
- Peer conflict between `@sveltejs/vite-plugin-svelte@^3` and `vite@^7`
- Result: package.json left without dependencies

**Solution**:

- Bumped Svelte/Tailwind/Vite plugin to current compatible versions
- npm errors now surfaced properly (see `config.ts` and `package-helper.ts`)
- Install failures now visible to users

#### Package Removals

- **Removed**: CSV parsing library and its types
- **Rationale**: Not needed for core framework functionality
- **Impact**: Users can add CSV parsing if needed in their projects
