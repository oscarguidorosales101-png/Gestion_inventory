import { Router } from 'express';
import * as ubicacionController from '../controllers/ubicacion.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createUbicacionSchema, updateUbicacionSchema } from '../validators/ubicacion.validator.js';

const router = Router();

router.get('/', authenticate, ubicacionController.listar);
router.get('/:id', authenticate, ubicacionController.obtenerPorId);
router.get('/:id/stock', authenticate, ubicacionController.obtenerStockUbicacion);
router.post(
  '/',
  authenticate,
  requireRole('ADMINISTRADOR', 'ENCARGADO_INVENTARIO'),
  validate(createUbicacionSchema),
  ubicacionController.crear
);
router.put(
  '/:id',
  authenticate,
  requireRole('ADMINISTRADOR', 'ENCARGADO_INVENTARIO'),
  validate(updateUbicacionSchema),
  ubicacionController.actualizar
);

export default router;

