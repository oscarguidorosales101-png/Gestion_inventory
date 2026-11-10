import { withTransaction } from '../config/db.js';
import { obtenerStockPorUbicacion, obtenerStockGlobal } from './inventario.service.js';
import { evaluarAlertaStock } from './alerta.service.js';
import { registrarAuditoria } from './auditoria.service.js';
import { obtenerOrdenPorId } from './orden.service.js';

/**
 * Registra recepciones parciales o totales de una orden de compra en una unica transaccion ACID.
 * Garantiza:
 * 1. Bloqueo determinista ordenado (FOR UPDATE) para prevenir deadlocks.
 * 2. Validacion estricta de cantidad_pendiente (nunca recibir mas de lo solicitado).
 * 3. Insercion inmutable de movimientos ENTRADA con snapshots historicos.
 * 4. Actualizacion de cantidad_recibida en detalle_orden_compra.
 * 5. Transicion de estado de orden (PARCIALMENTE_RECIBIDA o RECIBIDA).
 * 6. Evaluacion y resolucion de alertas de stock.
 * 7. Registro de evento Outbox y bitacora de auditoria.
 */
export async function registrarRecepcionOrden(orden_id, { items, referencia, observaciones }, usuario_id) {
  return await withTransaction(async (conn) => {
    // 1. Bloquear y consultar cabecera de orden
    const [ordenRows] = await conn.execute(
      `SELECT id, numero_orden, proveedor_id, ubicacion_destino_id, estado
       FROM ordenes_compra
       WHERE id = ? FOR UPDATE;`,
      [orden_id]
    );

    const orden = ordenRows[0];
    if (!orden) {
      const err = new Error('Orden de compra no encontrada.');
      err.statusCode = 404;
      throw err;
    }

    const estadosValidosParaRecepcion = ['APROBADA', 'ENVIADA', 'PARCIALMENTE_RECIBIDA'];
    if (!estadosValidosParaRecepcion.includes(orden.estado)) {
      const err = new Error(`No se pueden registrar recepciones en una orden con estado ${orden.estado}. Debe estar APROBADA o ENVIADA.`);
      err.statusCode = 400;
      throw err;
    }

    // 2. Ordenar items por detalle_id ASC para bloqueo ordenado y prevencion de deadlocks (CP-CONC-01)
    const sortedItems = [...items].sort((a, b) => Number(a.detalle_id) - Number(b.detalle_id));
    const materialesAfectados = new Set();
    const movimientosCreados = [];

    for (const itemRec of sortedItems) {
      const cantRecibir = Number(itemRec.cantidad_a_recibir);
      if (cantRecibir <= 0) {
        const err = new Error('La cantidad a recibir debe ser mayor a cero.');
        err.statusCode = 400;
        throw err;
      }

      const [detRows] = await conn.execute(
        `SELECT id, orden_compra_id, material_id, cantidad_solicitada, cantidad_recibida, precio_unitario_crc
         FROM detalle_orden_compra
         WHERE id = ? AND orden_compra_id = ? FOR UPDATE;`,
        [itemRec.detalle_id, orden_id]
      );

      const detalle = detRows[0];
      if (!detalle) {
        const err = new Error(`Linea de orden #${itemRec.detalle_id} no pertenece a la orden #${orden_id}.`);
        err.statusCode = 400;
        throw err;
      }

      const cantSol = Number(detalle.cantidad_solicitada);
      const cantYaRecibida = Number(detalle.cantidad_recibida);
      const cantPendiente = cantSol - cantYaRecibida;

      // VALIDACION CRITICA: Cantidad a recibir no puede exceder cantidad pendiente (CP-REC-03)
      if (cantRecibir > cantPendiente) {
        const err = new Error(
          `La cantidad a recibir (${cantRecibir.toFixed(2)}) supera la cantidad pendiente (${cantPendiente.toFixed(2)}) para el item ${detalle.id}.`
        );
        err.statusCode = 409;
        throw err;
      }

      // Snapshot de stock en destino antes de la entrada
      const stockAntDestino = await obtenerStockPorUbicacion(detalle.material_id, orden.ubicacion_destino_id, conn);
      const stockNueDestino = stockAntDestino + cantRecibir;

      // 3. Insertar movimiento de tipo ENTRADA
      const [resMov] = await conn.execute(
        `INSERT INTO movimientos (
          tipo, material_id, ubicacion_origen_id, ubicacion_destino_id,
          orden_compra_id, detalle_orden_compra_id, usuario_id,
          cantidad, costo_unitario_crc,
          snapshot_stock_ant_origen, snapshot_stock_nue_origen,
          snapshot_stock_ant_destino, snapshot_stock_nue_destino,
          motivo, referencia, fecha_movimiento
        ) VALUES (
          'ENTRADA', ?, NULL, ?,
          ?, ?, ?,
          ?, ?,
          NULL, NULL,
          ?, ?,
          ?, ?, NOW()
        );`,
        [
          detalle.material_id,
          orden.ubicacion_destino_id,
          orden_id,
          detalle.id,
          usuario_id,
          cantRecibir,
          detalle.precio_unitario_crc,
          stockAntDestino,
          stockNueDestino,
          observaciones || `Recepcion de orden de compra ${orden.numero_orden}`,
          referencia || orden.numero_orden,
        ]
      );

      const movId = resMov.insertId;
      movimientosCreados.push(movId);
      materialesAfectados.add(detalle.material_id);

      // 4. Actualizar cantidad_recibida en detalle_orden_compra
      const nuevaCantidadRecibida = cantYaRecibida + cantRecibir;
      await conn.execute(
        `UPDATE detalle_orden_compra
         SET cantidad_recibida = ?
         WHERE id = ?;`,
        [nuevaCantidadRecibida, detalle.id]
      );
    }

    // 5. Determinar nuevo estado de la orden de compra
    const [allDetails] = await conn.execute(
      `SELECT cantidad_solicitada, cantidad_recibida
       FROM detalle_orden_compra
       WHERE orden_compra_id = ?;`,
      [orden_id]
    );

    const todasCompletadas = allDetails.every((d) => Number(d.cantidad_recibida) >= Number(d.cantidad_solicitada));
    const nuevoEstadoOrden = todasCompletadas ? 'RECIBIDA' : 'PARCIALMENTE_RECIBIDA';
    const fechaRecepcionCompletaSql = todasCompletadas ? 'NOW()' : 'NULL';

    await conn.execute(
      `UPDATE ordenes_compra
       SET estado = ?, fecha_recepcion_completa = ${fechaRecepcionCompletaSql}, updated_at = NOW()
       WHERE id = ?;`,
      [nuevoEstadoOrden, orden_id]
    );

    // 6. Evaluar y actualizar alertas de stock para cada material afectado
    for (const matId of materialesAfectados) {
      const nuevoStockGlobal = await obtenerStockGlobal(matId, conn);
      await evaluarAlertaStock(matId, nuevoStockGlobal, conn);
    }

    // 7. Encolar evento en Outbox (eventos_integracion)
    const uuid = crypto.randomUUID();
    const claveIdempotencia = `RECEPCION:${orden_id}:${Date.now()}`;
    await conn.execute(
      `INSERT INTO eventos_integracion (
        evento_uuid, clave_idempotencia, tipo_evento, entidad_tipo, entidad_id,
        payload, estado, created_at
      ) VALUES (?, ?, 'RECEPCION_ORDEN_COMPRA', 'ORDEN_COMPRA', ?, ?, 'PENDIENTE', NOW());`,
      [
        uuid,
        claveIdempotencia,
        orden_id,
        JSON.stringify({
          orden_id,
          numero_orden: orden.numero_orden,
          nuevo_estado: nuevoEstadoOrden,
          movimientos_ids: movimientosCreados,
          materiales_afectados: Array.from(materialesAfectados),
          completa: todasCompletadas,
        }),
      ]
    );

    // 8. Registrar auditoria
    await registrarAuditoria({
      usuario_id,
      accion: todasCompletadas ? 'RECEPCION_COMPLETA_ORDEN_COMPRA' : 'RECEPCION_PARCIAL_ORDEN_COMPRA',
      tipo_operacion: 'RECEPCION_COMPRA',
      entidad_afectada: 'ordenes_compra',
      registro_afectado_id: orden_id,
      motivo: `Recepcion ${todasCompletadas ? 'total' : 'parcial'} de orden ${orden.numero_orden}. Movimientos generados: [${movimientosCreados.join(', ')}]`,
      datos_previos: { estado: orden.estado },
      datos_nuevos: { estado: nuevoEstadoOrden, movimientos_ids: movimientosCreados },
    }, conn);

    return await obtenerOrdenPorId(orden_id, conn);
  });
}

