import { verifyToken } from '../utils/crypto.js';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { errorResponse } from '../utils/response.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Token de autorizacion ausente o formato invalido.', 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token, env.JWT_SECRET);
    if (!payload || !payload.id) {
      return errorResponse(res, 'Sesion expirada o token no valido.', 401);
    }

    const users = await query(
      `SELECT id, nombre, email, rol, activo, requiere_cambio_clave, ultimo_acceso
       FROM usuarios
       WHERE id = ? LIMIT 1;`,
      [payload.id]
    );

    if (!users || users.length === 0) {
      return errorResponse(res, 'Usuario no encontrado.', 401);
    }

    const user = users[0];
    if (Number(user.activo) !== 1) {
      return errorResponse(res, 'La cuenta de usuario se encuentra inactiva.', 401);
    }

    // Si requiere cambio de clave forzado, bloquear acceso a rutas distintas de cambio de clave
    if (Number(user.requiere_cambio_clave) === 1) {
      const allowedPaths = ['/api/auth/cambiar-clave', '/api/auth/me', '/api/auth/logout'];
      if (!allowedPaths.includes(req.baseUrl + req.path) && !allowedPaths.includes(req.path)) {
        return errorResponse(res, 'Debe cambiar su contrasena temporal antes de acceder al sistema.', 403, {
          requiere_cambio_clave: true,
        });
      }
    }

    req.usuario = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware generador para autorizacion RBAC basada en roles.
 */
export function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return errorResponse(res, 'Autenticacion requerida.', 401);
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return errorResponse(res, `Acceso denegado. Se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}.`, 403);
    }

    next();
  };
}

