import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatMoneda } from '../../utils/formatters';
import { ShoppingCart, Plus, Trash2, X, AlertTriangle } from 'lucide-react';

export const OrdenModal = ({ onClose, onSuccess }) => {
  const [proveedores, setProveedores] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [proveedorId, setProveedorId] = useState('');
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const [resP, resM] = await Promise.all([
          api.proveedores.getAll(),
          api.materiales.getAll(),
        ]);
        setProveedores(resP.data || []);
        setMateriales(resM.data || []);
        if (resP.data?.length > 0) {
          setProveedorId(resP.data[0].id);
        }
      } catch (err) {
        setError('Error al cargar datos de referencia.');
      }
    }
    init();

    // Default fecha entrega estimada en 5 días
    const d = new Date();
    d.setDate(d.getDate() + 5);
    setFechaEntregaEstimada(d.toISOString().slice(0, 10));
  }, []);

  const handleAddLinea = () => {
    if (materiales.length === 0) return;
    const primerMat = materiales[0];
    setLineas((prev) => [
      ...prev,
      {
        material_id: primerMat.id,
        cantidad_pedida: 10,
        precio_unitario_crc: primerMat.costo_unitario_crc || 1000,
      },
    ]);
  };

  const handleUpdateLinea = (idx, field, val) => {
    setLineas((prev) => {
      const copy = [...prev];
      if (field === 'material_id') {
        const mat = materiales.find((m) => m.id === Number(val));
        copy[idx] = {
          ...copy[idx],
          material_id: Number(val),
          precio_unitario_crc: mat ? mat.costo_unitario_crc : copy[idx].precio_unitario_crc,
        };
      } else {
        copy[idx] = {
          ...copy[idx],
          [field]: Number(val),
        };
      }
      return copy;
    });
  };

  const handleRemoveLinea = (idx) => {
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalCalculado = lineas.reduce(
    (acc, l) => acc + (Number(l.cantidad_pedida || 0) * Number(l.precio_unitario_crc || 0)),
    0
  );

  const nivelRequerido =
    totalCalculado > 25000000
      ? 'NIVEL_3 (Gerencia General / Admin)'
      : totalCalculado >= 5000000
      ? 'NIVEL_2 (Jefatura de Operaciones)'
      : 'NIVEL_1 (Encargado de Compras)';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (lineas.length === 0) {
      setError('Debe agregar al menos una línea de material a la orden.');
      return;
    }

    try {
      setLoading(true);
      await api.ordenes.create({
        proveedor_id: Number(proveedorId),
        fecha_entrega_estimada: fechaEntregaEstimada,
        observaciones,
        items: lineas.map((l) => ({
          material_id: Number(l.material_id),
          cantidad_pedida: Number(l.cantidad_pedida),
          precio_unitario_crc: Number(l.precio_unitario_crc),
        })),
      });
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Error al emitir orden de compra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} color="#15803D" />
            <span className="modal-title">Emitir Nueva Orden de Compra</span>
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
                <label className="form-label">Proveedor</label>
                <select
                  className="form-select"
                  required
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                >
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} — {p.razon_social} ({p.identificacion_fiscal})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fecha Estimada de Entrega</label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={fechaEntregaEstimada}
                  onChange={(e) => setFechaEntregaEstimada(e.target.value)}
                />
              </div>
            </div>

            {/* Líneas de Material */}
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Líneas de la Orden</label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLinea}>
                  <Plus size={14} />
                  <span>Agregar Línea</span>
                </button>
              </div>

              {lineas.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                  No ha agregado materiales a la orden. Haga clic en "Agregar Línea".
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th style={{ width: '130px' }}>Cantidad</th>
                      <th style={{ width: '150px' }}>Precio Unitario (CRC)</th>
                      <th>Subtotal</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l, idx) => (
                      <tr key={idx}>
                        <td>
                          <select
                            className="form-select"
                            value={l.material_id}
                            onChange={(e) => handleUpdateLinea(idx, 'material_id', e.target.value)}
                          >
                            {materiales.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.codigo} — {m.nombre} ({m.unidad_medida})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            className="form-input"
                            required
                            value={l.cantidad_pedida}
                            onChange={(e) => handleUpdateLinea(idx, 'cantidad_pedida', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            className="form-input"
                            required
                            value={l.precio_unitario_crc}
                            onChange={(e) => handleUpdateLinea(idx, 'precio_unitario_crc', e.target.value)}
                          />
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {formatMoneda(Number(l.cantidad_pedida || 0) * Number(l.precio_unitario_crc || 0))}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#DC2626' }}
                            onClick={() => handleRemoveLinea(idx)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Resumen Financiero y Nivel SoD */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>NIVEL DE AUTORIZACIÓN REQUERIDO</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#15803D', marginTop: '4px' }}>
                  {nivelRequerido}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                  Regla SoD: El usuario creador queda inhabilitado para autorizar la orden.
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>IMPORTE TOTAL DE LA ORDEN</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                  {formatMoneda(totalCalculado)}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones y Justificación de Compra</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Frente de trabajo o destino programado..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || lineas.length === 0}>
              {loading ? 'Emitiendo Orden...' : 'Emitir Orden de Compra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

