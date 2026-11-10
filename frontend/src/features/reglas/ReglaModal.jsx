import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatClaveRegla } from '../../utils/formatters';
import { Sliders, X, AlertTriangle } from 'lucide-react';

export const ReglaModal = ({ regla, onClose, onSuccess }) => {
  const [valorNumerico, setValorNumerico] = useState('');
  const [valorTexto, setValorTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (regla) {
      setValorNumerico(regla.valor_numerico !== null ? String(regla.valor_numerico) : '');
      setValorTexto(regla.valor_texto || '');
    }
  }, [regla]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      await api.reglas.update(regla.id, {
        valor_numerico: valorNumerico !== '' ? Number(valorNumerico) : null,
        valor_texto: valorTexto !== '' ? valorTexto : null,
      });
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Error al actualizar valor de la regla.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} color="#15803D" />
            <span className="modal-title">Modificar Regla — {formatClaveRegla(regla?.clave)}</span>
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

            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '14px' }}>
              {regla?.descripcion}
            </p>

            <div className="form-group">
              <label className="form-label">Valor Numérico (Opcional si aplica texto)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                placeholder="ej. 15.00"
                value={valorNumerico}
                onChange={(e) => setValorNumerico(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Valor Texto / Configuración (Opcional si aplica número)</label>
              <input
                type="text"
                className="form-input"
                placeholder="ej. ACTIVO, NOTIFICAR..."
                value={valorTexto}
                onChange={(e) => setValorTexto(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Regla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

