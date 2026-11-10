import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Sliders, Edit2, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatAmbitoRegla, formatClaveRegla } from '../../utils/formatters';
import { ReglaModal } from './ReglaModal';

export const ReglasList = () => {
  const [reglas, setReglas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRegla, setEditingRegla] = useState(null);

  const cargarReglas = async () => {
    try {
      setLoading(true);
      const res = await api.reglas.getAll();
      setReglas(res.data || []);
    } catch (err) {
      console.error('Error al cargar reglas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReglas();
  }, []);

  const handleEdit = (regla) => {
    setEditingRegla(regla);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="card-table">
        <div className="card-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} color="#15803D" />
            <div className="card-table-title">Configuración de Reglas de Negocio Institucionales</div>
          </div>

          <div className="card-table-actions">
            <button className="btn btn-secondary btn-sm" onClick={cargarReglas}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Clave de Regla</th>
                <th>Ámbito</th>
                <th>Valor Numérico</th>
                <th>Valor Texto</th>
                <th>Descripción / Justificación</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    Cargando reglas de negocio...
                  </td>
                </tr>
              ) : reglas.length > 0 ? (
                reglas.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{formatClaveRegla(r.clave)}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'monospace' }}>{r.clave}</div>
                    </td>
                    <td><span className="badge badge-gray">{formatAmbitoRegla(r.ambito)}</span></td>
                    <td style={{ fontWeight: 700, color: '#15803D' }}>
                      {r.valor_numerico !== null ? r.valor_numerico : '-'}
                    </td>
                    <td>{r.valor_texto || '-'}</td>
                    <td style={{ color: '#64748B', maxWidth: '300px' }}>{r.descripcion || '-'}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(r)}>
                        <Edit2 size={13} />
                        <span>Modificar</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No se encontraron reglas configuradas en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <ReglaModal
          regla={editingRegla}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            cargarReglas();
          }}
        />
      )}
    </div>
  );
};

