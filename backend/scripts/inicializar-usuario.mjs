import mysql from 'mysql2/promise';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { hashPassword } from '../src/utils/crypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

if (!existsSync(envPath)) {
  console.error('[inicializar-usuario] ERROR: backend/.env no existe. Ejecuta primero npm run setup:env');
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

const args = process.argv.slice(2);
const isTestDb = args.includes('--test-db');
const targetDb = isTestDb ? (env.TEST_DB_NAME || 'gestion_inventory_test') : (env.DB_NAME || 'gestion_inventory');

const pool = mysql.createPool({
  host: env.DB_HOST || 'localhost',
  port: Number(env.DB_PORT) || 3306,
  user: env.DB_USER || 'gestion_inventory_app',
  password: env.DB_PASSWORD,
  database: targetDb,
  waitForConnections: true,
  connectionLimit: 2,
});

async function main() {
  const initSeed = args.includes('--init-seed');
  const emailArg = args.find((a) => a.includes('@'));
  const passArg = args.find((a) => !a.startsWith('--') && !a.includes('@'));

  if (initSeed) {
    console.log(`[inicializar-usuario] Inicializando cuentas semilla en base de datos: ${targetDb}...`);
    const seedAccounts = [
      { email: 'admin@empresaficticiapendiente.cr', pass: 'Admin2026!Gestion', rol: 'ADMINISTRADOR' },
      { email: 'inventario@empresaficticiapendiente.cr', pass: 'Inventario2026!', rol: 'ENCARGADO_INVENTARIO' },
      { email: 'compras@empresaficticiapendiente.cr', pass: 'Compras2026!Req', rol: 'COMPRAS' },
      { email: 'consulta@empresaficticiapendiente.cr', pass: 'Consulta2026!Ver', rol: 'CONSULTA' },
    ];

    for (const acc of seedAccounts) {
      const hash = hashPassword(acc.pass);
      const [result] = await pool.execute(
        `UPDATE usuarios
         SET password_hash = ?, requiere_cambio_clave = 0, activo = 1, updated_at = NOW()
         WHERE email = ?;`,
        [hash, acc.email]
      );
      if (result.affectedRows > 0) {
        console.log(`[inicializar-usuario] OK: Cuenta ${acc.email} (${acc.rol}) inicializada con hash PBKDF2-SHA512.`);
        await pool.execute(
          `INSERT INTO auditoria (usuario_id, accion, tipo_operacion, entidad_afectada, registro_afectado_id, motivo)
           SELECT id, 'INICIALIZACION_SEGURA_LOCAL', 'SEGURIDAD_USUARIO', 'usuarios', id, 'Inicializacion de contrasena via CLI local'
           FROM usuarios WHERE email = ?;`,
          [acc.email]
        ).catch(() => {});
      } else {
        console.warn(`[inicializar-usuario] AVISO: No se encontro el usuario con email ${acc.email}`);
      }
    }
  } else if (emailArg && passArg) {
    if (passArg.length < 8) {
      console.error('[inicializar-usuario] ERROR: La contrasena debe tener al menos 8 caracteres.');
      process.exit(1);
    }
    const hash = hashPassword(passArg);
    const [result] = await pool.execute(
      `UPDATE usuarios
       SET password_hash = ?, requiere_cambio_clave = 0, activo = 1, updated_at = NOW()
       WHERE email = ?;`,
      [hash, emailArg]
    );
    if (result.affectedRows === 0) {
      console.error(`[inicializar-usuario] ERROR: No se encontro ningun usuario con email ${emailArg} en ${targetDb}.`);
      process.exit(1);
    }
    console.log(`[inicializar-usuario] OK: Usuario ${emailArg} actualizado con exito.`);
  } else {
    console.log('Uso:');
    console.log('  node scripts/inicializar-usuario.mjs --init-seed [--test-db]');
    console.log('  node scripts/inicializar-usuario.mjs <email> <nueva_contrasena> [--test-db]');
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error('[inicializar-usuario] ERROR:', err.message);
  await pool.end().catch(() => {});
  process.exit(1);
});

