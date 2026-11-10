import { query, withIndependentConnection } from '../config/db.js';

/**
 * Registra una entrada en la tabla auditoria.
 * Si se pasa una conexion de transaccion (conn), se ejecuta dentro de esa transaccion.
 * Si no se pasa conn, se ejecuta en una conexion independiente autocommit para que
 * persista incluso tras el fallo o ROLLBACK de la transaccion principal.
 */
export async function registrarAuditoria(datos, conn = null) {
  const {
    usuario_id = null,
    accion,
    tipo_operacion,
    entidad_afectada,
    registro_afectado_id = null,
    cantidad_anterior = null,
    cantidad_nueva = null,
    motivo = null,
    datos_previos = null,
    datos_nuevos = null,
  } = datos;

  const sql = `
    INSERT INTO auditoria (
      usuario_id, accion, tipo_operacion, entidad_afectada,
      registro_afectado_id, cantidad_anterior, cantidad_nueva,
      motivo, datos_previos, datos_nuevos, fecha_hora
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW());
  `;

  const params = [
    usuario_id,
    accion,
    tipo_operacion,
    entidad_afectada,
    registro_afectado_id,
    cantidad_anterior !== null ? Number(cantidad_anterior) : null,
    cantidad_nueva !== null ? Number(cantidad_nueva) : null,
    motivo,
    datos_previos ? JSON.stringify(datos_previos) : null,
    datos_nuevos ? JSON.stringify(datos_nuevos) : null,
  ];

  if (conn) {
    return await conn.execute(sql, params);
  }

  return await withIndependentConnection(async (independentConn) => {
    return await independentConn.execute(sql, params);
  });
}

/**
 * Consulta registros de auditoria con filtros y paginacion.
 */
export async function listarAuditoria({ entidad, tipo_operacion, usuario_id, desde, hasta, page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];

  if (entidad) {
    conditions.push('a.entidad_afectada = ?');
    params.push(entidad);
  }
  if (tipo_operacion) {
    conditions.push('a.tipo_operacion = ?');
    params.push(tipo_operacion);
  }
  if (usuario_id) {
    conditions.push('a.usuario_id = ?');
    params.push(Number(usuario_id));
  }
  if (desde) {
    conditions.push('a.fecha_hora >= ?');
    params.push(desde);
  }
  if (hasta) {
    conditions.push('a.fecha_hora <= ?');
    params.push(hasta);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countSql = `SELECT COUNT(*) AS total FROM auditoria a ${whereClause};`;
  const countRes = await query(countSql, params);
  const total = countRes[0].total;

  const dataSql = `
    SELECT
      a.id, a.usuario_id, u.nombre AS usuario_nombre, u.rol AS usuario_rol,
      a.accion, a.tipo_operacion, a.entidad_afectada, a.registro_afectado_id,
      a.cantidad_anterior, a.cantidad_nueva, a.motivo,
      a.datos_previos, a.datos_nuevos, a.fecha_hora
    FROM auditoria a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    ${whereClause}
    ORDER BY a.fecha_hora DESC, a.id DESC
    LIMIT ? OFFSET ?;
  `;

  const items = await query(dataSql, [...params, Number(limit), Number(offset)]);
  return { items, total };
}

