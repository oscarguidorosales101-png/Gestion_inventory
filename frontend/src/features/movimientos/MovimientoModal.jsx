import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatTipoUbicacion } from '../../utils/formatters';
import { History, X, AlertTriangle } from 'lucide-react';

export const MovimientoModal = ({ onClose, onSuccess }) => {
  const [materiales, setMateriales] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [tipo, setTipo] = useState('SALIDA');
  const [materialId, setMaterialId] = useState('');
  const [ubicacionOrigenId, setUbicacionOrigenId] = useState('');
  const [ubicacionDestinoId, setUbicacionDestinoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const [resM, resU] = await Promise.all([
          api.materiales.getAll(),
          api.ubicaciones.getAll(),
        ]);
        setMateriales(resM.data || []);
        setUbicaciones(resU.data || []);
        if (resM.data?.length > 0) setMaterialId(resM.data[0].id);
        if (resU.data?.length > 0) {
          setUbicacionOrigenId(resU.data[0].id);
          if (resU.data.length > 1) {
            setUbicacionDestinoId(resU.data[1].id);
          } else {
            setUbicacionDestinoId(resU.data[0].id);
          }
        }
      } catch (err) {
        setError('Error al cargar datos base.');
      }
    }
    init();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (tipo === 'TRANSFERENCIA' && ubicacionOrigenId === ubicacionDestinoId) {
      setError('La bodega de origen y destino no pueden ser iguales en una transferencia.');
      return;
    }

    try {
      setLoading(true);
      await api.movimientos.registrar({
        tipo,
        material_id: Number(materialId),
        ubicacion_origen_id: (tipo === 'SALIDA' || tipo === 'TRANSFERENCIA') ? Number(ubicacionOrigenId) : null,
        ubicacion_destino_id: (tipo === 'ENTRADA' || tipo === 'TRANSFERENCIA') ? Number(ubicacionDestinoId) : null,
        cantidad: Number(cantidad),
        motivo,
        referencia,
      });
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Error al asentar movimiento en el libro mayor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} color="#15803D" />
            <span className="modal-title">Registrar Movimiento de Almacén</span>
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

            <div className="form-group">
              <label className="form-label">Tipo de Movimiento</label>
              <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="SALIDA">Salida por Consumo en Obra</option>
                <option value="TRANSFERENCIA">Transferencia entre Bodegas</option>
                <option value="AJUSTE">Ajuste / Regularización de Inventario</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Material</label>
              <select className="form-select" value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
                {materiales.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.codigo} — {m.nombre} ({m.unidad_medida})
                  </option>
                ))}
              </select>
            </div>

            {(tipo === 'SALIDA' || tipo === 'TRANSFERENCIA') && (
              <div className="form-group">
                <label className="form-label">Bodega Origen (Salida de Existencias)</label>
                <select className="form-select" value={ubicacionOrigenId} onChange={(e) => setUbicacionOrigenId(e.target.value)}>
                  {ubicaciones.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombre} ({formatTipoUbicacion(u.tipo)})</option>
                  ))}
                </select>
              </div>
            )}

            {(tipo === 'TRANSFERENCIA' || tipo === 'ENTRADA') && (
              <div className="form-group">
                <label className="form-label">Bodega Destino (Entrada de Existencias)</label>
                <select className="form-select" value={ubicacionDestinoId} onChange={(e) => setUbicacionDestinoId(e.target.value)}>
                  {ubicaciones.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombre} ({formatTipoUbicacion(u.tipo)})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Cantidad a Mover</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="form-input"
                required
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Motivo o Justificación Formal</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="ej. Requerimiento para colado de losa nivel 2..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Referencia / Boleta Física</label>
              <input
                type="text"
                className="form-input"
                placeholder="ej. VALE-OBRA-2026-089"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Asentando en Kardex...' : 'Asentar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

