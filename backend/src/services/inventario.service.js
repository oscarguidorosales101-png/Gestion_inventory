import { query } from '../config/db.js';

/**
 * Calcula el stock global de un material sumando todos sus movimientos en la base de datos.
 */
export async function obtenerStockGlobal(material_id, conn = null) {
  const runner = conn || { query };
  const sql = `
    SELECT COALESCE(SUM(
      CASE
        WHEN tipo IN ('ENTRADA', 'AJUSTE_POSITIVO') THEN cantidad
        WHEN tipo IN ('SALIDA', 'AJUSTE_NEGATIVO') THEN -cantidad
        ELSE 0
      END
    ), 0.00) AS stock_global
    FROM movimientos
    WHERE material_id = ?;
  `;
  const rows = await runner.query(sql, [material_id]);
  const res = Array.isArray(rows[0]) ? rows[0][0] : rows[0];
  return Number(res ? res.stock_global : 0);
}

/**
 * Calcula el stock actual de un material en una ubicacion especifica.
 */
export async function obtenerStockPorUbicacion(material_id, ubicacion_id, conn = null) {
  const runner = conn || { query };
  const sql = `
    SELECT COALESCE(SUM(
      CASE
        WHEN ubicacion_destino_id = ? AND tipo IN ('ENTRADA', 'TRANSFERENCIA', 'AJUSTE_POSITIVO') THEN cantidad
        WHEN ubicacion_origen_id = ? AND tipo IN ('SALIDA', 'TRANSFERENCIA', 'AJUSTE_NEGATIVO') THEN -cantidad
        ELSE 0
      END
    ), 0.00) AS stock_ubicacion
    FROM movimientos
    WHERE material_id = ? AND (ubicacion_origen_id = ? OR ubicacion_destino_id = ?);
  `;
  const rows = await runner.query(sql, [ubicacion_id, ubicacion_id, material_id, ubicacion_id, ubicacion_id]);
  const res = Array.isArray(rows[0]) ? rows[0][0] : rows[0];
  return Number(res ? res.stock_ubicacion : 0);
}

/**
 * Verifica si existe suficiente existencia en la ubicacion de origen para una salida o transferencia.
 * Lanza un error si la cantidad solicitada excede el saldo actual.
 */
export async function verificarDisponibilidad(material_id, ubicacion_origen_id, cantidadRequerida, conn = null) {
  const stockDisponible = await obtenerStockPorUbicacion(material_id, ubicacion_origen_id, conn);
  if (stockDisponible < Number(cantidadRequerida)) {
    const err = new Error(
      `Stock insuficiente en la ubicacion seleccionada. Disponible: ${stockDisponible.toFixed(2)}, Requerido: ${Number(cantidadRequerida).toFixed(2)}.`
    );
    err.statusCode = 400;
    throw err;
  }
  return stockDisponible;
}

/**
 * Consulta de inventario consolidado con filtros, calculo de stock por agregacion e indicadores de estado.
 */
export async function obtenerResumenInventario({ categoria_id, proveedor_id, estado_stock, q, search, page = 1, limit = 20 }) {
  const conditions = ['m.activo = 1'];
  const params = [];

  const termino = search || q;
  if (categoria_id) {
    conditions.push('m.categoria_id = ?');
    params.push(Number(categoria_id));
  }
  if (proveedor_id) {
    conditions.push('m.proveedor_principal_id = ?');
    params.push(Number(proveedor_id));
  }
  if (termino) {
    conditions.push('(m.codigo LIKE ? OR m.nombre LIKE ?)');
    params.push(`%${termino}%`, `%${termino}%`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Subconsulta de stock agregado por material
  const baseSql = `
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
    LEFT JOIN alertas a ON a.material_id = m.id AND a.estado IN ('ACTIVA', 'EN_REVISION') AND a.tipo IN ('REORDEN', 'STOCK_CRITICO')
    ${whereClause}
  `;

  // Filtro por estado calculado si fue solicitado
  let havingFilter = '';
  if (estado_stock === 'STOCK_CRITICO') {
    havingFilter = 'HAVING stock_global_actual <= m.stock_minimo';
  } else if (estado_stock === 'REORDEN') {
    havingFilter = 'HAVING stock_global_actual > m.stock_minimo AND stock_global_actual <= m.punto_reorden';
  } else if (estado_stock === 'NORMAL') {
    havingFilter = 'HAVING stock_global_actual > m.punto_reorden';
  }

  const offset = (Number(page) - 1) * Number(limit);

  const dataSql = `
    SELECT
      m.id, m.codigo, m.codigo AS codigo_sku, m.nombre, m.descripcion, m.unidad_medida, m.costo_unitario_crc,
      m.stock_minimo, m.stock_maximo, m.demanda_promedio_diaria, m.demanda_promedio_diaria AS demanda_diaria_promedio,
      m.demanda_maxima_diaria, m.demanda_maxima_diaria AS demanda_diaria_maxima,
      m.tiempo_entrega_dias, m.stock_seguridad, m.stock_seguridad AS stock_seguridad_calculado,
      m.punto_reorden, m.punto_reorden AS punto_reorden_calculado,
      c.id AS categoria_id, c.nombre AS categoria_nombre, c.codigo AS categoria_codigo,
      p.id AS proveedor_id, p.razon_social AS proveedor_nombre,
      COALESCE(stk.stock_global, 0.00) AS stock_global_actual,
      COALESCE(stk.stock_global, 0.00) AS stock_actual,
      CASE
        WHEN COALESCE(stk.stock_global, 0.00) <= 0 THEN 'STOCK_CRITICO'
        WHEN COALESCE(stk.stock_global, 0.00) <= m.stock_minimo THEN 'STOCK_CRITICO'
        WHEN COALESCE(stk.stock_global, 0.00) <= m.punto_reorden THEN 'REORDEN'
        ELSE 'NORMAL'
      END AS estado_stock_calculado,
      CASE
        WHEN COALESCE(stk.stock_global, 0.00) <= 0 THEN 'STOCK_CRITICO'
        WHEN COALESCE(stk.stock_global, 0.00) <= m.stock_minimo THEN 'STOCK_CRITICO'
        WHEN COALESCE(stk.stock_global, 0.00) <= m.punto_reorden THEN 'REORDEN'
        ELSE 'NORMAL'
      END AS estado_stock,
      a.id AS alerta_abierta_id, a.tipo AS alerta_tipo, a.severidad AS alerta_severidad, a.titulo AS alerta_titulo
    ${baseSql}
    ${havingFilter}
    ORDER BY
      CASE
        WHEN COALESCE(stk.stock_global, 0.00) <= m.stock_minimo THEN 1
        WHEN COALESCE(stk.stock_global, 0.00) <= m.punto_reorden THEN 2
        ELSE 3
      END ASC,
      m.codigo ASC
    LIMIT ? OFFSET ?;
  `;

  const items = await query(dataSql, [...params, Number(limit), Number(offset)]);

  // Total count
  const countSql = `SELECT COUNT(*) AS total FROM (SELECT m.id, COALESCE(stk.stock_global, 0.00) AS stock_global_actual ${baseSql} ${havingFilter}) AS t;`;
  const countRes = await query(countSql, params);
  const total = countRes[0] ? countRes[0].total : 0;

  // Obtener distribucion por ubicacion para los items retornados
  if (items.length > 0) {
    const itemIds = items.map((i) => i.id);
    const placeholders = itemIds.map(() => '?').join(',');
    const ubicSql = `
      SELECT
        u.id AS ubicacion_id, u.codigo AS ubicacion_codigo, u.nombre AS ubicacion_nombre,
        m.id AS material_id,
        COALESCE(SUM(
          CASE
            WHEN mov.ubicacion_destino_id = u.id AND mov.tipo IN ('ENTRADA', 'TRANSFERENCIA', 'AJUSTE_POSITIVO') THEN mov.cantidad
            WHEN mov.ubicacion_origen_id = u.id AND mov.tipo IN ('SALIDA', 'TRANSFERENCIA', 'AJUSTE_NEGATIVO') THEN -mov.cantidad
            ELSE 0
          END
        ), 0.00) AS stock_ubicacion
      FROM ubicaciones u
      CROSS JOIN materiales m
      LEFT JOIN movimientos mov ON mov.material_id = m.id AND (mov.ubicacion_origen_id = u.id OR mov.ubicacion_destino_id = u.id)
      WHERE m.id IN (${placeholders})
      GROUP BY u.id, u.codigo, u.nombre, m.id
      HAVING stock_ubicacion > 0
      ORDER BY u.codigo ASC;
    `;
    const ubicRows = await query(ubicSql, itemIds);

    for (const item of items) {
      item.desglose_ubicaciones = ubicRows
        .filter((u) => u.material_id === item.id)
        .map((u) => ({
          ubicacion_id: u.ubicacion_id,
          codigo: u.ubicacion_codigo,
          nombre: u.ubicacion_nombre,
          stock: Number(u.stock_ubicacion),
        }));
    }
  }

  return { items, total };
}

/**
 * Retorna las existencias por bodega para un material especifico.
 */
export async function obtenerDesglosePorUbicaciones(material_id, conn = null) {
  const runner = conn || { query };
  const sql = `
    SELECT
      u.id AS ubicacion_id, u.codigo AS ubicacion_codigo, u.nombre AS ubicacion_nombre,
      COALESCE(SUM(
        CASE
          WHEN mov.ubicacion_destino_id = u.id AND mov.tipo IN ('ENTRADA', 'TRANSFERENCIA', 'AJUSTE_POSITIVO') THEN mov.cantidad
          WHEN mov.ubicacion_origen_id = u.id AND mov.tipo IN ('SALIDA', 'TRANSFERENCIA', 'AJUSTE_NEGATIVO') THEN -mov.cantidad
          ELSE 0
        END
      ), 0.00) AS stock_ubicacion
    FROM ubicaciones u
    LEFT JOIN movimientos mov ON mov.material_id = ? AND (mov.ubicacion_origen_id = u.id OR mov.ubicacion_destino_id = u.id)
    WHERE u.activo = 1
    GROUP BY u.id, u.codigo, u.nombre
    HAVING stock_ubicacion > 0
    ORDER BY u.codigo ASC;
  `;
  const rows = await runner.query(sql, [material_id]);
  return rows || [];
}
