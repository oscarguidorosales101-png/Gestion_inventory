import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { formatMoneda, formatFecha } from '../utils/formatters';
import {
  ShoppingCart,
  Coins,
  AlertTriangle,
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  RefreshCw,
  Plus,
  ShieldCheck,
  Activity,
} from 'lucide-react';

export const ComprasDashboard = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revisionModal, setRevisionModal] = useState(null);
  const [motivoRevision, setMotivoRevision] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.dashboard.getComprasDashboard();
      setData(res.data);
    } catch (err) {
      setError(err?.message || 'Error al cargar métricas del Tablero de Compras.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleResolverDuplicado = async (resolucion) => {
    if (!revisionModal) return;
    if (!motivoRevision.trim()) {
      alert('Debe indicar un motivo o justificación formal.');
      return;
    }

    try {
      setActionLoading(true);
      await api.ordenes.revisarDuplicado(revisionModal.id, resolucion, motivoRevision);
      setRevisionModal(null);
      setMotivoRevision('');
      await cargarDatos();
    } catch (err) {
      alert(err?.message || 'Error al resolver revisión de duplicado.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
        <Activity size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p>Cargando gestión de abastecimiento, órdenes y análisis de proveedores...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="alert-banner alert-danger">
        <AlertTriangle size={18} />
        <span>{error || 'No se pudieron recuperar las métricas de compras.'}</span>
      </div>
    );
  }

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>Tablero de Gestión de Compras y Abastecimiento</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
            Control presupuestario, detección de duplicados y segregación de funciones (SoD).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onNavigate && (
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate('ordenes')}>
              <Plus size={14} />
              <span>Nueva Orden de Compra</span>
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={cargarDatos}>
            <RefreshCw size={14} />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* Alerta Destacada si existen Duplicados Pendientes */}
      {data.duplicadosPendientes && data.duplicadosPendientes.length > 0 && (
        <div className="alert-banner alert-warning" style={{ borderLeft: '4px solid #B45309' }}>
          <AlertCircle size={22} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Atención: Se han detectado {data.duplicadosPendientes.length} órdenes con posible duplicidad.</strong>
            <div>
              El motor n8n identificó coincidencias de proveedor, monto y líneas en una ventana de 7 días. Requieren revisión humana antes de permitir aprobación.
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Órdenes Pendientes Aprobación</div>
            <div className="kpi-value" style={{ color: '#B45309' }}>
              {data.ordenesPendientesAprobacion}
            </div>
            <div className="kpi-sub">En flujo de autorización SoD</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Duplicados por Revisar</div>
            <div className="kpi-value" style={{ color: data.duplicadosPendientes?.length > 0 ? '#DC2626' : '#15803D' }}>
              {data.duplicadosPendientes?.length || 0}
            </div>
            <div className="kpi-sub">Revisiones humanas pendientes</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Valoración Total Inventario</div>
            <div className="kpi-value">{formatMoneda(data.valorTotalInventarioCrc)}</div>
            <div className="kpi-sub">Activo actual valorado</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <Coins size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Artículos Bajo Reorden</div>
            <div className="kpi-value">{data.distribucionStockPorEstado?.reorden || 0}</div>
            <div className="kpi-sub">Candidatos a reabastecimiento</div>
          </div>
          <div className="kpi-icon-wrap">
            <ShoppingCart size={22} />
          </div>
        </div>
      </div>

      {/* Sección: Órdenes con Posible Duplicado (Revisión Humana Obligatoria) */}
      {data.duplicadosPendientes && data.duplicadosPendientes.length > 0 && (
        <div className="card-table">
          <div className="card-table-header" style={{ backgroundColor: '#FFFBEB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} color="#B45309" />
              <div className="card-table-title" style={{ color: '#92400E' }}>
                Órdenes Bloqueadas por Sospecha de Duplicidad (Requiere Resolución Humana)
              </div>
            </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° Orden</th>
                  <th>Fecha Emisión</th>
                  <th>Proveedor</th>
                  <th>Total (CRC)</th>
                  <th>Creador</th>
                  <th>Orden Similar</th>
                  <th>Acción Requerida</th>
                </tr>
              </thead>
              <tbody>
                {data.duplicadosPendientes.map((dup) => (
                  <tr key={dup.id}>
                    <td style={{ fontWeight: 600 }}>{dup.numero_orden}</td>
                    <td>{formatFecha(dup.fecha_emision)}</td>
                    <td>{dup.proveedor_nombre}</td>
                    <td style={{ fontWeight: 700 }}>{formatMoneda(dup.total_crc)}</td>
                    <td>{dup.creador_nombre}</td>
                    <td>
                      {dup.orden_similar_id ? (
                        <span className="badge badge-gray">ID #{dup.orden_similar_id}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setRevisionModal(dup);
                          setMotivoRevision('');
                        }}
                      >
                        Revisar Duplicado
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grilla: Últimas Órdenes y Top Proveedores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Top Proveedores */}
        <div className="card-table" style={{ margin: 0 }}>
          <div className="card-table-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} color="#15803D" />
              <div className="card-table-title">Proveedores Clave por Facturación</div>
            </div>
            {onNavigate && (
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('proveedores')}>
                Ver Proveedores
              </button>
            )}
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.topProveedores && data.topProveedores.length > 0 ? (
                data.topProveedores.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0F172A' }}>{p.nombre_comercial}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        {p.codigo} — {p.total_ordenes} órdenes procesadas
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#15803D' }}>
                        {formatMoneda(p.total_facturado_crc)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No hay datos de proveedores disponibles.</div>
              )}
            </div>
          </div>
        </div>

        {/* Políticas de Niveles de Autorización (Regla SoD) */}
        <div className="card-table" style={{ margin: 0 }}>
          <div className="card-table-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#15803D" />
              <div className="card-table-title">Niveles de Aprobación y Segregación SoD</div>
            </div>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.85rem' }}>
                  <span>Nivel 1 — Monto Menor</span>
                  <span className="badge badge-normal">&lt; ₡5.000.000</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                  Aprobación por Encargado de Compras. Aplica regla estricta: un usuario no puede aprobar su propia orden.
                </div>
              </div>

              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.85rem' }}>
                  <span>Nivel 2 — Monto Medio</span>
                  <span className="badge badge-reorden">₡5.000.000 a ₡25.000.000</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                  Aprobación por Jefatura de Operaciones / Compras.
                </div>
              </div>

              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.85rem' }}>
                  <span>Nivel 3 — Monto Mayor</span>
                  <span className="badge badge-critico">&gt; ₡25.000.000</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                  Aprobación exclusiva por Gerencia / Administrador General.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Resolución de Duplicados */}
      {revisionModal && (
        <div className="modal-overlay" onClick={() => setRevisionModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Revisión de Posible Duplicado — {revisionModal.numero_orden}</span>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '16px' }}>
                El sistema detectó que esta orden para el proveedor <strong>{revisionModal.proveedor_nombre}</strong> por valor de <strong>{formatMoneda(revisionModal.total_crc)}</strong> presenta similitudes críticas con una orden anterior (ID #{revisionModal.orden_similar_id}).
              </p>

              <div className="form-group">
                <label className="form-label">Justificación o Motivo Formal (Obligatorio para Auditoría)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  required
                  placeholder="Explique por qué se descarta como falso positivo o se confirma el duplicado..."
                  value={motivoRevision}
                  onChange={(e) => setMotivoRevision(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRevisionModal(null)}
                disabled={actionLoading}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={actionLoading}
                onClick={() => handleResolverDuplicado('CONFIRMAR_DUPLICADO')}
              >
                Confirmar Duplicado (Cancelar Orden)
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={actionLoading}
                onClick={() => handleResolverDuplicado('DESCARTAR_FALSO_POSITIVO')}
              >
                Descartar (Falso Positivo)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

