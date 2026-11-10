import * as auditoriaService from '../services/auditoria.service.js';
import { paginatedResponse } from '../utils/response.js';

export async function listar(req, res, next) {
  try {
    const { items, total } = await auditoriaService.listarAuditoria(req.query);
    return paginatedResponse(res, items, total, req.query.page, req.query.limit);
  } catch (err) {
    next(err);
  }
}

