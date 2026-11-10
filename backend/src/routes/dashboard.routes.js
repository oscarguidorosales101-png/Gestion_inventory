import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate, requireRole, checkRole } from '../middlewares/auth.js';

const router = Router();

// Endpoint raiz general (resumen global)
router.get('/', authenticate, dashboardController.getDashboardResumen);
router.get('/resumen', authenticate, dashboardController.getDashboardResumen);

// Estado de conectividad de Gemini AI
router.get('/gemini-status', authenticate, dashboardController.getGeminiStatus);
router.get(
  '/analisis-ia',
  authenticate,
  checkRole(['ADMINISTRADOR', 'COMPRAS', 'ENCARGADO_INVENTARIO']),
  dashboardController.getAnalisisIA
);

// Endpoints especificos por rol (garantizan separacion de responsabilidades en la API)
router.get(
  '/admin',
  authenticate,
  checkRole(['ADMINISTRADOR']),
  dashboardController.getAdminDashboard
);

router.get(
  '/inventario',
  authenticate,
  checkRole(['ADMINISTRADOR', 'ENCARGADO_INVENTARIO']),
  dashboardController.getInventarioDashboard
);

router.get(
  '/compras',
  authenticate,
  checkRole(['ADMINISTRADOR', 'COMPRAS']),
  dashboardController.getComprasDashboard
);

router.get(
  '/consulta',
  authenticate,
  checkRole(['ADMINISTRADOR', 'ENCARGADO_INVENTARIO', 'COMPRAS', 'CONSULTA']),
  dashboardController.getConsultaDashboard
);

export default router;
