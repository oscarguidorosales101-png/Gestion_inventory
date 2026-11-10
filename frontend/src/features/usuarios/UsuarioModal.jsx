import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ROLES } from '../../constants/roles';
import { Users, X, AlertTriangle } from 'lucide-react';

export const UsuarioModal = ({ usuario, onClose, onSuccess }) => {
  const isEditing = Boolean(usuario);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: ROLES.CONSULTA,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (usuario) {
      setFormData({
        nombre: usuario.nombre,
        email: usuario.email,
        password: '',
        rol: usuario.rol,
      });
    }
  }, [usuario]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isEditing && formData.password.length < 8) {
      setError('La contraseña inicial debe contener al menos 8 caracteres.');
      return;
    }

    try {
      setLoading(true);
      if (isEditing) {
        await api.usuarios.update(usuario.id, {
          nombre: formData.nombre,
          rol: formData.rol,
        });
      } else {
        await api.usuarios.create(formData);
      }
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Error al guardar usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#15803D" />
            <span className="modal-title">
              {isEditing ? `Modificar Usuario — ${usuario.nombre}` : 'Registrar Nuevo Usuario'}
            </span>
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
              <label className="form-label">Nombre Completo</label>
              <input
                type="text"
                name="nombre"
                className="form-input"
                required
                placeholder="ej. Ana María Vargas Castro"
                value={formData.nombre}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Correo Electrónico Institucional</label>
              <input
                type="email"
                name="email"
                className="form-input"
                required
                placeholder="usuario@empresaficticiapendiente.cr"
                value={formData.email}
                onChange={handleChange}
                disabled={isEditing}
              />
            </div>

            {!isEditing && (
              <div className="form-group">
                <label className="form-label">Contraseña Temporal Inicial (min 8 caracteres)</label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Rol Institucional (Privilegios RBAC)</label>
              <select name="rol" className="form-select" value={formData.rol} onChange={handleChange}>
                <option value={ROLES.ADMINISTRADOR}>Administrador General</option>
                <option value={ROLES.ENCARGADO_INVENTARIO}>Encargado de Inventario</option>
                <option value={ROLES.COMPRAS}>Analista de Compras</option>
                <option value={ROLES.CONSULTA}>Auditor de Consulta</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

