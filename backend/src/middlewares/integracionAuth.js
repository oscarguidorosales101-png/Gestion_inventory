import { safeEqual, verifyToken } from '../utils/crypto.js';
import { env } from '../config/env.js';
import { errorResponse } from '../utils/response.js';

/**
 * Middleware para proteger endpoints de integracion (/api/integracion/*).
 * Exige la cabecera HTTP X-Integration-Key con comparacion en tiempo constante,
 * o alternativamente un token Bearer valido de un usuario con rol ADMINISTRADOR.
 */
export function integracionAuth(req, res, next) {
  const integrationKey = req.headers['x-integration-key'];

  if (integrationKey && typeof integrationKey === 'string') {
    if (safeEqual(integrationKey, env.N8N_INTEGRATION_API_KEY)) {
      req.esIntegracion = true;
      req.workerId = req.headers['x-worker-id'] || 'n8n-worker';
      return next();
    }
  }

  // Soporte para administradores autenticados que ejecutan reprocesamiento manual desde la UI
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token, env.JWT_SECRET);
    if (payload && payload.rol === 'ADMINISTRADOR') {
      req.esIntegracion = false;
      req.usuario = payload;
      req.workerId = `admin-manual-${payload.id}`;
      return next();
    }
  }

  return errorResponse(
    res,
    'Acceso no autorizado al servicio de integracion. Se requiere cabecera X-Integration-Key valida o rol de ADMINISTRADOR.',
    401
  );
}

