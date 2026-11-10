import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getToken, setToken, removeToken } from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(getToken());
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await api.auth.me();
      if (res && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      removeToken();
      setTokenState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }

    const handleUnauthorized = () => {
      setUser(null);
      setTokenState(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [token]);

  const login = async (email, password) => {
    const res = await api.auth.login({ email, password });
    const { token: receivedToken, usuario } = res.data;
    setToken(receivedToken);
    setTokenState(receivedToken);
    setUser(usuario);
    return usuario;
  };

  const logout = () => {
    removeToken();
    setTokenState(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const hasRole = (...allowedRoles) => {
    if (!user || !user.rol) return false;
    return allowedRoles.flat().includes(user.rol);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        refreshProfile,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};

