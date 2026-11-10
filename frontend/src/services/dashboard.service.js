import { api } from './api';

export const dashboardService = {
  getResumen: async () => {
    const res = await api.dashboard.getMetricas();
    return res.data;
  },
  getAdminDashboard: async () => {
    const res = await api.dashboard.getAdminDashboard();
    return res.data;
  },
  getInventarioDashboard: async () => {
    const res = await api.dashboard.getInventarioDashboard();
    return res.data;
  },
  getComprasDashboard: async () => {
    const res = await api.dashboard.getComprasDashboard();
    return res.data;
  },
  getConsultaDashboard: async () => {
    const res = await api.dashboard.getConsultaDashboard();
    return res.data;
  },
};

