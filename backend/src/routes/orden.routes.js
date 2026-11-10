import { Router } from 'express';
import * as ordenController from '../controllers/orden.controller.js';
import * as recepcionController from '../controllers/recepcion.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createOrdenSchema, revisarDuplicadoSchema } from '../validators/orden.validator.js';
import { registrarRecepcionSchema } from '../validators/recepcion.validator.js';

const router = Router();

router.get('/', authenticate, ordenController.listar);
router.get('/:id', authenticate, ordenController.obtenerPorId);

router.post(
  '/',
  authenticate,
  requireRole('ADMINISTRADOR', 'COMPRAS'),
  validate(createOrdenSchema),
  ordenController.crear
);

// Aprobacion sujeta a matriz de niveles y segregacion de funciones (SoD)
router.post(
  '/:id/aprobar',
  authenticate,
  requireRole('ADMINISTRADOR', 'ENCARGADO_INVENTARIO', 'COMPRAS'),
  ordenController.aprobar
);

router.post(
  '/:id/enviar',
  authenticate,
  requireRole('ADMINISTRADOR', 'COMPRAS'),
  ordenController.enviar
);

router.post(
  '/:id/cancelar',
  authenticate,
  requireRole('ADMINISTRADOR', 'COMPRAS'),
  ordenController.cancelar
);

// Revision humana de posible orden duplicada (soporta PATCH y POST, /revision-duplicado y /revisar-duplicado)
router.patch(
  '/:id/revision-duplicado',
  authenticate,
  requireRole('ADMINISTRADOR', 'COMPRAS'),
  validate(revisarDuplicadoSchema),
  ordenController.revisarDuplicado
);
router.post(
  '/:id/revision-duplicado',
  authenticate,
  requireRole('ADMINISTRADOR', 'COMPRAS'),
  validate(revisarDuplicadoSchema),
  ordenController.revisarDuplicado
);
router.post(
  '/:id/revisar-duplicado',
  authenticate,
  requireRole('ADMINISTRADOR', 'COMPRAS'),
  validate(revisarDuplicadoSchema),
  ordenController.revisarDuplicado
);

// Recepcion de orden (parcial o completa)
router.post(
  '/:ordenId/recepciones',
  authenticate,
  requireRole('ADMINISTRADOR', 'ENCARGADO_INVENTARIO'),
  validate(registrarRecepcionSchema),
  recepcionController.registrarRecepcion
);

// Analisis de duplicidad asistido por Google Gemini IA
router.get('/:id/analisis-ia', authenticate, ordenController.obtenerAnalisisIA);
router.post(
  '/:id/analizar-ia',
  authenticate,
  requireRole('ADMINISTRADOR', 'COMPRAS'),
  ordenController.analizarIA
);

export default router;

