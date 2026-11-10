import * as outboxService from '../services/outbox.service.js';
import * as inventarioService from '../services/inventario.service.js';
import * as alertaService from '../services/alerta.service.js';
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

