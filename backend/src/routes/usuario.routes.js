import { Router } from 'express';
import * as usuarioController from '../controllers/usuario.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createUsuarioSchema, updateUsuarioSchema } from '../validators/usuario.validator.js';

const router = Router();

router.get('/', authenticate, requireRole('ADMINISTRADOR'), usuarioController.listar);
router.get('/:id', authenticate, requireRole('ADMINISTRADOR'), usuarioController.obtenerPorId);
router.post(
  '/',
  authenticate,
  requireRole('ADMINISTRADOR'),
  validate(createUsuarioSchema),
  usuarioController.crear
);
router.put(
  '/:id',
  authenticate,
  requireRole('ADMINISTRADOR'),
  validate(updateUsuarioSchema),
  usuarioController.actualizar
);

export default router;

