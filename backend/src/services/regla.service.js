import { query } from '../config/db.js';
import { registrarAuditoria } from './auditoria.service.js';

/**
 * Obtiene el valor de una regla de configuracion aplicando la jerarquia de prelacion:
 * MATERIAL / PROVEEDOR > CATEGORIA > GLOBAL.
 */
export async function obtenerRegla(clave, { material_id = null, categoria_id = null, proveedor_id = null } = {}, conn = null) {
  const runner = conn || { query };

  const sql = `
    SELECT clave, ambito, categoria_id, material_id, proveedor_id,
           tipo_dato, valor_numerico, valor_texto
    FROM configuracion_reglas
    WHERE clave = ? AND activo = 1
    ORDER BY
      CASE
        WHEN ambito IN ('MATERIAL', 'PROVEEDOR') THEN 1
        WHEN ambito = 'CATEGORIA' THEN 2
        WHEN ambito = 'GLOBAL' THEN 3
        ELSE 4
      END ASC;
  `;

  const rows = await runner.query(sql, [clave]);
  const candidates = Array.isArray(rows[0]) ? rows[0] : rows;

  if (!candidates || candidates.length === 0) {
    return null;
  }

  // 1. Coincidencia por MATERIAL
  if (material_id) {
    const matchMat = candidates.find((r) => r.ambito === 'MATERIAL' && Number(r.material_id) === Number(material_id));
    if (matchMat) return extractValor(matchMat);
  }

  // 2. Coincidencia por PROVEEDOR
  if (proveedor_id) {
    const matchProv = candidates.find((r) => r.ambito === 'PROVEEDOR' && Number(r.proveedor_id) === Number(proveedor_id));
    if (matchProv) return extractValor(matchProv);
  }

  // 3. Coincidencia por CATEGORIA
  if (categoria_id) {
    const matchCat = candidates.find((r) => r.ambito === 'CATEGORIA' && Number(r.categoria_id) === Number(categoria_id));
    if (matchCat) return extractValor(matchCat);
  }

  // 4. Regla GLOBAL
  const matchGlobal = candidates.find((r) => r.ambito === 'GLOBAL');
  if (matchGlobal) return extractValor(matchGlobal);

  return null;
}

function extractValor(regla) {
  if (regla.tipo_dato === 'TEXTO') {
    return regla.valor_texto;
  }
  if (regla.tipo_dato === 'BOOLEANO') {
    return Number(regla.valor_numerico) === 1;
  }
  return Number(regla.valor_numerico);
}

export async function listarReglas() {
  const sql = `
    SELECT
      r.id, r.clave, r.ambito, r.categoria_id, c.nombre AS categoria_nombre,
      r.material_id, m.nombre AS material_nombre,
      r.proveedor_id, p.razon_social AS proveedor_nombre,
      r.llave_unicidad_regla, r.tipo_dato, r.valor_numerico, r.valor_texto,
      r.valor_minimo, r.valor_maximo, r.descripcion, r.activo,
      r.usuario_actualizacion_id, u.nombre AS usuario_actualizacion_nombre,
      r.created_at, r.updated_at
    FROM configuracion_reglas r
    LEFT JOIN categorias c ON c.id = r.categoria_id
    LEFT JOIN materiales m ON m.id = r.material_id
    LEFT JOIN proveedores p ON p.id = r.proveedor_id
    LEFT JOIN usuarios u ON u.id = r.usuario_actualizacion_id
    ORDER BY r.ambito ASC, r.clave ASC;
  `;
  return await query(sql);
}

export async function obtenerReglaPorId(id) {
  const rows = await query('SELECT * FROM configuracion_reglas WHERE id = ?;', [id]);
  return rows[0] || null;
}

export async function actualizarRegla(id, data, usuario_id) {
  const actual = await obtenerReglaPorId(id);
  if (!actual) {
    const err = new Error('Regla de configuracion no encontrada.');
    err.statusCode = 404;
    throw err;
  }

  const nuevoValorNum = data.valor_numerico !== undefined ? data.valor_numerico : actual.valor_numerico;
  const nuevoValorTxt = data.valor_texto !== undefined ? data.valor_texto : actual.valor_texto;
  const nuevaDesc = data.descripcion !== undefined ? data.descripcion : actual.descripcion;
  const nuevoActivo = data.activo !== undefined ? data.activo : actual.activo;

  // Validar limites si aplican
  if (actual.tipo_dato === 'DECIMAL' || actual.tipo_dato === 'ENTERO') {
    if (nuevoValorNum !== null) {
      if (actual.valor_minimo !== null && Number(nuevoValorNum) < Number(actual.valor_minimo)) {
        const err = new Error(`El valor no puede ser inferior al minimo permitido (${actual.valor_minimo}).`);
        err.statusCode = 400;
        throw err;
      }
      if (actual.valor_maximo !== null && Number(nuevoValorNum) > Number(actual.valor_maximo)) {
        const err = new Error(`El valor no puede superar el maximo permitido (${actual.valor_maximo}).`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  await query(
    `UPDATE configuracion_reglas
     SET valor_numerico = ?, valor_texto = ?, descripcion = ?, activo = ?, usuario_actualizacion_id = ?, updated_at = NOW()
     WHERE id = ?;`,
    [nuevoValorNum, nuevoValorTxt, nuevaDesc, nuevoActivo, usuario_id, id]
  );

  await registrarAuditoria({
    usuario_id,
    accion: 'ACTUALIZACION_REGLA_NEGOCIO',
    tipo_operacion: 'ACTUALIZACION',
    entidad_afectada: 'configuracion_reglas',
    registro_afectado_id: id,
    motivo: `Actualizacion de parametro ${actual.clave} (${actual.ambito})`,
    datos_previos: { valor_numerico: actual.valor_numerico, valor_texto: actual.valor_texto, activo: actual.activo },
    datos_nuevos: { valor_numerico: nuevoValorNum, valor_texto: nuevoValorTxt, activo: nuevoActivo },
  });

  return await obtenerReglaPorId(id);
}

