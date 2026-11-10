import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Usuario, RolUsuario } from '../types';
import { Users, Plus, Edit, UserCheck, UserX, AlertCircle } from 'lucide-react';

export const UsuariosView: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Crear / Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'CONSULTA' as RolUsuario,
    password: '',
    activo: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.usuarios.getAll();
      setUsuarios(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const abrirModalCrear = () => {
    setEditId(null);
    setFormData({
      nombre: '',
      email: '',
      rol: 'CONSULTA',
      password: '',
      activo: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const abrirModalEditar = (u: Usuario) => {
    setEditId(u.id);
    setFormData({
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      password: '',
      activo: Boolean(u.activo),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleToggleEstado = async (u: Usuario) => {
    const nuevoEstado = !Boolean(u.activo);
    if (!confirm(`Â¿Desea cambiar el estado de ${u.nombre} a ${nuevoEstado ? 'ACTIVO' : 'INACTIVO'}?`)) {
      return;
    }
    try {
      await api.usuarios.toggleActivo(u.id, nuevoEstado);
      cargarUsuarios();
    } catch (err: any) {
      alert('Error cambiando estado de usuario: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!editId && (!formData.password || formData.password.length < 8)) {
      setFormError('La contraseÃ±a inicial debe tener al menos 8 caracteres.');
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await api.usuarios.update(editId, {
          nombre: formData.nombre,
          rol: formData.rol,
          activo: formData.activo,
        });
      } else {
        await api.usuarios.create(formData);
      }
      setModalOpen(false);
      cargarUsuarios();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar usuario.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
            <Users size={18} />
            <span>Control de Cuentas de Acceso y Matriz de Roles (RBAC)</span>
          </div>

          <button className="btn btn-primary" onClick={abrirModalCrear}>
            <Plus size={16} />
            <span>Nuevo Usuario</span>
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
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre Completo</th>
                <th>Correo Electronico</th>
                <th>Rol Asignado</th>
                <th>Estado</th>
                <th>Ultimo Acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                    Cargando usuarios...
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td>
                      <strong>{u.nombre}</strong>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span
                        className={`badge ${
                          u.rol === 'ADMINISTRADOR'
                            ? 'badge-purple'
                            : u.rol === 'ENCARGADO_INVENTARIO'
                            ? 'badge-normal'
                            : u.rol === 'COMPRAS'
                            ? 'badge-info'
                            : 'badge-neutral'
                        }`}
                      >
                        {u.rol}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.activo ? 'badge-normal' : 'badge-critico'}`}>
                        {u.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {u.ultimo_login ? new Date(u.ultimo_login).toLocaleDateString('es-CR', { hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => abrirModalEditar(u)} title="Editar datos y rol">
                          <Edit size={13} />
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: u.activo ? '#dc2626' : '#15803d' }}
                          onClick={() => handleToggleEstado(u)}
                          title={u.activo ? 'Desactivar usuario' : 'Reactivar usuario'}
                        >
                          {u.activo ? <UserX size={13} /> : <UserCheck size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div className="modal-title">{editId ? 'Editar Usuario' : 'Registrar Usuario'}</div>
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
                  <label className="form-label">Nombre Completo *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    disabled={saving}
                    placeholder="Juan Perez"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electronico *</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={saving || !!editId}
                    placeholder="usuario@empresaficticiapendiente.cr"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rol en el Sistema *</label>
                  <select
                    className="form-control"
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value as RolUsuario })}
                    disabled={saving}
                  >
                    <option value="CONSULTA">Consulta (Solo Lectura / Auditoria)</option>
                    <option value="COMPRAS">Compras (Creacion y envio de pedidos)</option>
                    <option value="ENCARGADO_INVENTARIO">Encargado de Inventario (Recepciones, stock, Nivel 1 y 2)</option>
                    <option value="ADMINISTRADOR">Administrador (Acceso total y Nivel 3)</option>
                  </select>
                </div>

                {!editId && (
                  <div className="form-group">
                    <label className="form-label">ContraseÃ±a Inicial (min. 8 caracteres) *</label>
                    <input
                      type="password"
                      className="form-control"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      disabled={saving}
                    />
                  </div>
                )}

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="usrActivo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    disabled={saving}
                  />
                  <label htmlFor="usrActivo" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                    Cuenta de Usuario Habilitada
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
