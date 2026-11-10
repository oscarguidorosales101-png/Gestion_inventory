const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
  const model = process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.trim() : DEFAULT_MODEL;
  return { apiKey, model };
}

/**
 * Realiza una peticion HTTP POST segura a la API REST de Google Gemini.
 * Sanitiza cualquier error para garantizar que la API key jamas sea expuesta en logs o excepciones.
 */
async function callGeminiApi(payload, timeoutMs = 15000) {
  const { apiKey, model } = getGeminiConfig();

  if (!apiKey) {
    const err = new Error('Integracion de Gemini no configurada: variable GEMINI_API_KEY ausente.');
    err.statusCode = 503;
    err.code = 'GEMINI_NOT_CONFIGURED';
    throw err;
  }

  const endpointUrl = `${API_BASE}/${model}:generateContent`;

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
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
      throw err;
    }

    return data;
  } catch (err) {
    if (err.name === 'TimeoutError' || err.code === 'ABORT_ERR') {
      throw new Error(`Timeout de conexion con Gemini API tras ${timeoutMs} ms.`);
    }
    const safeError = err.message.replace(new RegExp(apiKey, 'g'), '[REDACTED_API_KEY]');
    const errorWrapper = new Error(safeError);
    errorWrapper.statusCode = err.statusCode || 500;
    throw errorWrapper;
  }
}

/**
 * Verifica la conectividad real con Google Gemini realizando una prueba de solicitud minima.
 */
export async function verificarConexionGemini() {
  const { apiKey, model } = getGeminiConfig();
  if (!apiKey) {
    return {
      configurado: false,
      conectado: false,
      modelo: model,
      mensaje: 'Variable GEMINI_API_KEY no establecida en entorno local.',
    };
  }

  const t0 = Date.now();
  try {
    const payload = {
      contents: [
        {
          parts: [{ text: 'Responde exclusivamente con la palabra OK.' }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 10,
        temperature: 0.1,
      },
    };

    const response = await callGeminiApi(payload, 8000);
    const latencyMs = Date.now() - t0;
    const textOutput = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'OK';

    return {
      configurado: true,
      conectado: true,
      modelo: model,
      latencia_ms: latencyMs,
      respuesta_prueba: textOutput,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      configurado: true,
      conectado: false,
      modelo: model,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Genera un analisis ejecutivo de inventario y riesgos de abastecimiento
 * utilizando IA generativa para asistir a la toma de decisiones humanas.
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
1. Proporciona un diagnóstico ejecutivo breve (máximo 3 párrafos).
2. Identifica el principal riesgo de abastecimiento para las obras.
3. Sugiere 3 recomendaciones operativas prioritarias en compras y almacén.
4. No reemplaces ninguna regla determinista ni cálculo financiero oficial.
`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.3,
    },
  };

  const response = await callGeminiApi(payload, 15000);
  const analisisTexto = response?.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar el texto de análisis.';

  return {
    modelo: getGeminiConfig().model,
    fecha_generacion: new Date().toISOString(),
    analisis_ejecutivo: analisisTexto,
    caracter: 'ASESORIA_OPERATIVA_NO_VINCULANTE',
  };
}

/**
 * Realiza un análisis multifactorial de duplicidad entre una orden de compra nueva y un conjunto de órdenes candidatas
 * utilizando el modelo Google Gemini de forma estructurada e inteligente.
 */
export async function analizarDuplicidadOrdenIA(ordenNueva, ordenesCandidatas = []) {
  if (!ordenesCandidatas || ordenesCandidatas.length === 0) {
    return {
      es_posible_duplicado: false,
      orden_similar_id: null,
      nivel_coincidencia: 'SIN_COINCIDENCIAS',
      nivel_confianza: 'ALTO (100%)',
      explicacion: 'No existen órdenes previas emitidas para este proveedor en la ventana temporal auditada.',
      motivos_coincidencia: [],
      diferencias_detectadas: ['Proveedor sin órdenes previas en la ventana de control'],
      datos_justifican: {
        total_candidatas_evaluadas: 0,
        proveedor_id: ordenNueva.proveedor_id,
      },
      consecuencias_posibles: 'Ninguna. La orden prosigue su flujo regular de compras.',
      recomendacion: 'Proceder con la aprobación operativa ordinaria.',
      procedimiento_sugerido: 'Continuar con el proceso de aprobación según los niveles establecidos.',
      modelo_utilizado: getGeminiConfig().model,
      fecha_analisis: new Date().toISOString(),
    };
  }

  const prompt = `
Eres un auditor experto en control interno de compras, logística y prevención de fraude corporativo en Costa Rica.
Evalúa exhaustivamente si la SIGUIENTE ORDEN NUEVA constituye un posible duplicado (accidental o redundante) de alguna de las ÓRDENES CANDIDATAS existentes en la base de datos.

REGLAS DE AUDITORÍA MULTIFACTORIAL:
1. Compara: proveedor (razón social e identificación fiscal), materiales solicitados (códigos, nombres), cantidades, precios unitarios, subtotal, impuestos, total en CRC, bodega de destino y fecha/hora de emisión.
2. Identifica si hay coincidencia total o sustancial (por ejemplo, mismos materiales y cantidades solicitadas con fechas muy cercanas).
3. Determina el nivel de coincidencia:
   - "CONFIRMADO_DUPLICADO": Mismo proveedor, mismos materiales y cantidades, importes idénticos o casi idénticos dentro de la ventana de tiempo.
   - "ALTA": Coincidencia en proveedor y en la mayoría de materiales o monto relevante, requiere revisión obligatoria.
   - "MODERADA": Coincidencia parcial en proveedor y algunos ítems pero con variaciones de volumen o ubicación.
   - "BAJA": Mismo proveedor pero materiales totalmente diferentes y fechas distantes.
   - "SIN_COINCIDENCIAS": No hay relación o similitud operativa.
4. Responde EXCLUSIVAMENTE con un objeto JSON válido con los siguientes campos estrictos:
{
  "es_posible_duplicado": boolean,
  "orden_similar_id": number or null,
  "nivel_coincidencia": "SIN_COINCIDENCIAS" | "BAJA" | "MODERADA" | "ALTA" | "REVISION_MANUAL_REQUERIDA" | "CONFIRMADO_DUPLICADO",
  "nivel_confianza": string,
  "explicacion": string,
  "motivos_coincidencia": string[],
  "diferencias_detectadas": string[],
  "datos_justifican": { ... },
  "consecuencias_posibles": string,
  "recomendacion": string,
  "procedimiento_sugerido": string
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
      maxOutputTokens: 1200,
    },
  };

  try {
    const response = await callGeminiApi(payload, 20000);
    const rawText = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Respuesta vacía recibida del modelo Gemini.');
    const parsed = JSON.parse(rawText);

    return {
      es_posible_duplicado: Boolean(parsed.es_posible_duplicado),
      orden_similar_id: parsed.orden_similar_id ? Number(parsed.orden_similar_id) : (ordenesCandidatas[0]?.id || null),
      nivel_coincidencia: parsed.nivel_coincidencia || (parsed.es_posible_duplicado ? 'ALTA' : 'SIN_COINCIDENCIAS'),
      nivel_confianza: parsed.nivel_confianza || 'ALTO',
      explicacion: parsed.explicacion || 'Análisis multifactorial generado por IA.',
      motivos_coincidencia: Array.isArray(parsed.motivos_coincidencia) ? parsed.motivos_coincidencia : [],
      diferencias_detectadas: Array.isArray(parsed.diferencias_detectadas) ? parsed.diferencias_detectadas : [],
      datos_justifican: parsed.datos_justifican || {},
      consecuencias_posibles: parsed.consecuencias_posibles || 'Riesgo de doble erogación presupuestaria.',
      recomendacion: parsed.recomendacion || 'Revisar orden antes de aprobar.',
      procedimiento_sugerido: parsed.procedimiento_sugerido || 'Verificar con el solicitante la justificación de la compra.',
      modelo_utilizado: getGeminiConfig().model,
      fecha_analisis: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error en análisis Gemini IA:', err.message);
    const cand = ordenesCandidatas[0];
    const montoCoincide = Math.abs(Number(ordenNueva.total_crc) - Number(cand?.total_crc || 0)) < 0.01;
    return {
      es_posible_duplicado: montoCoincide,
      orden_similar_id: cand?.id || null,
      nivel_coincidencia: montoCoincide ? 'ALTA' : 'BAJA',
      nivel_confianza: 'DEFENSIVO_REGLAS_INTERNAS',
      explicacion: `Evaluación basada en reglas internas debido a indisponibilidad de IA: ${err.message}`,
      motivos_coincidencia: montoCoincide ? ['Mismo proveedor y monto total coincidente'] : [],
      diferencias_detectadas: ['Análisis asistido no disponible'],
      datos_justifican: { fallback: true, candidatas: ordenesCandidatas.length },
      consecuencias_posibles: 'Requiere revisión visual manual preventiva.',
      recomendacion: 'Verificar manualmente la orden en el módulo de compras.',
      procedimiento_sugerido: 'Comparar ítems y montos directamente en pantalla.',
      modelo_utilizado: 'sistema-interno-reglas',
      fecha_analisis: new Date().toISOString(),
    };
  }
}

