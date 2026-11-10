USE gestion_inventory;

SET NAMES utf8mb4;

START TRANSACTION;

INSERT INTO usuarios (id, nombre, email, password_hash, rol, requiere_cambio_clave, activo) VALUES
(1, 'Administrador General', 'admin@empresaficticiapendiente.cr', 'PENDIENTE_INICIALIZACION_SEGURA', 'ADMINISTRADOR', 1, 1),
(2, 'Encargado de Inventario Central', 'inventario@empresaficticiapendiente.cr', 'PENDIENTE_INICIALIZACION_SEGURA', 'ENCARGADO_INVENTARIO', 1, 1),
(3, 'Analista de Compras', 'compras@empresaficticiapendiente.cr', 'PENDIENTE_INICIALIZACION_SEGURA', 'COMPRAS', 1, 1),
(4, 'Auditor de Consulta', 'consulta@empresaficticiapendiente.cr', 'PENDIENTE_INICIALIZACION_SEGURA', 'CONSULTA', 1, 1);

INSERT INTO categorias (id, codigo, nombre, tipo_gasto, descripcion, activo) VALUES
(1, 'CAT-EST', 'Materiales Estructurales y Obra Gris', 'DIRECTO_OBRA', 'Cemento, acero de refuerzo, agregados y bloques estructurales para construccion', 1),
(2, 'CAT-ACA', 'Acabados e Instalaciones Tecnicas', 'DIRECTO_OBRA', 'Recubrimientos, tuberias, conductores y accesorios de obra', 1),
(3, 'CAT-HER', 'Herramientas y Equipos Menores', 'HERRAMIENTA_EQUIPO', 'Discos de corte, herramientas manuales y consumibles operativos', 1),
(4, 'CAT-EPP', 'Seguridad Industrial y Proteccion Personal', 'SEGURIDAD_EPP', 'Cascos, arneses, guantes y equipo de proteccion normativa en obra', 1);

INSERT INTO proveedores (id, codigo, razon_social, identificacion_fiscal, contacto_nombre, telefono, email, direccion, tiempo_entrega_dias, calificacion, activo) VALUES
(1, 'PROV-001', 'Suministros Estructurales del Valle S.A.', '3-101-450111', 'Carlos Mendez Rojas', '+506 2250-1100', 'ventas@suministrosvalle.cr', 'Parque Industrial Este, Bodega 14, San Jose', 3, 4.80, 1),
(2, 'PROV-002', 'Aceros y Metales Industriales S.A.', '3-101-680222', 'Laura Vega Solis', '+506 2260-2200', 'pedidos@acerosindustriales.cr', 'Zona Industrial Ochomogo, Cartago', 4, 4.50, 1),
(3, 'PROV-003', 'Ferreteria y Seguridad Tecnica S.A.', '3-101-790333', 'Roberto Mora Castro', '+506 2270-3300', 'corporativo@seguridadtecnica.cr', 'Radial Belen, Complejo Logistico 3, Heredia', 5, 4.20, 1);

INSERT INTO ubicaciones (id, codigo, nombre, tipo, direccion, responsable, activo) VALUES
(1, 'ALM-CEN', 'Almacen Central Principal', 'ALMACEN_CENTRAL', 'Plantel Central EMPRESA_FICTICIA_PENDIENTE, Sector Industrial', 'Encargado de Inventario Central', 1),
(2, 'OBR-001', 'Bodega Proyecto Sector Norte', 'BODEGA_OBRA', 'Frente Constructivo Norte, Kilometro 12', 'Ingeniero Residente Norte', 1),
(3, 'OBR-002', 'Frente de Trabajo Puente Sur', 'FRENTE_TRABAJO', 'Paso Elevado Sector Sur, Tramo 2', 'Maestro General de Obra Sur', 1);

INSERT INTO materiales (
  id, codigo, nombre, descripcion, categoria_id, proveedor_principal_id,
  unidad_medida, costo_unitario_crc, stock_minimo, stock_maximo,
  demanda_promedio_diaria, demanda_maxima_diaria, tiempo_entrega_dias,
  stock_seguridad, punto_reorden, activo
) VALUES
(1, 'MAT-001', 'Cemento Portland Tipo I Saco 42.5 kg', 'Cemento hidraulico de uso general estructural', 1, 1, 'SACO', 120.00, 50.00, 500.00, 40.00, 55.00, 3, 45.00, 165.00, 1),
(2, 'MAT-002', 'Varilla Corrugada de Acero 3/8 Pulgada Barra 9m', 'Acero de refuerzo grado 60 norma ASTM A706', 1, 2, 'BARRA', 95.00, 60.00, 600.00, 30.00, 45.00, 4, 60.00, 180.00, 1),
(3, 'MAT-003', 'Arena Lavada de Construccion Metro Cubico', 'Agregado fino limpio para mortero y concreto', 1, 1, 'M3', 180.00, 15.00, 120.00, 12.00, 18.00, 2, 12.00, 36.00, 1),
(4, 'MAT-004', 'Bloque de Concreto Estructural 15x20x40 cm', 'Unidad de mamposteria estructural de alta resistencia', 1, 1, 'UNIDAD', 25.00, 200.00, 2500.00, 200.00, 260.00, 3, 180.00, 780.00, 1),
(5, 'MAT-005', 'Casco de Seguridad Dielectrico Norma ANSI', 'Casco con suspension tipo ratchet clase E para obra', 4, 3, 'UNIDAD', 85.00, 15.00, 150.00, 5.00, 8.00, 5, 15.00, 40.00, 1),
(6, 'MAT-006', 'Disco Diamantado de Corte Industrial 14 Pulgadas', 'Disco segmentado para corte de concreto y asfalto', 3, 3, 'UNIDAD', 150.00, 10.00, 100.00, 4.00, 7.00, 4, 12.00, 28.00, 1);

INSERT INTO configuracion_reglas (
  id, clave, ambito, categoria_id, material_id, proveedor_id,
  tipo_dato, valor_numerico, valor_texto, valor_minimo, valor_maximo,
  descripcion, activo, usuario_actualizacion_id
) VALUES
(1, 'MONEDA_OFICIAL', 'GLOBAL', NULL, NULL, NULL, 'TEXTO', NULL, 'CRC', NULL, NULL, 'Codigo ISO de la moneda oficial del sistema (colon costarricense)', 1, 1),
(2, 'SIMBOLO_MONEDA', 'GLOBAL', NULL, NULL, NULL, 'TEXTO', NULL, '₡', NULL, NULL, 'Simbolo monetario oficial para importes en colones costarricenses', 1, 1),
(3, 'IDENTIFICADOR_EMPRESA', 'GLOBAL', NULL, NULL, NULL, 'TEXTO', NULL, 'EMPRESA_FICTICIA_PENDIENTE', NULL, NULL, 'Identificador provisional de la organizacion constructora', 1, 1),
(4, 'APROBACION_NIVEL_1_MAX', 'GLOBAL', NULL, NULL, NULL, 'DECIMAL', 5000.0000, NULL, 1.0000, 24999.9900, 'Importe maximo en CRC para aprobacion de Nivel 1 (hasta 5000.00 CRC)', 1, 1),
(5, 'APROBACION_NIVEL_2_MAX', 'GLOBAL', NULL, NULL, NULL, 'DECIMAL', 25000.0000, NULL, 5000.0100, 100000000.0000, 'Importe maximo en CRC para aprobacion de Nivel 2 (de 5000.01 a 25000.00 CRC; Nivel 3 mayor a 25000.00 CRC)', 1, 1),
(6, 'DUPLICADOS_VENTANA_DIAS', 'GLOBAL', NULL, NULL, NULL, 'ENTERO', 7.0000, NULL, 1.0000, 90.0000, 'Ventana temporal exacta en dias reales (multiplicada por 86400 segundos) para detectar ordenes similares', 1, 1),
(7, 'DUPLICADOS_TOLERANCIA_PCT', 'GLOBAL', NULL, NULL, NULL, 'DECIMAL', 10.0000, NULL, 0.0000, 100.0000, 'Porcentaje maximo de variacion de cantidad para considerar coincidencia de posible orden duplicada', 1, 1),
(8, 'OUTBOX_MAX_INTENTOS', 'GLOBAL', NULL, NULL, NULL, 'ENTERO', 3.0000, NULL, 1.0000, 10.0000, 'Numero maximo de intentos de procesamiento de un evento de integracion antes de pasar a estado ERROR', 1, 1),
(9, 'OUTBOX_TIMEOUT_PROCESANDO_SEG', 'GLOBAL', NULL, NULL, NULL, 'ENTERO', 300.0000, NULL, 30.0000, 3600.0000, 'Tiempo maximo en segundos que un evento puede permanecer en estado PROCESSING antes de recuperarse', 1, 1),
(10, 'OUTBOX_TAMANO_LOTE', 'GLOBAL', NULL, NULL, NULL, 'ENTERO', 20.0000, NULL, 1.0000, 100.0000, 'Cantidad maxima de eventos pendientes reclamados por lote desde n8n', 1, 1),
(11, 'DUPLICADOS_TOLERANCIA_PCT', 'CATEGORIA', 1, NULL, NULL, 'DECIMAL', 10.0000, NULL, 0.0000, 100.0000, 'Tolerancia porcentual especifica para categoria de materiales estructurales', 1, 1),
(12, 'DUPLICADOS_TOLERANCIA_PCT', 'MATERIAL', NULL, 1, NULL, 'DECIMAL', 10.0000, NULL, 0.0000, 100.0000, 'Tolerancia porcentual especifica para Cemento Portland Tipo I', 1, 1),
(13, 'DUPLICADOS_VENTANA_DIAS', 'PROVEEDOR', NULL, NULL, 1, 'ENTERO', 7.0000, NULL, 1.0000, 90.0000, 'Ventana de deteccion de duplicados especifica para proveedor estructural principal', 1, 1);

INSERT INTO ordenes_compra (
  id, numero_orden, proveedor_id, ubicacion_destino_id,
  usuario_creador_id, usuario_aprobador_id, fecha_emision,
  fecha_entrega_estimada, fecha_recepcion_completa, estado,
  nivel_aprobacion_requerido, moneda, subtotal_crc, impuestos_crc, total_crc,
  es_posible_duplicado, estado_revision_duplicado, orden_similar_id, observaciones
) VALUES
(
  1, 'OC-2026-0001', 1, 1,
  3, 2, '2026-11-02 09:00:00',
  '2026-11-05', '2026-11-05 14:30:00', 'RECIBIDA',
  'NIVEL_2', 'CRC', 24000.00, 0.00, 24000.00,
  0, 'NO_APLICA', NULL, 'Abastecimiento inicial de cemento para Almacen Central (Nivel 2 aprobado por Encargado de Inventario)'
),
(
  2, 'OC-2026-0002', 2, 1,
  3, 1, '2026-11-03 10:15:00',
  '2026-11-07', NULL, 'PARCIALMENTE_RECIBIDA',
  'NIVEL_3', 'CRC', 28500.00, 0.00, 28500.00,
  0, 'NO_APLICA', NULL, 'Compra de acero de refuerzo (Nivel 3 aprobado por Administrador General; primera entrega parcial recibida)'
),
(
  3, 'OC-2026-0003', 3, 1,
  3, 2, '2026-11-06 11:00:00',
  '2026-11-11', NULL, 'APROBADA',
  'NIVEL_1', 'CRC', 4250.00, 0.00, 4250.00,
  0, 'NO_APLICA', NULL, 'Reposicion de cascos de seguridad (Nivel 1 aprobado por usuario distinto al creador)'
),
(
  4, 'OC-2026-0004', 3, 2,
  3, NULL, '2026-11-08 15:20:00',
  '2026-11-13', NULL, 'PENDIENTE_APROBACION',
  'NIVEL_1', 'CRC', 4420.00, 0.00, 4420.00,
  1, 'PENDIENTE_REVISION', 3, 'Orden detectada como posible duplicado de OC-2026-0003 dentro de la ventana de 7 dias reales y tolerancia del 10%'
);

INSERT INTO detalle_orden_compra (
  id, orden_compra_id, material_id, cantidad_solicitada, cantidad_recibida, precio_unitario_crc, subtotal_crc
) VALUES
(1, 1, 1, 200.00, 200.00, 120.00, 24000.00),
(2, 2, 2, 300.00, 250.00, 95.00, 28500.00),
(3, 3, 5, 50.00, 0.00, 85.00, 4250.00),
(4, 4, 5, 52.00, 0.00, 85.00, 4420.00);

INSERT INTO movimientos (
  id, tipo, material_id, ubicacion_origen_id, ubicacion_destino_id,
  orden_compra_id, detalle_orden_compra_id, usuario_id, cantidad, costo_unitario_crc,
  snapshot_stock_ant_origen, snapshot_stock_nue_origen,
  snapshot_stock_ant_destino, snapshot_stock_nue_destino,
  motivo, referencia, fecha_movimiento
) VALUES
(
  1, 'ENTRADA', 1, NULL, 1,
  1, 1, 2, 200.00, 120.00,
  NULL, NULL, 0.00, 200.00,
  'Recepcion completa de orden de compra OC-2026-0001', 'GR-2026-101', '2026-11-05 14:30:00'
),
(
  2, 'TRANSFERENCIA', 1, 1, 2,
  NULL, NULL, 2, 30.00, 120.00,
  200.00, 170.00, 0.00, 30.00,
  'Traslado de cemento hacia Bodega Proyecto Sector Norte', 'TR-2026-001', '2026-11-06 08:30:00'
),
(
  3, 'SALIDA', 1, 1, NULL,
  NULL, NULL, 2, 50.00, 120.00,
  170.00, 120.00, NULL, NULL,
  'Despacho para fundicion de cimientos en planta central', 'VAL-2026-015', '2026-11-07 09:45:00'
),
(
  4, 'ENTRADA', 2, NULL, 1,
  2, 2, 2, 250.00, 95.00,
  NULL, NULL, 0.00, 250.00,
  'Primera recepcion parcial de orden de compra OC-2026-0002 (quedan 50 barras pendientes)', 'GR-2026-108', '2026-11-07 11:20:00'
),
(
  5, 'AJUSTE_POSITIVO', 2, NULL, 1,
  NULL, NULL, 1, 10.00, 95.00,
  NULL, NULL, 250.00, 260.00,
  'Ajuste positivo por conteo fisico ciclico verificado en Almacen Central', 'ACT-AJ-001', '2026-11-07 16:00:00'
),
(
  6, 'ENTRADA', 3, NULL, 1,
  NULL, NULL, 2, 25.00, 180.00,
  NULL, NULL, 0.00, 25.00,
  'Ingreso inicial de arena lavada en plantel central', 'GR-2026-090', '2026-11-04 10:00:00'
),
(
  7, 'SALIDA', 3, 1, NULL,
  NULL, NULL, 2, 13.00, 180.00,
  25.00, 12.00, NULL, NULL,
  'Consumo de arena para mezcla de mamposteria estructural', 'VAL-2026-019', '2026-11-08 10:30:00'
),
(
  8, 'ENTRADA', 4, NULL, 1,
  NULL, NULL, 2, 1000.00, 25.00,
  NULL, NULL, 0.00, 1000.00,
  'Ingreso de lote inicial de bloques estructurales 15x20x40', 'GR-2026-095', '2026-11-04 13:00:00'
),
(
  9, 'AJUSTE_NEGATIVO', 4, 1, NULL,
  NULL, NULL, 1, 20.00, 25.00,
  1000.00, 980.00, NULL, NULL,
  'Baja por rotura de bloques durante descarga documentada en acta de bodega', 'ACT-AJ-002', '2026-11-08 11:15:00'
),
(
  10, 'ENTRADA', 6, NULL, 1,
  NULL, NULL, 2, 45.00, 150.00,
  NULL, NULL, 0.00, 45.00,
  'Ingreso de discos diamantados de corte para maquinaria menor', 'GR-2026-099', '2026-11-05 09:00:00'
);

INSERT INTO eventos_integracion (
  id, evento_uuid, clave_idempotencia, tipo_evento, entidad_tipo, entidad_id,
  payload, estado, intentos, max_intentos, locked_at, locked_by, claim_token,
  timeout_segundos, ultimo_error, resultado_procesamiento, created_at, processed_at
) VALUES
(
  1, '11111111-2222-4333-8444-555555550001', 'MOVIMIENTO:3:SALIDA', 'MOVIMIENTO_REGISTRADO', 'MOVIMIENTO', 3,
  JSON_OBJECT('movimiento_id', 3, 'material_id', 1, 'tipo', 'SALIDA', 'cantidad', 50.00, 'stock_global_resultante', 150.00),
  'PROCESADO', 1, 3, NULL, NULL, NULL,
  300, NULL,
  JSON_OBJECT('alerta_evaluada', 'REORDEN', 'pasos_completados', JSON_OBJECT('PERSISTENCIA_ALERTA', '2026-11-07T09:46:00Z')),
  '2026-11-07 09:45:00', '2026-11-07 09:46:05'
),
(
  2, '11111111-2222-4333-8444-555555550002', 'MOVIMIENTO:7:SALIDA', 'MOVIMIENTO_REGISTRADO', 'MOVIMIENTO', 7,
  JSON_OBJECT('movimiento_id', 7, 'material_id', 3, 'tipo', 'SALIDA', 'cantidad', 13.00, 'stock_global_resultante', 12.00),
  'PROCESADO', 1, 3, NULL, NULL, NULL,
  300, NULL,
  JSON_OBJECT('alerta_evaluada', 'STOCK_CRITICO', 'pasos_completados', JSON_OBJECT('PERSISTENCIA_ALERTA', '2026-11-08T10:31:00Z')),
  '2026-11-08 10:30:00', '2026-11-08 10:31:04'
),
(
  3, '11111111-2222-4333-8444-555555550003', 'ORDEN_COMPRA:4:CREACION', 'ORDEN_COMPRA_CREADA', 'ORDEN_COMPRA', 4,
  JSON_OBJECT('orden_compra_id', 4, 'numero_orden', 'OC-2026-0004', 'proveedor_id', 3, 'total_crc', 4420.00, 'es_posible_duplicado', 1, 'orden_similar_id', 3),
  'PENDIENTE', 0, 3, NULL, NULL, NULL,
  300, NULL, NULL,
  '2026-11-08 15:20:00', NULL
);

INSERT INTO alertas (
  id, tipo, severidad, material_id, orden_compra_id, evento_integracion_id,
  contexto_clave, estado, titulo, mensaje, motivo_cierre, usuario_resolucion_id,
  fecha_generacion, fecha_resolucion
) VALUES
(
  1, 'REORDEN', 'MEDIA', 1, NULL, 1,
  'INVENTARIO:MAT:1', 'ACTIVA',
  'Punto de reorden alcanzado: MAT-001 Cemento Portland Tipo I',
  'El stock global actual (150.00 SACO) es menor o igual al punto de reorden (165.00 SACO) y superior al stock minimo (50.00 SACO).',
  NULL, NULL, '2026-11-07 09:45:05', NULL
),
(
  2, 'STOCK_CRITICO', 'ALTA', 3, NULL, 2,
  'INVENTARIO:MAT:3', 'ACTIVA',
  'Stock critico bajo minimo: MAT-003 Arena Lavada de Construccion',
  'El stock global actual (12.00 M3) es menor o igual al stock minimo operativo (15.00 M3). Punto de reorden: 36.00 M3.',
  NULL, NULL, '2026-11-08 10:30:05', NULL
),
(
  3, 'STOCK_CRITICO', 'CRITICA', 5, NULL, NULL,
  'INVENTARIO:MAT:5', 'ACTIVA',
  'Material sin existencias: MAT-005 Casco de Seguridad Dielectrico',
  'El stock global actual es 0.00 UNIDAD (stock minimo: 15.00 UNIDAD, punto de reorden: 40.00 UNIDAD). Existe orden OC-2026-0003 aprobada pendiente de recepcion.',
  NULL, NULL, '2026-11-06 08:00:00', NULL
),
(
  4, 'ORDEN_DUPLICADA', 'ALTA', 5, 4, 3,
  'DUPLICADO:OC:4', 'ACTIVA',
  'Posible orden de compra duplicada: OC-2026-0004 similar a OC-2026-0003',
  'La orden OC-2026-0004 para el proveedor PROV-003 incluye el material MAT-005 con 52.00 unidades (variacion de 4.00% <= 10.00%) emitida a 188400 segundos (<= 604800 segundos / 7 dias reales) de OC-2026-0003. Requiere revision humana.',
  NULL, NULL, '2026-11-08 15:20:05', NULL
);

INSERT INTO auditoria (
  id, usuario_id, accion, tipo_operacion, entidad_afectada,
  registro_afectado_id, cantidad_anterior, cantidad_nueva, motivo,
  datos_previos, datos_nuevos, fecha_hora
) VALUES
(
  1, 2, 'RECEPCION_COMPLETA_ORDEN_COMPRA', 'RECEPCION_COMPRA', 'ordenes_compra',
  1, 0.00, 200.00, 'Recepcion total de 200 sacos de cemento de OC-2026-0001 en Almacen Central',
  JSON_OBJECT('estado', 'APROBADA', 'cantidad_recibida', 0.00),
  JSON_OBJECT('estado', 'RECIBIDA', 'cantidad_recibida', 200.00, 'movimiento_id', 1),
  '2026-11-05 14:30:00'
),
(
  2, 2, 'TRANSFERENCIA_UBICACIONES', 'MOVIMIENTO_INVENTARIO', 'movimientos',
  2, 200.00, 170.00, 'Transferencia de 30 sacos desde Almacen Central (200 -> 170) hacia Bodega Proyecto Sector Norte (0 -> 30)',
  JSON_OBJECT('stock_origen', 200.00, 'stock_destino', 0.00),
  JSON_OBJECT('stock_origen', 170.00, 'stock_destino', 30.00),
  '2026-11-06 08:30:00'
),
(
  3, 2, 'RECEPCION_PARCIAL_ORDEN_COMPRA', 'RECEPCION_COMPRA', 'ordenes_compra',
  2, 0.00, 250.00, 'Recepcion parcial de 250 barras sobre 300 solicitadas en OC-2026-0002',
  JSON_OBJECT('estado', 'APROBADA', 'cantidad_recibida', 0.00, 'cantidad_pendiente', 300.00),
  JSON_OBJECT('estado', 'PARCIALMENTE_RECIBIDA', 'cantidad_recibida', 250.00, 'cantidad_pendiente', 50.00, 'movimiento_id', 4),
  '2026-11-07 11:20:00'
),
(
  4, 3, 'DETECCION_POSIBLE_ORDEN_DUPLICADA', 'CREACION', 'ordenes_compra',
  4, NULL, 52.00, 'Creacion de OC-2026-0004 marcada para revision humana por similitud con OC-2026-0003',
  NULL,
  JSON_OBJECT('numero_orden', 'OC-2026-0004', 'es_posible_duplicado', 1, 'estado_revision_duplicado', 'PENDIENTE_REVISION', 'orden_similar_id', 3),
  '2026-11-08 15:20:00'
);

COMMIT;

