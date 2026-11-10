import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';
import { formatMoneda, formatNumero } from '../../utils/formatters';
import { Package, Plus, Search, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { MaterialModal } from './MaterialModal';

export const MaterialesList = () => {
  const { user } = useAuth();
  const canEdit = [ROLES.ADMINISTRADOR, ROLES.ENCARGADO_INVENTARIO].includes(user?.rol);

  const [materiales, setMateriales] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resMat, resCat, resProv] = await Promise.all([
        api.materiales.getAll({
          categoria_id: categoriaId ? Number(categoriaId) : undefined,
          search: search.trim() || undefined,
        }),
        api.categorias.getAll(),
        api.proveedores.getAll(),
      ]);
      setMateriales(resMat.data || []);
      setCategorias(resCat.data || []);
      setProveedores(resProv.data || []);
    } catch (err) {
      console.error('Error al cargar materiales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [categoriaId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    cargarDatos();
  };

  const handleOpenCreate = () => {
    setEditingMaterial(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (material) => {
    setEditingMaterial(material);
    setModalOpen(true);
  };

  const handleSuccessSave = () => {
    setModalOpen(false);
    cargarDatos();
  };

  return (
    <div>
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={20} color="#15803D" />
            <div className="card-table-title">Catálogo Maestro de Materiales de Obra</div>
          </div>

          <div className="card-table-actions">
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                style={{ width: '220px' }}
                placeholder="Buscar código o nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary btn-sm">
                <Search size={14} />
              </button>
            </form>

            <select
              className="form-select"
              style={{ width: '180px' }}
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">Todas las Categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>

            <button className="btn btn-secondary btn-sm" onClick={cargarDatos}>
              <RefreshCw size={14} />
            </button>

            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
                <Plus size={14} />
                <span>Nuevo Material</span>
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre del Material</th>
                <th>Categoría</th>
                <th>Unidad</th>
                <th>Costo (CRC)</th>
                <th>D. Prom (d)</th>
                <th>D. Máx (d)</th>
                <th>Lead Time (L)</th>
                <th>Stock Seguridad (SS)</th>
                <th>Punto Reorden (PR)</th>
                {canEdit && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canEdit ? 11 : 10} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    Cargando catálogo maestro...
                  </td>
                </tr>
              ) : materiales.length > 0 ? (
                materiales.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.codigo}</td>
                    <td>{m.nombre}</td>
                    <td>{m.categoria_nombre || '-'}</td>
                    <td><span className="badge badge-gray">{m.unidad_medida}</span></td>
                    <td style={{ fontWeight: 600 }}>{formatMoneda(m.costo_unitario_crc)}</td>
                    <td>{formatNumero(m.demanda_promedio_diaria)}</td>
                    <td>{formatNumero(m.demanda_maxima_diaria)}</td>
                    <td>{m.tiempo_entrega_dias} días</td>
                    <td style={{ fontWeight: 600, color: '#15803D' }}>{formatNumero(m.stock_seguridad)}</td>
                    <td style={{ fontWeight: 700, color: '#B45309' }}>{formatNumero(m.punto_reorden)}</td>
                    {canEdit && (
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(m)}
                          title="Modificar parámetros del material"
                        >
                          <Edit2 size={13} />
                          <span>Editar</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canEdit ? 11 : 10} className="empty-state">
                    No se encontraron materiales registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <MaterialModal
          material={editingMaterial}
          categorias={categorias}
          proveedores={proveedores}
          onClose={() => setModalOpen(false)}
          onSuccess={handleSuccessSave}
        />
      )}
    </div>
  );
};

