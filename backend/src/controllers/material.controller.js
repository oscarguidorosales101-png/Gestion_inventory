import * as materialService from '../services/material.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';

export async function listar(req, res, next) {
  try {
    const { items, total } = await materialService.listarMateriales(req.query);
    return paginatedResponse(res, items, total, req.query.page, req.query.limit);
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const material = await materialService.obtenerMaterialPorId(req.params.id);
    if (!material) {
      return res.status(404).json({ ok: false, message: 'Material no encontrado.' });
    }
    return successResponse(res, material);
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const material = await materialService.crearMaterial(req.body, req.usuario.id);
    return successResponse(res, material, 'Material registrado exitosamente', 201);
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const material = await materialService.actualizarMaterial(req.params.id, req.body, req.usuario.id);
    return successResponse(res, material, 'Material actualizado exitosamente');
  } catch (err) {
    next(err);
  }
}

