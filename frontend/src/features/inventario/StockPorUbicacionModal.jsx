import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatNumero, formatTipoUbicacion } from '../../utils/formatters';
import { MapPin, X, Activity } from 'lucide-react';

export const StockPorUbicacionModal = ({ material, onClose }) => {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDesglose() {
      try {
        setLoading(true);
        const res = await api.inventario.getDesgloseUbicaciones(material.id);
        const dataList = Array.isArray(res.data) ? res.data : (res.data?.ubicaciones || []);
        setUbicaciones(dataList);
      } catch (err) {
        console.error('Error al cargar desglose por ubicación:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDesglose();
  }, [material.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Existencias por Bodega / Ubicación</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
              {material.codigo} — {material.nombre}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
              <Activity size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
              <p>Consultando saldo por bodega...</p>
            </div>
          ) : ubicaciones.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bodega / Ubicación</th>
                  <th>Tipo</th>
                  <th>Responsable</th>
                  <th>Stock Actual</th>
                </tr>
              </thead>
              <tbody>
                {ubicaciones.map((ub) => (
                  <tr key={ub.ubicacion_id}>
                    <td style={{ fontWeight: 600 }}>{ub.ubicacion_nombre}</td>
                    <td><span className="badge badge-gray">{formatTipoUbicacion(ub.tipo)}</span></td>
                    <td>{ub.responsable}</td>
                    <td style={{ fontWeight: 700, color: '#15803D' }}>
                      {formatNumero(ub.stock_ubicacion ?? ub.existencia_actual ?? ub.stock_actual ?? 0)} {material.unidad_medida}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              Este material no registra existencias en ninguna bodega actualmente.
            </div>
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

