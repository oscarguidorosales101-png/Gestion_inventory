import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';
import { Tags, Plus, Edit2, RefreshCw } from 'lucide-react';
import { CategoriaModal } from './CategoriaModal';

export const CategoriasList = () => {
  const { user } = useAuth();
  const canEdit = [ROLES.ADMINISTRADOR, ROLES.ENCARGADO_INVENTARIO].includes(user?.rol);

  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState(null);

  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const res = await api.categorias.getAll();
      setCategorias(res.data || []);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  const handleCreate = () => {
    setEditingCategoria(null);
    setModalOpen(true);
  };

  const handleEdit = (cat) => {
    setEditingCategoria(cat);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tags size={20} color="#15803D" />
            <div className="card-table-title">Categorías de Materiales y Tipos de Gasto</div>
          </div>

          <div className="card-table-actions">
            <button className="btn btn-secondary btn-sm" onClick={cargarCategorias}>
              <RefreshCw size={14} />
            </button>
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={handleCreate}>
                <Plus size={14} />
                <span>Nueva Categoría</span>
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Tipo de Gasto</th>
                <th>Descripción</th>
                <th>Estado</th>
                {canEdit && <th>Acción</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    Cargando categorías...
                  </td>
                </tr>
              ) : categorias.length > 0 ? (
                categorias.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.codigo}</td>
                    <td>{c.nombre}</td>
                    <td><span className="badge badge-gray">{c.tipo_gasto}</span></td>
                    <td style={{ color: '#64748B' }}>{c.descripcion || '-'}</td>
                    <td>
                      <span className={`badge ${c.activo ? 'badge-normal' : 'badge-critico'}`}>
                        {c.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(c)}>
                          <Edit2 size={13} />
                          <span>Editar</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="empty-state">
                    No se encontraron categorías registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <CategoriaModal
          categoria={editingCategoria}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            cargarCategorias();
          }}
        />
      )}
    </div>
  );
};

