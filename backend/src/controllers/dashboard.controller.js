import * as dashboardService from '../services/dashboard.service.js';
import { successResponse } from '../utils/response.js';

export async function getDashboardResumen(req, res, next) {
  try {
    const data = await dashboardService.obtenerMetricasDashboard(req.query);
    return successResponse(res, data, 'Metricas de dashboard obtenidas correctamente');
  } catch (err) {
    next(err);
  }
}

