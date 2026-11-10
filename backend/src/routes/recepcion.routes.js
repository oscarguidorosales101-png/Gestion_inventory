import { Router } from 'express';
import * as recepcionController from '../controllers/recepcion.controller.js';
import { authenticate, checkRole } from '../middlewares/auth.js';

const router = Router();

// Listar historial de recepciones
router.get('/', authenticate, recepcionController.listarRecepciones);

// Registrar recepcion (exclusivo Encargado de Inventario y Administrador)
router.post(
  '/',
  authenticate,
  checkRole(['ADMINISTRADOR', 'ENCARGADO_INVENTARIO']),
  recepcionController.registrarRecepcion
);

export default router;

