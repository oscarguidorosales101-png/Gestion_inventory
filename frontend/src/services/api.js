import { API_CONFIG } from '../config/api.config.js';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function getToken() {
  return localStorage.getItem(API_CONFIG.STORAGE_TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(API_CONFIG.STORAGE_TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(API_CONFIG.STORAGE_TOKEN_KEY);
}

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken();
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  let body = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    body = await response.json();
  }

  if (!response.ok) {
    const errorMsg = body?.message || body?.error || `Error HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(errorMsg, response.status, body);
  }

  return body;
}

export const api = {
  // Autenticación
  auth: {
    login: (credenciales) =>
      apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credenciales),
      }),
    me: () => apiFetch('/auth/me'),
    cambiarPassword: (datos) =>
      apiFetch('/auth/cambiar-password', {
        method: 'POST',
        body: JSON.stringify(datos),
      }),
  },

  // Dashboards específicos por Rol
  dashboard: {
    getMetricas: () => apiFetch('/dashboard'),
    getAdminDashboard: () => apiFetch('/dashboard/admin'),
    getInventarioDashboard: () => apiFetch('/dashboard/inventario'),
    getComprasDashboard: () => apiFetch('/dashboard/compras'),
    getConsultaDashboard: () => apiFetch('/dashboard/consulta'),
  },

  // Inventario & Existencias
  inventario: {
    getStockGlobal: (params) => {
      const q = new URLSearchParams();
      if (params?.categoria_id) q.set('categoria_id', String(params.categoria_id));
      if (params?.estado_stock) q.set('estado_stock', params.estado_stock);
      if (params?.search) q.set('search', params.search);
      return apiFetch(`/inventario${q.toString() ? '?' + q.toString() : ''}`);
    },
    getDesgloseUbicaciones: (materialId) => apiFetch(`/inventario/materiales/${materialId}/ubicaciones`),
  },

  // Materiales
  materiales: {
    getAll: (params) => {
      const q = new URLSearchParams();
      if (params?.categoria_id) q.set('categoria_id', String(params.categoria_id));
      if (params?.search) q.set('search', params.search);
      return apiFetch(`/materiales${q.toString() ? '?' + q.toString() : ''}`);
    },
    getById: (id) => apiFetch(`/materiales/${id}`),
    create: (data) =>
      apiFetch('/materiales', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiFetch(`/materiales/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      apiFetch(`/materiales/${id}`, {
        method: 'DELETE',
      }),
  },

  // Categorías
  categorias: {
    getAll: () => apiFetch('/categorias'),
    getById: (id) => apiFetch(`/categorias/${id}`),
    create: (data) =>
      apiFetch('/categorias', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiFetch(`/categorias/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Proveedores
  proveedores: {
    getAll: () => apiFetch('/proveedores'),
    getById: (id) => apiFetch(`/proveedores/${id}`),
    create: (data) =>
      apiFetch('/proveedores', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiFetch(`/proveedores/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Ubicaciones
  ubicaciones: {
    getAll: () => apiFetch('/ubicaciones'),
    getById: (id) => apiFetch(`/ubicaciones/${id}`),
    getStockPorUbicacion: (id) => apiFetch(`/ubicaciones/${id}/stock`),
    create: (data) =>
      apiFetch('/ubicaciones', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiFetch(`/ubicaciones/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Órdenes de Compra
  ordenes: {
    getAll: (params) => {
      const q = new URLSearchParams();
      if (params?.estado) q.set('estado', params.estado);
      if (params?.proveedor_id) q.set('proveedor_id', String(params.proveedor_id));
      return apiFetch(`/ordenes${q.toString() ? '?' + q.toString() : ''}`);
    },
    getById: (id) => apiFetch(`/ordenes/${id}`),
    create: (data) =>
      apiFetch('/ordenes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    aprobar: (id) =>
      apiFetch(`/ordenes/${id}/aprobar`, {
        method: 'POST',
      }),
    rechazar: (id, motivo) =>
      apiFetch(`/ordenes/${id}/rechazar`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      }),
    enviar: (id) =>
      apiFetch(`/ordenes/${id}/enviar`, {
        method: 'POST',
      }),
    cancelar: (id, motivo) =>
      apiFetch(`/ordenes/${id}/cancelar`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      }),
    revisarDuplicado: (id, resolucion, motivo) =>
      apiFetch(`/ordenes/${id}/revisar-duplicado`, {
        method: 'POST',
        body: JSON.stringify({ resolucion, motivo }),
      }),
    getAnalisisIA: (id) => apiFetch(`/ordenes/${id}/analisis-ia`),
    analizarIA: (id) =>
      apiFetch(`/ordenes/${id}/analizar-ia`, {
        method: 'POST',
      }),
    registrarRecepcion: (id, data) =>
      apiFetch(`/ordenes/${id}/recepciones`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Recepciones Directas
  recepciones: {
    getAll: (params) => {
      const q = new URLSearchParams();
      if (params?.orden_id) q.set('orden_id', String(params.orden_id));
      if (params?.material_id) q.set('material_id', String(params.material_id));
      return apiFetch(`/recepciones${q.toString() ? '?' + q.toString() : ''}`);
    },
    create: (data) =>
      apiFetch('/recepciones', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Movimientos Ledger
  movimientos: {
    getAll: (params) => {
      const q = new URLSearchParams();
      if (params?.tipo) q.set('tipo', params.tipo);
      if (params?.material_id) q.set('material_id', String(params.material_id));
      if (params?.ubicacion_id) q.set('ubicacion_id', String(params.ubicacion_id));
      return apiFetch(`/movimientos${q.toString() ? '?' + q.toString() : ''}`);
    },
    getById: (id) => apiFetch(`/movimientos/${id}`),
    registrar: (data) =>
      apiFetch('/movimientos', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Alertas
  alertas: {
    getAll: (params) => {
      const q = new URLSearchParams();
      if (params?.solo_activas !== undefined) q.set('solo_activas', String(params.solo_activas));
      return apiFetch(`/alertas${q.toString() ? '?' + q.toString() : ''}`);
    },
    resolver: (id, motivo) =>
      apiFetch(`/alertas/${id}/resolver`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      }),
    reevaluar: () =>
      apiFetch('/alertas/reevaluar', {
        method: 'POST',
      }),
  },

  // Reglas de Negocio
  reglas: {
    getAll: () => apiFetch('/reglas'),
    getById: (id) => apiFetch(`/reglas/${id}`),
    update: (id, data) =>
      apiFetch(`/reglas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Usuarios
  usuarios: {
    getAll: () => apiFetch('/usuarios'),
    getById: (id) => apiFetch(`/usuarios/${id}`),
    create: (data) =>
      apiFetch('/usuarios', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiFetch(`/usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggleActivo: (id, activo) =>
      apiFetch(`/usuarios/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ activo }),
      }),
  },

  // Auditoría
  auditoria: {
    getAll: (params) => {
      const q = new URLSearchParams();
      if (params?.accion) q.set('accion', params.accion);
      if (params?.entidad) q.set('entidad', params.entidad);
      if (params?.usuario_id) q.set('usuario_id', String(params.usuario_id));
      return apiFetch(`/auditoria${q.toString() ? '?' + q.toString() : ''}`);
    },
  },
};

