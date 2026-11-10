import { query } from '../config/db.js';
import { registrarAuditoria } from './auditoria.service.js';

export async function listarUbicaciones({ activo, tipo, q } = {}) {
  const conditions = [];
  const params = [];

  if (activo !== undefined) {
    conditions.push('u.activo = ?');
    params.push(Number(activo));
  }
  if (tipo) {
    conditions.push('u.tipo = ?');
    params.push(tipo);
  }
  if (q) {
    conditions.push('(u.codigo LIKE ? OR u.nombre LIKE ? OR u.responsable LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      u.id, u.codigo, u.nombre, u.tipo, u.direccion, u.responsable, u.activo,
      u.created_at, u.updated_at
    FROM ubicaciones u
    ${whereClause}
    ORDER BY u.codigo ASC;
  `;
  return await query(sql, params);
}

export async function obtenerUbicacionPorId(id) {
  const sql = `SELECT * FROM ubicaciones WHERE id = ?;`;
  const rows = await query(sql, [id]);
  return rows[0] || null;
}

export async function obtenerStockPorUbicacionDetallado(ubicacion_id) {
  const sql = `
    SELECT
      m.id AS material_id, m.codigo, m.nombre, m.unidad_medida, m.costo_unitario_crc,
      c.nombre AS categoria_nombre,
      COALESCE(SUM(
        CASE
          WHEN mov.ubicacion_destino_id = ? AND mov.tipo IN ('ENTRADA', 'TRANSFERENCIA', 'AJUSTE_POSITIVO') THEN mov.cantidad
          WHEN mov.ubicacion_origen_id = ? AND mov.tipo IN ('SALIDA', 'TRANSFERENCIA', 'AJUSTE_NEGATIVO') THEN -mov.cantidad
          ELSE 0
        END
      ), 0.00) AS stock_actual
    FROM materiales m
    JOIN categorias c ON c.id = m.categoria_id
    LEFT JOIN movimientos mov ON mov.material_id = m.id AND (mov.ubicacion_origen_id = ? OR mov.ubicacion_destino_id = ?)
    WHERE m.activo = 1
    GROUP BY m.id, m.codigo, m.nombre, m.unidad_medida, m.costo_unitario_crc, c.nombre
    HAVING stock_actual > 0
    ORDER BY m.codigo ASC;
  `;
  return await query(sql, [ubicacion_id, ubicacion_id, ubicacion_id, ubicacion_id]);
}

export async function crearUbicacion(datos, usuario_id) {
  const sql = `
    INSERT INTO ubicaciones (codigo, nombre, tipo, direccion, responsable, activo)
    VALUES (?, ?, ?, ?, ?, ?);
  `;
  const params = [
    datos.codigo,
    datos.nombre,
    datos.tipo,
    datos.direccion,
    datos.responsable,
    datos.activo !== undefined ? datos.activo : 1,
  ];

  const res = await query(sql, params);
  const nuevoId = res.insertId;

  await registrarAuditoria({
    usuario_id,
    accion: 'CREACION_UBICACION',
    tipo_operacion: 'CREACION',
    entidad_afectada: 'ubicaciones',
    registro_afectado_id: nuevoId,
    motivo: `Alta de ubicacion ${datos.codigo} - ${datos.nombre}`,
    datos_nuevos: datos,
  });

  return await obtenerUbicacionPorId(nuevoId);
}

export async function actualizarUbicacion(id, datos, usuario_id) {
  const actual = await obtenerUbicacionPorId(id);
  if (!actual) {
    const err = new Error('Ubicacion no encontrada.');
    err.statusCode = 404;
    throw err;
  }

  const sql = `
    UPDATE ubicaciones
    SET nombre = COALESCE(?, nombre),
        tipo = COALESCE(?, tipo),
        direccion = COALESCE(?, direccion),
        responsable = COALESCE(?, responsable),
        activo = COALESCE(?, activo),
        updated_at = NOW()
    WHERE id = ?;
  `;
  const params = [
    datos.nombre || null,
    datos.tipo || null,
    datos.direccion || null,
    datos.responsable || null,
    datos.activo !== undefined ? datos.activo : null,
    id,
  ];

  await query(sql, params);

  await registrarAuditoria({
    usuario_id,
    accion: 'ACTUALIZACION_UBICACION',
    tipo_operacion: 'ACTUALIZACION',
    entidad_afectada: 'ubicaciones',
    registro_afectado_id: id,
    motivo: `Modificacion de datos de ubicacion ${actual.codigo}`,
    datos_previos: { nombre: actual.nombre, responsable: actual.responsable, activo: actual.activo },
    datos_nuevos: datos,
  });

  return await obtenerUbicacionPorId(id);
}

