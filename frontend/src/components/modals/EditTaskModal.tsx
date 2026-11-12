import React from 'react';
import { Task, Priority, ProjectMember, TaskComment, User, Project } from '../../api';
import { X, MessageSquare, Trash2, Send } from 'lucide-react';

interface EditTaskModalProps {
  task: Task | null;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
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
  completed: boolean;
  setCompleted: (val: boolean) => void;
  availableAssignees: ProjectMember[];
  taskComments: TaskComment[];
  loadingComments: boolean;
  newCommentText: string;
  setNewCommentText: (val: string) => void;
  isSubmittingComment: boolean;
  onAddComment: (e?: React.FormEvent | React.KeyboardEvent) => void;
  onDeleteComment: (commentId: number) => void;
  currentUser: User | null;
  activeProject?: Project;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  task,
  onClose,
  onSave,
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
  completed,
  setCompleted,
  availableAssignees,
  taskComments,
  loadingComments,
  newCommentText,
  setNewCommentText,
  isSubmittingComment,
  onAddComment,
  onDeleteComment,
  currentUser,
  activeProject,
}) => {
  if (!task) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Edycja zadania #{task.id}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={onSave}>
          <div className="modal-body">
            <div className="form-field">
              <label>Tytuł zadania *</label>
              <input
                type="text"
                required
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Opis</label>
              <textarea
                rows={3}
                className="form-textarea"
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
                  <option value="LOW">Niski</option>
                  <option value="MEDIUM">Średni</option>
                  <option value="HIGH">Wysoki</option>
                </select>
              </div>

              <div className="form-field">
                <label>Termin</label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label>Przypisana osoba</label>
              <select
                className="form-select"
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">👤 Nieprzypisane</option>
                {availableAssignees.map((m) => (
                  <option key={m.id} value={m.userId}>
                    {m.user?.name || `Użytkownik #${m.userId}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={(e) => setCompleted(e.target.checked)}
                  className="custom-task-checkbox"
                />
                <span>Oznacz zadanie jako ukończone</span>
              </label>
            </div>

            {/* Sekcja Komentarzy i Dyskusji */}
            <div className="task-comments-wrapper">
              <div className="comments-header-row">
                <h4 className="comments-title">
                  <MessageSquare size={15} color="#6366f1" />
                  <span>Komentarze ({taskComments.length})</span>
                </h4>
              </div>

              {/* Lista komentarzy */}
              <div className="comments-list-box">
                {loadingComments ? (
                  <div className="comment-empty-hint">Ładowanie komentarzy...</div>
                ) : taskComments.length === 0 ? (
                  <div className="comment-empty-hint">
                    Brak komentarzy. Bądź pierwszą osobą, która skomentuje to zadanie!
                  </div>
                ) : (
                  taskComments.map((comment) => {
                    const isMyComment = comment.userId === currentUser?.id;
                    const isProjectOwner = activeProject?.userId === currentUser?.id;
                    const canDelete = isMyComment || isProjectOwner;

                    return (
                      <div key={comment.id} className="comment-bubble-item">
                        <div className="comment-top-bar">
                          <div className="comment-user-info">
                            <div className="comment-mini-avatar">
                              {(comment.user?.name || comment.user?.email || 'U').substring(0, 2).toUpperCase()}
                            </div>
                            <span className="comment-user-name">
                              {comment.user?.name || comment.user?.email || 'Użytkownik'} {isMyComment && '(Ty)'}
                            </span>
                            <span className="comment-timestamp">
                              {new Date(comment.createdAt).toLocaleString('pl-PL', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {canDelete && (
                            <button
                              type="button"
                              className="comment-delete-icon-btn"
                              title="Usuń komentarz"
                              onClick={() => onDeleteComment(comment.id)}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <div className="comment-text-content">{comment.content}</div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Formularz dodawania komentarza */}
              <div className="add-comment-box">
                <textarea
                  className="add-comment-textarea"
                  placeholder="Napisz komentarz... (Powiadomimy wykonawcę zadania)"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      onAddComment(e);
                    }
                  }}
                />
                <div className="add-comment-btn-row">
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{
                      height: '28px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    disabled={!newCommentText.trim() || isSubmittingComment}
                    onClick={onAddComment}
                  >
                    <Send size={12} />
                    {isSubmittingComment ? 'Wysyłanie...' : 'Wyślij komentarz (Ctrl+Enter)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Anuluj
            </button>
            <button type="submit" className="btn-primary">
              Zapisz zmiany
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
