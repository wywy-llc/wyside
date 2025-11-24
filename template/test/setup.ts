import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

if (!process.env.APP_SPREADSHEET_ID_1_DEV) {
  console.warn(
    '⚠️ APP_SPREADSHEET_ID_1_DEV is not set. Tests hitting real APIs will fail.'
  );
}
