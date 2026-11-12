import React from 'react';
import { Task } from '../../api';
import { Calendar } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  onOpenEditTask: (task: Task) => void;
  onToggleTask: (task: Task, e?: React.MouseEvent) => void;
  isOverdue: (dateStr?: string | null, completed?: boolean) => boolean;
  formatDate: (dateStr?: string | null) => string | null;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  onOpenEditTask,
  onToggleTask,
  isOverdue,
  formatDate,
}) => {
  return (
    <div className="backlog-table-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Calendar size={18} color="#6366f1" />
        <h3 style={{ margin: 0, fontSize: '15px' }}>Zadania z przypisanym terminem</h3>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '12px',
        }}
      >
        {tasks.map((task) => (
          <div
            key={task.id}
            className="kanban-card"
            onClick={() => onOpenEditTask(task)}
          >
            <div className="kanban-card-top">
              <span className={`priority-tag-mini ${task.priority}`}>{task.priority}</span>
              <span
                style={{
                  fontSize: '11px',
                  color: isOverdue(task.dueDate, task.completed) ? '#fb7185' : '#94a3b8',
                }}
              >
                {formatDate(task.dueDate) || 'Brak terminu'}
              </span>
            </div>
            <h4 className="kanban-card-title">{task.title}</h4>
            <div className="kanban-card-footer">
              <span>Status: {task.completed ? 'Ukończone' : 'W toku'}</span>
              <button
                type="button"
                className="table-action-btn"
                onClick={(e) => onToggleTask(task, e)}
              >
                {task.completed ? 'Przywróć' : 'Ukończ'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
