import { query, withTransaction } from '../config/db.js';
import { obtenerRegla } from './regla.service.js';
import { registrarAuditoria } from './auditoria.service.js';

/**
 * Determina el nivel de aprobacion requerido en CRC segun los umbrales configurados.
 */
export async function determinarNivelAprobacion(totalCrc, conn = null) {
  const topeNivel1 = await obtenerRegla('APROBACION_NIVEL_1_MAX', {}, conn) ?? 5000.00;
  const topeNivel2 = await obtenerRegla('APROBACION_NIVEL_2_MAX', {}, conn) ?? 25000.00;

  const total = Number(totalCrc);
  if (total <= Number(topeNivel1)) {
    return 'NIVEL_1';
  }
  if (total <= Number(topeNivel2)) {
    return 'NIVEL_2';
  }
  return 'NIVEL_3';
}

/**
 * Genera el siguiente numero correlativo de orden de compra: OC-YYYY-XXXX.
 */
export async function generarNumeroOrden(conn = null) {
  const runner = conn || { query };
  const year = new Date().getFullYear();
  const prefix = `OC-${year}-`;

  const rows = await runner.query(
    `SELECT numero_orden FROM ordenes_compra
     WHERE numero_orden LIKE ?
     ORDER BY id DESC LIMIT 1;`,
    [`${prefix}%`]
  );
  const lastOrder = Array.isArray(rows[0]) ? rows[0][0] : rows[0];

  let seq = 1;
  if (lastOrder && lastOrder.numero_orden) {
    const parts = lastOrder.numero_orden.split('-');
    if (parts.length === 3) {
      seq = parseInt(parts[2], 10) + 1;
    }
  }

  return `${prefix}${seq.toString().padStart(4, '0')}`;
}

/**
 * Evalua si la orden en creacion es un posible duplicado de una orden previa:
 * - Mismo proveedor.
 * - Ventana temporal exacta de 7 dias (604.800 segundos).
 * - Excluye ordenes CANCELADAS.
 * - Compara materiales y cantidades solicitadas con tolerancia porcentual (reglas jerarquicas).
 * - Desempate determinista: la orden mas reciente en el tiempo, o menor ID.
 */
export async function detectarPosibleDuplicado(proveedor_id, items, fechaEmision = new Date(), conn = null) {
  const runner = conn || { query };
  const ventanaSegundosRegla = (await obtenerRegla('DUPLICADOS_VENTANA_DIAS', { proveedor_id }, conn) ?? 7) * 86400;

  // Buscar ordenes candidatas del mismo proveedor dentro de la ventana de 7 dias reales (604.800s)
  const candidatosSql = `
    SELECT oc.id, oc.numero_orden, oc.fecha_emision, oc.total_crc,
           TIMESTAMPDIFF(SECOND, oc.fecha_emision, ?) AS dif_segundos
    FROM ordenes_compra oc
    WHERE oc.proveedor_id = ?
      AND oc.estado <> 'CANCELADA'
      AND ABS(TIMESTAMPDIFF(SECOND, oc.fecha_emision, ?)) <= ?
    ORDER BY ABS(TIMESTAMPDIFF(SECOND, oc.fecha_emision, ?)) ASC, oc.id ASC;
  `;

  const rows = await runner.query(candidatosSql, [fechaEmision, proveedor_id, fechaEmision, ventanaSegundosRegla, fechaEmision]);
  const candidatas = Array.isArray(rows[0]) ? rows[0] : rows;

  if (!candidatas || candidatas.length === 0) {
    return { esDuplicado: false, ordenSimilarId: null, motivo: null };
  }

  // Para cada candidata en orden de prelacion temporal determinista, comparar items
  for (const cand of candidatas) {
    const itemRows = await runner.query(
      `SELECT material_id, cantidad_solicitada FROM detalle_orden_compra WHERE orden_compra_id = ?;`,
      [cand.id]
    );
    const candItems = Array.isArray(itemRows[0]) ? itemRows[0] : itemRows;

    for (const nuevoItem of items) {
      const matchItem = candItems.find((ci) => Number(ci.material_id) === Number(nuevoItem.material_id));
      if (matchItem) {
        // Obtener tolerancia porcentual aplicable con jerarquia: MATERIAL > CATEGORIA > GLOBAL
        // Consultar categoria del material
        const catRows = await runner.query('SELECT categoria_id FROM materiales WHERE id = ?;', [nuevoItem.material_id]);
        const catId = (Array.isArray(catRows[0]) ? catRows[0][0] : catRows[0])?.categoria_id;

        const tolPct = await obtenerRegla('DUPLICADOS_TOLERANCIA_PCT', {
          material_id: nuevoItem.material_id,
          categoria_id: catId,
          proveedor_id,
        }, conn) ?? 10.0;

        const cantPrevia = Number(matchItem.cantidad_solicitada);
        const cantNueva = Number(nuevoItem.cantidad_solicitada);
        const variacionPct = Math.abs(cantNueva - cantPrevia) / cantPrevia * 100;

        if (variacionPct <= Number(tolPct)) {
          return {
            esDuplicado: true,
            ordenSimilarId: cand.id,
            ordenSimilarNumero: cand.numero_orden,
            diferenciaSegundos: Math.abs(cand.dif_segundos),
            variacionPct: Number(variacionPct.toFixed(2)),
            toleranciaPct: Number(tolPct),
            materialId: nuevoItem.material_id,
            cantidadSolicitada: cantNueva,
            cantidadPrevia: cantPrevia,
          };
        }
      }
    }
  }

  return { esDuplicado: false, ordenSimilarId: null, motivo: null };
}

/**
 * Crea una orden de compra completa con sus lineas de detalle, calculo de totales,
 * nivel de autorizacion y deteccion automatica de duplicados.
 */
export async function crearOrdenCompra(datos, usuario_id) {
  return await withTransaction(async (conn) => {
    let subtotalCrc = 0;
    const itemsCalculados = [];

    for (const it of datos.items) {
      const cant = Number(it.cantidad_solicitada);
      const precio = Number(it.precio_unitario_crc);
      const sub = Number((cant * precio).toFixed(2));
      subtotalCrc += sub;
      itemsCalculados.push({
        material_id: it.material_id,
        cantidad_solicitada: cant,
        precio_unitario_crc: precio,
        subtotal_crc: sub,
      });
    }

    subtotalCrc = Number(subtotalCrc.toFixed(2));
    const impuestosCrc = 0.00; // Impuestos ya integrados o exentos en configuracion de obra
    const totalCrc = subtotalCrc + impuestosCrc;

    const nivelRequerido = await determinarNivelAprobacion(totalCrc, conn);
    const numeroOrden = await generarNumeroOrden(conn);
    const fechaEmision = new Date();

    // Deteccion de duplicados
    const dupCheck = await detectarPosibleDuplicado(datos.proveedor_id, itemsCalculados, fechaEmision, conn);

    const esDuplicado = dupCheck.esDuplicado ? 1 : 0;
    const estadoRevisionDuplicado = esDuplicado ? 'PENDIENTE_REVISION' : 'NO_APLICA';
    const ordenSimilarId = dupCheck.ordenSimilarId || null;

    const insertOrdenSql = `
      INSERT INTO ordenes_compra (
        numero_orden, proveedor_id, ubicacion_destino_id,
        usuario_creador_id, usuario_aprobador_id, fecha_emision,
        fecha_entrega_estimada, estado, nivel_aprobacion_requerido,
        moneda, subtotal_crc, impuestos_crc, total_crc,
        es_posible_duplicado, estado_revision_duplicado, orden_similar_id,
        observaciones
      ) VALUES (?, ?, ?, ?, NULL, ?, ?, 'PENDIENTE_APROBACION', ?, 'CRC', ?, ?, ?, ?, ?, ?, ?);
    `;

    const resOrden = await conn.execute(insertOrdenSql, [
      numeroOrden,
      datos.proveedor_id,
      datos.ubicacion_destino_id,
      usuario_id,
      fechaEmision,
      datos.fecha_entrega_estimada,
      nivelRequerido,
      subtotalCrc,
      impuestosCrc,
      totalCrc,
      esDuplicado,
      estadoRevisionDuplicado,
      ordenSimilarId,
      datos.observaciones || null,
    ]);

    const nuevaOrdenId = resOrden[0].insertId;

    // Insertar detalle
    for (const it of itemsCalculados) {
      await conn.execute(
        `INSERT INTO detalle_orden_compra (
          orden_compra_id, material_id, cantidad_solicitada, cantidad_recibida,
          precio_unitario_crc, subtotal_crc
        ) VALUES (?, ?, ?, 0.00, ?, ?);`,
        [nuevaOrdenId, it.material_id, it.cantidad_solicitada, it.precio_unitario_crc, it.subtotal_crc]
      );
    }

    // Si es duplicado, generar alerta de tipo ORDEN_DUPLICADA
    if (esDuplicado) {
      await conn.execute(
        `INSERT INTO alertas (
          tipo, severidad, material_id, orden_compra_id, contexto_clave,
          estado, titulo, mensaje, fecha_generacion
        ) VALUES ('ORDEN_DUPLICADA', 'ALTA', ?, ?, ?, 'ACTIVA', ?, ?, NOW());`,
        [
          dupCheck.materialId,
          nuevaOrdenId,
          `DUPLICADO:OC:${nuevaOrdenId}`,
          `Posible orden de compra duplicada: ${numeroOrden} similar a ${dupCheck.ordenSimilarNumero}`,
          `La orden ${numeroOrden} incluye material con variacion de ${dupCheck.variacionPct}% (<= ${dupCheck.toleranciaPct}%) emitida a ${dupCheck.diferenciaSegundos} segundos de ${dupCheck.ordenSimilarNumero}. Requiere revision humana.`
        ]
      );
    }

    // Insertar evento en Transactional Outbox (eventos_integracion)
    const uuid = crypto.randomUUID();
    const claveIdempotencia = `ORDEN_COMPRA:${nuevaOrdenId}:CREACION`;
    await conn.execute(
      `INSERT INTO eventos_integracion (
        evento_uuid, clave_idempotencia, tipo_evento, entidad_tipo, entidad_id,
        payload, estado, created_at
      ) VALUES (?, ?, 'ORDEN_COMPRA_CREADA', 'ORDEN_COMPRA', ?, ?, 'PENDIENTE', NOW());`,
      [
        uuid,
        claveIdempotencia,
        nuevaOrdenId,
        JSON.stringify({
          orden_id: nuevaOrdenId,
          numero_orden: numeroOrden,
          proveedor_id: datos.proveedor_id,
          total_crc: totalCrc,
          es_posible_duplicado: esDuplicado,
          orden_similar_id: ordenSimilarId,
          nivel_aprobacion: nivelRequerido,
        }),
      ]
    );

    // Auditoria
    await registrarAuditoria({
      usuario_id,
      accion: 'CREACION_ORDEN_COMPRA',
      tipo_operacion: 'CREACION',
      entidad_afectada: 'ordenes_compra',
      registro_afectado_id: nuevaOrdenId,
      cantidad_nueva: totalCrc,
      motivo: `Emision de orden de compra ${numeroOrden} (${nivelRequerido})` + (esDuplicado ? ' [Sospecha de duplicado]' : ''),
      datos_nuevos: { numero_orden: numeroOrden, total_crc: totalCrc, es_posible_duplicado: esDuplicado },
    }, conn);

    return await obtenerOrdenPorId(nuevaOrdenId, conn);
  });
}

/**
 * Consulta de ordenes de compra con filtros y detalles.
 */
export async function listarOrdenesCompra({ estado, proveedor_id, es_posible_duplicado, q, page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];

  if (estado) {
    conditions.push('oc.estado = ?');
    params.push(estado);
  }
  if (proveedor_id) {
    conditions.push('oc.proveedor_id = ?');
    params.push(Number(proveedor_id));
  }
  if (es_posible_duplicado !== undefined) {
    conditions.push('oc.es_posible_duplicado = ?');
    params.push(Number(es_posible_duplicado));
  }
  if (q) {
    conditions.push('(oc.numero_orden LIKE ? OR p.razon_social LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countRes = await query(`SELECT COUNT(*) AS total FROM ordenes_compra oc JOIN proveedores p ON p.id = oc.proveedor_id ${whereClause};`, params);
  const total = countRes[0].total;

  const sql = `
    SELECT
      oc.id, oc.numero_orden, oc.proveedor_id, p.razon_social AS proveedor_nombre,
      oc.ubicacion_destino_id, u.nombre AS ubicacion_destino_nombre,
      oc.usuario_creador_id, uc.nombre AS usuario_creador_nombre,
      oc.usuario_aprobador_id, ua.nombre AS usuario_aprobador_nombre,
      oc.fecha_emision, oc.fecha_entrega_estimada, oc.fecha_recepcion_completa,
      oc.estado, oc.nivel_aprobacion_requerido, oc.moneda,
      oc.subtotal_crc, oc.impuestos_crc, oc.total_crc,
      oc.es_posible_duplicado, oc.estado_revision_duplicado, oc.orden_similar_id,
      sim.numero_orden AS orden_similar_numero,
      oc.observaciones, oc.created_at, oc.updated_at
    FROM ordenes_compra oc
    JOIN proveedores p ON p.id = oc.proveedor_id
    JOIN ubicaciones u ON u.id = oc.ubicacion_destino_id
    JOIN usuarios uc ON uc.id = oc.usuario_creador_id
    LEFT JOIN usuarios ua ON ua.id = oc.usuario_aprobador_id
    LEFT JOIN ordenes_compra sim ON sim.id = oc.orden_similar_id
    ${whereClause}
    ORDER BY oc.id DESC
    LIMIT ? OFFSET ?;
  `;

  const items = await query(sql, [...params, Number(limit), Number(offset)]);
  return { items, total };
}

export async function obtenerOrdenPorId(id, conn = null) {
  const runner = conn || { query };

  const sql = `
    SELECT
      oc.id, oc.numero_orden, oc.proveedor_id, p.razon_social AS proveedor_nombre,
      oc.ubicacion_destino_id, u.nombre AS ubicacion_destino_nombre,
      oc.usuario_creador_id, uc.nombre AS usuario_creador_nombre,
      oc.usuario_aprobador_id, ua.nombre AS usuario_aprobador_nombre,
      oc.fecha_emision, oc.fecha_entrega_estimada, oc.fecha_recepcion_completa,
      oc.estado, oc.nivel_aprobacion_requerido, oc.moneda,
      oc.subtotal_crc, oc.impuestos_crc, oc.total_crc,
      oc.es_posible_duplicado, oc.estado_revision_duplicado, oc.orden_similar_id,
      sim.numero_orden AS orden_similar_numero,
      oc.observaciones, oc.created_at, oc.updated_at
    FROM ordenes_compra oc
    JOIN proveedores p ON p.id = oc.proveedor_id
    JOIN ubicaciones u ON u.id = oc.ubicacion_destino_id
    JOIN usuarios uc ON uc.id = oc.usuario_creador_id
    LEFT JOIN usuarios ua ON ua.id = oc.usuario_aprobador_id
    LEFT JOIN ordenes_compra sim ON sim.id = oc.orden_similar_id
    WHERE oc.id = ?;
  `;

  const rows = await runner.query(sql, [id]);
  const orden = Array.isArray(rows[0]) ? rows[0][0] : rows[0];
  if (!orden) return null;

  const detSql = `
    SELECT
      d.id, d.material_id, m.codigo AS material_codigo, m.nombre AS material_nombre,
      m.unidad_medida, d.cantidad_solicitada, d.cantidad_recibida, d.cantidad_pendiente,
      d.precio_unitario_crc, d.subtotal_crc
    FROM detalle_orden_compra d
    JOIN materiales m ON m.id = d.material_id
    WHERE d.orden_compra_id = ?
    ORDER BY d.id ASC;
  `;
  const detRows = await runner.query(detSql, [id]);
  orden.detalle = Array.isArray(detRows[0]) ? detRows[0] : detRows;

  return orden;
}

/**
 * Aprobacion de orden de compra aplicando:
 * 1. Segregacion de funciones (SoD): usuario aprobador <> usuario creador.
 * 2. Bloqueo si estado_revision_duplicado IN ('PENDIENTE_REVISION', 'CONFIRMADO_DUPLICADO').
 * 3. Matriz de aprobacion segun rol y nivel de importe.
 */
export async function aprobarOrdenCompra(id, usuarioAprobador) {
  const orden = await obtenerOrdenPorId(id);
  if (!orden) {
    const err = new Error('Orden de compra no encontrada.');
    err.statusCode = 404;
    throw err;
  }

  if (orden.estado !== 'PENDIENTE_APROBACION') {
    const err = new Error(`Solo se pueden aprobar ordenes en estado PENDIENTE_APROBACION. Estado actual: ${orden.estado}.`);
    err.statusCode = 400;
    throw err;
  }

  // REGLA SoD OBLIGATORIA: Un usuario no puede aprobar su propia orden
  if (Number(usuarioAprobador.id) === Number(orden.usuario_creador_id)) {
    // Registrar intento rechazado en auditoria independientemente
    await registrarAuditoria({
      usuario_id: usuarioAprobador.id,
      accion: 'INTENTO_APROBACION_RECHAZADO',
      tipo_operacion: 'SEGURIDAD_USUARIO',
      entidad_afectada: 'ordenes_compra',
      registro_afectado_id: id,
      motivo: `Intento de autoaprobacion denegado por segregacion de funciones (SoD) para orden ${orden.numero_orden}`,
      datos_previos: { estado: orden.estado },
    });

    const err = new Error('Segregacion de funciones: un usuario no puede aprobar una orden de compra que el mismo creo.');
    err.statusCode = 403;
    throw err;
  }

  // REGLA DE DUPLICADOS: No se puede aprobar con sospecha de duplicado pendiente o confirmada
  if (orden.es_posible_duplicado === 1 || ['PENDIENTE_REVISION', 'CONFIRMADO_DUPLICADO'].includes(orden.estado_revision_duplicado)) {
    const err = new Error('No se puede aprobar una orden con sospecha de duplicado pendiente o confirmada. Requiere revision previa.');
    err.statusCode = 400;
    throw err;
  }

  // Validacion de matriz de permisos por rol segun nivel requerido
  const rol = usuarioAprobador.rol;
  const nivel = orden.nivel_aprobacion_requerido;

  const permisosPorNivel = {
    NIVEL_1: ['ENCARGADO_INVENTARIO', 'COMPRAS', 'ADMINISTRADOR'],
    NIVEL_2: ['ENCARGADO_INVENTARIO', 'ADMINISTRADOR'],
    NIVEL_3: ['ADMINISTRADOR'],
  };

  const rolesPermitidos = permisosPorNivel[nivel] || ['ADMINISTRADOR'];
  if (!rolesPermitidos.includes(rol)) {
    const err = new Error(`El rol ${rol} no cuenta con autorizacion suficiente para aprobar ordenes de ${nivel}.`);
    err.statusCode = 403;
    throw err;
  }

  return await withTransaction(async (conn) => {
    await conn.execute(
      `UPDATE ordenes_compra
       SET estado = 'APROBADA', usuario_aprobador_id = ?, updated_at = NOW()
       WHERE id = ?;`,
      [usuarioAprobador.id, id]
    );

    // Outbox event
    const uuid = crypto.randomUUID();
    await conn.execute(
      `INSERT INTO eventos_integracion (
        evento_uuid, clave_idempotencia, tipo_evento, entidad_tipo, entidad_id,
        payload, estado, created_at
      ) VALUES (?, ?, 'ORDEN_COMPRA_ESTADO', 'ORDEN_COMPRA', ?, ?, 'PENDIENTE', NOW());`,
      [
        uuid,
        `ORDEN_COMPRA:${id}:ESTADO:APROBADA`,
        id,
        JSON.stringify({ orden_id: id, numero_orden: orden.numero_orden, nuevo_estado: 'APROBADA', aprobador_id: usuarioAprobador.id }),
      ]
    );

    // Auditoria
    await registrarAuditoria({
      usuario_id: usuarioAprobador.id,
      accion: 'APROBACION_ORDEN_COMPRA',
      tipo_operacion: 'CAMBIO_ESTADO',
      entidad_afectada: 'ordenes_compra',
      registro_afectado_id: id,
      motivo: `Aprobacion satisfactoria de orden ${orden.numero_orden} (${nivel}) por ${usuarioAprobador.nombre}`,
      datos_previos: { estado: 'PENDIENTE_APROBACION' },
      datos_nuevos: { estado: 'APROBADA', usuario_aprobador_id: usuarioAprobador.id },
    }, conn);

    return await obtenerOrdenPorId(id, conn);
  });
}

/**
 * Envio de orden de compra al proveedor (transicion APROBADA -> ENVIADA).
 */
export async function enviarOrdenCompra(id, usuario_id) {
  const orden = await obtenerOrdenPorId(id);
  if (!orden) {
    const err = new Error('Orden de compra no encontrada.');
    err.statusCode = 404;
    throw err;
  }
  if (orden.estado !== 'APROBADA') {
    const err = new Error(`Solo se pueden enviar ordenes que esten en estado APROBADA. Estado actual: ${orden.estado}.`);
    err.statusCode = 400;
    throw err;
  }

  await query(
    `UPDATE ordenes_compra SET estado = 'ENVIADA', updated_at = NOW() WHERE id = ?;`,
    [id]
  );

  await registrarAuditoria({
    usuario_id,
    accion: 'ENVIO_ORDEN_COMPRA',
    tipo_operacion: 'CAMBIO_ESTADO',
    entidad_afectada: 'ordenes_compra',
    registro_afectado_id: id,
    motivo: `Notificacion y despacho de orden ${orden.numero_orden} hacia proveedor`,
    datos_previos: { estado: 'APROBADA' },
    datos_nuevos: { estado: 'ENVIADA' },
  });

  return await obtenerOrdenPorId(id);
}

/**
 * Cancelacion de orden de compra.
 */
export async function cancelarOrdenCompra(id, motivo, usuario_id) {
  const orden = await obtenerOrdenPorId(id);
  if (!orden) {
    const err = new Error('Orden de compra no encontrada.');
    err.statusCode = 404;
    throw err;
  }

  const estadosCancelables = ['BORRADOR', 'PENDIENTE_APROBACION', 'APROBADA', 'ENVIADA'];
  if (!estadosCancelables.includes(orden.estado)) {
    const err = new Error(`No se puede cancelar una orden en estado ${orden.estado}.`);
    err.statusCode = 400;
    throw err;
  }

  await query(
    `UPDATE ordenes_compra SET estado = 'CANCELADA', updated_at = NOW() WHERE id = ?;`,
    [id]
  );

  await registrarAuditoria({
    usuario_id,
    accion: 'CANCELACION_ORDEN_COMPRA',
    tipo_operacion: 'CAMBIO_ESTADO',
    entidad_afectada: 'ordenes_compra',
    registro_afectado_id: id,
    motivo: motivo || 'Cancelacion de orden',
    datos_previos: { estado: orden.estado },
    datos_nuevos: { estado: 'CANCELADA' },
  });

  return await obtenerOrdenPorId(id);
}

/**
 * Resolucion humana de la revision de duplicados (CONFIRMAR_DUPLICADO o DESCARTAR_FALSO_POSITIVO).
 * Desacoplado: NO altera el estado operativo de la orden salvo las banderas de duplicidad.
 */
export async function revisarDuplicadoOrden(id, { decision, observaciones }, usuario_id) {
  const orden = await obtenerOrdenPorId(id);
  if (!orden) {
    const err = new Error('Orden de compra no encontrada.');
    err.statusCode = 404;
    throw err;
  }

  if (orden.estado_revision_duplicado !== 'PENDIENTE_REVISION') {
    const err = new Error(`La orden no se encuentra en estado PENDIENTE_REVISION. Estado actual: ${orden.estado_revision_duplicado}.`);
    err.statusCode = 400;
    throw err;
  }

  return await withTransaction(async (conn) => {
    let nuevoFlagDuplicado;
    let nuevoEstadoRevision;

    if (decision === 'CONFIRMAR_DUPLICADO') {
      nuevoFlagDuplicado = 1;
      nuevoEstadoRevision = 'CONFIRMADO_DUPLICADO';
    } else if (decision === 'DESCARTAR_FALSO_POSITIVO') {
      nuevoFlagDuplicado = 0;
      nuevoEstadoRevision = 'DESCARTADO_FALSO_POSITIVO';

      // Cerrar la alerta de duplicado asociada
      await conn.execute(
        `UPDATE alertas
         SET estado = 'DESCARTADA', motivo_cierre = ?, usuario_resolucion_id = ?, fecha_resolucion = NOW()
         WHERE contexto_clave = ? AND estado IN ('ACTIVA', 'EN_REVISION');`,
        [observaciones || 'Descartado como falso positivo por revision humana', usuario_id, `DUPLICADO:OC:${id}`]
      );
    } else {
      const err = new Error('Decision de revision invalida.');
      err.statusCode = 400;
      throw err;
    }

    await conn.execute(
      `UPDATE ordenes_compra
       SET es_posible_duplicado = ?, estado_revision_duplicado = ?, updated_at = NOW()
       WHERE id = ?;`,
      [nuevoFlagDuplicado, nuevoEstadoRevision, id]
    );

    await registrarAuditoria({
      usuario_id,
      accion: `REVISION_DUPLICADO_${decision}`,
      tipo_operacion: 'CAMBIO_ESTADO',
      entidad_afectada: 'ordenes_compra',
      registro_afectado_id: id,
      motivo: observaciones || `Resolucion de revision de duplicado: ${decision}`,
      datos_previos: { es_posible_duplicado: orden.es_posible_duplicado, estado_revision_duplicado: orden.estado_revision_duplicado },
      datos_nuevos: { es_posible_duplicado: nuevoFlagDuplicado, estado_revision_duplicado: nuevoEstadoRevision },
    }, conn);

    return await obtenerOrdenPorId(id, conn);
  });
}

