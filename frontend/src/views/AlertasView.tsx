import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Alerta } from '../types';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

export const AlertasView: React.FC = () => {
  const { user } = useAuth();
  const canResolve = user && ['ADMINISTRADOR', 'ENCARGADO_INVENTARIO', 'COMPRAS'].includes(user.rol);

  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [soloActivas, setSoloActivas] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reevaluando, setReevaluando] = useState(false);

  // Modal resolver
  const [alertaAResolver, setAlertaAResolver] = useState<Alerta | null>(null);
  const [motivoResolucion, setMotivoResolucion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarAlertas = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.alertas.getAll({ solo_activas: soloActivas });
      setAlertas(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando alertas de inventario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAlertas();
  }, [soloActivas]);

  const handleReevaluar = async () => {
    setReevaluando(true);
    try {
      await api.alertas.reevaluar();
      await cargarAlertas();
    } catch (err: any) {
      alert('Error al reevaluar alertas: ' + err.message);
    } finally {
      setReevaluando(false);
    }
  };

  const handleConfirmarResolucion = async () => {
    if (!alertaAResolver) return;
    setGuardando(true);
    try {
      await api.alertas.resolver(alertaAResolver.id, motivoResolucion);
      setAlertaAResolver(null);
      setMotivoResolucion('');
      cargarAlertas();
    } catch (err: any) {
      alert('Error al resolver alerta: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                id="checkSoloActivas"
                checked={soloActivas}
                onChange={(e) => setSoloActivas(e.target.checked)}
              />
              <label htmlFor="checkSoloActivas" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                Mostrar unicamente alertas activas no resueltas
              </label>
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleReevaluar} disabled={reevaluando}>
            <RefreshCw size={14} style={{ animation: reevaluando ? 'spin 1s linear infinite' : undefined }} />
            <span>{reevaluando ? 'Reevaluando...' : 'Reevaluar Stock y Niveles Ahora'}</span>
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
            <AlertTriangle size={18} />
            <span>Registro de Alertas del Sistema ({alertas.length} registros)</span>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha Generacion</th>
                <th>Material</th>
                <th>Tipo de Alerta</th>
                <th>Severidad</th>
                <th>Mensaje / Diagnostico</th>
                <th>Stock vs PR vs SS</th>
                <th>Estado</th>
                {canResolve && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>
                    Consultando alertas...
                  </td>
                </tr>
              ) : alertas.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#15803d' }}>
                    Excelente: No hay alertas pendientes en este momento. Todos los materiales operan dentro de parametros normales.
                  </td>
                </tr>
              ) : (
                alertas.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {new Date(a.created_at).toLocaleDateString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <strong>{a.material_sku || `Mat #${a.material_id}`}</strong>
                      {a.material_nombre && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{a.material_nombre}</div>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          a.tipo_alerta === 'STOCK_CRITICO'
                            ? 'badge-critico'
                            : a.tipo_alerta === 'REORDEN'
                            ? 'badge-reorden'
                            : 'badge-purple'
                        }`}
                      >
                        {a.tipo_alerta}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          a.severidad === 'CRITICA'
                            ? 'badge-critico'
                            : a.severidad === 'ALTA'
                            ? 'badge-reorden'
                            : 'badge-info'
                        }`}
                      >
                        {a.severidad}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{a.mensaje}</td>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {a.stock_actual !== undefined && a.punto_reorden !== undefined ? (
                        <div>
                          Stock: <strong>{a.stock_actual}</strong> | PR: {a.punto_reorden} | SS: {a.stock_seguridad}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <span className={`badge ${!a.resuelto ? 'badge-critico' : 'badge-normal'}`}>
                        {!a.resuelto ? 'ACTIVA' : 'RESUELTA'}
                      </span>
                    </td>
                    {canResolve && (
                      <td>
                        {!a.resuelto ? (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              setAlertaAResolver(a);
                              setMotivoResolucion('');
                            }}
                            title="Marcar alerta como atendida"
                          >
                            <CheckCircle size={13} />
                            <span>Atender</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {a.resolved_at ? new Date(a.resolved_at).toLocaleDateString('es-CR') : 'Atendida'}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Resolver Alerta */}
      {alertaAResolver && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-title">Atender Alerta de Inventario</div>
              <button className="modal-close" onClick={() => setAlertaAResolver(null)}>
                Ã—
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>
                Material: <strong>{alertaAResolver.material_sku}</strong> â€” {alertaAResolver.mensaje}
              </p>
              <div className="form-group">
                <label className="form-label">Accion Correctiva o Justificacion</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={motivoResolucion}
                  onChange={(e) => setMotivoResolucion(e.target.value)}
                  placeholder="Se genero orden de compra urgente / Se reviso con compras / Falso positivo..."
                  disabled={guardando}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAlertaAResolver(null)} disabled={guardando}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleConfirmarResolucion} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Marcar como Atendida'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
