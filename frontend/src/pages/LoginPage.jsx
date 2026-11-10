import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Shield, Lock, Mail, AlertTriangle, ArrowRight } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      await login(email, password);
    } catch (err) {
      setError(err?.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (correo, clave) => {
    setEmail(correo);
    setPassword(clave);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '36px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#15803D', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontWeight: 800, fontSize: '1.2rem' }}>
            GI
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Gestion_inventory
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px' }}>
            Sistema Empresarial de Inventarios y Abastecimiento
          </p>
        </div>

        {error && (
          <div className="alert-banner alert-danger">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Correo Electrónico Institucional</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                required
                placeholder="ejemplo@empresaficticiapendiente.cr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Contraseña de Acceso</label>
            <input
              type="password"
              className="form-input"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Validando Credenciales...' : 'Iniciar Sesión Segura'}
          </button>
        </form>

        {/* Cuentas de Acceso Rápido para Auditoría / Pruebas */}
        <div style={{ marginTop: '28px', borderTop: '1px solid #E2E8F0', paddingTop: '20px' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 700, marginBottom: '10px', textAlign: 'center' }}>
            Accesos de Prueba por Rol Institucional
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickLogin('admin@empresaficticiapendiente.cr', 'Admin2026!Gestion')}
            >
              Admin
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickLogin('inventario@empresaficticiapendiente.cr', 'Inventario2026!')}
            >
              Inventario
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickLogin('compras@empresaficticiapendiente.cr', 'Compras2026!Req')}
            >
              Compras
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickLogin('consulta@empresaficticiapendiente.cr', 'Consulta2026!Ver')}
            >
              Consulta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

