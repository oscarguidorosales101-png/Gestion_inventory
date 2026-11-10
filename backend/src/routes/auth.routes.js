import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema, cambiarClaveSchema } from '../validators/auth.validator.js';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/cambiar-clave', authenticate, validate(cambiarClaveSchema), authController.cambiarClave);
router.get('/me', authenticate, authController.getPerfil);
router.post('/logout', authenticate, authController.logout);

export default router;

