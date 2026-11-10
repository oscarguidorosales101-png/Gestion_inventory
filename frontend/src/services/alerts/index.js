import { api, apiFetch } from '../api.js';

export const alertsService = {
  ...api.alertas,
  getAll: (params) => api.alertas.getAll(params),
  getById: (id) => apiFetch(`/alertas/${id}`),
  resolver: (id, motivo) => api.alertas.resolver(id, motivo),
  reevaluar: () => api.alertas.reevaluar(),
};

export default alertsService;

