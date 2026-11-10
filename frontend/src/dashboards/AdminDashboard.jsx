import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  formatMoneda,
  formatFecha,
  formatAmbitoRegla,
  formatClaveRegla,
  formatAuditoriaAccion,
  formatAuditoriaTipoOperacion,
  formatAuditoriaEntidad,
} from '../utils/formatters';
import {
  Package,
  Coins,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Cpu,
  Users,
  Sliders,
  Activity,
  CheckCircle2,
  RefreshCw,
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

export const AdminDashboard = ({ onNavigate }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.dashboard.getAdminDashboard();
      setData(res.data);
    } catch (err) {
      setError(err?.message || 'Error al cargar métricas del Tablero de Administración.');
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
        <p>Cargando panel de administración general y telemetría de base de datos...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="alert-banner alert-danger">
        <AlertTriangle size={18} />
        <span>{error || 'No se pudieron recuperar las métricas de administración.'}</span>
      </div>
    );
  }

  const stockPieData = [
    { name: 'Normal', value: data.distribucionStockPorEstado?.normal || 0, color: '#15803D' },
    { name: 'Reorden', value: data.distribucionStockPorEstado?.reorden || 0, color: '#F59E0B' },
    { name: 'Crítico', value: data.distribucionStockPorEstado?.critico || 0, color: '#DC2626' },
  ];

  return (
    <div>
      {/* Barra de estado superior */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>Tablero de Control del Administrador</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B' }}>Visión global del sistema, seguridad, reglas, sincronización de eventos y auditoría general.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={cargarDatos}>
          <RefreshCw size={14} />
          <span>Actualizar Datos</span>
        </button>
      </div>

      {/* KPI Cards Principales */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Materiales en Catálogo</div>
            <div className="kpi-value">{data.totalMateriales}</div>
            <div className="kpi-sub">Items activos registrados</div>
          </div>
          <div className="kpi-icon-wrap">
            <Package size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Valoración Total Inventario</div>
            <div className="kpi-value">{formatMoneda(data.valorTotalInventarioCrc)}</div>
            <div className="kpi-sub">Calculado por libro mayor (FIFO/PMP)</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <Coins size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Órdenes Pendientes</div>
            <div className="kpi-value">{data.ordenesPendientesAprobacion}</div>
            <div className="kpi-sub">Por autorizar o validar</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Alertas Activas</div>
            <div className="kpi-value" style={{ color: data.alertasActivas > 0 ? '#DC2626' : '#0F172A' }}>
              {data.alertasActivas}
            </div>
            <div className="kpi-sub">Incidencias de stock vigentes</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Paneles de Integración y Reglas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Estado de Sincronización e Integraciones */}
        <div className="card-table" style={{ margin: 0 }}>
          <div className="card-table-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} color="#15803D" />
              <div className="card-table-title">Eventos de Sincronización e Integración</div>
            </div>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>PENDIENTES</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {data.outboxStats?.pendientes || 0}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#DCFCE7', border: '1px solid #86EFAC' }}>
                <div style={{ fontSize: '0.75rem', color: '#15803D', fontWeight: 600 }}>PROCESADOS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                  {data.outboxStats?.procesados || 0}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA' }}>
                <div style={{ fontSize: '0.75rem', color: '#B91C1C', fontWeight: 600 }}>FALLIDOS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B91C1C', marginTop: '4px' }}>
                  {data.outboxStats?.fallidos || 0}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '16px', fontSize: '0.8rem', color: '#64748B' }}>
              Los procesos automatizados sincronizan eventos periódicamente garantizando la consistencia y trazabilidad de los datos.
            </div>
          </div>
        </div>

        {/* Resumen de Reglas de Negocio */}
        <div className="card-table" style={{ margin: 0 }}>
          <div className="card-table-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} color="#15803D" />
              <div className="card-table-title">Parámetros Operativos Institucionales</div>
            </div>
            {onNavigate && (
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('reglas')}>
                Ver Todas
              </button>
            )}
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.reglasResumen && data.reglasResumen.length > 0 ? (
                data.reglasResumen.map((regla) => (
                  <div key={regla.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>{formatClaveRegla(regla.clave)}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Ámbito: {formatAmbitoRegla(regla.ambito)}</div>
                    </div>
                    <span className="badge badge-gray">
                      {regla.valor_numerico !== null ? regla.valor_numerico : regla.valor_texto}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-state" style={{ padding: '20px' }}>No hay reglas configuradas.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bitácora de Auditoría Reciente */}
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#15803D" />
            <div className="card-table-title">Últimas Actividades Registradas en Auditoría (Inmutable)</div>
          </div>
          {onNavigate && (
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('auditoria')}>
              Ver Bitácora Completa
            </button>
          )}
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Tipo Operación</th>
                <th>Entidad Afectada</th>
                <th>Motivo / Justificación</th>
              </tr>
            </thead>
            <tbody>
              {data.auditoriaReciente && data.auditoriaReciente.length > 0 ? (
                data.auditoriaReciente.map((log) => (
                  <tr key={log.id}>
                    <td>{formatFecha(log.created_at, true)}</td>
                    <td style={{ fontWeight: 600 }}>{log.usuario_nombre || 'Sistema'}</td>
                    <td><span className="badge badge-gray">{formatAuditoriaAccion(log.accion)}</span></td>
                    <td><span className="badge badge-normal">{formatAuditoriaTipoOperacion(log.tipo_operacion)}</span></td>
                    <td>{formatAuditoriaEntidad(log.entidad_afectada)} (#{log.registro_afectado_id})</td>
                    <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.motivo || 'Operación validada por el sistema'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="empty-state">No hay registros de auditoría recientes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

