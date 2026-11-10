import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';
import { formatMoneda, formatFecha, formatNumero, formatTipoMovimiento } from '../../utils/formatters';
import { History, Plus, RefreshCw, Search, ArrowUpRight, ArrowDownLeft, SlidersHorizontal } from 'lucide-react';
import { MovimientoModal } from './MovimientoModal';

export const MovimientosLedger = () => {
  const { user } = useAuth();
  const canRegister = [ROLES.ADMINISTRADOR, ROLES.ENCARGADO_INVENTARIO].includes(user?.rol);

  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const cargarMovimientos = async () => {
    try {
      setLoading(true);
      const res = await api.movimientos.getAll({
        tipo: tipoFiltro || undefined,
      });
      setMovimientos(res.data || []);
    } catch (err) {
      console.error('Error al cargar movimientos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMovimientos();
  }, [tipoFiltro]);

  return (
    <div>
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} color="#15803D" />
            <div className="card-table-title">Libro Mayor de Movimientos (Kardex Inmutable)</div>
          </div>

          <div className="card-table-actions">
            <select
              className="form-select"
              style={{ width: '180px' }}
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
            >
              <option value="">Todos los Tipos</option>
              <option value="ENTRADA">Entrada</option>
              <option value="SALIDA">Salida (Consumo)</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="AJUSTE">Ajuste de Inventario</option>
            </select>

            <button className="btn btn-secondary btn-sm" onClick={cargarMovimientos}>
              <RefreshCw size={14} />
            </button>

            {canRegister && (
              <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
                <Plus size={14} />
                <span>Registrar Movimiento</span>
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha / Hora</th>
                <th>Tipo</th>
                <th>Material</th>
                <th>Cantidad</th>
                <th>Costo Unitario</th>
                <th>Valor Total</th>
                <th>Origen</th>
                <th>Destino</th>
                <th>Responsable</th>
                <th>Motivo / Referencia</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    Consultando libro mayor en base de datos...
                  </td>
                </tr>
              ) : movimientos.length > 0 ? (
                movimientos.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>#{m.id}</td>
                    <td>{formatFecha(m.fecha_movimiento, true)}</td>
                    <td>
                      <span className={`badge ${
                        m.tipo === 'ENTRADA' ? 'badge-normal' :
                        m.tipo === 'SALIDA' ? 'badge-critico' : 'badge-blue'
                      }`}>
                        {formatTipoMovimiento(m.tipo)}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{m.material_nombre} ({m.material_sku})</td>
                    <td style={{ fontWeight: 700, color: m.tipo === 'ENTRADA' ? '#15803D' : m.tipo === 'SALIDA' ? '#DC2626' : '#0F172A' }}>
                      {m.tipo === 'ENTRADA' ? '+' : m.tipo === 'SALIDA' ? '-' : ''}
                      {formatNumero(m.cantidad)} {m.unidad_medida}
                    </td>
                    <td>{formatMoneda(m.costo_unitario_crc)}</td>
                    <td style={{ fontWeight: 600 }}>
                      {formatMoneda(Number(m.cantidad || 0) * Number(m.costo_unitario_crc || 0))}
                    </td>
                    <td>{m.origen_nombre || '-'}</td>
                    <td>{m.destino_nombre || '-'}</td>
                    <td>{m.responsable_nombre}</td>
                    <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.motivo || m.referencia || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="empty-state">
                    No hay registros de movimientos en el libro mayor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <MovimientoModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            cargarMovimientos();
          }}
        />
      )}
    </div>
  );
};

