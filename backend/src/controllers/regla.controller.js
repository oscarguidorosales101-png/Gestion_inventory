import * as reglaService from '../services/regla.service.js';
import { successResponse } from '../utils/response.js';

export async function listar(req, res, next) {
  try {
    const data = await reglaService.listarReglas();
    return successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const r = await reglaService.obtenerReglaPorId(req.params.id);
    if (!r) {
      return res.status(404).json({ ok: false, message: 'Regla no encontrada.' });
    }
    return successResponse(res, r);
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const r = await reglaService.actualizarRegla(req.params.id, req.body, req.usuario.id);
    return successResponse(res, r, 'Regla de negocio actualizada exitosamente');
  } catch (err) {
    next(err);
  }
}

