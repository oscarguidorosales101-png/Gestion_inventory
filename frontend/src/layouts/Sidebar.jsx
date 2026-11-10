import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { ROLES, ROLES_LABELS } from '../constants/roles';
import {
  LayoutDashboard,
  Boxes,
  Package,
  ArrowDownToLine,
  History,
  ShoppingCart,
  Building2,
  Tags,
  MapPin,
  AlertTriangle,
  Sliders,
  Users,
  ShieldAlert,
} from 'lucide-react';

export const Sidebar = ({ currentView, setCurrentView, alertasPendientes = 0 }) => {
  const { user } = useAuth();
  const rol = user?.rol;

  const isRole = (...roles) => roles.includes(rol);

  const menuSections = [
    {
      title: 'Monitoreo Operativo',
      items: [
        { id: 'dashboard', label: 'Tablero Principal', icon: LayoutDashboard, visible: true },
        { id: 'inventario', label: 'Existencias Globales', icon: Boxes, visible: true },
        { id: 'alertas', label: 'Alertas de Stock', icon: AlertTriangle, visible: true, badge: alertasPendientes },
      ],
    },
    {
      title: 'Gestión de Almacén',
      items: [
        { id: 'materiales', label: 'Catálogo de Materiales', icon: Package, visible: true },
        { id: 'recepciones', label: 'Recepciones Físicas', icon: ArrowDownToLine, visible: isRole(ROLES.ADMINISTRADOR, ROLES.ENCARGADO_INVENTARIO, ROLES.CONSULTA) },
        { id: 'movimientos', label: 'Libro Mayor (Kardex)', icon: History, visible: true },
        { id: 'ubicaciones', label: 'Bodegas y Ubicaciones', icon: MapPin, visible: true },
      ],
    },
    {
      title: 'Abastecimiento y Compras',
      items: [
        { id: 'ordenes', label: 'Órdenes de Compra', icon: ShoppingCart, visible: true },
        { id: 'proveedores', label: 'Proveedores', icon: Building2, visible: true },
        { id: 'categorias', label: 'Categorías de Gasto', icon: Tags, visible: true },
      ],
    },
    {
      title: 'Gobernanza y Sistema',
      items: [
        { id: 'reglas', label: 'Reglas de Negocio', icon: Sliders, visible: isRole(ROLES.ADMINISTRADOR) },
        { id: 'usuarios', label: 'Gestión de Usuarios', icon: Users, visible: isRole(ROLES.ADMINISTRADOR) },
        { id: 'auditoria', label: 'Bitácora de Auditoría', icon: ShieldAlert, visible: isRole(ROLES.ADMINISTRADOR, ROLES.CONSULTA) },
      ],
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">GI</div>
        <div>
          <div className="sidebar-brand-title">Gestion_inventory</div>
          <div className="sidebar-brand-sub">Control de Obras</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuSections.map((sec, idx) => {
          const visibleItems = sec.items.filter((item) => item.visible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx}>
              <div className="sidebar-section-title">{sec.title}</div>
              {visibleItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                    onClick={() => setCurrentView(item.id)}
                  >
                    <IconComponent size={18} />
                    <span>{item.label}</span>
                    {Boolean(item.badge && item.badge > 0) && (
                      <span className="sidebar-item-badge">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">
            {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <div className="user-name" title={user?.nombre}>{user?.nombre}</div>
            <div className="user-role">{ROLES_LABELS[rol] || rol}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

