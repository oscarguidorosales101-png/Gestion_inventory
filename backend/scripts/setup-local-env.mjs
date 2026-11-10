import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
const mysqlBin = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe';

function generatePassword(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function generateHex(length = 32) {
  return randomBytes(length).toString('hex');
}

console.log('[setup-local-env] Iniciando configuracion segura de credenciales locales...');

let dbPassword;
let jwtSecret;
let n8nApiKey;

if (existsSync(envPath)) {
  const existingContent = readFileSync(envPath, 'utf8');
  const matchPass = existingContent.match(/^DB_PASSWORD=(.+)$/m);
  const matchJwt = existingContent.match(/^JWT_SECRET=(.+)$/m);
  const matchN8n = existingContent.match(/^N8N_INTEGRATION_API_KEY=(.+)$/m);

  if (matchPass && matchPass[1].trim()) {
    dbPassword = matchPass[1].trim();
  }
  if (matchJwt && matchJwt[1].trim()) {
    jwtSecret = matchJwt[1].trim();
  }
  if (matchN8n && matchN8n[1].trim()) {
    n8nApiKey = matchN8n[1].trim();
  }
}

if (!dbPassword) dbPassword = generatePassword(32);
if (!jwtSecret) jwtSecret = generateHex(32);
if (!n8nApiKey) n8nApiKey = generateHex(32);

const escapedPassword = dbPassword.replace(/\\/g, '\\\\').replace(/'/g, "''");
const alterSql = `ALTER USER 'gestion_inventory_app'@'localhost' IDENTIFIED BY '${escapedPassword}'; FLUSH PRIVILEGES;`;

const alterProc = spawnSync(mysqlBin, ['--login-path=client', '--default-character-set=utf8mb4', '-e', alterSql], {
  encoding: 'utf8',
  windowsHide: true,
});

if (alterProc.status !== 0) {
  console.error('[setup-local-env] ERROR: No se pudo actualizar la contrasena de gestion_inventory_app con mysql --login-path=client.');
  console.error(alterProc.stderr || alterProc.stdout);
  process.exit(1);
}

const checkSql = `SELECT user, host, (authentication_string = '') AS sin_password, account_locked FROM mysql.user WHERE user = 'gestion_inventory_app';`;
const checkProc = spawnSync(mysqlBin, ['--login-path=client', '--default-character-set=utf8mb4', '-e', checkSql], {
  encoding: 'utf8',
  windowsHide: true,
});

if (checkProc.status !== 0) {
  console.error('[setup-local-env] ERROR al verificar el estado de gestion_inventory_app.');
  process.exit(1);
}

const envContent = [
  '# Configuracion de Entorno Local — Gestion_inventory',
  'PORT=3001',
  'NODE_ENV=development',
  'CORS_ORIGIN=http://localhost:5173',
  '',
  '# Base de datos MySQL — gestion_inventory_app',
  'DB_HOST=localhost',
  'DB_PORT=3306',
  'DB_NAME=gestion_inventory',
  'DB_USER=gestion_inventory_app',
  `DB_PASSWORD=${dbPassword}`,
  '',
  '# Base de datos MySQL para pruebas de integracion (aislada)',
  'TEST_DB_NAME=gestion_inventory_test',
  '',
  '# Seguridad de Tokens y Sesiones',
  `JWT_SECRET=${jwtSecret}`,
  'SESSION_EXPIRATION_HOURS=8',
  '',
  '# Clave de integracion para n8n (cabecera HTTP X-Integration-Key)',
  `N8N_INTEGRATION_API_KEY=${n8nApiKey}`,
  'BACKEND_INTERNAL_URL=http://localhost:3001',
  '',
].join('\n');

writeFileSync(envPath, envContent, { encoding: 'utf8', mode: 0o600 });

console.log('[setup-local-env] OK: Usuario gestion_inventory_app aprovisionado con contrasena criptografica.');
console.log('[setup-local-env] OK: Archivo backend/.env generado exitosamente (excluido de git).');
console.log(checkProc.stdout.trim());

