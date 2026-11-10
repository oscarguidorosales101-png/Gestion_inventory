-- ============================================================================
-- MIGRACIÓN 002: TABLA DE ANÁLISIS INTELIGENTE DE DUPLICIDAD CON GOOGLE GEMINI
-- ============================================================================

USE gestion_inventory;

CREATE TABLE IF NOT EXISTS ordenes_compra_analisis_ia (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  orden_compra_id INT UNSIGNED NOT NULL,
  orden_similar_id INT UNSIGNED NULL,
  es_posible_duplicado TINYINT(1) NOT NULL DEFAULT 0,
  nivel_coincidencia ENUM(
    'SIN_COINCIDENCIAS',
    'BAJA',
    'MODERADA',
    'ALTA',
    'REVISION_MANUAL_REQUERIDA',
    'CONFIRMADO_DUPLICADO'
  ) NOT NULL DEFAULT 'SIN_COINCIDENCIAS',
  nivel_confianza VARCHAR(30) NULL,
  explicacion TEXT NULL,
  motivos_coincidencia JSON NULL,
  diferencias_detectadas JSON NULL,
  datos_justifican JSON NULL,
  consecuencias_posibles TEXT NULL,
  recomendacion VARCHAR(500) NULL,
  procedimiento_sugerido TEXT NULL,
  modelo_utilizado VARCHAR(100) NOT NULL DEFAULT 'gemini-3.5-flash-lite',
  fecha_analisis DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_analisis_orden (orden_compra_id),
  INDEX idx_analisis_similar (orden_similar_id),
  INDEX idx_analisis_nivel (nivel_coincidencia),
  CONSTRAINT fk_analisis_orden FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_analisis_similar FOREIGN KEY (orden_similar_id) REFERENCES ordenes_compra (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

