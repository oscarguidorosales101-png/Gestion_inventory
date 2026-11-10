import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate, checkRole } from '../middlewares/auth.js';

const router = Router();

// Endpoint raiz /api/dashboard y /api/dashboard/resumen
router.get('/', authenticate, dashboardController.getDashboardResumen);
router.get('/resumen', authenticate, dashboardController.getDashboardResumen);

// Endpoints especificos por rol
router.get('/admin', authenticate, checkRole(['ADMINISTRADOR']), dashboardController.getAdminDashboard);
router.get('/inventario', authenticate, checkRole(['ADMINISTRADOR', 'ENCARGADO_INVENTARIO']), dashboardController.getInventarioDashboard);
router.get('/compras', authenticate, checkRole(['ADMINISTRADOR', 'COMPRAS']), dashboardController.getComprasDashboard);
router.get('/consulta', authenticate, checkRole(['ADMINISTRADOR', 'ENCARGADO_INVENTARIO', 'COMPRAS', 'CONSULTA']), dashboardController.getConsultaDashboard);

export default router;
