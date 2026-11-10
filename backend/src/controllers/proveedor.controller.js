import * as proveedorService from '../services/proveedor.service.js';
import { successResponse } from '../utils/response.js';

export async function listar(req, res, next) {
  try {
    const data = await proveedorService.listarProveedores(req.query);
    return successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const p = await proveedorService.obtenerProveedorPorId(req.params.id);
    if (!p) {
      return res.status(404).json({ ok: false, message: 'Proveedor no encontrado.' });
    }
    return successResponse(res, p);
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const p = await proveedorService.crearProveedor(req.body, req.usuario.id);
    return successResponse(res, p, 'Proveedor creado exitosamente', 201);
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const p = await proveedorService.actualizarProveedor(req.params.id, req.body, req.usuario.id);
    return successResponse(res, p, 'Proveedor actualizado exitosamente');
  } catch (err) {
    next(err);
  }
}

