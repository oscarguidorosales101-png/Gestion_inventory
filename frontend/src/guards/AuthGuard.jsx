import React from 'react';
import { useAuth } from '../hooks/useAuth';

export const AuthGuard = ({ children, fallback = null }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748B' }}>
        <p>Verificando sesión segura...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback;
  }

  return children;
};

