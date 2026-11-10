import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../constants/roles';
import { AdminDashboard } from '../dashboards/AdminDashboard';
import { InventarioDashboard } from '../dashboards/InventarioDashboard';
import { ComprasDashboard } from '../dashboards/ComprasDashboard';
import { ConsultaDashboard } from '../dashboards/ConsultaDashboard';

export const DashboardPage = ({ onNavigate }) => {
  const { user } = useAuth();
  const [selectedDashboardRole, setSelectedDashboardRole] = useState(user?.rol || ROLES.ADMINISTRADOR);

  // Si el usuario es ADMINISTRADOR, le permitimos alternar la vista entre los 4 dashboards para auditar la experiencia de cada rol
  const esAdmin = user?.rol === ROLES.ADMINISTRADOR;
  const rolActivo = esAdmin ? selectedDashboardRole : user?.rol;

  return (
    <div>
      {esAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '8px 12px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', width: 'fit-content' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Vista de Rol (Admin):
          </span>
          <button
            className={`btn btn-sm ${rolActivo === ROLES.ADMINISTRADOR ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedDashboardRole(ROLES.ADMINISTRADOR)}
          >
            Administración
          </button>
          <button
            className={`btn btn-sm ${rolActivo === ROLES.ENCARGADO_INVENTARIO ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedDashboardRole(ROLES.ENCARGADO_INVENTARIO)}
          >
            Inventario
          </button>
          <button
            className={`btn btn-sm ${rolActivo === ROLES.COMPRAS ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedDashboardRole(ROLES.COMPRAS)}
          >
            Compras
          </button>
          <button
            className={`btn btn-sm ${rolActivo === ROLES.CONSULTA ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedDashboardRole(ROLES.CONSULTA)}
          >
            Consulta
          </button>
        </div>
      )}

      {rolActivo === ROLES.ADMINISTRADOR && <AdminDashboard onNavigate={onNavigate} />}
      {rolActivo === ROLES.ENCARGADO_INVENTARIO && <InventarioDashboard onNavigate={onNavigate} />}
      {rolActivo === ROLES.COMPRAS && <ComprasDashboard onNavigate={onNavigate} />}
      {rolActivo === ROLES.CONSULTA && <ConsultaDashboard onNavigate={onNavigate} />}
    </div>
  );
};

