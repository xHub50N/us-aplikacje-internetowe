import React from 'react';
import { Task, Project } from '../../api';
import { Inbox, Pencil, Trash2, Calendar, User as UserIcon, MessageSquare } from 'lucide-react';

interface TaskBacklogTableProps {
  tasks: Task[];
  projects: Project[];
  onToggleTask: (task: Task) => void;
  onOpenEditTask: (task: Task, e?: React.MouseEvent) => void;
  onAssigneeChange: (task: Task, newAssigneeId: number | null) => void;
  onDeleteTask: (task: Task, e?: React.MouseEvent) => void;
  isOverdue: (dateStr?: string | null, completed?: boolean) => boolean;
  formatDate: (dateStr?: string | null) => string | null;
}

export const TaskBacklogTable: React.FC<TaskBacklogTableProps> = ({
  tasks,
  projects,
  onToggleTask,
  onOpenEditTask,
  onAssigneeChange,
  onDeleteTask,
  isOverdue,
  formatDate,
}) => {
  if (tasks.length === 0) {
    return (
      <div className="backlog-table-card">
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          <Inbox size={32} style={{ margin: '0 auto 10px auto', display: 'block' }} />
          Brak zadań spełniających wybrane kryteria wyszukiwania.
        </div>
      </div>
    );
  }

  return (
    <div className="backlog-table-card">
      {tasks.map((task) => {
        const taskProj = projects.find((p) => p.id === task.projectId);
        const assigneesList = taskProj?.members || [];
        const overdue = isOverdue(task.dueDate, task.completed);

        return (
          <div
            key={task.id}
            className={`backlog-row ${task.completed ? 'completed-task' : ''}`}
            onClick={() => onOpenEditTask(task)}
          >
            {/* 1. Checkbox */}
            <input
              type="checkbox"
              className="custom-task-checkbox"
              checked={task.completed}
              onChange={() => onToggleTask(task)}
              onClick={(e) => e.stopPropagation()}
              title="Zmień status zadania"
            />

            {/* 2. Identyfikator */}
            <span className="task-id-badge">#TSK-{task.id}</span>

            {/* 3. Szczegóły zadania */}
            <div className="task-details-col">
              <div className="task-meta-top">
                <span className={`priority-tag-mini ${task.priority}`}>
                  {task.priority === 'HIGH' && 'Wysoki'}
                  {task.priority === 'MEDIUM' && 'Średni'}
                  {task.priority === 'LOW' && 'Niski'}
                </span>
                <span className="task-title-text">{task.title}</span>
              </div>
              {task.description && (
                <span className="task-desc-preview">{task.description}</span>
              )}
              <div className="task-meta-bottom">
                {taskProj && (
                  <span className="task-project-tag">{taskProj.name}</span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <UserIcon size={11} /> {task.user?.name || 'Autor'}
                </span>
                {task._count && task._count.comments > 0 && (
                  <span
                    className="task-comment-count-chip"
                    title={`${task._count.comments} komentarzy`}
                  >
                    <MessageSquare size={11} /> {task._count.comments}
                  </span>
                )}
              </div>
            </div>

            {/* 4. Status Badge */}
            <div className="task-status-col">
              <span
                className={`task-status-badge ${task.completed ? 'completed' : 'active'}`}
              >
                {task.completed ? '✓ Ukończone' : '● W toku'}
              </span>
            </div>

            {/* 5. Przypisany użytkownik */}
            <div className="task-assignee-col" onClick={(e) => e.stopPropagation()}>
              <select
                className="assignee-inline-select"
                value={task.assignedToId || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  onAssigneeChange(task, val);
                }}
              >
                <option value="">👤 Nieprzypisane</option>
                {assigneesList.map((m) => (
                  <option key={m.id} value={m.userId}>
                    {m.user?.name || `Użytkownik #${m.userId}`}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Termin */}
            <div className={`task-duedate-col ${overdue ? 'overdue' : ''}`}>
              <Calendar size={13} />
              <span>{formatDate(task.dueDate) || 'Brak terminu'}</span>
            </div>

            {/* 7. Akcje */}
            <div className="task-actions-col">
              <button
                type="button"
                className="table-action-btn"
                title="Edytuj zadanie"
                onClick={(e) => onOpenEditTask(task, e)}
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                className="table-action-btn danger"
                title="Usuń zadanie"
                onClick={(e) => onDeleteTask(task, e)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
