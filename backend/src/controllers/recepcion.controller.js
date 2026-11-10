import * as recepcionService from '../services/recepcion.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';

export async function listarRecepciones(req, res, next) {
  try {
    const { items, total } = await recepcionService.listarRecepciones(req.query);
    return paginatedResponse(res, items, total, req.query.page, req.query.limit, 'Historial de recepciones obtenido');
  } catch (err) {
    next(err);
  }
}

export async function registrarRecepcion(req, res, next) {
  try {
    const ordenId = req.params.ordenId || req.body.orden_id;
    if (!ordenId) {
      const err = new Error('Se requiere el identificador de la orden de compra.');
      err.statusCode = 400;
      throw err;
    }
    const resultado = await recepcionService.registrarRecepcionOrden(ordenId, req.body, req.usuario.id);
    return successResponse(res, resultado, 'Recepcion de materiales registrada exitosamente en inventario');
  } catch (err) {
    next(err);
  }
}
