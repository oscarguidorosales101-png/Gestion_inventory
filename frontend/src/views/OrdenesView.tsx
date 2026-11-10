import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { OrdenCompra, Proveedor, Ubicacion, Material } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Send,
  AlertTriangle,
  FileText,
  Trash2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export const OrdenesView: React.FC = () => {
  const { user } = useAuth();
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  // Modal Detalle
  const [ordenDetalle, setOrdenDetalle] = useState<OrdenCompra | null>(null);

  // Modal Revision de Duplicado
  const [modalDuplicado, setModalDuplicado] = useState<OrdenCompra | null>(null);
  const [resolucionDuplicado, setResolucionDuplicado] = useState<'CONFIRMAR_DUPLICADO' | 'DESCARTAR_FALSO_POSITIVO'>('DESCARTAR_FALSO_POSITIVO');
  const [motivoDuplicado, setMotivoDuplicado] = useState('');
  const [procesandoDup, setProcesandoDup] = useState(false);

  // Modal Cancelar / Rechazar
  const [modalRechazo, setModalRechazo] = useState<{ id: number; tipo: 'RECHAZAR' | 'CANCELAR' } | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesandoRechazo, setProcesandoRechazo] = useState(false);

  // Modal Crear Orden
  const [modalCrearOpen, setModalCrearOpen] = useState(false);
  const [formProveedorId, setFormProveedorId] = useState<number>(1);
  const [formUbicacionId, setFormUbicacionId] = useState<number>(1);
  const [formFechaEntrega, setFormFechaEntrega] = useState<string>('');
  const [formObservaciones, setFormObservaciones] = useState<string>('');
  const [formItems, setFormItems] = useState<Array<{ material_id: number; cantidad_solicitada: number; precio_unitario_crc: number }>>([
    { material_id: 1, cantidad_solicitada: 10, precio_unitario_crc: 100 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resOrd, resPrv, resUbi, resMat] = await Promise.all([
        api.ordenes.getAll({ estado: filtroEstado || undefined }),
        api.proveedores.getAll(),
        api.ubicaciones.getAll(),
        api.materiales.getAll(),
      ]);
      setOrdenes(resOrd.data || []);
      setProveedores(resPrv.data || []);
      setUbicaciones(resUbi.data || []);
      setMateriales(resMat.data || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando ordenes de compra.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado]);

  // Manejo de Aprobacion (SoD & Matrix)
  const handleAprobar = async (o: OrdenCompra) => {
    if (user && o.usuario_creador_id === user.id) {
      alert('Segregacion de Funciones (SoD): No puede aprobar una orden creada por usted mismo.');
      return;
    }
    if (o.es_posible_duplicado && o.estado_revision_duplicado === 'PENDIENTE_REVISION') {
      alert('Esta orden tiene sospecha de duplicado pendiente de revision. Debe resolver la sospecha antes de aprobarla.');
      return;
    }
    if (!confirm(`Â¿Confirma la aprobacion de la orden ${o.numero_orden} por un total de â‚¡${Number(o.total_crc).toLocaleString('es-CR')}?`)) {
      return;
    }
    try {
      await api.ordenes.aprobar(o.id);
      cargarDatos();
    } catch (err: any) {
      alert('Error al aprobar orden: ' + err.message);
    }
  };

  const handleEnviar = async (id: number) => {
    if (!confirm('Â¿Desea marcar esta orden como ENVIADA al proveedor?')) return;
    try {
      await api.ordenes.enviar(id);
      cargarDatos();
    } catch (err: any) {
      alert('Error enviando orden: ' + err.message);
    }
  };

  const handleConfirmarRechazo = async () => {
    if (!modalRechazo || !motivoRechazo.trim()) return;
    setProcesandoRechazo(true);
    try {
      if (modalRechazo.tipo === 'RECHAZAR') {
        await api.ordenes.rechazar(modalRechazo.id, motivoRechazo);
      } else {
        await api.ordenes.cancelar(modalRechazo.id, motivoRechazo);
      }
      setModalRechazo(null);
      setMotivoRechazo('');
      cargarDatos();
    } catch (err: any) {
      alert('Error en operacion: ' + err.message);
    } finally {
      setProcesandoRechazo(false);
    }
  };

  const handleResolverDuplicado = async () => {
    if (!modalDuplicado || !motivoDuplicado.trim()) return;
    setProcesandoDup(true);
    try {
      await api.ordenes.revisarDuplicado(modalDuplicado.id, resolucionDuplicado, motivoDuplicado);
      setModalDuplicado(null);
      setMotivoDuplicado('');
      cargarDatos();
    } catch (err: any) {
      alert('Error al registrar revision de duplicado: ' + err.message);
    } finally {
      setProcesandoDup(false);
    }
  };

  // Lineas de items para crear orden
  const handleAddItem = () => {
    const primerMat = materiales[0];
    setFormItems([
      ...formItems,
      {
        material_id: primerMat?.id || 1,
        cantidad_solicitada: 1,
        precio_unitario_crc: Number(primerMat?.costo_unitario_crc || 100),
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...formItems];
    if (field === 'material_id') {
      const matId = Number(val);
      const selected = materiales.find((m) => m.id === matId);
      updated[index] = {
        ...updated[index],
        material_id: matId,
        precio_unitario_crc: selected ? Number(selected.costo_unitario_crc) : updated[index].precio_unitario_crc,
      };
    } else {
      updated[index] = { ...updated[index], [field]: Number(val) };
    }
    setFormItems(updated);
  };

  const subtotalForm = formItems.reduce((acc, it) => acc + (it.cantidad_solicitada || 0) * (it.precio_unitario_crc || 0), 0);

  const handleCrearOrden = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formItems.length === 0) {
      setFormError('Debe incluir al menos una linea de material.');
      return;
    }

    setCreando(true);
    try {
      const res = await api.ordenes.create({
        proveedor_id: formProveedorId,
        ubicacion_destino_id: formUbicacionId,
        fecha_entrega_estimada: formFechaEntrega || new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
        observaciones: formObservaciones,
        items: formItems,
      });

      const ordenCreada = res.data;
      setModalCrearOpen(false);
      cargarDatos();

      if (ordenCreada.es_posible_duplicado) {
        alert(
          `AVISO IMPORTANTE: La orden ${ordenCreada.numero_orden} ha sido identificada como POSIBLE DUPLICADO (similar a ${ordenCreada.orden_similar_numero || 'orden previa'}). Requiere revision administrativa antes de poder ser aprobada.`
        );
      }
    } catch (err: any) {
      setFormError(err.message || 'Error al emitir orden de compra.');
    } finally {
      setCreando(false);
    }
  };

  return (
    <div>
      {/* Barra de Filtros y Crear */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos los Estados</option>
              <option value="PENDIENTE_APROBACION">Pendiente de Aprobacion</option>
              <option value="APROBADA">Aprobada</option>
              <option value="ENVIADA">Enviada al Proveedor</option>
              <option value="PARCIALMENTE_RECIBIDA">Parcialmente Recibida</option>
              <option value="RECIBIDA">Recibida Completa</option>
              <option value="CANCELADA">Cancelada</option>
              <option value="RECHAZADA">Rechazada</option>
            </select>
          </div>

          {user && ['ADMINISTRADOR', 'COMPRAS'].includes(user.rol) && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setFormProveedorId(proveedores[0]?.id || 1);
                setFormUbicacionId(ubicaciones[0]?.id || 1);
                setFormFechaEntrega(new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10));
                setFormObservaciones('');
                setFormItems([
                  {
                    material_id: materiales[0]?.id || 1,
                    cantidad_solicitada: 10,
                    precio_unitario_crc: Number(materiales[0]?.costo_unitario_crc || 100),
                  },
                ]);
                setFormError(null);
                setModalCrearOpen(true);
              }}
            >
              <Plus size={16} />
              <span>Emitir Orden de Compra</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabla de Ordenes */}
      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Numero Orden</th>
                <th>Proveedor</th>
                <th>Emision</th>
                <th>Entrega Est.</th>
                <th>Nivel</th>
                <th>Total (CRC)</th>
                <th>Estado Operativo</th>
                <th>Control Duplicados</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px' }}>
                    Cargando ordenes de compra...
                  </td>
                </tr>
              ) : ordenes.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No se encontraron ordenes de compra.
                  </td>
                </tr>
              ) : (
                ordenes.map((o) => {
                  const esCreador = user && o.usuario_creador_id === user.id;
                  const puedeAprobarNivel =
                    user &&
                    (user.rol === 'ADMINISTRADOR' ||
                      (user.rol === 'ENCARGADO_INVENTARIO' && ['NIVEL_1', 'NIVEL_2'].includes(o.nivel_aprobacion_requerido)));

                  return (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.numero_orden}</strong>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Creado por: {o.creador_nombre || `Usuario #${o.usuario_creador_id}`}</div>
                      </td>
                      <td>{o.proveedor_nombre}</td>
                      <td style={{ fontSize: '0.8rem' }}>{new Date(o.fecha_emision).toLocaleDateString('es-CR')}</td>
                      <td style={{ fontSize: '0.8rem' }}>{o.fecha_entrega_estimada}</td>
                      <td>
                        <span className="badge badge-purple">{o.nivel_aprobacion_requerido}</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        â‚¡{Number(o.total_crc).toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            o.estado === 'RECIBIDA'
                              ? 'badge-normal'
                              : o.estado === 'APROBADA' || o.estado === 'ENVIADA'
                              ? 'badge-info'
                              : o.estado === 'PARCIALMENTE_RECIBIDA'
                              ? 'badge-reorden'
                              : o.estado === 'PENDIENTE_APROBACION'
                              ? 'badge-neutral'
                              : 'badge-critico'
                          }`}
                        >
                          {o.estado}
                        </span>
                      </td>
                      <td>
                        {Boolean(o.es_posible_duplicado) ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="badge badge-critico" title={`Similitud con ${o.orden_similar_numero || 'orden anterior'}`}>
                              <ShieldAlert size={12} />
                              <span>POSIBLE DUPLICADO</span>
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              Rev: {o.estado_revision_duplicado}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>No aplica</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setOrdenDetalle(o)}
                            title="Ver detalles e items"
                          >
                            <Eye size={13} />
                          </button>

                          {/* Boton Revision de Duplicado */}
                          {Boolean(o.es_posible_duplicado) &&
                            o.estado_revision_duplicado === 'PENDIENTE_REVISION' &&
                            user &&
                            ['ADMINISTRADOR', 'COMPRAS'].includes(user.rol) && (
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ color: '#d97706', borderColor: '#fcd34d' }}
                                onClick={() => {
                                  setModalDuplicado(o);
                                  setResolucionDuplicado('DESCARTAR_FALSO_POSITIVO');
                                  setMotivoDuplicado('');
                                }}
                                title="Revisar advertencia de duplicado"
                              >
                                <AlertTriangle size={13} />
                                <span>Revisar Dup</span>
                              </button>
                            )}

                          {/* Boton Aprobar (con proteccion SoD) */}
                          {o.estado === 'PENDIENTE_APROBACION' && puedeAprobarNivel && (
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={esCreador || (Boolean(o.es_posible_duplicado) && o.estado_revision_duplicado === 'PENDIENTE_REVISION')}
                              onClick={() => handleAprobar(o)}
                              title={
                                esCreador
                                  ? 'Segregacion de Funciones: No puede autorizar su propia orden'
                                  : Boolean(o.es_posible_duplicado) && o.estado_revision_duplicado === 'PENDIENTE_REVISION'
                                  ? 'Requiere resolver la sospecha de duplicado primero'
                                  : 'Aprobar orden de compra'
                              }
                            >
                              <CheckCircle size={13} />
                              <span>Aprobar</span>
                            </button>
                          )}

                          {/* Boton Enviar al Proveedor */}
                          {o.estado === 'APROBADA' && user && ['ADMINISTRADOR', 'COMPRAS'].includes(user.rol) && (
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ color: '#0369a1' }}
                              onClick={() => handleEnviar(o.id)}
                              title="Marcar como enviada al proveedor"
                            >
                              <Send size={13} />
                              <span>Enviar</span>
                            </button>
                          )}

                          {/* Boton Rechazar */}
                          {o.estado === 'PENDIENTE_APROBACION' && puedeAprobarNivel && !esCreador && (
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ color: '#dc2626' }}
                              onClick={() => setModalRechazo({ id: o.id, tipo: 'RECHAZAR' })}
                              title="Rechazar aprobacion"
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalle de Orden */}
      {ordenDetalle && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div className="modal-title">
                <FileText size={18} style={{ display: 'inline', marginRight: '6px' }} />
                <span>Orden de Compra: {ordenDetalle.numero_orden}</span>
              </div>
              <button className="modal-close" onClick={() => setOrdenDetalle(null)}>
                Ã—
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '0.82rem', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                <div><strong>Proveedor:</strong> {ordenDetalle.proveedor_nombre}</div>
                <div><strong>Destino:</strong> {ordenDetalle.ubicacion_destino_nombre}</div>
                <div><strong>Emision:</strong> {new Date(ordenDetalle.fecha_emision).toLocaleDateString('es-CR')}</div>
                <div><strong>Nivel Requerido:</strong> {ordenDetalle.nivel_aprobacion_requerido}</div>
                <div><strong>Estado:</strong> {ordenDetalle.estado}</div>
                <div><strong>Aprobador:</strong> {ordenDetalle.aprobador_nombre || 'Pendiente'}</div>
              </div>

              {Boolean(ordenDetalle.es_posible_duplicado) && (
                <div className="alert-banner alert-warning" style={{ fontSize: '0.8rem' }}>
                  <AlertTriangle size={16} />
                  <span>
                    Marcada como posible duplicado de la orden #{ordenDetalle.orden_similar_id}. Estado de revision: <strong>{ordenDetalle.estado_revision_duplicado}</strong>.
                  </span>
                </div>
              )}

              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Lineas de Materiales Solicitados:</div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Unidad</th>
                    <th>Cant. Solicitada</th>
                    <th>Cant. Recibida</th>
                    <th>Cant. Pendiente</th>
                    <th>Precio Unit. CRC</th>
                    <th>Subtotal CRC</th>
                  </tr>
                </thead>
                <tbody>
                  {(ordenDetalle.detalle || []).map((d) => (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.material_sku}</strong> - {d.material_nombre}
                      </td>
                      <td>{d.unidad_medida}</td>
                      <td style={{ fontWeight: 600 }}>{Number(d.cantidad_solicitada).toLocaleString('es-CR')}</td>
                      <td style={{ color: '#15803d' }}>{Number(d.cantidad_recibida || 0).toLocaleString('es-CR')}</td>
                      <td style={{ color: Number(d.cantidad_pendiente || 0) > 0 ? '#b45309' : '#64748b' }}>
                        {Number(d.cantidad_pendiente || 0).toLocaleString('es-CR')}
                      </td>
                      <td>â‚¡{Number(d.precio_unitario_crc).toLocaleString('es-CR', { minimumFractionDigits: 2 })}</td>
                      <td style={{ fontWeight: 700 }}>
                        â‚¡{Number(d.subtotal_linea_crc || 0).toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ textAlign: 'right', marginTop: '16px', fontSize: '0.9rem' }}>
                <div>Subtotal: <strong>â‚¡{Number(ordenDetalle.subtotal_crc).toLocaleString('es-CR', { minimumFractionDigits: 2 })}</strong></div>
                <div>Impuestos: <strong>â‚¡{Number(ordenDetalle.impuestos_crc).toLocaleString('es-CR', { minimumFractionDigits: 2 })}</strong></div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                  Total: â‚¡{Number(ordenDetalle.total_crc).toLocaleString('es-CR', { minimumFractionDigits: 2 })} CRC
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setOrdenDetalle(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Revision de Duplicado */}
      {modalDuplicado && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div className="modal-title">Revision Humana de Posible Duplicado</div>
              <button className="modal-close" onClick={() => setModalDuplicado(null)}>
                Ã—
              </button>
            </div>
            <div className="modal-body">
              <div className="alert-banner alert-warning">
                <AlertTriangle size={18} />
                <span>
                  La orden {modalDuplicado.numero_orden} coincide en proveedor y materiales con la orden #{modalDuplicado.orden_similar_id} dentro de la ventana de 7 dias.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Dictamen de Revision *</label>
                <select
                  className="form-control"
                  value={resolucionDuplicado}
                  onChange={(e) => setResolucionDuplicado(e.target.value as any)}
                  disabled={procesandoDup}
                >
                  <option value="DESCARTAR_FALSO_POSITIVO">Descartar Falso Positivo (Orden valida)</option>
                  <option value="CONFIRMAR_DUPLICADO">Confirmar Duplicado (Cancelar orden)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Justificacion Tecnica / Motivo *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={motivoDuplicado}
                  onChange={(e) => setMotivoDuplicado(e.target.value)}
                  placeholder="Explique por que es un pedido legitimo o un error de duplicidad..."
                  required
                  disabled={procesandoDup}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalDuplicado(null)} disabled={procesandoDup}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleResolverDuplicado}
                disabled={procesandoDup || !motivoDuplicado.trim()}
              >
                {procesandoDup ? 'Registrando...' : 'Registrar Dictamen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechazo o Cancelacion */}
      {modalRechazo && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-title">
                {modalRechazo.tipo === 'RECHAZAR' ? 'Rechazar Aprobacion de Orden' : 'Cancelar Orden de Compra'}
              </div>
              <button className="modal-close" onClick={() => setModalRechazo(null)}>
                Ã—
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Motivo Obligatorio *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Indique el motivo que quedara registrado inmutablemente en auditoria..."
                  required
                  disabled={procesandoRechazo}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalRechazo(null)} disabled={procesandoRechazo}>
                Volver
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmarRechazo}
                disabled={procesandoRechazo || !motivoRechazo.trim()}
              >
                {procesandoRechazo ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Emitir Orden de Compra */}
      {modalCrearOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '820px' }}>
            <div className="modal-header">
              <div className="modal-title">Emitir Nueva Orden de Compra</div>
              <button className="modal-close" onClick={() => setModalCrearOpen(false)}>
                Ã—
              </button>
            </div>
            <form onSubmit={handleCrearOrden}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-banner alert-danger">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Proveedor Homologado *</label>
                    <select
                      className="form-control"
                      value={formProveedorId}
                      onChange={(e) => setFormProveedorId(Number(e.target.value))}
                      disabled={creando}
                    >
                      {proveedores.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre_comercial} ({p.codigo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ubicacion Destino *</label>
                    <select
                      className="form-control"
                      value={formUbicacionId}
                      onChange={(e) => setFormUbicacionId(Number(e.target.value))}
                      disabled={creando}
                    >
                      {ubicaciones.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} ({u.codigo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fecha Entrega Estimada *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formFechaEntrega}
                      onChange={(e) => setFormFechaEntrega(e.target.value)}
                      required
                      disabled={creando}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Observaciones / Justificacion del Pedido</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formObservaciones}
                    onChange={(e) => setFormObservaciones(e.target.value)}
                    placeholder="Pedido regular de abastecimiento para proyecto..."
                    disabled={creando}
                  />
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '16px', paddingTop: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                      Materiales a Solicitar ({formItems.length} lineas)
                    </div>
                    <button type="button" className="btn btn-outline btn-sm" onClick={handleAddItem} disabled={creando}>
                      <Plus size={13} />
                      <span>AÃ±adir Material</span>
                    </button>
                  </div>

                  {formItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '3fr 1.5fr 2fr 2fr auto',
                        gap: '10px',
                        alignItems: 'center',
                        marginBottom: '8px',
                        backgroundColor: '#f8fafc',
                        padding: '8px 12px',
                        borderRadius: '6px',
                      }}
                    >
                      <div>
                        <select
                          className="form-control"
                          value={item.material_id}
                          onChange={(e) => handleItemChange(idx, 'material_id', e.target.value)}
                          disabled={creando}
                        >
                          {materiales.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.codigo_sku} - {m.nombre} ({m.unidad_medida})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Cantidad"
                          className="form-control"
                          value={item.cantidad_solicitada}
                          onChange={(e) => handleItemChange(idx, 'cantidad_solicitada', e.target.value)}
                          required
                          disabled={creando}
                        />
                      </div>

                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Precio CRC"
                          className="form-control"
                          value={item.precio_unitario_crc}
                          onChange={(e) => handleItemChange(idx, 'precio_unitario_crc', e.target.value)}
                          required
                          disabled={creando}
                        />
                      </div>

                      <div style={{ fontSize: '0.85rem', fontWeight: 600, textAlign: 'right' }}>
                        â‚¡{((item.cantidad_solicitada || 0) * (item.precio_unitario_crc || 0)).toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                      </div>

                      <div>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ color: '#dc2626', border: 'none' }}
                          onClick={() => handleRemoveItem(idx)}
                          disabled={creando || formItems.length === 1}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div style={{ textAlign: 'right', marginTop: '16px', fontSize: '1.05rem', fontWeight: 800, color: '#15803d' }}>
                    Total Estimado: â‚¡{subtotalForm.toLocaleString('es-CR', { minimumFractionDigits: 2 })} CRC
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModalCrearOpen(false)} disabled={creando}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={creando || formItems.length === 0}>
                  {creando ? 'Emitiendo orden...' : 'Emitir Orden de Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
