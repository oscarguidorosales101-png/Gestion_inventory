import { api } from './api';

export const authService = {
  login: async (email, password) => {
    const res = await api.auth.login({ email, password });
    return res.data;
  },
  getProfile: async () => {
    const res = await api.auth.me();
    return res.data;
  },
  cambiarPassword: async (passwordActual, passwordNueva) => {
    const res = await api.auth.cambiarPassword({ passwordActual, passwordNueva });
    return res.data;
  },
};

