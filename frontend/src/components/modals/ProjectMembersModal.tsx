import React from 'react';
import { Project, ProjectMember, ProjectRole, User } from '../../api';
import { X, UserPlus, Trash2 } from 'lucide-react';

interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject?: Project;
  projectMembers: ProjectMember[];
  currentUser: User;
  isOwnerOfActiveProject: boolean;
  membersModalError: string;
  newMemberEmail: string;
  setNewMemberEmail: (val: string) => void;
  newMemberRole: ProjectRole;
  setNewMemberRole: (role: ProjectRole) => void;
  onAddMember: (e: React.FormEvent) => void;
  onRemoveMember: (projectId: number, userId: number, userName: string) => void;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  isOpen,
  onClose,
  activeProject,
  projectMembers,
  currentUser,
  isOwnerOfActiveProject,
  membersModalError,
  newMemberEmail,
  setNewMemberEmail,
  newMemberRole,
  setNewMemberRole,
  onAddMember,
  onRemoveMember,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            Członkowie zespołu — {activeProject?.name || 'Projekt'}
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          {membersModalError && <div className="error-banner">{membersModalError}</div>}

          {/* Dodawanie członka (tylko właściciel) */}
          {isOwnerOfActiveProject && (
            <form onSubmit={onAddMember} style={{ marginBottom: '20px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Zaproś nowego członka przez e-mail:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="adres@example.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  style={{ flex: 1 }}
                />
                <select
                  className="form-input"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as ProjectRole)}
                  style={{ width: 'auto' }}
                >
                  <option value="MEMBER">Edytor (MEMBER)</option>
                  <option value="VIEWER">Widz (VIEWER)</option>
                </select>
                <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  <UserPlus size={14} style={{ marginRight: '4px' }} /> Dodaj
                </button>
              </div>
            </form>
          )}

          {/* Lista członków */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#64748b',
              }}
            >
              Aktywni członkowie ({projectMembers.length})
            </span>
            {projectMembers.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: '#0b1120',
                  borderRadius: '8px',
                  border: '1px solid #1e293b',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>
                    {m.user?.name || `Użytkownik #${m.userId}`}
                    {m.userId === currentUser.id && ' (Ty)'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {m.user?.email} •{' '}
                    {m.role === 'OWNER'
                      ? '👑 Właściciel'
                      : m.role === 'VIEWER'
                      ? '👁️ Widz (Tylko odczyt)'
                      : '✏️ Członek zespołu'}
                  </div>
                </div>

                <div>
                  {(isOwnerOfActiveProject && m.role !== 'OWNER') ||
                  m.userId === currentUser.id ? (
                    <button
                      type="button"
                      className="table-action-btn danger"
                      onClick={() =>
                        activeProject &&
                        onRemoveMember(activeProject.id, m.userId, m.user?.name || '')
                      }
                      title={m.userId === currentUser.id ? 'Opuść projekt' : 'Usuń członka'}
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
