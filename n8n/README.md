# Gestion_inventory — Flujos de Automatizacion n8n (Fase 5)

Este directorio contiene las definiciones exportadas en formato JSON de los cuatro flujos de trabajo (workflows) de **n8n** diseÃ±ados para la orquestacion de eventos y automatizaciones de **Gestion_inventory**:

1. **`wf_outbox_processor.json`**:
   - **Objetivo**: Polling transaccional del Transactional Outbox del sistema.
   - **Frecuencia**: Cada 1 minuto (cron: `* * * * *`).
   - **Mecanica**: Llama a `POST /api/integracion/eventos/reclamar` con fencing de `claim_token` y recuperacion automatica de bloqueos expirados (>30s). Desglosa los eventos segun su tipo (`MOVIMIENTO_REGISTRADO`, `ORDEN_COMPRA_CREADA`, `ORDEN_COMPRA_ESTADO`, `RECEPCION_ORDEN_COMPRA`, `ALERTA_STOCK_ACTIVADA`), genera claves de idempotencia deterministas para efectos externos (`${evento_uuid}:NOTIFICACION_EXTERNA`) y finaliza llamando a `POST /api/integracion/eventos/:id/completar`.

2. **`wf_alertas_stock.json`**:
   - **Objetivo**: Reevaluacion sincronizada de niveles de existencias y reglas de inventario.
   - **Frecuencia**: Cada 15 minutos.
   - **Mecanica**: Invoca `POST /api/integracion/alertas/reevaluar`, recalculando el stock real a partir del libro mayor de movimientos y sincronizando el estado mutuamente excluyente de alertas (`STOCK_CRITICO`, `REORDEN`, `NORMAL`).

3. **`wf_deteccion_duplicados.json`**:
   - **Objetivo**: Auditoria periodica y deteccion de ordenes de compra sospechosas de duplicidad.
   - **Frecuencia**: Cada 30 minutos.
   - **Mecanica**: Consulta `GET /api/integracion/auditoria/duplicados-pendientes` para extraer ordenes con marcadores `es_posible_duplicado = 1` y consolida un reporte para revision por el rol Administrador / Compras.

4. **`wf_error_handler.json`**:
   - **Objetivo**: Captura global de fallos y recuperacion resiliente.
   - **Trigger**: Error Trigger nativo de n8n.
   - **Mecanica**: Captura errores en cualquier nodo de n8n, extrae metadatos de ejecucion (`execution_id`, `node`, `error_message`) y notifica al backend via `POST /api/integracion/auditoria/incidencia-workflow` para trazabilidad inmutable en la tabla de auditoria.

---

## Instrucciones de Importacion en n8n Local

1. Iniciar la instancia local de n8n (ej. `npx n8n start` o contenedor Docker).
2. En la interfaz web de n8n (habitualmente en `http://localhost:5678`), ingresar a la seccion **Workflows**.
3. Seleccionar **Import from File** (o arrastrar el archivo JSON) e importar cada uno de los cuatro archivos ubicados en `n8n/workflows/`.
4. Configurar las variables de entorno de n8n (o sustituir los valores correspondientes en las credenciales):
   - `BACKEND_INTERNAL_URL`: URL interna del backend Express (por defecto `http://localhost:3001`).
   - `N8N_INTEGRATION_API_KEY`: Clave secreta que coincide con la cabecera `X-Integration-Key` definida en `backend/.env`.
5. Activar los flujos (toggle **Active** a `true`) para habilitar los triggers cron.

