import React from 'react';
import { Task } from '../../api';
import { Inbox, Flame, CheckCircle2, MessageSquare } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  draggedTaskId: number | null;
  setDraggedTaskId: (id: number | null) => void;
  dragOverColumn: 'todo' | 'in_progress' | 'completed' | null;
  setDragOverColumn: (col: 'todo' | 'in_progress' | 'completed' | null) => void;
  onKanbanDrop: (taskId: number, targetCol: 'todo' | 'in_progress' | 'completed') => void;
  onOpenEditTask: (task: Task) => void;
  onToggleTask: (task: Task) => void;
  formatDate: (dateStr?: string | null) => string | null;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  draggedTaskId,
  setDraggedTaskId,
  dragOverColumn,
  setDragOverColumn,
  onKanbanDrop,
  onOpenEditTask,
  onToggleTask,
  formatDate,
}) => {
  return (
    <div className="kanban-board-container">
      {/* Kolumna 1: Do zrobienia */}
      <div
        className={`kanban-column ${dragOverColumn === 'todo' ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDragOverColumn('todo');
        }}
        onDragLeave={() => setDragOverColumn(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverColumn(null);
          const taskIdStr = e.dataTransfer.getData('text/plain');
          if (taskIdStr) onKanbanDrop(Number(taskIdStr), 'todo');
        }}
      >
        <div className="kanban-column-header">
          <div className="kanban-column-title">
            <Inbox size={15} color="#60a5fa" />
            <span>Do zrobienia</span>
          </div>
          <span className="kanban-count-badge">
            {tasks.filter((t) => !t.completed && t.priority !== 'HIGH').length}
          </span>
        </div>
        {tasks
          .filter((t) => !t.completed && t.priority !== 'HIGH')
          .map((task) => (
            <div
              key={task.id}
              className={`kanban-card ${draggedTaskId === task.id ? 'is-dragging' : ''}`}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', task.id.toString());
                e.dataTransfer.effectAllowed = 'move';
                setDraggedTaskId(task.id);
              }}
              onDragEnd={() => setDraggedTaskId(null)}
              onClick={() => onOpenEditTask(task)}
              title="Przeciągnij kartę do innej kolumny"
            >
              <div className="kanban-card-top">
                <span className={`priority-tag-mini ${task.priority}`}>
                  {task.priority}
                </span>
                <input
                  type="checkbox"
                  className="custom-task-checkbox"
                  checked={task.completed}
                  onChange={() => onToggleTask(task)}
                  onClick={(e) => e.stopPropagation()}
                  title="Zmień status"
                />
              </div>
              <h4 className="kanban-card-title">{task.title}</h4>
              {task.description && (
                <p className="kanban-card-desc">{task.description}</p>
              )}
              <div className="kanban-card-footer">
                <span>{task.assignedTo?.name || 'Nieprzypisane'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {task._count && task._count.comments > 0 && (
                    <span className="task-comment-count-chip">
                      <MessageSquare size={11} /> {task._count.comments}
                    </span>
                  )}
                  <span>{formatDate(task.dueDate) || 'Brak'}</span>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Kolumna 2: W toku / Wysoki priorytet */}
      <div
        className={`kanban-column ${dragOverColumn === 'in_progress' ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDragOverColumn('in_progress');
        }}
        onDragLeave={() => setDragOverColumn(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverColumn(null);
          const taskIdStr = e.dataTransfer.getData('text/plain');
          if (taskIdStr) onKanbanDrop(Number(taskIdStr), 'in_progress');
        }}
      >
        <div className="kanban-column-header">
          <div className="kanban-column-title">
            <Flame size={15} color="#f43f5e" />
            <span>W toku (Wysoki priorytet)</span>
          </div>
          <span className="kanban-count-badge">
            {tasks.filter((t) => !t.completed && t.priority === 'HIGH').length}
          </span>
        </div>
        {tasks
          .filter((t) => !t.completed && t.priority === 'HIGH')
          .map((task) => (
            <div
              key={task.id}
              className={`kanban-card ${draggedTaskId === task.id ? 'is-dragging' : ''}`}
              style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', task.id.toString());
                e.dataTransfer.effectAllowed = 'move';
                setDraggedTaskId(task.id);
              }}
              onDragEnd={() => setDraggedTaskId(null)}
              onClick={() => onOpenEditTask(task)}
              title="Przeciągnij kartę do innej kolumny"
            >
              <div className="kanban-card-top">
                <span className="priority-tag-mini HIGH">Wysoki</span>
                <input
                  type="checkbox"
                  className="custom-task-checkbox"
                  checked={task.completed}
                  onChange={() => onToggleTask(task)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <h4 className="kanban-card-title">{task.title}</h4>
              {task.description && (
                <p className="kanban-card-desc">{task.description}</p>
              )}
              <div className="kanban-card-footer">
                <span>{task.assignedTo?.name || 'Nieprzypisane'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {task._count && task._count.comments > 0 && (
                    <span className="task-comment-count-chip">
                      <MessageSquare size={11} /> {task._count.comments}
                    </span>
                  )}
                  <span style={{ color: '#fb7185' }}>{formatDate(task.dueDate) || 'Brak'}</span>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Kolumna 3: Ukończone */}
      <div
        className={`kanban-column ${dragOverColumn === 'completed' ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDragOverColumn('completed');
        }}
        onDragLeave={() => setDragOverColumn(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverColumn(null);
          const taskIdStr = e.dataTransfer.getData('text/plain');
          if (taskIdStr) onKanbanDrop(Number(taskIdStr), 'completed');
        }}
      >
        <div className="kanban-column-header">
          <div className="kanban-column-title">
            <CheckCircle2 size={15} color="#10b981" />
            <span>Ukończone</span>
          </div>
          <span className="kanban-count-badge">
            {tasks.filter((t) => t.completed).length}
          </span>
        </div>
        {tasks
          .filter((t) => t.completed)
          .map((task) => (
            <div
              key={task.id}
              className={`kanban-card ${draggedTaskId === task.id ? 'is-dragging' : ''}`}
              style={{ opacity: 0.75 }}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', task.id.toString());
                e.dataTransfer.effectAllowed = 'move';
                setDraggedTaskId(task.id);
              }}
              onDragEnd={() => setDraggedTaskId(null)}
              onClick={() => onOpenEditTask(task)}
              title="Przeciągnij kartę do innej kolumny"
            >
              <div className="kanban-card-top">
                <span className="task-status-badge completed">✓ Ukończone</span>
                <input
                  type="checkbox"
                  className="custom-task-checkbox"
                  checked={task.completed}
                  onChange={() => onToggleTask(task)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <h4 className="kanban-card-title" style={{ textDecoration: 'line-through' }}>
                {task.title}
              </h4>
              <div className="kanban-card-footer">
                <span>{task.assignedTo?.name || 'Nieprzypisane'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {task._count && task._count.comments > 0 && (
                    <span className="task-comment-count-chip">
                      <MessageSquare size={11} /> {task._count.comments}
                    </span>
                  )}
                  <span>{formatDate(task.dueDate) || 'Brak'}</span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
