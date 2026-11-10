import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatMoneda, formatFecha, formatNumero, getEstadoStockBadgeClass } from '../utils/formatters';
import {
  Boxes,
  Coins,
  AlertTriangle,
  History,
  FileText,
  Activity,
  Package,
  Layers,
  ShieldCheck,
  RefreshCw,
  Search,
} from 'lucide-react';

export const ConsultaDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.dashboard.getConsultaDashboard();
      setData(res.data);
    } catch (err) {
      setError(err?.message || 'Error al cargar métricas del Tablero de Consulta.');
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
        <p>Cargando información consolidada en modo solo lectura...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="alert-banner alert-danger">
        <AlertTriangle size={18} />
        <span>{error || 'No se pudieron recuperar las métricas de consulta.'}</span>
      </div>
    );
  }

  return (
    <div>
      {/* Banner de Modo Solo Lectura */}
      <div className="alert-banner alert-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} />
          <span>
            <strong>Modo Solo Lectura Institucional:</strong> Su perfil dispone de acceso irrestricto de consulta, auditoría y emisión de reportes sin permisos de mutación operativa.
          </span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={cargarDatos}>
          <RefreshCw size={14} />
          <span>Refrescar</span>
        </button>
      </div>

      {/* KPI Cards Consolidado */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Materiales en Catálogo</div>
            <div className="kpi-value">{data.totalMateriales}</div>
            <div className="kpi-sub">Líneas registradas</div>
          </div>
          <div className="kpi-icon-wrap">
            <Package size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Valoración Total Inventario</div>
            <div className="kpi-value">{formatMoneda(data.valorTotalInventarioCrc)}</div>
            <div className="kpi-sub">Calculado por libro mayor</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <Coins size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Órdenes en Trámite</div>
            <div className="kpi-value">{data.ordenesPendientesAprobacion}</div>
            <div className="kpi-sub">Pendientes de aprobación</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <FileText size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Alertas Vigentes</div>
            <div className="kpi-value" style={{ color: data.alertasActivas > 0 ? '#DC2626' : '#0F172A' }}>
              {data.alertasActivas}
            </div>
            <div className="kpi-sub">Incidencias de abastecimiento</div>
          </div>
          <div className="kpi-icon-wrap" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Historial Consolidado de Movimientos de Almacén */}
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="#15803D" />
            <div className="card-table-title">Últimos Movimientos Registrados en Kardex</div>
          </div>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Tipo</th>
                <th>Material</th>
                <th>Cantidad</th>
                <th>Bodega Origen</th>
                <th>Bodega Destino</th>
                <th>Responsable</th>
                <th>Motivo / Referencia</th>
              </tr>
            </thead>
            <tbody>
              {data.ultimosMovimientos && data.ultimosMovimientos.length > 0 ? (
                data.ultimosMovimientos.map((mov) => (
                  <tr key={mov.id}>
                    <td>{formatFecha(mov.fecha_movimiento, true)}</td>
                    <td>
                      <span className={`badge ${mov.tipo === 'ENTRADA' ? 'badge-normal' : mov.tipo === 'SALIDA' ? 'badge-critico' : 'badge-blue'}`}>
                        {mov.tipo}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{mov.material_nombre} ({mov.material_sku})</td>
                    <td style={{ fontWeight: 700 }}>
                      {mov.tipo === 'ENTRADA' ? '+' : mov.tipo === 'SALIDA' ? '-' : ''}
                      {formatNumero(mov.cantidad)} {mov.unidad_medida}
                    </td>
                    <td>{mov.origen_nombre || '-'}</td>
                    <td>{mov.destino_nombre || '-'}</td>
                    <td>{mov.responsable_nombre}</td>
                    <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {mov.motivo || mov.referencia || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="empty-state">No hay movimientos recientes registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen de Existencias por Ubicación */}
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#15803D" />
            <div className="card-table-title">Consolidado de Existencias Físicas por Bodega</div>
          </div>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código Ubicación</th>
                <th>Nombre de Bodega / Obra</th>
                <th>Líneas con Existencia</th>
                <th>Unidades Físicas Totales</th>
              </tr>
            </thead>
            <tbody>
              {data.stockPorUbicacion && data.stockPorUbicacion.length > 0 ? (
                data.stockPorUbicacion.map((ub) => (
                  <tr key={ub.ubicacion_id}>
                    <td style={{ fontWeight: 600 }}>{ub.ubicacion_codigo}</td>
                    <td>{ub.ubicacion_nombre}</td>
                    <td>{ub.items_distintos}</td>
                    <td style={{ fontWeight: 700 }}>{formatNumero(ub.unidades_totales, 0)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty-state">No hay bodegas registradas con existencias.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

