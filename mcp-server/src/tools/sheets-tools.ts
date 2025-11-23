import chalk from 'chalk';
import fs from 'fs/promises';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import path from 'path';

interface SetupNamedRangeArgs {
  spreadsheetId: string;
  rangeName: string;
  range: string;
}

export async function setupNamedRange(args: SetupNamedRangeArgs) {
  const messages: string[] = [];
  try {
    const { spreadsheetId, rangeName, range } = args;
    if (!spreadsheetId || !rangeName || !range) {
      throw new Error('spreadsheetId, rangeName, and range are required');
    }

    messages.push(
      `Setting up Named Range: ${chalk.bold(rangeName)} -> ${range}`
    );

    // 1. Auth
    const keyFile = path.join(process.cwd(), 'secrets/service-account.json');
    const auth = new GoogleAuth({
      keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // 2. Update Spreadsheet
    // First, delete if exists to update safely, or just add.
    // 'addNamedRange' fails if it exists? No, it adds another with same name but different ID usually.
    // Better to list and update/delete.

    // Check existing
    const { data: ss } = await sheets.spreadsheets.get({ spreadsheetId });
    const existing = ss.namedRanges?.find(nr => nr.name === rangeName);

    interface BatchUpdateRequest {
      deleteNamedRange?: { namedRangeId: string };
      addNamedRange?: {
        namedRange: {
          name: string;
          range: {
            sheetId: number;
            startRowIndex: number;
            endRowIndex: number;
            startColumnIndex: number;
            endColumnIndex: number;
          };
        };
      };
    }

    const requests: BatchUpdateRequest[] = [];

    if (existing && existing.namedRangeId) {
      messages.push(
        `Updating existing named range (ID: ${existing.namedRangeId})...`
      );
      requests.push({
        deleteNamedRange: { namedRangeId: String(existing.namedRangeId) },
      });
    }

    // Parse A1 notation (Simplified: assuming 'Sheet1!A1:B2' format)
    // Note: The API requires GridRange (sheetId, startRowIndex, etc.) or we can use namedRange with range object.
    // Actually, addNamedRange takes 'namedRange' object which has 'range' (GridRange) OR we can use the simplified ref if we look up sheetId.

    // Wait, `addNamedRange` requires `range` property which is a `GridRange`.
    // We need to convert 'Sheet1!A1:B2' to GridRange.
    // ALTERNATIVE: Use Developer Metadata? No.
    // EASIER PATH: User provides A1 notation, but API wants GridRange.
    // However, checking the API docs: 'namedRange.range' is indeed GridRange.
    // We need to look up the sheet ID from the sheet name in A1.

    const rangeParts = range.split('!');
    const [sheetName, cellRange] = [
      rangeParts[0],
      rangeParts.slice(1).join('!'),
    ];
    if (!sheetName || !cellRange)
      throw new Error('Range must be in format "SheetName!A1:B2"');

    const sheet = ss.sheets?.find(s => s.properties?.title === sheetName);
    if (!sheet || typeof sheet.properties?.sheetId !== 'number') {
      throw new Error(`Sheet "${sheetName}" not found in spreadsheet.`);
    }
    const sheetId = sheet.properties.sheetId;

    // Simple A1 parser (very basic)
    // A1:B2 -> startRow, endRow, startCol, endCol
    // This is complex to implement robustly.
    // MCP Prompt usually handles complexity, but here I am the code.
    // Let's cheat: If the user provides A1, can we just set it?
    // Unlike 'updateCells', 'addNamedRange' strictly needs GridRange.
    // Plan B: Ask user (LLM) to provide structure? No, the tool input is simple string.
    // Okay, I will implement a minimal A1 parser.

    const parseA1 = (a1: string) => {
      // A1:B2
      const parts = a1.split(':');
      const start = parts[0];
      const end = parts[1] || start;

      const parseCoord = (coord: string) => {
        const colMatch = coord.match(/[A-Z]+/);
        const rowMatch = coord.match(/[0-9]+/);
        if (!colMatch || !rowMatch)
          throw new Error(`Invalid coordinate: ${coord}`);

        const colStr = colMatch[0];
        let colIndex = 0;
        for (let i = 0; i < colStr.length; i++) {
          colIndex = colIndex * 26 + (colStr.charCodeAt(i) - 64);
        }
        return {
          rowIndex: parseInt(rowMatch[0], 10) - 1,
          colIndex: colIndex - 1,
        };
      };

      const s = parseCoord(start);
      const e = parseCoord(end);

      return {
        sheetId,
        startRowIndex: s.rowIndex,
        endRowIndex: e.rowIndex + 1,
        startColumnIndex: s.colIndex,
        endColumnIndex: e.colIndex + 1,
      };
    };

    const gridRange = parseA1(cellRange);

    requests.push({
      addNamedRange: {
        namedRange: {
          name: rangeName,
          range: gridRange,
        },
      },
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });

    // 3. Update Code (src/core/constants.ts)
    const constantsPath = path.join(process.cwd(), 'src/core/constants.ts');
    if (
      await fs
        .access(constantsPath)
        .then(() => true)
        .catch(() => false)
    ) {
      let content = await fs.readFile(constantsPath, 'utf8');
      const exportLine = `export const ${rangeName} = '${range}';`;

      // Regex replace or append
      const regex = new RegExp(`export const ${rangeName} = .*;`);
      if (regex.test(content)) {
        content = content.replace(regex, exportLine);
        messages.push(`Updated existing constant in ${constantsPath}`);
      } else {
        content += `\n${exportLine}\n`;
        messages.push(`Appended constant to ${constantsPath}`);
      }
      await fs.writeFile(constantsPath, content);
    } else {
      messages.push(
        chalk.yellow(
          `⚠️  Constants file not found at ${constantsPath}. Skipping code update.`
        )
      );
    }

    messages.push(chalk.green('✅ Named Range setup complete!'));

    return {
      content: [{ type: 'text', text: messages.join('\n') }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}\nLogs:\n${messages.join('\n')}`,
        },
      ],
      isError: true,
    };
  }
}
