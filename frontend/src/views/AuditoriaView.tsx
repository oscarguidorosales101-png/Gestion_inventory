import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { RegistroAuditoria } from '../types';
import { ShieldCheck, Eye, Filter, AlertCircle } from 'lucide-react';

export const AuditoriaView: React.FC = () => {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroEntidad, setFiltroEntidad] = useState('');

  // Modal JSON
  const [registroDetalle, setRegistroDetalle] = useState<RegistroAuditoria | null>(null);

  const cargarAuditoria = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.auditoria.getAll({
        accion: filtroAccion || undefined,
        entidad: filtroEntidad || undefined,
      });
      setRegistros(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando registros de auditoria.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAuditoria();
  }, [filtroAccion, filtroEntidad]);

  return (
    <div>
      {/* Barra de Filtros */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem' }}>
            <Filter size={16} />
            <span>Filtrar Trazabilidad:</span>
          </div>

          <input
            type="text"
            className="form-control"
            style={{ width: '220px' }}
            placeholder="Filtrar por Accion..."
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
          />

          <select
            className="form-control"
            style={{ width: '200px' }}
            value={filtroEntidad}
            onChange={(e) => setFiltroEntidad(e.target.value)}
          >
            <option value="">Todas las Entidades</option>
            <option value="usuarios">usuarios</option>
            <option value="ordenes_compra">ordenes_compra</option>
            <option value="movimientos">movimientos</option>
            <option value="materiales">materiales</option>
            <option value="alertas">alertas</option>
            <option value="configuracion_reglas">configuracion_reglas</option>
          </select>

          <button className="btn btn-outline btn-sm" onClick={cargarAuditoria}>
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ShieldCheck size={18} />
            <span>Pista Inmutable de Auditoria ({registros.length} eventos registrados)</span>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Usuario</th>
                <th>Accion</th>
                <th>Tipo Operacion</th>
                <th>Entidad Afectada</th>
                <th>Motivo / Descripcion</th>
                <th>Detalle JSON</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                    Cargando pista de auditoria...
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No se encontraron registros de auditoria con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                registros.map((r) => {
                  const esAlertaRechazo = r.accion.includes('RECHAZADO') || r.accion.includes('SOSPECHA');
                  return (
                    <tr key={r.id}>
                      <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleDateString('es-CR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td>
                        <strong>{r.usuario_nombre || `Usuario #${r.usuario_id || 'Sistema'}`}</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            esAlertaRechazo
                              ? 'badge-critico'
                              : r.accion.includes('APROBACION')
                              ? 'badge-normal'
                              : 'badge-info'
                          }`}
                        >
                          {r.accion}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{r.tipo_operacion}</td>
                      <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {r.entidad_afectada} #{r.registro_afectado_id || '-'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#475569', maxWidth: '300px' }}>
                        {r.motivo || '-'}
                      </td>
                      <td>
                        {(r.estado_anterior || r.estado_nuevo) ? (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setRegistroDetalle(r)}
                            title="Ver estado anterior y nuevo en formato JSON"
                          >
                            <Eye size={13} />
                            <span>Ver Payload</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sin payload</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ver JSON Payload */}
      {registroDetalle && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div className="modal-title">
                Detalle de Trazabilidad: Asiento #{registroDetalle.id} ({registroDetalle.accion})
              </div>
              <button className="modal-close" onClick={() => setRegistroDetalle(null)}>
                Ã—
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '14px', fontSize: '0.85rem' }}>
                <div><strong>Operacion:</strong> {registroDetalle.tipo_operacion} sobre {registroDetalle.entidad_afectada} #{registroDetalle.registro_afectado_id}</div>
                <div><strong>Responsable:</strong> {registroDetalle.usuario_nombre || 'Sistema'}</div>
                <div><strong>Fecha:</strong> {new Date(registroDetalle.created_at).toLocaleString('es-CR')}</div>
                {registroDetalle.motivo && <div style={{ marginTop: '4px', color: '#64748b' }}><strong>Motivo:</strong> {registroDetalle.motivo}</div>}
              </div>

              {registroDetalle.estado_anterior && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>
                    Estado Anterior:
                  </div>
                  <pre
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#f8fafc',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      overflowX: 'auto',
                    }}
                  >
                    {typeof registroDetalle.estado_anterior === 'string'
                      ? registroDetalle.estado_anterior
                      : JSON.stringify(registroDetalle.estado_anterior, null, 2)}
                  </pre>
                </div>
              )}

              {registroDetalle.estado_nuevo && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>
                    Estado Nuevo:
                  </div>
                  <pre
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#f8fafc',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      overflowX: 'auto',
                    }}
                  >
                    {typeof registroDetalle.estado_nuevo === 'string'
                      ? registroDetalle.estado_nuevo
                      : JSON.stringify(registroDetalle.estado_nuevo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setRegistroDetalle(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
