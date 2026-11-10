import React from 'react';
import { useAuth } from '../hooks/useAuth';

export const RoleGuard = ({ allowedRoles, children, fallback = null }) => {
  const { user, hasRole } = useAuth();

  if (!user || !hasRole(allowedRoles)) {
    if (fallback) return fallback;
    return (
      <div className="alert-banner alert-danger" style={{ margin: '24px' }}>
        <strong>Acceso Restringido:</strong> Su rol actual ({user?.rol || 'No autenticado'}) no posee los privilegios requeridos para acceder a esta vista según la matriz RBAC institucional.
      </div>
    );
  }

  return children;
};

