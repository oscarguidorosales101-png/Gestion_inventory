import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Categoria } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Tags, AlertCircle } from 'lucide-react';

export const CategoriasView: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user && ['ADMINISTRADOR', 'ENCARGADO_INVENTARIO'].includes(user.rol);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    activo: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const res = await api.categorias.getAll();
      setCategorias(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar categorias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  const abrirModalCrear = () => {
    setEditId(null);
    setFormData({ codigo: '', nombre: '', descripcion: '', activo: true });
    setFormError(null);
    setModalOpen(true);
  };

  const abrirModalEditar = (c: Categoria) => {
    setEditId(c.id);
    setFormData({
      codigo: c.codigo,
      nombre: c.nombre,
      descripcion: c.descripcion || '',
      activo: Boolean(c.activo),
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
        await api.categorias.update(editId, formData);
      } else {
        await api.categorias.create(formData);
      }
      setModalOpen(false);
      cargarCategorias();
    } catch (err: any) {
      setFormError(err.message || 'Error guardando categoria.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
            <Tags size={18} />
            <span>Clasificacion estructural de insumos y materiales</span>
          </div>
          {canEdit && (
            <button className="btn btn-primary" onClick={abrirModalCrear}>
              <Plus size={16} />
              <span>Nueva Categoria</span>
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
                <th>Nombre</th>
                <th>Descripcion</th>
                <th>Total Materiales</th>
                <th>Estado</th>
                {canEdit && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>
                    Cargando categorias...
                  </td>
                </tr>
              ) : categorias.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No hay categorias registradas.
                  </td>
                </tr>
              ) : (
                categorias.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.codigo}</strong>
                    </td>
                    <td>{c.nombre}</td>
                    <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{c.descripcion || '-'}</td>
                    <td>
                      <span className="badge badge-info">{c.total_materiales || 0} items</span>
                    </td>
                    <td>
                      <span className={`badge ${c.activo ? 'badge-normal' : 'badge-neutral'}`}>
                        {c.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => abrirModalEditar(c)}>
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

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <div className="modal-title">{editId ? 'Editar Categoria' : 'Crear Categoria'}</div>
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
                    placeholder="CAT-01"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    disabled={saving}
                    placeholder="Conglomerantes y Aridos"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripcion</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    disabled={saving}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="catActivo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    disabled={saving}
                  />
                  <label htmlFor="catActivo" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                    Categoria Activa
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
