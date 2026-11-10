import { Router } from 'express';
import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import materialRoutes from './material.routes.js';
import categoriaRoutes from './categoria.routes.js';
import proveedorRoutes from './proveedor.routes.js';
import ubicacionRoutes from './ubicacion.routes.js';
import inventarioRoutes from './inventario.routes.js';
import ordenRoutes from './orden.routes.js';
import recepcionRoutes from './recepcion.routes.js';
import movimientoRoutes from './movimiento.routes.js';
import alertaRoutes from './alerta.routes.js';
import reglaRoutes from './regla.routes.js';
import usuarioRoutes from './usuario.routes.js';
import auditoriaRoutes from './auditoria.routes.js';
import integracionRoutes from './integracion.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/materiales', materialRoutes);
router.use('/categorias', categoriaRoutes);
router.use('/proveedores', proveedorRoutes);
router.use('/ubicaciones', ubicacionRoutes);
router.use('/inventario', inventarioRoutes);
router.use('/ordenes', ordenRoutes);
router.use('/recepciones', recepcionRoutes);
router.use('/movimientos', movimientoRoutes);
router.use('/alertas', alertaRoutes);
router.use('/reglas', reglaRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/auditoria', auditoriaRoutes);
router.use('/integracion', integracionRoutes);

export default router;

