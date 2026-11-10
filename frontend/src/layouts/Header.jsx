import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ROLES_LABELS } from '../constants/roles';
import { LogOut, KeyRound, User, Shield } from 'lucide-react';
import { CambioPasswordModal } from '../components/CambioPasswordModal';

export const Header = ({ currentView, title, subtitle }) => {
  const { user, logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <header className="app-header">
      <div className="header-title-wrap">
        <h1 className="header-title">{title || 'Gestion_inventory'}</h1>
        {subtitle && <span className="header-subtitle">— {subtitle}</span>}
      </div>

      <div className="header-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748B' }}>
          <Shield size={16} color="#15803D" />
          <span>{ROLES_LABELS[user?.rol] || user?.rol}</span>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowPasswordModal(true)}
          title="Cambiar contraseña de acceso"
        >
          <KeyRound size={15} />
          <span>Seguridad</span>
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={logout}
          title="Cerrar sesión segura"
          style={{ color: '#B91C1C' }}
        >
          <LogOut size={15} />
          <span>Salir</span>
        </button>
      </div>

      {showPasswordModal && (
        <CambioPasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </header>
  );
};

