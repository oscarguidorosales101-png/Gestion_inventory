import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Proveedor } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Truck, AlertCircle, Mail, Phone } from 'lucide-react';

export const ProveedoresView: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user && ['ADMINISTRADOR', 'COMPRAS'].includes(user.rol);

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre_comercial: '',
    razon_social: '',
    identificacion_tributaria: '',
    correo: '',
    telefono: '',
    direccion: '',
    activo: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const res = await api.proveedores.getAll();
      setProveedores(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar proveedores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  const abrirModalCrear = () => {
    setEditId(null);
    setFormData({
      codigo: '',
      nombre_comercial: '',
      razon_social: '',
      identificacion_tributaria: '',
      correo: '',
      telefono: '',
      direccion: '',
      activo: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const abrirModalEditar = (p: Proveedor) => {
    setEditId(p.id);
    setFormData({
      codigo: p.codigo,
      nombre_comercial: p.nombre_comercial,
      razon_social: p.razon_social || '',
      identificacion_tributaria: p.identificacion_tributaria,
      correo: p.correo,
      telefono: p.telefono || '',
      direccion: p.direccion || '',
      activo: Boolean(p.activo),
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
        await api.proveedores.update(editId, formData);
      } else {
        await api.proveedores.create(formData);
      }
      setModalOpen(false);
      cargarProveedores();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar proveedor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
            <Truck size={18} />
            <span>Proveedores homologados para ordenes de compra</span>
          </div>
          {canEdit && (
            <button className="btn btn-primary" onClick={abrirModalCrear}>
              <Plus size={16} />
              <span>Nuevo Proveedor</span>
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
                <th>Nombre Comercial</th>
                <th>Id. Tributaria</th>
                <th>Contacto</th>
                <th>Direccion</th>
                <th>Estado</th>
                {canEdit && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                    Cargando proveedores...
                  </td>
                </tr>
              ) : proveedores.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No hay proveedores registrados.
                  </td>
                </tr>
              ) : (
                proveedores.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.codigo}</strong>
                    </td>
                    <td>
                      <div>{p.nombre_comercial}</div>
                      {p.razon_social && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.razon_social}</div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.identificacion_tributaria}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                        <Mail size={12} color="#64748b" />
                        <span>{p.correo}</span>
                      </div>
                      {p.telefono && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                          <Phone size={12} />
                          <span>{p.telefono}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#475569' }}>{p.direccion || '-'}</td>
                    <td>
                      <span className={`badge ${p.activo ? 'badge-normal' : 'badge-neutral'}`}>
                        {p.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => abrirModalEditar(p)}>
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
              <div className="modal-title">{editId ? 'Editar Proveedor' : 'Registrar Proveedor'}</div>
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
                    <label className="form-label">Codigo *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      required
                      disabled={saving}
                      placeholder="PRV-001"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nombre Comercial *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.nombre_comercial}
                      onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
                      required
                      disabled={saving}
                      placeholder="Cemex Costa Rica"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Id. Tributaria / Cedula Juridica *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.identificacion_tributaria}
                      onChange={(e) => setFormData({ ...formData, identificacion_tributaria: e.target.value })}
                      required
                      disabled={saving}
                      placeholder="3-101-123456"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Razon Social</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.razon_social}
                      onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Correo Electronico *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.correo}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                      required
                      disabled={saving}
                      placeholder="ventas@proveedor.cr"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telefono</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      disabled={saving}
                      placeholder="+506 2200-0000"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Direccion</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    disabled={saving}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="prvActivo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    disabled={saving}
                  />
                  <label htmlFor="prvActivo" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                    Proveedor Homologado y Activo
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
