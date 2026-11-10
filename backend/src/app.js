import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { env } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Seguridad de encabezados HTTP (con CSP permisivo para SPA local)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Configuracion de CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || origin === env.CORS_ORIGIN || origin.startsWith('http://localhost:')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Integration-Key, X-Worker-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Parseo de cuerpo JSON y URL-encoded
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Endpoint de verificacion de salud
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    sistema: 'Gestion_inventory API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Rutas de la API REST
app.use('/api', apiRoutes);

// Servir frontend compilado (Single Page Application)
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

// Manejo de rutas inexistentes (404)
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// Manejador centralizado de errores
app.use(errorHandler);
