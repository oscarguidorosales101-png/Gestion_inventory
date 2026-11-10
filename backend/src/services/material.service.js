import { query } from '../config/db.js';
import { registrarAuditoria } from './auditoria.service.js';

export function calcularStockSeguridad(dmax, dprom, tiempoEntregaDias) {
  const dmaxNum = Number(dmax);
  const dpromNum = Number(dprom);
  const lNum = Number(tiempoEntregaDias);

  if (dmaxNum < dpromNum) {
    throw new Error('La demanda maxima diaria no puede ser menor a la demanda promedio diaria.');
  }
  if (lNum < 1) {
    throw new Error('El tiempo de entrega debe ser de al menos 1 dia.');
  }

  return Number(Math.round((dmaxNum - dpromNum) * lNum * 100) / 100);
}

export function calcularPuntoReorden(dprom, tiempoEntregaDias, stockSeguridad) {
  const dpromNum = Number(dprom);
  const lNum = Number(tiempoEntregaDias);
  const ssNum = Number(stockSeguridad);

  return Number(Math.round(((dpromNum * lNum) + ssNum) * 100) / 100);
}

export async function listarMateriales({ categoria_id, proveedor_id, activo, q, page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];

  if (categoria_id) {
    conditions.push('m.categoria_id = ?');
    params.push(Number(categoria_id));
  }
  if (proveedor_id) {
    conditions.push('m.proveedor_principal_id = ?');
    params.push(Number(proveedor_id));
  }
  if (activo !== undefined) {
    conditions.push('m.activo = ?');
    params.push(Number(activo));
  }
  if (q) {
    conditions.push('(m.codigo LIKE ? OR m.nombre LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countRes = await query(`SELECT COUNT(*) AS total FROM materiales m ${whereClause};`, params);
  const total = countRes[0].total;

  const sql = `
    SELECT
      m.id, m.codigo, m.nombre, m.descripcion, m.unidad_medida, m.costo_unitario_crc,
      m.stock_minimo, m.stock_maximo, m.demanda_promedio_diaria, m.demanda_maxima_diaria,
      m.tiempo_entrega_dias, m.stock_seguridad, m.punto_reorden, m.activo,
      c.id AS categoria_id, c.nombre AS categoria_nombre, c.codigo AS categoria_codigo,
      p.id AS proveedor_id, p.razon_social AS proveedor_nombre,
      COALESCE(stk.stock_global, 0.00) AS stock_global_actual
    FROM materiales m
    JOIN categorias c ON c.id = m.categoria_id
    LEFT JOIN proveedores p ON p.id = m.proveedor_principal_id
    LEFT JOIN (
      SELECT material_id,
        COALESCE(SUM(
          CASE
            WHEN tipo IN ('ENTRADA', 'AJUSTE_POSITIVO') THEN cantidad
            WHEN tipo IN ('SALIDA', 'AJUSTE_NEGATIVO') THEN -cantidad
            ELSE 0
          END
        ), 0.00) AS stock_global
      FROM movimientos
      GROUP BY material_id
    ) stk ON stk.material_id = m.id
    ${whereClause}
    ORDER BY m.codigo ASC
    LIMIT ? OFFSET ?;
  `;

  const items = await query(sql, [...params, Number(limit), Number(offset)]);
  return { items, total };
}

export async function obtenerMaterialPorId(id) {
  const sql = `
    SELECT
      m.id, m.codigo, m.nombre, m.descripcion, m.unidad_medida, m.costo_unitario_crc,
      m.stock_minimo, m.stock_maximo, m.demanda_promedio_diaria, m.demanda_maxima_diaria,
      m.tiempo_entrega_dias, m.stock_seguridad, m.punto_reorden, m.activo,
      c.id AS categoria_id, c.nombre AS categoria_nombre, c.codigo AS categoria_codigo,
      p.id AS proveedor_id, p.razon_social AS proveedor_nombre,
      COALESCE(stk.stock_global, 0.00) AS stock_global_actual
    FROM materiales m
    JOIN categorias c ON c.id = m.categoria_id
    LEFT JOIN proveedores p ON p.id = m.proveedor_principal_id
    LEFT JOIN (
      SELECT material_id,
        COALESCE(SUM(
          CASE
            WHEN tipo IN ('ENTRADA', 'AJUSTE_POSITIVO') THEN cantidad
            WHEN tipo IN ('SALIDA', 'AJUSTE_NEGATIVO') THEN -cantidad
            ELSE 0
          END
        ), 0.00) AS stock_global
      FROM movimientos
      GROUP BY material_id
    ) stk ON stk.material_id = m.id
    WHERE m.id = ?;
  `;
  const rows = await query(sql, [id]);
  return rows[0] || null;
}

export async function crearMaterial(datos, usuario_id) {
  const ss = calcularStockSeguridad(datos.demanda_maxima_diaria, datos.demanda_promedio_diaria, datos.tiempo_entrega_dias);
  const pr = calcularPuntoReorden(datos.demanda_promedio_diaria, datos.tiempo_entrega_dias, ss);

  if (pr < Number(datos.stock_minimo)) {
    const err = new Error(`El punto de reorden calculado (${pr.toFixed(2)}) no puede ser inferior al stock minimo (${Number(datos.stock_minimo).toFixed(2)}).`);
    err.statusCode = 400;
    throw err;
  }

  const sql = `
    INSERT INTO materiales (
      codigo, nombre, descripcion, categoria_id, proveedor_principal_id,
      unidad_medida, costo_unitario_crc, stock_minimo, stock_maximo,
      demanda_promedio_diaria, demanda_maxima_diaria, tiempo_entrega_dias,
      stock_seguridad, punto_reorden, activo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);
  `;

  const params = [
    datos.codigo,
    datos.nombre,
    datos.descripcion || null,
    datos.categoria_id,
    datos.proveedor_principal_id || null,
    datos.unidad_medida,
    datos.costo_unitario_crc,
    datos.stock_minimo,
    datos.stock_maximo,
    datos.demanda_promedio_diaria,
    datos.demanda_maxima_diaria,
    datos.tiempo_entrega_dias,
    ss,
    pr,
  ];

  const res = await query(sql, params);
  const nuevoId = res.insertId;

  await registrarAuditoria({
    usuario_id,
    accion: 'CREACION_MATERIAL',
    tipo_operacion: 'CREACION',
    entidad_afectada: 'materiales',
    registro_afectado_id: nuevoId,
    motivo: `Alta de material ${datos.codigo} con SS=${ss} y PR=${pr}`,
    datos_nuevos: datos,
  });

  return await obtenerMaterialPorId(nuevoId);
}

export async function actualizarMaterial(id, datos, usuario_id) {
  const actual = await obtenerMaterialPorId(id);
  if (!actual) {
    const err = new Error('Material no encontrado.');
    err.statusCode = 404;
    throw err;
  }

  const dprom = datos.demanda_promedio_diaria !== undefined ? datos.demanda_promedio_diaria : actual.demanda_promedio_diaria;
  const dmax = datos.demanda_maxima_diaria !== undefined ? datos.demanda_maxima_diaria : actual.demanda_maxima_diaria;
  const tiempoEntrega = datos.tiempo_entrega_dias !== undefined ? datos.tiempo_entrega_dias : actual.tiempo_entrega_dias;
  const stockMin = datos.stock_minimo !== undefined ? datos.stock_minimo : actual.stock_minimo;
  const stockMax = datos.stock_maximo !== undefined ? datos.stock_maximo : actual.stock_maximo;

  if (Number(stockMax) < Number(stockMin)) {
    const err = new Error('El stock maximo debe ser mayor o igual al stock minimo.');
    err.statusCode = 400;
    throw err;
  }

  const ss = calcularStockSeguridad(dmax, dprom, tiempoEntrega);
  const pr = calcularPuntoReorden(dprom, tiempoEntrega, ss);

  if (pr < Number(stockMin)) {
    const err = new Error(`El punto de reorden calculado (${pr.toFixed(2)}) no puede ser inferior al stock minimo (${Number(stockMin).toFixed(2)}).`);
    err.statusCode = 400;
    throw err;
  }

  const sql = `
    UPDATE materiales
     SET nombre = COALESCE(?, nombre),
         descripcion = ?,
         categoria_id = COALESCE(?, categoria_id),
         proveedor_principal_id = ?,
         unidad_medida = COALESCE(?, unidad_medida),
         costo_unitario_crc = COALESCE(?, costo_unitario_crc),
         stock_minimo = ?,
         stock_maximo = ?,
         demanda_promedio_diaria = ?,
         demanda_maxima_diaria = ?,
         tiempo_entrega_dias = ?,
         stock_seguridad = ?,
         punto_reorden = ?,
         activo = COALESCE(?, activo),
         updated_at = NOW()
     WHERE id = ?;
  `;

  const params = [
    datos.nombre || null,
    datos.descripcion !== undefined ? datos.descripcion : actual.descripcion,
    datos.categoria_id || null,
    datos.proveedor_principal_id !== undefined ? datos.proveedor_principal_id : actual.proveedor_id,
    datos.unidad_medida || null,
    datos.costo_unitario_crc !== undefined ? datos.costo_unitario_crc : null,
    stockMin,
    stockMax,
    dprom,
    dmax,
    tiempoEntrega,
    ss,
    pr,
    datos.activo !== undefined ? datos.activo : null,
    id,
  ];

  await query(sql, params);

  await registrarAuditoria({
    usuario_id,
    accion: 'ACTUALIZACION_MATERIAL',
    tipo_operacion: 'ACTUALIZACION',
    entidad_afectada: 'materiales',
    registro_afectado_id: id,
    motivo: `Actualizacion de parametros de material ${actual.codigo}`,
    datos_previos: { dprom: actual.demanda_promedio_diaria, dmax: actual.demanda_maxima_diaria, ss: actual.stock_seguridad, pr: actual.punto_reorden },
    datos_nuevos: { dprom, dmax, ss, pr },
  });

  return await obtenerMaterialPorId(id);
}

