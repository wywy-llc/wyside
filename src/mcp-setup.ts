import { spawn } from 'cross-spawn';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startMcpServer(): void {
  const mcpPath = path.resolve(__dirname, '../../mcp-server/build/index.js');
  const proc = spawn('node', [mcpPath], { stdio: 'inherit' });
  proc.on('exit', code => process.exit(code || 0));
}
