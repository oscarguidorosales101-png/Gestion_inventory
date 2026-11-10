import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../constants/roles';
import { MainLayout } from '../layouts/MainLayout';
import { RoleGuard } from '../guards/RoleGuard';
import { api } from '../services/api';

import { DashboardPage } from '../pages/DashboardPage';
import { InventarioList } from '../features/inventario/InventarioList';
import { MaterialesList } from '../features/materiales/MaterialesList';
import { RecepcionesHistorial } from '../features/recepciones/RecepcionesHistorial';
import { MovimientosLedger } from '../features/movimientos/MovimientosLedger';
import { OrdenesList } from '../features/ordenes/OrdenesList';
import { ProveedoresList } from '../features/proveedores/ProveedoresList';
import { CategoriasList } from '../features/categorias/CategoriasList';
import { UbicacionesList } from '../features/ubicaciones/UbicacionesList';
import { AlertasList } from '../features/alertas/AlertasList';
import { ReglasList } from '../features/reglas/ReglasList';
import { UsuariosList } from '../features/usuarios/UsuariosList';
import { AuditoriaList } from '../features/auditoria/AuditoriaList';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [alertasActivas, setAlertasActivas] = useState(0);

  const fetchAlertasBadge = async () => {
    try {
      const res = await api.alertas.getAll({ solo_activas: true });
      setAlertasActivas(res.data?.length || 0);
    } catch {
      // Ignorar si falla badge
    }
  };

  useEffect(() => {
    fetchAlertasBadge();
    const interval = setInterval(fetchAlertasBadge, 60000);
    return () => clearInterval(interval);
  }, []);

  const titles = {
    dashboard: { title: 'Tablero Principal', subtitle: 'Métricas de Inventario y Abastecimiento' },
    inventario: { title: 'Existencias Globales', subtitle: 'Control Físico y Estados de Stock' },
    materiales: { title: 'Catálogo de Materiales', subtitle: 'Fórmulas de Seguridad y Parámetros' },
    recepciones: { title: 'Recepciones Físicas', subtitle: 'Ingreso de Mercancía a Bodegas' },
    movimientos: { title: 'Libro Mayor (Kardex)', subtitle: 'Historial Inmutable de Movimientos' },
    ordenes: { title: 'Órdenes de Compra', subtitle: 'Emisión, Aprobación y Prevención de Duplicados' },
    proveedores: { title: 'Directorio de Proveedores', subtitle: 'Lead Time y Calificación' },
    categorias: { title: 'Categorías de Gasto', subtitle: 'Clasificación de Materiales de Obra' },
    ubicaciones: { title: 'Bodegas y Frentes de Obra', subtitle: 'Ubicaciones Físicas de Almacén' },
    alertas: { title: 'Alertas de Stock', subtitle: 'Monitoreo de Quiebres y Reorden' },
    reglas: { title: 'Reglas de Negocio', subtitle: 'Parámetros Operativos del Sistema' },
    usuarios: { title: 'Gestión de Usuarios', subtitle: 'Control de Cuentas y Privilegios RBAC' },
    auditoria: { title: 'Bitácora de Auditoría', subtitle: 'Trazabilidad y Cumplimiento Normativo' },
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentView} />;
      case 'inventario':
        return <InventarioList />;
      case 'materiales':
        return <MaterialesList />;
      case 'recepciones':
        return (
          <RoleGuard allowedRoles={[ROLES.ADMINISTRADOR, ROLES.ENCARGADO_INVENTARIO, ROLES.CONSULTA]}>
            <RecepcionesHistorial />
          </RoleGuard>
        );
      case 'movimientos':
        return <MovimientosLedger />;
      case 'ordenes':
        return <OrdenesList />;
      case 'proveedores':
        return <ProveedoresList />;
      case 'categorias':
        return <CategoriasList />;
      case 'ubicaciones':
        return <UbicacionesList />;
      case 'alertas':
        return <AlertasList />;
      case 'reglas':
        return (
          <RoleGuard allowedRoles={[ROLES.ADMINISTRADOR]}>
            <ReglasList />
          </RoleGuard>
        );
      case 'usuarios':
        return (
          <RoleGuard allowedRoles={[ROLES.ADMINISTRADOR]}>
            <UsuariosList />
          </RoleGuard>
        );
      case 'auditoria':
        return (
          <RoleGuard allowedRoles={[ROLES.ADMINISTRADOR, ROLES.CONSULTA]}>
            <AuditoriaList />
          </RoleGuard>
        );
      default:
        return <NotFoundPage onGoHome={() => setCurrentView('dashboard')} />;
    }
  };

  const currentMeta = titles[currentView] || { title: 'Gestion_inventory', subtitle: '' };

  return (
    <MainLayout
      currentView={currentView}
      setCurrentView={setCurrentView}
      title={currentMeta.title}
      subtitle={currentMeta.subtitle}
      alertasPendientes={alertasActivas}
    >
      {renderContent()}
    </MainLayout>
  );
};

