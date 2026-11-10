import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Material, Categoria } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, Search, Calculator, AlertCircle } from 'lucide-react';

export const MaterialesView: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user && ['ADMINISTRADOR', 'ENCARGADO_INVENTARIO'].includes(user.rol);

  const [materiales, setMateriales] = useState<Material[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Form Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    codigo_sku: '',
    nombre: '',
    categoria_id: 1,
    unidad_medida: 'UNIDAD',
    demanda_diaria_promedio: 10,
    demanda_diaria_maxima: 15,
    tiempo_entrega_dias: 5,
    costo_unitario_crc: 100,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resMat, resCat] = await Promise.all([
        api.materiales.getAll({ search: search || undefined }),
        api.categorias.getAll(),
      ]);
      setMateriales(resMat.data || []);
      setCategorias(resCat.data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar materiales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirModalCrear = () => {
    setEditId(null);
    setFormData({
      codigo_sku: '',
      nombre: '',
      categoria_id: categorias[0]?.id || 1,
      unidad_medida: 'UNIDAD',
      demanda_diaria_promedio: 10,
      demanda_diaria_maxima: 15,
      tiempo_entrega_dias: 5,
      costo_unitario_crc: 100,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const abrirModalEditar = (m: Material) => {
    setEditId(m.id);
    setFormData({
      codigo_sku: m.codigo_sku,
      nombre: m.nombre,
      categoria_id: m.categoria_id,
      unidad_medida: m.unidad_medida,
      demanda_diaria_promedio: Number(m.demanda_diaria_promedio),
      demanda_diaria_maxima: Number(m.demanda_diaria_maxima),
      tiempo_entrega_dias: Number(m.tiempo_entrega_dias),
      costo_unitario_crc: Number(m.costo_unitario_crc),
    });
    setFormError(null);
    setModalOpen(true);
  };

  // Calculo en tiempo real para previsualizacion de formulas
  const dProm = Number(formData.demanda_diaria_promedio) || 0;
  const dMax = Number(formData.demanda_diaria_maxima) || 0;
  const leadTime = Number(formData.tiempo_entrega_dias) || 0;

  const ssPreview = dMax >= dProm && leadTime >= 1 ? (dMax - dProm) * leadTime : 0;
  const prPreview = dMax >= dProm && leadTime >= 1 ? dProm * leadTime + ssPreview : 0;
  const hasFormulaError = dMax < dProm || leadTime < 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (dMax < dProm) {
      setFormError('La demanda maxima debe ser mayor o igual a la demanda promedio.');
      return;
    }
    if (leadTime < 1) {
      setFormError('El tiempo de entrega (L) debe ser de al menos 1 dia.');
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await api.materiales.update(editId, formData);
      } else {
        await api.materiales.create(formData);
      }
      setModalOpen(false);
      cargarDatos();
    } catch (err: any) {
      setFormError(err.message || 'Error guardando material.');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('Â¿Esta seguro de desactivar este material?')) return;
    try {
      await api.materiales.delete(id);
      cargarDatos();
    } catch (err: any) {
      alert('Error al desactivar material: ' + err.message);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px 20px' }}>
          <div className="toolbar" style={{ margin: 0 }}>
            <div className="search-input-wrap">
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Buscar por SKU o Nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && cargarDatos()}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-outline" onClick={cargarDatos}>
                Buscar
              </button>
              {canEdit && (
                <button className="btn btn-primary" onClick={abrirModalCrear}>
                  <Plus size={16} />
                  <span>Nuevo Material</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabla de Materiales */}
      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nombre del Material</th>
                <th>Categoria</th>
                <th>Unidad</th>
                <th>D. Prom (dia)</th>
                <th>D. Max (dia)</th>
                <th>Lead Time (L)</th>
                <th>SS Calc.</th>
                <th>PR Calc.</th>
                <th>Costo CRC</th>
                {canEdit && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '30px' }}>
                    Cargando materiales...
                  </td>
                </tr>
              ) : materiales.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No hay materiales registrados.
                  </td>
                </tr>
              ) : (
                materiales.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.codigo_sku}</strong>
                    </td>
                    <td>{m.nombre}</td>
                    <td>{m.categoria_nombre || '-'}</td>
                    <td>{m.unidad_medida}</td>
                    <td>{Number(m.demanda_diaria_promedio).toFixed(2)}</td>
                    <td>{Number(m.demanda_diaria_maxima).toFixed(2)}</td>
                    <td>{m.tiempo_entrega_dias} dias</td>
                    <td style={{ fontWeight: 600, color: '#15803d' }}>
                      {Number(m.stock_seguridad_calculado).toFixed(2)}
                    </td>
                    <td style={{ fontWeight: 600, color: '#0369a1' }}>
                      {Number(m.punto_reorden_calculado).toFixed(2)}
                    </td>
                    <td>â‚¡{Number(m.costo_unitario_crc).toLocaleString('es-CR', { minimumFractionDigits: 2 })}</td>
                    {canEdit && (
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => abrirModalEditar(m)}
                            title="Editar parametros"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: '#dc2626' }}
                            onClick={() => handleEliminar(m.id)}
                            title="Desactivar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Material */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div className="modal-title">
                {editId ? 'Editar Parametros de Material' : 'Registrar Nuevo Material'}
              </div>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Codigo SKU *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.codigo_sku}
                      onChange={(e) => setFormData({ ...formData, codigo_sku: e.target.value })}
                      required
                      placeholder="MAT-001"
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nombre del Material *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                      placeholder="Cemento Portland Tipo I"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Categoria *</label>
                    <select
                      className="form-control"
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({ ...formData, categoria_id: Number(e.target.value) })}
                      disabled={saving}
                    >
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unidad de Medida *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.unidad_medida}
                      onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value })}
                      required
                      placeholder="SACO, KG, M3"
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Costo Unitario (â‚¡ CRC) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.costo_unitario_crc}
                      onChange={(e) => setFormData({ ...formData, costo_unitario_crc: Number(e.target.value) })}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '10px', paddingTop: '14px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Calculator size={16} />
                    <span>Parametros de Demanda y Calculo Automatico de Reorden</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Demanda Promedio (Dprom) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={formData.demanda_diaria_promedio}
                        onChange={(e) => setFormData({ ...formData, demanda_diaria_promedio: Number(e.target.value) })}
                        required
                        disabled={saving}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Demanda Maxima (Dmax) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={formData.demanda_diaria_maxima}
                        onChange={(e) => setFormData({ ...formData, demanda_diaria_maxima: Number(e.target.value) })}
                        required
                        disabled={saving}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Tiempo Entrega (L dias) *</label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        className="form-control"
                        value={formData.tiempo_entrega_dias}
                        onChange={(e) => setFormData({ ...formData, tiempo_entrega_dias: Number(e.target.value) })}
                        required
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* Previsualizacion de formulas */}
                  <div
                    style={{
                      backgroundColor: hasFormulaError ? '#fef2f2' : '#f0fdf4',
                      border: `1px solid ${hasFormulaError ? '#fecaca' : '#bbf7d0'}`,
                      borderRadius: '6px',
                      padding: '12px',
                      marginTop: '6px',
                    }}
                  >
                    {hasFormulaError ? (
                      <div style={{ color: '#991b1b', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={16} />
                        <span>Verifique que Dmax sea mayor o igual a Dprom y que L sea al menos 1 para calcular el reorden.</span>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem' }}>
                        <div>
                          <div style={{ color: '#166534', fontWeight: 600 }}>Stock de Seguridad (SS):</div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#14532d' }}>
                            {ssPreview.toFixed(2)} {formData.unidad_medida}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>
                            Formula: (Dmax - Dprom) Ã— L = ({dMax} - {dProm}) Ã— {leadTime}
                          </div>
                        </div>

                        <div>
                          <div style={{ color: '#166534', fontWeight: 600 }}>Punto de Reorden (PR):</div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0369a1' }}>
                            {prPreview.toFixed(2)} {formData.unidad_medida}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>
                            Formula: (Dprom Ã— L) + SS = ({dProm} Ã— {leadTime}) + {ssPreview.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving || hasFormulaError}>
                  {saving ? 'Guardando...' : editId ? 'Actualizar Material' : 'Registrar Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
