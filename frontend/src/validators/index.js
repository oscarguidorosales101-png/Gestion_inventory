/**
 * Validadores del dominio Gestion_inventory
 */

export function validarMaterialFormulas({
  demanda_promedio_diaria,
  demanda_maxima_diaria,
  tiempo_entrega_dias,
  stock_minimo,
  stock_maximo,
}) {
  const errores = [];

  const dProm = Number(demanda_promedio_diaria);
  const dMax = Number(demanda_maxima_diaria);
  const L = Number(tiempo_entrega_dias);
  const sMin = Number(stock_minimo);
  const sMax = Number(stock_maximo);

  if (isNaN(dProm) || dProm <= 0) {
    errores.push('La demanda promedio diaria debe ser mayor a 0.');
  }

  if (isNaN(dMax) || dMax <= 0) {
    errores.push('La demanda máxima diaria debe ser mayor a 0.');
  }

  if (dMax < dProm) {
    errores.push('La demanda máxima no puede ser inferior a la demanda promedio (CP-CALC-06).');
  }

  if (isNaN(L) || L < 1 || !Number.isInteger(L)) {
    errores.push('El tiempo de entrega (L) debe ser un número entero mayor o igual a 1 (CP-CALC-07).');
  }

  if (sMax <= sMin) {
    errores.push('El stock máximo debe ser estrictamente mayor al stock mínimo.');
  }

  // Calculo de SS y PR
  const stockSeguridad = Math.max(0, (dMax - dProm) * L);
  const puntoReorden = (dProm * L) + stockSeguridad;

  return {
    valido: errores.length === 0,
    errores,
    calculado: {
      stock_seguridad: Number(stockSeguridad.toFixed(2)),
      punto_reorden: Number(puntoReorden.toFixed(2)),
    },
  };
}

export function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

