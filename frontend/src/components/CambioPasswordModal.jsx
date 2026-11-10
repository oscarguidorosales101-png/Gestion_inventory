import React, { useState } from 'react';
import { api } from '../services/api';
import { KeyRound, X, AlertTriangle, CheckCircle } from 'lucide-react';

export const CambioPasswordModal = ({ onClose }) => {
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (passwordNueva !== confirmacion) {
      setError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    if (passwordNueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    try {
      setLoading(true);
      await api.auth.cambiarPassword({ passwordActual, passwordNueva });
      setExito(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err?.message || 'Error al cambiar contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={20} color="#15803D" />
            <span className="modal-title">Actualizar Contraseña de Acceso</span>
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

            {exito && (
              <div className="alert-banner alert-info">
                <CheckCircle size={18} />
                <span>Contraseña actualizada correctamente.</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Contraseña Actual</label>
              <input
                type="password"
                className="form-input"
                required
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nueva Contraseña (mínimo 8 caracteres)</label>
              <input
                type="password"
                className="form-input"
                required
                minLength={8}
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                className="form-input"
                required
                minLength={8}
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || exito}>
              {loading ? 'Guardando...' : 'Actualizar Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

