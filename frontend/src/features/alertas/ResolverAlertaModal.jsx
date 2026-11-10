import React, { useState } from 'react';
import { api } from '../../services/api';
import { CheckCircle, X, AlertTriangle } from 'lucide-react';

export const ResolverAlertaModal = ({ alerta, onClose, onSuccess }) => {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError('Debe indicar un motivo de resolución formal.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.alertas.resolver(alerta.id, motivo.trim());
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Error al resolver alerta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={20} color="#15803D" />
            <span className="modal-title">Resolver Alerta #{alerta.id}</span>
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

            <p style={{ fontSize: '0.875rem', marginBottom: '14px', color: '#0F172A' }}>
              <strong>Incidencia:</strong> {alerta.mensaje}
            </p>

            <div className="form-group">
              <label className="form-label">Acción Tomada / Motivo de Cierre</label>
              <textarea
                className="form-textarea"
                rows={3}
                required
                placeholder="ej. Se emitió orden de compra de emergencia con el proveedor principal..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Resolviendo...' : 'Marcar Alerta como Resuelta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

