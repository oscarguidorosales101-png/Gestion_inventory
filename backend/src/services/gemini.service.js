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
