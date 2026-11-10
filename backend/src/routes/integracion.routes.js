import { Router } from 'express';
import * as integracionController from '../controllers/integracion.controller.js';
import { integracionAuth } from '../middlewares/integracionAuth.js';
import { validate } from '../middlewares/validate.js';
import { reclamarLoteSchema, completarEventoSchema, fallarEventoSchema } from '../validators/outbox.validator.js';

const router = Router();

router.use(integracionAuth);

router.post('/eventos/reclamar', validate(reclamarLoteSchema), integracionController.reclamarEventos);
router.post('/eventos/:id/completar', validate(completarEventoSchema), integracionController.completarEvento);
router.post('/eventos/:id/fallar', validate(fallarEventoSchema), integracionController.fallarEvento);
router.get('/eventos', integracionController.listarEventos);
router.post('/eventos/:id/reprocesar', integracionController.reprocesarEvento);
router.post('/evaluar-alerta', integracionController.evaluarAlertaStockAutomatizada);

export default router;

