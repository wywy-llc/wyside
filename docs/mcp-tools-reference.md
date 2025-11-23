# MCP Tools Reference

The `wyside-mcp` server provides the following tools to assist with development.

## `sync_local_secrets`

Auto-configure GCP project and local secrets.

**Input:**

- `projectId` (optional): GCP Project ID.
- `spreadsheetId` (optional): Target Spreadsheet ID.

**Output:**

- Generates `secrets/service-account.json`.
- Updates `.env`.
- Enables `sheets`, `gmail`, `drive` APIs.

## `scaffold_feature`

Generate a unified REST API repository class and use case.

**Input:**

- `featureName`: Name of the feature (e.g., "Todo").
- `operations`: List of operations (e.g., ["add", "list"]).

**Output:**

- `src/features/<name>/Universal<Name>Repo.ts`
- `src/features/<name>/<Name>UseCase.ts`

## `setup_named_range`

Configure named ranges in the Spreadsheet and sync with code.

**Input:**

- `spreadsheetId`: Target Spreadsheet.
- `rangeName`: Name of the range (e.g., "TODO_RANGE").
- `range`: A1 notation (e.g., "Sheet1!A1:B10").

**Output:**

- Updates Spreadsheet named ranges.
- Updates `src/core/constants.ts`.

## Google Drive Tools

### `drive_create_folder`

Create a new folder in Google Drive.

- **Input**: `name`, `parentId` (optional)

### `drive_list_files`

List files in Google Drive.

- **Input**: `query` (optional), `pageSize` (optional)

## Gmail Tools

### `gmail_send_email`

Send an email via Gmail API (requires proper authentication/impersonation for Service Accounts).

- **Input**: `to`, `subject`, `body`

### `gmail_list_labels`

List Gmail labels.
