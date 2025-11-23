# Repository Guidelines

## Project Structure & Module Organization

- Core TypeScript sources live in `src/` (CLI entry in `index.ts`; helpers such as `clasp-helper.ts`, `package-helper.ts`, `config.ts`).
- Tests sit in `test/` alongside the matching module (e.g., `clasp-helper.test.ts`).
- Build artifacts are emitted to `dist/` via the TypeScript compiler and Rollup config in `rollup.config.mjs`.
- Templates for generated Apps Script projects are in `template/` and `template-ui/`; deployment helpers are in root `.mjs` files (`deploy-ui.mjs`, `setup-svelte.mjs`, `fix-animations.mjs`).

## Build, Test, and Development Commands

- `npm run lint` — runs license header check then ESLint with `--fix` over `src/` and `test/`.
- `npm run build` — cleans `build/`, lints, compiles with `tsc`, then copies `.gitignore` into `dist/`.
- `npm run test` — executes Vitest test suite headlessly.
- `npm run clean` — removes the transient `build/` directory.
- `npm run license` — verifies/adds Apache 2.0 headers as configured in `license-config.json`.
- Node.js 22+ is required (see `engines.node`); use `nvm use 22` or similar before running commands.

## Coding Style & Naming Conventions

- TypeScript throughout; prefer `const`/`let`, ES modules, and explicit return types on exported functions.
- Formatting and linting: ESLint + Prettier; rely on `npm run lint` for auto-fix. Keep default 2-space indentation.
- Naming: PascalCase for types/classes, camelCase for functions/variables, kebab-case for files. Mirror source/test file names (e.g., `compare.ts` ↔ `compare.test.ts`).
- Include minimal, purposeful comments; avoid duplication of obvious intent.

## Testing Guidelines

- Framework: Vitest with V8 coverage support available. Add new specs under `test/` with `.test.ts` suffix.
- Keep tests deterministic and file-system isolated; prefer fixtures under `__mocks__/` when needed.
- Run `npm test` before sending a PR; optionally add `vitest run --coverage` when changing core build/deploy logic.

## Commit & Pull Request Guidelines

- Follow Conventional Commits seen in history (`feat:`, `fix:`, `chore:`, `refactor:`, etc.). Keep subjects imperative and under ~72 chars.
- Ensure each commit passes `npm run lint` and `npm test`.
- PRs: include a short summary, linked issue (if any), test evidence/commands run, and notes on deployment impact (UI templates or Apps Script deploy flow).
- For template or UI changes, call out whether `deploy-ui.mjs` or `setup-svelte.mjs` behavior is affected.

## Notes

- Svelte init dependency gap: Previously `npm install` failures were hidden (`--silent`, status unchecked) and peer conflict between `@sveltejs/vite-plugin-svelte@^3` and `vite@^7` left package.json without dependencies. Fixed by bumping Svelte/Tailwind/Vite plugin to current versions and surfacing npm errors (see `config.ts` and `package-helper.ts`). If install fails, check the emitted npm error.
