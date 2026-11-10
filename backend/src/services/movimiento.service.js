import { query, withTransaction } from '../config/db.js';
import { obtenerStockPorUbicacion, obtenerStockGlobal, verificarDisponibilidad } from './inventario.service.js';
import { evaluarAlertaStock } from './alerta.service.js';
import { registrarAuditoria } from './auditoria.service.js';

export async function registrarMovimiento(datos, usuario_id) {
  return await withTransaction(async (conn) => {
    const { tipo, material_id, ubicacion_origen_id, ubicacion_destino_id, cantidad, motivo, referencia } = datos;
    const cantNum = Number(cantidad);

    // Obtener costo unitario actual del material para referencia historica
    const [matRows] = await conn.execute(
      `SELECT id, codigo, nombre, costo_unitario_crc FROM materiales WHERE id = ? FOR UPDATE;`,
      [material_id]
    );
    const material = matRows[0];
    if (!material) {
      const err = new Error('Material no encontrado.');
      err.statusCode = 404;
      throw err;
    }

    let snapAntOrigen = null;
    let snapNueOrigen = null;
    let snapAntDestino = null;
    let snapNueDestino = null;

    // Control de saldo y disponibilidad en origen (para SALIDA, TRANSFERENCIA, AJUSTE_NEGATIVO)
    if (['SALIDA', 'TRANSFERENCIA', 'AJUSTE_NEGATIVO'].includes(tipo)) {
      if (!ubicacion_origen_id) {
        const err = new Error(`Ubicacion de origen requerida para movimientos de tipo ${tipo}.`);
        err.statusCode = 400;
        throw err;
      }
      snapAntOrigen = await verificarDisponibilidad(material_id, ubicacion_origen_id, cantNum, conn);
      snapNueOrigen = snapAntOrigen - cantNum;
    }

    // Calculo de snapshots en destino (para TRANSFERENCIA, AJUSTE_POSITIVO)
    if (['TRANSFERENCIA', 'AJUSTE_POSITIVO'].includes(tipo)) {
      if (!ubicacion_destino_id) {
        const err = new Error(`Ubicacion de destino requerida para movimientos de tipo ${tipo}.`);
        err.statusCode = 400;
        throw err;
      }
      snapAntDestino = await obtenerStockPorUbicacion(material_id, ubicacion_destino_id, conn);
      snapNueDestino = snapAntDestino + cantNum;
    }

    // Insercion inmutable
    const insertSql = `
      INSERT INTO movimientos (
        tipo, material_id, ubicacion_origen_id, ubicacion_destino_id,
        orden_compra_id, detalle_orden_compra_id, usuario_id,
        cantidad, costo_unitario_crc,
        snapshot_stock_ant_origen, snapshot_stock_nue_origen,
        snapshot_stock_ant_destino, snapshot_stock_nue_destino,
        motivo, referencia, fecha_movimiento
      ) VALUES (
        ?, ?, ?, ?,
        NULL, NULL, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, NOW()
      );
    `;

    const [res] = await conn.execute(insertSql, [
      tipo,
      material_id,
      ubicacion_origen_id || null,
      ubicacion_destino_id || null,
      usuario_id,
      cantNum,
      material.costo_unitario_crc,
      snapAntOrigen,
      snapNueOrigen,
      snapAntDestino,
      snapNueDestino,
      motivo,
      referencia || null,
    ]);

    const movId = res.insertId;

    // Evaluar y actualizar alerta de inventario
    const nuevoStockGlobal = await obtenerStockGlobal(material_id, conn);
    await evaluarAlertaStock(material_id, nuevoStockGlobal, conn);

    // Encolar en Outbox
    const uuid = crypto.randomUUID();
    const claveIdempotencia = `MOVIMIENTO:${movId}:${tipo}`;
    await conn.execute(
      `INSERT INTO eventos_integracion (
        evento_uuid, clave_idempotencia, tipo_evento, entidad_tipo, entidad_id,
        payload, estado, created_at
      ) VALUES (?, ?, 'MOVIMIENTO_REGISTRADO', 'MOVIMIENTO', ?, ?, 'PENDIENTE', NOW());`,
      [
        uuid,
        claveIdempotencia,
        movId,
        JSON.stringify({
          movimiento_id: movId,
          tipo,
          material_id,
          cantidad: cantNum,
          ubicacion_origen_id,
          ubicacion_destino_id,
          stock_global_resultante: nuevoStockGlobal,
        }),
      ]
    );

    // Auditoria
    await registrarAuditoria({
      usuario_id,
      accion: `MOVIMIENTO_${tipo}`,
      tipo_operacion: 'MOVIMIENTO_INVENTARIO',
      entidad_afectada: 'movimientos',
      registro_afectado_id: movId,
      cantidad_nueva: cantNum,
      motivo: `${tipo} de ${cantNum} ${material.codigo}. Motivo: ${motivo}`,
      datos_nuevos: { tipo, material_id, cantidad: cantNum, ubicacion_origen_id, ubicacion_destino_id },
    }, conn);

    return await obtenerMovimientoPorId(movId, conn);
  });
}

export async function listarMovimientos({ material_id, ubicacion_id, tipo, desde, hasta, q, page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];

  if (material_id) {
    conditions.push('m.material_id = ?');
    params.push(Number(material_id));
  }
  if (ubicacion_id) {
    conditions.push('(m.ubicacion_origen_id = ? OR m.ubicacion_destino_id = ?)');
    params.push(Number(ubicacion_id), Number(ubicacion_id));
  }
  if (tipo) {
    conditions.push('m.tipo = ?');
    params.push(tipo);
  }
  if (desde) {
    conditions.push('m.fecha_movimiento >= ?');
    params.push(desde);
  }
  if (hasta) {
    conditions.push('m.fecha_movimiento <= ?');
    params.push(hasta);
  }
  if (q) {
    conditions.push('(mat.codigo LIKE ? OR mat.nombre LIKE ? OR m.referencia LIKE ? OR m.motivo LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countRes = await query(`SELECT COUNT(*) AS total FROM movimientos m JOIN materiales mat ON mat.id = m.material_id ${whereClause};`, params);
  const total = countRes[0].total;

  const sql = `
    SELECT
      m.id, m.tipo, m.material_id, mat.codigo AS material_codigo, mat.nombre AS material_nombre,
      mat.unidad_medida,
      m.ubicacion_origen_id, uo.nombre AS ubicacion_origen_nombre, uo.codigo AS ubicacion_origen_codigo,
      m.ubicacion_destino_id, ud.nombre AS ubicacion_destino_nombre, ud.codigo AS ubicacion_destino_codigo,
      m.orden_compra_id, oc.numero_orden,
      m.detalle_orden_compra_id,
      m.usuario_id, u.nombre AS usuario_nombre,
      m.cantidad, m.costo_unitario_crc,
      m.snapshot_stock_ant_origen, m.snapshot_stock_nue_origen,
      m.snapshot_stock_ant_destino, m.snapshot_stock_nue_destino,
      m.motivo, m.referencia, m.fecha_movimiento
    FROM movimientos m
    JOIN materiales mat ON mat.id = m.material_id
    LEFT JOIN ubicaciones uo ON uo.id = m.ubicacion_origen_id
    LEFT JOIN ubicaciones ud ON ud.id = m.ubicacion_destino_id
    LEFT JOIN ordenes_compra oc ON oc.id = m.orden_compra_id
    LEFT JOIN usuarios u ON u.id = m.usuario_id
    ${whereClause}
    ORDER BY m.fecha_movimiento DESC, m.id DESC
    LIMIT ? OFFSET ?;
  `;

  const items = await query(sql, [...params, Number(limit), Number(offset)]);
  return { items, total };
}

export async function obtenerMovimientoPorId(id, conn = null) {
  const runner = conn || { query };
  const sql = `
    SELECT
      m.id, m.tipo, m.material_id, mat.codigo AS material_codigo, mat.nombre AS material_nombre,
      mat.unidad_medida,
      m.ubicacion_origen_id, uo.nombre AS ubicacion_origen_nombre, uo.codigo AS ubicacion_origen_codigo,
      m.ubicacion_destino_id, ud.nombre AS ubicacion_destino_nombre, ud.codigo AS ubicacion_destino_codigo,
      m.orden_compra_id, oc.numero_orden,
      m.detalle_orden_compra_id,
      m.usuario_id, u.nombre AS usuario_nombre,
      m.cantidad, m.costo_unitario_crc,
      m.snapshot_stock_ant_origen, m.snapshot_stock_nue_origen,
      m.snapshot_stock_ant_destino, m.snapshot_stock_nue_destino,
      m.motivo, m.referencia, m.fecha_movimiento
    FROM movimientos m
    JOIN materiales mat ON mat.id = m.material_id
    LEFT JOIN ubicaciones uo ON uo.id = m.ubicacion_origen_id
    LEFT JOIN ubicaciones ud ON ud.id = m.ubicacion_destino_id
    LEFT JOIN ordenes_compra oc ON oc.id = m.orden_compra_id
    LEFT JOIN usuarios u ON u.id = m.usuario_id
    WHERE m.id = ?;
  `;
  const rows = await runner.query(sql, [id]);
  return (Array.isArray(rows[0]) ? rows[0][0] : rows[0]) || null;
}

