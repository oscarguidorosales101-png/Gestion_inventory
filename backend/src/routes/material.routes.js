import { Router } from 'express';
import * as materialController from '../controllers/material.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createMaterialSchema, updateMaterialSchema } from '../validators/material.validator.js';

const router = Router();

router.get('/', authenticate, materialController.listar);
router.get('/:id', authenticate, materialController.obtenerPorId);
router.post(
  '/',
  authenticate,
  requireRole('ADMINISTRADOR', 'ENCARGADO_INVENTARIO', 'COMPRAS'),
  validate(createMaterialSchema),
  materialController.crear
);
router.put(
  '/:id',
  authenticate,
  requireRole('ADMINISTRADOR', 'ENCARGADO_INVENTARIO'),
  validate(updateMaterialSchema),
  materialController.actualizar
);

export default router;

