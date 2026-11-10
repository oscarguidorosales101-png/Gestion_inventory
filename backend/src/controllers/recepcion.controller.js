import * as recepcionService from '../services/recepcion.service.js';
import { successResponse } from '../utils/response.js';

export async function registrarRecepcion(req, res, next) {
  try {
    const ordenId = req.params.ordenId;
    const resultado = await recepcionService.registrarRecepcionOrden(ordenId, req.body, req.usuario.id);
    return successResponse(res, resultado, 'Recepcion de materiales registrada exitosamente en inventario');
  } catch (err) {
    next(err);
  }
}

