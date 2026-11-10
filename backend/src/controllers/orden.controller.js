import * as ordenService from '../services/orden.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';

export async function listar(req, res, next) {
  try {
    const { items, total } = await ordenService.listarOrdenesCompra(req.query);
    return paginatedResponse(res, items, total, req.query.page, req.query.limit);
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const orden = await ordenService.obtenerOrdenPorId(req.params.id);
    if (!orden) {
      return res.status(404).json({ ok: false, message: 'Orden de compra no encontrada.' });
    }
    return successResponse(res, orden);
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const orden = await ordenService.crearOrdenCompra(req.body, req.usuario.id);
    return successResponse(res, orden, 'Orden de compra emitida exitosamente', 201);
  } catch (err) {
    next(err);
  }
}

export async function aprobar(req, res, next) {
  try {
    const orden = await ordenService.aprobarOrdenCompra(req.params.id, req.usuario);
    return successResponse(res, orden, 'Orden de compra aprobada exitosamente');
  } catch (err) {
    next(err);
  }
}

export async function enviar(req, res, next) {
  try {
    const orden = await ordenService.enviarOrdenCompra(req.params.id, req.usuario.id);
    return successResponse(res, orden, 'Orden de compra enviada al proveedor');
  } catch (err) {
    next(err);
  }
}

export async function cancelar(req, res, next) {
  try {
    const orden = await ordenService.cancelarOrdenCompra(req.params.id, req.body.motivo, req.usuario.id);
    return successResponse(res, orden, 'Orden de compra cancelada');
  } catch (err) {
    next(err);
  }
}

export async function revisarDuplicado(req, res, next) {
  try {
    const orden = await ordenService.revisarDuplicadoOrden(req.params.id, req.body, req.usuario.id);
    return successResponse(res, orden, 'Revision de duplicado registrada exitosamente');
  } catch (err) {
    next(err);
  }
}

export async function obtenerAnalisisIA(req, res, next) {
  try {
    const { id } = req.params;
    let analisis = await ordenService.obtenerAnalisisDuplicadoIA(id);
    if (!analisis) {
      analisis = await ordenService.ejecutarAnalisisDuplicadoIA(id);
    }
    return successResponse(res, analisis, 'Analisis de duplicidad IA obtenido');
  } catch (err) {
    next(err);
  }
}

export async function analizarIA(req, res, next) {
  try {
    const { id } = req.params;
    const analisis = await ordenService.ejecutarAnalisisDuplicadoIA(id);
    return successResponse(res, analisis, 'Analisis de duplicidad IA ejecutado exitosamente');
  } catch (err) {
    next(err);
  }
}


