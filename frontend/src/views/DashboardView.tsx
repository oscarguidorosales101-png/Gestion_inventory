import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { DashboardMetricas } from '../types';
import {
  Package,
  Coins,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Activity,
  ShieldCheck,
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

export const DashboardView: React.FC = () => {
  const [metricas, setMetricas] = useState<DashboardMetricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const res = await api.dashboard.getMetricas();
      setMetricas(res.data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar metricas de inventario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
        <Activity size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p>Cargando metricas agregadas desde la base de datos...</p>
      </div>
    );
  }

  if (error || !metricas) {
    return (
      <div className="alert-banner alert-danger">
        <AlertTriangle size={18} />
        <span>{error || 'No se pudieron recuperar las metricas del sistema.'}</span>
      </div>
    );
  }

  const stockPieData = [
    { name: 'Normal', value: metricas.distribucionStockPorEstado.normal, color: '#15803d' },
    { name: 'Punto Reorden', value: metricas.distribucionStockPorEstado.reorden, color: '#f59e0b' },
    { name: 'Stock Critico', value: metricas.distribucionStockPorEstado.critico, color: '#dc2626' },
  ];

  return (
    <div>
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Materiales en Catalogo</div>
            <div className="kpi-value">{metricas.totalMateriales}</div>
            <div className="kpi-sub">Items activos registrados</div>
          </div>
          <div className="kpi-icon-wrap">
            <Package size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Valoracion de Inventario</div>
            <div className="kpi-value">
              â‚¡{Number(metricas.valorTotalInventarioCrc).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="kpi-sub">Calculado por libro mayor</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <Coins size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Alertas Activas</div>
            <div className="kpi-value" style={{ color: metricas.alertasActivas > 0 ? '#dc2626' : '#15803d' }}>
              {metricas.alertasActivas}
            </div>
            <div className="kpi-sub">Reorden y stock critico</div>
          </div>
          <div
            className="kpi-icon-wrap"
            style={{
              backgroundColor: metricas.alertasActivas > 0 ? '#fee2e2' : '#dcfce7',
              color: metricas.alertasActivas > 0 ? '#dc2626' : '#15803d',
            }}
          >
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Ordenes Pendientes</div>
            <div className="kpi-value" style={{ color: '#d97706' }}>
              {metricas.ordenesPendientesAprobacion}
            </div>
            <div className="kpi-sub">En espera de autorizacion</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Bar Chart: Stock por Categoria */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <TrendingUp size={18} />
              <span>Valoracion de Existencias por Categoria (â‚¡ CRC)</span>
            </div>
          </div>
          <div className="card-body" style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricas.stockPorCategoria} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="categoria" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`â‚¡${Number(val).toLocaleString('es-CR')}`, 'Valor CRC']}
                />
                <Bar dataKey="valorCrc" fill="#15803d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Estado de Stock */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Activity size={18} />
              <span>Salud del Inventario (Estado de Existencias)</span>
            </div>
          </div>
          <div className="card-body" style={{ height: '280px', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '55%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stockPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#15803d' }}></span>
                <span>Normal: <strong>{metricas.distribucionStockPorEstado.normal}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f59e0b' }}></span>
                <span>Punto Reorden: <strong>{metricas.distribucionStockPorEstado.reorden}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#dc2626' }}></span>
                <span>Stock Critico: <strong>{metricas.distribucionStockPorEstado.critico}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Movements & Audit Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
        {/* Ultimos Movimientos */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <ArrowUpRight size={18} />
              <span>Ultimos Movimientos de Materiales</span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Material</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Destino</th>
                </tr>
              </thead>
              <tbody>
                {metricas.movimientosRecientes.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>
                      No hay movimientos recientes registrados.
                    </td>
                  </tr>
                ) : (
                  metricas.movimientosRecientes.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(m.created_at).toLocaleDateString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <strong>{m.material_sku}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{m.material_nombre}</div>
                      </td>
                      <td>
                        <span className={`badge ${m.tipo_movimiento.startsWith('ENTRADA') ? 'badge-normal' : m.tipo_movimiento.startsWith('SALIDA') ? 'badge-purple' : 'badge-info'}`}>
                          {m.tipo_movimiento}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{m.cantidad}</td>
                      <td style={{ fontSize: '0.75rem' }}>{m.ubicacion_destino_nombre || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trazabilidad Reciente */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <ShieldCheck size={18} />
              <span>Trazabilidad y Auditoria Reciente</span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Operacion</th>
                  <th>Entidad</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {metricas.auditoriaReciente.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>
                      Sin actividad registrada.
                    </td>
                  </tr>
                ) : (
                  metricas.auditoriaReciente.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(a.created_at).toLocaleTimeString('es-CR')}
                      </td>
                      <td>{a.usuario_nombre || 'Sistema'}</td>
                      <td>
                        <span className="badge badge-neutral">{a.tipo_operacion}</span>
                      </td>
                      <td>{a.entidad_afectada} #{a.registro_afectado_id}</td>
                      <td style={{ fontSize: '0.75rem', color: '#475569' }}>{a.motivo || a.accion}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
