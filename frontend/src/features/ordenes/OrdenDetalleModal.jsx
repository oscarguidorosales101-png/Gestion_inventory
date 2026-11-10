import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatMoneda, formatFecha, formatNumero } from '../../utils/formatters';
import { ShoppingCart, X, Activity } from 'lucide-react';

export const OrdenDetalleModal = ({ ordenId, onClose }) => {
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api.ordenes.getById(ordenId);
        setOrden(res.data);
      } catch (err) {
        console.error('Error al cargar orden:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ordenId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} color="#15803D" />
            <span className="modal-title">Detalle de Orden de Compra {orden?.numero_orden || ''}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
              <Activity size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
              <p>Cargando información de orden desde MySQL...</p>
            </div>
          ) : orden ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>PROVEEDOR</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{orden.proveedor_nombre}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>FECHA EMISIÓN</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatFecha(orden.fecha_emision)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>ESTADO</div>
                  <div><span className="badge badge-normal">{orden.estado}</span></div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>CREADO POR</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{orden.creador_nombre}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>TOTAL (CRC)</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#15803D' }}>{formatMoneda(orden.total_crc)}</div>
                </div>
              </div>

              <div className="card-table-title" style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
                Líneas de Material Pedidas
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Unidad</th>
                    <th>Cantidad Pedida</th>
                    <th>Cantidad Recibida</th>
                    <th>Precio Unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(orden.detalles || []).map((d) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{d.material_nombre} ({d.material_sku})</td>
                      <td>{d.unidad_medida}</td>
                      <td>{formatNumero(d.cantidad_pedida)}</td>
                      <td style={{ fontWeight: 600, color: Number(d.cantidad_recibida) > 0 ? '#15803D' : '#64748B' }}>
                        {formatNumero(d.cantidad_recibida || 0)}
                      </td>
                      <td>{formatMoneda(d.precio_unitario_crc)}</td>
                      <td style={{ fontWeight: 600 }}>{formatMoneda(d.subtotal_crc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {orden.observaciones && (
                <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#64748B' }}>
                  <strong>Observaciones:</strong> {orden.observaciones}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">No se pudo cargar la orden.</div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

