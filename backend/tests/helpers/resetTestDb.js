import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const setupScript = join(__dirname, '..', '..', 'scripts', 'setup-test-db.mjs');

export function resetTestDb() {
  const res = spawnSync('node', [setupScript], { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`Fallo al resetear la base de test: ${res.stderr || res.stdout}`);
  }
}

