/**
 * SCRIPT DE VERIFICACION INTEGRAL DE EXTREMO A EXTREMO
 * Proyecto: Gestion_inventory
 * Niveles 1 al 7 de Auditoria y Validacion Real
 */

import { spawnSync } from 'node:child_process';
import os from 'node:os';

const BASE_URL = 'http://localhost:3001/api';
const FRONTEND_URL = 'http://localhost:5173';
const N8N_URL = 'http://localhost:5678';

const RESULTADOS = {
  nivel1_infraestructura: {},
  nivel2_auditoria_api: [],
  nivel3_roles_sod: [],
  nivel4_ciclo_inventario: [],
  nivel5_ciclo_compras_recepcion: [],
  nivel6_automatizaciones_n8n: [],
  nivel7_frontend_build: {},
  resumen: { total: 0, superadas: 0, fallidas: 0 },
};

function logPaso(titulo) {
  console.log(`\n============================================================`);
  console.log(`[AUDITORIA REAL] ${titulo}`);
  console.log(`============================================================`);
}

function registrarPrueba(categoria, nombre, resultado, esperado, obtenido, detalles = null) {
  RESULTADOS.resumen.total++;
  const exito = resultado === true;
  if (exito) RESULTADOS.resumen.superadas++;
  else RESULTADOS.resumen.fallidas++;

  const item = {
    nombre,
    estado: exito ? 'SUPERADA' : 'FALLIDA',
    esperado,
    obtenido,
    detalles,
  };

  if (Array.isArray(RESULTADOS[categoria])) {
    RESULTADOS[categoria].push(item);
  } else {
    RESULTADOS[categoria][nombre] = item;
  }

  const tag = exito ? '[PASS]' : '[FAIL]';
  console.log(`${tag} ${nombre} -> ${exito ? 'OK' : 'ERROR: ' + JSON.stringify(obtenido)}`);
}

async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${endpoint}`, opts);
  let data = null;
  const ct = res.headers.get('content-type');
  if (ct && ct.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log(`Iniciando Auditoria Integral en tiempo real...`);

  // =========================================================================
  // NIVEL 1: INFRAESTRUCTURA Y SERVICIOS ACTIVOS
  // =========================================================================
  logPaso('NIVEL 1: Verificacion de Infraestructura y Conectividad');

  // Backend Health
  try {
    const health = await apiRequest('/health');
    const dbOk = health.data?.database?.status === 'connected';
    registrarPrueba('nivel1_infraestructura', 'Backend Express y MySQL (3001)', health.status === 200 && dbOk, 'HTTP 200 con DB connected', `HTTP ${health.status}, DB: ${health.data?.database?.status}`);
  } catch (err) {
    registrarPrueba('nivel1_infraestructura', 'Backend Express y MySQL (3001)', false, 'HTTP 200', err.message);
  }

  // Frontend Vite
  try {
    const resFront = await fetch(FRONTEND_URL);
    registrarPrueba('nivel1_infraestructura', 'Frontend React Vite (5173)', resFront.status === 200, 'HTTP 200', `HTTP ${resFront.status}`);
  } catch (err) {
    registrarPrueba('nivel1_infraestructura', 'Frontend React Vite (5173)', false, 'HTTP 200', err.message);
  }

  // n8n
  try {
    const resN8n = await fetch(N8N_URL);
    registrarPrueba('nivel1_infraestructura', 'Servidor n8n (5678)', resN8n.status === 200, 'HTTP 200', `HTTP ${resN8n.status}`);
  } catch (err) {
    registrarPrueba('nivel1_infraestructura', 'Servidor n8n (5678)', false, 'HTTP 200', err.message);
  }

  // Gemini API Health
  // Se obtiene token admin primero
  const loginAdmin = await apiRequest('/auth/login', 'POST', {
    email: 'admin@empresaficticiapendiente.cr',
    password: 'Admin2026!Gestion',
  });
  const tokenAdmin = loginAdmin.data?.data?.token;

  if (tokenAdmin) {
    const geminiStatus = await apiRequest('/dashboard/gemini-status', 'GET', null, tokenAdmin);
    const geminiOk = geminiStatus.data?.data?.conectado === true;
    registrarPrueba('nivel1_infraestructura', 'Conectividad Google Gemini API', geminiOk, 'conectado: true', geminiStatus.data?.data);
  }

  // =========================================================================
  // NIVEL 2: AUDITORIA COMPLETA DE ENDPOINTS
  // =========================================================================
  logPaso('NIVEL 2: Auditoria de Endpoints del Backend');

  // 1. Dashboard raiz y resumen
  const dashRoot = await apiRequest('/dashboard', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/dashboard', dashRoot.status === 200 && dashRoot.data?.data?.totalMateriales !== undefined, 'HTTP 200 con metricas', `HTTP ${dashRoot.status}`);

  const dashResumen = await apiRequest('/dashboard/resumen', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/dashboard/resumen', dashResumen.status === 200, 'HTTP 200', `HTTP ${dashResumen.status}`);

  // 2. Dashboards por rol
  const dashAdmin = await apiRequest('/dashboard/admin', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/dashboard/admin', dashAdmin.status === 200, 'HTTP 200', `HTTP ${dashAdmin.status}`);

  const dashInv = await apiRequest('/dashboard/inventario', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/dashboard/inventario', dashInv.status === 200, 'HTTP 200', `HTTP ${dashInv.status}`);

  const dashCom = await apiRequest('/dashboard/compras', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/dashboard/compras', dashCom.status === 200, 'HTTP 200', `HTTP ${dashCom.status}`);

  const dashCon = await apiRequest('/dashboard/consulta', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/dashboard/consulta', dashCon.status === 200, 'HTTP 200', `HTTP ${dashCon.status}`);

  // 3. Analisis Ejecutivo Gemini IA
  const geminiAnalisis = await apiRequest('/dashboard/analisis-ia', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/dashboard/analisis-ia (Asesoria IA)', geminiAnalisis.status === 200 && !!geminiAnalisis.data?.data?.analisis_ejecutivo, 'HTTP 200 con diagnostico ejecutivo', `HTTP ${geminiAnalisis.status}`);

  // 4. Catalogos y Maestro de Materiales
  const catRes = await apiRequest('/categorias', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/categorias', catRes.status === 200, 'HTTP 200', `HTTP ${catRes.status}`);

  const provRes = await apiRequest('/proveedores', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/proveedores', provRes.status === 200, 'HTTP 200', `HTTP ${provRes.status}`);

  const ubiRes = await apiRequest('/ubicaciones', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/ubicaciones', ubiRes.status === 200, 'HTTP 200', `HTTP ${ubiRes.status}`);

  const matRes = await apiRequest('/materiales', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/materiales', matRes.status === 200, 'HTTP 200', `HTTP ${matRes.status}`);

  const invRes = await apiRequest('/inventario', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/inventario', invRes.status === 200, 'HTTP 200', `HTTP ${invRes.status}`);

  const invUbiRes = await apiRequest('/inventario/materiales/1/ubicaciones', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/inventario/materiales/:id/ubicaciones', invUbiRes.status === 200, 'HTTP 200', `HTTP ${invUbiRes.status}`);

  // 5. Compras y Recepciones
  const ordRes = await apiRequest('/ordenes', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/ordenes', ordRes.status === 200, 'HTTP 200', `HTTP ${ordRes.status}`);

  const ordAliasRes = await apiRequest('/ordenes-compra', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/ordenes-compra (Alias)', ordAliasRes.status === 200, 'HTTP 200', `HTTP ${ordAliasRes.status}`);

  const recRes = await apiRequest('/recepciones', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/recepciones', recRes.status === 200, 'HTTP 200', `HTTP ${recRes.status}`);

  const movRes = await apiRequest('/movimientos', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/movimientos', movRes.status === 200, 'HTTP 200', `HTTP ${movRes.status}`);

  // 6. Alertas
  const alertList = await apiRequest('/alertas', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/alertas', alertList.status === 200, 'HTTP 200', `HTTP ${alertList.status}`);

  const alertReeval = await apiRequest('/alertas/reevaluar', 'POST', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'POST /api/alertas/reevaluar', alertReeval.status === 200 && alertReeval.data?.data?.materiales_evaluados > 0, 'HTTP 200 con materiales evaluados', `HTTP ${alertReeval.status}`);

  // 7. Reglas y Auditoria
  const reglasRes = await apiRequest('/reglas', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/reglas', reglasRes.status === 200, 'HTTP 200', `HTTP ${reglasRes.status}`);

  const auditRes = await apiRequest('/auditoria', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/auditoria', auditRes.status === 200, 'HTTP 200', `HTTP ${auditRes.status}`);

  const usersRes = await apiRequest('/usuarios', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/usuarios', usersRes.status === 200, 'HTTP 200', `HTTP ${usersRes.status}`);

  // 8. Integracion y Outbox
  const intAlertas = await apiRequest('/integracion/alertas/reevaluar', 'POST', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'POST /api/integracion/alertas/reevaluar', intAlertas.status === 200, 'HTTP 200', `HTTP ${intAlertas.status}`);

  const intDups = await apiRequest('/integracion/auditoria/duplicados-pendientes', 'GET', null, tokenAdmin);
  registrarPrueba('nivel2_auditoria_api', 'GET /api/integracion/auditoria/duplicados-pendientes', intDups.status === 200, 'HTTP 200', `HTTP ${intDups.status}`);

  // =========================================================================
  // NIVEL 3: AUTENTICACION, MATRIZ RBAC Y SEGREGACION SOD
  // =========================================================================
  logPaso('NIVEL 3: Roles, Aislamiento RBAC y Segregacion de Funciones (SoD)');

  // Logins por Rol
  const loginInv = await apiRequest('/auth/login', 'POST', { email: 'inventario@empresaficticiapendiente.cr', password: 'Inventario2026!' });
  const tokenInv = loginInv.data?.data?.token;
  registrarPrueba('nivel3_roles_sod', 'Login Rol INVENTARIO', loginInv.status === 200 && !!tokenInv, 'HTTP 200 con token', `HTTP ${loginInv.status}`);

  const loginCom = await apiRequest('/auth/login', 'POST', { email: 'compras@empresaficticiapendiente.cr', password: 'Compras2026!Req' });
  const tokenCom = loginCom.data?.data?.token;
  registrarPrueba('nivel3_roles_sod', 'Login Rol COMPRAS', loginCom.status === 200 && !!tokenCom, 'HTTP 200 con token', `HTTP ${loginCom.status}`);

  const loginCon = await apiRequest('/auth/login', 'POST', { email: 'consulta@empresaficticiapendiente.cr', password: 'Consulta2026!Ver' });
  const tokenCon = loginCon.data?.data?.token;
  registrarPrueba('nivel3_roles_sod', 'Login Rol CONSULTA', loginCon.status === 200 && !!tokenCon, 'HTTP 200 con token', `HTTP ${loginCon.status}`);

  // RBAC: Usuario CONSULTA debe recibir 403 Forbidden al intentar mutar (POST /materiales)
  const intentoMutacionConsulta = await apiRequest('/materiales', 'POST', {
    sku: 'BLOQUEADO-TEST',
    nombre: 'Material Prohibido',
    categoria_id: 1,
    unidad_medida: 'UN',
    stock_minimo: 10,
    punto_reorden: 20,
  }, tokenCon);
  registrarPrueba('nivel3_roles_sod', 'RBAC: Usuario CONSULTA no puede crear materiales', intentoMutacionConsulta.status === 403, 'HTTP 403 Forbidden', `HTTP ${intentoMutacionConsulta.status}`);

  // SoD: Compras crea orden -> Compras no puede auto-aprobarla (403 Forbidden)
  const ordenSod = await apiRequest('/ordenes', 'POST', {
    proveedor_id: 3,
    ubicacion_destino_id: 1,
    fecha_entrega_estimada: '2026-11-20',
    observaciones: 'Prueba SoD segregacion de responsabilidades',
    items: [{ material_id: 3, cantidad_solicitada: 750, precio_unitario_crc: 2500 }],
  }, tokenCom);

  if (ordenSod.status === 201 && ordenSod.data?.data?.id) {
    const ordenId = ordenSod.data.data.id;
    // Si fue marcada como duplicado por orden previa, descartar falso positivo primero
    if (ordenSod.data.data.es_posible_duplicado === 1) {
      await apiRequest(`/ordenes/${ordenId}/revisar-duplicado`, 'POST', {
        decision: 'DESCARTAR_FALSO_POSITIVO',
        observaciones: 'Aprobacion de lote validado para prueba SoD',
      }, tokenAdmin);
    }

    // Compras intenta auto-aprobarla
    const intentoAutoAprobacion = await apiRequest(`/ordenes/${ordenId}/aprobar`, 'POST', {}, tokenCom);
    registrarPrueba('nivel3_roles_sod', 'SoD: Creador no puede aprobar su propia orden (Auto-aprobacion)', intentoAutoAprobacion.status === 403, 'HTTP 403 Forbidden', `HTTP ${intentoAutoAprobacion.status}`);

    // Administrador (usuario distinto) aprueba la orden exitosamente
    const aprobacionAdmin = await apiRequest(`/ordenes/${ordenId}/aprobar`, 'POST', {}, tokenAdmin);
    registrarPrueba('nivel3_roles_sod', 'SoD: Aprobacion valida por usuario autorizado distinto', aprobacionAdmin.status === 200 && aprobacionAdmin.data?.data?.estado === 'APROBADA', 'HTTP 200 estado APROBADA', `HTTP ${aprobacionAdmin.status}, Estado: ${aprobacionAdmin.data?.data?.estado}`);
  } else {
    registrarPrueba('nivel3_roles_sod', 'SoD: Creacion de orden preliminar', false, 'HTTP 201', `HTTP ${ordenSod.status}`);
  }

  // =========================================================================
  // NIVEL 4: CICLO DE INVENTARIO Y LIBRO MAYOR (LEDGER)
  // =========================================================================
  logPaso('NIVEL 4: Ciclo de Inventario y Registro en Libro Mayor (Append-Only)');

  // 1. Consultar existencia inicial de material 1
  const stockInicialRes = await apiRequest('/inventario/materiales/1/ubicaciones', 'GET', null, tokenInv);
  const ubiList = stockInicialRes.data?.data?.ubicaciones || [];
  const stockIni = ubiList.reduce((acc, u) => acc + Number(u.existencia_actual || 0), 0);

  // 2. Registrar movimiento de ajuste de inventario (AJUSTE_POSITIVO)
  const movAjuste = await apiRequest('/movimientos', 'POST', {
    tipo: 'AJUSTE_POSITIVO',
    material_id: 1,
    ubicacion_destino_id: 1,
    cantidad: 15.00,
    motivo: 'Ajuste de inventario fisico verificado por auditoria real',
    referencia: 'AUD-INV-001',
  }, tokenInv);
  registrarPrueba('nivel4_ciclo_inventario', 'Registro de movimiento AJUSTE_POSITIVO en libro mayor', movAjuste.status === 201 && movAjuste.data?.data?.id !== undefined, 'HTTP 201 con movimiento registrado', `HTTP ${movAjuste.status}`);

  // 3. Verificar incremento exacto en saldo de existencias
  const stockFinalRes = await apiRequest('/inventario/materiales/1/ubicaciones', 'GET', null, tokenInv);
  const ubiListFin = stockFinalRes.data?.data?.ubicaciones || [];
  const stockFin = ubiListFin.reduce((acc, u) => acc + Number(u.existencia_actual || 0), 0);
  const balanceOk = Math.abs((stockFin - stockIni) - 15.00) < 0.001;
  registrarPrueba('nivel4_ciclo_inventario', 'Actualizacion exacta de balance de existencias (StockIni + 15)', balanceOk, `Incremento de 15.00 (Antes: ${stockIni}, Despues: ${stockFin})`, `Diferencia: ${stockFin - stockIni}`);

  // 4. Reevaluar alertas y verificar auditoria registrada
  const reevaluacion = await apiRequest('/alertas/reevaluar', 'POST', null, tokenInv);
  registrarPrueba('nivel4_ciclo_inventario', 'Reevaluacion automatica post-movimiento', reevaluacion.status === 200, 'HTTP 200', `HTTP ${reevaluacion.status}`);

  const auditoriaCheck = await apiRequest('/auditoria?entidad=movimientos', 'GET', null, tokenAdmin);
  const tieneAuditoria = auditoriaCheck.data?.data?.length > 0;
  registrarPrueba('nivel4_ciclo_inventario', 'Pista de auditoria inmutable para el movimiento', tieneAuditoria, 'Registros de auditoria presentes', `Total: ${auditoriaCheck.data?.data?.length || 0}`);

  // =========================================================================
  // NIVEL 5: CICLO COMPLETO DE COMPRAS, DETECCION DUPLICADOS Y RECEPCION
  // =========================================================================
  logPaso('NIVEL 5: Ciclo de Compras, Deteccion de Duplicados y Recepcion Fisica');

  // 1. Crear Orden A
  const ordenA = await apiRequest('/ordenes', 'POST', {
    proveedor_id: 2,
    ubicacion_destino_id: 1,
    fecha_entrega_estimada: '2026-11-25',
    observaciones: 'Orden Original Ciclo Nivel 5',
    items: [{ material_id: 2, cantidad_solicitada: 10, precio_unitario_crc: 5000 }],
  }, tokenCom);
  registrarPrueba('nivel5_ciclo_compras_recepcion', 'Creacion de Orden de Compra A', ordenA.status === 201, 'HTTP 201 Creada', `HTTP ${ordenA.status}`);

  // 2. Crear Orden B en ventana de 7 dias, mismo proveedor y tolerancia de monto -> Marca posible duplicado
  const ordenB = await apiRequest('/ordenes', 'POST', {
    proveedor_id: 2,
    ubicacion_destino_id: 1,
    fecha_entrega_estimada: '2026-11-25',
    observaciones: 'Orden Duplicada Simil Ciclo Nivel 5',
    items: [{ material_id: 2, cantidad_solicitada: 10, precio_unitario_crc: 5000 }],
  }, tokenCom);
  const esDuplicado = ordenB.data?.data?.es_posible_duplicado === 1;
  registrarPrueba('nivel5_ciclo_compras_recepcion', 'Deteccion determinista de posible duplicado (flag y vinculacion)', ordenB.status === 201 && esDuplicado, 'es_posible_duplicado: 1', `es_posible_duplicado: ${ordenB.data?.data?.es_posible_duplicado}`);

  // 3. Revisar y descartar duplicado de la Orden B
  if (ordenB.data?.data?.id) {
    const revision = await apiRequest(`/ordenes/${ordenB.data.data.id}/revisar-duplicado`, 'POST', {
      decision: 'DESCARTAR_FALSO_POSITIVO',
      observaciones: 'Lote justificado por requerimiento urgente de obra en segundo frente',
    }, tokenAdmin);
    registrarPrueba('nivel5_ciclo_compras_recepcion', 'Resolucion de falso positivo de duplicado', revision.status === 200, 'HTTP 200', `HTTP ${revision.status}`);
  }

  // 4. Flujo operativo de Orden A: Aprobacion -> Envio -> Recepcion fisica
  if (ordenA.data?.data?.id) {
    const idA = ordenA.data.data.id;
    const detalleId = ordenA.data.data.detalle[0].id;

    // Si ordenA fue marcada como sospecha de duplicado por orden previa, descartarla primero
    if (ordenA.data.data.es_posible_duplicado === 1) {
      await apiRequest(`/ordenes/${idA}/revisar-duplicado`, 'POST', {
        decision: 'DESCARTAR_FALSO_POSITIVO',
        observaciones: 'Descarte de duplicado para continuar flujo operativo',
      }, tokenAdmin);
    }

    // Aprobar
    const aprA = await apiRequest(`/ordenes/${idA}/aprobar`, 'POST', {}, tokenAdmin);
    // Enviar a proveedor
    const envio = await apiRequest(`/ordenes/${idA}/enviar`, 'POST', {}, tokenCom);
    registrarPrueba('nivel5_ciclo_compras_recepcion', 'Transicion de Orden A a estado ENVIADA', envio.status === 200 && envio.data?.data?.estado === 'ENVIADA', 'estado: ENVIADA', `Estado: ${envio.data?.data?.estado}`);

    // Consultar stock previo de material 2 en ubicacion 1
    const stockPrevMat2 = await apiRequest('/inventario/materiales/2/ubicaciones', 'GET', null, tokenInv);
    const ubi1Prev = stockPrevMat2.data?.data?.ubicaciones?.find(u => u.ubicacion_id === 1);
    const stockPrev = Number(ubi1Prev?.stock_ubicacion ?? ubi1Prev?.existencia_actual ?? 0);

    // Registrar Recepcion Fisica (10 unidades)
    const recepcion = await apiRequest(`/ordenes/${idA}/recepciones`, 'POST', {
      items: [{ detalle_id: detalleId, cantidad_a_recibir: 10 }],
      referencia: 'REM-AUDITORIA-2026-01',
      observaciones: 'Recepcion completa verificada en bodega',
    }, tokenInv);
    registrarPrueba('nivel5_ciclo_compras_recepcion', 'Registro de recepcion fisica vinculada a orden', (recepcion.status === 200 || recepcion.status === 201), 'HTTP 200 o 201', `HTTP ${recepcion.status}`);

    // Verificar que el estado de la orden cambio a RECIBIDA
    const ordenAActualizada = await apiRequest(`/ordenes/${idA}`, 'GET', null, tokenCom);
    registrarPrueba('nivel5_ciclo_compras_recepcion', 'Actualizacion automatica de estado de orden a RECIBIDA', ordenAActualizada.data?.data?.estado === 'RECIBIDA', 'estado: RECIBIDA', `Estado: ${ordenAActualizada.data?.data?.estado}`);

    // Verificar incremento de existencias en el libro mayor
    const stockPostMat2 = await apiRequest('/inventario/materiales/2/ubicaciones', 'GET', null, tokenInv);
    const ubi1Post = stockPostMat2.data?.data?.ubicaciones?.find(u => u.ubicacion_id === 1);
    const stockPost = Number(ubi1Post?.stock_ubicacion ?? ubi1Post?.existencia_actual ?? 0);
    const incrementoRecepcion = Math.abs((stockPost - stockPrev) - 10.00) < 0.001;
    registrarPrueba('nivel5_ciclo_compras_recepcion', 'Impacto en libro mayor por recepcion (+10 unidades en stock)', incrementoRecepcion, `StockPrev: ${stockPrev}, StockPost: ${stockPost}`, `Diferencia: ${stockPost - stockPrev}`);
  }

  // =========================================================================
  // NIVEL 6: AUTOMATIZACIONES Y FLUJOS n8n
  // =========================================================================
  logPaso('NIVEL 6: Automatizaciones n8n y Procesamiento Outbox');

  // Consultar SQLite de n8n para verificar el estado de los flujos activos y ejecuciones
  try {
    const pyScript = `
import sqlite3, os, json
db = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db)
c = conn.cursor()
wfs = c.execute("SELECT id, name, active FROM workflow_entity WHERE name LIKE '%Gestion_inventory%'").fetchall()
execs = c.execute("SELECT id, workflowId, status, startedAt FROM execution_entity ORDER BY id DESC LIMIT 5").fetchall()
print(json.dumps({'wfs': wfs, 'execs': execs}))
conn.close()
`;
    const resPy = spawnSync('python', ['-c', pyScript], { encoding: 'utf-8' });
    if (resPy.status === 0 && resPy.stdout) {
      const data = JSON.parse(resPy.stdout);
      const activos = data.wfs.filter(w => w[2] === 1);
      registrarPrueba('nivel6_automatizaciones_n8n', '4 Workflows de Gestion_inventory activos en n8n', activos.length === 4, '4 activos', `Activos: ${activos.length} de ${data.wfs.length}`);
      registrarPrueba('nivel6_automatizaciones_n8n', 'Registro de ejecuciones activas en n8n', data.execs.length > 0, 'Al menos una ejecucion registrada', `Ultimas ejecuciones: ${data.execs.length}`);
    } else {
      registrarPrueba('nivel6_automatizaciones_n8n', 'Consulta n8n SQLite via Python', false, 'OK', resPy.stderr);
    }
  } catch (errN8n) {
    registrarPrueba('nivel6_automatizaciones_n8n', 'Acceso a base de datos de n8n SQLite', false, 'Conexion OK', errN8n.message);
  }

  // Reclamar lote outbox desde el endpoint de integracion para validar ciclo idempotente
  const outboxReclamar = await apiRequest('/integracion/eventos/reclamar?limite=5', 'POST', null, tokenAdmin);
  registrarPrueba('nivel6_automatizaciones_n8n', 'Endpoint Reclamar Lote Outbox (/api/integracion/eventos/reclamar)', outboxReclamar.status === 200, 'HTTP 200 con claim_token y eventos', `HTTP ${outboxReclamar.status}, Eventos: ${outboxReclamar.data?.data?.eventos?.length || 0}`);

  // =========================================================================
  // NIVEL 7: FRONTEND COMPILACION Y DISTRIBUCION
  // =========================================================================
  logPaso('NIVEL 7: Compilacion y Entrega del Frontend');

  const buildProcess = spawnSync('npm', ['run', 'build'], {
    cwd: 'c:/Users/Foward/Desktop/Gestion_INVENTARIO/Gestion_inventory/frontend',
    shell: true,
    encoding: 'utf-8',
  });

  const buildExitoso = buildProcess.status === 0;
  registrarPrueba('nivel7_frontend_build', 'Compilacion TypeScript y Vite (tsc -b && vite build)', buildExitoso, 'Exito con codigo 0', buildExitoso ? 'Compilacion exitosa 0 errores' : buildProcess.stderr);

  // =========================================================================
  // RESUMEN GENERAL DE AUDITORIA
  // =========================================================================
  console.log(`\n============================================================`);
  console.log(`[RESUMEN FINAL DE LA AUDITORIA REAL]`);
  console.log(`============================================================`);
  console.log(`Total de pruebas ejecutadas: ${RESULTADOS.resumen.total}`);
  console.log(`Pruebas SUPERADAS:          ${RESULTADOS.resumen.superadas}`);
  console.log(`Pruebas FALLIDAS:           ${RESULTADOS.resumen.fallidas}`);
  console.log(`Porcentaje de conformidad:  ${((RESULTADOS.resumen.superadas / RESULTADOS.resumen.total) * 100).toFixed(1)}%`);
  console.log(`============================================================\n`);

  process.exit(RESULTADOS.resumen.fallidas > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Error fatal durante la ejecucion:', err);
  process.exit(1);
});
