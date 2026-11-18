import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { ToastContainer } from './components/common/ToastContainer';
import { ConfirmDialog } from './components/modals/ConfirmDialog';
import { AuthScreen } from './components/auth/AuthScreen';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { TaskStatsHeader } from './components/tasks/TaskStatsHeader';
import { TaskFilterBar } from './components/tasks/TaskFilterBar';
import { TaskBacklogTable } from './components/tasks/TaskBacklogTable';
import { KanbanBoard } from './components/tasks/KanbanBoard';
import { CalendarView } from './components/tasks/CalendarView';
import { TaskPaginationFooter } from './components/tasks/TaskPaginationFooter';
import { QuickTaskModal } from './components/modals/QuickTaskModal';
import { EditTaskModal } from './components/modals/EditTaskModal';
import { ProjectModal } from './components/modals/ProjectModal';
import { ProjectMembersModal } from './components/modals/ProjectMembersModal';
import { UserSettingsModal } from './components/modals/UserSettingsModal';
import { createEventSource } from './api';

import { useToast } from './hooks/useToast';
import { useAuth } from './hooks/useAuth';
import { useProjects } from './hooks/useProjects';
import { useTasks } from './hooks/useTasks';

export function App() {
  const { toasts, showToast, removeToast, confirmDialog, setConfirmDialog } = useToast();
  const { user, setUser, loadingUser, handleLogout } = useAuth(showToast);

  // Layout & Navigation State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState<
    'dashboard' | 'tasks' | 'sprints' | 'kanban' | 'calendar' | 'reports' | 'settings'
  >('tasks');
  const [activeView, setActiveView] = useState<'list' | 'kanban' | 'calendar'>('list');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Projects domain hook
  const projectsHook = useProjects(user, showToast, setConfirmDialog);

  // Tasks domain hook
  const tasksHook = useTasks(projectsHook.selectedProjectId, showToast, setConfirmDialog);

  const { loadProjects, projects, setIsNewProjectModalOpen, setEditingProject, setIsMembersModalOpen } = projectsHook;
  const { loadTasks, newTaskProjectId, setNewTaskProjectId, setIsQuickTaskModalOpen, setEditingTask } = tasksHook;

  // When user is authenticated, load data
  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user, loadProjects]);

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user, loadTasks]);

  // If projects load and no default project is set in quick task modal, initialize it
  useEffect(() => {
    if (projects.length > 0 && newTaskProjectId === '') {
      setNewTaskProjectId(projects[0].id);
    }
  }, [projects, newTaskProjectId, setNewTaskProjectId]);

  // Sync action (Refresh button)
  const handleRefresh = async () => {
    setIsSyncing(true);
    await Promise.all([loadProjects(), loadTasks()]);
    setTimeout(() => setIsSyncing(false), 500);
    showToast('Dane zostały zsynchronizowane', 'info');
  };

  // Nasłuchiwanie aktualizacji w czasie rzeczywistym przez SSE (Server-Sent Events)
  useEffect(() => {
    if (!user) return;

    const es = createEventSource();
    if (!es) return;

    const onTaskEvent = () => {
      loadTasks();
    };

    const onProjectEvent = () => {
      loadProjects();
    };

    es.addEventListener('task:created', onTaskEvent);
    es.addEventListener('task:updated', onTaskEvent);
    es.addEventListener('task:deleted', onTaskEvent);
    es.addEventListener('comment:created', onTaskEvent);
    es.addEventListener('comment:deleted', onTaskEvent);
    es.addEventListener('project:updated', onProjectEvent);
    es.addEventListener('project:members_updated', onProjectEvent);
    es.addEventListener('project:deleted', onProjectEvent);

    return () => {
      es.close();
    };
  }, [user, loadTasks, loadProjects]);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K and Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsQuickTaskModalOpen(false);
        setIsNewProjectModalOpen(false);
        setEditingProject(null);
        setEditingTask(null);
        setIsMembersModalOpen(false);
        setIsSettingsModalOpen(false);
        setConfirmDialog(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsQuickTaskModalOpen, setIsNewProjectModalOpen, setEditingProject, setEditingTask, setIsMembersModalOpen, setConfirmDialog]);

  // Ekran ładowania aplikacji
  if (loadingUser) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>Ładowanie aplikacji...</p>
      </div>
    );
  }

  // Ekran Autoryzacji (Logowanie / Rejestracja / Reset hasła)
  if (!user) {
    return (
      <>
        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
        <AuthScreen onAuthSuccess={setUser} showToast={showToast} />
      </>
    );
  }

  // Wyliczanie dostępnych przypisań
  const quickTaskProject = projectsHook.projects.find(
    (p) => p.id === Number(tasksHook.newTaskProjectId)
  );
  const availableAssignees = quickTaskProject?.members || [];

  const editTaskSelectedProject = projectsHook.projects.find(
    (p) => p.id === Number(tasksHook.editTaskProjectId)
  );
  const editTaskAvailableAssignees = editTaskSelectedProject?.members || [];

  return (
    <div className="app-shell app-layout">
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      <Sidebar
        user={user}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        setActiveView={setActiveView}
        totalTasks={tasksHook.totalTasks}
        projects={projectsHook.projects}
        selectedProjectId={projectsHook.selectedProjectId}
        onSelectProject={projectsHook.setSelectedProjectId}
        onOpenNewProject={() => {
          projectsHook.setNewProjectName('');
          projectsHook.setNewProjectDesc('');
          projectsHook.setIsNewProjectModalOpen(true);
        }}
        onOpenEditProject={projectsHook.handleOpenEditProject}
        onOpenMembersModal={projectsHook.handleOpenMembersModal}
        onDeleteProject={projectsHook.handleDeleteProject}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <div className="app-main">
        <TopNav
          activeProject={projectsHook.activeProject}
          searchQuery={tasksHook.searchQuery}
          onSearchChange={tasksHook.setSearchQuery}
          onQuickTaskOpen={() => tasksHook.setIsQuickTaskModalOpen(true)}
          onSelectAllProjects={() => projectsHook.setSelectedProjectId(null)}
          searchInputRef={searchInputRef}
          showToast={showToast}
          isViewer={projectsHook.isViewerOfActiveProject}
        />

        <main className="workspace-content app-workspace">
          <TaskStatsHeader
            activeProject={projectsHook.activeProject}
            totalTasksCount={tasksHook.totalTasksCount}
            completedTasksCount={tasksHook.completedTasksCount}
            activeTasksCount={tasksHook.activeTasksCount}
            highPriorityCount={tasksHook.highPriorityCount}
            overdueCount={tasksHook.overdueCount}
            completionRate={tasksHook.completionRate}
            lowPct={tasksHook.lowPct}
            medPct={tasksHook.medPct}
            highPct={tasksHook.highPct}
            compPct={tasksHook.compPct}
          />

          <TaskFilterBar
            projects={projectsHook.projects}
            selectedProjectId={projectsHook.selectedProjectId}
            onSelectProject={projectsHook.setSelectedProjectId}
            assignedToMeOnly={tasksHook.assignedToMeOnly}
            onToggleAssignedToMe={() => tasksHook.setAssignedToMeOnly(!tasksHook.assignedToMeOnly)}
            priorityFilter={tasksHook.priorityFilter}
            onPriorityFilterChange={tasksHook.setPriorityFilter}
            sortBy={tasksHook.sortBy}
            sortOrder={tasksHook.sortOrder}
            onSortChange={(sb, so) => {
              tasksHook.setSortBy(sb);
              tasksHook.setSortOrder(so);
            }}
            onRefresh={handleRefresh}
            isSyncing={isSyncing}
            taskFilter={tasksHook.taskFilter}
            onTaskFilterChange={tasksHook.setTaskFilter}
            activeView={activeView}
            onViewChange={setActiveView}
            totalTasks={tasksHook.totalTasks}
            activeTasksCount={tasksHook.activeTasksCount}
            highPriorityCount={tasksHook.highPriorityCount}
            completedTasksCount={tasksHook.completedTasksCount}
          />

          {activeView === 'list' && (
            <TaskBacklogTable
              tasks={tasksHook.tasks}
              projects={projectsHook.projects}
              onToggleTask={tasksHook.handleToggleTask}
              onOpenEditTask={tasksHook.handleOpenEditTask}
              onAssigneeChange={tasksHook.handleAssigneeChange}
              onDeleteTask={tasksHook.handleDeleteTask}
              isOverdue={tasksHook.isOverdue}
              formatDate={tasksHook.formatDate}
            />
          )}

          {activeView === 'kanban' && (
            <KanbanBoard
              tasks={tasksHook.tasks}
              draggedTaskId={tasksHook.draggedTaskId}
              setDraggedTaskId={tasksHook.setDraggedTaskId}
              dragOverColumn={tasksHook.dragOverColumn}
              setDragOverColumn={tasksHook.setDragOverColumn}
              onKanbanDrop={tasksHook.handleKanbanDrop}
              onOpenEditTask={tasksHook.handleOpenEditTask}
              onToggleTask={tasksHook.handleToggleTask}
              formatDate={tasksHook.formatDate}
            />
          )}

          {activeView === 'calendar' && (
            <CalendarView
              tasks={tasksHook.tasks}
              onOpenEditTask={tasksHook.handleOpenEditTask}
              onToggleTask={tasksHook.handleToggleTask}
              isOverdue={tasksHook.isOverdue}
              formatDate={tasksHook.formatDate}
            />
          )}

          <TaskPaginationFooter
            page={tasksHook.page}
            setPage={tasksHook.setPage}
            limit={tasksHook.limit}
            setLimit={tasksHook.setLimit}
            totalTasks={tasksHook.totalTasks}
            totalPages={tasksHook.totalPages}
            tasksLength={tasksHook.tasks.length}
            onRefresh={handleRefresh}
            isSyncing={isSyncing}
          />
        </main>
      </div>

      <QuickTaskModal
        isOpen={tasksHook.isQuickTaskModalOpen}
        onClose={() => tasksHook.setIsQuickTaskModalOpen(false)}
        onSubmit={tasksHook.handleCreateTask}
        projects={projectsHook.projects}
        projectId={tasksHook.newTaskProjectId}
        setProjectId={tasksHook.setNewTaskProjectId}
        title={tasksHook.newTaskTitle}
        setTitle={tasksHook.setNewTaskTitle}
        description={tasksHook.newTaskDesc}
        setDescription={tasksHook.setNewTaskDesc}
        priority={tasksHook.newTaskPriority}
        setPriority={tasksHook.setNewTaskPriority}
        dueDate={tasksHook.newTaskDueDate}
        setDueDate={tasksHook.setNewTaskDueDate}
        assignedToId={tasksHook.newTaskAssignedToId}
        setAssignedToId={tasksHook.setNewTaskAssignedToId}
        availableAssignees={availableAssignees}
      />

      <EditTaskModal
        task={tasksHook.editingTask}
        onClose={() => tasksHook.setEditingTask(null)}
        onSave={tasksHook.handleSaveEditTask}
        title={tasksHook.editTaskTitle}
        setTitle={tasksHook.setEditTaskTitle}
        description={tasksHook.editTaskDesc}
        setDescription={tasksHook.setEditTaskDesc}
        priority={tasksHook.editTaskPriority}
        setPriority={tasksHook.setEditTaskPriority}
        dueDate={tasksHook.editTaskDueDate}
        setDueDate={tasksHook.setEditTaskDueDate}
        assignedToId={tasksHook.editTaskAssignedToId}
        setAssignedToId={tasksHook.setEditTaskAssignedToId}
        completed={tasksHook.editTaskCompleted}
        setCompleted={tasksHook.setEditTaskCompleted}
        availableAssignees={editTaskAvailableAssignees}
        taskComments={tasksHook.taskComments}
        loadingComments={tasksHook.loadingComments}
        newCommentText={tasksHook.newCommentText}
        setNewCommentText={tasksHook.setNewCommentText}
        isSubmittingComment={tasksHook.isSubmittingComment}
        onAddComment={tasksHook.handleAddComment}
        onDeleteComment={tasksHook.handleDeleteComment}
        currentUser={user}
        activeProject={projectsHook.activeProject}
      />

      <ProjectModal
        isOpen={projectsHook.isNewProjectModalOpen}
        onClose={() => projectsHook.setIsNewProjectModalOpen(false)}
        onSubmit={projectsHook.handleCreateProject}
        name={projectsHook.newProjectName}
        setName={projectsHook.setNewProjectName}
        description={projectsHook.newProjectDesc}
        setDescription={projectsHook.setNewProjectDesc}
      />

      <ProjectModal
        isOpen={!!projectsHook.editingProject}
        isEdit
        title={
          projectsHook.editingProject
            ? `Edytuj projekt: ${projectsHook.editingProject.name}`
            : undefined
        }
        onClose={() => projectsHook.setEditingProject(null)}
        onSubmit={projectsHook.handleSaveEditProject}
        name={projectsHook.editProjectName}
        setName={projectsHook.setEditProjectName}
        description={projectsHook.editProjectDesc}
        setDescription={projectsHook.setEditProjectDesc}
      />

      <ProjectMembersModal
        isOpen={projectsHook.isMembersModalOpen}
        onClose={() => projectsHook.setIsMembersModalOpen(false)}
        activeProject={projectsHook.activeProject}
        projectMembers={projectsHook.projectMembers}
        currentUser={user}
        isOwnerOfActiveProject={projectsHook.isOwnerOfActiveProject}
        membersModalError={projectsHook.membersModalError || ''}
        newMemberEmail={projectsHook.newMemberEmail}
        setNewMemberEmail={projectsHook.setNewMemberEmail}
        newMemberRole={projectsHook.newMemberRole}
        setNewMemberRole={projectsHook.setNewMemberRole}
        onAddMember={projectsHook.handleAddMember}
        onRemoveMember={projectsHook.handleRemoveMember}
      />

      <ConfirmDialog
        config={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />

      {user && (
        <UserSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          currentUser={user}
          onUserUpdated={(updatedUser) => {
            setUser(updatedUser);
            loadProjects();
            loadTasks();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

export default App;
