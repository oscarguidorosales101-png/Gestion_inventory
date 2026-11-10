import React from 'react';
import { AlertCircle } from 'lucide-react';

export const NotFoundPage = ({ onGoHome }) => {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#0F172A' }}>
      <AlertCircle size={48} color="#DC2626" style={{ margin: '0 auto 16px' }} />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Módulo no encontrado</h2>
      <p style={{ color: '#64748B', marginTop: '8px', marginBottom: '24px' }}>
        La ruta solicitada no se encuentra disponible o no tiene permisos asignados.
      </p>
      {onGoHome && (
        <button className="btn btn-primary" onClick={onGoHome}>
          Regresar al Tablero Principal
        </button>
      )}
    </div>
  );
};

