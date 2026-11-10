import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  decimalNumbers: true,
});

/**
 * Ejecuta una consulta sobre el pool.
 */
export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Ejecuta una transaccion ACID completa con reintentos controlados ante interbloqueos (deadlocks).
 * Maneja rollback automatico si ocurre cualquier error.
 */
export async function withTransaction(callback, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback().catch(() => {});
      // MySQL error 1213 (ER_LOCK_DEADLOCK) o 1205 (ER_LOCK_WAIT_TIMEOUT)
      const isDeadlock = error.errno === 1213 || error.code === 'ER_LOCK_DEADLOCK';
      const isLockTimeout = error.errno === 1205 || error.code === 'ER_LOCK_WAIT_TIMEOUT';
      if ((isDeadlock || isLockTimeout) && attempt < maxRetries) {
        // Breve retroceso exponencial con jitter aleatorio
        const backoffMs = Math.floor(Math.random() * 50) + attempt * 50;
        await new Promise((res) => setTimeout(res, backoffMs));
        continue;
      }
      throw error;
    } finally {
      connection.release();
    }
  }
}

/**
 * Obtiene una conexion independiente fuera de la transaccion principal (autocommit).
 * Crucial para que los registros de auditoria sobrevivan a transacciones revertidas (ROLLBACK).
 */
export async function withIndependentConnection(callback) {
  const connection = await pool.getConnection();
  try {
    return await callback(connection);
  } finally {
    connection.release();
  }
}

