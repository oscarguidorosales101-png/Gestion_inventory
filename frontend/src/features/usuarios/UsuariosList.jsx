import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ROLES_LABELS } from '../../constants/roles';
import { formatFecha } from '../../utils/formatters';
import { Users, Plus, Edit2, RefreshCw, Power } from 'lucide-react';
import { UsuarioModal } from './UsuarioModal';

export const UsuariosList = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const res = await api.usuarios.getAll();
      setUsuarios(res.data || []);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleCreate = () => {
    setEditingUsuario(null);
    setModalOpen(true);
  };

  const handleEdit = (u) => {
    setEditingUsuario(u);
    setModalOpen(true);
  };

  const handleToggleActivo = async (u) => {
    const accion = u.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Confirma que desea ${accion} al usuario ${u.nombre}?`)) return;
    try {
      await api.usuarios.toggleActivo(u.id, !u.activo);
      await cargarUsuarios();
    } catch (err) {
      alert(err?.message || 'Error al cambiar estado del usuario.');
    }
  };

  return (
    <div>
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#15803D" />
            <div className="card-table-title">Gestión de Usuarios y Roles Institucionales</div>
          </div>

          <div className="card-table-actions">
            <button className="btn btn-secondary btn-sm" onClick={cargarUsuarios}>
              <RefreshCw size={14} />
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleCreate}>
              <Plus size={14} />
              <span>Nuevo Usuario</span>
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre Completo</th>
                <th>Correo Institucional</th>
                <th>Rol Asignado</th>
                <th>Estado</th>
                <th>Última Actualización</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    Cargando usuarios...
                  </td>
                </tr>
              ) : usuarios.length > 0 ? (
                usuarios.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>#{u.id}</td>
                    <td>{u.nombre}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge badge-normal">{ROLES_LABELS[u.rol] || u.rol}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.activo ? 'badge-normal' : 'badge-critico'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>{formatFecha(u.updated_at || u.created_at, true)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(u)}>
                          <Edit2 size={13} />
                          <span>Editar</span>
                        </button>
                        <button
                          className={`btn btn-sm ${u.activo ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => handleToggleActivo(u)}
                          title={u.activo ? 'Desactivar acceso' : 'Activar acceso'}
                        >
                          <Power size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No se encontraron usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <UsuarioModal
          usuario={editingUsuario}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            cargarUsuarios();
          }}
        />
      )}
    </div>
  );
};

