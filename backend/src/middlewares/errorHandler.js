import { ZodError } from 'zod';
import { errorResponse } from '../utils/response.js';

export function errorHandler(err, req, res, next) {
  // Manejo de errores de validacion Zod
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      campo: e.path.join('.'),
      mensaje: e.message,
    }));
    return errorResponse(res, 'Datos de entrada invalidos', 400, formattedErrors);
  }

  // Manejo de errores de negocio lanzados por SIGNAL SQLSTATE 45000 en MySQL (triggers)
  if (err.sqlState === '45000' || err.errno === 1644) {
    return errorResponse(res, err.sqlMessage || err.message, 400);
  }

  // Entrada duplicada en MySQL (UNIQUE KEY)
  if (err.errno === 1062 || err.code === 'ER_DUP_ENTRY') {
    return errorResponse(res, 'Ya existe un registro con los mismos datos clave (duplicado).', 409);
  }

  // Violacion de restriccion CHECK en MySQL
  if (err.errno === 3819 || err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return errorResponse(res, 'Los datos no cumplen con las reglas de integridad del sistema.', 400);
  }

  // Violacion de clave foranea en MySQL
  if (err.errno === 1452 || err.code === 'ER_NO_REFERENCED_ROW_2') {
    return errorResponse(res, 'Se hace referencia a un registro relacionado que no existe.', 400);
  }
  if (err.errno === 1451 || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return errorResponse(res, 'No se puede eliminar o modificar el registro porque esta siendo utilizado en otros modulos.', 409);
  }

  // Errores con codigo HTTP explicito asignado por la aplicacion
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
    return errorResponse(res, err.message, err.statusCode, err.errors || null);
  }

  // Errores no controlados (500)
  console.error('[errorHandler] Error interno no controlado:', {
    mensaje: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  return errorResponse(res, 'Ha ocurrido un error interno en el servidor.', 500);
}

