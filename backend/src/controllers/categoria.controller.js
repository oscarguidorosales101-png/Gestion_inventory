import * as categoriaService from '../services/categoria.service.js';
import { successResponse } from '../utils/response.js';

export async function listar(req, res, next) {
  try {
    const data = await categoriaService.listarCategorias(req.query);
    return successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const cat = await categoriaService.obtenerCategoriaPorId(req.params.id);
    if (!cat) {
      return res.status(404).json({ ok: false, message: 'Categoria no encontrada.' });
    }
    return successResponse(res, cat);
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const cat = await categoriaService.crearCategoria(req.body, req.usuario.id);
    return successResponse(res, cat, 'Categoria creada exitosamente', 201);
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const cat = await categoriaService.actualizarCategoria(req.params.id, req.body, req.usuario.id);
    return successResponse(res, cat, 'Categoria actualizada exitosamente');
  } catch (err) {
    next(err);
  }
}

