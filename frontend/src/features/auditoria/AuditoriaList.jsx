import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatFecha } from '../../utils/formatters';
import { ShieldCheck, Search, RefreshCw, Eye, FileJson } from 'lucide-react';
import { AuditoriaPayloadModal } from './AuditoriaPayloadModal';

export const AuditoriaList = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accionFiltro, setAccionFiltro] = useState('');
  const [selectedPayload, setSelectedPayload] = useState(null);

  const cargarLogs = async () => {
    try {
      setLoading(true);
      const res = await api.auditoria.getAll({
        accion: accionFiltro || undefined,
      });
      setLogs(res.data || []);
    } catch (err) {
      console.error('Error al cargar auditoría:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarLogs();
  }, [accionFiltro]);

  return (
    <div>
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="#15803D" />
            <div className="card-table-title">Bitácora Oficial de Auditoría (Trazabilidad Inmutable)</div>
          </div>

          <div className="card-table-actions">
            <select
              className="form-select"
              style={{ width: '220px' }}
              value={accionFiltro}
              onChange={(e) => setAccionFiltro(e.target.value)}
            >
              <option value="">Todas las Acciones</option>
              <option value="LOGIN_EXITOSO">Inicio de Sesión</option>
              <option value="CREAR_ORDEN">Crear Orden</option>
              <option value="APROBAR_ORDEN">Aprobar Orden</option>
              <option value="RECHAZO_SOD">Intento Violación SoD</option>
              <option value="RECEPCION_MATERIALES">Recepción Física</option>
              <option value="ASENTAR_MOVIMIENTO">Movimiento Kardex</option>
              <option value="REVISION_DUPLICADO">Revisión Duplicado</option>
            </select>

            <button className="btn btn-secondary btn-sm" onClick={cargarLogs}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha / Hora</th>
                <th>Usuario</th>
                <th>Acción Realizada</th>
                <th>Tipo Operación</th>
                <th>Entidad Afectada</th>
                <th>Motivo / Justificación</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    Consultando bitácora inmutable de auditoría...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 600 }}>#{log.id}</td>
                    <td>{formatFecha(log.created_at, true)}</td>
                    <td style={{ fontWeight: 600 }}>{log.usuario_nombre || 'Sistema'}</td>
                    <td><span className="badge badge-gray">{log.accion}</span></td>
                    <td>{log.tipo_operacion}</td>
                    <td>{log.entidad_afectada} (ID #{log.registro_afectado_id})</td>
                    <td style={{ maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.motivo || '-'}
                    </td>
                    <td>
                      {log.payload ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedPayload({ title: `Auditoría #${log.id} — ${log.accion}`, data: log.payload })}
                          title="Ver detalle del registro"
                        >
                          <FileJson size={13} />
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="empty-state">
                    No se encontraron registros de auditoría que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPayload && (
        <AuditoriaPayloadModal
          payloadData={selectedPayload}
          onClose={() => setSelectedPayload(null)}
        />
      )}
    </div>
  );
};

