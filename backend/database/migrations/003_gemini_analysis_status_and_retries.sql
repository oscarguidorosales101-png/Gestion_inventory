-- ============================================================================
-- MIGRACIÓN 003: ESTADOS DE ANÁLISIS, REINTENTOS Y TRAZABILIDAD GEMINI IA
-- ============================================================================

USE gestion_inventory;

ALTER TABLE ordenes_compra_analisis_ia
  ADD COLUMN resultado VARCHAR(50) NOT NULL DEFAULT 'POSIBLE_DUPLICADO_DETECTADO' AFTER orden_similar_id,
  ADD COLUMN estado_analisis ENUM(
    'PENDIENTE',
    'PROCESSING',
    'COMPLETADO',
    'ERROR',
    'REINTENTO_PROGRAMADO'
  ) NOT NULL DEFAULT 'COMPLETADO' AFTER resultado,
  ADD COLUMN intentos INT UNSIGNED NOT NULL DEFAULT 1 AFTER estado_analisis,
  ADD COLUMN ultimo_error TEXT NULL AFTER intentos,
  ADD COLUMN candidatos_evaluados JSON NULL AFTER ultimo_error,
  ADD COLUMN locked_at DATETIME NULL AFTER candidatos_evaluados,
  ADD COLUMN locked_by VARCHAR(50) NULL AFTER locked_at,
  ADD INDEX idx_analisis_estado (estado_analisis);
