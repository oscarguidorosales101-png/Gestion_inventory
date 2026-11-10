import crypto from 'node:crypto';
import { query, withTransaction } from '../config/db.js';
import { registrarAuditoria } from './auditoria.service.js';

/**
 * Reclama de forma atomica un lote de eventos pendientes para ser procesados por n8n o worker asincrono.
 * Implementa:
 * 1. Recuperacion automatica de eventos abandonados en estado PROCESSING que hayan superado timeout_segundos.
 * 2. Seleccion concurrente sin contencion mediante FOR UPDATE SKIP LOCKED.
 * 3. Generacion de claim_token unico por reclamo (fencing) para invalidar workers lentos o expirados.
 */
export async function reclamarEventos(batchSize = 20, workerId = 'n8n-worker') {
  return await withTransaction(async (conn) => {
    // 1. Recuperar eventos vencidos en PROCESSING (invalida claim_token previo)
    await conn.execute(
      `UPDATE eventos_integracion
       SET estado = 'PENDIENTE',
           locked_at = NULL,
           locked_by = NULL,
           claim_token = NULL
       WHERE estado = 'PROCESSING'
         AND locked_at IS NOT NULL
         AND TIMESTAMPDIFF(SECOND, locked_at, NOW()) > timeout_segundos;`
    );

    // 2. Seleccionar eventos PENDIENTES con FOR UPDATE SKIP LOCKED
    const limit = Math.min(Math.max(Number(batchSize) || 20, 1), 100);
    const [candidatos] = await conn.execute(
      `SELECT id, evento_uuid, clave_idempotencia, tipo_evento, entidad_tipo, entidad_id,
              payload, intentos, max_intentos, timeout_segundos
       FROM eventos_integracion
       WHERE estado = 'PENDIENTE'
       ORDER BY id ASC
       LIMIT ${limit}
       FOR UPDATE SKIP LOCKED;`
    );

    if (!candidatos || candidatos.length === 0) {
      return [];
    }

    const eventosReclamados = [];

    // 3. Asignar nuevo claim_token y pasar a estado PROCESSING
    for (const ev of candidatos) {
      const nuevoClaimToken = crypto.randomUUID();
      await conn.execute(
        `UPDATE eventos_integracion
         SET estado = 'PROCESSING',
             locked_at = NOW(),
             locked_by = ?,
             claim_token = ?,
             intentos = intentos + 1
         WHERE id = ?;`,
        [workerId, nuevoClaimToken, ev.id]
      );

      eventosReclamados.push({
        id: ev.id,
        evento_uuid: ev.evento_uuid,
        clave_idempotencia: ev.clave_idempotencia,
        tipo_evento: ev.tipo_evento,
        entidad_tipo: ev.entidad_tipo,
        entidad_id: ev.entidad_id,
        payload: typeof ev.payload === 'string' ? JSON.parse(ev.payload) : ev.payload,
        intentos: ev.intentos + 1,
        max_intentos: ev.max_intentos,
        claim_token: nuevoClaimToken,
      });
    }

    return eventosReclamados;
  });
}

/**
 * Completa el procesamiento de un evento verificado mediante claim_token (fencing).
 * Si el token no coincide o el evento expiro y fue recuperado por otro worker, rechaza con 409 Conflict (CP-OUTBOX-01).
 */
export async function completarEvento(id, claim_token, resultado_procesamiento = null) {
  return await withTransaction(async (conn) => {
    const [res] = await conn.execute(
      `UPDATE eventos_integracion
       SET estado = 'PROCESADO',
           processed_at = NOW(),
           locked_at = NULL,
           locked_by = NULL,
           claim_token = NULL,
           resultado_procesamiento = ?
       WHERE id = ? AND claim_token = ? AND estado = 'PROCESSING';`,
      [resultado_procesamiento ? JSON.stringify(resultado_procesamiento) : null, id, claim_token]
    );

    if (res.affectedRows === 0) {
      const err = new Error(
        'Conflicto de concurrencia: el evento ya no pertenece al trabajador o el claim_token ha expirado.'
      );
      err.statusCode = 409;
      throw err;
    }

    await registrarAuditoria({
      accion: 'EVENTO_OUTBOX_PROCESADO',
      tipo_operacion: 'AUTOMATIZACION',
      entidad_afectada: 'eventos_integracion',
      registro_afectado_id: id,
      motivo: `Evento de integracion #${id} procesado exitosamente por n8n`,
    }, conn);

    return { ok: true, id, estado: 'PROCESADO' };
  });
}

/**
 * Registra un fallo en el procesamiento de un evento.
 * Si alcanza max_intentos pasa a ERROR y genera alerta de fallo; de lo contrario regresa a PENDIENTE para reintento.
 */
export async function fallarEvento(id, claim_token, error_mensaje) {
  return await withTransaction(async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id, evento_uuid, intentos, max_intentos
       FROM eventos_integracion
       WHERE id = ? AND claim_token = ? AND estado = 'PROCESSING'
       FOR UPDATE;`,
      [id, claim_token]
    );

    const evento = rows[0];
    if (!evento) {
      const err = new Error(
        'Conflicto de concurrencia: el evento ya no pertenece al trabajador o el claim_token ha expirado.'
      );
      err.statusCode = 409;
      throw err;
    }

    const haAgotadoIntentos = evento.intentos >= evento.max_intentos;
    const nuevoEstado = haAgotadoIntentos ? 'ERROR' : 'PENDIENTE';

    await conn.execute(
      `UPDATE eventos_integracion
       SET estado = ?,
           locked_at = NULL,
           locked_by = NULL,
           claim_token = NULL,
           ultimo_error = ?
       WHERE id = ?;`,
      [nuevoEstado, error_mensaje.slice(0, 500), id]
    );

    if (haAgotadoIntentos) {
      // Generar alerta de ERROR_WORKFLOW
      await conn.execute(
        `INSERT INTO alertas (
          tipo, severidad, evento_integracion_id, contexto_clave,
          estado, titulo, mensaje, fecha_generacion
        ) VALUES (
          'ERROR_WORKFLOW', 'CRITICA', ?, ?,
          'ACTIVA', ?, ?, NOW()
        );`,
        [
          id,
          `WORKFLOW:EVENTO:${id}`,
          `Fallo critico en procesamiento de evento #${id}`,
          `El evento ${evento.evento_uuid} supero los ${evento.max_intentos} intentos permitidos. Error: ${error_mensaje.slice(0, 300)}`
        ]
      );
    }

    await registrarAuditoria({
      accion: haAgotadoIntentos ? 'EVENTO_OUTBOX_ERROR_FINAL' : 'EVENTO_OUTBOX_FALLO_REINTENTABLE',
      tipo_operacion: 'AUTOMATIZACION',
      entidad_afectada: 'eventos_integracion',
      registro_afectado_id: id,
      motivo: `Fallo reportado por worker en evento #${id}: ${error_mensaje.slice(0, 200)}`,
    }, conn);

    return { ok: true, id, estado: nuevoEstado, reintento_posible: !haAgotadoIntentos };
  });
}

export async function listarEventos({ estado, tipo_evento, page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];

  if (estado) {
    conditions.push('estado = ?');
    params.push(estado);
  }
  if (tipo_evento) {
    conditions.push('tipo_evento = ?');
    params.push(tipo_evento);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countRes = await query(`SELECT COUNT(*) AS total FROM eventos_integracion ${whereClause};`, params);
  const total = countRes[0].total;

  const sql = `
    SELECT id, evento_uuid, clave_idempotencia, tipo_evento, entidad_tipo, entidad_id,
           payload, estado, intentos, max_intentos, locked_at, locked_by,
           timeout_segundos, ultimo_error, resultado_procesamiento, created_at, processed_at
    FROM eventos_integracion
    ${whereClause}
    ORDER BY id DESC
    LIMIT ? OFFSET ?;
  `;

  const items = await query(sql, [...params, Number(limit), Number(offset)]);
  return { items, total };
}

export async function reprocesarEventoManual(id, adminUsuarioId) {
  const [rows] = await query('SELECT * FROM eventos_integracion WHERE id = ?;', [id]);
  const evento = rows[0];
  if (!evento) {
    const err = new Error('Evento no encontrado.');
    err.statusCode = 404;
    throw err;
  }

  await query(
    `UPDATE eventos_integracion
     SET estado = 'PENDIENTE', intentos = 0, locked_at = NULL, locked_by = NULL, claim_token = NULL, ultimo_error = NULL
     WHERE id = ?;`,
    [id]
  );

  await registrarAuditoria({
    usuario_id: adminUsuarioId,
    accion: 'REPROCESAMIENTO_MANUAL_OUTBOX',
    tipo_operacion: 'AUTOMATIZACION',
    entidad_afectada: 'eventos_integracion',
    registro_afectado_id: id,
    motivo: `Reinicio manual de evento #${id} a estado PENDIENTE`,
  });

  return { ok: true, id, estado: 'PENDIENTE' };
}

