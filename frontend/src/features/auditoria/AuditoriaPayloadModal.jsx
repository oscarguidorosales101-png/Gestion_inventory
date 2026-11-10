import React from 'react';
import { FileJson, X } from 'lucide-react';

export const AuditoriaPayloadModal = ({ payloadData, onClose }) => {
  let formattedJson = '';
  try {
    if (typeof payloadData.data === 'string') {
      formattedJson = JSON.stringify(JSON.parse(payloadData.data), null, 2);
    } else {
      formattedJson = JSON.stringify(payloadData.data, null, 2);
    }
  } catch {
    formattedJson = String(payloadData.data);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileJson size={20} color="#15803D" />
            <span className="modal-title">{payloadData.title}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '12px' }}>
            Instantánea inmutable capturada durante el evento en la bitácora de auditoría:
          </p>
          <pre
            style={{
              backgroundColor: '#052E16',
              color: '#86EFAC',
              padding: '16px',
              borderRadius: '8px',
              overflowX: 'auto',
              fontSize: '0.82rem',
              lineHeight: 1.5,
              fontFamily: 'monospace',
              maxHeight: '400px',
            }}
          >
            {formattedJson}
          </pre>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

