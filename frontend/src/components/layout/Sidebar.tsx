import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Package,
  Tags,
  Truck,
  Warehouse,
  ShoppingCart,
  ClipboardCheck,
  ArrowLeftRight,
  AlertTriangle,
  Sliders,
  Users,
  ShieldCheck,
  LogOut,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type ActiveModule =
  | 'dashboard'
  | 'inventario'
  | 'materiales'
  | 'categorias'
  | 'proveedores'
  | 'ubicaciones'
  | 'ordenes'
  | 'recepciones'
  | 'movimientos'
  | 'alertas'
  | 'reglas'
  | 'usuarios'
  | 'auditoria';

interface SidebarProps {
  currentModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  badgeAlertas?: number;
  badgeOrdenes?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  badgeAlertas = 0,
  badgeOrdenes = 0,
}) => {
  const { user, logout } = useAuth();

  const isRol = (roles: string[]) => user && roles.includes(user.rol);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Building2 size={20} />
        </div>
        <div>
          <div className="sidebar-brand-title">Gestion_inventory</div>
          <div className="sidebar-brand-sub">Sector Construccion</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentModule === 'dashboard' ? 'active' : ''}`}
          onClick={() => onSelectModule('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        <button
          className={`nav-item ${currentModule === 'inventario' ? 'active' : ''}`}
          onClick={() => onSelectModule('inventario')}
        >
          <Boxes size={18} />
          <span>Inventario Global</span>
        </button>

        <button
          className={`nav-item ${currentModule === 'materiales' ? 'active' : ''}`}
          onClick={() => onSelectModule('materiales')}
        >
          <Package size={18} />
          <span>Materiales</span>
        </button>

        <button
          className={`nav-item ${currentModule === 'categorias' ? 'active' : ''}`}
          onClick={() => onSelectModule('categorias')}
        >
          <Tags size={18} />
          <span>Categorias</span>
        </button>

        <button
          className={`nav-item ${currentModule === 'proveedores' ? 'active' : ''}`}
          onClick={() => onSelectModule('proveedores')}
        >
          <Truck size={18} />
          <span>Proveedores</span>
        </button>

        <button
          className={`nav-item ${currentModule === 'ubicaciones' ? 'active' : ''}`}
          onClick={() => onSelectModule('ubicaciones')}
        >
          <Warehouse size={18} />
          <span>Ubicaciones</span>
        </button>

        <button
          className={`nav-item ${currentModule === 'ordenes' ? 'active' : ''}`}
          onClick={() => onSelectModule('ordenes')}
        >
          <ShoppingCart size={18} />
          <span>Ordenes de Compra</span>
          {badgeOrdenes > 0 && <span className="nav-item-badge">{badgeOrdenes}</span>}
        </button>

        <button
          className={`nav-item ${currentModule === 'recepciones' ? 'active' : ''}`}
          onClick={() => onSelectModule('recepciones')}
        >
          <ClipboardCheck size={18} />
          <span>Recepciones</span>
        </button>

        <button
          className={`nav-item ${currentModule === 'movimientos' ? 'active' : ''}`}
          onClick={() => onSelectModule('movimientos')}
        >
          <ArrowLeftRight size={18} />
          <span>Libro de Movimientos</span>
        </button>

        <button
          className={`nav-item ${currentModule === 'alertas' ? 'active' : ''}`}
          onClick={() => onSelectModule('alertas')}
        >
          <AlertTriangle size={18} />
          <span>Alertas de Stock</span>
          {badgeAlertas > 0 && <span className="nav-item-badge">{badgeAlertas}</span>}
        </button>

        {isRol(['ADMINISTRADOR', 'ENCARGADO_INVENTARIO']) && (
          <button
            className={`nav-item ${currentModule === 'reglas' ? 'active' : ''}`}
            onClick={() => onSelectModule('reglas')}
          >
            <Sliders size={18} />
            <span>Reglas de Negocio</span>
          </button>
        )}

        {isRol(['ADMINISTRADOR']) && (
          <button
            className={`nav-item ${currentModule === 'usuarios' ? 'active' : ''}`}
            onClick={() => onSelectModule('usuarios')}
          >
            <Users size={18} />
            <span>Usuarios y Roles</span>
          </button>
        )}

        <button
          className={`nav-item ${currentModule === 'auditoria' ? 'active' : ''}`}
          onClick={() => onSelectModule('auditoria')}
        >
          <ShieldCheck size={18} />
          <span>Auditoria Inmutable</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">
            {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.nombre || 'Usuario'}</div>
            <div className="user-role-label">{user?.rol || 'CONSULTA'}</div>
          </div>
        </div>
        <button className="btn-logout" onClick={logout} title="Cerrar sesion de trabajo">
          <LogOut size={14} />
          <span>Cerrar Sesion</span>
        </button>
      </div>
    </aside>
  );
};

