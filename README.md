# wyside

> **Note**:
>
> - This project is under active development, and there may be many imperfections. Your understanding is appreciated.
> - This is a fork of [@google/aside](https://github.com/google/aside), evolved to support AI-native workflows and unified architectures.

[![npm version](https://badge.fury.io/js/%40wywyjp%2Fwyside.svg)](https://badge.fury.io/js/%40wywyjp%2Fwyside)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Overview

**wyside** is a next-generation CLI and scaffolding tool for Google Apps Script (GAS) development. It transforms the traditional GAS experience into a modern, professional software engineering workflow.

By enforcing a **"Test-Separated Hybrid" architecture**, wyside enables you to write code that runs identically on both your local Node.js environment and the GAS runtime. This allows for true TDD (Test-Driven Development), local execution, and robust CI/CD pipelines without the typical limitations of GAS.

## Key Features

- **🚀 Unified Hybrid Runtime**
  Write business logic that runs on both Node.js and GAS. Use standard `googleapis` REST APIs instead of the proprietary GAS SDK for data operations, enabling 100% local testability.

- **🤖 AI-Native Infrastructure**
  Includes a built-in **MCP (Model Context Protocol) Server**. AI assistants (like Claude or Gemini) can use this to autonomously provision GCP projects, enable APIs (Sheets, Drive, Gmail), and manage Service Accounts for you.

- **🛠️ Modern Toolchain**
  Pre-configured with **TypeScript**, **ESLint**, **Prettier**, and **Vitest**. Forget about configuration hell and start coding immediately.

- **📦 Automatic Global Exposure**
  Write standard ESM `export` functions. The build system automatically generates the necessary GAS global wrappers (`function onOpen() { ... }`), keeping your code clean and modular.

- **🔄 Multi-Environment Support**
  Seamlessly switch between `dev` and `prod` environments with dedicated deployment configurations.

## Architecture: The "Test-Separated Hybrid" Approach

To achieve true local development, wyside mandates a strict architectural pattern:

1. **No GAS SDK in Business Logic**: Avoid `ScriptApp` or `SpreadsheetApp` in your core logic.
2. **Universal Clients**: Use the provided "Universal Client" patterns that detect the runtime:
   - **On Node.js (Local/CI)**: Uses `googleapis` with a Service Account.
   - **On GAS (Production)**: Uses `UrlFetchApp` and GAS OAuth tokens.
3. **Result**: Your code is environment-agnostic. You can write fast, reliable unit tests in Vitest that run locally, ensuring high quality before deployment.

## Quick Start

you need to complete the following prerequisites (including creating a Service Account and getting its key):

1. Verifying authentication (`gcloud`).
2. Selecting/Creating a Google Cloud Project.
3. Enabling necessary APIs (Sheets, Drive, Gmail).
4. Creating a Service Account & downloading keys (`secrets/service-account.json`).
5. Configuring environment variables: Create a `template/.env` file based on `template/.env.example` and configure the necessary environment variables, especially `GOOGLE_APPLICATION_CREDENTIALS` to point to the downloaded service account key, and also Spreadsheet IDs and GCP project ID.

Once these prerequisites are completed, execute the following command:

```bash
npx @wywyjp/wyside init --setup-gcp
```

### Debugging Initialization

To inspect initialization issues with verbose debug logs:

```bash
WYSIDE_DEBUG=1 npx @wywyjp/wyside init --setup-gcp
```

## What it does

After running the `init` command, wyside orchestrates the following:

- **Scaffolds Configuration**: Sets up `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, and `.prettierrc`.
- **Installs Dependencies**: Fetches all necessary packages for building, linting, and testing.
- **Configures Scripts**: Adds convenience commands like `npm run build`, `npm run test`, and `npm run deploy` to your `package.json`.
- **Sets up Clasp**: Initializes [clasp](https://github.com/google/clasp) for code synchronization with Google Drive.

## CLI Options

You can customize the initialization with these flags:

- `--setup-gcp`
  Run the automated Google Cloud Platform setup (APIs, Service Account, Secrets) using the embedded MCP server.
- `--yes` / `-y`
  Answer 'yes' to all prompts (non-interactive mode).
- `--no` / `-n`
  Answer 'no' to all prompts.
- `--title` / `-t` "string"
  Set the project title explicitly.
- `--script-dev` "string"
  Set the Apps Script ID for the `dev` environment.
- `--script-prod` "string"
  Set the Apps Script ID for the `production` environment.
