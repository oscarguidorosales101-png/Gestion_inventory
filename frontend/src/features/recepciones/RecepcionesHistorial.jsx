import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';
import { formatFecha, formatNumero } from '../../utils/formatters';
import { ArrowDownToLine, RefreshCw, Plus, Search, Building2, MapPin } from 'lucide-react';
import { RecepcionModal } from './RecepcionModal';

export const RecepcionesHistorial = () => {
  const { user } = useAuth();
  const canReceive = [ROLES.ADMINISTRADOR, ROLES.ENCARGADO_INVENTARIO].includes(user?.rol);

  const [recepciones, setRecepciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const cargarRecepciones = async () => {
    try {
      setLoading(true);
      const res = await api.recepciones.getAll();
      setRecepciones(res.data || []);
    } catch (err) {
      console.error('Error al cargar recepciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRecepciones();
  }, []);

  return (
    <div>
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowDownToLine size={20} color="#15803D" />
            <div className="card-table-title">Historial de Recepciones Físicas en Bodega</div>
          </div>

          <div className="card-table-actions">
            <button className="btn btn-secondary btn-sm" onClick={cargarRecepciones}>
              <RefreshCw size={14} />
              <span>Refrescar</span>
            </button>
            {canReceive && (
              <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
                <Plus size={14} />
                <span>Registrar Recepción de Orden</span>
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>N° Movimiento</th>
                <th>Fecha Recepción</th>
                <th>Orden de Compra</th>
                <th>Proveedor</th>
                <th>Material</th>
                <th>Cantidad Recibida</th>
                <th>Bodega Destino</th>
                <th>Receptor Autorizado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    Cargando historial de recepciones desde MySQL...
                  </td>
                </tr>
              ) : recepciones.length > 0 ? (
                recepciones.map((rec) => (
                  <tr key={rec.id}>
                    <td style={{ fontWeight: 600 }}>MOV-#{rec.id}</td>
                    <td>{formatFecha(rec.fecha_movimiento || rec.created_at, true)}</td>
                    <td style={{ fontWeight: 600 }}>{rec.numero_orden || `OC #${rec.orden_id}`}</td>
                    <td>{rec.proveedor_nombre}</td>
                    <td>{rec.material_nombre} ({rec.material_sku})</td>
                    <td style={{ fontWeight: 700, color: '#15803D' }}>
                      +{formatNumero(rec.cantidad_recibida || rec.cantidad)} {rec.unidad_medida}
                    </td>
                    <td>{rec.ubicacion_destino_nombre}</td>
                    <td>{rec.usuario_receptor_nombre}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="empty-state">
                    No se han registrado recepciones físicas de órdenes aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <RecepcionModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            cargarRecepciones();
          }}
        />
      )}
    </div>
  );
};

