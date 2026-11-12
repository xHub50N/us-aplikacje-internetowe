import React from 'react';
import { X } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  isEdit?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  name: string;
  setName: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  title?: string;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  isEdit = false,
  onClose,
  onSubmit,
  name,
  setName,
  description,
  setDescription,
  title,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {title || (isEdit ? 'Edytuj projekt' : '+ Nowy projekt')}
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="form-field">
              <label>Nazwa projektu *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="Np. Aplikacja mobilna"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-field">
              <label>Opis projektu</label>
              <textarea
                rows={3}
                className="form-textarea"
                placeholder="Krótki opis celów projektu..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Anuluj
            </button>
            <button type="submit" className="btn-primary">
              {isEdit ? 'Zapisz zmiany' : 'Utwórz projekt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
