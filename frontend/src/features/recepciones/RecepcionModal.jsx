import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatMoneda, formatNumero, formatEstadoOrden, formatTipoUbicacion } from '../../utils/formatters';
import { ArrowDownToLine, X, AlertTriangle, CheckCircle } from 'lucide-react';

export const RecepcionModal = ({ onClose, onSuccess }) => {
  const [ordenes, setOrdenes] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [selectedOrdenId, setSelectedOrdenId] = useState('');
  const [selectedOrdenDetalle, setSelectedOrdenDetalle] = useState(null);
  const [ubicacionDestinoId, setUbicacionDestinoId] = useState('');
  const [itemsRecibir, setItemsRecibir] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOrden, setLoadingOrden] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function initData() {
      try {
        const [resOrdenes, resUb] = await Promise.all([
          api.ordenes.getAll(),
          api.ubicaciones.getAll(),
        ]);
        // Solo órdenes que estén en estado APROBADA, ENVIADA o RECIBIDA_PARCIAL
        const ordenesRecibibles = (resOrdenes.data || []).filter((o) =>
          ['APROBADA', 'ENVIADA', 'RECIBIDA_PARCIAL'].includes(o.estado)
        );
        setOrdenes(ordenesRecibibles);
        setUbicaciones(resUb.data || []);
        if (resUb.data?.length > 0) {
          setUbicacionDestinoId(resUb.data[0].id);
        }
      } catch (err) {
        setError('Error al consultar órdenes aptas para recepción.');
      }
    }
    initData();
  }, []);

  const handleSelectOrden = async (ordenId) => {
    setSelectedOrdenId(ordenId);
    if (!ordenId) {
      setSelectedOrdenDetalle(null);
      setItemsRecibir({});
      return;
    }

    try {
      setLoadingOrden(true);
      const res = await api.ordenes.getById(Number(ordenId));
      setSelectedOrdenDetalle(res.data);
      // Inicializar cantidades a recibir con el saldo pendiente
      const initItems = {};
      (res.data?.detalles || []).forEach((d) => {
        const pendiente = Math.max(0, Number(d.cantidad_pedida) - Number(d.cantidad_recibida || 0));
        initItems[d.id] = pendiente;
      });
      setItemsRecibir(initItems);
    } catch (err) {
      setError('Error al cargar líneas de la orden.');
    } finally {
      setLoadingOrden(false);
    }
  };

  const handleCantidadChange = (detalleId, val) => {
    setItemsRecibir((prev) => ({
      ...prev,
      [detalleId]: Math.max(0, Number(val)),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const itemsPayload = Object.entries(itemsRecibir)
      .map(([detId, cant]) => ({
        detalle_id: Number(detId),
        cantidad_a_recibir: Number(cant),
      }))
      .filter((i) => i.cantidad_a_recibir > 0);

    if (itemsPayload.length === 0) {
      setError('Debe indicar al menos una cantidad mayor a cero para recibir.');
      return;
    }

    try {
      setLoading(true);
      await api.ordenes.registrarRecepcion(Number(selectedOrdenId), {
        items: itemsPayload,
        observaciones,
      });
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Error al procesar recepción física de materiales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowDownToLine size={20} color="#15803D" />
            <span className="modal-title">Recepción Física de Orden de Compra</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert-banner alert-danger">
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Seleccionar Orden Aprobada o Enviada</label>
                <select
                  className="form-select"
                  required
                  value={selectedOrdenId}
                  onChange={(e) => handleSelectOrden(e.target.value)}
                >
                  <option value="">-- Seleccionar Orden --</option>
                  {ordenes.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.numero_orden} — {o.proveedor_nombre} ({formatEstadoOrden(o.estado)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Bodega / Ubicación de Ingreso</label>
                <select
                  className="form-select"
                  required
                  value={ubicacionDestinoId}
                  onChange={(e) => setUbicacionDestinoId(e.target.value)}
                >
                  {ubicaciones.map((ub) => (
                    <option key={ub.id} value={ub.id}>
                      {ub.nombre} ({formatTipoUbicacion(ub.tipo)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingOrden && (
              <p style={{ textAlign: 'center', color: '#64748B', padding: '15px' }}>
                Cargando líneas y saldos pendientes...
              </p>
            )}

            {selectedOrdenDetalle && (
              <div style={{ marginTop: '14px', marginBottom: '16px' }}>
                <label className="form-label">Líneas de la Orden y Saldo a Recibir</label>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>U. Medida</th>
                      <th>Pedida</th>
                      <th>Ya Recibida</th>
                      <th>Saldo Pendiente</th>
                      <th style={{ width: '140px' }}>Cantidad a Recibir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrdenDetalle.detalles || []).map((d) => {
                      const pedida = Number(d.cantidad_pedida);
                      const recibida = Number(d.cantidad_recibida || 0);
                      const saldo = Math.max(0, pedida - recibida);

                      return (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600 }}>{d.material_nombre} ({d.material_sku})</td>
                          <td>{d.unidad_medida}</td>
                          <td>{formatNumero(pedida)}</td>
                          <td>{formatNumero(recibida)}</td>
                          <td style={{ fontWeight: 600, color: saldo > 0 ? '#B45309' : '#15803D' }}>
                            {formatNumero(saldo)}
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={saldo}
                              className="form-input"
                              value={itemsRecibir[d.id] ?? 0}
                              onChange={(e) => handleCantidadChange(d.id, e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Observaciones / Nota de Entrega</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Número de factura o conduce físico, estado de empaques..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !selectedOrdenDetalle}
            >
              {loading ? 'Procesando Entrada...' : 'Confirmar Recepción Física'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

