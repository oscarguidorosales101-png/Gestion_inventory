import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';
import { Building2, Plus, Edit2, RefreshCw } from 'lucide-react';
import { ProveedorModal } from './ProveedorModal';

export const ProveedoresList = () => {
  const { user } = useAuth();
  const canEdit = [ROLES.ADMINISTRADOR, ROLES.COMPRAS].includes(user?.rol);

  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const res = await api.proveedores.getAll();
      setProveedores(res.data || []);
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  const handleCreate = () => {
    setEditingProveedor(null);
    setModalOpen(true);
  };

  const handleEdit = (p) => {
    setEditingProveedor(p);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} color="#15803D" />
            <div className="card-table-title">Directorio de Proveedores Homologados</div>
          </div>

          <div className="card-table-actions">
            <button className="btn btn-secondary btn-sm" onClick={cargarProveedores}>
              <RefreshCw size={14} />
            </button>
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={handleCreate}>
                <Plus size={14} />
                <span>Nuevo Proveedor</span>
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Razón Social</th>
                <th>Cédula Jurídica</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Correo Electrónico</th>
                <th>Tiempo Entrega (L)</th>
                <th>Calificación</th>
                <th>Estado</th>
                {canEdit && <th>Acción</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canEdit ? 10 : 9} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    Cargando proveedores...
                  </td>
                </tr>
              ) : proveedores.length > 0 ? (
                proveedores.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.codigo}</td>
                    <td>{p.razon_social}</td>
                    <td>{p.identificacion_fiscal}</td>
                    <td>{p.contacto_nombre}</td>
                    <td>{p.telefono}</td>
                    <td>{p.email}</td>
                    <td>{p.tiempo_entrega_dias} días</td>
                    <td>
                      <span className="badge badge-normal">★ {Number(p.calificacion).toFixed(1)}</span>
                    </td>
                    <td>
                      <span className={`badge ${p.activo ? 'badge-normal' : 'badge-critico'}`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(p)}>
                          <Edit2 size={13} />
                          <span>Editar</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canEdit ? 10 : 9} className="empty-state">
                    No se encontraron proveedores registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <ProveedorModal
          proveedor={editingProveedor}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            cargarProveedores();
          }}
        />
      )}
    </div>
  );
};

