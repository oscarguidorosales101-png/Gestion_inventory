import { apiFetch } from '../api.js';

export const integrationsService = {
  reevaluarAlertas: () => apiFetch('/integracion/alertas/reevaluar', { method: 'POST' }),
  reclamarEventos: (limite = 20) => apiFetch(`/integracion/eventos/reclamar?limite=${limite}`, { method: 'POST' }),
  completarEvento: (id, payload) =>
    apiFetch(`/integracion/eventos/${id}/completar`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  fallarEvento: (id, payload) =>
    apiFetch(`/integracion/eventos/${id}/fallar`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getDuplicadosPendientes: () => apiFetch('/integracion/auditoria/duplicados-pendientes'),
  registrarIncidencia: (datos) =>
    apiFetch('/integracion/auditoria/incidencia-workflow', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
};

export default integrationsService;

