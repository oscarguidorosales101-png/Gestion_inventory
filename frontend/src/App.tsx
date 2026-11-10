import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './views/LoginView';
import { Sidebar, type ActiveModule } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './views/DashboardView';
import { InventarioView } from './views/InventarioView';
import { MaterialesView } from './views/MaterialesView';
import { CategoriasView } from './views/CategoriasView';
import { ProveedoresView } from './views/ProveedoresView';
import { UbicacionesView } from './views/UbicacionesView';
import { OrdenesView } from './views/OrdenesView';
import { RecepcionesView } from './views/RecepcionesView';
import { MovimientosView } from './views/MovimientosView';
import { AlertasView } from './views/AlertasView';
import { ReglasView } from './views/ReglasView';
import { UsuariosView } from './views/UsuariosView';
import { AuditoriaView } from './views/AuditoriaView';
import { CambioPasswordModal } from './components/modals/CambioPasswordModal';
import { api } from './services/api';
import { Building2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [currentModule, setCurrentModule] = useState<ActiveModule>('dashboard');
  const [cambioPassModalOpen, setCambioPassModalOpen] = useState(false);
  const [badgeAlertas, setBadgeAlertas] = useState(0);
  const [badgeOrdenes, setBadgeOrdenes] = useState(0);

  // Cargar badges para notificaciones
  const actualizarBadges = async () => {
    if (!isAuthenticated) return;
    try {
      const [resAlertas, resOrdenes] = await Promise.all([
        api.alertas.getAll({ solo_activas: true }),
        api.ordenes.getAll({ estado: 'PENDIENTE_APROBACION' }),
      ]);
      setBadgeAlertas(resAlertas.data?.length || 0);
      setBadgeOrdenes(resOrdenes.data?.length || 0);
    } catch {
      // Ignorar errores silenciosos en refresco de badges
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      actualizarBadges();
      const interval = setInterval(actualizarBadges, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#052e16',
          color: '#ffffff',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ animation: 'pulse 1.5s infinite' }}>
          <Building2 size={48} color="#22c55e" />
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Cargando Gestion_inventory...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderModule = () => {
    switch (currentModule) {
      case 'dashboard':
        return <DashboardView />;
      case 'inventario':
        return <InventarioView />;
      case 'materiales':
        return <MaterialesView />;
      case 'categorias':
        return <CategoriasView />;
      case 'proveedores':
        return <ProveedoresView />;
      case 'ubicaciones':
        return <UbicacionesView />;
      case 'ordenes':
        return <OrdenesView />;
      case 'recepciones':
        return <RecepcionesView />;
      case 'movimientos':
        return <MovimientosView />;
      case 'alertas':
        return <AlertasView />;
      case 'reglas':
        return <ReglasView />;
      case 'usuarios':
        return <UsuariosView />;
      case 'auditoria':
        return <AuditoriaView />;
      default:
        return <DashboardView />;
    }
  };

  const requiereCambioClave = Boolean(user?.requiere_cambio_clave);

  return (
    <div className="app-container">
      <Sidebar
        currentModule={currentModule}
        onSelectModule={setCurrentModule}
        badgeAlertas={badgeAlertas}
        badgeOrdenes={badgeOrdenes}
      />

      <div className="main-wrapper">
        <Header
          currentModule={currentModule}
          onOpenCambioPassword={() => setCambioPassModalOpen(true)}
          badgeAlertas={badgeAlertas}
        />

        <main className="content-area">{renderModule()}</main>
      </div>

      <CambioPasswordModal
        isOpen={cambioPassModalOpen || requiereCambioClave}
        onClose={() => setCambioPassModalOpen(false)}
        obligatorio={requiereCambioClave}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
