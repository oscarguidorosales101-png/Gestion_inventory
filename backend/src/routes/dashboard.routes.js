import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.get('/resumen', authenticate, dashboardController.getDashboardResumen);

export default router;

