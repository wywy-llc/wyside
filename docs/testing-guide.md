# E2E Validation & Testing Guide

This guide describes the procedure to validate the `wyside` integration with MCP and Google Sheets.

## Prerequisites

- Node.js 22+
- Google Cloud Project with Sheets API enabled
- Service Account JSON key

## Validation Procedure

### 1. Build `wyside` CLI

```bash
npm run build
```

### 2. Initialize Test Project

Create a new directory and initialize the project using the built CLI.

```bash
mkdir -p test-projects/todo-app
cd test-projects/todo-app
WYSIDE_DEBUG=1 npx ../../dist/src/index.js init --setup-gcp --yes
```

_Note: `--setup-gcp` triggers the MCP integration (currently a placeholder for automated setup)._

### 3. Configure Secrets

Ensure your `secrets/service-account.json` is in place and `.env` is configured with:

- `GCP_PROJECT_ID`
- `APP_SPREADSHEET_ID_1_DEV`
- `GOOGLE_APPLICATION_CREDENTIALS`

### 4. Deploy to GAS (First)

**Important**: Deploy BEFORE running tests to initialize the spreadsheet structure.

```bash
npm install
npm run deploy
```

### 5. Initialize Spreadsheet (Manual Step)

After deployment:

1. Open the Spreadsheet (use the link from the init output).
2. **Reload the page** to trigger `onOpen()` function - this creates the "Todos" sheet.
3. Verify "Wyside Todo" menu appears in the menu bar.

_This step is required because the spreadsheet structure is initialized by GAS `onOpen()` function._

### 6. Run Local Integration Tests

Now execute the test suite to verify logic against the initialized Spreadsheet.

```bash
npm test
```

Expect all tests to PASS.

### 7. Verify GAS UI (Optional)

Additional manual verification in the browser:

1. Click "Wyside Todo" > "Show Todos" to open the sidebar.
2. Verify you can add, list, and delete todos via the UI.

_Note: The `test:e2e` script follows this exact sequence: deploy → manual init → test._

## Troubleshooting

- **Quota Errors**: Ensure Sheets API quota is sufficient.
- **Auth Errors**: Verify Service Account permissions on the Spreadsheet (must be an Editor).
- **Deploy Errors**: Check `.clasp.json` `scriptId` and `rootDir` settings.
