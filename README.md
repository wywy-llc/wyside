# wyside

- **Note**: This is a community-maintained fork of [@google/aside](https://github.com/google/aside).
- The original project is created by Google but is not officially supported.

## Overview

wyside supports modern, robust and scalable Apps Script development by providing a framework for a local coding environment capable of formatting, linting, testing and much more.

Here are the main features:

- **TypeScript**

  Write your code in TypeScript. It will be automatically compiled and bundled when deploying

- **Formatting / Linting**

  Leverage the power of ESLint and Prettier to enforce a unique coding style amongst collaborators

- **Testing**

  Use Vitest to test your code before deploying

- **Multiple Environments**

  Seemlessly switch between `dev` and `prod` environments to push your code to

- **Unified Architecture (AI Native)**

  Generate "Test-Separated Hybrid" code that runs on both GAS and Node.js using the built-in MCP server.

## Quick Start

The simplest way to get started with a fully configured environment (including GCP setup) is:

```bash
npx @wywyjp/wyside init --setup-gcp
```

The `--setup-gcp` flag triggers the automated setup process which handles:

1. Verify `gcloud auth login`
2. Select/create GCP project
3. Enable `sheets.googleapis.com`, `drive.googleapis.com`, `gmail.googleapis.com`
4. Create Service Account & download key
5. Place `secrets/service-account.json`
6. Create or configure Spreadsheet sharing
7. Generate `.env` file

To inspect initialization issues with verbose debug logs:

```bash
WYSIDE_DEBUG=1 npx @wywyjp/wyside init --setup-gcp
```

## What it does

After running the `init` command above, wyside will go ahead and do the following:

- **Add configuration files**

  E.g. for ESLint, Prettier, Vitest, ...

- **Set convenience scripts in package.json**

  Those scripts include: `lint`, `build` and `deploy`, among others

- **Install necessary dependencies**

  Everything required for formatting, linting, testing, etc. will be installed automatically

- **Set up clasp**

  wyside is using [clasp](https://github.com/google/clasp) to pull and push code from and to Apps Script

## Options

You can provide the `init` command with some convenience options:

- `--yes` / `-y`

  Answer 'yes' to all prompts

- `--no` / `-n`

  Answer 'no' to all prompts

- `--title`/ `-t`

  Set project title without being asked for it

- `--script-dev`

  Set Script ID for dev environment without being asked for it

- `--script-prod`

  Set Script ID for production environment without being asked for it

- `--setup-gcp`

  Run the automated Google Cloud Platform setup (APIs, Service Account, Secrets) using the embedded MCP server.
