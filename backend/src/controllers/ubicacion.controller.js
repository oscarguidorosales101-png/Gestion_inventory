import * as ubicacionService from '../services/ubicacion.service.js';
import { successResponse } from '../utils/response.js';

export async function listar(req, res, next) {
  try {
    const data = await ubicacionService.listarUbicaciones(req.query);
    return successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const u = await ubicacionService.obtenerUbicacionPorId(req.params.id);
    if (!u) {
      return res.status(404).json({ ok: false, message: 'Ubicacion no encontrada.' });
    }
    return successResponse(res, u);
  } catch (err) {
    next(err);
  }
}

export async function obtenerStockUbicacion(req, res, next) {
  try {
    const stock = await ubicacionService.obtenerStockPorUbicacionDetallado(req.params.id);
    return successResponse(res, stock);
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const u = await ubicacionService.crearUbicacion(req.body, req.usuario.id);
    return successResponse(res, u, 'Ubicacion creada exitosamente', 201);
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const u = await ubicacionService.actualizarUbicacion(req.params.id, req.body, req.usuario.id);
    return successResponse(res, u, 'Ubicacion actualizada exitosamente');
  } catch (err) {
    next(err);
  }
}

