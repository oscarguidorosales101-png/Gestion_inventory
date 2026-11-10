import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Movimiento, Material, Ubicacion, TipoMovimiento } from '../types';
import { useAuth } from '../context/AuthContext';
import { ArrowLeftRight, Plus, AlertCircle, Filter, ArrowRight } from 'lucide-react';

export const MovimientosView: React.FC = () => {
  const { user } = useAuth();
  const canRegister = user && ['ADMINISTRADOR', 'ENCARGADO_INVENTARIO'].includes(user.rol);

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroMaterial, setFiltroMaterial] = useState<number | undefined>();
  const [filtroUbicacion, setFiltroUbicacion] = useState<number | undefined>();

  // Modal registrar movimiento manual
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<{
    tipo_movimiento: TipoMovimiento;
    material_id: number;
    ubicacion_origen_id?: number | null;
    ubicacion_destino_id?: number | null;
    cantidad: number;
    motivo: string;
  }>({
    tipo_movimiento: 'SALIDA_PROYECTO',
    material_id: 1,
    ubicacion_origen_id: 1,
    ubicacion_destino_id: null,
    cantidad: 10,
    motivo: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resMov, resMat, resUbi] = await Promise.all([
        api.movimientos.getAll({
          tipo: filtroTipo || undefined,
          material_id: filtroMaterial,
          ubicacion_id: filtroUbicacion,
        }),
        api.materiales.getAll(),
        api.ubicaciones.getAll(),
      ]);
      setMovimientos(resMov.data || []);
      setMateriales(resMat.data || []);
      setUbicaciones(resUbi.data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar libro mayor de movimientos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroTipo, filtroMaterial, filtroUbicacion]);

  const abrirModal = () => {
    setFormData({
      tipo_movimiento: 'SALIDA_PROYECTO',
      material_id: materiales[0]?.id || 1,
      ubicacion_origen_id: ubicaciones[0]?.id || 1,
      ubicacion_destino_id: null,
      cantidad: 10,
      motivo: '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleTipoChange = (tipo: TipoMovimiento) => {
    let origen = formData.ubicacion_origen_id;
    let destino = formData.ubicacion_destino_id;

    if (tipo === 'SALIDA_PROYECTO' || tipo === 'AJUSTE_NEGATIVO') {
      origen = ubicaciones[0]?.id || 1;
      destino = null;
    } else if (tipo === 'TRANSFERENCIA') {
      origen = ubicaciones[0]?.id || 1;
      destino = ubicaciones[1]?.id || ubicaciones[0]?.id || 1;
    } else if (tipo === 'AJUSTE_POSITIVO') {
      origen = null;
      destino = ubicaciones[0]?.id || 1;
    }

    setFormData({
      ...formData,
      tipo_movimiento: tipo,
      ubicacion_origen_id: origen,
      ubicacion_destino_id: destino,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formData.cantidad <= 0) {
      setFormError('La cantidad debe ser mayor a 0.');
      return;
    }

    if (formData.tipo_movimiento === 'TRANSFERENCIA' && formData.ubicacion_origen_id === formData.ubicacion_destino_id) {
      setFormError('La bodega de origen y de destino no pueden ser la misma en una transferencia.');
      return;
    }

    if (!formData.motivo.trim()) {
      setFormError('Debe ingresar un motivo o justificacion para registrar el movimiento en el libro mayor.');
      return;
    }

    setSaving(true);
    try {
      await api.movimientos.registrar(formData);
      setModalOpen(false);
      cargarDatos();
    } catch (err: any) {
      setFormError(err.message || 'Error al asentar movimiento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Barra de Filtros */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem' }}>
              <Filter size={16} />
              <span>Filtros:</span>
            </div>

            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos los Tipos</option>
              <option value="ENTRADA_COMPRA">Entrada por Compra</option>
              <option value="SALIDA_PROYECTO">Salida a Proyecto</option>
              <option value="TRANSFERENCIA">Transferencia entre Bodegas</option>
              <option value="AJUSTE_POSITIVO">Ajuste Positivo</option>
              <option value="AJUSTE_NEGATIVO">Ajuste Negativo</option>
            </select>

            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={filtroMaterial || ''}
              onChange={(e) => setFiltroMaterial(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Todos los Materiales</option>
              {materiales.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.codigo_sku} - {m.nombre}
                </option>
              ))}
            </select>

            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={filtroUbicacion || ''}
              onChange={(e) => setFiltroUbicacion(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Todas las Bodegas</option>
              {ubicaciones.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.codigo})
                </option>
              ))}
            </select>
          </div>

          {canRegister && (
            <button className="btn btn-primary" onClick={abrirModal}>
              <Plus size={16} />
              <span>Registrar Movimiento Manual</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabla del Libro Mayor */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ArrowLeftRight size={18} />
            <span>Libro Mayor de Movimientos ({movimientos.length} asientos inmutables)</span>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Asiento #</th>
                <th>Fecha y Hora</th>
                <th>Tipo</th>
                <th>Material</th>
                <th>Cantidad</th>
                <th>Ruta (Origen â†’ Destino)</th>
                <th>Snapshot Existencias</th>
                <th>Motivo / Justificacion</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px' }}>
                    Cargando libro mayor...
                  </td>
                </tr>
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No se registran movimientos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                movimientos.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>#{m.id}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {new Date(m.created_at).toLocaleDateString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          m.tipo_movimiento.startsWith('ENTRADA')
                            ? 'badge-normal'
                            : m.tipo_movimiento.startsWith('SALIDA')
                            ? 'badge-purple'
                            : m.tipo_movimiento === 'TRANSFERENCIA'
                            ? 'badge-info'
                            : 'badge-neutral'
                        }`}
                      >
                        {m.tipo_movimiento}
                      </span>
                    </td>
                    <td>
                      <strong>{m.material_sku}</strong>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{m.material_nombre}</div>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>{Number(m.cantidad).toLocaleString('es-CR')}</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {m.ubicacion_origen_nombre || 'PROVEEDOR / EXTERNO'}{' '}
                      <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} />{' '}
                      {m.ubicacion_destino_nombre || 'PROYECTO / MERMA'}
                    </td>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {m.stock_anterior_origen !== null && m.stock_anterior_origen !== undefined && (
                        <div>
                          Orig: {m.stock_anterior_origen} â†’ {m.stock_nuevo_origen}
                        </div>
                      )}
                      {m.stock_anterior_destino !== null && m.stock_anterior_destino !== undefined && (
                        <div>
                          Dest: {m.stock_anterior_destino} â†’ {m.stock_nuevo_destino}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {m.motivo}
                      {m.numero_orden && <div style={{ fontSize: '0.7rem', color: '#15803d' }}>Ref: {m.numero_orden}</div>}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{m.usuario_nombre || `Usuario #${m.usuario_id}`}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Movimiento */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div className="modal-title">Registrar Movimiento en Libro Mayor</div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                Ã—
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-banner alert-danger">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Tipo de Operacion *</label>
                  <select
                    className="form-control"
                    value={formData.tipo_movimiento}
                    onChange={(e) => handleTipoChange(e.target.value as TipoMovimiento)}
                    disabled={saving}
                  >
                    <option value="SALIDA_PROYECTO">Salida de Material a Frente de Obra</option>
                    <option value="TRANSFERENCIA">Transferencia entre Bodegas</option>
                    <option value="AJUSTE_POSITIVO">Ajuste de Entrada (Inventario Fisico Mayor)</option>
                    <option value="AJUSTE_NEGATIVO">Ajuste de Salida (Merma / Descuadre)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Material Involucrado *</label>
                    <select
                      className="form-control"
                      value={formData.material_id}
                      onChange={(e) => setFormData({ ...formData, material_id: Number(e.target.value) })}
                      disabled={saving}
                    >
                      {materiales.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.codigo_sku} - {m.nombre} ({m.unidad_medida})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cantidad *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-control"
                      value={formData.cantidad}
                      onChange={(e) => setFormData({ ...formData, cantidad: Number(e.target.value) })}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Ubicaciones segun tipo */}
                {(formData.tipo_movimiento === 'SALIDA_PROYECTO' ||
                  formData.tipo_movimiento === 'TRANSFERENCIA' ||
                  formData.tipo_movimiento === 'AJUSTE_NEGATIVO') && (
                  <div className="form-group">
                    <label className="form-label">Bodega / Ubicacion de Origen *</label>
                    <select
                      className="form-control"
                      value={formData.ubicacion_origen_id || ''}
                      onChange={(e) => setFormData({ ...formData, ubicacion_origen_id: Number(e.target.value) })}
                      disabled={saving}
                    >
                      {ubicaciones.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} ({u.codigo})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(formData.tipo_movimiento === 'TRANSFERENCIA' || formData.tipo_movimiento === 'AJUSTE_POSITIVO') && (
                  <div className="form-group">
                    <label className="form-label">Bodega / Ubicacion de Destino *</label>
                    <select
                      className="form-control"
                      value={formData.ubicacion_destino_id || ''}
                      onChange={(e) => setFormData({ ...formData, ubicacion_destino_id: Number(e.target.value) })}
                      disabled={saving}
                    >
                      {ubicaciones.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} ({u.codigo})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Motivo o Justificacion Obligatoria *</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                    placeholder="Especifique el proyecto, orden de trabajo, acta de conteo fisico o justificacion..."
                    required
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Asentando...' : 'Asentar en Libro Mayor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
