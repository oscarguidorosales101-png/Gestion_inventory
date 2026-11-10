import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { OrdenCompra } from '../types';
import { useAuth } from '../context/AuthContext';
import { PackageCheck, AlertCircle, CheckCircle2, History } from 'lucide-react';

export const RecepcionesView: React.FC = () => {
  const { user } = useAuth();
  const canReceive = user && ['ADMINISTRADOR', 'ENCARGADO_INVENTARIO'].includes(user.rol);

  const [ordenesElegibles, setOrdenesElegibles] = useState<OrdenCompra[]>([]);
  const [ordenSeleccionadaId, setOrdenSeleccionadaId] = useState<number | null>(null);
  const [ordenActiva, setOrdenActiva] = useState<OrdenCompra | null>(null);
  const [itemsRecibir, setItemsRecibir] = useState<Array<{ detalle_id: number; material_sku: string; material_nombre: string; unidad: string; solicitada: number; recibida: number; pendiente: number; cantidad_a_recibir: number }>>([]);
  const [observaciones, setObservaciones] = useState('');
  const [recepcionesHistorial, setRecepcionesHistorial] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resOrd, resRec] = await Promise.all([
        api.ordenes.getAll(),
        api.recepciones.getAll(),
      ]);
      const elegibles = (resOrd.data || []).filter((o: OrdenCompra) =>
        ['APROBADA', 'ENVIADA', 'PARCIALMENTE_RECIBIDA'].includes(o.estado)
      );
      setOrdenesElegibles(elegibles);
      setRecepcionesHistorial(resRec.data || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando ordenes para recepcion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleSeleccionarOrden = async (id: number) => {
    setOrdenSeleccionadaId(id);
    setSuccessMsg(null);
    setError(null);
    if (!id) {
      setOrdenActiva(null);
      setItemsRecibir([]);
      return;
    }

    try {
      const res = await api.ordenes.getById(id);
      const o: OrdenCompra = res.data;
      setOrdenActiva(o);

      const items = (o.detalle || []).map((d) => {
        const pendiente = Number(d.cantidad_pendiente !== undefined ? d.cantidad_pendiente : Number(d.cantidad_solicitada) - Number(d.cantidad_recibida || 0));
        return {
          detalle_id: d.id!,
          material_sku: d.material_sku || '',
          material_nombre: d.material_nombre || '',
          unidad: d.unidad_medida || 'UNIDAD',
          solicitada: Number(d.cantidad_solicitada),
          recibida: Number(d.cantidad_recibida || 0),
          pendiente: Math.max(pendiente, 0),
          cantidad_a_recibir: Math.max(pendiente, 0), // por defecto ofrece recibir el saldo completo pendiente
        };
      });
      setItemsRecibir(items);
    } catch (err: any) {
      setError(err.message || 'Error obteniendo detalle de la orden seleccionada.');
    }
  };

  const handleCantidadChange = (detalleId: number, val: number) => {
    setItemsRecibir((prev) =>
      prev.map((it) => (it.detalle_id === detalleId ? { ...it, cantidad_a_recibir: Number(val) } : it))
    );
  };

  const handleSubmitRecepcion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!ordenActiva) return;

    // Filtrar items con cantidad > 0
    const itemsAEnviar = itemsRecibir
      .filter((it) => it.cantidad_a_recibir > 0)
      .map((it) => ({
        detalle_id: it.detalle_id,
        cantidad_a_recibir: it.cantidad_a_recibir,
      }));

    if (itemsAEnviar.length === 0) {
      setError('Debe especificar una cantidad a recibir mayor a cero en al menos un material.');
      return;
    }

    // Validacion previa de no excedente
    for (const it of itemsRecibir) {
      if (it.cantidad_a_recibir > it.pendiente) {
        setError(`La cantidad a recibir de ${it.material_sku} (${it.cantidad_a_recibir}) excede el saldo pendiente (${it.pendiente}).`);
        return;
      }
    }

    setGuardando(true);
    try {
      const res = await api.ordenes.registrarRecepcion(ordenActiva.id, {
        items: itemsAEnviar,
        observaciones: observaciones || undefined,
      });

      setSuccessMsg(
        `Recepcion registrada con exito. Estado de orden: ${res.data?.nuevo_estado_orden || 'ACTUALIZADA'}. Se han actualizado las existencias en inventario.`
      );
      setOrdenActiva(null);
      setOrdenSeleccionadaId(null);
      setItemsRecibir([]);
      setObservaciones('');
      cargarDatos();
    } catch (err: any) {
      setError(err.message || 'Error registrando recepcion de mercancia.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      {/* Tarjeta de Registro de Recepcion */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">
            <PackageCheck size={18} />
            <span>Registro Fisico de Entrada por Orden de Compra</span>
          </div>
        </div>
        <div className="card-body">
          {!canReceive ? (
            <div className="alert-banner alert-warning">
              <AlertCircle size={18} />
              <span>
                Su rol actual ({user?.rol}) es de solo consulta. Solo el Encargado de Inventario y el Administrador pueden asentar recepciones fisicas.
              </span>
            </div>
          ) : (
            <div>
              {error && (
                <div className="alert-banner alert-danger">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="alert-banner alert-success">
                  <CheckCircle2 size={18} />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="form-group" style={{ maxWidth: '500px', marginBottom: '20px' }}>
                <label className="form-label">Seleccione la Orden de Compra a Recibir *</label>
                <select
                  className="form-control"
                  value={ordenSeleccionadaId || ''}
                  onChange={(e) => handleSeleccionarOrden(Number(e.target.value))}
                  disabled={guardando}
                >
                  <option value="">-- Seleccionar Orden Aprobada o en Transito --</option>
                  {ordenesElegibles.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.numero_orden} â€” {o.proveedor_nombre} (Estado: {o.estado})
                    </option>
                  ))}
                </select>
              </div>

              {ordenActiva && (
                <form onSubmit={handleSubmitRecepcion}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '12px',
                      backgroundColor: '#f8fafc',
                      padding: '12px 16px',
                      borderRadius: '6px',
                      marginBottom: '16px',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div><strong>Numero:</strong> {ordenActiva.numero_orden}</div>
                    <div><strong>Proveedor:</strong> {ordenActiva.proveedor_nombre}</div>
                    <div><strong>Destino:</strong> {ordenActiva.ubicacion_destino_nombre}</div>
                    <div><strong>Estado Actual:</strong> <span className="badge badge-info">{ordenActiva.estado}</span></div>
                  </div>

                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
                    Materiales de la Orden y Cantidades a Recibir:
                  </div>

                  <div className="table-responsive" style={{ marginBottom: '16px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Material SKU</th>
                          <th>Nombre</th>
                          <th>Unidad</th>
                          <th>Solicitada</th>
                          <th>Ya Recibida</th>
                          <th>Saldo Pendiente</th>
                          <th style={{ width: '180px' }}>Cantidad a Recibir Ahora *</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsRecibir.map((it) => (
                          <tr key={it.detalle_id}>
                            <td>
                              <strong>{it.material_sku}</strong>
                            </td>
                            <td>{it.material_nombre}</td>
                            <td>{it.unidad}</td>
                            <td>{it.solicitada.toLocaleString('es-CR')}</td>
                            <td style={{ color: '#15803d' }}>{it.recibida.toLocaleString('es-CR')}</td>
                            <td style={{ fontWeight: 700, color: it.pendiente > 0 ? '#b45309' : '#64748b' }}>
                              {it.pendiente.toLocaleString('es-CR')}
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={it.pendiente}
                                className="form-control"
                                value={it.cantidad_a_recibir}
                                onChange={(e) => handleCantidadChange(it.detalle_id, Number(e.target.value))}
                                disabled={guardando || it.pendiente <= 0}
                                style={{
                                  borderColor: it.cantidad_a_recibir > it.pendiente ? '#dc2626' : undefined,
                                }}
                              />
                              {it.cantidad_a_recibir > it.pendiente && (
                                <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '2px' }}>
                                  Excede saldo pendiente ({it.pendiente})
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Observaciones de Recepcion / Numero de Albaran de Entrega</label>
                    <input
                      type="text"
                      className="form-control"
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Conforme segun remision o albaran #12345 del transportista..."
                      disabled={guardando}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setOrdenActiva(null)}
                      disabled={guardando}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={guardando}>
                      {guardando ? 'Procesando recepcion...' : 'Confirmar e Ingresar a Inventario'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Historial de Recepciones Realizadas */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <History size={18} />
            <span>Historial de Recepciones de Mercancia</span>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha de Recepcion</th>
                <th>Orden de Compra</th>
                <th>Proveedor</th>
                <th>Material</th>
                <th>Cantidad Recibida</th>
                <th>Bodega Destino</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                    Cargando historial de recepciones...
                  </td>
                </tr>
              ) : recepcionesHistorial.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No se registran recepciones previas.
                  </td>
                </tr>
              ) : (
                recepcionesHistorial.map((rec, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {new Date(rec.fecha_recepcion || rec.created_at).toLocaleDateString('es-CR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <strong>{rec.numero_orden}</strong>
                    </td>
                    <td>{rec.proveedor_nombre}</td>
                    <td>
                      {rec.material_sku} - {rec.material_nombre}
                    </td>
                    <td style={{ fontWeight: 700, color: '#15803d' }}>
                      +{Number(rec.cantidad_recibida).toLocaleString('es-CR')} {rec.unidad_medida}
                    </td>
                    <td>{rec.ubicacion_destino_nombre}</td>
                    <td>{rec.usuario_receptor_nombre || 'Inventario'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
