import { Router } from 'express';
import * as alertaController from '../controllers/alerta.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticate, alertaController.listar);
router.post(
  '/reevaluar',
  authenticate,
  requireRole('ADMINISTRADOR', 'ENCARGADO_INVENTARIO', 'COMPRAS'),
  alertaController.reevaluar
);
router.get('/:id', authenticate, alertaController.obtenerPorId);
router.post(
  '/:id/resolver',
  authenticate,
  requireRole('ADMINISTRADOR', 'ENCARGADO_INVENTARIO', 'COMPRAS'),
  alertaController.resolver
);

export default router;
