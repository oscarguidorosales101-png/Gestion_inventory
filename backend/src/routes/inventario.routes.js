import { Router } from 'express';
import * as inventarioController from '../controllers/inventario.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticate, inventarioController.getResumen);
router.get('/resumen', authenticate, inventarioController.getResumen);
router.get('/materiales/:materialId/stock', authenticate, inventarioController.getStockMaterial);
router.get('/materiales/:materialId/ubicaciones', authenticate, inventarioController.getDesgloseUbicaciones);

export default router;
