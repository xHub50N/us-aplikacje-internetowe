import React from 'react';
import { Toast } from '../../types';
import { CheckCircle2, AlertTriangle, Clock, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: Toast[];
  onRemoveToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemoveToast,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item ${toast.type}`}>
          <div className="toast-message">
            {toast.type === 'success' && <CheckCircle2 size={15} color="#10b981" />}
            {toast.type === 'error' && <AlertTriangle size={15} color="#f43f5e" />}
            {toast.type === 'info' && <Clock size={15} color="#3b82f6" />}
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => onRemoveToast(toast.id)}
            title="Zamknij"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
};
