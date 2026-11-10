import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { validarMaterialFormulas } from '../../validators';
import { Package, X, AlertTriangle, Calculator } from 'lucide-react';

export const MaterialModal = ({ material, categorias, proveedores, onClose, onSuccess }) => {
  const isEditing = Boolean(material);

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria_id: categorias[0]?.id || 1,
    proveedor_principal_id: proveedores[0]?.id || '',
    unidad_medida: 'UNIDAD',
    costo_unitario_crc: 1000,
    stock_minimo: 10,
    stock_maximo: 500,
    demanda_promedio_diaria: 5,
    demanda_maxima_diaria: 10,
    tiempo_entrega_dias: 3,
  });

  const [erroresValidacion, setErroresValidacion] = useState([]);
  const [formulasCalculadas, setFormulasCalculadas] = useState({ stock_seguridad: 0, punto_reorden: 0 });
  const [loading, setLoading] = useState(false);
  const [errorBackend, setErrorBackend] = useState(null);

  useEffect(() => {
    if (material) {
      setFormData({
        codigo: material.codigo,
        nombre: material.nombre,
        descripcion: material.descripcion || '',
        categoria_id: material.categoria_id,
        proveedor_principal_id: material.proveedor_principal_id || '',
        unidad_medida: material.unidad_medida,
        costo_unitario_crc: material.costo_unitario_crc,
        stock_minimo: material.stock_minimo,
        stock_maximo: material.stock_maximo,
        demanda_promedio_diaria: material.demanda_promedio_diaria,
        demanda_maxima_diaria: material.demanda_maxima_diaria,
        tiempo_entrega_dias: material.tiempo_entrega_dias,
      });
    }
  }, [material]);

  // Recalculo en tiempo real de SS y PR
  useEffect(() => {
    const val = validarMaterialFormulas({
      demanda_promedio_diaria: formData.demanda_promedio_diaria,
      demanda_maxima_diaria: formData.demanda_maxima_diaria,
      tiempo_entrega_dias: formData.tiempo_entrega_dias,
      stock_minimo: formData.stock_minimo,
      stock_maximo: formData.stock_maximo,
    });
    setErroresValidacion(val.errores);
    setFormulasCalculadas(val.calculado);
  }, [
    formData.demanda_promedio_diaria,
    formData.demanda_maxima_diaria,
    formData.tiempo_entrega_dias,
    formData.stock_minimo,
    formData.stock_maximo,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorBackend(null);

    if (erroresValidacion.length > 0) {
      setErrorBackend('Corrija los errores de validación de fórmulas antes de guardar.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        categoria_id: Number(formData.categoria_id),
        proveedor_principal_id: formData.proveedor_principal_id ? Number(formData.proveedor_principal_id) : null,
        costo_unitario_crc: Number(formData.costo_unitario_crc),
        stock_minimo: Number(formData.stock_minimo),
        stock_maximo: Number(formData.stock_maximo),
        demanda_promedio_diaria: Number(formData.demanda_promedio_diaria),
        demanda_maxima_diaria: Number(formData.demanda_maxima_diaria),
        tiempo_entrega_dias: Number(formData.tiempo_entrega_dias),
      };

      if (isEditing) {
        await api.materiales.update(material.id, payload);
      } else {
        await api.materiales.create(payload);
      }
      onSuccess();
    } catch (err) {
      setErrorBackend(err?.message || 'Error al persistir el material en base de datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={20} color="#15803D" />
            <span className="modal-title">
              {isEditing ? `Modificar Material — ${material.codigo}` : 'Registrar Nuevo Material en Catálogo'}
            </span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorBackend && (
              <div className="alert-banner alert-danger">
                <AlertTriangle size={18} />
                <span>{errorBackend}</span>
              </div>
            )}

            {erroresValidacion.length > 0 && (
              <div className="alert-banner alert-warning">
                <AlertTriangle size={18} />
                <div>
                  <strong>Reglas de Dominio Incumplidas:</strong>
                  <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                    {erroresValidacion.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Código SKU</label>
                <input
                  type="text"
                  name="codigo"
                  className="form-input"
                  required
                  placeholder="ej. MAT-EST-001"
                  value={formData.codigo}
                  onChange={handleChange}
                  disabled={isEditing}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del Material</label>
                <input
                  type="text"
                  name="nombre"
                  className="form-input"
                  required
                  placeholder="ej. Cemento Portland Tipo I (Saco 50kg)"
                  value={formData.nombre}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Categoría de Gasto</label>
                <select
                  name="categoria_id"
                  className="form-select"
                  value={formData.categoria_id}
                  onChange={handleChange}
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Unidad de Medida</label>
                <input
                  type="text"
                  name="unidad_medida"
                  className="form-input"
                  required
                  placeholder="SACO, KG, M3, UNIDAD..."
                  value={formData.unidad_medida}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Costo Unitario (CRC)</label>
                <input
                  type="number"
                  step="0.01"
                  name="costo_unitario_crc"
                  className="form-input"
                  required
                  value={formData.costo_unitario_crc}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Panel de Parámetros de Fórmulas de Inventario */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Calculator size={18} color="#15803D" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                  Parámetros Dinámicos de Stock de Seguridad (SS) y Punto de Reorden (PR)
                </span>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">D. Promedio Diaria</label>
                  <input
                    type="number"
                    step="0.01"
                    name="demanda_promedio_diaria"
                    className="form-input"
                    required
                    value={formData.demanda_promedio_diaria}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">D. Máxima Diaria (Dmax)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="demanda_maxima_diaria"
                    className="form-input"
                    required
                    value={formData.demanda_maxima_diaria}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Lead Time / Entrega (L en días)</label>
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
              </div>

              {/* Vista Previa de Fórmulas Calculadas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px', padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Fórmula SS = (Dmax - Dprom) × L</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803D', marginTop: '2px' }}>
                    SS Calculado: {formulasCalculadas.stock_seguridad} {formData.unidad_medida}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Fórmula PR = (Dprom × L) + SS</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#B45309', marginTop: '2px' }}>
                    PR Calculado: {formulasCalculadas.punto_reorden} {formData.unidad_medida}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Stock Mínimo</label>
                <input
                  type="number"
                  step="0.01"
                  name="stock_minimo"
                  className="form-input"
                  required
                  value={formData.stock_minimo}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Stock Máximo</label>
                <input
                  type="number"
                  step="0.01"
                  name="stock_maximo"
                  className="form-input"
                  required
                  value={formData.stock_maximo}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || erroresValidacion.length > 0}
            >
              {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

