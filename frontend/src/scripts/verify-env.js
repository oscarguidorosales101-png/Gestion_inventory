import { API_CONFIG } from '../config/api.config.js';

export async function verificarSaludSistema() {
  try {
    const res = await fetch(`${API_CONFIG.BASE_URL}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

