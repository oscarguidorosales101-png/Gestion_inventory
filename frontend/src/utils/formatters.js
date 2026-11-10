import { MONEDA } from '../constants/moneda';

export function formatMoneda(monto) {
  if (monto === null || monto === undefined || isNaN(monto)) return '₡0,00';
  return Number(monto).toLocaleString(MONEDA.LOCALE, {
    style: 'currency',
    currency: MONEDA.CODIGO,
    minimumFractionDigits: MONEDA.DECIMALES,
    maximumFractionDigits: MONEDA.DECIMALES,
  });
}

export function formatFecha(fecha, incluirHora = false) {
  if (!fecha) return '-';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '-';
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(incluirHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  };
  return d.toLocaleDateString(MONEDA.LOCALE, options);
}

export function formatNumero(num, decimales = 2) {
  if (num === null || num === undefined || isNaN(num)) return '0,00';
  return Number(num).toLocaleString(MONEDA.LOCALE, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export function getEstadoStockBadgeClass(estado) {
  switch (estado) {
    case 'STOCK_CRITICO':
    case 'CRITICO':
      return 'badge-critico';
    case 'PUNTO_REORDEN':
    case 'REORDEN':
      return 'badge-reorden';
    default:
      return 'badge-normal';
  }
}

