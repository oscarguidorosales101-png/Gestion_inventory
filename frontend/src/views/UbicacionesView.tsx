import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Ubicacion } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Warehouse, AlertCircle, Package } from 'lucide-react';

export const UbicacionesView: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user && ['ADMINISTRADOR', 'ENCARGADO_INVENTARIO'].includes(user.rol);

  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stock por ubicacion modal
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<Ubicacion | null>(null);
  const [materialesEnUbicacion, setMaterialesEnUbicacion] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);

  // Form modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState<{
    codigo: string;
    nombre: string;
    tipo: 'BODEGA_CENTRAL' | 'ALMACEN_OBRA' | 'PATIO_MATERIALES' | 'TRANSITO';
    capacidad_m2: number;
    activo: boolean;
  }>({
    codigo: '',
    nombre: '',
    tipo: 'BODEGA_CENTRAL',
    capacidad_m2: 500,
    activo: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargarUbicaciones = async () => {
    try {
      setLoading(true);
      const res = await api.ubicaciones.getAll();
      setUbicaciones(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar ubicaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUbicaciones();
  }, []);

  const verStockUbicacion = async (u: Ubicacion) => {
    setUbicacionSeleccionada(u);
    setLoadingStock(true);
    try {
      const res = await api.ubicaciones.getStockPorUbicacion(u.id);
      setMaterialesEnUbicacion(res.data?.materiales || []);
    } catch (err: any) {
      alert('Error cargando existencias de la bodega: ' + err.message);
    } finally {
      setLoadingStock(false);
    }
  };

  const abrirModalCrear = () => {
    setEditId(null);
    setFormData({
      codigo: '',
      nombre: '',
      tipo: 'BODEGA_CENTRAL',
      capacidad_m2: 500,
      activo: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const abrirModalEditar = (u: Ubicacion) => {
    setEditId(u.id);
    setFormData({
      codigo: u.codigo,
      nombre: u.nombre,
      tipo: u.tipo,
      capacidad_m2: u.capacidad_m2 ? Number(u.capacidad_m2) : 0,
      activo: Boolean(u.activo),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      if (editId) {
        await api.ubicaciones.update(editId, formData);
      } else {
        await api.ubicaciones.create(formData);
      }
      setModalOpen(false);
      cargarUbicaciones();
    } catch (err: any) {
      setFormError(err.message || 'Error guardando ubicacion.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
            <Warehouse size={18} />
            <span>Red de almacenes, bodegas centrales y frentes de obra</span>
          </div>
          {canEdit && (
            <button className="btn btn-primary" onClick={abrirModalCrear}>
              <Plus size={16} />
              <span>Nueva Ubicacion</span>
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

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Nombre de Ubicacion</th>
                <th>Tipo</th>
                <th>Capacidad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>
                    Cargando ubicaciones...
                  </td>
                </tr>
              ) : ubicaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No hay ubicaciones registradas.
                  </td>
                </tr>
              ) : (
                ubicaciones.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.codigo}</strong>
                    </td>
                    <td>{u.nombre}</td>
                    <td>
                      <span className="badge badge-info">{u.tipo}</span>
                    </td>
                    <td>{u.capacidad_m2 ? `${Number(u.capacidad_m2).toLocaleString()} mÂ²` : '-'}</td>
                    <td>
                      <span className={`badge ${u.activo ? 'badge-normal' : 'badge-neutral'}`}>
                        {u.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => verStockUbicacion(u)}
                          title="Ver inventario en esta bodega"
                        >
                          <Package size={13} />
                          <span>Ver Stock</span>
                        </button>
                        {canEdit && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => abrirModalEditar(u)}
                            title="Editar"
                          >
                            <Edit size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Stock de Ubicacion */}
      {ubicacionSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <div className="modal-title">
                Materiales en {ubicacionSeleccionada.nombre} ({ubicacionSeleccionada.codigo})
              </div>
              <button className="modal-close" onClick={() => setUbicacionSeleccionada(null)}>
                Ã—
              </button>
            </div>
            <div className="modal-body">
              {loadingStock ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>Cargando inventario...</div>
              ) : materialesEnUbicacion.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                  No se registran existencias de ningun material en esta ubicacion.
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Material</th>
                      <th>Stock Fisico</th>
                      <th>Unidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialesEnUbicacion.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>{item.codigo_sku}</strong>
                        </td>
                        <td>{item.material_nombre}</td>
                        <td style={{ fontWeight: 700 }}>{Number(item.stock).toLocaleString('es-CR')}</td>
                        <td>{item.unidad_medida}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setUbicacionSeleccionada(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <div className="modal-title">{editId ? 'Editar Ubicacion' : 'Nueva Ubicacion'}</div>
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
                  <label className="form-label">Codigo *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    required
                    disabled={saving}
                    placeholder="BOD-01"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre de Ubicacion *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    disabled={saving}
                    placeholder="Almacen Central de Materiales"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Tipo de Ubicacion *</label>
                    <select
                      className="form-control"
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                      disabled={saving}
                    >
                      <option value="BODEGA_CENTRAL">Bodega Central</option>
                      <option value="ALMACEN_OBRA">Almacen de Obra</option>
                      <option value="PATIO_MATERIALES">Patio de Materiales</option>
                      <option value="TRANSITO">En Transito</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Capacidad Estimada (mÂ²)</label>
                    <input
                      type="number"
                      step="1"
                      className="form-control"
                      value={formData.capacidad_m2}
                      onChange={(e) => setFormData({ ...formData, capacidad_m2: Number(e.target.value) })}
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="ubiActivo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    disabled={saving}
                  />
                  <label htmlFor="ubiActivo" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                    Ubicacion Habilitada para Operaciones
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
