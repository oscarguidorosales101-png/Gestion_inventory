import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';
import { formatFecha, formatNumero, formatTipoAlerta, formatSeveridadAlerta, formatEstadoAlerta } from '../../utils/formatters';
import { AlertTriangle, CheckCircle, RefreshCw, Filter, ShieldAlert } from 'lucide-react';
import { ResolverAlertaModal } from './ResolverAlertaModal';

export const AlertasList = () => {
  const { user } = useAuth();
  const canResolve = [ROLES.ADMINISTRADOR, ROLES.ENCARGADO_INVENTARIO, ROLES.COMPRAS].includes(user?.rol);

  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soloActivas, setSoloActivas] = useState(true);
  const [selectedAlerta, setSelectedAlerta] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  const cargarAlertas = async () => {
    try {
      setLoading(true);
      const res = await api.alertas.getAll({ solo_activas: soloActivas });
      setAlertas(res.data || []);
    } catch (err) {
      console.error('Error al cargar alertas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAlertas();
  }, [soloActivas]);

  const handleReevaluar = async () => {
    try {
      setEvaluating(true);
      await api.alertas.reevaluar();
      await cargarAlertas();
    } catch (err) {
      alert(err?.message || 'Error al reevaluar alertas.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div>
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color="#DC2626" />
            <div className="card-table-title">Alertas Operativas de Abastecimiento e Inventario</div>
          </div>

          <div className="card-table-actions">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={soloActivas}
                onChange={(e) => setSoloActivas(e.target.checked)}
              />
              <span>Solo Activas</span>
            </label>

            <button className="btn btn-secondary btn-sm" onClick={cargarAlertas}>
              <RefreshCw size={14} />
            </button>

            {canResolve && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleReevaluar}
                disabled={evaluating}
              >
                <RefreshCw size={14} className={evaluating ? 'animate-spin' : ''} />
                <span>{evaluating ? 'Evaluando...' : 'Reevaluar Alertas Ahora'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha Generación</th>
                <th>Tipo</th>
                <th>Severidad</th>
                <th>Material</th>
                <th>Mensaje / Incidencia</th>
                <th>Estado</th>
                <th>Resolución</th>
                {canResolve && <th>Acción</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canResolve ? 9 : 8} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    Cargando alertas de stock...
                  </td>
                </tr>
              ) : alertas.length > 0 ? (
                alertas.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>ALT-#{a.id}</td>
                    <td>{formatFecha(a.fecha_alerta || a.created_at, true)}</td>
                    <td><span className="badge badge-gray">{formatTipoAlerta(a.tipo)}</span></td>
                    <td>
                      <span className={`badge ${
                        a.severidad === 'CRITICA' || a.severidad === 'ALTA' ? 'badge-critico' :
                        a.severidad === 'MEDIA' ? 'badge-reorden' : 'badge-normal'
                      }`}>
                        {formatSeveridadAlerta(a.severidad)}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{a.material_nombre} ({a.material_sku})</td>
                    <td style={{ maxWidth: '300px' }}>{a.mensaje}</td>
                    <td>
                      <span className={`badge ${a.estado === 'ACTIVA' ? 'badge-critico' : 'badge-normal'}`}>
                        {formatEstadoAlerta(a.estado)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      {a.motivo_resolucion || (a.estado === 'ACTIVA' ? 'Pendiente' : 'Automatizado')}
                    </td>
                    {canResolve && (
                      <td>
                        {a.estado === 'ACTIVA' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedAlerta(a)}
                          >
                            <CheckCircle size={13} color="#15803D" />
                            <span>Resolver</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canResolve ? 9 : 8} className="empty-state">
                    No existen alertas pendientes que requieran atención.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAlerta && (
        <ResolverAlertaModal
          alerta={selectedAlerta}
          onClose={() => setSelectedAlerta(null)}
          onSuccess={() => {
            setSelectedAlerta(null);
            cargarAlertas();
          }}
        />
      )}
    </div>
  );
};

