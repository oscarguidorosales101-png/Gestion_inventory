import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatMoneda, formatFecha } from '../../utils/formatters';
import {
  AlertCircle,
  X,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  AlertOctagon,
  FileText,
  ShieldAlert,
  Activity,
  ArrowRight,
  Info,
} from 'lucide-react';

export const RevisionDuplicadoModal = ({ orden, onClose, onSuccess }) => {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [analisisIA, setAnalisisIA] = useState(null);
  const [loadingIA, setLoadingIA] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargarAnalisis() {
      try {
        setLoadingIA(true);
        const res = await api.ordenes.getAnalisisIA(orden.id);
        setAnalisisIA(res.data);
      } catch (err) {
        console.error('Error al cargar análisis de duplicidad IA:', err);
      } finally {
        setLoadingIA(false);
      }
    }
    if (orden?.id) {
      cargarAnalisis();
    }
  }, [orden?.id]);

  const handleResolver = async (resolucion) => {
    if (!motivo.trim()) {
      setError('Debe indicar una justificación o motivo formal para el registro de auditoría.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.ordenes.revisarDuplicado(orden.id, resolucion, motivo.trim());
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Error al registrar resolución del duplicado.');
    } finally {
      setLoading(false);
    }
  };

  const getNivelBadgeClass = (nivel) => {
    switch (nivel) {
      case 'CONFIRMADO_DUPLICADO':
      case 'ALTA':
      case 'REVISION_MANUAL_REQUERIDA':
        return 'badge badge-critico';
      case 'MODERADA':
        return 'badge badge-warning';
      case 'BAJA':
        return 'badge badge-gray';
      case 'SIN_COINCIDENCIAS':
        return 'badge badge-normal';
      default:
        return 'badge badge-gray';
    }
  };

  const formatNivelTexto = (nivel) => {
    switch (nivel) {
      case 'CONFIRMADO_DUPLICADO':
        return 'Confirmado Duplicado';
      case 'ALTA':
        return 'Alta Coincidencia';
      case 'REVISION_MANUAL_REQUERIDA':
        return 'Revisión Manual Obligatoria';
      case 'MODERADA':
        return 'Coincidencia Moderada';
      case 'BAJA':
        return 'Baja Coincidencia';
      case 'SIN_COINCIDENCIAS':
        return 'Sin Coincidencias Relevantes';
      default:
        return nivel || 'Pendiente de Evaluación';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B45309' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Revisión de Posible Duplicidad — {orden.numero_orden}</span>
                {analisisIA?.nivel_coincidencia && (
                  <span className={getNivelBadgeClass(analisisIA.nivel_coincidencia)}>
                    {formatNivelTexto(analisisIA.nivel_coincidencia)}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Auditoría preventiva de compras con asistencia de Google Gemini IA
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div className="alert-banner alert-danger">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Resumen de la Orden Evaluada */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>PROVEEDOR</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{orden.proveedor_nombre}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>MONTO TOTAL (CRC)</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#15803D' }}>{formatMoneda(orden.total_crc)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>FECHA DE EMISIÓN</div>
              <div style={{ fontSize: '0.85rem', color: '#334155' }}>{formatFecha(orden.fecha_emision, true)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>ORDEN SIMILAR PREVIA</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#B45309' }}>
                {orden.orden_similar_numero ? `#${orden.orden_similar_numero}` : (orden.orden_similar_id ? `#${orden.orden_similar_id}` : 'Ninguna')}
              </div>
            </div>
          </div>

          {/* Tarjeta de Análisis Asistido por Google Gemini IA */}
          <div style={{ borderRadius: '8px', border: '1px solid #BBF7D0', backgroundColor: '#F0FDF4', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803D', fontWeight: 700, fontSize: '0.9rem' }}>
                <Sparkles size={18} />
                <span>Análisis Multifactorial con Google Gemini IA</span>
              </div>
              {analisisIA?.modelo_utilizado && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#15803D', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    {analisisIA.modelo_utilizado}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#475569', backgroundColor: '#E2E8F0', padding: '2px 8px', borderRadius: '4px' }}>
                    Confianza: {analisisIA.nivel_confianza || 'Alta'}
                  </span>
                </div>
              )}
            </div>

            {loadingIA ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#15803D' }}>
                <Activity size={22} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                <div style={{ fontSize: '0.82rem' }}>Evaluando coincidencias multifactoriales con Gemini...</div>
              </div>
            ) : analisisIA ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Explicación Ejecutiva */}
                <div style={{ fontSize: '0.85rem', color: '#1E293B', lineHeight: '1.45', backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '6px', border: '1px solid #DCFCE7' }}>
                  <strong>Diagnóstico del Modelo:</strong> {analisisIA.explicacion}
                </div>

                {/* Grid Motivos de Coincidencia y Diferencias */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Coincidencias */}
                  <div style={{ backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B91C1C', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <AlertOctagon size={14} />
                      <span>Factores Coincidentes Detectados</span>
                    </div>
                    {Array.isArray(analisisIA.motivos_coincidencia) && analisisIA.motivos_coincidencia.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#334155' }}>
                        {analisisIA.motivos_coincidencia.map((m, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>{m}</li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>No se hallaron coincidencias críticas.</div>
                    )}
                  </div>

                  {/* Diferencias */}
                  <div style={{ backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803D', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <CheckCircle2 size={14} />
                      <span>Diferencias Identificadas</span>
                    </div>
                    {Array.isArray(analisisIA.diferencias_detectadas) && analisisIA.diferencias_detectadas.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#334155' }}>
                        {analisisIA.diferencias_detectadas.map((d, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>{d}</li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Órdenes virtualmente idénticas.</div>
                    )}
                  </div>
                </div>

                {/* Riesgos y Recomendación */}
                <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                  {analisisIA.consecuencias_posibles && (
                    <div>
                      <strong style={{ color: '#B91C1C' }}>Impacto / Riesgo Operativo:</strong> {analisisIA.consecuencias_posibles}
                    </div>
                  )}
                  {analisisIA.recomendacion && (
                    <div>
                      <strong style={{ color: '#0F172A' }}>Recomendación Sugerida:</strong> {analisisIA.recomendacion}
                    </div>
                  )}
                  {analisisIA.procedimiento_sugerido && (
                    <div style={{ fontSize: '0.78rem', color: '#64748B', borderTop: '1px dashed #E2E8F0', paddingTop: '6px', marginTop: '4px' }}>
                      <strong>Procedimiento de Resolución:</strong> {analisisIA.procedimiento_sugerido}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.82rem', color: '#64748B', textAlign: 'center', padding: '12px' }}>
                No hay análisis previo registrado. Se ejecutará automáticamente en segundo plano.
              </div>
            )}
          </div>

          {/* Formulario de Justificación Obligatoria */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              Dictamen y Justificación Formal del Usuario (Inmutable en Bitácora de Auditoría) *
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              required
              placeholder="Indique con claridad el resultado de la verificación humana (ej: 'Se constató que la orden OC-2026-0042 cubre el suministro completo; se cancela la presente orden por digitación duplicada accidental')..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>
              Este dictamen se registrará irrevocablemente en la tabla de auditoría con su identidad de usuario y marca temporal legal.
            </div>
          </div>
        </div>

        {/* Footer con Acciones Claras */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cerrar sin Resolver
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-danger"
              disabled={loading}
              onClick={() => handleResolver('CONFIRMAR_DUPLICADO')}
            >
              Confirmar Duplicado (Cancelar Orden)
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading}
              onClick={() => handleResolver('DESCARTAR_FALSO_POSITIVO')}
            >
              Descartar Falso Positivo (Habilitar Aprobación)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
