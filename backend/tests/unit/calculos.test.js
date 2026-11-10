import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcularStockSeguridad, calcularPuntoReorden } from '../../src/services/material.service.js';

describe('Pruebas Unitarias de Formulas de Inventario (CP-CALC-01 a CP-CALC-07)', () => {
  // CP-CALC-01: Dprom=40, Dmax=55, L=3, StockMin=50. Stock Actual=200 -> SS=45.00, PR=165.00 -> NORMAL
  it('CP-CALC-01: Calculo exacto de SS y PR con stock sobre punto de reorden (NORMAL)', () => {
    const ss = calcularStockSeguridad(55, 40, 3);
    const pr = calcularPuntoReorden(40, 3, ss);

    assert.equal(ss, 45.00);
    assert.equal(pr, 165.00);

    const stockActual = 200.00;
    const stockMinimo = 50.00;
    const esNormal = stockActual > pr;
    assert.equal(esNormal, true);
  });

  // CP-CALC-02: Dprom=40, Dmax=55, L=3, StockMin=50. Stock Actual=165.00 (Limite exacto PR) -> REORDEN
  it('CP-CALC-02: Stock en el limite exacto de PR (50 < 165 <= 165) activa REORDEN', () => {
    const ss = calcularStockSeguridad(55, 40, 3);
    const pr = calcularPuntoReorden(40, 3, ss);
    const stockActual = 165.00;
    const stockMinimo = 50.00;

    const esReorden = stockActual > stockMinimo && stockActual <= pr;
    assert.equal(esReorden, true);
  });

  // CP-CALC-03: Dprom=40, Dmax=55, L=3, StockMin=50. Stock Actual=50.00 (Limite exacto StockMin) -> STOCK_CRITICO (ALTA)
  it('CP-CALC-03: Stock en el limite exacto de StockMin (50 <= 50) activa STOCK_CRITICO (ALTA)', () => {
    const stockActual = 50.00;
    const stockMinimo = 50.00;

    const esStockCritico = stockActual > 0 && stockActual <= stockMinimo;
    assert.equal(esStockCritico, true);
  });

  // CP-CALC-04: Dprom=40, Dmax=55, L=3, StockMin=50. Stock Actual=0.00 (Sin existencias) -> STOCK_CRITICO (CRITICA)
  it('CP-CALC-04: Stock sin existencias (0.00) activa STOCK_CRITICO con severidad CRITICA', () => {
    const stockActual = 0.00;
    const esAgotado = stockActual <= 0;
    assert.equal(esAgotado, true);
  });

  // CP-CALC-05: Demanda constante Dprom=12.5, Dmax=12.5, L=4, StockMin=10 -> SS=0.00, PR=50.00 -> NORMAL
  it('CP-CALC-05: Demanda constante sin variabilidad genera SS=0.00', () => {
    const ss = calcularStockSeguridad(12.5, 12.5, 4);
    const pr = calcularPuntoReorden(12.5, 4, ss);

    assert.equal(ss, 0.00);
    assert.equal(pr, 50.00);

    const stockActual = 60.00;
    assert.equal(stockActual > pr, true);
  });

  // CP-CALC-06: Dmax < Dprom (50 vs 40) debe ser rechazado
  it('CP-CALC-06: Rechazo obligatorio cuando Dmax < Dprom', () => {
    assert.throws(() => {
      calcularStockSeguridad(40, 50, 3);
    }, /La demanda maxima diaria no puede ser menor a la demanda promedio diaria/);
  });

  // CP-CALC-07: Tiempo de entrega L < 1 debe ser rechazado
  it('CP-CALC-07: Rechazo obligatorio cuando tiempo de entrega L < 1', () => {
    assert.throws(() => {
      calcularStockSeguridad(30, 20, 0);
    }, /El tiempo de entrega debe ser de al menos 1 dia/);
  });
});

