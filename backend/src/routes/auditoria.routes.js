import { Router } from 'express';
import * as auditoriaController from '../controllers/auditoria.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticate, requireRole('ADMINISTRADOR', 'CONSULTA'), auditoriaController.listar);

export default router;

