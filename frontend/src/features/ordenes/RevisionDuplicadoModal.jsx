import React, { useState } from 'react';
import { api } from '../../services/api';
import { formatMoneda } from '../../utils/formatters';
import { AlertCircle, X, AlertTriangle } from 'lucide-react';

export const RevisionDuplicadoModal = ({ orden, onClose, onSuccess }) => {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleResolver = async (resolucion) => {
    if (!motivo.trim()) {
      setError('Debe indicar una justificación o motivo formal para el registro de auditoría.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.ordenes.revisarDuplicado(orden.id, resolucion, motivo.trim());
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Error al registrar resolución del duplicado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} color="#B45309" />
            <span className="modal-title">Revisión de Posible Duplicado — {orden.numero_orden}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert-banner alert-danger">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="alert-banner alert-warning">
            El motor de auditoría preventiva n8n ha marcado esta orden debido a que coincide en proveedor, fecha o monto con la orden #{orden.orden_similar_id || 'existente'}.
          </div>

          <div style={{ marginBottom: '14px', fontSize: '0.85rem' }}>
            <div><strong>Proveedor:</strong> {orden.proveedor_nombre}</div>
            <div><strong>Importe Total:</strong> {formatMoneda(orden.total_crc)}</div>
            <div><strong>Creador:</strong> {orden.creador_nombre}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Motivo o Justificación Formal (Inmutable en Auditoría)</label>
            <textarea
              className="form-textarea"
              rows={3}
              required
              placeholder="Describa el análisis realizado (ej. Es una compra programada semanal distinta, o es una doble digitación accidental)..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={loading}
            onClick={() => handleResolver('CONFIRMAR_DUPLICADO')}
          >
            Confirmar Duplicado (Cancelar)
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={() => handleResolver('DESCARTAR_FALSO_POSITIVO')}
          >
            Descartar Falso Positivo (Habilitar)
          </button>
        </div>
      </div>
    </div>
  );
};

