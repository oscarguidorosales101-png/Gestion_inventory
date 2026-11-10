CREATE DATABASE IF NOT EXISTS gestion_inventory
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gestion_inventory;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('ADMINISTRADOR', 'ENCARGADO_INVENTARIO', 'COMPRAS', 'CONSULTA') NOT NULL,
  requiere_cambio_clave TINYINT(1) NOT NULL DEFAULT 1,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  ultimo_acceso DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_usuarios_email (email),
  INDEX idx_usuarios_rol_activo (rol, activo),
  CONSTRAINT chk_usuarios_cambio_clave CHECK (requiere_cambio_clave IN (0, 1)),
  CONSTRAINT chk_usuarios_activo CHECK (activo IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categorias (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(20) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  tipo_gasto ENUM('DIRECTO_OBRA', 'INDIRECTO', 'HERRAMIENTA_EQUIPO', 'SEGURIDAD_EPP') NOT NULL,
  descripcion VARCHAR(255) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_categorias_codigo (codigo),
  UNIQUE KEY uk_categorias_nombre (nombre),
  INDEX idx_categorias_tipo_activo (tipo_gasto, activo),
  CONSTRAINT chk_categorias_activo CHECK (activo IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS proveedores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(20) NOT NULL,
  razon_social VARCHAR(150) NOT NULL,
  identificacion_fiscal VARCHAR(30) NOT NULL,
  contacto_nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(30) NOT NULL,
  email VARCHAR(120) NOT NULL,
  direccion VARCHAR(255) NULL,
  tiempo_entrega_dias INT UNSIGNED NOT NULL,
  calificacion DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_proveedores_codigo (codigo),
  UNIQUE KEY uk_proveedores_id_fiscal (identificacion_fiscal),
  INDEX idx_proveedores_razon_social (razon_social),
  INDEX idx_proveedores_activo (activo),
  CONSTRAINT chk_proveedores_tiempo_entrega CHECK (tiempo_entrega_dias >= 1),
  CONSTRAINT chk_proveedores_calificacion CHECK (calificacion >= 1.00 AND calificacion <= 5.00),
  CONSTRAINT chk_proveedores_activo CHECK (activo IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ubicaciones (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(20) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  tipo ENUM('ALMACEN_CENTRAL', 'BODEGA_OBRA', 'FRENTE_TRABAJO') NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  responsable VARCHAR(100) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ubicaciones_codigo (codigo),
  UNIQUE KEY uk_ubicaciones_nombre (nombre),
  INDEX idx_ubicaciones_tipo_activo (tipo, activo),
  CONSTRAINT chk_ubicaciones_activo CHECK (activo IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS materiales (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(30) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion VARCHAR(255) NULL,
  categoria_id INT UNSIGNED NOT NULL,
  proveedor_principal_id INT UNSIGNED NULL,
  unidad_medida VARCHAR(30) NOT NULL,
  costo_unitario_crc DECIMAL(14,2) NOT NULL,
  stock_minimo DECIMAL(12,2) NOT NULL,
  stock_maximo DECIMAL(12,2) NOT NULL,
  demanda_promedio_diaria DECIMAL(12,2) NOT NULL,
  demanda_maxima_diaria DECIMAL(12,2) NOT NULL,
  tiempo_entrega_dias INT UNSIGNED NOT NULL,
  stock_seguridad DECIMAL(12,2) NOT NULL,
  punto_reorden DECIMAL(12,2) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_materiales_codigo (codigo),
  INDEX idx_materiales_nombre (nombre),
  INDEX idx_materiales_categoria (categoria_id),
  INDEX idx_materiales_proveedor (proveedor_principal_id),
  INDEX idx_materiales_activo (activo),
  CONSTRAINT fk_materiales_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_materiales_proveedor FOREIGN KEY (proveedor_principal_id) REFERENCES proveedores (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_materiales_costo CHECK (costo_unitario_crc >= 0),
  CONSTRAINT chk_materiales_stock_min CHECK (stock_minimo >= 0),
  CONSTRAINT chk_materiales_stock_max CHECK (stock_maximo >= stock_minimo),
  CONSTRAINT chk_materiales_dprom CHECK (demanda_promedio_diaria >= 0),
  CONSTRAINT chk_materiales_dmax CHECK (demanda_maxima_diaria >= demanda_promedio_diaria),
  CONSTRAINT chk_materiales_tiempo_entrega CHECK (tiempo_entrega_dias >= 1),
  CONSTRAINT chk_materiales_ss CHECK (stock_seguridad >= 0),
  CONSTRAINT chk_materiales_pr CHECK (punto_reorden >= stock_minimo),
  CONSTRAINT chk_materiales_activo CHECK (activo IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS configuracion_reglas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  clave VARCHAR(80) NOT NULL,
  ambito ENUM('GLOBAL', 'CATEGORIA', 'MATERIAL', 'PROVEEDOR') NOT NULL DEFAULT 'GLOBAL',
  categoria_id INT UNSIGNED NULL,
  material_id INT UNSIGNED NULL,
  proveedor_id INT UNSIGNED NULL,
  llave_unicidad_regla VARCHAR(140) GENERATED ALWAYS AS (
    CONCAT(
      clave, ':', ambito, ':',
      COALESCE(categoria_id, 0), ':',
      COALESCE(material_id, 0), ':',
      COALESCE(proveedor_id, 0)
    )
  ) STORED NOT NULL,
  tipo_dato ENUM('DECIMAL', 'ENTERO', 'TEXTO', 'BOOLEANO') NOT NULL,
  valor_numerico DECIMAL(16,4) NULL,
  valor_texto VARCHAR(255) NULL,
  valor_minimo DECIMAL(16,4) NULL,
  valor_maximo DECIMAL(16,4) NULL,
  descripcion VARCHAR(300) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  usuario_actualizacion_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_reglas_llave_unicidad (llave_unicidad_regla),
  INDEX idx_reglas_clave_ambito (clave, ambito, activo),
  INDEX idx_reglas_categoria (categoria_id),
  INDEX idx_reglas_material (material_id),
  INDEX idx_reglas_proveedor (proveedor_id),
  INDEX idx_reglas_usuario (usuario_actualizacion_id),
  CONSTRAINT fk_reglas_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_reglas_material FOREIGN KEY (material_id) REFERENCES materiales (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_reglas_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_reglas_usuario FOREIGN KEY (usuario_actualizacion_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_reglas_tipo_valor CHECK (
    (tipo_dato IN ('DECIMAL', 'ENTERO') AND valor_numerico IS NOT NULL AND valor_texto IS NULL) OR
    (tipo_dato = 'TEXTO' AND valor_texto IS NOT NULL AND valor_numerico IS NULL) OR
    (tipo_dato = 'BOOLEANO' AND valor_numerico IN (0, 1) AND valor_texto IS NULL)
  ),
  CONSTRAINT chk_reglas_rango_limites CHECK (valor_minimo IS NULL OR valor_maximo IS NULL OR valor_maximo >= valor_minimo),
  CONSTRAINT chk_reglas_valor_en_rango CHECK (
    valor_numerico IS NULL OR (
      (valor_minimo IS NULL OR valor_numerico >= valor_minimo) AND
      (valor_maximo IS NULL OR valor_numerico <= valor_maximo)
    )
  ),
  CONSTRAINT chk_reglas_activo CHECK (activo IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ordenes_compra (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero_orden VARCHAR(30) NOT NULL,
  proveedor_id INT UNSIGNED NOT NULL,
  ubicacion_destino_id INT UNSIGNED NOT NULL,
  usuario_creador_id INT UNSIGNED NOT NULL,
  usuario_aprobador_id INT UNSIGNED NULL,
  fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_entrega_estimada DATE NOT NULL,
  fecha_recepcion_completa DATETIME NULL,
  estado ENUM(
    'BORRADOR',
    'PENDIENTE_APROBACION',
    'APROBADA',
    'ENVIADA',
    'PARCIALMENTE_RECIBIDA',
    'RECIBIDA',
    'CANCELADA'
  ) NOT NULL DEFAULT 'PENDIENTE_APROBACION',
  nivel_aprobacion_requerido ENUM('NIVEL_1', 'NIVEL_2', 'NIVEL_3') NOT NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'CRC',
  subtotal_crc DECIMAL(16,2) NOT NULL,
  impuestos_crc DECIMAL(16,2) NOT NULL DEFAULT 0.00,
  total_crc DECIMAL(16,2) NOT NULL,
  es_posible_duplicado TINYINT(1) NOT NULL DEFAULT 0,
  estado_revision_duplicado ENUM(
    'NO_APLICA',
    'PENDIENTE_REVISION',
    'CONFIRMADO_DUPLICADO',
    'DESCARTADO_FALSO_POSITIVO'
  ) NOT NULL DEFAULT 'NO_APLICA',
  orden_similar_id INT UNSIGNED NULL,
  observaciones VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ordenes_numero (numero_orden),
  INDEX idx_ordenes_proveedor_fecha (proveedor_id, fecha_emision),
  INDEX idx_ordenes_ubicacion (ubicacion_destino_id),
  INDEX idx_ordenes_creador (usuario_creador_id),
  INDEX idx_ordenes_aprobador (usuario_aprobador_id),
  INDEX idx_ordenes_estado (estado),
  INDEX idx_ordenes_duplicado (es_posible_duplicado, estado_revision_duplicado),
  INDEX idx_ordenes_similar (orden_similar_id),
  CONSTRAINT fk_ordenes_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_ordenes_ubicacion FOREIGN KEY (ubicacion_destino_id) REFERENCES ubicaciones (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_ordenes_creador FOREIGN KEY (usuario_creador_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_ordenes_aprobador FOREIGN KEY (usuario_aprobador_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_ordenes_similar FOREIGN KEY (orden_similar_id) REFERENCES ordenes_compra (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_ordenes_moneda CHECK (moneda = 'CRC'),
  CONSTRAINT chk_ordenes_subtotal CHECK (subtotal_crc >= 0),
  CONSTRAINT chk_ordenes_impuestos CHECK (impuestos_crc >= 0),
  CONSTRAINT chk_ordenes_total CHECK (total_crc >= subtotal_crc),
  CONSTRAINT chk_ordenes_duplicado_flag CHECK (es_posible_duplicado IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detalle_orden_compra (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  orden_compra_id INT UNSIGNED NOT NULL,
  material_id INT UNSIGNED NOT NULL,
  cantidad_solicitada DECIMAL(12,2) NOT NULL,
  cantidad_recibida DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  cantidad_pendiente DECIMAL(12,2) GENERATED ALWAYS AS (cantidad_solicitada - cantidad_recibida) VIRTUAL,
  precio_unitario_crc DECIMAL(14,2) NOT NULL,
  subtotal_crc DECIMAL(16,2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_detalle_orden_material (orden_compra_id, material_id),
  INDEX idx_detalle_material (material_id),
  CONSTRAINT fk_detalle_orden FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_detalle_material FOREIGN KEY (material_id) REFERENCES materiales (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_detalle_cant_solicitada CHECK (cantidad_solicitada > 0),
  CONSTRAINT chk_detalle_cant_recibida CHECK (cantidad_recibida >= 0 AND cantidad_recibida <= cantidad_solicitada),
  CONSTRAINT chk_detalle_precio CHECK (precio_unitario_crc >= 0),
  CONSTRAINT chk_detalle_subtotal CHECK (subtotal_crc >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movimientos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo ENUM('ENTRADA', 'SALIDA', 'TRANSFERENCIA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO') NOT NULL,
  material_id INT UNSIGNED NOT NULL,
  ubicacion_origen_id INT UNSIGNED NULL,
  ubicacion_destino_id INT UNSIGNED NULL,
  orden_compra_id INT UNSIGNED NULL,
  detalle_orden_compra_id INT UNSIGNED NULL,
  usuario_id INT UNSIGNED NOT NULL,
  cantidad DECIMAL(12,2) NOT NULL,
  costo_unitario_crc DECIMAL(14,2) NULL,
  snapshot_stock_ant_origen DECIMAL(12,2) NULL,
  snapshot_stock_nue_origen DECIMAL(12,2) NULL,
  snapshot_stock_ant_destino DECIMAL(12,2) NULL,
  snapshot_stock_nue_destino DECIMAL(12,2) NULL,
  motivo VARCHAR(300) NOT NULL,
  referencia VARCHAR(80) NULL,
  fecha_movimiento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_movimientos_material_fecha (material_id, fecha_movimiento),
  INDEX idx_movimientos_origen_material (ubicacion_origen_id, material_id),
  INDEX idx_movimientos_destino_material (ubicacion_destino_id, material_id),
  INDEX idx_movimientos_orden (orden_compra_id),
  INDEX idx_movimientos_detalle_orden (detalle_orden_compra_id),
  INDEX idx_movimientos_usuario (usuario_id),
  INDEX idx_movimientos_tipo_fecha (tipo, fecha_movimiento),
  CONSTRAINT fk_movimientos_material FOREIGN KEY (material_id) REFERENCES materiales (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_movimientos_origen FOREIGN KEY (ubicacion_origen_id) REFERENCES ubicaciones (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_movimientos_destino FOREIGN KEY (ubicacion_destino_id) REFERENCES ubicaciones (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_movimientos_orden FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_movimientos_detalle_orden FOREIGN KEY (detalle_orden_compra_id) REFERENCES detalle_orden_compra (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_movimientos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_movimientos_cantidad CHECK (cantidad > 0),
  CONSTRAINT chk_movimientos_costo CHECK (costo_unitario_crc IS NULL OR costo_unitario_crc >= 0),
  CONSTRAINT chk_movimientos_snap_ant_ori CHECK (snapshot_stock_ant_origen IS NULL OR snapshot_stock_ant_origen >= 0),
  CONSTRAINT chk_movimientos_snap_nue_ori CHECK (snapshot_stock_nue_origen IS NULL OR snapshot_stock_nue_origen >= 0),
  CONSTRAINT chk_movimientos_snap_ant_des CHECK (snapshot_stock_ant_destino IS NULL OR snapshot_stock_ant_destino >= 0),
  CONSTRAINT chk_movimientos_snap_nue_des CHECK (snapshot_stock_nue_destino IS NULL OR snapshot_stock_nue_destino >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eventos_integracion (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  evento_uuid CHAR(36) NOT NULL,
  clave_idempotencia VARCHAR(120) NOT NULL,
  tipo_evento ENUM(
    'MOVIMIENTO_REGISTRADO',
    'RECEPCION_ORDEN_COMPRA',
    'MATERIAL_ACTUALIZADO',
    'ORDEN_COMPRA_CREADA',
    'ORDEN_COMPRA_ESTADO'
  ) NOT NULL,
  entidad_tipo VARCHAR(50) NOT NULL,
  entidad_id INT UNSIGNED NOT NULL,
  payload JSON NOT NULL,
  estado ENUM('PENDIENTE', 'PROCESSING', 'PROCESADO', 'ERROR') NOT NULL DEFAULT 'PENDIENTE',
  intentos INT UNSIGNED NOT NULL DEFAULT 0,
  max_intentos INT UNSIGNED NOT NULL DEFAULT 3,
  locked_at DATETIME NULL,
  locked_by VARCHAR(80) NULL,
  claim_token CHAR(36) NULL,
  timeout_segundos INT UNSIGNED NOT NULL DEFAULT 300,
  ultimo_error VARCHAR(500) NULL,
  resultado_procesamiento JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_eventos_uuid (evento_uuid),
  UNIQUE KEY uk_eventos_idempotencia (clave_idempotencia),
  INDEX idx_eventos_estado_created (estado, created_at),
  INDEX idx_eventos_processing_locked (estado, locked_at),
  INDEX idx_eventos_entidad (entidad_tipo, entidad_id),
  CONSTRAINT chk_eventos_intentos CHECK (intentos >= 0),
  CONSTRAINT chk_eventos_max_intentos CHECK (max_intentos >= 1),
  CONSTRAINT chk_eventos_timeout CHECK (timeout_segundos >= 30)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alertas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo ENUM('REORDEN', 'STOCK_CRITICO', 'ORDEN_DUPLICADA', 'ERROR_WORKFLOW') NOT NULL,
  severidad ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA') NOT NULL,
  material_id INT UNSIGNED NULL,
  orden_compra_id INT UNSIGNED NULL,
  evento_integracion_id INT UNSIGNED NULL,
  contexto_clave VARCHAR(120) NOT NULL,
  estado ENUM('ACTIVA', 'EN_REVISION', 'RESUELTA', 'DESCARTADA') NOT NULL DEFAULT 'ACTIVA',
  llave_unicidad_abierta VARCHAR(140) GENERATED ALWAYS AS (
    CASE
      WHEN estado IN ('ACTIVA', 'EN_REVISION') THEN contexto_clave
      ELSE NULL
    END
  ) STORED,
  titulo VARCHAR(180) NOT NULL,
  mensaje VARCHAR(600) NOT NULL,
  motivo_cierre VARCHAR(300) NULL,
  usuario_resolucion_id INT UNSIGNED NULL,
  fecha_generacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_resolucion DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_alertas_abierta_contexto (llave_unicidad_abierta),
  INDEX idx_alertas_estado_tipo (estado, tipo),
  INDEX idx_alertas_material_estado (material_id, estado),
  INDEX idx_alertas_orden_estado (orden_compra_id, estado),
  INDEX idx_alertas_evento (evento_integracion_id),
  INDEX idx_alertas_usuario_resolucion (usuario_resolucion_id),
  CONSTRAINT fk_alertas_material FOREIGN KEY (material_id) REFERENCES materiales (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_alertas_orden FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_alertas_evento FOREIGN KEY (evento_integracion_id) REFERENCES eventos_integracion (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_alertas_usuario FOREIGN KEY (usuario_resolucion_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auditoria (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NULL,
  accion VARCHAR(120) NOT NULL,
  tipo_operacion ENUM(
    'CREACION',
    'ACTUALIZACION',
    'MOVIMIENTO_INVENTARIO',
    'RECEPCION_COMPRA',
    'CAMBIO_ESTADO',
    'SEGURIDAD_USUARIO',
    'AUTOMATIZACION',
    'ERROR_SISTEMA'
  ) NOT NULL,
  entidad_afectada VARCHAR(60) NOT NULL,
  registro_afectado_id INT UNSIGNED NULL,
  cantidad_anterior DECIMAL(12,2) NULL,
  cantidad_nueva DECIMAL(12,2) NULL,
  motivo VARCHAR(300) NULL,
  datos_previos JSON NULL,
  datos_nuevos JSON NULL,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_auditoria_entidad_registro (entidad_afectada, registro_afectado_id),
  INDEX idx_auditoria_usuario_fecha (usuario_id, fecha_hora),
  INDEX idx_auditoria_tipo_fecha (tipo_operacion, fecha_hora),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_auditoria_cant_ant CHECK (cantidad_anterior IS NULL OR cantidad_anterior >= 0),
  CONSTRAINT chk_auditoria_cant_nue CHECK (cantidad_nueva IS NULL OR cantidad_nueva >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS trg_reglas_bi_ambito;
DROP TRIGGER IF EXISTS trg_reglas_bu_ambito;
DROP TRIGGER IF EXISTS trg_ordenes_bi_integridad;
DROP TRIGGER IF EXISTS trg_ordenes_bu_integridad;
DROP TRIGGER IF EXISTS trg_movimientos_bi_ubicaciones;
DROP TRIGGER IF EXISTS trg_movimientos_bu_inmutable;

DELIMITER $$

CREATE TRIGGER trg_reglas_bi_ambito
BEFORE INSERT ON configuracion_reglas
FOR EACH ROW
BEGIN
  IF NOT (
    (NEW.ambito = 'GLOBAL' AND NEW.categoria_id IS NULL AND NEW.material_id IS NULL AND NEW.proveedor_id IS NULL) OR
    (NEW.ambito = 'CATEGORIA' AND NEW.categoria_id IS NOT NULL AND NEW.material_id IS NULL AND NEW.proveedor_id IS NULL) OR
    (NEW.ambito = 'MATERIAL' AND NEW.categoria_id IS NULL AND NEW.material_id IS NOT NULL AND NEW.proveedor_id IS NULL) OR
    (NEW.ambito = 'PROVEEDOR' AND NEW.categoria_id IS NULL AND NEW.material_id IS NULL AND NEW.proveedor_id IS NOT NULL)
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'La combinacion de ambito y entidad referenciada en configuracion_reglas no es valida.';
  END IF;
END$$

CREATE TRIGGER trg_reglas_bu_ambito
BEFORE UPDATE ON configuracion_reglas
FOR EACH ROW
BEGIN
  IF NOT (
    (NEW.ambito = 'GLOBAL' AND NEW.categoria_id IS NULL AND NEW.material_id IS NULL AND NEW.proveedor_id IS NULL) OR
    (NEW.ambito = 'CATEGORIA' AND NEW.categoria_id IS NOT NULL AND NEW.material_id IS NULL AND NEW.proveedor_id IS NULL) OR
    (NEW.ambito = 'MATERIAL' AND NEW.categoria_id IS NULL AND NEW.material_id IS NOT NULL AND NEW.proveedor_id IS NULL) OR
    (NEW.ambito = 'PROVEEDOR' AND NEW.categoria_id IS NULL AND NEW.material_id IS NULL AND NEW.proveedor_id IS NOT NULL)
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'La combinacion de ambito y entidad referenciada en configuracion_reglas no es valida.';
  END IF;
END$$

CREATE TRIGGER trg_ordenes_bi_integridad
BEFORE INSERT ON ordenes_compra
FOR EACH ROW
BEGIN
  IF NEW.usuario_aprobador_id IS NOT NULL AND NEW.usuario_aprobador_id = NEW.usuario_creador_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Un usuario no puede aprobar una orden de compra que el mismo creo.';
  END IF;
  IF NEW.estado IN ('BORRADOR', 'PENDIENTE_APROBACION') AND NEW.usuario_aprobador_id IS NOT NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Una orden en borrador o pendiente de aprobacion no puede tener un aprobador asignado.';
  END IF;
  IF NEW.estado IN ('APROBADA', 'ENVIADA', 'PARCIALMENTE_RECIBIDA', 'RECIBIDA') AND NEW.usuario_aprobador_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Una orden aprobada o en ejecucion requiere un usuario aprobador valido.';
  END IF;
  IF NEW.estado IN ('APROBADA', 'ENVIADA', 'PARCIALMENTE_RECIBIDA', 'RECIBIDA') AND (
    NEW.es_posible_duplicado = 1 OR
    NEW.estado_revision_duplicado IN ('PENDIENTE_REVISION', 'CONFIRMADO_DUPLICADO')
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'No se puede aprobar una orden con sospecha de duplicado pendiente o confirmada.';
  END IF;
  IF NEW.id IS NOT NULL AND NEW.orden_similar_id IS NOT NULL AND NEW.orden_similar_id = NEW.id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Una orden de compra no puede referenciarse a si misma como orden similar.';
  END IF;
  IF (NEW.es_posible_duplicado = 1 AND (NEW.estado_revision_duplicado NOT IN ('PENDIENTE_REVISION', 'CONFIRMADO_DUPLICADO') OR NEW.orden_similar_id IS NULL)) OR
     (NEW.es_posible_duplicado = 0 AND NEW.estado_revision_duplicado NOT IN ('NO_APLICA', 'DESCARTADO_FALSO_POSITIVO')) OR
     (NEW.estado_revision_duplicado = 'NO_APLICA' AND NEW.orden_similar_id IS NOT NULL) OR
     (NEW.estado_revision_duplicado = 'DESCARTADO_FALSO_POSITIVO' AND NEW.orden_similar_id IS NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El indicador de posible duplicado y el estado de revision de duplicado son inconsistentes.';
  END IF;
END$$

CREATE TRIGGER trg_ordenes_bu_integridad
BEFORE UPDATE ON ordenes_compra
FOR EACH ROW
BEGIN
  IF NEW.usuario_aprobador_id IS NOT NULL AND NEW.usuario_aprobador_id = NEW.usuario_creador_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Un usuario no puede aprobar una orden de compra que el mismo creo.';
  END IF;
  IF NEW.estado IN ('BORRADOR', 'PENDIENTE_APROBACION') AND NEW.usuario_aprobador_id IS NOT NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Una orden en borrador o pendiente de aprobacion no puede tener un aprobador asignado.';
  END IF;
  IF NEW.estado IN ('APROBADA', 'ENVIADA', 'PARCIALMENTE_RECIBIDA', 'RECIBIDA') AND NEW.usuario_aprobador_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Una orden aprobada o en ejecucion requiere un usuario aprobador valido.';
  END IF;
  IF NEW.estado IN ('APROBADA', 'ENVIADA', 'PARCIALMENTE_RECIBIDA', 'RECIBIDA') AND (
    NEW.es_posible_duplicado = 1 OR
    NEW.estado_revision_duplicado IN ('PENDIENTE_REVISION', 'CONFIRMADO_DUPLICADO')
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'No se puede aprobar una orden con sospecha de duplicado pendiente o confirmada.';
  END IF;
  IF NEW.id IS NOT NULL AND NEW.orden_similar_id IS NOT NULL AND NEW.orden_similar_id = NEW.id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Una orden de compra no puede referenciarse a si misma como orden similar.';
  END IF;
  IF (NEW.es_posible_duplicado = 1 AND (NEW.estado_revision_duplicado NOT IN ('PENDIENTE_REVISION', 'CONFIRMADO_DUPLICADO') OR NEW.orden_similar_id IS NULL)) OR
     (NEW.es_posible_duplicado = 0 AND NEW.estado_revision_duplicado NOT IN ('NO_APLICA', 'DESCARTADO_FALSO_POSITIVO')) OR
     (NEW.estado_revision_duplicado = 'NO_APLICA' AND NEW.orden_similar_id IS NOT NULL) OR
     (NEW.estado_revision_duplicado = 'DESCARTADO_FALSO_POSITIVO' AND NEW.orden_similar_id IS NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El indicador de posible duplicado y el estado de revision de duplicado son inconsistentes.';
  END IF;
END$$

CREATE TRIGGER trg_movimientos_bi_ubicaciones
BEFORE INSERT ON movimientos
FOR EACH ROW
BEGIN
  IF NOT (
    (NEW.tipo IN ('ENTRADA', 'AJUSTE_POSITIVO') AND NEW.ubicacion_origen_id IS NULL AND NEW.ubicacion_destino_id IS NOT NULL) OR
    (NEW.tipo IN ('SALIDA', 'AJUSTE_NEGATIVO') AND NEW.ubicacion_origen_id IS NOT NULL AND NEW.ubicacion_destino_id IS NULL) OR
    (NEW.tipo = 'TRANSFERENCIA' AND NEW.ubicacion_origen_id IS NOT NULL AND NEW.ubicacion_destino_id IS NOT NULL AND NEW.ubicacion_origen_id <> NEW.ubicacion_destino_id)
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Las ubicaciones de origen y destino no corresponden al tipo de movimiento.';
  END IF;
  IF NEW.tipo <> 'ENTRADA' AND (NEW.orden_compra_id IS NOT NULL OR NEW.detalle_orden_compra_id IS NOT NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Solo los movimientos de tipo ENTRADA pueden vincularse a una orden de compra.';
  END IF;
  IF NEW.detalle_orden_compra_id IS NOT NULL AND NEW.orden_compra_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Un movimiento con detalle de orden de compra requiere indicar orden_compra_id.';
  END IF;
END$$

CREATE TRIGGER trg_movimientos_bu_inmutable
BEFORE UPDATE ON movimientos
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'El historial de movimientos es inmutable; utilice un ajuste o nuevo movimiento trazable.';
END$$

DELIMITER ;
