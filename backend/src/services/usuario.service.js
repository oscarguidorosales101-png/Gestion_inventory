import { query } from '../config/db.js';
import { hashPassword, verifyPassword, isPendingInitialization, createToken } from '../utils/crypto.js';
import { env } from '../config/env.js';
import { registrarAuditoria } from './auditoria.service.js';

export async function autenticarUsuario(email, plainPassword) {
  const users = await query(
    `SELECT id, nombre, email, password_hash, rol, requiere_cambio_clave, activo
     FROM usuarios
     WHERE email = ?;`,
    [email]
  );

  const user = users[0];
  if (!user) {
    const err = new Error('Credenciales incorrectas.');
    err.statusCode = 401;
    throw err;
  }

  if (Number(user.activo) !== 1) {
    const err = new Error('La cuenta de usuario se encuentra inactiva. Contacte al administrador.');
    err.statusCode = 403;
    throw err;
  }

  if (isPendingInitialization(user.password_hash)) {
    const err = new Error('La cuenta se encuentra pendiente de inicializacion segura por el administrador.');
    err.statusCode = 403;
    throw err;
  }

  const isValid = verifyPassword(plainPassword, user.password_hash);
  if (!isValid) {
    const err = new Error('Credenciales incorrectas.');
    err.statusCode = 401;
    throw err;
  }

  await query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?;', [user.id]);

  const token = createToken(
    { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
    env.JWT_SECRET,
    env.SESSION_EXPIRATION_HOURS * 3600
  );

  await registrarAuditoria({
    usuario_id: user.id,
    accion: 'INICIO_SESION_EXITOSO',
    tipo_operacion: 'SEGURIDAD_USUARIO',
    entidad_afectada: 'usuarios',
    registro_afectado_id: user.id,
    motivo: 'Autenticacion de usuario satisfactoria',
  });

  return {
    token,
    usuario: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      requiere_cambio_clave: Number(user.requiere_cambio_clave) === 1,
    },
  };
}

export async function cambiarClave(usuario_id, passwordActual, passwordNueva) {
  const users = await query('SELECT id, email, password_hash FROM usuarios WHERE id = ?;', [usuario_id]);
  const user = users[0];
  if (!user) {
    const err = new Error('Usuario no encontrado.');
    err.statusCode = 404;
    throw err;
  }

  if (!verifyPassword(passwordActual, user.password_hash)) {
    const err = new Error('La contrasena actual es incorrecta.');
    err.statusCode = 400;
    throw err;
  }

  const newHash = hashPassword(passwordNueva);

  await query(
    `UPDATE usuarios
     SET password_hash = ?, requiere_cambio_clave = 0, updated_at = NOW()
     WHERE id = ?;`,
    [newHash, usuario_id]
  );

  await registrarAuditoria({
    usuario_id,
    accion: 'CAMBIO_CONTRASENA',
    tipo_operacion: 'SEGURIDAD_USUARIO',
    entidad_afectada: 'usuarios',
    registro_afectado_id: usuario_id,
    motivo: 'Cambio voluntario o requerido de contrasena',
  });

  return { ok: true, message: 'Contrasena actualizada con exito.' };
}

export async function listarUsuarios({ activo, rol, q } = {}) {
  const conditions = [];
  const params = [];

  if (activo !== undefined) {
    conditions.push('activo = ?');
    params.push(Number(activo));
  }
  if (rol) {
    conditions.push('rol = ?');
    params.push(rol);
  }
  if (q) {
    conditions.push('(nombre LIKE ? OR email LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT id, nombre, email, rol, requiere_cambio_clave, activo, ultimo_acceso, created_at, updated_at
    FROM usuarios
    ${whereClause}
    ORDER BY nombre ASC;
  `;
  return await query(sql, params);
}

export async function obtenerUsuarioPorId(id) {
  const rows = await query(
    `SELECT id, nombre, email, rol, requiere_cambio_clave, activo, ultimo_acceso, created_at, updated_at
     FROM usuarios
     WHERE id = ?;`,
    [id]
  );
  return rows[0] || null;
}

export async function crearUsuario(datos, adminUsuarioId) {
  const hash = hashPassword(datos.password);

  const sql = `
    INSERT INTO usuarios (nombre, email, password_hash, rol, requiere_cambio_clave, activo)
    VALUES (?, ?, ?, ?, ?, ?);
  `;
  const params = [
    datos.nombre,
    datos.email,
    hash,
    datos.rol,
    datos.requiere_cambio_clave !== undefined ? datos.requiere_cambio_clave : 1,
    datos.activo !== undefined ? datos.activo : 1,
  ];

  const res = await query(sql, params);
  const nuevoId = res.insertId;

  await registrarAuditoria({
    usuario_id: adminUsuarioId,
    accion: 'CREACION_USUARIO',
    tipo_operacion: 'SEGURIDAD_USUARIO',
    entidad_afectada: 'usuarios',
    registro_afectado_id: nuevoId,
    motivo: `Alta de cuenta de usuario ${datos.email} con rol ${datos.rol}`,
    datos_nuevos: { nombre: datos.nombre, email: datos.email, rol: datos.rol },
  });

  return await obtenerUsuarioPorId(nuevoId);
}

export async function actualizarUsuario(id, datos, adminUsuarioId) {
  const actual = await obtenerUsuarioPorId(id);
  if (!actual) {
    const err = new Error('Usuario no encontrado.');
    err.statusCode = 404;
    throw err;
  }

  let hash = null;
  if (datos.password) {
    hash = hashPassword(datos.password);
  }

  const sql = `
    UPDATE usuarios
    SET nombre = COALESCE(?, nombre),
        email = COALESCE(?, email),
        rol = COALESCE(?, rol),
        password_hash = COALESCE(?, password_hash),
        requiere_cambio_clave = COALESCE(?, requiere_cambio_clave),
        activo = COALESCE(?, activo),
        updated_at = NOW()
    WHERE id = ?;
  `;
  const params = [
    datos.nombre || null,
    datos.email || null,
    datos.rol || null,
    hash,
    datos.requiere_cambio_clave !== undefined ? datos.requiere_cambio_clave : null,
    datos.activo !== undefined ? datos.activo : null,
    id,
  ];

  await query(sql, params);

  await registrarAuditoria({
    usuario_id: adminUsuarioId,
    accion: 'ACTUALIZACION_USUARIO',
    tipo_operacion: 'SEGURIDAD_USUARIO',
    entidad_afectada: 'usuarios',
    registro_afectado_id: id,
    motivo: `Modificacion administrativa de cuenta de usuario ${actual.email}`,
    datos_previos: { nombre: actual.nombre, rol: actual.rol, activo: actual.activo },
    datos_nuevos: datos,
  });

  return await obtenerUsuarioPorId(id);
}

