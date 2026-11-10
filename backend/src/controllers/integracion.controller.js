import * as outboxService from '../services/outbox.service.js';
import * as inventarioService from '../services/inventario.service.js';
import * as alertaService from '../services/alerta.service.js';
import { registrarAuditoria } from '../services/auditoria.service.js';
import { query } from '../config/db.js';
import { successResponse, paginatedResponse } from '../utils/response.js';

export async function reclamarEventos(req, res, next) {
  try {
    const { batchSize = 20 } = req.body;
    const workerId = req.workerId || 'n8n-worker';
    const eventos = await outboxService.reclamarEventos(batchSize, workerId);
    return successResponse(res, eventos, `Se han reclamado ${eventos.length} eventos para procesamiento`);
  } catch (err) {
    next(err);
  }
}

export async function completarEvento(req, res, next) {
  try {
    const { id } = req.params;
    const { claim_token, resultado_procesamiento } = req.body;
    const resultado = await outboxService.completarEvento(id, claim_token, resultado_procesamiento);
    return successResponse(res, resultado, 'Evento completado exitosamente');
  } catch (err) {
    next(err);
  }
}

export async function fallarEvento(req, res, next) {
  try {
    const { id } = req.params;
    const { claim_token, error_mensaje } = req.body;
    const resultado = await outboxService.fallarEvento(id, claim_token, error_mensaje);
    return successResponse(res, resultado, 'Fallo de evento registrado');
  } catch (err) {
    next(err);
  }
}

export async function listarEventos(req, res, next) {
  try {
    const { items, total } = await outboxService.listarEventos(req.query);
    return paginatedResponse(res, items, total, req.query.page, req.query.limit);
  } catch (err) {
    next(err);
  }
}

export async function reprocesarEvento(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.usuario ? req.usuario.id : 1;
    const resultado = await outboxService.reprocesarEventoManual(id, adminId);
    return successResponse(res, resultado, 'Evento restablecido a estado PENDIENTE para reintento');
  } catch (err) {
    next(err);
  }
}

export async function evaluarAlertaStockAutomatizada(req, res, next) {
  try {
    const { material_id } = req.body;
    if (!material_id) {
      return res.status(400).json({ ok: false, message: 'material_id es requerido' });
    }
    const stockActual = await inventarioService.obtenerStockGlobal(material_id);
    const resultado = await alertaService.evaluarAlertaStock(material_id, stockActual);
    return successResponse(res, { material_id, stockActual, resultado }, 'Evaluacion de alerta completada');
  } catch (err) {
    next(err);
  }
}

export async function reevaluarAlertas(req, res, next) {
  try {
    const resultado = await alertaService.reevaluarTodasLasAlertas(null);
    return successResponse(res, resultado, 'Reevaluacion global de alertas ejecutada exitosamente');
  } catch (err) {
    next(err);
  }
}

export async function duplicadosPendientes(req, res, next) {
  try {
    const rows = await query(`
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
    return successResponse(res, { total_duplicados: rows.length, items: rows }, 'Duplicados pendientes obtenidos');
  } catch (err) {
    next(err);
  }
}

export async function incidenciaWorkflow(req, res, next) {
  try {
    const { workflow_id, workflow_name, execution_id, error_mensaje, error_stack, last_node_executed } = req.body;
    await registrarAuditoria({
      accion: 'ERROR_WORKFLOW_N8N',
      tipo_operacion: 'INCIDENCIA_SISTEMA',
      entidad_afectada: 'n8n_workflows',
      registro_afectado_id: 0,
      motivo: `Fallo capturado en n8n: ${workflow_name || workflow_id} - ${error_mensaje || 'Sin mensaje'}`,
      datos_nuevos: {
        workflow_id,
        workflow_name,
        execution_id,
        error_mensaje,
        error_stack,
        last_node_executed,
      },
    });
    return successResponse(res, { registrado: true }, 'Incidencia de workflow asentada en auditoria');
  } catch (err) {
    next(err);
  }
}

