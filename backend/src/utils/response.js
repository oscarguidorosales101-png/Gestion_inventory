export function successResponse(res, data = null, message = 'Operacion exitosa', statusCode = 200) {
  return res.status(statusCode).json({
    ok: true,
    message,
    data,
  });
}

export function paginatedResponse(res, items, total, page = 1, limit = 20, message = 'Consulta exitosa') {
  const totalPages = Math.ceil(total / limit) || 1;
  return res.status(200).json({
    ok: true,
    message,
    data: items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}

export function errorResponse(res, message = 'Error en el servidor', statusCode = 500, errors = null) {
  const payload = {
    ok: false,
    message,
  };
  if (errors) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
}

