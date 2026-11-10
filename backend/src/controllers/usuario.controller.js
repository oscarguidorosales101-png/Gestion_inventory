import * as usuarioService from '../services/usuario.service.js';
import { successResponse } from '../utils/response.js';

export async function listar(req, res, next) {
  try {
    const data = await usuarioService.listarUsuarios(req.query);
    return successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function obtenerPorId(req, res, next) {
  try {
    const u = await usuarioService.obtenerUsuarioPorId(req.params.id);
    if (!u) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });
    }
    return successResponse(res, {
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      requiere_cambio_clave: Number(u.requiere_cambio_clave) === 1,
      activo: Number(u.activo) === 1,
      ultimo_acceso: u.ultimo_acceso,
      created_at: u.created_at,
    });
  } catch (err) {
    next(err);
  }
}

export async function crear(req, res, next) {
  try {
    const u = await usuarioService.crearUsuario(req.body, req.usuario.id);
    return successResponse(res, u, 'Usuario creado exitosamente', 201);
  } catch (err) {
    next(err);
  }
}

export async function actualizar(req, res, next) {
  try {
    const u = await usuarioService.actualizarUsuario(req.params.id, req.body, req.usuario.id);
    return successResponse(res, u, 'Usuario actualizado exitosamente');
  } catch (err) {
    next(err);
  }
}

