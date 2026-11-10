import { Router } from 'express';
import * as proveedorController from '../controllers/proveedor.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createProveedorSchema, updateProveedorSchema } from '../validators/proveedor.validator.js';

const router = Router();

router.get('/', authenticate, proveedorController.listar);
router.get('/:id', authenticate, proveedorController.obtenerPorId);
router.post(
  '/',
  authenticate,
  requireRole('ADMINISTRADOR', 'COMPRAS'),
  validate(createProveedorSchema),
  proveedorController.crear
);
router.put(
  '/:id',
  authenticate,
  requireRole('ADMINISTRADOR', 'COMPRAS'),
  validate(updateProveedorSchema),
  proveedorController.actualizar
);

export default router;

