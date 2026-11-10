process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import { autenticarUsuario } from '../../src/services/usuario.service.js';

describe('Pruebas de Integracion: Autenticacion y Matriz RBAC', () => {
  let server;
  let baseUrl;
  let adminToken;
  let consultaToken;

  before(async () => {
    // Iniciar servidor temporal para pruebas HTTP
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        resolve();
      });
    });

    // Iniciar sesion con admin y consulta
    const adminLogin = await autenticarUsuario('admin@empresaficticiapendiente.cr', 'Admin2026!Gestion');
    adminToken = adminLogin.token;

    const consultaLogin = await autenticarUsuario('consulta@empresaficticiapendiente.cr', 'Consulta2026!Ver');
    consultaToken = consultaLogin.token;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  });

  it('Login exitoso con credenciales validas retorna token JWT y datos de perfil', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@empresaficticiapendiente.cr',
        password: 'Admin2026!Gestion',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.ok(body.data.token);
    assert.equal(body.data.usuario.rol, 'ADMINISTRADOR');
  });

  it('Login rechazado con contrasena incorrecta devuelve 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@empresaficticiapendiente.cr',
        password: 'PasswordIncorrecto123',
      }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.match(body.message, /Credenciales incorrectas/);
  });

  it('Usuario inactivo es rechazado con 403 Forbidden', async () => {
    // Desactivar temporalmente usuario consulta
    await pool.execute('UPDATE usuarios SET activo = 0 WHERE email = ?;', ['consulta@empresaficticiapendiente.cr']);

    try {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'consulta@empresaficticiapendiente.cr',
          password: 'Consulta2026!Ver',
        }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.ok, false);
      assert.match(body.message, /inactiva/);
    } finally {
      // Restaurar estado activo
      await pool.execute('UPDATE usuarios SET activo = 1 WHERE email = ?;', ['consulta@empresaficticiapendiente.cr']);
    }
  });

  it('Usuario con marcador PENDIENTE_INICIALIZACION_SEGURA es bloqueado', async () => {
    await pool.execute('UPDATE usuarios SET password_hash = "PENDIENTE_INICIALIZACION_SEGURA" WHERE id = 4;');

    try {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'consulta@empresaficticiapendiente.cr',
          password: 'PENDIENTE_INICIALIZACION_SEGURA',
        }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /pendiente de inicializacion/);
    } finally {
      // Restaurar clave
      const { hashPassword } = await import('../../src/utils/crypto.js');
      await pool.execute('UPDATE usuarios SET password_hash = ? WHERE id = 4;', [hashPassword('Consulta2026!Ver')]);
    }
  });

  it('RBAC: Usuario CONSULTA no puede crear materiales (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/materiales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${consultaToken}`,
      },
      body: JSON.stringify({
        codigo: 'MAT-TEST-UNAUTH',
        nombre: 'Material No Autorizado',
        categoria_id: 1,
        unidad_medida: 'UNIDAD',
        costo_unitario_crc: 100,
        stock_minimo: 10,
        stock_maximo: 100,
        demanda_promedio_diaria: 2,
        demanda_maxima_diaria: 4,
        tiempo_entrega_dias: 2,
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.match(body.message, /Acceso denegado/);
  });

  it('RBAC: Usuario ADMINISTRADOR puede consultar usuarios (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/usuarios`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.data));
  });
});

