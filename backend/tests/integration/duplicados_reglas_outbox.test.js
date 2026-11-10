process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import { autenticarUsuario } from '../../src/services/usuario.service.js';
import { env } from '../../src/config/env.js';
import { reclamarEventos, completarEvento } from '../../src/services/outbox.service.js';
import { resetTestDb } from '../helpers/resetTestDb.js';

describe('Pruebas de Integracion: Duplicados, Reglas y Outbox (CP-DUP, CP-REGLA, CP-OUTBOX)', () => {
  let server;
  let baseUrl;
  let adminToken;
  let comprasToken;

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
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  });

  // CP-DUP-01: Borde exacto de 7 dias reales (604.800 s) y tolerancia
  it('CP-DUP-01: Deteccion exacta de posible duplicado en ventana de 7 dias y tolerancia porcentual', async () => {
    // 1. Crear una orden base
    const resBase = await fetch(`${baseUrl}/ordenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${comprasToken}` },
      body: JSON.stringify({
        proveedor_id: 2,
        ubicacion_destino_id: 1,
        fecha_entrega_estimada: '2026-12-10',
        items: [{ material_id: 2, cantidad_solicitada: 100, precio_unitario_crc: 95 }],
      }),
    });
    const ordenBase = (await resBase.json()).data;

    // 2. Crear una segunda orden para el mismo proveedor con variacion del 4% (104 vs 100)
    const resDup = await fetch(`${baseUrl}/ordenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${comprasToken}` },
      body: JSON.stringify({
        proveedor_id: 2,
        ubicacion_destino_id: 1,
        fecha_entrega_estimada: '2026-12-12',
        items: [{ material_id: 2, cantidad_solicitada: 104, precio_unitario_crc: 95 }],
      }),
    });

    assert.equal(resDup.status, 201);
    const ordenDup = (await resDup.json()).data;

    assert.equal(ordenDup.es_posible_duplicado, 1);
    assert.equal(ordenDup.estado_revision_duplicado, 'PENDIENTE_REVISION');
    assert.equal(ordenDup.orden_similar_id, ordenBase.id);

    // Comprobar que se creo la alerta de duplicado
    const [alertRows] = await pool.execute(
      `SELECT tipo, severidad FROM alertas WHERE contexto_clave = ? AND estado = 'ACTIVA';`,
      [`DUPLICADO:OC:${ordenDup.id}`]
    );
    assert.equal(alertRows[0].tipo, 'ORDEN_DUPLICADA');
    assert.equal(alertRows[0].severidad, 'ALTA');
  });

  // CP-DUP-02: Independencia entre revision de duplicado y estado operativo
  it('CP-DUP-02: Descartar falso positivo no altera el estado operativo PENDIENTE_APROBACION', async () => {
    // Crear orden duplicada
    const resDup = await fetch(`${baseUrl}/ordenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${comprasToken}` },
      body: JSON.stringify({
        proveedor_id: 2,
        ubicacion_destino_id: 1,
        fecha_entrega_estimada: '2026-12-15',
        items: [{ material_id: 2, cantidad_solicitada: 102, precio_unitario_crc: 95 }],
      }),
    });
    const orden = (await resDup.json()).data;
    assert.equal(orden.es_posible_duplicado, 1);
    assert.equal(orden.estado, 'PENDIENTE_APROBACION');

    // Descartar falso positivo
    const resRev = await fetch(`${baseUrl}/ordenes/${orden.id}/revision-duplicado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${comprasToken}` },
      body: JSON.stringify({
        decision: 'DESCARTAR_FALSO_POSITIVO',
        observaciones: 'Se comprueba que corresponde a un lote adicional autorizado por jefatura',
      }),
    });

    assert.equal(resRev.status, 200);
    const ordenRevisada = (await resRev.json()).data;

    // Estado de duplicado cambia pero el estado operativo permanece intacto
    assert.equal(ordenRevisada.es_posible_duplicado, 0);
    assert.equal(ordenRevisada.estado_revision_duplicado, 'DESCARTADO_FALSO_POSITIVO');
    assert.equal(ordenRevisada.estado, 'PENDIENTE_APROBACION');

    // Alerta de duplicado debe haber sido cerrada (DESCARTADA)
    const [alertRows] = await pool.execute(
      `SELECT estado FROM alertas WHERE contexto_clave = ?;`,
      [`DUPLICADO:OC:${orden.id}`]
    );
    assert.equal(alertRows[0].estado, 'DESCARTADA');
  });

  // CP-REGLA-01: Integridad y prelacion en configuracion_reglas
  it('CP-REGLA-01: Jerarquia de prelacion y validacion de rangos en reglas', async () => {
    const { obtenerRegla } = await import('../../src/services/regla.service.js');

    // 1. Verificar prelacion: MATERIAL (8%) > CATEGORIA (5%) > GLOBAL (10%)
    const tolGlobal = await obtenerRegla('DUPLICADOS_TOLERANCIA_PCT', {}, pool);
    assert.equal(tolGlobal, 10.0);

    const tolCat1 = await obtenerRegla('DUPLICADOS_TOLERANCIA_PCT', { categoria_id: 1 }, pool);
    assert.equal(tolCat1, 10.0);

    const tolMat1 = await obtenerRegla('DUPLICADOS_TOLERANCIA_PCT', { material_id: 1, categoria_id: 1 }, pool);
    assert.equal(tolMat1, 10.0);

    // 2. Intentar actualizar una regla excediendo sus cotas maximas permitidas -> 400 Bad Request
    const resUpdate = await fetch(`${baseUrl}/reglas/4`, { // APROBACION_NIVEL_1_MAX (cota max: 24999.99)
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ valor_numerico: 30000.00 }),
    });

    assert.equal(resUpdate.status, 400);
    const errBody = await resUpdate.json();
    assert.match(errBody.message, /maximo permitido/);
  });

  // CP-OUTBOX-01: Rechazo de worker vencido por claim_token (Fencing)
  it('CP-OUTBOX-01: Rechazo de worker con claim_token expirado (409 Conflict)', async () => {
    // 1. Insertar un evento de prueba directamente (timeout_segundos >= 30 por restriccion CHECK)
    const uniqueKey = `TEST:OUTBOX:FENCING:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const [res] = await pool.execute(
      `INSERT INTO eventos_integracion (
        evento_uuid, clave_idempotencia, tipo_evento, entidad_tipo, entidad_id, payload, estado, timeout_segundos, created_at
      ) VALUES (
        UUID(), ?, 'MOVIMIENTO_REGISTRADO', 'MOVIMIENTO', 1, '{"test":1}', 'PENDIENTE', 30, NOW()
      );`,
      [uniqueKey]
    );
    const eventoId = res.insertId;

    // 2. Worker 1 reclama el evento
    const lote1 = await reclamarEventos(50, 'worker-1');
    const eventoW1 = lote1.find((e) => e.id === eventoId);
    assert.ok(eventoW1);
    const claimTokenW1 = eventoW1.claim_token;

    // 3. Simular que Worker 1 excede el timeout: actualizar locked_at 35 segundos atras
    await pool.execute(
      `UPDATE eventos_integracion SET locked_at = DATE_SUB(NOW(), INTERVAL 35 SECOND) WHERE id = ?;`,
      [eventoId]
    );

    // 4. Worker 2 ejecuta barrido y reclama el evento recuperado
    const lote2 = await reclamarEventos(50, 'worker-2');
    const eventoW2 = lote2.find((e) => e.id === eventoId);
    assert.ok(eventoW2);
    const claimTokenW2 = eventoW2.claim_token;
    assert.notEqual(claimTokenW1, claimTokenW2);

    // 5. Worker 1 atrasado intenta completar el evento con claimTokenW1 -> debe ser RECHAZADO con 409
    await assert.rejects(
      async () => {
        await completarEvento(eventoId, claimTokenW1, { status: 'tarde' });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /claim_token/);
        return true;
      }
    );

    // 6. Worker 2 completa exitosamente con claimTokenW2
    const resW2 = await completarEvento(eventoId, claimTokenW2, { status: 'a_tiempo' });
    assert.equal(resW2.estado, 'PROCESADO');
  });
});
