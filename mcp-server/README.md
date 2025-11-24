# @wywyjp/wyside-mcp

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server for `wyside`.
This server acts as an AI-driven infrastructure manager, automating the complex setup required for local Google Apps Script development.

## Features

- **Infrastructure Automation**: Auto-configure GCP projects, enable APIs, and create Service Accounts.
- **Unified Code Scaffolding**: Generate code that runs on both GAS and Node.js without modification.
- **Sheet Configuration**: Manage Named Ranges via API and sync them with TypeScript constants.

## Installation

This package is usually installed as part of the `wyside` monorepo.

```bash
cd mcp-server
npm install
npm run build
```

## Usage

### Via Wyside CLI

The main CLI can start this server:

```bash
wyside mcp
```

### IDE Integration (e.g., Cursor, VS Code)

Add the following to your MCP configuration file:

```json
{
  "mcpServers": {
    "wyside": {
      "command": "node",
      "args": ["/path/to/wyside/mcp-server/build/index.js"]
    }
  }
}
```

## Tools

### `sync_local_secrets`

Sets up the local development environment by interacting with Google Cloud Platform.

- Checks/Enables `sheets.googleapis.com`.
- Creates a Service Account (`wyside-local-dev`) if missing.
- Generates `secrets/service-account.json`.
- Updates `.env`.

### `scaffold_feature`

Generates a new feature directory with the "Test-Separated Hybrid" architecture.

- **Input**: Feature name (e.g., "Todo"), Operations.
- **Output**:
  - `Universal<Name>Repo.ts`: REST API based repository.
  - `<Name>UseCase.ts`: Business logic.

### `setup_named_range`

Configures a Named Range in the target Google Sheet and generates the corresponding TypeScript constant.

- **Input**: Spreadsheet ID, Range Name, A1 Notation.
- **Output**: Updates Spreadsheet metadata and `src/core/constants.ts`.
