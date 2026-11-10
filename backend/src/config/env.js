import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '..', '.env');

if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

export const env = {
  PORT: Number(process.env.PORT) || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT) || 3306,
  DB_NAME: process.env.NODE_ENV === 'test' ? (process.env.TEST_DB_NAME || 'gestion_inventory_test') : (process.env.DB_NAME || 'gestion_inventory'),
  DB_USER: process.env.DB_USER || 'gestion_inventory_app',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_insecure_replace_immediately',
  SESSION_EXPIRATION_HOURS: Number(process.env.SESSION_EXPIRATION_HOURS) || 8,
  N8N_INTEGRATION_API_KEY: process.env.N8N_INTEGRATION_API_KEY || 'default_integration_key_change_in_prod',
  BACKEND_INTERNAL_URL: process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-lite-latest',
  GEMINI_TIMEOUT_MS: Number(process.env.GEMINI_TIMEOUT_MS) || 20000,
  GEMINI_MAX_RETRIES: Number(process.env.GEMINI_MAX_RETRIES) || 3,
};

