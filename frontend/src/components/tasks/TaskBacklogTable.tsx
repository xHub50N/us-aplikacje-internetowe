import React, { useState } from 'react';
import { Task, Project } from '../../api';
import { Avatar } from '../common/Avatar';
import { SearchableAssigneeSelect } from '../common/SearchableAssigneeSelect';
import { Inbox, Pencil, Trash2, Calendar, MessageSquare, FolderKanban } from 'lucide-react';

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
  const [openDropdownTaskId, setOpenDropdownTaskId] = useState<number | null>(null);

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
            style={{
              position: 'relative',
              zIndex: openDropdownTaskId === task.id ? 40 : 1,
            }}
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
                {taskProj && (
                  <span className="task-project-badge" title={`Projekt: ${taskProj.name}`}>
                    <FolderKanban size={11} />
                    <span className="task-project-name">{taskProj.name}</span>
                  </span>
                )}
                <span className="task-title-text" title={task.title}>{task.title}</span>
              </div>
              {task.description && (
                <span className="task-desc-preview" title={task.description}>
                  {task.description}
                </span>
              )}
              <div className="task-meta-bottom">
                <span className="task-author-chip">
                  <Avatar user={task.user} size={15} />
                  <span>{task.user?.name || 'Autor'}</span>
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
            <div
              className="task-assignee-col"
              onClick={(e) => e.stopPropagation()}
            >
              <SearchableAssigneeSelect
                value={task.assignedToId || ''}
                onChange={(val) => onAssigneeChange(task, val)}
                members={assigneesList}
                placeholder="Nieprzypisane"
                variant="compact"
                onOpenChange={(isOpen) => setOpenDropdownTaskId(isOpen ? task.id : null)}
              />
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
