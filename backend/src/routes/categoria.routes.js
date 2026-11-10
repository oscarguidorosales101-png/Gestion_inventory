import { Router } from 'express';
import * as categoriaController from '../controllers/categoria.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createCategoriaSchema, updateCategoriaSchema } from '../validators/categoria.validator.js';

const router = Router();

router.get('/', authenticate, categoriaController.listar);
router.get('/:id', authenticate, categoriaController.obtenerPorId);
router.post(
  '/',
  authenticate,
  requireRole('ADMINISTRADOR', 'ENCARGADO_INVENTARIO'),
  validate(createCategoriaSchema),
  categoriaController.crear
);
router.put(
  '/:id',
  authenticate,
  requireRole('ADMINISTRADOR', 'ENCARGADO_INVENTARIO'),
  validate(updateCategoriaSchema),
  categoriaController.actualizar
);

export default router;

