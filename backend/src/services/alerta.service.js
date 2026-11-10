import { query } from '../config/db.js';
import { registrarAuditoria } from './auditoria.service.js';

/**
 * Evalua el nivel de existencias de un material y gestiona alertas mutuamente excluyentes
 * para el contexto INVENTARIO:MAT:<material_id>.
 */
export async function evaluarAlertaStock(material_id, stockActual, conn = null) {
  const runner = conn || { query };

  const matRows = await runner.query(
    `SELECT id, codigo, nombre, unidad_medida, stock_minimo, punto_reorden
     FROM materiales
     WHERE id = ?;`,
    [material_id]
  );
  const material = Array.isArray(matRows[0]) ? matRows[0][0] : matRows[0];
  if (!material) return null;

  const stockMin = Number(material.stock_minimo);
  const pr = Number(material.punto_reorden);
  const stock = Number(stockActual);
  const contextoClave = `INVENTARIO:MAT:${material.id}`;

  let nuevoTipo = null;
  let nuevaSeveridad = null;
  let nuevoTitulo = null;
  let nuevoMensaje = null;

  if (stock <= 0) {
    nuevoTipo = 'STOCK_CRITICO';
    nuevaSeveridad = 'CRITICA';
    nuevoTitulo = `Material sin existencias: ${material.codigo} - ${material.nombre}`;
    nuevoMensaje = `El stock global actual es ${stock.toFixed(2)} ${material.unidad_medida} (stock minimo: ${stockMin.toFixed(2)}, punto de reorden: ${pr.toFixed(2)}). Existencias agotadas.`;
  } else if (stock <= stockMin) {
    nuevoTipo = 'STOCK_CRITICO';
    nuevaSeveridad = 'ALTA';
    nuevoTitulo = `Stock critico bajo minimo: ${material.codigo} - ${material.nombre}`;
    nuevoMensaje = `El stock global actual (${stock.toFixed(2)} ${material.unidad_medida}) es menor o igual al stock minimo operativo (${stockMin.toFixed(2)}). Punto de reorden: ${pr.toFixed(2)}.`;
  } else if (stock <= pr) {
    nuevoTipo = 'REORDEN';
    nuevaSeveridad = 'MEDIA';
    nuevoTitulo = `Punto de reorden alcanzado: ${material.codigo} - ${material.nombre}`;
    nuevoMensaje = `El stock global actual (${stock.toFixed(2)} ${material.unidad_medida}) es menor o igual al punto de reorden (${pr.toFixed(2)}) y superior al stock minimo (${stockMin.toFixed(2)}).`;
  }
  // Si stock > pr, nuevoTipo es null -> Estado NORMAL.

  // Buscar si existe actualmente una alerta abierta (ACTIVA o EN_REVISION) para este material
  const alertRows = await runner.query(
    `SELECT id, tipo, severidad, estado
     FROM alertas
     WHERE contexto_clave = ? AND estado IN ('ACTIVA', 'EN_REVISION')
     LIMIT 1;`,
    [contextoClave]
  );
  const alertaAbierta = Array.isArray(alertRows[0]) ? alertRows[0][0] : alertRows[0];

  if (!nuevoTipo) {
    // Estado NORMAL: si habia alerta abierta, cerrarla
    if (alertaAbierta) {
      await runner.query(
        `UPDATE alertas
         SET estado = 'RESUELTA', fecha_resolucion = NOW(), motivo_cierre = 'Existencias reestablecidas sobre el punto de reorden (${stock.toFixed(2)} > ${pr.toFixed(2)}).'
         WHERE id = ?;`,
        [alertaAbierta.id]
      );
      await registrarAuditoria({
        accion: 'CIERRE_AUTOMATICO_ALERTA_STOCK',
        tipo_operacion: 'CAMBIO_ESTADO',
        entidad_afectada: 'alertas',
        registro_afectado_id: alertaAbierta.id,
        motivo: `Cierre automatico por normalizacion de existencias (${material.codigo})`,
      }, conn);
    }
    return { estado: 'NORMAL', alerta: null };
  }

  // Si ya existe una alerta abierta con exactamente el mismo tipo y severidad, no duplicar
  if (alertaAbierta && alertaAbierta.tipo === nuevoTipo && alertaAbierta.severidad === nuevaSeveridad) {
    return { estado: nuevoTipo, alerta: alertaAbierta };
  }

  // Si existe una alerta abierta pero cambio de tipo o severidad, cerrar la previa para mantener la exclusion mutua
  if (alertaAbierta) {
    await runner.query(
      `UPDATE alertas
       SET estado = 'RESUELTA', fecha_resolucion = NOW(), motivo_cierre = 'Reemplazada por cambio de severidad/estado de inventario.'
       WHERE id = ?;`,
      [alertaAbierta.id]
    );
  }

  // Insertar la nueva alerta
  const insertRes = await runner.query(
    `INSERT INTO alertas (
      tipo, severidad, material_id, contexto_clave, estado, titulo, mensaje, fecha_generacion
    ) VALUES (?, ?, ?, ?, 'ACTIVA', ?, ?, NOW());`,
    [nuevoTipo, nuevaSeveridad, material.id, contextoClave, nuevoTitulo, nuevoMensaje]
  );
  const insertId = insertRes.insertId || (insertRes[0] && insertRes[0].insertId);

  await registrarAuditoria({
    accion: `GENERACION_ALERTA_${nuevoTipo}`,
    tipo_operacion: 'CREACION',
    entidad_afectada: 'alertas',
    registro_afectado_id: insertId,
    motivo: `Generacion automatica de alerta ${nuevoTipo} para material ${material.codigo}`,
  }, conn);

  return { estado: nuevoTipo, alerta_id: insertId };
}

export async function listarAlertas({ tipo, severidad, estado, material_id, page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];

  if (tipo) {
    conditions.push('a.tipo = ?');
    params.push(tipo);
  }
  if (severidad) {
    conditions.push('a.severidad = ?');
    params.push(severidad);
  }
  if (estado) {
    conditions.push('a.estado = ?');
    params.push(estado);
  }
  if (material_id) {
    conditions.push('a.material_id = ?');
    params.push(Number(material_id));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countRes = await query(`SELECT COUNT(*) AS total FROM alertas a ${whereClause};`, params);
  const total = countRes[0].total;

  const sql = `
    SELECT
      a.id, a.tipo, a.severidad, a.material_id, m.codigo AS material_codigo, m.nombre AS material_nombre,
      a.orden_compra_id, oc.numero_orden,
      a.evento_integracion_id, a.contexto_clave, a.estado, a.titulo, a.mensaje,
      a.motivo_cierre, a.usuario_resolucion_id, u.nombre AS usuario_resolucion_nombre,
      a.fecha_generacion, a.fecha_resolucion
    FROM alertas a
    LEFT JOIN materiales m ON m.id = a.material_id
    LEFT JOIN ordenes_compra oc ON oc.id = a.orden_compra_id
    LEFT JOIN usuarios u ON u.id = a.usuario_resolucion_id
    ${whereClause}
    ORDER BY
      CASE a.estado WHEN 'ACTIVA' THEN 1 WHEN 'EN_REVISION' THEN 2 ELSE 3 END ASC,
      CASE a.severidad WHEN 'CRITICA' THEN 1 WHEN 'ALTA' THEN 2 WHEN 'MEDIA' THEN 3 ELSE 4 END ASC,
      a.fecha_generacion DESC
    LIMIT ? OFFSET ?;
  `;

  const items = await query(sql, [...params, Number(limit), Number(offset)]);
  return { items, total };
}

export async function resolverAlerta(id, { motivo_cierre, usuario_id, nuevo_estado = 'RESUELTA' }) {
  const alertRows = await query('SELECT * FROM alertas WHERE id = ?;', [id]);
  const alerta = alertRows[0];
  if (!alerta) {
    const err = new Error('Alerta no encontrada.');
    err.statusCode = 404;
    throw err;
  }

  await query(
    `UPDATE alertas
     SET estado = ?, motivo_cierre = ?, usuario_resolucion_id = ?, fecha_resolucion = NOW()
     WHERE id = ?;`,
    [nuevo_estado, motivo_cierre || 'Resuelta manualmente por usuario', usuario_id, id]
  );

  await registrarAuditoria({
    usuario_id,
    accion: `RESOLUCION_ALERTA_${nuevo_estado}`,
    tipo_operacion: 'CAMBIO_ESTADO',
    entidad_afectada: 'alertas',
    registro_afectado_id: id,
    motivo: motivo_cierre || 'Resolucion manual',
    datos_previos: { estado: alerta.estado },
    datos_nuevos: { estado: nuevo_estado, motivo_cierre },
  });

  const updatedRows = await query('SELECT * FROM alertas WHERE id = ?;', [id]);
  return updatedRows[0];
}

