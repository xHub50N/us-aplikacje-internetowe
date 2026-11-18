import React from 'react';
import { Project, Priority, ProjectMember } from '../../api';
import { SearchableAssigneeSelect } from '../common/SearchableAssigneeSelect';
import { X } from 'lucide-react';

interface QuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  projects: Project[];
  projectId: number | '';
  setProjectId: (id: number | '') => void;
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  priority: Priority;
  setPriority: (val: Priority) => void;
  dueDate: string;
  setDueDate: (val: string) => void;
  assignedToId: number | '';
  setAssignedToId: (val: number | '') => void;
  availableAssignees: ProjectMember[];
}

export const QuickTaskModal: React.FC<QuickTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projects,
  projectId,
  setProjectId,
  title,
  setTitle,
  description,
  setDescription,
  priority,
  setPriority,
  dueDate,
  setDueDate,
  assignedToId,
  setAssignedToId,
  availableAssignees,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">+ Szybkie dodanie zadania</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="form-field">
              <label>Projekt *</label>
              <select
                className="form-select"
                required
                value={projectId}
                onChange={(e) => {
                  setProjectId(Number(e.target.value));
                  setAssignedToId('');
                }}
              >
                <option value="" disabled>
                  Wybierz projekt
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Tytuł zadania *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="Np. Wdrożyć nowy interfejs użytkownika"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-field">
              <label>Opis (opcjonalnie)</label>
              <textarea
                rows={3}
                className="form-textarea"
                placeholder="Szczegóły zadania..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label>Priorytet</label>
                <select
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  <option value="LOW">Niski (Low)</option>
                  <option value="MEDIUM">Średni (Medium)</option>
                  <option value="HIGH">Wysoki (High)</option>
                </select>
              </div>

              <div className="form-field">
                <label>Termin wykonania</label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label>Przypisz do osoby</label>
              <SearchableAssigneeSelect
                value={assignedToId}
                onChange={(val) => setAssignedToId(val !== null ? val : '')}
                members={availableAssignees}
                placeholder="Wybierz osobę do przypisania..."
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Anuluj
            </button>
            <button type="submit" className="btn-primary">
              Utwórz zadanie
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
