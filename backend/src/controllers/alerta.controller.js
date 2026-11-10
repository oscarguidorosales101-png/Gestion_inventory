import * as alertaService from '../services/alerta.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';

export async function listar(req, res, next) {
  try {
    const { items, total } = await alertaService.listarAlertas(req.query);
    return paginatedResponse(res, items, total, req.query.page, req.query.limit);
  } catch (err) {
    next(err);
  }
}

export async function resolver(req, res, next) {
  try {
    const alerta = await alertaService.resolverAlerta(req.params.id, {
      motivo_cierre: req.body.motivo_cierre,
      usuario_id: req.usuario.id,
      nuevo_estado: req.body.estado || 'RESUELTA',
    });
    return successResponse(res, alerta, 'Alerta actualizada exitosamente');
  } catch (err) {
    next(err);
  }
}

