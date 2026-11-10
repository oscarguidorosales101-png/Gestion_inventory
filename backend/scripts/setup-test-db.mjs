import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendDir = join(__dirname, '..');
const schemaPath = join(backendDir, 'database', 'schema.sql');
const seedPath = join(backendDir, 'database', 'seed.sql');
const mysqlBin = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe';

console.log('[setup-test-db] Aprovisionando base de datos aislada para pruebas (gestion_inventory_test)...');

const initSql = `
DROP DATABASE IF EXISTS gestion_inventory_test;
CREATE DATABASE gestion_inventory_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

GRANT SELECT, INSERT, UPDATE, DELETE ON gestion_inventory_test.* TO 'gestion_inventory_app'@'localhost';
FLUSH PRIVILEGES;
`;

const initProc = spawnSync(mysqlBin, ['--login-path=client', '--default-character-set=utf8mb4', '-e', initSql], {
  encoding: 'utf8',
  windowsHide: true,
});

if (initProc.status !== 0) {
  console.error('[setup-test-db] ERROR creando base de datos de test:', initProc.stderr || initProc.stdout);
  process.exit(1);
}

// Adaptamos schema y seed temporalmente para que apunten a gestion_inventory_test sin modificar los archivos originales de Fase 1
const tmpSchema = join(__dirname, 'tmp_schema_test.sql');
const tmpSeed = join(__dirname, 'tmp_seed_test.sql');

const schemaContent = readFileSync(schemaPath, 'utf8')
  .replace(/CREATE DATABASE IF NOT EXISTS gestion_inventory/g, 'CREATE DATABASE IF NOT EXISTS gestion_inventory_test')
  .replace(/USE gestion_inventory;/g, 'USE gestion_inventory_test;');
writeFileSync(tmpSchema, schemaContent, 'utf8');

const seedContent = readFileSync(seedPath, 'utf8')
  .replace(/USE gestion_inventory;/g, 'USE gestion_inventory_test;');
writeFileSync(tmpSeed, seedContent, 'utf8');

const loadSchemaProc = spawnSync(mysqlBin, [
  '--login-path=client',
  '--default-character-set=utf8mb4',
  '-e',
  `SOURCE ${tmpSchema.replace(/\\/g, '/')};`
], {
  encoding: 'utf8',
  windowsHide: true,
});

unlinkSync(tmpSchema);

if (loadSchemaProc.status !== 0) {
  console.error('[setup-test-db] ERROR cargando schema en test:', loadSchemaProc.stderr || loadSchemaProc.stdout);
  process.exit(1);
}

const loadSeedProc = spawnSync(mysqlBin, [
  '--login-path=client',
  '--default-character-set=utf8mb4',
  '-e',
  `SOURCE ${tmpSeed.replace(/\\/g, '/')};`
], {
  encoding: 'utf8',
  windowsHide: true,
});

unlinkSync(tmpSeed);

if (loadSeedProc.status !== 0) {
  console.error('[setup-test-db] ERROR cargando seed en test:', loadSeedProc.stderr || loadSeedProc.stdout);
  process.exit(1);
}

// Inicializar contraseñas seguras para las cuentas de prueba
const initUsersProc = spawnSync(process.execPath, [join(__dirname, 'inicializar-usuario.mjs'), '--test-db', '--init-seed'], {
  encoding: 'utf8',
  windowsHide: true,
});

if (initUsersProc.status !== 0) {
  console.error('[setup-test-db] ERROR inicializando usuarios semilla en test:', initUsersProc.stderr || initUsersProc.stdout);
  process.exit(1);
}

const verifySql = `
SELECT 'TEST_DB_TABLES' AS seccion, COUNT(*) AS total_tablas
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'gestion_inventory_test';

SELECT 'TEST_DB_COUNTS' AS seccion,
  (SELECT COUNT(*) FROM gestion_inventory_test.usuarios) AS usuarios,
  (SELECT COUNT(*) FROM gestion_inventory_test.materiales) AS materiales,
  (SELECT COUNT(*) FROM gestion_inventory_test.movimientos) AS movimientos,
  (SELECT COUNT(*) FROM gestion_inventory_test.ordenes_compra) AS ordenes;
`;

const verifyProc = spawnSync(mysqlBin, ['--login-path=client', '--default-character-set=utf8mb4', '-e', verifySql], {
  encoding: 'utf8',
  windowsHide: true,
});

console.log('[setup-test-db] OK: Base gestion_inventory_test lista y verificada:');
console.log(verifyProc.stdout.trim());

