process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import { autenticarUsuario } from '../../src/services/usuario.service.js';
import { obtenerStockGlobal } from '../../src/services/inventario.service.js';
import { resetTestDb } from '../helpers/resetTestDb.js';

describe('Pruebas de Integracion: Ordenes, Segregacion (SoD) y Recepciones (CP-SOD y CP-REC)', () => {
  let server;
  let baseUrl;
  let adminToken;
  let comprasToken;
  let inventarioToken;

  before(async () => {
    resetTestDb();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        resolve();
      });
    });

    const adminLogin = await autenticarUsuario('admin@empresaficticiapendiente.cr', 'Admin2026!Gestion');
    adminToken = adminLogin.token;

    const comprasLogin = await autenticarUsuario('compras@empresaficticiapendiente.cr', 'Compras2026!Req');
    comprasToken = comprasLogin.token;

    const inventarioLogin = await autenticarUsuario('inventario@empresaficticiapendiente.cr', 'Inventario2026!');
    inventarioToken = inventarioLogin.token;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  });

  // CP-SOD-01: Rechazo de autoaprobacion
  it('CP-SOD-01: Un usuario no puede aprobar una orden creada por el mismo (403 Forbidden y registro en auditoria)', async () => {
    // 1. Compras crea una orden
    const resCreate = await fetch(`${baseUrl}/ordenes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${comprasToken}`,
      },
      body: JSON.stringify({
        proveedor_id: 2,
        ubicacion_destino_id: 1,
        fecha_entrega_estimada: '2026-11-20',
        observaciones: 'Orden para prueba de autoaprobacion',
        items: [
          { material_id: 2, cantidad_solicitada: 10, precio_unitario_crc: 95 },
        ],
      }),
    });

    assert.equal(resCreate.status, 201);
    const orderData = (await resCreate.json()).data;
    const orderId = orderData.id;

    // 2. Compras intenta aprobar su propia orden
    const resApprove = await fetch(`${baseUrl}/ordenes/${orderId}/aprobar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${comprasToken}` },
    });

    assert.equal(resApprove.status, 403);
    const errBody = await resApprove.json();
    assert.match(errBody.message, /Segregacion de funciones/);

    // 3. Comprobar que la orden sigue en PENDIENTE_APROBACION
    const [rows] = await pool.execute('SELECT estado, usuario_aprobador_id FROM ordenes_compra WHERE id = ?;', [orderId]);
    assert.equal(rows[0].estado, 'PENDIENTE_APROBACION');
    assert.equal(rows[0].usuario_aprobador_id, null);

    // 4. Comprobar registro en auditoria de intento rechazado
    const [audRows] = await pool.execute(
      `SELECT accion, tipo_operacion FROM auditoria
       WHERE entidad_afectada = 'ordenes_compra' AND registro_afectado_id = ? AND accion = 'INTENTO_APROBACION_RECHAZADO';`,
      [orderId]
    );
    assert.ok(audRows.length >= 1);
  });

  // CP-SOD-02: Aprobacion por segundo usuario autorizado
  it('CP-SOD-02: Aprobacion exitosa por un usuario distinto y autorizado', async () => {
    // Crear orden con compras (proveedor 3, material 6: sin duplicidad)
    const resCreate = await fetch(`${baseUrl}/ordenes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${comprasToken}`,
      },
      body: JSON.stringify({
        proveedor_id: 3,
        ubicacion_destino_id: 1,
        fecha_entrega_estimada: '2026-11-25',
        observaciones: 'Orden Nivel 1 para prueba SoD',
        items: [
          { material_id: 6, cantidad_solicitada: 15, precio_unitario_crc: 150 },
        ],
      }),
    });

    assert.equal(resCreate.status, 201);
    const orderData = (await resCreate.json()).data;
    assert.equal(orderData.es_posible_duplicado, 0);
    const orderId = orderData.id;

    // Aprobacion por inventario (usuario distinto, rol autorizado)
    const resApprove = await fetch(`${baseUrl}/ordenes/${orderId}/aprobar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${inventarioToken}` },
    });

    assert.equal(resApprove.status, 200);
    const approvedOrder = (await resApprove.json()).data;
    assert.equal(approvedOrder.estado, 'APROBADA');
    assert.equal(approvedOrder.usuario_aprobador_id, 2); // ID de Encargado de Inventario
  });

  // CP-REC-01: Aprobar y enviar una orden NO altera el stock (0 movimientos)
  it('CP-REC-01: Cambio de estado de orden a APROBADA y ENVIADA no afecta el stock', async () => {
    const stockAntes = await obtenerStockGlobal(3, pool);

    // Crear orden para proveedor 1 con material 3 (arena)
    const resCreate = await fetch(`${baseUrl}/ordenes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${comprasToken}`,
      },
      body: JSON.stringify({
        proveedor_id: 1,
        ubicacion_destino_id: 1,
        fecha_entrega_estimada: '2026-11-28',
        items: [{ material_id: 3, cantidad_solicitada: 10, precio_unitario_crc: 180 }],
      }),
    });
    const order = (await resCreate.json()).data;
    assert.equal(order.es_posible_duplicado, 0);
    const orderId = order.id;

    // Aprobar
    await fetch(`${baseUrl}/ordenes/${orderId}/aprobar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // Enviar
    await fetch(`${baseUrl}/ordenes/${orderId}/enviar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${comprasToken}` },
    });

    // Verificar que el stock global no cambio
    const stockDespues = await obtenerStockGlobal(3, pool);
    assert.equal(stockDespues, stockAntes);

    // Verificar que ningun movimiento fue creado para esta orden
    const [movs] = await pool.execute('SELECT COUNT(*) AS total FROM movimientos WHERE orden_compra_id = ?;', [orderId]);
    assert.equal(movs[0].total, 0);
  });

  // CP-REC-02, CP-REC-03, CP-REC-04: Ciclo de recepcion parcial, exceso rechazado y recepcion total
  it('CP-REC-02, 03 y 04: Ciclo completo de recepcion con validacion de excedente', async () => {
    // 1. Crear orden por 80 unidades de material 2
    const resCreate = await fetch(`${baseUrl}/ordenes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${comprasToken}`,
      },
      body: JSON.stringify({
        proveedor_id: 2,
        ubicacion_destino_id: 1,
        fecha_entrega_estimada: '2026-11-30',
        items: [{ material_id: 2, cantidad_solicitada: 80, precio_unitario_crc: 95 }],
      }),
    });
    const order = (await resCreate.json()).data;
    assert.equal(order.es_posible_duplicado, 0);
    const orderId = order.id;
    const detalleId = order.detalle[0].id;

    // Aprobar orden
    const resApprove = await fetch(`${baseUrl}/ordenes/${orderId}/aprobar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(resApprove.status, 200);

    const stockInicial = await obtenerStockGlobal(2, pool);

    // 2. CP-REC-02: Recepcion parcial de 30 unidades
    const resRecParcial = await fetch(`${baseUrl}/ordenes/${orderId}/recepciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${inventarioToken}`,
      },
      body: JSON.stringify({
        items: [{ detalle_id: detalleId, cantidad_a_recibir: 30 }],
        referencia: 'GUIA-PARCIAL-01',
      }),
    });

    assert.equal(resRecParcial.status, 200);
    const orderParcial = (await resRecParcial.json()).data;
    assert.equal(orderParcial.estado, 'PARCIALMENTE_RECIBIDA');
    assert.equal(orderParcial.detalle[0].cantidad_recibida, 30);
    assert.equal(orderParcial.detalle[0].cantidad_pendiente, 50);

    const stockTrasParcial = await obtenerStockGlobal(2, pool);
    assert.equal(stockTrasParcial, stockInicial + 30);

    // 3. CP-REC-03: Intentar recibir 60 unidades cuando solo quedan 50 pendientes -> 409 Conflict
    const resExceso = await fetch(`${baseUrl}/ordenes/${orderId}/recepciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${inventarioToken}`,
      },
      body: JSON.stringify({
        items: [{ detalle_id: detalleId, cantidad_a_recibir: 60 }],
        referencia: 'GUIA-EXCESO',
      }),
    });

    assert.equal(resExceso.status, 409);
    const stockTrasExceso = await obtenerStockGlobal(2, pool);
    assert.equal(stockTrasExceso, stockTrasParcial); // No debe haberse modificado

    // 4. CP-REC-04: Recepcion de los 50 restantes -> estado pasa a RECIBIDA
    const resRecFinal = await fetch(`${baseUrl}/ordenes/${orderId}/recepciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${inventarioToken}`,
      },
      body: JSON.stringify({
        items: [{ detalle_id: detalleId, cantidad_a_recibir: 50 }],
        referencia: 'GUIA-FINAL-02',
      }),
    });

    assert.equal(resRecFinal.status, 200);
    const orderFinal = (await resRecFinal.json()).data;
    assert.equal(orderFinal.estado, 'RECIBIDA');
    assert.equal(orderFinal.detalle[0].cantidad_recibida, 80);
    assert.equal(orderFinal.detalle[0].cantidad_pendiente, 0);

    const stockFinal = await obtenerStockGlobal(2, pool);
    assert.equal(stockFinal, stockInicial + 80);
  });

  // CP-CONC-01: Bloqueo ordenado en recepciones
  it('CP-CONC-01: Procesamiento ordenado y consistente de recepciones concurrentes', async () => {
    // Crear orden con 2 materiales en orden inverso para proveedor 1
    const resCreate = await fetch(`${baseUrl}/ordenes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${comprasToken}`,
      },
      body: JSON.stringify({
        proveedor_id: 1,
        ubicacion_destino_id: 1,
        fecha_entrega_estimada: '2026-12-01',
        items: [
          { material_id: 4, cantidad_solicitada: 100, precio_unitario_crc: 25 },
          { material_id: 3, cantidad_solicitada: 50, precio_unitario_crc: 180 },
        ],
      }),
    });
    const order = (await resCreate.json()).data;
    const orderId = order.id;

    const resApp = await fetch(`${baseUrl}/ordenes/${orderId}/aprobar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(resApp.status, 200);

    const det1 = order.detalle.find((d) => d.material_id === 4);
    const det2 = order.detalle.find((d) => d.material_id === 3);

    // Enviar recepciones concurrentes con orden inverso de items
    const [p1, p2] = await Promise.all([
      fetch(`${baseUrl}/ordenes/${orderId}/recepciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${inventarioToken}` },
        body: JSON.stringify({ items: [{ detalle_id: det1.id, cantidad_a_recibir: 20 }] }),
      }),
      fetch(`${baseUrl}/ordenes/${orderId}/recepciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${inventarioToken}` },
        body: JSON.stringify({ items: [{ detalle_id: det2.id, cantidad_a_recibir: 15 }] }),
      }),
    ]);

    assert.equal(p1.status, 200);
    assert.equal(p2.status, 200);
  });
});
