import { query } from '../config/db.js';

export async function obtenerMetricasDashboard({ fecha_desde, fecha_hasta, categoria_id, ubicacion_id } = {}) {
  // 1. Conteo de materiales
  const [matRes] = await query('SELECT COUNT(*) AS total FROM materiales WHERE activo = 1;');
  const totalMateriales = matRes ? matRes.total : 0;

  // 2. Agregacion de stock global actual por material
  const stockMatSql = `
    SELECT
      m.id, m.codigo, m.nombre, m.costo_unitario_crc, m.stock_minimo, m.punto_reorden,
      COALESCE(stk.stock_global, 0.00) AS stock_global
    FROM materiales m
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
    WHERE m.activo = 1;
  `;
  const materialesConStock = await query(stockMatSql);

  let stockCriticosCount = 0;
  let reordenCount = 0;
  let normalCount = 0;
  let stockGlobalTotal = 0;
  let valorInventarioCrc = 0;

  for (const m of materialesConStock) {
    const s = Number(m.stock_global);
    const min = Number(m.stock_minimo);
    const pr = Number(m.punto_reorden);
    const costo = Number(m.costo_unitario_crc);

    stockGlobalTotal += s;
    if (s > 0) {
      valorInventarioCrc += (s * costo);
    }

    if (s <= min) {
      stockCriticosCount++;
    } else if (s <= pr) {
      reordenCount++;
    } else {
      normalCount++;
    }
  }

  // 3. Indicadores de ordenes de compra
  const [ocStats] = await query(`
    SELECT
      COUNT(CASE WHEN estado = 'PENDIENTE_APROBACION' THEN 1 END) AS pendientes_aprobacion,
      COUNT(CASE WHEN estado = 'PARCIALMENTE_RECIBIDA' THEN 1 END) AS parcialmente_recibidas,
      COUNT(CASE WHEN estado = 'APROBADA' OR estado = 'ENVIADA' THEN 1 END) AS en_proceso_entrega,
      COUNT(CASE WHEN es_posible_duplicado = 1 AND estado_revision_duplicado = 'PENDIENTE_REVISION' THEN 1 END) AS duplicados_por_revisar,
      COALESCE(SUM(CASE WHEN estado NOT IN ('CANCELADA', 'BORRADOR') THEN total_crc ELSE 0 END), 0.00) AS total_compras_crc
    FROM ordenes_compra;
  `);

  // 4. Conteo de alertas activas
  const [alertStats] = await query(`
    SELECT
      COUNT(*) AS total_activas,
      COUNT(CASE WHEN severidad = 'CRITICA' THEN 1 END) AS criticas,
      COUNT(CASE WHEN severidad = 'ALTA' THEN 1 END) AS altas,
      COUNT(CASE WHEN severidad = 'MEDIA' THEN 1 END) AS medias
    FROM alertas
    WHERE estado IN ('ACTIVA', 'EN_REVISION');
  `);

  // 5. Ultimos 6 movimientos registrados
  const movimientosRecientes = await query(`
    SELECT
      m.id, m.tipo, m.cantidad, m.fecha_movimiento,
      mat.codigo AS material_codigo, mat.nombre AS material_nombre, mat.unidad_medida,
      uo.codigo AS origen_codigo, ud.codigo AS destino_codigo,
      u.nombre AS usuario_nombre
    FROM movimientos m
    JOIN materiales mat ON mat.id = m.material_id
    LEFT JOIN ubicaciones uo ON uo.id = m.ubicacion_origen_id
    LEFT JOIN ubicaciones ud ON ud.id = m.ubicacion_destino_id
    LEFT JOIN usuarios u ON u.id = m.usuario_id
    ORDER BY m.fecha_movimiento DESC, m.id DESC
    LIMIT 6;
  `);

  // 6. Ultimas 6 entradas de auditoria
  const actividadReciente = await query(`
    SELECT
      a.id, a.accion, a.tipo_operacion, a.entidad_afectada, a.motivo, a.fecha_hora,
      u.nombre AS usuario_nombre, u.rol AS usuario_rol
    FROM auditoria a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    ORDER BY a.fecha_hora DESC, a.id DESC
    LIMIT 6;
  `);

  // 7. Distribucion por categoria
  const categoriasDistribucion = await query(`
    SELECT
      c.id, c.nombre, c.codigo, c.tipo_gasto,
      COUNT(m.id) AS total_materiales,
      COALESCE(SUM(stk.stock_global * m.costo_unitario_crc), 0.00) AS valor_categoria_crc
    FROM categorias c
    LEFT JOIN materiales m ON m.categoria_id = c.id AND m.activo = 1
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
    WHERE c.activo = 1
    GROUP BY c.id, c.nombre, c.codigo, c.tipo_gasto
    ORDER BY total_materiales DESC;
  `);

  // 8. Ocupacion por ubicacion
  const ubicacionesDistribucion = await query(`
    SELECT
      u.id, u.codigo, u.nombre, u.tipo,
      COUNT(DISTINCT m.id) AS items_almacenados,
      COALESCE(SUM(
        CASE
          WHEN mov.ubicacion_destino_id = u.id AND mov.tipo IN ('ENTRADA', 'TRANSFERENCIA', 'AJUSTE_POSITIVO') THEN mov.cantidad
          WHEN mov.ubicacion_origen_id = u.id AND mov.tipo IN ('SALIDA', 'TRANSFERENCIA', 'AJUSTE_NEGATIVO') THEN -mov.cantidad
          ELSE 0
        END
      ), 0.00) AS stock_total_ubicacion
    FROM ubicaciones u
    CROSS JOIN materiales m
    LEFT JOIN movimientos mov ON mov.material_id = m.id AND (mov.ubicacion_origen_id = u.id OR mov.ubicacion_destino_id = u.id)
    WHERE u.activo = 1
    GROUP BY u.id, u.codigo, u.nombre, u.tipo
    ORDER BY stock_total_ubicacion DESC;
  `);

  return {
    totalMateriales,
    valorTotalInventarioCrc: Number(valorInventarioCrc.toFixed(2)),
    alertasActivas: alertStats.total_activas,
    ordenesPendientesAprobacion: ocStats.pendientes_aprobacion,
    distribucionStockPorEstado: {
      normal: normalCount,
      reorden: reordenCount,
      critico: stockCriticosCount,
    },
    stockPorCategoria: categoriasDistribucion.map((c) => ({
      categoria: c.nombre,
      totalStock: Number(c.total_materiales),
      valorCrc: Number(c.valor_categoria_crc),
    })),
    totales: {
      totalMateriales,
      stockGlobalTotal: Number(stockGlobalTotal.toFixed(2)),
      valorInventarioCrc: Number(valorInventarioCrc.toFixed(2)),
      stockCriticosCount,
      reordenCount,
      normalCount,
    },
    ordenes: {
      pendientesAprobacion: ocStats.pendientes_aprobacion,
      parcialmenteRecibidas: ocStats.parcialmente_recibidas,
      enProcesoEntrega: ocStats.en_proceso_entrega,
      duplicadosPorRevisar: ocStats.duplicados_por_revisar,
      totalComprasCrc: Number(ocStats.total_compras_crc),
    },
    alertas: {
      totalActivas: alertStats.total_activas,
      criticas: alertStats.criticas,
      altas: alertStats.altas,
      medias: alertStats.medias,
    },
    movimientosRecientes,
    actividadReciente,
    categoriasDistribucion,
    ubicacionesDistribucion,
  };
}

/**
 * Dashboard exclusivo para ADMINISTRADOR.
 * Indicadores generales, usuarios, roles, auditoria, estado outbox y reglas.
 */
export async function obtenerDashboardAdmin() {
  const metricasBase = await obtenerMetricasDashboard();

  const [usrStats] = await query(`
    SELECT
      COUNT(*) AS total_usuarios,
      COUNT(CASE WHEN activo = 1 THEN 1 END) AS usuarios_activos,
      COUNT(CASE WHEN rol = 'ADMINISTRADOR' THEN 1 END) AS total_admins,
      COUNT(CASE WHEN rol = 'ENCARGADO_INVENTARIO' THEN 1 END) AS total_inventario,
      COUNT(CASE WHEN rol = 'COMPRAS' THEN 1 END) AS total_compras,
      COUNT(CASE WHEN rol = 'CONSULTA' THEN 1 END) AS total_consulta
    FROM usuarios;
  `);

  const [outboxStats] = await query(`
    SELECT
      COUNT(CASE WHEN estado = 'PENDIENTE' THEN 1 END) AS eventos_pendientes,
      COUNT(CASE WHEN estado = 'PROCESSING' THEN 1 END) AS eventos_en_proceso,
      COUNT(CASE WHEN estado = 'PROCESADO' THEN 1 END) AS eventos_procesados,
      COUNT(CASE WHEN estado = 'FAILED' THEN 1 END) AS eventos_fallidos
    FROM eventos_integracion;
  `);

  const [reglasStats] = await query('SELECT COUNT(*) AS total_reglas FROM configuracion_reglas;');

  return {
    ...metricasBase,
    usuarios: usrStats,
    outbox: outboxStats,
    totalReglas: reglasStats ? reglasStats.total_reglas : 0,
  };
}

/**
 * Dashboard exclusivo para ENCARGADO_INVENTARIO.
 * Existencias globales, bodegas, stock critico, proximo a reorden, recepciones y movimientos.
 */
export async function obtenerDashboardInventario() {
  const metricasBase = await obtenerMetricasDashboard();

  // Materiales en estado critico o reorden
  const itemsCriticos = await query(`
    SELECT
      m.id, m.codigo, m.nombre, m.unidad_medida, m.stock_minimo, m.punto_reorden,
      c.nombre AS categoria_nombre,
      COALESCE(stk.stock_global, 0.00) AS stock_actual,
      CASE
        WHEN COALESCE(stk.stock_global, 0.00) <= m.stock_minimo THEN 'STOCK_CRITICO'
        ELSE 'REORDEN'
      END AS estado_alerta
    FROM materiales m
    JOIN categorias c ON c.id = m.categoria_id
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
    WHERE m.activo = 1 AND COALESCE(stk.stock_global, 0.00) <= m.punto_reorden
    ORDER BY COALESCE(stk.stock_global, 0.00) ASC
    LIMIT 10;
  `);

  // Ultimas 5 recepciones fisicas realizadas
  const recepcionesRecientes = await query(`
    SELECT
      m.id, m.fecha_movimiento, m.cantidad,
      mat.codigo AS material_sku, mat.nombre AS material_nombre, mat.unidad_medida,
      oc.numero_orden, p.razon_social AS proveedor_nombre,
      ud.nombre AS bodega_destino, u.nombre AS receptor_nombre
    FROM movimientos m
    JOIN materiales mat ON mat.id = m.material_id
    JOIN ordenes_compra oc ON oc.id = m.orden_compra_id
    JOIN proveedores p ON p.id = oc.proveedor_id
    LEFT JOIN ubicaciones ud ON ud.id = m.ubicacion_destino_id
    LEFT JOIN usuarios u ON u.id = m.usuario_id
    WHERE m.tipo = 'ENTRADA' AND m.orden_compra_id IS NOT NULL
    ORDER BY m.fecha_movimiento DESC, m.id DESC
    LIMIT 5;
  `);

  return {
    ...metricasBase,
    itemsCriticos,
    recepcionesRecientes,
  };
}

/**
 * Dashboard exclusivo para COMPRAS.
 * Ordenes de compra, proveedores, duplicados por revisar, seguimiento presupuestario.
 */
export async function obtenerDashboardCompras() {
  const metricasBase = await obtenerMetricasDashboard();

  // Ordenes con posible duplicado pendientes de revision
  const duplicadosPendientes = await query(`
    SELECT
      oc.id, oc.numero_orden, oc.proveedor_id, oc.fecha_emision, oc.total_crc,
      oc.es_posible_duplicado, oc.estado_revision_duplicado, oc.orden_similar_id,
      p.razon_social AS proveedor_nombre,
      u.nombre AS creador_nombre
    FROM ordenes_compra oc
    JOIN proveedores p ON p.id = oc.proveedor_id
    LEFT JOIN usuarios u ON u.id = oc.usuario_creador_id
    WHERE oc.es_posible_duplicado = 1 AND oc.estado_revision_duplicado = 'PENDIENTE_REVISION'
    ORDER BY oc.id DESC;
  `);

  // Ultimas 8 ordenes emitidas
  const ultimasOrdenes = await query(`
    SELECT
      oc.id, oc.numero_orden, oc.fecha_emision, oc.fecha_entrega_estimada,
      oc.estado, oc.nivel_aprobacion_requerido, oc.total_crc,
      p.razon_social AS proveedor_nombre,
      u.nombre AS creador_nombre,
      ap.nombre AS aprobador_nombre
    FROM ordenes_compra oc
    JOIN proveedores p ON p.id = oc.proveedor_id
    LEFT JOIN usuarios u ON u.id = oc.usuario_creador_id
    LEFT JOIN usuarios ap ON ap.id = oc.usuario_aprobador_id
    ORDER BY oc.id DESC
    LIMIT 8;
  `);

  // Top proveedores por volumen de compra
  const topProveedores = await query(`
    SELECT
      p.id, p.codigo, p.razon_social AS nombre_comercial,
      COUNT(oc.id) AS total_ordenes,
      COALESCE(SUM(oc.total_crc), 0.00) AS total_facturado_crc
    FROM proveedores p
    LEFT JOIN ordenes_compra oc ON oc.proveedor_id = p.id AND oc.estado NOT IN ('CANCELADA', 'RECHAZADA')
    WHERE p.activo = 1
    GROUP BY p.id, p.codigo, p.razon_social
    ORDER BY total_facturado_crc DESC
    LIMIT 5;
  `);

  return {
    ...metricasBase,
    duplicadosPendientes,
    ultimasOrdenes,
    topProveedores,
  };
}

/**
 * Dashboard exclusivo para CONSULTA / AUDITOR.
 * Vista de lectura completa de inventario, auditoria y cumplimiento.
 */
export async function obtenerDashboardConsulta() {
  const metricasBase = await obtenerMetricasDashboard();

  // Historial de auditoria de movimientos e incidentes
  const auditoriaReciente = await query(`
    SELECT
      a.id, a.accion, a.tipo_operacion, a.entidad_afectada, a.registro_afectado_id,
      a.motivo, a.fecha_hora,
      u.nombre AS usuario_nombre, u.rol AS usuario_rol
    FROM auditoria a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    ORDER BY a.fecha_hora DESC, a.id DESC
    LIMIT 12;
  `);

  return {
    ...metricasBase,
    auditoriaReciente,
  };
}

