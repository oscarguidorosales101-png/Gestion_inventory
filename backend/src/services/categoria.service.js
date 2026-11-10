import { query } from '../config/db.js';
import { registrarAuditoria } from './auditoria.service.js';

export async function listarCategorias({ activo, q } = {}) {
  const conditions = [];
  const params = [];

  if (activo !== undefined) {
    conditions.push('c.activo = ?');
    params.push(Number(activo));
  }
  if (q) {
    conditions.push('(c.codigo LIKE ? OR c.nombre LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      c.id, c.codigo, c.nombre, c.tipo_gasto, c.descripcion, c.activo,
      c.created_at, c.updated_at,
      COUNT(m.id) AS total_materiales
    FROM categorias c
    LEFT JOIN materiales m ON m.categoria_id = c.id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.codigo ASC;
  `;
  return await query(sql, params);
}

export async function obtenerCategoriaPorId(id) {
  const sql = `
    SELECT c.*, COUNT(m.id) AS total_materiales
    FROM categorias c
    LEFT JOIN materiales m ON m.categoria_id = c.id
    WHERE c.id = ?
    GROUP BY c.id;
  `;
  const rows = await query(sql, [id]);
  return rows[0] || null;
}

export async function crearCategoria(datos, usuario_id) {
  const sql = `
    INSERT INTO categorias (codigo, nombre, tipo_gasto, descripcion, activo)
    VALUES (?, ?, ?, ?, ?);
  `;
  const params = [
    datos.codigo,
    datos.nombre,
    datos.tipo_gasto,
    datos.descripcion || null,
    datos.activo !== undefined ? datos.activo : 1,
  ];
  const res = await query(sql, params);
  const nuevoId = res.insertId;

  await registrarAuditoria({
    usuario_id,
    accion: 'CREACION_CATEGORIA',
    tipo_operacion: 'CREACION',
    entidad_afectada: 'categorias',
    registro_afectado_id: nuevoId,
    motivo: `Alta de categoria ${datos.codigo} - ${datos.nombre}`,
    datos_nuevos: datos,
  });

  return await obtenerCategoriaPorId(nuevoId);
}

export async function actualizarCategoria(id, datos, usuario_id) {
  const actual = await obtenerCategoriaPorId(id);
  if (!actual) {
    const err = new Error('Categoria no encontrada.');
    err.statusCode = 404;
    throw err;
  }

  const sql = `
    UPDATE categorias
    SET nombre = COALESCE(?, nombre),
        tipo_gasto = COALESCE(?, tipo_gasto),
        descripcion = ?,
        activo = COALESCE(?, activo),
        updated_at = NOW()
    WHERE id = ?;
  `;
  const params = [
    datos.nombre || null,
    datos.tipo_gasto || null,
    datos.descripcion !== undefined ? datos.descripcion : actual.descripcion,
    datos.activo !== undefined ? datos.activo : null,
    id,
  ];
  await query(sql, params);

  await registrarAuditoria({
    usuario_id,
    accion: 'ACTUALIZACION_CATEGORIA',
    tipo_operacion: 'ACTUALIZACION',
    entidad_afectada: 'categorias',
    registro_afectado_id: id,
    motivo: `Modificacion de categoria ${actual.codigo}`,
    datos_previos: { nombre: actual.nombre, tipo_gasto: actual.tipo_gasto, activo: actual.activo },
    datos_nuevos: datos,
  });

  return await obtenerCategoriaPorId(id);
}

