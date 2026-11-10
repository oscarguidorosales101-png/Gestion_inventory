import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';
import { formatTipoUbicacion } from '../../utils/formatters';
import { MapPin, Plus, Edit2, RefreshCw } from 'lucide-react';
import { UbicacionModal } from './UbicacionModal';

export const UbicacionesList = () => {
  const { user } = useAuth();
  const canEdit = [ROLES.ADMINISTRADOR, ROLES.ENCARGADO_INVENTARIO].includes(user?.rol);

  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUbicacion, setEditingUbicacion] = useState(null);

  const cargarUbicaciones = async () => {
    try {
      setLoading(true);
      const res = await api.ubicaciones.getAll();
      setUbicaciones(res.data || []);
    } catch (err) {
      console.error('Error al cargar ubicaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUbicaciones();
  }, []);

  const handleCreate = () => {
    setEditingUbicacion(null);
    setModalOpen(true);
  };

  const handleEdit = (ub) => {
    setEditingUbicacion(ub);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} color="#15803D" />
            <div className="card-table-title">Bodegas y Ubicaciones de Almacenamiento</div>
          </div>

          <div className="card-table-actions">
            <button className="btn btn-secondary btn-sm" onClick={cargarUbicaciones}>
              <RefreshCw size={14} />
            </button>
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={handleCreate}>
                <Plus size={14} />
                <span>Nueva Ubicación</span>
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre de la Bodega</th>
                <th>Tipo</th>
                <th>Responsable</th>
                <th>Dirección</th>
                <th>Estado</th>
                {canEdit && <th>Acción</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    Cargando ubicaciones...
                  </td>
                </tr>
              ) : ubicaciones.length > 0 ? (
                ubicaciones.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.codigo}</td>
                    <td>{u.nombre}</td>
                    <td><span className="badge badge-gray">{formatTipoUbicacion(u.tipo)}</span></td>
                    <td>{u.responsable}</td>
                    <td>{u.direccion}</td>
                    <td>
                      <span className={`badge ${u.activo ? 'badge-normal' : 'badge-critico'}`}>
                        {u.activo ? 'Operativa' : 'Inactiva'}
                      </span>
                    </td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(u)}>
                          <Edit2 size={13} />
                          <span>Editar</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="empty-state">
                    No se encontraron ubicaciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <UbicacionModal
          ubicacion={editingUbicacion}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            cargarUbicaciones();
          }}
        />
      )}
    </div>
  );
};

