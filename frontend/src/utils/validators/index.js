/**
 * Utilidades de validación para formularios y modelos de datos
 */

export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

export function isPositiveNumber(val) {
  const num = Number(val);
  return !isNaN(num) && num > 0;
}

export function isNonNegativeNumber(val) {
  const num = Number(val);
  return !isNaN(num) && num >= 0;
}

export function isValidPassword(password) {
  // Al menos 8 caracteres
  return typeof password === 'string' && password.length >= 8;
}

export function validateMaterialForm(data) {
  const errors = {};
  if (!isNonEmptyString(data.sku)) errors.sku = 'El código SKU es obligatorio';
  if (!isNonEmptyString(data.nombre)) errors.nombre = 'El nombre del material es obligatorio';
  if (!data.categoria_id) errors.categoria_id = 'La categoría es obligatoria';
  if (!isNonEmptyString(data.unidad_medida)) errors.unidad_medida = 'La unidad de medida es obligatoria';
  if (!isNonNegativeNumber(data.stock_minimo)) errors.stock_minimo = 'El stock mínimo debe ser un número mayor o igual a 0';
  if (!isNonNegativeNumber(data.punto_reorden)) errors.punto_reorden = 'El punto de reorden debe ser un número mayor o igual a 0';
  if (Number(data.stock_minimo) > Number(data.punto_reorden)) {
    errors.punto_reorden = 'El punto de reorden debe ser mayor o igual al stock mínimo';
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateOrdenForm(data) {
  const errors = {};
  if (!data.proveedor_id) errors.proveedor_id = 'El proveedor es obligatorio';
  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.items = 'La orden debe contener al menos un ítem';
  } else {
    data.items.forEach((item, idx) => {
      if (!item.material_id) errors[`item_${idx}_material`] = 'El material es obligatorio';
      if (!isPositiveNumber(item.cantidad)) errors[`item_${idx}_cantidad`] = 'La cantidad debe ser mayor a 0';
      if (!isNonNegativeNumber(item.precio_unitario)) errors[`item_${idx}_precio`] = 'El precio debe ser mayor o igual a 0';
    });
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

export default {
  isValidEmail,
  isNonEmptyString,
  isPositiveNumber,
  isNonNegativeNumber,
  isValidPassword,
  validateMaterialForm,
  validateOrdenForm,
};

