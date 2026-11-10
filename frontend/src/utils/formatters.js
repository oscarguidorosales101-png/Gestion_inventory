import { MONEDA } from '../constants/moneda';

export function formatMoneda(monto) {
  if (monto === null || monto === undefined || isNaN(monto)) return '₡0,00';
  return Number(monto).toLocaleString(MONEDA.LOCALE, {
    style: 'currency',
    currency: MONEDA.CODIGO,
    minimumFractionDigits: MONEDA.DECIMALES,
    maximumFractionDigits: MONEDA.DECIMALES,
  });
}

export function formatFecha(fecha, incluirHora = false) {
  if (!fecha) return '-';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '-';
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(incluirHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  };
  return d.toLocaleDateString(MONEDA.LOCALE, options);
}

export function formatNumero(num, decimales = 2) {
  if (num === null || num === undefined || isNaN(num)) return '0,00';
  return Number(num).toLocaleString(MONEDA.LOCALE, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export function getEstadoStockBadgeClass(estado) {
  switch (estado) {
    case 'STOCK_CRITICO':
    case 'CRITICO':
      return 'badge-critico';
    case 'PUNTO_REORDEN':
    case 'REORDEN':
      return 'badge-reorden';
    default:
      return 'badge-normal';
  }
}

export function formatEstadoStock(estado) {
  if (!estado) return 'No definido';
  switch (estado) {
    case 'STOCK_CRITICO':
    case 'CRITICO':
      return 'Stock Crítico';
    case 'PUNTO_REORDEN':
    case 'REORDEN':
      return 'Punto de Reorden';
    case 'NORMAL':
      return 'Normal';
    default:
      return String(estado).replace(/_/g, ' ');
  }
}

export function formatEstadoOrden(estado) {
  if (!estado) return 'No definido';
  switch (estado) {
    case 'PENDIENTE_APROBACION':
      return 'Pendiente de Aprobación';
    case 'APROBADA':
      return 'Aprobada';
    case 'ENVIADA':
      return 'Enviada al Proveedor';
    case 'RECIBIDA_PARCIAL':
      return 'Recibida Parcial';
    case 'RECIBIDA_TOTAL':
      return 'Recibida Total';
    case 'RECHAZADA':
      return 'Rechazada';
    case 'CANCELADA':
      return 'Cancelada';
    default:
      return String(estado).replace(/_/g, ' ');
  }
}

export function formatTipoAlerta(tipo) {
  if (!tipo) return 'Alerta General';
  switch (tipo) {
    case 'STOCK_CRITICO':
      return 'Stock Crítico';
    case 'PUNTO_REORDEN':
      return 'Punto de Reorden';
    case 'ORDEN_DUPLICADA':
      return 'Posible Orden Duplicada';
    case 'REVISION_COMPRA':
    case 'REVISION_HUMANA':
      return 'Revisión Manual';
    default:
      return String(tipo).replace(/_/g, ' ');
  }
}

export function formatSeveridadAlerta(sev) {
  if (!sev) return 'Media';
  switch (sev) {
    case 'CRITICA':
      return 'Crítica';
    case 'ALTA':
      return 'Alta';
    case 'MEDIA':
      return 'Media';
    case 'BAJA':
      return 'Baja';
    default:
      return String(sev);
  }
}

export function formatEstadoAlerta(estado) {
  if (!estado) return 'No definido';
  switch (estado) {
    case 'ACTIVA':
      return 'Activa';
    case 'RESUELTA':
      return 'Resuelta';
    case 'DESCARTADA':
      return 'Descartada';
    default:
      return String(estado);
  }
}

export function formatTipoMovimiento(tipo) {
  if (!tipo) return 'Movimiento';
  switch (tipo) {
    case 'ENTRADA':
      return 'Entrada de Almacén';
    case 'SALIDA':
      return 'Salida de Almacén';
    case 'TRANSFERENCIA':
      return 'Transferencia Interna';
    case 'AJUSTE':
      return 'Ajuste de Inventario';
    default:
      return String(tipo).replace(/_/g, ' ');
  }
}

export function formatTipoUbicacion(tipo) {
  if (!tipo) return 'Ubicación';
  switch (tipo) {
    case 'ALMACEN_CENTRAL':
    case 'BODEGA_PRINCIPAL':
      return 'Almacén Central';
    case 'BODEGA_OBRA':
    case 'BODEGA_SECUNDARIA':
      return 'Bodega de Obra';
    case 'FRENTE_TRABAJO':
    case 'FRENTE_OBRA':
      return 'Frente de Trabajo';
    case 'TRANSITO':
      return 'En Tránsito';
    default:
      return String(tipo).replace(/_/g, ' ');
  }
}

export function formatTipoGasto(tipo) {
  if (!tipo) return 'Gasto General';
  switch (tipo) {
    case 'DIRECTO_OBRA':
    case 'DIRECTO':
      return 'Directo de Obra';
    case 'HERRAMIENTA_EQUIPO':
      return 'Herramienta y Equipo';
    case 'SEGURIDAD_EPP':
      return 'Seguridad y Protección (EPP)';
    case 'INDIRECTO_ADMINISTRATIVO':
    case 'INDIRECTO':
      return 'Indirecto Administrativo';
    default:
      return String(tipo).replace(/_/g, ' ');
  }
}

export function formatNivelAprobacion(nivel) {
  if (!nivel) return 'Estándar';
  switch (nivel) {
    case 'COMPRAS':
      return 'Analista de Compras';
    case 'ADMINISTRADOR':
      return 'Administrador General';
    case 'GERENCIA':
      return 'Gerencia General';
    default:
      return String(nivel).replace(/_/g, ' ');
  }
}

export function formatAmbitoRegla(ambito) {
  if (!ambito) return 'Global';
  switch (ambito) {
    case 'GLOBAL':
      return 'Global';
    case 'CATEGORIA':
      return 'Por Categoría';
    case 'MATERIAL':
      return 'Por Material';
    case 'PROVEEDOR':
      return 'Por Proveedor';
    default:
      return String(ambito).replace(/_/g, ' ');
  }
}

export function formatClaveRegla(clave) {
  if (!clave) return 'Regla';
  const labels = {
    DIAS_VENTANA_DUPLICADOS: 'Ventana de Detección de Duplicados (Días)',
    TOLERANCIA_PORCENTUAL_DUPLICADO: 'Tolerancia de Coincidencia de Duplicados (%)',
    MONTO_LIMITE_NIVEL_1: 'Monto Límite Nivel 1 Aprobación (CRC)',
    MONTO_LIMITE_NIVEL_2: 'Monto Límite Nivel 2 Aprobación (CRC)',
    TIEMPO_GRACIA_ORDEN_MINUTOS: 'Tiempo de Gracia de Orden (Minutos)',
    MAX_DIAS_ENTREGA_DEFAULT: 'Tiempo Máximo de Entrega Predeterminado (Días)',
  };
  return labels[clave] || String(clave).replace(/_/g, ' ');
}

export function formatAuditoriaAccion(accion) {
  if (!accion) return 'Registro';
  const labels = {
    LOGIN_EXITOSO: 'Inicio de Sesión Exitoso',
    LOGIN_FALLIDO: 'Intento Fallido de Acceso',
    CREAR_ORDEN: 'Registro de Orden de Compra',
    APROBAR_ORDEN: 'Aprobación de Orden',
    RECHAZAR_ORDEN: 'Rechazo de Orden',
    RECEPCION_MATERIAL: 'Recepción Física de Mercancía',
    AJUSTE_INVENTARIO: 'Ajuste de Inventario',
    TRANSFERENCIA_INVENTARIO: 'Transferencia entre Bodegas',
    CREAR_MATERIAL: 'Alta de Material en Catálogo',
    ACTUALIZAR_MATERIAL: 'Modificación de Material',
    CREAR_USUARIO: 'Alta de Usuario',
    ACTUALIZAR_USUARIO: 'Modificación de Usuario',
    CAMBIO_PASSWORD: 'Cambio de Contraseña',
    RESOLVER_ALERTA: 'Resolución de Alerta',
    ACTUALIZAR_REGLA: 'Modificación de Parámetro Operativo',
    REVISAR_DUPLICADO: 'Resolución de Orden Sospechosa',
  };
  return labels[accion] || String(accion).replace(/_/g, ' ');
}

export function formatAuditoriaTipoOperacion(tipo) {
  if (!tipo) return 'Operación';
  switch (tipo) {
    case 'INSERT':
      return 'Creación';
    case 'UPDATE':
      return 'Modificación';
    case 'DELETE':
      return 'Eliminación';
    case 'AUTH':
      return 'Seguridad';
    case 'AUDIT':
      return 'Auditoría';
    default:
      return String(tipo);
  }
}

export function formatAuditoriaEntidad(entidad) {
  if (!entidad) return 'Registro del Sistema';
  const labels = {
    ordenes_compra: 'Órdenes de Compra',
    ordenes_compra_lineas: 'Líneas de Orden de Compra',
    movimientos_inventario: 'Libro Mayor de Inventario',
    materiales: 'Catálogo de Materiales',
    alertas_inventario: 'Alertas de Stock',
    usuarios: 'Gestión de Usuarios',
    proveedores: 'Directorio de Proveedores',
    categorias: 'Categorías de Gasto',
    ubicaciones: 'Bodegas y Ubicaciones',
    configuracion_reglas: 'Reglas de Negocio',
    outbox_eventos: 'Eventos de Sincronización',
  };
  return labels[entidad] || String(entidad).replace(/_/g, ' ');
}

export function formatBoolean(val) {
  if (val === true || val === 1 || val === '1') return 'Sí';
  if (val === false || val === 0 || val === '0') return 'No';
  return 'No disponible';
}

export function formatTexto(val, fallback = 'No disponible') {
  if (val === null || val === undefined || val === '' || val === 'null' || val === 'undefined') {
    return fallback;
  }
  return String(val);
}
