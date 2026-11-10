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

// Endpoints dedicados para automatizaciones periódicas de n8n
router.post('/alertas/reevaluar', integracionController.reevaluarAlertas);
router.get('/auditoria/duplicados-pendientes', integracionController.duplicadosPendientes);
router.post('/auditoria/incidencia-workflow', integracionController.incidenciaWorkflow);
router.post('/ordenes/:id/analisis-duplicado', integracionController.guardarAnalisisDuplicadoIA);
router.post('/ordenes/:id/evaluar-duplicado-ia', integracionController.evaluarDuplicadoIA);

export default router;
