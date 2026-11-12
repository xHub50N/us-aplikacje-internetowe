import React from 'react';
import { RefreshCw } from 'lucide-react';

interface TaskPaginationFooterProps {
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  totalTasks: number;
  totalPages: number;
  tasksLength: number;
  onRefresh: () => void;
  isSyncing: boolean;
}

export const TaskPaginationFooter: React.FC<TaskPaginationFooterProps> = ({
  page,
  setPage,
  limit,
  setLimit,
  totalTasks,
  totalPages,
  tasksLength,
  onRefresh,
  isSyncing,
}) => {
  return (
    <footer className="workspace-footer">
      <div>
        Wyświetlono {tasksLength > 0 ? (page - 1) * limit + 1 : 0}–
        {Math.min(page * limit, totalTasks)} z {totalTasks} zadań
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div>
          Na stronę:{' '}
          <select
            className="filter-dropdown-select"
            style={{ height: '26px', padding: '0 6px' }}
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="pagination-controls">
          <button
            type="button"
            className="page-btn"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            title="Poprzednia strona"
          >
            ‹
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .map((p) => (
              <button
                key={p}
                type="button"
                className={`page-btn ${page === p ? 'active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}

          <button
            type="button"
            className="page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            title="Następna strona"
          >
            ›
          </button>
        </div>
      </div>

      <div
        className="sync-status-indicator"
        onClick={onRefresh}
        title="Kliknij, aby odświeżyć"
      >
        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
        <span>Synchronizacja: przed chwilą</span>
      </div>
    </footer>
  );
};
