import * as usuarioService from '../services/usuario.service.js';
import { successResponse } from '../utils/response.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await usuarioService.autenticarUsuario(email, password);
    return successResponse(res, result, 'Inicio de sesion exitoso');
  } catch (err) {
    next(err);
  }
}

export async function cambiarClave(req, res, next) {
  try {
    const { passwordActual, passwordNueva } = req.body;
    const result = await usuarioService.cambiarClave(req.usuario.id, passwordActual, passwordNueva);
    return successResponse(res, result, 'Contrasena actualizada exitosamente');
  } catch (err) {
    next(err);
  }
}

export async function getPerfil(req, res, next) {
  try {
    const user = await usuarioService.obtenerUsuarioPorId(req.usuario.id);
    return successResponse(res, {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      requiere_cambio_clave: Number(user.requiere_cambio_clave) === 1,
      ultimo_acceso: user.ultimo_acceso,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res) {
  return successResponse(res, null, 'Sesion cerrada exitosamente');
}

