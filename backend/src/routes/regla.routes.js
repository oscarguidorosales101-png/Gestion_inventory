import { Router } from 'express';
import * as reglaController from '../controllers/regla.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { updateReglaSchema } from '../validators/regla.validator.js';

const router = Router();

router.get('/', authenticate, reglaController.listar);
router.get('/:id', authenticate, reglaController.obtenerPorId);
router.put(
  '/:id',
  authenticate,
  requireRole('ADMINISTRADOR'),
  validate(updateReglaSchema),
  reglaController.actualizar
);

export default router;

