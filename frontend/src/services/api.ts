const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function getToken(): string | null {
  return localStorage.getItem('gestion_inventory_token');
}

export function setToken(token: string): void {
  localStorage.setItem('gestion_inventory_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('gestion_inventory_token');
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken();
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  let body: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    body = await response.json();
  }

  if (!response.ok) {
    const errorMsg = body?.message || body?.error || `Error HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(errorMsg, response.status, body);
  }

  return body as T;
}

// ----------------------------------------------------------------------
// ENDPOINTS
// ----------------------------------------------------------------------

export const api = {
  // Autenticacion
  auth: {
    login: (credenciales: { email: string; password: string }) =>
      apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credenciales),
      }),
    me: () => apiFetch('/auth/me'),
    cambiarPassword: (datos: { passwordActual: string; passwordNueva: string }) =>
      apiFetch('/auth/cambiar-password', {
        method: 'POST',
        body: JSON.stringify(datos),
      }),
  },

  // Dashboard
  dashboard: {
    getMetricas: () => apiFetch('/dashboard'),
  },

  // Inventario
  inventario: {
    getStockGlobal: (params?: { categoria_id?: number; estado_stock?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.categoria_id) q.set('categoria_id', String(params.categoria_id));
      if (params?.estado_stock) q.set('estado_stock', params.estado_stock);
      if (params?.search) q.set('search', params.search);
      return apiFetch(`/inventario${q.toString() ? '?' + q.toString() : ''}`);
    },
    getDesgloseUbicaciones: (materialId: number) => apiFetch(`/inventario/materiales/${materialId}/ubicaciones`),
  },

  // Materiales
  materiales: {
    getAll: (params?: { categoria_id?: number; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.categoria_id) q.set('categoria_id', String(params.categoria_id));
      if (params?.search) q.set('search', params.search);
      return apiFetch(`/materiales${q.toString() ? '?' + q.toString() : ''}`);
    },
    getById: (id: number) => apiFetch(`/materiales/${id}`),
    create: (data: any) =>
      apiFetch('/materiales', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      apiFetch(`/materiales/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      apiFetch(`/materiales/${id}`, {
        method: 'DELETE',
      }),
  },

  // Categorias
  categorias: {
    getAll: () => apiFetch('/categorias'),
    getById: (id: number) => apiFetch(`/categorias/${id}`),
    create: (data: any) =>
      apiFetch('/categorias', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      apiFetch(`/categorias/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Proveedores
  proveedores: {
    getAll: () => apiFetch('/proveedores'),
    getById: (id: number) => apiFetch(`/proveedores/${id}`),
    create: (data: any) =>
      apiFetch('/proveedores', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      apiFetch(`/proveedores/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Ubicaciones
  ubicaciones: {
    getAll: () => apiFetch('/ubicaciones'),
    getById: (id: number) => apiFetch(`/ubicaciones/${id}`),
    getStockPorUbicacion: (id: number) => apiFetch(`/ubicaciones/${id}/stock`),
    create: (data: any) =>
      apiFetch('/ubicaciones', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      apiFetch(`/ubicaciones/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Ordenes de Compra
  ordenes: {
    getAll: (params?: { estado?: string; proveedor_id?: number }) => {
      const q = new URLSearchParams();
      if (params?.estado) q.set('estado', params.estado);
      if (params?.proveedor_id) q.set('proveedor_id', String(params.proveedor_id));
      return apiFetch(`/ordenes${q.toString() ? '?' + q.toString() : ''}`);
    },
    getById: (id: number) => apiFetch(`/ordenes/${id}`),
    create: (data: any) =>
      apiFetch('/ordenes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    aprobar: (id: number) =>
      apiFetch(`/ordenes/${id}/aprobar`, {
        method: 'POST',
      }),
    rechazar: (id: number, motivo: string) =>
      apiFetch(`/ordenes/${id}/rechazar`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      }),
    enviar: (id: number) =>
      apiFetch(`/ordenes/${id}/enviar`, {
        method: 'POST',
      }),
    cancelar: (id: number, motivo: string) =>
      apiFetch(`/ordenes/${id}/cancelar`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      }),
    revisarDuplicado: (id: number, resolucion: 'CONFIRMAR_DUPLICADO' | 'DESCARTAR_FALSO_POSITIVO', motivo: string) =>
      apiFetch(`/ordenes/${id}/revisar-duplicado`, {
        method: 'POST',
        body: JSON.stringify({ resolucion, motivo }),
      }),
    registrarRecepcion: (id: number, data: { items: Array<{ detalle_id: number; cantidad_a_recibir: number }>; observaciones?: string }) =>
      apiFetch(`/ordenes/${id}/recepciones`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Recepciones
  recepciones: {
    getAll: () => apiFetch('/recepciones'),
  },

  // Movimientos
  movimientos: {
    getAll: (params?: { tipo?: string; material_id?: number; ubicacion_id?: number }) => {
      const q = new URLSearchParams();
      if (params?.tipo) q.set('tipo', params.tipo);
      if (params?.material_id) q.set('material_id', String(params.material_id));
      if (params?.ubicacion_id) q.set('ubicacion_id', String(params.ubicacion_id));
      return apiFetch(`/movimientos${q.toString() ? '?' + q.toString() : ''}`);
    },
    getById: (id: number) => apiFetch(`/movimientos/${id}`),
    registrar: (data: any) =>
      apiFetch('/movimientos', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Alertas
  alertas: {
    getAll: (params?: { solo_activas?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.solo_activas !== undefined) q.set('solo_activas', String(params.solo_activas));
      return apiFetch(`/alertas${q.toString() ? '?' + q.toString() : ''}`);
    },
    resolver: (id: number, motivo?: string) =>
      apiFetch(`/alertas/${id}/resolver`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      }),
    reevaluar: () =>
      apiFetch('/alertas/reevaluar', {
        method: 'POST',
      }),
  },

  // Reglas
  reglas: {
    getAll: () => apiFetch('/reglas'),
    getById: (id: number) => apiFetch(`/reglas/${id}`),
    update: (id: number, data: { valor_numerico?: number | null; valor_texto?: string | null }) =>
      apiFetch(`/reglas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Usuarios
  usuarios: {
    getAll: () => apiFetch('/usuarios'),
    getById: (id: number) => apiFetch(`/usuarios/${id}`),
    create: (data: any) =>
      apiFetch('/usuarios', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      apiFetch(`/usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggleActivo: (id: number, activo: boolean) =>
      apiFetch(`/usuarios/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ activo }),
      }),
  },

  // Auditoria
  auditoria: {
    getAll: (params?: { accion?: string; entidad?: string; usuario_id?: number }) => {
      const q = new URLSearchParams();
      if (params?.accion) q.set('accion', params.accion);
      if (params?.entidad) q.set('entidad', params.entidad);
      if (params?.usuario_id) q.set('usuario_id', String(params.usuario_id));
      return apiFetch(`/auditoria${q.toString() ? '?' + q.toString() : ''}`);
    },
  },
};

