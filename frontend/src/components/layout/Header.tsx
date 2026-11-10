import React from 'react';
import type { ActiveModule } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  currentModule: ActiveModule;
  onOpenCambioPassword: () => void;
  badgeAlertas?: number;
}

const moduleTitles: Record<ActiveModule, string> = {
  dashboard: 'Panel de Control y Metricas',
  inventario: 'Inventario de Materiales (Existencias Reales)',
  materiales: 'Catalogo de Materiales y Calculos de Reorden',
  categorias: 'Categorias de Materiales',
  proveedores: 'Directorio de Proveedores Homologados',
  ubicaciones: 'Bodegas, Almacenes y Patios de Proyecto',
  ordenes: 'Gestion de Ordenes de Compra y Aprobaciones',
  recepciones: 'Recepcion Fisica de Mercancia y Cotejo de Albaran',
  movimientos: 'Libro Mayor de Movimientos de Inventario',
  alertas: 'Monitoreo de Alertas de Stock y Posibles Duplicados',
  reglas: 'Configuracion Jerarquica de Reglas y Parametros',
  usuarios: 'Administracion de Usuarios y Matriz RBAC',
  auditoria: 'Registro Inmutable de Auditoria y Trazabilidad',
};

export const Header: React.FC<HeaderProps> = ({
  currentModule,
  onOpenCambioPassword,
  badgeAlertas = 0,
}) => {
  const { user } = useAuth();

  return (
    <header className="top-header">
      <div className="header-title-section">
        <h1 className="page-title">{moduleTitles[currentModule]}</h1>
      </div>

      <div className="header-actions">
        {badgeAlertas > 0 && (
          <div className="badge badge-critico" title={`${badgeAlertas} alertas de inventario activas`}>
            <ShieldAlert size={14} />
            <span>{badgeAlertas} alertas</span>
          </div>
        )}

        <div className="currency-badge">Moneda: CRC (â‚¡)</div>

        <button
          className="btn btn-outline btn-sm"
          onClick={onOpenCambioPassword}
          title="Cambiar contraseÃ±a de acceso"
        >
          <KeyRound size={14} />
          <span>Cambiar Clave</span>
        </button>

        <span className="badge badge-info">{user?.rol}</span>
      </div>
    </header>
  );
};
