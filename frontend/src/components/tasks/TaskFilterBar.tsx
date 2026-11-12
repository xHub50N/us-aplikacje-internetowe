import React from 'react';
import { Project, Priority } from '../../api';
import { UserCheck, RefreshCw, List, Kanban, Calendar } from 'lucide-react';

interface TaskFilterBarProps {
  projects: Project[];
  selectedProjectId: number | null;
  onSelectProject: (id: number | null) => void;
  assignedToMeOnly: boolean;
  onToggleAssignedToMe: () => void;
  priorityFilter: 'ALL' | Priority;
  onPriorityFilterChange: (p: 'ALL' | Priority) => void;
  sortBy: 'createdAt' | 'dueDate' | 'priority' | 'title';
  sortOrder: 'desc' | 'asc';
  onSortChange: (sortBy: 'createdAt' | 'dueDate' | 'priority' | 'title', sortOrder: 'desc' | 'asc') => void;
  onRefresh: () => void;
  isSyncing: boolean;
  taskFilter: 'all' | 'active' | 'completed';
  onTaskFilterChange: (f: 'all' | 'active' | 'completed') => void;
  activeView: 'list' | 'kanban' | 'calendar';
  onViewChange: (v: 'list' | 'kanban' | 'calendar') => void;
  totalTasks: number;
  activeTasksCount: number;
  highPriorityCount: number;
  completedTasksCount: number;
}

export const TaskFilterBar: React.FC<TaskFilterBarProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  assignedToMeOnly,
  onToggleAssignedToMe,
  priorityFilter,
  onPriorityFilterChange,
  sortBy,
  sortOrder,
  onSortChange,
  onRefresh,
  isSyncing,
  taskFilter,
  onTaskFilterChange,
  activeView,
  onViewChange,
  totalTasks,
  activeTasksCount,
  highPriorityCount,
  completedTasksCount,
}) => {
  return (
    <div className="toolbar-container">
      {/* Wiersz 1: Filtry dynamiczne */}
      <div className="toolbar-row">
        <div className="toolbar-group-left">
          {/* Filtr projektu */}
          <select
            className="filter-dropdown-select"
            value={selectedProjectId || ''}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              onSelectProject(val);
            }}
          >
            <option value="">Wszystkie projekty</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                📁 {p.name}
              </option>
            ))}
          </select>

          {/* Szybki przełącznik: Przypisane do mnie */}
          <button
            type="button"
            className={`toggle-filter-chip ${assignedToMeOnly ? 'active' : ''}`}
            onClick={onToggleAssignedToMe}
          >
            <UserCheck size={14} />
            <span>Przypisane do mnie</span>
          </button>

          {/* Filtr priorytetu */}
          <select
            className="filter-dropdown-select"
            value={priorityFilter}
            onChange={(e) => onPriorityFilterChange(e.target.value as any)}
          >
            <option value="ALL">Priorytet: Wszystkie</option>
            <option value="HIGH">Wysoki priorytet</option>
            <option value="MEDIUM">Średni priorytet</option>
            <option value="LOW">Niski priorytet</option>
          </select>

          {/* Sortowanie */}
          <select
            className="filter-dropdown-select"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              onSortChange(field as any, order as any);
            }}
          >
            <option value="createdAt-desc">Sortuj: Najnowsze</option>
            <option value="createdAt-asc">Sortuj: Najstarsze</option>
            <option value="dueDate-asc">Sortuj: Termin (najbliższy)</option>
            <option value="priority-desc">Sortuj: Priorytet (malejąco)</option>
            <option value="title-asc">Sortuj: Alfabetycznie (A-Z)</option>
          </select>
        </div>

        {/* Prawa strona wiersza 1 */}
        <div className="toolbar-group-right">
          <button
            type="button"
            className="toggle-filter-chip"
            onClick={onRefresh}
            title="Odśwież dane"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>Odśwież</span>
          </button>
        </div>
      </div>

      {/* Wiersz 2: Widoki i Statusy */}
      <div className="toolbar-row">
        <div className="status-pills-wrap">
          <button
            type="button"
            className={`status-pill ${taskFilter === 'all' && priorityFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => {
              onTaskFilterChange('all');
              onPriorityFilterChange('ALL');
            }}
          >
            Wszystkie ({totalTasks})
          </button>
          <button
            type="button"
            className={`status-pill ${taskFilter === 'active' ? 'active' : ''}`}
            onClick={() => onTaskFilterChange('active')}
          >
            Do zrobienia ({activeTasksCount})
          </button>
          <button
            type="button"
            className={`status-pill ${priorityFilter === 'HIGH' ? 'active' : ''}`}
            onClick={() => onPriorityFilterChange('HIGH')}
          >
            Wysoki priorytet ({highPriorityCount})
          </button>
          <button
            type="button"
            className={`status-pill ${taskFilter === 'completed' ? 'active' : ''}`}
            onClick={() => onTaskFilterChange('completed')}
          >
            Ukończone ({completedTasksCount})
          </button>
        </div>

        {/* Segmented Control dla widoków */}
        <div className="view-switcher-segmented">
          <button
            type="button"
            className={`view-segment-btn ${activeView === 'list' ? 'active' : ''}`}
            onClick={() => onViewChange('list')}
          >
            <List size={14} />
            <span>Lista</span>
          </button>
          <button
            type="button"
            className={`view-segment-btn ${activeView === 'kanban' ? 'active' : ''}`}
            onClick={() => onViewChange('kanban')}
          >
            <Kanban size={14} />
            <span>Tablica</span>
          </button>
          <button
            type="button"
            className={`view-segment-btn ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => onViewChange('calendar')}
          >
            <Calendar size={14} />
            <span>Kalendarz</span>
          </button>
        </div>
      </div>
    </div>
  );
};
