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

export async function getAdminDashboard(req, res, next) {
  try {
    const data = await dashboardService.obtenerDashboardAdmin();
    return successResponse(res, data, 'Dashboard de Administracion obtenido');
  } catch (err) {
    next(err);
  }
}

export async function getInventarioDashboard(req, res, next) {
  try {
    const data = await dashboardService.obtenerDashboardInventario();
    return successResponse(res, data, 'Dashboard de Inventario obtenido');
  } catch (err) {
    next(err);
  }
}

export async function getComprasDashboard(req, res, next) {
  try {
    const data = await dashboardService.obtenerDashboardCompras();
    return successResponse(res, data, 'Dashboard de Compras obtenido');
  } catch (err) {
    next(err);
  }
}

export async function getConsultaDashboard(req, res, next) {
  try {
    const data = await dashboardService.obtenerDashboardConsulta();
    return successResponse(res, data, 'Dashboard de Consulta obtenido');
  } catch (err) {
    next(err);
  }
}

export async function getGeminiStatus(req, res, next) {
  try {
    const geminiService = await import('../services/gemini.service.js');
    const estado = await geminiService.verificarConexionGemini();
    return successResponse(res, estado, 'Estado de conexion con Gemini API');
  } catch (err) {
    next(err);
  }
}

export async function getAnalisisIA(req, res, next) {
  try {
    const geminiService = await import('../services/gemini.service.js');
    const metricas = await dashboardService.obtenerMetricasDashboard();
    const analisis = await geminiService.generarAnalisisInventarioIA(metricas);
    return successResponse(res, analisis, 'Analisis ejecutivo de inventario generado con IA');
  } catch (err) {
    next(err);
  }
}
