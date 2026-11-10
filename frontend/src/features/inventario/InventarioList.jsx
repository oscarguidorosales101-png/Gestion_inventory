import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatMoneda, formatNumero, getEstadoStockBadgeClass } from '../../utils/formatters';
import { Boxes, MapPin, Search, RefreshCw, AlertTriangle, Layers } from 'lucide-react';
import { StockPorUbicacionModal } from './StockPorUbicacionModal';

export const InventarioList = () => {
  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriaId, setCategoriaId] = useState('');
  const [estadoStock, setEstadoStock] = useState('');
  const [search, setSearch] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resStock, resCat] = await Promise.all([
        api.inventario.getStockGlobal({
          categoria_id: categoriaId ? Number(categoriaId) : undefined,
          estado_stock: estadoStock || undefined,
          search: search.trim() || undefined,
        }),
        api.categorias.getAll(),
      ]);
      setItems(resStock.data || []);
      setCategorias(resCat.data || []);
    } catch (err) {
      console.error('Error al cargar inventario:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [categoriaId, estadoStock]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    cargarDatos();
  };

  return (
    <div>
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Boxes size={20} color="#15803D" />
            <div className="card-table-title">Estado Global de Existencias y Disponibilidad</div>
          </div>

          <div className="card-table-actions">
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                style={{ width: '200px' }}
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

            <select
              className="form-select"
              style={{ width: '150px' }}
              value={estadoStock}
              onChange={(e) => setEstadoStock(e.target.value)}
            >
              <option value="">Todos los Estados</option>
              <option value="NORMAL">Normal</option>
              <option value="REORDEN">Punto Reorden</option>
              <option value="CRITICO">Stock Crítico</option>
            </select>

            <button className="btn btn-secondary btn-sm" onClick={cargarDatos}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Material</th>
                <th>Categoría</th>
                <th>Stock Físico Global</th>
                <th>Punto Reorden</th>
                <th>Stock Seguridad</th>
                <th>Costo Unitario</th>
                <th>Valor Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    Cargando existencias de inventario...
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.codigo}</td>
                    <td>{m.nombre}</td>
                    <td>{m.categoria_nombre}</td>
                    <td style={{ fontWeight: 700, color: m.estado_stock === 'CRITICO' ? '#DC2626' : m.estado_stock === 'REORDEN' ? '#B45309' : '#15803D' }}>
                      {formatNumero(m.stock_global)} {m.unidad_medida}
                    </td>
                    <td>{formatNumero(m.punto_reorden)} {m.unidad_medida}</td>
                    <td>{formatNumero(m.stock_seguridad)} {m.unidad_medida}</td>
                    <td>{formatMoneda(m.costo_unitario_crc)}</td>
                    <td style={{ fontWeight: 600 }}>
                      {formatMoneda(Number(m.stock_global || 0) * Number(m.costo_unitario_crc || 0))}
                    </td>
                    <td>
                      <span className={`badge ${getEstadoStockBadgeClass(m.estado_stock)}`}>
                        {m.estado_stock}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedMaterial(m)}
                        title="Ver desglose de stock por bodega"
                      >
                        <MapPin size={13} />
                        <span>Bodegas</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="empty-state">
                    No se encontraron materiales que coincidan con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMaterial && (
        <StockPorUbicacionModal
          material={selectedMaterial}
          onClose={() => setSelectedMaterial(null)}
        />
      )}
    </div>
  );
};

