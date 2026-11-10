import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Building2, X, AlertTriangle } from 'lucide-react';

export const ProveedorModal = ({ proveedor, onClose, onSuccess }) => {
  const isEditing = Boolean(proveedor);

  const [formData, setFormData] = useState({
    codigo: '',
    razon_social: '',
    identificacion_fiscal: '',
    contacto_nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    tiempo_entrega_dias: 3,
    calificacion: 5.0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (proveedor) {
      setFormData({
        codigo: proveedor.codigo,
        razon_social: proveedor.razon_social,
        identificacion_fiscal: proveedor.identificacion_fiscal,
        contacto_nombre: proveedor.contacto_nombre,
        telefono: proveedor.telefono,
        email: proveedor.email,
        direccion: proveedor.direccion || '',
        tiempo_entrega_dias: proveedor.tiempo_entrega_dias,
        calificacion: proveedor.calificacion,
      });
    }
  }, [proveedor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const payload = {
        ...formData,
        tiempo_entrega_dias: Number(formData.tiempo_entrega_dias),
        calificacion: Number(formData.calificacion),
      };
      if (isEditing) {
        await api.proveedores.update(proveedor.id, payload);
      } else {
        await api.proveedores.create(payload);
      }
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Error al guardar proveedor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} color="#15803D" />
            <span className="modal-title">
              {isEditing ? `Modificar Proveedor — ${proveedor.codigo}` : 'Registrar Nuevo Proveedor'}
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
                <label className="form-label">Código Proveedor</label>
                <input
                  type="text"
                  name="codigo"
                  className="form-input"
                  required
                  placeholder="ej. PROV-004"
                  value={formData.codigo}
                  onChange={handleChange}
                  disabled={isEditing}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Razón Social</label>
                <input
                  type="text"
                  name="razon_social"
                  className="form-input"
                  required
                  placeholder="ej. Concretos del Pacífico S.A."
                  value={formData.razon_social}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Cédula Jurídica / ID Fiscal</label>
                <input
                  type="text"
                  name="identificacion_fiscal"
                  className="form-input"
                  required
                  placeholder="ej. 3-101-889900"
                  value={formData.identificacion_fiscal}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del Contacto</label>
                <input
                  type="text"
                  name="contacto_nombre"
                  className="form-input"
                  required
                  placeholder="ej. Mariana Brenes Soto"
                  value={formData.contacto_nombre}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input
                  type="text"
                  name="telefono"
                  className="form-input"
                  required
                  placeholder="+506 2200-0000"
                  value={formData.telefono}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  required
                  placeholder="ventas@proveedor.cr"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Tiempo de Entrega / Lead Time (L en días)</label>
                <input
                  type="number"
                  name="tiempo_entrega_dias"
                  className="form-input"
                  required
                  min={1}
                  value={formData.tiempo_entrega_dias}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Calificación Inicial (1 a 5)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  name="calificacion"
                  className="form-input"
                  required
                  value={formData.calificacion}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Dirección Fiscal / Plantel</label>
              <input
                type="text"
                name="direccion"
                className="form-input"
                placeholder="Provincia, Cantón, Bodega..."
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
              {loading ? 'Guardando...' : 'Guardar Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

