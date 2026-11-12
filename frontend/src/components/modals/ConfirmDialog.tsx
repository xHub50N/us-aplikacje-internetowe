import React from 'react';
import { ConfirmDialogConfig } from '../../types';

interface ConfirmDialogProps {
  config: ConfirmDialogConfig | null;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ config, onClose }) => {
  if (!config) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-window" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3 className="modal-title">{config.title}</h3>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>
            {config.message}
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {config.cancelLabel || 'Anuluj'}
          </button>
          <button
            type="button"
            className={config.isDanger ? 'btn-danger' : 'btn-primary'}
            onClick={async () => {
              const fn = config.onConfirm;
              onClose();
              await fn();
            }}
          >
            {config.confirmLabel || 'Potwierdź'}
          </button>
        </div>
      </div>
    </div>
  );
};
