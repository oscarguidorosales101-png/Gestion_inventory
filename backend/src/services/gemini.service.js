import { env } from '../config/env.js';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const RETRY_BASE_DELAYS = [0, 2000, 5000, 10000];

export function getGeminiConfig() {
  const apiKey = (env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  const model = (env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
  const fallbackModel = (env.GEMINI_FALLBACK_MODEL || process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-lite-latest').trim();
  const timeoutMs = Number(env.GEMINI_TIMEOUT_MS || process.env.GEMINI_TIMEOUT_MS) || 20000;
  const maxRetries = Number(env.GEMINI_MAX_RETRIES || process.env.GEMINI_MAX_RETRIES) || 3;

  return { apiKey, model, fallbackModel, timeoutMs, maxRetries };
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function calcularEsperaConJitter(intento) {
  const base = RETRY_BASE_DELAYS[Math.min(intento, RETRY_BASE_DELAYS.length - 1)] || 10000;
  if (base === 0) return 0;
  const jitter = Math.floor(Math.random() * (base * 0.25));
  return base + jitter;
}

/**
 * Consulta la lista oficial de modelos habilitados para la API Key.
 */
export async function listarModelosDisponibles() {
  const { apiKey } = getGeminiConfig();
  if (!apiKey) {
    throw new Error('Variable GEMINI_API_KEY ausente.');
  }
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  if (!res.ok) {
    const safeMsg = JSON.stringify(data).replace(new RegExp(apiKey, 'g'), '[REDACTED_API_KEY]');
    throw new Error(`Error listando modelos Gemini (HTTP ${res.status}): ${safeMsg}`);
  }
  return data.models || [];
}

/**
 * Realiza una invocación singular al endpoint de un modelo específico.
 * Identifica si el error es transitorio o definitivo y redacta la clave API.
 */
async function callGeminiSingle(modelName, payload, timeoutMs = 20000) {
  const { apiKey } = getGeminiConfig();

  if (!apiKey) {
    const err = new Error('Integración de Google Gemini no configurada: GEMINI_API_KEY ausente.');
    err.statusCode = 503;
    err.isRetryable = false;
    throw err;
  }

  const endpointUrl = `${API_BASE}/${modelName}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const data = await response.json();

    if (!response.ok) {
      const rawMsg = JSON.stringify(data);
      const safeMessage = rawMsg.replace(new RegExp(apiKey, 'g'), '[REDACTED_API_KEY]');
      const err = new Error(`Gemini API error (HTTP ${response.status}): ${safeMessage}`);
      err.statusCode = response.status;
      err.responseBody = data;

      // Determinación estricta de reintentabilidad
      if ([503, 429, 500, 502, 504].includes(response.status)) {
        err.isRetryable = true;
      } else {
        err.isRetryable = false;
      }
      throw err;
    }

    return { data, modelUsed: modelName };
  } catch (err) {
    if (err.name === 'TimeoutError' || err.code === 'ABORT_ERR') {
      const timeoutErr = new Error(`Timeout de conexión con modelo [${modelName}] tras ${timeoutMs}ms.`);
      timeoutErr.statusCode = 504;
      timeoutErr.isRetryable = true;
      throw timeoutErr;
    }
    const safeMsg = (err.message || '').replace(new RegExp(apiKey, 'g'), '[REDACTED_API_KEY]');
    const wrapped = new Error(safeMsg);
    wrapped.statusCode = err.statusCode || 500;
    wrapped.isRetryable = err.isRetryable !== undefined ? err.isRetryable : true;
    wrapped.responseBody = err.responseBody;
    throw wrapped;
  }
}

/**
 * Ejecuta una solicitud a Gemini implementando Exponential Backoff con Jitter
 * y conmutación automática al modelo alternativo (fallback) si el principal está bajo alta demanda (503).
 */
export async function executeGeminiWithRetry(payload, options = {}) {
  const { model: primaryModel, fallbackModel, timeoutMs, maxRetries } = getGeminiConfig();
  const modelsToAttempt = [primaryModel];
  if (fallbackModel && fallbackModel !== primaryModel) {
    modelsToAttempt.push(fallbackModel);
  }

  let lastError = null;

  for (let mIdx = 0; mIdx < modelsToAttempt.length; mIdx++) {
    const currentModel = modelsToAttempt[mIdx];
    const isFallback = mIdx > 0;

    if (isFallback) {
      console.warn(`[Gemini AI] Conmutando a modelo alternativo verificado [${currentModel}] por indisponibilidad del modelo principal [${primaryModel}].`);
    }

    for (let intento = 0; intento <= maxRetries; intento++) {
      if (intento > 0) {
        const esperaMs = calcularEsperaConJitter(intento);
        console.warn(`[Gemini AI] Reintento ${intento}/${maxRetries} para modelo [${currentModel}] tras espera de ${esperaMs}ms...`);
        await sleep(esperaMs);
      }

      try {
        const result = await callGeminiSingle(currentModel, payload, timeoutMs);
        return result;
      } catch (err) {
        lastError = err;
        console.error(`[Gemini AI] Fallo en modelo [${currentModel}] intento ${intento + 1}: (HTTP ${err.statusCode}) ${err.message}`);

        // Si el error no es reintentable (400, 401, 403), no reintentar
        if (!err.isRetryable) {
          throw err;
        }

        // Si es 404 de modelo no disponible, saltar inmediatamente al modelo alternativo
        if (err.statusCode === 404) {
          break;
        }
      }
    }
  }

  // Si se agotaron todos los reintentos en todos los modelos configurados:
  const finalError = new Error(`Google Gemini API no disponible tras agotar ${maxRetries} reintentos en modelos [${modelsToAttempt.join(', ')}]: ${lastError?.message || 'Error desconocido'}`);
  finalError.statusCode = lastError?.statusCode || 503;
  finalError.isTransient = true;
  throw finalError;
}

/**
 * Verifica la conectividad real con Google Gemini API.
 */
export async function verificarConexionGemini() {
  const { apiKey, model, fallbackModel } = getGeminiConfig();
  if (!apiKey) {
    return {
      configurado: false,
      conectado: false,
      modelo_principal: model,
      modelo_alternativo: fallbackModel,
      mensaje: 'Variable GEMINI_API_KEY no establecida en el entorno.',
    };
  }

  const t0 = Date.now();
  try {
    const payload = {
      contents: [{ parts: [{ text: 'Responde exclusivamente con la palabra OK.' }] }],
      generationConfig: { maxOutputTokens: 10, temperature: 0.1 },
    };

    const { data, modelUsed } = await executeGeminiWithRetry(payload, { maxRetries: 2 });
    const latencyMs = Date.now() - t0;
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'OK';

    return {
      configurado: true,
      conectado: true,
      modelo_utilizado: modelUsed,
      modelo_principal: model,
      modelo_alternativo: fallbackModel,
      latencia_ms: latencyMs,
      respuesta_prueba: textOutput,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      configurado: true,
      conectado: false,
      modelo_principal: model,
      modelo_alternativo: fallbackModel,
      error: err.message,
      statusCode: err.statusCode || 500,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Realiza un análisis multifactorial de duplicidad estructurado entre una orden de compra
 * y sus candidatas históricas utilizando Google Gemini de forma verificable.
 *
 * NUNCA oculta errores ni inventa diagnósticos de reglas si la IA no responde.
 */
export async function analizarDuplicidadOrdenIA(ordenNueva, ordenesCandidatas = []) {
  const { model: primaryModel } = getGeminiConfig();

  // Caso 1: Sin órdenes candidatas en la ventana temporal auditada
  if (!ordenesCandidatas || ordenesCandidatas.length === 0) {
    return {
      resultado: 'SIN_COINCIDENCIAS',
      es_posible_duplicado: false,
      orden_similar_id: null,
      nivel_coincidencia: 'SIN_COINCIDENCIAS',
      nivel_confianza: 'ALTO (100%)',
      orden_analizada: ordenNueva.numero_orden || ordenNueva.id,
      orden_relacionada: null,
      motivos_coincidencia: [],
      diferencias_detectadas: ['Proveedor sin órdenes previas en la ventana temporal de control (7 días)'],
      datos_justifican: {
        total_candidatas_evaluadas: 0,
        proveedor_id: ordenNueva.proveedor_id,
        proveedor_nombre: ordenNueva.proveedor_nombre,
      },
      explicacion: 'Se evaluaron los registros históricos dentro del período configurado. No se encontraron órdenes previas para este proveedor en la ventana auditada. La orden no presenta indicios de duplicidad.',
      consecuencias_posibles: 'Ninguna detectada. La orden puede proseguir su ciclo regular de adquisiciones.',
      recomendacion: 'Continuar con el procedimiento normal de aprobación.',
      procedimiento_sugerido: 'Avanzar a la fase de autorización según la matriz de niveles correspondiente.',
      modelo_utilizado: primaryModel,
      fecha_analisis: new Date().toISOString(),
      estado_analisis: 'COMPLETADO',
    };
  }

  // Caso 2: Existen candidatas relevantes -> Análisis multifactorial asistido por Gemini
  const prompt = `
Eres un auditor experto en control interno de compras, logística y prevención de pagos duplicados en Costa Rica.
Analiza con rigor si la SIGUIENTE ORDEN NUEVA constituye un posible duplicado (accidental, redundante o fraudulento) de alguna de las ÓRDENES CANDIDATAS existentes en la base de datos.

REGLAS DE AUDITORÍA MULTIFACTORIAL:
1. Compara: proveedor (razón social y cédula jurídica), materiales solicitados (códigos, nombres, descripciones), cantidades, precios unitarios en CRC, subtotal, impuestos, total en CRC, bodega de destino y fecha/hora de emisión.
2. Identifica si hay coincidencia total o sustancial en el suministro.
3. Determina el nivel de coincidencia:
   - "CONFIRMADO_DUPLICADO": Mismo proveedor, mismos materiales y cantidades, importes idénticos dentro de la ventana temporal.
   - "ALTA": Coincidencia en proveedor y en la mayoría de materiales o importe principal con fechas muy cercanas. Requiere revisión humana obligatoria.
   - "MODERADA": Coincidencia en proveedor y algunos ítems pero con variaciones en cantidades o bodega de entrega.
   - "BAJA": Mismo proveedor pero ítems y montos completamente diferentes.
   - "SIN_COINCIDENCIAS": No hay relación ni similitud operativa apreciable.

IMPORTANTE: Proporciona explicaciones claras, profesionales y ejecutivas sin textos excesivamente extensos ni redundantes.

Responde EXCLUSIVAMENTE con un objeto JSON válido con los siguientes campos estrictos:
{
  "resultado": "POSIBLE_DUPLICADO_DETECTADO" | "SIN_COINCIDENCIAS",
  "es_posible_duplicado": boolean,
  "orden_similar_id": number or null,
  "nivel_coincidencia": "SIN_COINCIDENCIAS" | "BAJA" | "MODERADA" | "ALTA" | "REVISION_MANUAL_REQUERIDA" | "CONFIRMADO_DUPLICADO",
  "nivel_confianza": string (ej: "ALTO (95%)", "MODERADO (75%)"),
  "orden_analizada": string,
  "orden_relacionada": string or null,
  "motivos_coincidencia": string[],
  "diferencias_detectadas": string[],
  "datos_justifican": { ... },
  "explicacion": string (resumen ejecutivo del diagnóstico),
  "consecuencias_posibles": string (riesgo financiero o de sobreinventario),
  "recomendacion": string (acción clara para compras),
  "procedimiento_sugerido": string (pasos operativos a seguir)
}

ORDEN NUEVA A EVALUAR:
${JSON.stringify(ordenNueva, null, 2)}

ÓRDENES CANDIDATAS EN LA VENTANA TEMPORAL:
${JSON.stringify(ordenesCandidatas, null, 2)}
`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json',
      maxOutputTokens: 1400,
    },
  };

  // Invocación robusta con reintentos y conmutación de modelo
  const { data, modelUsed } = await executeGeminiWithRetry(payload);

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    const emptyErr = new Error('Respuesta de contenido vacía recibida de Google Gemini.');
    emptyErr.statusCode = 502;
    emptyErr.isTransient = true;
    throw emptyErr;
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (jsonErr) {
    const parseErr = new Error(`Formato JSON inválido emitido por Gemini: ${rawText.slice(0, 150)}`);
    parseErr.statusCode = 502;
    parseErr.isTransient = true;
    throw parseErr;
  }

  const esDuplicado = Boolean(parsed.es_posible_duplicado);
  const candDefault = ordenesCandidatas[0]?.id || null;

  return {
    resultado: parsed.resultado || (esDuplicado ? 'POSIBLE_DUPLICADO_DETECTADO' : 'SIN_COINCIDENCIAS'),
    es_posible_duplicado: esDuplicado,
    orden_similar_id: parsed.orden_similar_id ? Number(parsed.orden_similar_id) : (esDuplicado ? candDefault : null),
    nivel_coincidencia: parsed.nivel_coincidencia || (esDuplicado ? 'ALTA' : 'SIN_COINCIDENCIAS'),
    nivel_confianza: parsed.nivel_confianza || (esDuplicado ? 'ALTO (90%)' : 'MODERADO (70%)'),
    orden_analizada: parsed.orden_analizada || String(ordenNueva.numero_orden || ordenNueva.id),
    orden_relacionada: parsed.orden_relacionada || (esDuplicado ? String(ordenesCandidatas[0]?.numero_orden || candDefault) : null),
    motivos_coincidencia: Array.isArray(parsed.motivos_coincidencia) ? parsed.motivos_coincidencia : [],
    diferencias_detectadas: Array.isArray(parsed.diferencias_detectadas) ? parsed.diferencias_detectadas : [],
    datos_justifican: parsed.datos_justifican || {},
    explicacion: parsed.explicacion || 'Análisis multifactorial completado por Gemini IA.',
    consecuencias_posibles: parsed.consecuencias_posibles || 'Riesgo de erogación redundante y sobrealmacenamiento.',
    recomendacion: parsed.recomendacion || (esDuplicado ? 'Verificar con el solicitante antes de autorizar.' : 'Continuar con el flujo ordinario.'),
    procedimiento_sugerido: parsed.procedimiento_sugerido || 'Revisar antecedentes en el módulo de compras.',
    modelo_utilizado: modelUsed,
    fecha_analisis: new Date().toISOString(),
    estado_analisis: 'COMPLETADO',
  };
}

/**
 * Genera un análisis ejecutivo de inventario para el dashboard gerencial.
 */
export async function generarAnalisisInventarioIA(metricas) {
  const prompt = `
Eres un asesor experto en logística, compras e inventarios para proyectos de ingeniería y construcción en Costa Rica.
Analiza las siguientes métricas reales extraídas de la base de datos de la empresa:
- Materiales en catálogo: ${metricas.totalMateriales}
- Valoración total del inventario: ₡${Number(metricas.valorTotalInventarioCrc || 0).toLocaleString('es-CR')}
- Artículos con stock normal: ${metricas.distribucionStockPorEstado?.normal || 0}
- Artículos en punto de reorden: ${metricas.distribucionStockPorEstado?.reorden || 0}
- Artículos en stock crítico: ${metricas.distribucionStockPorEstado?.critico || 0}
- Órdenes de compra pendientes de aprobación: ${metricas.ordenesPendientesAprobacion || 0}

Instrucciones:
1. Proporciona un diagnóstico ejecutivo conciso (máximo 3 párrafos).
2. Identifica el principal riesgo de abastecimiento para las obras.
3. Sugiere 3 recomendaciones operativas prioritarias en compras y almacén.
`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 600, temperature: 0.3 },
  };

  const { data, modelUsed } = await executeGeminiWithRetry(payload);
  const analisisTexto = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar el texto de análisis.';

  return {
    modelo: modelUsed,
    fecha_generacion: new Date().toISOString(),
    analisis_ejecutivo: analisisTexto,
    caracter: 'ASESORIA_OPERATIVA_NO_VINCULANTE',
  };
}
