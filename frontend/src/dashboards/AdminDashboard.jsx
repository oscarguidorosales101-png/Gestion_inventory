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
import { ReglaModal } from '../features/reglas/ReglaModal';
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
  Edit2,
  Eye,
  X,
  FileCode,
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
  const [selectedRegla, setSelectedRegla] = useState(null);
  const [modalReglaOpen, setModalReglaOpen] = useState(false);
  const [detalleModal, setDetalleModal] = useState(null); // { titulo, data }

  const cargarDatos = async (silencioso = false) => {
    try {
      if (!silencioso) setLoading(true);
      setError(null);
      const res = await api.dashboard.getAdminDashboard();
      setData(res.data);
    } catch (err) {
      setError(err?.message || 'Error al cargar métricas del Tablero de Administración.');
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // Auto-actualización periódica cada 30 segundos sin recarga de página
    const interval = setInterval(() => {
      cargarDatos(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
        <Activity size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p>Cargando panel de administración general y telemetría de base de datos...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="alert-banner alert-danger">
        <AlertTriangle size={18} />
        <span>{error || 'No se pudieron recuperar las métricas de administración.'}</span>
      </div>
    );
  }

  const outbox = data?.outboxStats || {
    pendientes: 0,
    en_proceso: 0,
    procesados: 0,
    fallidos: 0,
  };

  return (
    <div>
      {/* Barra de estado superior */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>Tablero de Control del Administrador</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
            Visión global del sistema, seguridad, reglas, sincronización de eventos y auditoría general.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => cargarDatos(false)}>
          <RefreshCw size={14} />
          <span>Actualizar Datos</span>
        </button>
      </div>

      {/* KPI Cards Principales */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Materiales en Catálogo</div>
            <div className="kpi-value">{data?.totalMateriales || 0}</div>
            <div className="kpi-sub">Items activos registrados</div>
          </div>
          <div className="kpi-icon-wrap">
            <Package size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Valoración Total Inventario</div>
            <div className="kpi-value">{formatMoneda(data?.valorTotalInventarioCrc || 0)}</div>
            <div className="kpi-sub">Calculado por libro mayor (FIFO/PMP)</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <Coins size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Órdenes Pendientes</div>
            <div className="kpi-value">{data?.ordenesPendientesAprobacion || 0}</div>
            <div className="kpi-sub">Por autorizar o validar</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Alertas Activas</div>
            <div className="kpi-value" style={{ color: (data?.alertasActivas || 0) > 0 ? '#DC2626' : '#0F172A' }}>
              {data?.alertasActivas || 0}
            </div>
            <div className="kpi-sub">Incidencias de stock vigentes</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Parámetros Operativos Institucionales (Editable por ADMIN) */}
      <div className="card-table" style={{ marginBottom: '24px' }}>
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="#15803D" />
            <div className="card-table-title">Parámetros Operativos Institucionales (Configuración Activa)</div>
          </div>
          {onNavigate && (
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('reglas')}>
              Ver Todas las Reglas
            </button>
          )}
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Clave Parámetro</th>
                <th>Ámbito</th>
                <th>Valor Vigente</th>
                <th>Descripción Operativa</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {data?.reglasResumen && data.reglasResumen.length > 0 ? (
                data.reglasResumen.map((regla) => (
                  <tr key={regla.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{formatClaveRegla(regla.clave)}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'monospace' }}>{regla.clave}</div>
                    </td>
                    <td>
                      <span className="badge badge-gray">{formatAmbitoRegla(regla.ambito)}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#15803D', fontSize: '0.9rem' }}>
                        {regla.valor_numerico !== null ? regla.valor_numerico : (regla.valor_texto || '-')}
                      </span>
                    </td>
                    <td style={{ color: '#475569', fontSize: '0.8rem', maxWidth: '350px' }}>
                      {regla.descripcion || 'Regla institucional de control'}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedRegla(regla);
                          setModalReglaOpen(true);
                        }}
                      >
                        <Edit2 size={13} />
                        <span>Modificar</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-state">No hay reglas operativas registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sincronización e Integraciones (Transactional Outbox) */}
      <div className="card-table" style={{ marginBottom: '24px' }}>
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color="#15803D" />
            <div className="card-table-title">Eventos de Sincronización e Integración (Transactional Outbox)</div>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
            Procesamiento desacoplado con garantía de entrega y registro de idempotencia
          </span>
        </div>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', textAlign: 'center' }}>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>PENDIENTES</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                {outbox.pendientes}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '0.72rem', color: '#1D4ED8', fontWeight: 600 }}>EN PROCESO</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1D4ED8', marginTop: '2px' }}>
                {outbox.en_proceso}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#DCFCE7', border: '1px solid #86EFAC' }}>
              <div style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 600 }}>PROCESADOS</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#15803D', marginTop: '2px' }}>
                {outbox.procesados}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#FEE2E2', border: '1px solid #FECACA' }}>
              <div style={{ fontSize: '0.72rem', color: '#B91C1C', fontWeight: 600 }}>FALLIDOS</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#B91C1C', marginTop: '2px' }}>
                {outbox.fallidos}
              </div>
            </div>
          </div>
        </div>

        {/* Tabla detallada de eventos outbox recientes */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Evento</th>
                <th>Tipo de Evento</th>
                <th>Entidad Afectada</th>
                <th>Estado</th>
                <th>Intentos</th>
                <th>Fecha Emisión</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {data?.eventosRecientes && data.eventosRecientes.length > 0 ? (
                data.eventosRecientes.map((evt) => (
                  <tr key={evt.id}>
                    <td style={{ fontWeight: 600 }}>#{evt.id}</td>
                    <td>
                      <span className="badge badge-gray">{evt.tipo_evento}</span>
                    </td>
                    <td>
                      {evt.entidad_tipo || evt.entidad} (#{evt.entidad_id})
                    </td>
                    <td>
                      <span className={`badge ${
                        evt.estado === 'PROCESADO' ? 'badge-normal' :
                        evt.estado === 'PROCESSING' ? 'badge-blue' :
                        evt.estado === 'ERROR' ? 'badge-critico' : 'badge-gray'
                      }`}>
                        {evt.estado === 'PROCESADO' ? 'Procesado' :
                         evt.estado === 'PROCESSING' ? 'En proceso' :
                         evt.estado === 'ERROR' ? 'Fallido' : 'Pendiente'}
                      </span>
                    </td>
                    <td>{evt.intentos} / {evt.max_intentos}</td>
                    <td>{formatFecha(evt.created_at || evt.fecha_creacion, true)}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          setDetalleModal({
                            titulo: `Detalle del Evento Outbox #${evt.id}`,
                            data: {
                              tipo_evento: evt.tipo_evento,
                              clave_idempotencia: evt.clave_idempotencia,
                              evento_uuid: evt.evento_uuid,
                              estado: evt.estado,
                              intentos: evt.intentos,
                              ultimo_error: evt.ultimo_error,
                              payload: evt.payload,
                              resultado_procesamiento: evt.resultado_procesamiento,
                            },
                          })
                        }
                      >
                        <Eye size={13} />
                        <span>Ver</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-state">No hay eventos de integración registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
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
                <th>Carga Útil</th>
              </tr>
            </thead>
            <tbody>
              {data?.auditoriaReciente && data.auditoriaReciente.length > 0 ? (
                data.auditoriaReciente.map((log) => (
                  <tr key={log.id}>
                    <td>{formatFecha(log.created_at || log.fecha_hora, true)}</td>
                    <td style={{ fontWeight: 600 }}>{log.usuario_nombre || 'Sistema'}</td>
                    <td><span className="badge badge-gray">{formatAuditoriaAccion(log.accion)}</span></td>
                    <td><span className="badge badge-normal">{formatAuditoriaTipoOperacion(log.tipo_operacion)}</span></td>
                    <td>{formatAuditoriaEntidad(log.entidad_afectada)} (#{log.registro_afectado_id})</td>
                    <td style={{ maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.motivo || 'Operación validada por el sistema'}
                    </td>
                    <td>
                      {log.payload ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() =>
                            setDetalleModal({
                              titulo: `Registro de Auditoría #${log.id} — ${log.accion}`,
                              data: typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload,
                            })
                          }
                        >
                          <FileCode size={13} />
                          <span>Datos</span>
                        </button>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-state">No hay registros de auditoría recientes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Edición Directa de Regla por el Administrador */}
      {modalReglaOpen && selectedRegla && (
        <ReglaModal
          regla={selectedRegla}
          onClose={() => {
            setModalReglaOpen(false);
            setSelectedRegla(null);
          }}
          onSuccess={() => {
            setModalReglaOpen(false);
            setSelectedRegla(null);
            cargarDatos(false);
          }}
        />
      )}

      {/* Modal para Visualización de Carga Útil (Payload / Json) */}
      {detalleModal && (
        <div className="modal-overlay" onClick={() => setDetalleModal(null)}>
          <div className="modal-content" style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{detalleModal.titulo}</div>
              <button className="btn btn-secondary btn-sm" onClick={() => setDetalleModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <pre
                style={{
                  backgroundColor: '#0F172A',
                  color: '#F8FAFC',
                  padding: '14px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  overflowX: 'auto',
                  maxHeight: '350px',
                  fontFamily: 'monospace',
                }}
              >
                {JSON.stringify(detalleModal.data, null, 2)}
              </pre>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetalleModal(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
