import { Router } from 'express';
import * as movimientoController from '../controllers/movimiento.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createMovimientoManualSchema } from '../validators/movimiento.validator.js';

const router = Router();

router.get('/', authenticate, movimientoController.listar);
router.get('/:id', authenticate, movimientoController.obtenerPorId);
router.post(
  '/',
  authenticate,
  requireRole('ADMINISTRADOR', 'ENCARGADO_INVENTARIO'),
  validate(createMovimientoManualSchema),
  movimientoController.crear
);

export default router;

