import React, { useState } from 'react';
import { api } from '../../services/api';
import { X, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CambioPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  obligatorio?: boolean;
}

export const CambioPasswordModal: React.FC<CambioPasswordModalProps> = ({
  isOpen,
  onClose,
  obligatorio = false,
}) => {
  const { refreshProfile } = useAuth();
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passwordNueva !== passwordConfirm) {
      setError('La nueva contraseÃ±a y su confirmacion no coinciden.');
      return;
    }

    if (passwordNueva.length < 8) {
      setError('La nueva contraseÃ±a debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await api.auth.cambiarPassword({ passwordActual, passwordNueva });
      setSuccess(true);
      await refreshProfile();
      setTimeout(() => {
        setSuccess(false);
        setPasswordActual('');
        setPasswordNueva('');
        setPasswordConfirm('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar contraseÃ±a.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <Lock size={18} style={{ display: 'inline', marginRight: '6px' }} />
            <span>Actualizar ContraseÃ±a</span>
          </div>
          {!obligatorio && (
            <button className="modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {obligatorio && (
              <div className="alert-banner alert-warning">
                <AlertCircle size={18} />
                <span>Por motivos de seguridad, debe actualizar su contraseÃ±a temporal antes de continuar.</span>
              </div>
            )}

            {error && (
              <div className="alert-banner alert-danger">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert-banner alert-success">
                <CheckCircle2 size={18} />
                <span>ContraseÃ±a actualizada satisfactoriamente.</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">ContraseÃ±a Actual</label>
              <input
                type="password"
                className="form-control"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nueva ContraseÃ±a (minimo 8 caracteres)</label>
              <input
                type="password"
                className="form-control"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar Nueva ContraseÃ±a</label>
              <input
                type="password"
                className="form-control"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="modal-footer">
            {!obligatorio && (
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Nueva Clave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

