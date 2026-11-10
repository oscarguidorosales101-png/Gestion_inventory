import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { ReglaConfiguracion } from '../types';
import { useAuth } from '../context/AuthContext';
import { Sliders, Edit, AlertCircle } from 'lucide-react';

export const ReglasView: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user && ['ADMINISTRADOR'].includes(user.rol);

  const [reglas, setReglas] = useState<ReglaConfiguracion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal editar regla
  const [reglaEditar, setReglaEditar] = useState<ReglaConfiguracion | null>(null);
  const [valorNum, setValorNum] = useState<number | string>('');
  const [valorTxt, setValorTxt] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargarReglas = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.reglas.getAll();
      setReglas(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar reglas de configuracion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReglas();
  }, []);

  const abrirEditar = (r: ReglaConfiguracion) => {
    setReglaEditar(r);
    setValorNum(r.valor_numerico !== null && r.valor_numerico !== undefined ? r.valor_numerico : '');
    setValorTxt(r.valor_texto || '');
    setFormError(null);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reglaEditar) return;
    setFormError(null);
    setGuardando(true);

    try {
      await api.reglas.update(reglaEditar.id, {
        valor_numerico: valorNum === '' ? null : Number(valorNum),
        valor_texto: valorTxt.trim() || null,
      });
      setReglaEditar(null);
      cargarReglas();
    } catch (err: any) {
      setFormError(err.message || 'Error guardando regla.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
            <Sliders size={18} />
            <span>
              Jerarquia de reglas de negocio: Especificas (MATERIAL/PROVEEDOR) prevalecen sobre CATEGORIA, y estas sobre configuraciones GLOBALES.
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Clave de Regla</th>
                <th>Ambito</th>
                <th>Entidad Asociada</th>
                <th>Valor Numerico</th>
                <th>Valor Texto</th>
                <th>Descripcion de Aplicacion</th>
                {canEdit && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                    Cargando reglas...
                  </td>
                </tr>
              ) : reglas.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No se encontraron reglas configuradas.
                  </td>
                </tr>
              ) : (
                reglas.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <code style={{ fontWeight: 700, color: '#0f172a' }}>{r.clave_regla}</code>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          r.ambito === 'GLOBAL'
                            ? 'badge-info'
                            : r.ambito === 'CATEGORIA'
                            ? 'badge-purple'
                            : 'badge-neutral'
                        }`}
                      >
                        {r.ambito}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {r.entidad_nombre ? (
                        <span>{r.entidad_nombre}</span>
                      ) : r.entidad_referencia_id ? (
                        <span>ID #{r.entidad_referencia_id}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>N/A (Global)</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {r.valor_numerico !== null && r.valor_numerico !== undefined
                        ? Number(r.valor_numerico).toLocaleString('es-CR')
                        : '-'}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{r.valor_texto || '-'}</td>
                    <td style={{ fontSize: '0.8rem', color: '#475569' }}>{r.descripcion || '-'}</td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => abrirEditar(r)} title="Editar valor de la regla">
                          <Edit size={13} />
                          <span>Editar</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Editar Regla */}
      {reglaEditar && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div className="modal-title">Parametrizar Regla de Negocio</div>
              <button className="modal-close" onClick={() => setReglaEditar(null)}>
                Ã—
              </button>
            </div>
            <form onSubmit={handleGuardar}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-banner alert-danger">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.82rem' }}>
                  <div><strong>Clave:</strong> {reglaEditar.clave_regla}</div>
                  <div><strong>Ambito:</strong> {reglaEditar.ambito}</div>
                  {reglaEditar.descripcion && <div style={{ marginTop: '4px', color: '#64748b' }}>{reglaEditar.descripcion}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Valor Numerico</label>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    value={valorNum}
                    onChange={(e) => setValorNum(e.target.value)}
                    disabled={guardando}
                    placeholder="Ej. 10.00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Valor Texto (opcional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={valorTxt}
                    onChange={(e) => setValorTxt(e.target.value)}
                    disabled={guardando}
                    placeholder="Texto complementario..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setReglaEditar(null)} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar Parametro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
