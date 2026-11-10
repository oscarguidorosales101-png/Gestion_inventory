import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';
import { formatMoneda, formatFecha } from '../../utils/formatters';
import {
  ShoppingCart,
  Plus,
  RefreshCw,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Send,
  AlertTriangle,
  Ban,
  ShieldAlert,
} from 'lucide-react';
import { OrdenModal } from './OrdenModal';
import { OrdenDetalleModal } from './OrdenDetalleModal';
import { RevisionDuplicadoModal } from './RevisionDuplicadoModal';

export const OrdenesList = () => {
  const { user } = useAuth();
  const rol = user?.rol;
  const canCreate = [ROLES.ADMINISTRADOR, ROLES.COMPRAS].includes(rol);
  const canApprove = [ROLES.ADMINISTRADOR, ROLES.COMPRAS].includes(rol);

  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [modalCreateOpen, setModalCreateOpen] = useState(false);
  const [selectedOrdenDetalle, setSelectedOrdenDetalle] = useState(null);
  const [selectedDuplicado, setSelectedDuplicado] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const cargarOrdenes = async () => {
    try {
      setLoading(true);
      const res = await api.ordenes.getAll({
        estado: estadoFiltro || undefined,
      });
      setOrdenes(res.data || []);
    } catch (err) {
      console.error('Error al cargar órdenes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarOrdenes();
  }, [estadoFiltro]);

  const handleAprobar = async (orden) => {
    // Segregación SoD en frontend (el backend también lo valida con 403 Forbidden)
    if (orden.usuario_creador_id === user?.id) {
      alert('Segregación de Funciones (SoD): No puede autorizar una orden de compra creada por usted mismo.');
      return;
    }

    if (!confirm(`¿Confirma la aprobación de la orden ${orden.numero_orden} por valor de ${formatMoneda(orden.total_crc)}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await api.ordenes.aprobar(orden.id);
      await cargarOrdenes();
    } catch (err) {
      alert(err?.message || 'Error al aprobar orden.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnviar = async (orden) => {
    if (!confirm(`¿Desea marcar la orden ${orden.numero_orden} como ENVIADA al proveedor?`)) return;
    try {
      setActionLoading(true);
      await api.ordenes.enviar(orden.id);
      await cargarOrdenes();
    } catch (err) {
      alert(err?.message || 'Error al enviar orden.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRechazar = async (orden) => {
    const motivo = prompt('Ingrese el motivo formal de rechazo:');
    if (!motivo) return;
    try {
      setActionLoading(true);
      await api.ordenes.rechazar(orden.id, motivo);
      await cargarOrdenes();
    } catch (err) {
      alert(err?.message || 'Error al rechazar orden.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelar = async (orden) => {
    const motivo = prompt('Ingrese el motivo de cancelación:');
    if (!motivo) return;
    try {
      setActionLoading(true);
      await api.ordenes.cancelar(orden.id, motivo);
      await cargarOrdenes();
    } catch (err) {
      alert(err?.message || 'Error al cancelar orden.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} color="#15803D" />
            <div className="card-table-title">Gestión de Órdenes de Compra y Abastecimiento</div>
          </div>

          <div className="card-table-actions">
            <select
              className="form-select"
              style={{ width: '200px' }}
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
            >
              <option value="">Todos los Estados</option>
              <option value="PENDIENTE_APROBACION">Pendiente Aprobación</option>
              <option value="APROBADA">Aprobada</option>
              <option value="ENVIADA">Enviada</option>
              <option value="RECIBIDA_PARCIAL">Recibida Parcial</option>
              <option value="RECIBIDA_TOTAL">Recibida Total</option>
              <option value="RECHAZADA">Rechazada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>

            <button className="btn btn-secondary btn-sm" onClick={cargarOrdenes}>
              <RefreshCw size={14} />
            </button>

            {canCreate && (
              <button className="btn btn-primary btn-sm" onClick={() => setModalCreateOpen(true)}>
                <Plus size={14} />
                <span>Nueva Orden</span>
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>N° Orden</th>
                <th>Fecha Emisión</th>
                <th>Proveedor</th>
                <th>Creador</th>
                <th>Total (CRC)</th>
                <th>Nivel Req.</th>
                <th>Estado Operativo</th>
                <th>Duplicado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    Cargando órdenes de compra...
                  </td>
                </tr>
              ) : ordenes.length > 0 ? (
                ordenes.map((o) => {
                  const esCreadorMismo = o.usuario_creador_id === user?.id;
                  const esDuplicadoBloqueante = o.es_posible_duplicado && o.estado_revision_duplicado === 'PENDIENTE_REVISION';

                  return (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600 }}>{o.numero_orden}</td>
                      <td>{formatFecha(o.fecha_emision)}</td>
                      <td>{o.proveedor_nombre}</td>
                      <td style={{ fontSize: '0.8rem' }}>{o.creador_nombre}</td>
                      <td style={{ fontWeight: 700 }}>{formatMoneda(o.total_crc)}</td>
                      <td><span className="badge badge-gray">{o.nivel_aprobacion_requerido}</span></td>
                      <td>
                        <span className={`badge ${
                          o.estado === 'APROBADA' || o.estado === 'RECIBIDA_TOTAL' ? 'badge-normal' :
                          o.estado === 'PENDIENTE_APROBACION' ? 'badge-reorden' :
                          o.estado === 'RECHAZADA' || o.estado === 'CANCELADA' ? 'badge-critico' : 'badge-blue'
                        }`}>
                          {o.estado}
                        </span>
                      </td>
                      <td>
                        {o.es_posible_duplicado ? (
                          <span
                            className="badge badge-critico"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedDuplicado(o)}
                            title="Ver detalles de sospecha de duplicidad"
                          >
                            {o.estado_revision_duplicado === 'PENDIENTE_REVISION' ? 'Sospechoso' : 'Revisado'}
                          </span>
                        ) : (
                          <span className="badge badge-gray" style={{ opacity: 0.6 }}>Normal</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedOrdenDetalle(o.id)}
                            title="Ver detalle de líneas"
                          >
                            <Eye size={13} />
                          </button>

                          {canApprove && o.estado === 'PENDIENTE_APROBACION' && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={actionLoading || esCreadorMismo || esDuplicadoBloqueante}
                                onClick={() => handleAprobar(o)}
                                title={
                                  esCreadorMismo
                                    ? 'Regla SoD: No puede aprobar su propia orden'
                                    : esDuplicadoBloqueante
                                    ? 'Bloqueado: Requiere resolver revisión de duplicado'
                                    : 'Aprobar orden'
                                }
                              >
                                <CheckCircle size={13} />
                                <span>{esCreadorMismo ? 'SoD Bloq.' : 'Aprobar'}</span>
                              </button>

                              <button
                                className="btn btn-danger btn-sm"
                                disabled={actionLoading}
                                onClick={() => handleRechazar(o)}
                                title="Rechazar orden"
                              >
                                <XCircle size={13} />
                              </button>
                            </>
                          )}

                          {canCreate && o.estado === 'APROBADA' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={actionLoading}
                              onClick={() => handleEnviar(o)}
                              title="Marcar como enviada al proveedor"
                            >
                              <Send size={13} />
                              <span>Enviar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="empty-state">
                    No se encontraron órdenes de compra registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalCreateOpen && (
        <OrdenModal
          onClose={() => setModalCreateOpen(false)}
          onSuccess={() => {
            setModalCreateOpen(false);
            cargarOrdenes();
          }}
        />
      )}

      {selectedOrdenDetalle && (
        <OrdenDetalleModal
          ordenId={selectedOrdenDetalle}
          onClose={() => setSelectedOrdenDetalle(null)}
        />
      )}

      {selectedDuplicado && (
        <RevisionDuplicadoModal
          orden={selectedDuplicado}
          onClose={() => setSelectedDuplicado(null)}
          onSuccess={() => {
            setSelectedDuplicado(null);
            cargarOrdenes();
          }}
        />
      )}
    </div>
  );
};

