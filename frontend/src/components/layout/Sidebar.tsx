import React from 'react';
import { User, Project } from '../../api';
import { Avatar } from '../common/Avatar';
import {
  LayoutDashboard,
  CheckSquare,
  Milestone,
  Kanban,
  Calendar,
  BarChart3,
  Settings,
  Plus,
  Pencil,
  Trash2,
  LogOut,
  ChevronsLeftRight,
  Users,
} from 'lucide-react';

interface SidebarProps {
  user: User;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  activeNav: string;
  setActiveNav: (nav: any) => void;
  setActiveView: (view: any) => void;
  totalTasks: number;
  projects: Project[];
  selectedProjectId: number | null;
  onSelectProject: (id: number | null) => void;
  onOpenNewProject: () => void;
  onOpenEditProject: (proj: Project, e: React.MouseEvent) => void;
  onOpenMembersModal: (projectId: number, e: React.MouseEvent) => void;
  onDeleteProject: (proj: Project, e: React.MouseEvent) => void;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  sidebarCollapsed,
  onToggleSidebar,
  activeNav,
  setActiveNav,
  setActiveView,
  totalTasks,
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenNewProject,
  onOpenEditProject,
  onOpenMembersModal,
  onDeleteProject,
  onLogout,
  onOpenSettings,
}) => {
  return (
    <aside className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <LayoutDashboard size={18} />
          </div>
          {!sidebarCollapsed && (
            <span className="sidebar-brand-text">Task Manager</span>
          )}
        </div>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? 'Rozwiń panel' : 'Zwiń panel'}
        >
          <ChevronsLeftRight size={16} />
        </button>
      </div>

      <div className="sidebar-body">
        {/* Główne pozycje nawigacji */}
        <div>
          {!sidebarCollapsed && (
            <div className="sidebar-section-title">
              <span>Nawigacja</span>
            </div>
          )}
          <ul className="sidebar-nav-list">
            <li>
              <button
                type="button"
                className={`sidebar-nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
                onClick={() => {
                  setActiveNav('dashboard');
                  setActiveView('list');
                }}
              >
                <LayoutDashboard size={16} className="nav-icon" />
                {!sidebarCollapsed && <span>Dashboard</span>}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`sidebar-nav-item ${activeNav === 'tasks' ? 'active' : ''}`}
                onClick={() => {
                  setActiveNav('tasks');
                  setActiveView('list');
                }}
              >
                <CheckSquare size={16} className="nav-icon" />
                {!sidebarCollapsed && (
                  <>
                    <span>Zadania</span>
                    <span className="sidebar-nav-badge">{totalTasks}</span>
                  </>
                )}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`sidebar-nav-item ${activeNav === 'sprints' ? 'active' : ''}`}
                onClick={() => setActiveNav('sprints')}
              >
                <Milestone size={16} className="nav-icon" />
                {!sidebarCollapsed && <span>Sprinty</span>}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`sidebar-nav-item ${activeNav === 'kanban' ? 'active' : ''}`}
                onClick={() => {
                  setActiveNav('kanban');
                  setActiveView('kanban');
                }}
              >
                <Kanban size={16} className="nav-icon" />
                {!sidebarCollapsed && <span>Tablica</span>}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`sidebar-nav-item ${activeNav === 'calendar' ? 'active' : ''}`}
                onClick={() => {
                  setActiveNav('calendar');
                  setActiveView('calendar');
                }}
              >
                <Calendar size={16} className="nav-icon" />
                {!sidebarCollapsed && <span>Kalendarz</span>}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`sidebar-nav-item ${activeNav === 'reports' ? 'active' : ''}`}
                onClick={() => setActiveNav('reports')}
              >
                <BarChart3 size={16} className="nav-icon" />
                {!sidebarCollapsed && <span>Raporty</span>}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`sidebar-nav-item ${activeNav === 'settings' ? 'active' : ''}`}
                onClick={() => {
                  setActiveNav('settings');
                  if (onOpenSettings) onOpenSettings();
                }}
              >
                <Settings size={16} className="nav-icon" />
                {!sidebarCollapsed && <span>Ustawienia</span>}
              </button>
            </li>
          </ul>
        </div>

        {/* Sekcja: Twoje Projekty */}
        <div>
          {!sidebarCollapsed && (
            <div className="sidebar-section-title">
              <span>Twoje Projekty</span>
              <button
                type="button"
                className="project-action-btn"
                title="Nowy projekt"
                onClick={onOpenNewProject}
              >
                <Plus size={14} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* Wszystkie projekty */}
            <div
              className={`sidebar-project-item ${selectedProjectId === null ? 'active' : ''}`}
              onClick={() => onSelectProject(null)}
            >
              <div className="project-item-left">
                <div className="project-dot" style={{ backgroundColor: '#6366f1' }} />
                {!sidebarCollapsed && (
                  <span className="project-item-name">Wszystkie projekty</span>
                )}
              </div>
            </div>

            {projects.map((proj) => {
              const isSelected = selectedProjectId === proj.id;
              const isOwner = proj.userId === user.id;

              return (
                <div
                  key={proj.id}
                  className={`sidebar-project-item ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectProject(proj.id)}
                >
                  <div className="project-item-left">
                    <div
                      className="project-dot"
                      style={{
                        backgroundColor: isOwner ? '#3b82f6' : '#10b981',
                      }}
                    />
                    {!sidebarCollapsed && (
                      <span className="project-item-name">{proj.name}</span>
                    )}
                  </div>

                  {!sidebarCollapsed && (
                    <div className="project-item-actions">
                      <button
                        type="button"
                        className="project-action-btn"
                        title="Zarządzaj zespołem"
                        onClick={(e) => onOpenMembersModal(proj.id, e)}
                      >
                        <Users size={12} />
                      </button>
                      {isOwner && (
                        <>
                          <button
                            type="button"
                            className="project-action-btn"
                            title="Edytuj projekt"
                            onClick={(e) => onOpenEditProject(proj, e)}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className="project-action-btn danger"
                            title="Usuń projekt"
                            onClick={(e) => onDeleteProject(proj, e)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {!sidebarCollapsed && (
              <button
                type="button"
                className="sidebar-ghost-btn"
                onClick={onOpenNewProject}
              >
                <Plus size={14} />
                <span>Dodaj nowy projekt</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dolna sekcja (Profil Użytkownika) */}
      <div className="sidebar-footer">
        <div
          className="user-profile-widget"
          onClick={onOpenSettings}
          style={{ cursor: 'pointer' }}
          title="Kliknij, aby otworzyć ustawienia profilu"
        >
          <div className="user-avatar-wrap">
            <Avatar user={user} size={32} />
            <div className="online-dot-badge" title="Status: Online" />
          </div>
          {!sidebarCollapsed && (
            <div className="user-text-meta">
              <span className="user-full-name">{user?.name || user?.email}</span>
              <span className="user-email-label">{user?.email}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          className="logout-icon-btn"
          onClick={onLogout}
          title="Wyloguj się"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
