export type RolUsuario = 'ADMINISTRADOR' | 'ENCARGADO_INVENTARIO' | 'COMPRAS' | 'CONSULTA';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  activo: boolean | number;
  requiere_cambio_clave?: boolean | number;
  ultimo_login?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Categoria {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean | number;
  total_materiales?: number;
  created_at?: string;
}

export interface Proveedor {
  id: number;
  codigo: string;
  nombre_comercial: string;
  razon_social?: string | null;
  identificacion_tributaria: string;
  correo: string;
  telefono?: string | null;
  direccion?: string | null;
  activo: boolean | number;
  created_at?: string;
}

export interface Ubicacion {
  id: number;
  codigo: string;
  nombre: string;
  tipo: 'BODEGA_CENTRAL' | 'ALMACEN_OBRA' | 'PATIO_MATERIALES' | 'TRANSITO';
  capacidad_m2?: number | null;
  activo: boolean | number;
  created_at?: string;
}

export interface Material {
  id: number;
  codigo_sku: string;
  nombre: string;
  categoria_id: number;
  categoria_nombre?: string;
  unidad_medida: string;
  demanda_diaria_promedio: number;
  demanda_diaria_maxima: number;
  tiempo_entrega_dias: number;
  stock_seguridad_calculado: number;
  punto_reorden_calculado: number;
  costo_unitario_crc: number;
  activo: boolean | number;
  stock_actual?: number;
  estado_stock?: 'NORMAL' | 'REORDEN' | 'STOCK_CRITICO';
}

export interface MaterialStockDesglose {
  ubicacion_id: number;
  ubicacion_codigo: string;
  ubicacion_nombre: string;
  stock_ubicacion: number;
}

export type EstadoOrdenCompra =
  | 'PENDIENTE_APROBACION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'ENVIADA'
  | 'PARCIALMENTE_RECIBIDA'
  | 'RECIBIDA'
  | 'CANCELADA';

export type NivelAprobacion = 'NIVEL_1' | 'NIVEL_2' | 'NIVEL_3';
export type EstadoRevisionDuplicado = 'NO_APLICA' | 'PENDIENTE_REVISION' | 'CONFIRMADO_DUPLICADO' | 'DESCARTADO_FALSO_POSITIVO';

export interface DetalleOrdenCompra {
  id?: number;
  material_id: number;
  material_sku?: string;
  material_nombre?: string;
  unidad_medida?: string;
  cantidad_solicitada: number;
  cantidad_recibida?: number;
  cantidad_pendiente?: number;
  precio_unitario_crc: number;
  subtotal_linea_crc?: number;
}

export interface OrdenCompra {
  id: number;
  numero_orden: string;
  proveedor_id: number;
  proveedor_nombre?: string;
  proveedor_correo?: string;
  ubicacion_destino_id: number;
  ubicacion_destino_nombre?: string;
  usuario_creador_id: number;
  creador_nombre?: string;
  usuario_aprobador_id?: number | null;
  aprobador_nombre?: string | null;
  fecha_emision: string;
  fecha_entrega_estimada: string;
  fecha_recepcion_completa?: string | null;
  estado: EstadoOrdenCompra;
  nivel_aprobacion_requerido: NivelAprobacion;
  moneda: string;
  subtotal_crc: number;
  impuestos_crc: number;
  total_crc: number;
  es_posible_duplicado: number | boolean;
  estado_revision_duplicado: EstadoRevisionDuplicado;
  orden_similar_id?: number | null;
  orden_similar_numero?: string | null;
  observaciones?: string | null;
  detalle?: DetalleOrdenCompra[];
  created_at?: string;
}

export type TipoMovimiento =
  | 'ENTRADA_COMPRA'
  | 'SALIDA_PROYECTO'
  | 'TRANSFERENCIA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO';

export interface Movimiento {
  id: number;
  material_id: number;
  material_sku?: string;
  material_nombre?: string;
  tipo_movimiento: TipoMovimiento;
  ubicacion_origen_id?: number | null;
  ubicacion_origen_nombre?: string | null;
  ubicacion_destino_id?: number | null;
  ubicacion_destino_nombre?: string | null;
  cantidad: number;
  costo_unitario_crc?: number;
  stock_anterior_origen?: number | null;
  stock_nuevo_origen?: number | null;
  stock_anterior_destino?: number | null;
  stock_nuevo_destino?: number | null;
  orden_compra_id?: number | null;
  numero_orden?: string | null;
  motivo: string;
  usuario_id: number;
  usuario_nombre?: string;
  created_at: string;
}

export interface Alerta {
  id: number;
  material_id: number;
  material_sku?: string;
  material_nombre?: string;
  tipo_alerta: 'STOCK_CRITICO' | 'REORDEN' | 'POSIBLE_DUPLICADO_ORDEN';
  severidad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  mensaje: string;
  stock_actual?: number;
  punto_reorden?: number;
  stock_seguridad?: number;
  resuelto: boolean | number;
  created_at: string;
  resolved_at?: string | null;
}

export interface ReglaConfiguracion {
  id: number;
  clave_regla: string;
  ambito: 'GLOBAL' | 'CATEGORIA' | 'MATERIAL' | 'PROVEEDOR';
  entidad_referencia_id?: number | null;
  entidad_nombre?: string | null;
  valor_numerico?: number | null;
  valor_texto?: string | null;
  descripcion?: string | null;
  created_at?: string;
}

export interface RegistroAuditoria {
  id: number;
  usuario_id?: number | null;
  usuario_nombre?: string | null;
  accion: string;
  tipo_operacion: string;
  entidad_afectada: string;
  registro_afectado_id?: number | null;
  estado_anterior?: any;
  estado_nuevo?: any;
  motivo?: string | null;
  created_at: string;
}

export interface DashboardMetricas {
  totalMateriales: number;
  valorTotalInventarioCrc: number;
  alertasActivas: number;
  ordenesPendientesAprobacion: number;
  distribucionStockPorEstado: {
    normal: number;
    reorden: number;
    critico: number;
  };
  stockPorCategoria: Array<{
    categoria: string;
    totalStock: number;
    valorCrc: number;
  }>;
  movimientosRecientes: Movimiento[];
  alertasRecientes: Alerta[];
  auditoriaReciente: RegistroAuditoria[];
}

