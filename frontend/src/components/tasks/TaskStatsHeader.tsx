import React from 'react';
import { Project } from '../../api';
import { Inbox, Flame, CheckCircle2, Clock } from 'lucide-react';

interface TaskStatsHeaderProps {
  activeProject?: Project;
  totalTasksCount: number;
  completedTasksCount: number;
  activeTasksCount: number;
  highPriorityCount: number;
  overdueCount: number;
  completionRate: number;
  lowPct: number;
  medPct: number;
  highPct: number;
  compPct: number;
}

export const TaskStatsHeader: React.FC<TaskStatsHeaderProps> = ({
  activeProject,
  totalTasksCount,
  completedTasksCount,
  activeTasksCount,
  highPriorityCount,
  overdueCount,
  completionRate,
  lowPct,
  medPct,
  highPct,
  compPct,
}) => {
  return (
    <div className="workspace-header-block">
      <div className="workspace-title-row">
        <h1 className="workspace-title-main">
          {activeProject ? activeProject.name : 'Wszystkie Zadania'}
        </h1>

        <div className="workspace-metrics-row">
          <div className="metric-pill">
            <Inbox size={14} color="#60a5fa" />
            <span>Aktywne:</span>
            <strong>{activeTasksCount}</strong>
          </div>
          <div className="metric-pill alert">
            <Flame size={14} />
            <span>Wysoki priorytet:</span>
            <strong>{highPriorityCount}</strong>
          </div>
          <div className="metric-pill success">
            <CheckCircle2 size={14} />
            <span>Ukończone:</span>
            <strong>{completedTasksCount}</strong>
          </div>
          {overdueCount > 0 && (
            <div className="metric-pill alert">
              <Clock size={14} />
              <span>Przeterminowane:</span>
              <strong>{overdueCount}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Progress Bar */}
      <div className="multi-progress-card">
        <div className="multi-progress-header">
          <span>
            W realizacji: <strong>{totalTasksCount - completedTasksCount}</strong> z {totalTasksCount} zadań
          </span>
          <span>
            Postęp ukończenia: <strong>{completionRate}%</strong>
          </span>
        </div>
        <div className="multi-progress-track">
          <div className="progress-segment blue" style={{ width: `${lowPct}%` }} title="Niski priorytet" />
          <div className="progress-segment amber" style={{ width: `${medPct}%` }} title="Średni priorytet" />
          <div className="progress-segment rose" style={{ width: `${highPct}%` }} title="Wysoki priorytet" />
          <div className="progress-segment emerald" style={{ width: `${compPct}%` }} title="Ukończone" />
        </div>
      </div>
    </div>
  );
};
