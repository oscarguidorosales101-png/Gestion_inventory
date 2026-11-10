import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Material, Categoria, MaterialStockDesglose } from '../types';
import { Search, Warehouse, AlertCircle, RefreshCw, Layers } from 'lucide-react';

export const InventarioView: React.FC = () => {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState<number | undefined>();
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Modal desglose ubicaciones
  const [materialSeleccionado, setMaterialSeleccionado] = useState<Material | null>(null);
  const [desgloseUbicaciones, setDesgloseUbicaciones] = useState<MaterialStockDesglose[]>([]);
  const [loadingDesglose, setLoadingDesglose] = useState(false);

  const cargarInventario = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resStock, resCats] = await Promise.all([
        api.inventario.getStockGlobal({
          categoria_id: filtroCategoria,
          estado_stock: filtroEstado || undefined,
          search: search || undefined,
        }),
        api.categorias.getAll(),
      ]);
      setMateriales(resStock.data || []);
      setCategorias(resCats.data || []);
    } catch (err: any) {
      setError(err.message || 'Error al obtener existencias de inventario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarInventario();
  }, [filtroCategoria, filtroEstado]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    cargarInventario();
  };

  const verDesglose = async (m: Material) => {
    setMaterialSeleccionado(m);
    setLoadingDesglose(true);
    try {
      const res = await api.inventario.getDesgloseUbicaciones(m.id);
      setDesgloseUbicaciones(res.data?.ubicaciones || []);
    } catch (err: any) {
      alert('Error cargando desglose por ubicacion: ' + err.message);
    } finally {
      setLoadingDesglose(false);
    }
  };

  return (
    <div>
      {/* Barra de Filtros */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px 20px' }}>
          <div className="toolbar" style={{ margin: 0 }}>
            <form onSubmit={handleSearchSubmit} className="search-input-wrap">
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Buscar por SKU o Nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="form-control"
                style={{ width: 'auto' }}
                value={filtroCategoria || ''}
                onChange={(e) => setFiltroCategoria(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Todas las Categorias</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>

              <select
                className="form-control"
                style={{ width: 'auto' }}
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos los Estados</option>
                <option value="NORMAL">Normal</option>
                <option value="REORDEN">Punto de Reorden</option>
                <option value="STOCK_CRITICO">Stock Critico</option>
              </select>

              <button className="btn btn-outline" onClick={cargarInventario} title="Actualizar datos">
                <RefreshCw size={14} />
                <span>Refrescar</span>
              </button>
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

      {/* Tabla de Existencias */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Layers size={18} />
            <span>Existencias Agregadas ({materiales.length} materiales)</span>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Material</th>
                <th>Categoria</th>
                <th>Unidad</th>
                <th>Stock Actual</th>
                <th>Stock Seg. (SS)</th>
                <th>Punto Reorden (PR)</th>
                <th>Costo Unit. (CRC)</th>
                <th>Valor Total (CRC)</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Calculando existencias en tiempo real...
                  </td>
                </tr>
              ) : materiales.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No se encontraron materiales que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                materiales.map((m) => {
                  const stock = Number(m.stock_actual || 0);
                  const valorTotal = stock * Number(m.costo_unitario_crc || 0);
                  return (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.codigo_sku}</strong>
                      </td>
                      <td>{m.nombre}</td>
                      <td>{m.categoria_nombre || '-'}</td>
                      <td>{m.unidad_medida}</td>
                      <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {stock.toLocaleString('es-CR')}
                      </td>
                      <td style={{ color: '#475569' }}>
                        {Number(m.stock_seguridad_calculado).toLocaleString('es-CR')}
                      </td>
                      <td style={{ color: '#475569' }}>
                        {Number(m.punto_reorden_calculado).toLocaleString('es-CR')}
                      </td>
                      <td>
                        â‚¡{Number(m.costo_unitario_crc).toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        â‚¡{valorTotal.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            m.estado_stock === 'NORMAL'
                              ? 'badge-normal'
                              : m.estado_stock === 'REORDEN'
                              ? 'badge-reorden'
                              : 'badge-critico'
                          }`}
                        >
                          {m.estado_stock}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => verDesglose(m)}
                          title="Ver existencias por bodega"
                        >
                          <Warehouse size={13} />
                          <span>Por Bodega</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Desglose por Bodega */}
      {materialSeleccionado && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <div className="modal-title">
                <Warehouse size={18} style={{ display: 'inline', marginRight: '6px' }} />
                <span>
                  Existencias por Ubicacion: {materialSeleccionado.nombre} ({materialSeleccionado.codigo_sku})
                </span>
              </div>
              <button className="modal-close" onClick={() => setMaterialSeleccionado(null)}>
                Ã—
              </button>
            </div>
            <div className="modal-body">
              {loadingDesglose ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>Cargando desglose...</div>
              ) : desgloseUbicaciones.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                  No se registran existencias de este material en ninguna ubicacion activa.
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Codigo</th>
                      <th>Ubicacion / Bodega</th>
                      <th>Existencias Fisicas</th>
                      <th>Unidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {desgloseUbicaciones.map((u) => (
                      <tr key={u.ubicacion_id}>
                        <td>
                          <strong>{u.ubicacion_codigo}</strong>
                        </td>
                        <td>{u.ubicacion_nombre}</td>
                        <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          {Number(u.stock_ubicacion).toLocaleString('es-CR')}
                        </td>
                        <td>{materialSeleccionado.unidad_medida}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setMaterialSeleccionado(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
