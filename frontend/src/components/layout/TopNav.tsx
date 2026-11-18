import React from 'react';
import { Project } from '../../api';
import { ChevronRight, Search, Bell, Plus } from 'lucide-react';

interface TopNavProps {
  activeProject?: Project;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onQuickTaskOpen: () => void;
  onSelectAllProjects: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  isViewer?: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeProject,
  searchQuery,
  onSearchChange,
  onQuickTaskOpen,
  onSelectAllProjects,
  searchInputRef,
  showToast,
  isViewer = false,
}) => {
  return (
    <header className="app-topnav">
      <div className="topnav-breadcrumbs">
        <span className="breadcrumb-item" onClick={onSelectAllProjects}>
          Projekty
        </span>
        <ChevronRight size={14} color="#64748b" />
        <span className="breadcrumb-item active">
          {activeProject ? activeProject.name : 'Wszystkie zadania'}
        </span>
        <ChevronRight size={14} color="#64748b" />
        <span className="breadcrumb-item active">Zadania</span>
      </div>

      <div className="topnav-actions">
        {/* Globalna Wyszukiwarka */}
        <div className="topnav-search-box">
          <Search size={14} className="topnav-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Szukaj zadań lub projektów..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <span className="search-shortcut-badge">⌘K</span>
        </div>

        {/* Powiadomienia */}
        <button
          type="button"
          className="topnav-icon-btn"
          title="Powiadomienia"
          onClick={() => showToast('Brak nowych nieprzeczytanych powiadomień', 'info')}
        >
          <Bell size={16} />
          <span className="notification-indicator-dot" />
        </button>

        {/* Główny CTA: Szybkie dodanie zadania lub wskaźnik trybu widza */}
        {isViewer ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(51, 65, 85, 0.4)',
              border: '1px solid #334155',
              color: '#94a3b8',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <span>👁️ Tryb widza (tylko odczyt)</span>
          </div>
        ) : (
          <button
            type="button"
            className="cta-primary-btn"
            onClick={onQuickTaskOpen}
          >
            <Plus size={15} />
            <span>Szybkie dodanie zadania</span>
          </button>
        )}
      </div>
    </header>
  );
};
