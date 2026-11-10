import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { MapPin, X, AlertTriangle } from 'lucide-react';

export const UbicacionModal = ({ ubicacion, onClose, onSuccess }) => {
  const isEditing = Boolean(ubicacion);

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    tipo: 'BODEGA_OBRA',
    direccion: '',
    responsable: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (ubicacion) {
      setFormData({
        codigo: ubicacion.codigo,
        nombre: ubicacion.nombre,
        tipo: ubicacion.tipo,
        direccion: ubicacion.direccion,
        responsable: ubicacion.responsable,
      });
    }
  }, [ubicacion]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      if (isEditing) {
        await api.ubicaciones.update(ubicacion.id, formData);
      } else {
        await api.ubicaciones.create(formData);
      }
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Error al guardar ubicación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} color="#15803D" />
            <span className="modal-title">
              {isEditing ? `Modificar Ubicación — ${ubicacion.codigo}` : 'Registrar Nueva Ubicación / Bodega'}
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

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Código</label>
                <input
                  type="text"
                  name="codigo"
                  className="form-input"
                  required
                  placeholder="ej. BDO-003"
                  value={formData.codigo}
                  onChange={handleChange}
                  disabled={isEditing}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre de Bodega / Frente</label>
                <input
                  type="text"
                  name="nombre"
                  className="form-input"
                  required
                  placeholder="ej. Bodega Obra Torre Sur"
                  value={formData.nombre}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Tipo de Ubicación</label>
                <select name="tipo" className="form-select" value={formData.tipo} onChange={handleChange}>
                  <option value="ALMACEN_CENTRAL">Almacén Central</option>
                  <option value="BODEGA_OBRA">Bodega de Obra</option>
                  <option value="FRENTE_TRABAJO">Frente de Trabajo</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Responsable Asignado</label>
                <input
                  type="text"
                  name="responsable"
                  className="form-input"
                  required
                  placeholder="ej. Ing. Carlos Alvarado"
                  value={formData.responsable}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Dirección / Ubicación Física</label>
              <input
                type="text"
                name="direccion"
                className="form-input"
                required
                placeholder="Provincia, Cantón, Proyecto..."
                value={formData.direccion}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Ubicación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

