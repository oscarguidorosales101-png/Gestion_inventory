import mysql from 'mysql2/promise';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

if (!existsSync(envPath)) {
  console.error('[verificar-conexion] ERROR: backend/.env no existe. Ejecuta primero npm run setup:env');
  process.exit(1);
}

const envContent = readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx > 0) {
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    env[k] = v;
  }
}

console.log('[verificar-conexion] Probando conexion de aplicacion gestion_inventory_app a MySQL...');

const pool = mysql.createPool({
  host: env.DB_HOST || 'localhost',
  port: Number(env.DB_PORT) || 3306,
  user: env.DB_USER || 'gestion_inventory_app',
  password: env.DB_PASSWORD,
  database: env.DB_NAME || 'gestion_inventory',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

try {
  const [rows] = await pool.query('SELECT CURRENT_USER() AS usuario_actual, DATABASE() AS base_datos, VERSION() AS version;');
  console.log('[verificar-conexion] CONEXION EXITOSA con usuario de aplicacion:');
  console.table(rows);

  const [tables] = await pool.query('SELECT COUNT(*) AS total_tablas FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?;', [env.DB_NAME]);
  console.log(`[verificar-conexion] Tablas accesibles en ${env.DB_NAME}: ${tables[0].total_tablas}`);

  await pool.end();
  process.exit(0);
} catch (err) {
  console.error('[verificar-conexion] ERROR de conexion:', err.message);
  await pool.end().catch(() => {});
  process.exit(1);
}

