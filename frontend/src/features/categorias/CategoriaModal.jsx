import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Tags, X, AlertTriangle } from 'lucide-react';

export const CategoriaModal = ({ categoria, onClose, onSuccess }) => {
  const isEditing = Boolean(categoria);

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    tipo_gasto: 'DIRECTO_OBRA',
    descripcion: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (categoria) {
      setFormData({
        codigo: categoria.codigo,
        nombre: categoria.nombre,
        tipo_gasto: categoria.tipo_gasto,
        descripcion: categoria.descripcion || '',
      });
    }
  }, [categoria]);

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
        await api.categorias.update(categoria.id, formData);
      } else {
        await api.categorias.create(formData);
      }
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Error al guardar categoría.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tags size={20} color="#15803D" />
            <span className="modal-title">
              {isEditing ? `Modificar Categoría — ${categoria.codigo}` : 'Registrar Nueva Categoría'}
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
              <label className="form-label">Código</label>
              <input
                type="text"
                name="codigo"
                className="form-input"
                required
                placeholder="ej. CAT-005"
                value={formData.codigo}
                onChange={handleChange}
                disabled={isEditing}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nombre de la Categoría</label>
              <input
                type="text"
                name="nombre"
                className="form-input"
                required
                placeholder="ej. Acabados y Pinturas Especiales"
                value={formData.nombre}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Gasto</label>
              <select
                name="tipo_gasto"
                className="form-select"
                value={formData.tipo_gasto}
                onChange={handleChange}
              >
                <option value="DIRECTO_OBRA">Directo de Obra</option>
                <option value="HERRAMIENTA_EQUIPO">Herramienta y Equipo Menor</option>
                <option value="SEGURIDAD_EPP">Seguridad y Protección (EPP)</option>
                <option value="INDIRECTO_ADMINISTRATIVO">Indirecto Administrativo</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Descripción Operativa</label>
              <textarea
                name="descripcion"
                className="form-textarea"
                rows={3}
                placeholder="Detalle los tipos de materiales incluidos..."
                value={formData.descripcion}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

