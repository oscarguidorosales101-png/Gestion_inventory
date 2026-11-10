import { query } from '../config/db.js';
import { registrarAuditoria } from './auditoria.service.js';

export async function listarProveedores({ activo, q } = {}) {
  const conditions = [];
  const params = [];

  if (activo !== undefined) {
    conditions.push('p.activo = ?');
    params.push(Number(activo));
  }
  if (q) {
    conditions.push('(p.codigo LIKE ? OR p.razon_social LIKE ? OR p.identificacion_fiscal LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      p.id, p.codigo, p.razon_social, p.identificacion_fiscal, p.contacto_nombre,
      p.telefono, p.email, p.direccion, p.tiempo_entrega_dias, p.calificacion, p.activo,
      p.created_at, p.updated_at,
      COUNT(DISTINCT m.id) AS total_materiales,
      COUNT(DISTINCT oc.id) AS total_ordenes
    FROM proveedores p
    LEFT JOIN materiales m ON m.proveedor_principal_id = p.id
    LEFT JOIN ordenes_compra oc ON oc.proveedor_id = p.id
    ${whereClause}
    GROUP BY p.id
    ORDER BY p.codigo ASC;
  `;
  return await query(sql, params);
}

export async function obtenerProveedorPorId(id) {
  const sql = `
    SELECT p.*,
      COUNT(DISTINCT m.id) AS total_materiales,
      COUNT(DISTINCT oc.id) AS total_ordenes
    FROM proveedores p
    LEFT JOIN materiales m ON m.proveedor_principal_id = p.id
    LEFT JOIN ordenes_compra oc ON oc.proveedor_id = p.id
    WHERE p.id = ?
    GROUP BY p.id;
  `;
  const rows = await query(sql, [id]);
  return rows[0] || null;
}

export async function crearProveedor(datos, usuario_id) {
  const sql = `
    INSERT INTO proveedores (
      codigo, razon_social, identificacion_fiscal, contacto_nombre,
      telefono, email, direccion, tiempo_entrega_dias, calificacion, activo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;
  const params = [
    datos.codigo,
    datos.razon_social,
    datos.identificacion_fiscal,
    datos.contacto_nombre,
    datos.telefono,
    datos.email,
    datos.direccion || null,
    datos.tiempo_entrega_dias,
    datos.calificacion !== undefined ? datos.calificacion : 5.00,
    datos.activo !== undefined ? datos.activo : 1,
  ];

  const res = await query(sql, params);
  const nuevoId = res.insertId;

  await registrarAuditoria({
    usuario_id,
    accion: 'CREACION_PROVEEDOR',
    tipo_operacion: 'CREACION',
    entidad_afectada: 'proveedores',
    registro_afectado_id: nuevoId,
    motivo: `Alta de proveedor ${datos.codigo} - ${datos.razon_social}`,
    datos_nuevos: datos,
  });

  return await obtenerProveedorPorId(nuevoId);
}

export async function actualizarProveedor(id, datos, usuario_id) {
  const actual = await obtenerProveedorPorId(id);
  if (!actual) {
    const err = new Error('Proveedor no encontrado.');
    err.statusCode = 404;
    throw err;
  }

  const sql = `
    UPDATE proveedores
    SET razon_social = COALESCE(?, razon_social),
        identificacion_fiscal = COALESCE(?, identificacion_fiscal),
        contacto_nombre = COALESCE(?, contacto_nombre),
        telefono = COALESCE(?, telefono),
        email = COALESCE(?, email),
        direccion = ?,
        tiempo_entrega_dias = COALESCE(?, tiempo_entrega_dias),
        calificacion = COALESCE(?, calificacion),
        activo = COALESCE(?, activo),
        updated_at = NOW()
    WHERE id = ?;
  `;
  const params = [
    datos.razon_social || null,
    datos.identificacion_fiscal || null,
    datos.contacto_nombre || null,
    datos.telefono || null,
    datos.email || null,
    datos.direccion !== undefined ? datos.direccion : actual.direccion,
    datos.tiempo_entrega_dias || null,
    datos.calificacion !== undefined ? datos.calificacion : null,
    datos.activo !== undefined ? datos.activo : null,
    id,
  ];

  await query(sql, params);

  await registrarAuditoria({
    usuario_id,
    accion: 'ACTUALIZACION_PROVEEDOR',
    tipo_operacion: 'ACTUALIZACION',
    entidad_afectada: 'proveedores',
    registro_afectado_id: id,
    motivo: `Modificacion de datos de proveedor ${actual.codigo}`,
    datos_previos: { razon_social: actual.razon_social, telefono: actual.telefono, activo: actual.activo },
    datos_nuevos: datos,
  });

  return await obtenerProveedorPorId(id);
}

