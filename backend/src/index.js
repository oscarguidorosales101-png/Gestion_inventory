import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

const server = app.listen(env.PORT, () => {
  console.log(`[Gestion_inventory API] Servidor Express activo en puerto ${env.PORT} (${env.NODE_ENV})`);
  console.log(`[Gestion_inventory API] Base de datos conectada: ${env.DB_NAME} (Usuario: ${env.DB_USER})`);
});

async function gracefulShutdown(signal) {
  console.log(`\n[Gestion_inventory API] Recibida senal ${signal}. Cerrando conexiones de forma segura...`);
  server.close(async () => {
    try {
      await pool.end();
      console.log('[Gestion_inventory API] Pool de conexiones MySQL cerrado.');
      process.exit(0);
    } catch (err) {
      console.error('[Gestion_inventory API] Error al cerrar pool de base de datos:', err);
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

