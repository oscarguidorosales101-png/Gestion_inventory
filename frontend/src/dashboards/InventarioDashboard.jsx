import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatMoneda, formatFecha, formatNumero, getEstadoStockBadgeClass, formatEstadoStock } from '../utils/formatters';
import {
  Boxes,
  Coins,
  AlertTriangle,
  ArrowDownToLine,
  Activity,
  Package,
  Layers,
  MapPin,
  RefreshCw,
  TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const InventarioDashboard = ({ onNavigate }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.dashboard.getInventarioDashboard();
      setData(res.data);
    } catch (err) {
      setError(err?.message || 'Error al cargar métricas del Tablero de Inventario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
        <Activity size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p>Cargando existencias de almacenes y métricas de abastecimiento...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="alert-banner alert-danger">
        <AlertTriangle size={18} />
        <span>{error || 'No se pudieron recuperar las métricas de inventario.'}</span>
      </div>
    );
  }

  const stockPieData = [
    { name: 'Normal', value: data.distribucionStockPorEstado?.normal || 0, color: '#15803D' },
    { name: 'Punto Reorden', value: data.distribucionStockPorEstado?.reorden || 0, color: '#F59E0B' },
    { name: 'Stock Crítico', value: data.distribucionStockPorEstado?.critico || 0, color: '#DC2626' },
  ];

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>Tablero de Almacén e Inventarios</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B' }}>Control de existencias físicas, recepciones, puntos de reorden y stock de seguridad.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onNavigate && (
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate('recepciones')}>
              <ArrowDownToLine size={14} />
              <span>Nueva Recepción</span>
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={cargarDatos}>
            <RefreshCw size={14} />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Materiales Registrados</div>
            <div className="kpi-value">{data.totalMateriales}</div>
            <div className="kpi-sub">Catálogo activo</div>
          </div>
          <div className="kpi-icon-wrap">
            <Package size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Valoración Total Stock</div>
            <div className="kpi-value">{formatMoneda(data.valorTotalInventarioCrc)}</div>
            <div className="kpi-sub">Existencias en bodegas</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <Coins size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">En Punto de Reorden</div>
            <div className="kpi-value" style={{ color: '#B45309' }}>
              {data.distribucionStockPorEstado?.reorden || 0}
            </div>
            <div className="kpi-sub">Requieren emisión de compra</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <Layers size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Artículos en Stock Crítico</div>
            <div className="kpi-value" style={{ color: '#DC2626' }}>
              {data.distribucionStockPorEstado?.critico || 0}
            </div>
            <div className="kpi-sub">Riesgo inminente de desabasto</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <TrendingDown size={22} />
          </div>
        </div>
      </div>

      {/* Gráficos de Estado y Distribución */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Distribución por Estado de Stock */}
        <div className="card-table" style={{ margin: 0 }}>
          <div className="card-table-header">
            <div className="card-table-title">Distribución por Estado de Stock</div>
          </div>
          <div style={{ padding: '20px', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stockPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock por Ubicación */}
        <div className="card-table" style={{ margin: 0 }}>
          <div className="card-table-header">
            <div className="card-table-title">Existencias por Bodega / Ubicación</div>
            {onNavigate && (
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('ubicaciones')}>
                Ver Bodegas
              </button>
            )}
          </div>
          <div style={{ padding: '20px', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.stockPorUbicacion || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="ubicacion_nombre" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="items_distintos" name="Líneas de Material" fill="#15803D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Artículos Críticos y Bajo Punto de Reorden */}
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#DC2626" />
            <div className="card-table-title">Materiales Prioritarios (Bajo Reorden o Stock Crítico)</div>
          </div>
          {onNavigate && (
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('materiales')}>
              Explorar Catálogo
            </button>
          )}
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Material</th>
                <th>Categoría</th>
                <th>Stock Actual</th>
                <th>Punto Reorden</th>
                <th>Stock Mínimo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.itemsCriticos && data.itemsCriticos.length > 0 ? (
                data.itemsCriticos.map((mat) => (
                  <tr key={mat.id}>
                    <td style={{ fontWeight: 600 }}>{mat.codigo}</td>
                    <td>{mat.nombre}</td>
                    <td>{mat.categoria_nombre}</td>
                    <td style={{ fontWeight: 700, color: mat.estado_stock === 'CRITICO' ? '#DC2626' : '#B45309' }}>
                      {formatNumero(mat.stock_global)} {mat.unidad_medida}
                    </td>
                    <td>{formatNumero(mat.punto_reorden)} {mat.unidad_medida}</td>
                    <td>{formatNumero(mat.stock_minimo)} {mat.unidad_medida}</td>
                    <td>
                      <span className={`badge ${getEstadoStockBadgeClass(mat.estado_stock)}`}>
                        {formatEstadoStock(mat.estado_stock)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No existen artículos bajo el punto de reorden en este momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recepciones Físicas Recientes */}
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowDownToLine size={18} color="#15803D" />
            <div className="card-table-title">Últimas Recepciones Físicas Ingresadas</div>
          </div>
          {onNavigate && (
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('recepciones')}>
              Historial de Recepciones
            </button>
          )}
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha Recepción</th>
                <th>N° Orden</th>
                <th>Proveedor</th>
                <th>Material Ingresado</th>
                <th>Cantidad</th>
                <th>Bodega Destino</th>
                <th>Receptor</th>
              </tr>
            </thead>
            <tbody>
              {data.recepcionesRecientes && data.recepcionesRecientes.length > 0 ? (
                data.recepcionesRecientes.map((rec) => (
                  <tr key={rec.id}>
                    <td>{formatFecha(rec.fecha_movimiento, true)}</td>
                    <td style={{ fontWeight: 600 }}>{rec.numero_orden || '-'}</td>
                    <td>{rec.proveedor_nombre}</td>
                    <td>{rec.material_nombre} ({rec.material_sku})</td>
                    <td style={{ fontWeight: 700, color: '#15803D' }}>
                      +{formatNumero(rec.cantidad)} {rec.unidad_medida}
                    </td>
                    <td>{rec.bodega_destino}</td>
                    <td>{rec.receptor_nombre}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-state">No se han registrado recepciones físicas recientemente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

