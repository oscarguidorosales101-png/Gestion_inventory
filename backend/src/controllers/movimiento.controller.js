import * as movimientoService from '../services/movimiento.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';

export async function listar(req, res, next) {
  try {
    const { items, total } = await movimientoService.listarMovimientos(req.query);
    return paginatedResponse(res, items, total, req.query.page, req.query.limit);
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const mov = await movimientoService.obtenerMovimientoPorId(req.params.id);
    if (!mov) {
      return res.status(404).json({ ok: false, message: 'Movimiento no encontrado.' });
    }
    return successResponse(res, mov);
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const mov = await movimientoService.registrarMovimiento(req.body, req.usuario.id);
    return successResponse(res, mov, 'Movimiento de inventario registrado exitosamente', 201);
  } catch (err) {
    next(err);
  }
}

