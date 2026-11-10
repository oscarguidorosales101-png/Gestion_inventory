process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import { resetTestDb } from '../helpers/resetTestDb.js';

describe('Prueba Integral E2E: Ciclo Completo de Abastecimiento e Inventario', () => {
  let server;
  let baseUrl;

  let tokenAdmin;
  let tokenCompras;
  let tokenInventario;

  before(async () => {
    resetTestDb();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        resolve();
      });
    });

    // 1. Iniciar sesion como Administrador
    const resAdm = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@empresaficticiapendiente.cr', password: 'Admin2026!Gestion' }),
    });
    assert.equal(resAdm.status, 200);
    tokenAdmin = (await resAdm.json()).data.token;

    // 2. Iniciar sesion como Compras
    const resCom = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'compras@empresaficticiapendiente.cr', password: 'Compras2026!Req' }),
    });
    assert.equal(resCom.status, 200);
    tokenCompras = (await resCom.json()).data.token;

    // 3. Iniciar sesion como Encargado de Inventario
    const resInv = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'inventario@empresaficticiapendiente.cr', password: 'Inventario2026!' }),
    });
    assert.equal(resInv.status, 200);
    tokenInventario = (await resInv.json()).data.token;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  });

  it('E2E: Flujo de abastecimiento, segregacion SoD, recepcion fisica y libro mayor', async () => {
    // Paso 1: Consultar stock inicial de Arena de Rio (ID 3)
    const resStockInicial = await fetch(`${baseUrl}/inventario?search=MAT-003`, {
      headers: { Authorization: `Bearer ${tokenInventario}` },
    });
    assert.equal(resStockInicial.status, 200);
    const matInicial = (await resStockInicial.json()).data[0];
    const stockAntes = Number(matInicial.stock_actual);

    // Paso 2: Usuario COMPRAS crea una orden de compra para Proveedor 1 (Material 3: 20 unidades a 180 CRC)
    const resCrear = await fetch(`${baseUrl}/ordenes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCompras}`,
      },
      body: JSON.stringify({
        proveedor_id: 1,
        ubicacion_destino_id: 1,
        fecha_entrega_estimada: '2026-12-15',
        observaciones: 'Pedido E2E Arena de Rio',
        items: [{ material_id: 3, cantidad_solicitada: 20, precio_unitario_crc: 180 }],
      }),
    });
    assert.equal(resCrear.status, 201);
    const orden = (await resCrear.json()).data;
    const ordenId = orden.id;
    assert.equal(orden.estado, 'PENDIENTE_APROBACION');

    // Paso 3: COMPRAS intenta aprobar su propia orden -> debe ser rechazada con 403 por SoD
    const resAutoAprob = await fetch(`${baseUrl}/ordenes/${ordenId}/aprobar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCompras}` },
    });
    assert.equal(resAutoAprob.status, 403);

    // Paso 4: INVENTARIO (usuario distinto, rol autorizado) aprueba la orden
    const resAprob = await fetch(`${baseUrl}/ordenes/${ordenId}/aprobar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenInventario}` },
    });
    assert.equal(resAprob.status, 200);
    const ordenAprobada = (await resAprob.json()).data;
    assert.equal(ordenAprobada.estado, 'APROBADA');

    // Paso 5: COMPRAS envia la orden al proveedor
    const resEnviar = await fetch(`${baseUrl}/ordenes/${ordenId}/enviar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCompras}` },
    });
    assert.equal(resEnviar.status, 200);

    // Paso 6: Verificar que hasta aqui el stock NO ha cambiado
    const resStockIntermedio = await fetch(`${baseUrl}/inventario?search=MAT-003`, {
      headers: { Authorization: `Bearer ${tokenInventario}` },
    });
    const matIntermedio = (await resStockIntermedio.json()).data[0];
    assert.equal(Number(matIntermedio.stock_actual), stockAntes);

    // Paso 7: INVENTARIO asienta la recepcion fisica de las 20 unidades
    const detalleId = orden.detalle[0].id;
    const resRecepcion = await fetch(`${baseUrl}/ordenes/${ordenId}/recepciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInventario}`,
      },
      body: JSON.stringify({
        items: [{ detalle_id: detalleId, cantidad_a_recibir: 20 }],
        observaciones: 'Recepcion completa conforme remision #E2E-100',
      }),
    });
    assert.equal(resRecepcion.status, 200);
    const datosRec = (await resRecepcion.json()).data;
    assert.equal(datosRec.estado, 'RECIBIDA');

    // Paso 8: Verificar que el stock global se incremento exactamente en +20
    const resStockFinal = await fetch(`${baseUrl}/inventario?search=MAT-003`, {
      headers: { Authorization: `Bearer ${tokenInventario}` },
    });
    const matFinal = (await resStockFinal.json()).data[0];
    assert.equal(Number(matFinal.stock_actual), stockAntes + 20);

    // Paso 9: Comprobar que en el libro mayor de movimientos existe el asiento inmutable
    const resMovs = await fetch(`${baseUrl}/movimientos?material_id=3`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert.equal(resMovs.status, 200);
    const movs = (await resMovs.json()).data;
    const movAsiento = movs.find((m) => m.orden_compra_id === ordenId);
    assert.ok(movAsiento);
    assert.equal(Number(movAsiento.cantidad), 20);

    // Paso 10: Comprobar que la pista de auditoria registro la creacion, rechazo SoD, aprobacion y recepcion
    const resAud = await fetch(`${baseUrl}/auditoria?entidad=ordenes_compra`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert.equal(resAud.status, 200);
    const audLog = (await resAud.json()).data;
    const eventosOrden = audLog.filter((a) => a.registro_afectado_id === ordenId);
    assert.ok(eventosOrden.some((a) => a.accion === 'INTENTO_APROBACION_RECHAZADO'));
    assert.ok(eventosOrden.some((a) => a.accion === 'APROBACION_ORDEN_COMPRA'));
    assert.ok(eventosOrden.some((a) => a.accion === 'RECEPCION_COMPLETA_ORDEN_COMPRA'));
  });
});
