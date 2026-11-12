import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import {
  api,
  setTokens,
  User,
  Project,
  Task,
  Priority,
  ProjectMember,
  TaskComment,
} from './api';
import { Toast, ConfirmDialogConfig } from './types';
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

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Layout & Navigation State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState<
    'dashboard' | 'tasks' | 'sprints' | 'kanban' | 'calendar' | 'reports' | 'settings'
  >('tasks');
  const [activeView, setActiveView] = useState<'list' | 'kanban' | 'calendar'>('list');
  const [isSyncing, setIsSyncing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Project edit modal state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');

  // Project members modal state
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [membersModalError, setMembersModalError] = useState<string | null>(null);

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | Priority>('ALL');
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate' | 'priority' | 'title'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Quick / New task modal state
  const [isQuickTaskModalOpen, setIsQuickTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('MEDIUM');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState<number | ''>('');
  const [newTaskAssignedToId, setNewTaskAssignedToId] = useState<number | ''>('');

  // Edit task modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<Priority>('MEDIUM');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskProjectId, setEditTaskProjectId] = useState<number | ''>('');
  const [editTaskAssignedToId, setEditTaskAssignedToId] = useState<number | ''>('');
  const [editTaskCompleted, setEditTaskCompleted] = useState(false);

  // Drag and Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<'todo' | 'in_progress' | 'completed' | null>(null);

  // Comments state
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Notifications & confirmation
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
        setConfirmDialog(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load projects
  const loadProjects = useCallback(async () => {
    try {
      const data = await api.projects.getAll();
      setProjects(data);
      if (data.length > 0 && newTaskProjectId === '') {
        setNewTaskProjectId(data[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Błąd ładowania projektów', 'error');
    }
  }, [newTaskProjectId, showToast]);

  // Load tasks
  const loadTasks = useCallback(async () => {
    try {
      const params: any = {
        sortBy,
        sortOrder,
        page,
        limit,
      };
      if (selectedProjectId !== null) {
        params.projectId = selectedProjectId;
      }
      if (taskFilter === 'active') {
        params.completed = false;
      } else if (taskFilter === 'completed') {
        params.completed = true;
      }
      if (priorityFilter !== 'ALL') {
        params.priority = priorityFilter;
      }
      if (assignedToMeOnly) {
        params.assignedToMe = true;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.tasks.getAll(params);
      setTasks(res.items);
      setTotalTasks(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      showToast(err.message || 'Błąd ładowania zadań', 'error');
    }
  }, [selectedProjectId, taskFilter, priorityFilter, assignedToMeOnly, searchQuery, sortBy, sortOrder, page, limit, showToast]);

  // Sync action (Refresh button)
  const handleRefresh = async () => {
    setIsSyncing(true);
    await Promise.all([loadProjects(), loadTasks()]);
    setTimeout(() => setIsSyncing(false), 500);
    showToast('Dane zostały zsynchronizowane', 'info');
  };

  // Load members of selected project
  const loadProjectMembers = useCallback(async (projectId: number) => {
    try {
      const members = await api.projects.getMembers(projectId);
      setProjectMembers(members);
    } catch (err: any) {
      setMembersModalError(err.message || 'Błąd ładowania członków projektu');
    }
  }, []);

  // Initial user check
  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const refreshToken =
        localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');

      if (!token && !refreshToken) {
        await Promise.resolve();
        setUser(null);
        setLoadingUser(false);
        return;
      }

      try {
        const { user } = await api.auth.me();
        setUser(user);
      } catch {
        setTokens({ token: null, refreshToken: null });
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    }
    checkAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setTokens({ token: null, refreshToken: null });
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

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

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignoruj ewentualny błąd sieci
    }
    setTokens({ token: null, refreshToken: null });
    setUser(null);
    setProjects([]);
    setTasks([]);
    setSelectedProjectId(null);
    showToast('Wylogowano pomyślnie', 'info');
  };

  // Tworzenie projektu
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const created = await api.projects.create({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
      });
      setNewProjectName('');
      setNewProjectDesc('');
      setIsNewProjectModalOpen(false);
      showToast(`Projekt "${created.name}" został utworzony`, 'success');
      await loadProjects();
    } catch (err: any) {
      showToast(err.message || 'Błąd tworzenia projektu', 'error');
    }
  };

  // Edycja projektu
  const handleOpenEditProject = (proj: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingProject(proj);
    setEditProjectName(proj.name);
    setEditProjectDesc(proj.description || '');
  };

  const handleSaveEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editProjectName.trim()) return;
    try {
      await api.projects.update(editingProject.id, {
        name: editProjectName.trim(),
        description: editProjectDesc.trim() || null,
      });
      setEditingProject(null);
      showToast('Projekt został zaktualizowany', 'success');
      await loadProjects();
      await loadTasks();
    } catch (err: any) {
      showToast(err.message || 'Błąd aktualizacji projektu', 'error');
    }
  };

  // Usuwanie projektu
  const handleDeleteProject = (proj: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setConfirmDialog({
      title: 'Usuń projekt',
      message: `Czy na pewno chcesz usunąć projekt "${proj.name}" wraz ze wszystkimi jego zadaniami? Tej operacji nie można cofnąć.`,
      confirmLabel: 'Usuń projekt',
      isDanger: true,
      onConfirm: async () => {
        try {
          await api.projects.delete(proj.id);
          if (selectedProjectId === proj.id) {
            setSelectedProjectId(null);
          }
          showToast(`Projekt "${proj.name}" został usunięty`, 'info');
          await loadProjects();
          await loadTasks();
        } catch (err: any) {
          showToast(err.message || 'Błąd usuwania projektu', 'error');
        }
      },
    });
  };

  const handleOpenMembersModal = async (projectId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedProjectId(projectId);
    setMembersModalError(null);
    setNewMemberEmail('');
    await loadProjectMembers(projectId);
    setIsMembersModalOpen(true);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newMemberEmail.trim()) return;
    try {
      setMembersModalError(null);
      await api.projects.addMember(selectedProjectId, {
        email: newMemberEmail.trim(),
        role: 'MEMBER',
      });
      setNewMemberEmail('');
      showToast('Dodano nowego członka do zespołu', 'success');
      await loadProjectMembers(selectedProjectId);
      await loadProjects();
    } catch (err: any) {
      setMembersModalError(err.message || 'Nie udało się dodać członka');
    }
  };

  const handleRemoveMember = (projectId: number, memberUserId: number, memberName: string) => {
    const isSelf = memberUserId === user?.id;
    setConfirmDialog({
      title: isSelf ? 'Opuść projekt' : 'Usuń członka zespołu',
      message: isSelf
        ? 'Czy na pewno chcesz opuścić ten projekt? Stracisz do niego dostęp.'
        : `Czy na pewno chcesz usunąć użytkownika "${memberName}" z tego projektu?`,
      confirmLabel: isSelf ? 'Opuść projekt' : 'Usuń członka',
      isDanger: true,
      onConfirm: async () => {
        try {
          await api.projects.removeMember(projectId, memberUserId);
          showToast(isSelf ? 'Opuściłeś projekt' : `Użytkownik ${memberName} został usunięty`, 'info');
          if (isSelf && selectedProjectId === projectId) {
            setIsMembersModalOpen(false);
            setSelectedProjectId(null);
          } else {
            await loadProjectMembers(projectId);
          }
          await loadProjects();
          await loadTasks();
        } catch (err: any) {
          showToast(err.message || 'Nie udało się usunąć członka', 'error');
        }
      },
    });
  };

  // Tworzenie zadania
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || newTaskProjectId === '') return;
    try {
      let formattedDueDate: string | null = null;
      if (newTaskDueDate) {
        formattedDueDate = new Date(newTaskDueDate).toISOString();
      }

      await api.tasks.create({
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || undefined,
        priority: newTaskPriority,
        dueDate: formattedDueDate,
        projectId: Number(newTaskProjectId),
        assignedToId: newTaskAssignedToId !== '' ? Number(newTaskAssignedToId) : null,
      });

      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('MEDIUM');
      setNewTaskDueDate('');
      setNewTaskAssignedToId('');
      setIsQuickTaskModalOpen(false);
      showToast('Zadanie dodane pomyślnie', 'success');
      await loadTasks();
      await loadProjects();
    } catch (err: any) {
      showToast(err.message || 'Błąd dodawania zadania', 'error');
    }
  };

  // Ładowanie komentarzy zadania
  const loadTaskComments = async (taskId: number) => {
    setLoadingComments(true);
    try {
      const data = await api.tasks.getComments(taskId);
      setTaskComments(data);
    } catch {
      setTaskComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  // Dodawanie komentarza do zadania
  const handleAddComment = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!editingTask || !newCommentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      const created = await api.tasks.addComment(editingTask.id, {
        content: newCommentText.trim(),
      });
      setTaskComments((prev) => [...prev, created]);
      setNewCommentText('');
      showToast('Komentarz został opublikowany', 'success');
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? { ...t, _count: { comments: (t._count?.comments || 0) + 1 } }
            : t
        )
      );
    } catch (err: any) {
      showToast(err.message || 'Błąd dodawania komentarza', 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Usuwanie komentarza
  const handleDeleteComment = async (commentId: number) => {
    if (!editingTask) return;
    try {
      await api.tasks.deleteComment(editingTask.id, commentId);
      setTaskComments((prev) => prev.filter((c) => c.id !== commentId));
      showToast('Komentarz usunięty', 'info');
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? { ...t, _count: { comments: Math.max(0, (t._count?.comments || 1) - 1) } }
            : t
        )
      );
    } catch (err: any) {
      showToast(err.message || 'Błąd usuwania komentarza', 'error');
    }
  };

  // Edycja zadania
  const handleOpenEditTask = (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || '');
    setEditTaskPriority(task.priority);
    setEditTaskDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    setEditTaskProjectId(task.projectId);
    setEditTaskAssignedToId(task.assignedToId || '');
    setEditTaskCompleted(task.completed);
    setNewCommentText('');
    loadTaskComments(task.id);
  };

  // Obsługa przeciągania kart na Kanbanie (Drag & Drop)
  const handleKanbanDrop = async (
    taskId: number,
    targetCol: 'todo' | 'in_progress' | 'completed'
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let nextCompleted = task.completed;
    let nextPriority = task.priority;

    if (targetCol === 'completed') {
      nextCompleted = true;
    } else if (targetCol === 'in_progress') {
      nextCompleted = false;
      nextPriority = 'HIGH';
    } else if (targetCol === 'todo') {
      nextCompleted = false;
      if (nextPriority === 'HIGH') {
        nextPriority = 'MEDIUM';
      }
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, completed: nextCompleted, priority: nextPriority }
          : t
      )
    );

    const colTitles = {
      todo: 'Do zrobienia',
      in_progress: 'W toku (Wysoki priorytet)',
      completed: 'Ukończone',
    };
    showToast(`Przeniesiono zadanie do kolumny: "${colTitles[targetCol]}"`, 'success');

    try {
      await api.tasks.update(taskId, {
        completed: nextCompleted,
        priority: nextPriority,
      });
      await loadTasks();
    } catch (err: any) {
      showToast(err.message || 'Błąd aktualizacji statusu zadania', 'error');
      await loadTasks();
    }
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTaskTitle.trim()) return;
    try {
      let formattedDueDate: string | null = null;
      if (editTaskDueDate) {
        formattedDueDate = new Date(editTaskDueDate).toISOString();
      }

      await api.tasks.update(editingTask.id, {
        title: editTaskTitle.trim(),
        description: editTaskDesc.trim() || null,
        priority: editTaskPriority,
        dueDate: formattedDueDate,
        projectId: Number(editTaskProjectId),
        assignedToId: editTaskAssignedToId !== '' ? Number(editTaskAssignedToId) : null,
        completed: editTaskCompleted,
      });

      setEditingTask(null);
      showToast('Zadanie zostało zaktualizowane', 'success');
      await loadTasks();
      await loadProjects();
    } catch (err: any) {
      showToast(err.message || 'Błąd aktualizacji zadania', 'error');
    }
  };

  // Toggle statusu zadania
  const handleToggleTask = async (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const nextCompleted = !task.completed;
      await api.tasks.update(task.id, { completed: nextCompleted });
      showToast(
        nextCompleted ? `Ukończono: "${task.title}"` : `Przywrócono do aktywnych: "${task.title}"`,
        'success'
      );
      await loadTasks();
    } catch (err: any) {
      showToast(err.message || 'Błąd aktualizacji statusu zadania', 'error');
    }
  };

  // Zmiana przypisania zadania
  const handleAssigneeChange = async (task: Task, newAssigneeId: number | null) => {
    try {
      await api.tasks.update(task.id, { assignedToId: newAssigneeId });
      showToast('Zaktualizowano przypisaną osobę', 'success');
      await loadTasks();
    } catch (err: any) {
      showToast(err.message || 'Błąd zmiany przypisania zadania', 'error');
    }
  };

  // Usuwanie zadania
  const handleDeleteTask = (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setConfirmDialog({
      title: 'Usuń zadanie',
      message: `Czy na pewno chcesz usunąć zadanie "${task.title}"?`,
      confirmLabel: 'Usuń zadanie',
      isDanger: true,
      onConfirm: async () => {
        try {
          await api.tasks.delete(task.id);
          showToast(`Zadanie "${task.title}" zostało usunięte`, 'info');
          await loadTasks();
          await loadProjects();
        } catch (err: any) {
          showToast(err.message || 'Błąd usuwania zadania', 'error');
        }
      },
    });
  };

  // Helper dla daty i opóźnienia
  const isOverdue = (dateStr?: string | null, completed?: boolean) => {
    if (!dateStr || completed) return false;
    return new Date(dateStr).getTime() < Date.now();
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const activeProject = projects.find((p) => p.id === selectedProjectId);
  const isOwnerOfActiveProject = activeProject?.userId === user?.id;

  // Dostępni członkowie dla formularza nowego zadania
  const quickTaskProject = projects.find((p) => p.id === Number(newTaskProjectId));
  const availableAssignees = quickTaskProject?.members || [];

  // Dostępni członkowie dla formularza edycji zadania
  const editTaskSelectedProject = projects.find((p) => p.id === Number(editTaskProjectId));
  const editTaskAvailableAssignees = editTaskSelectedProject?.members || [];

  // Obliczenia statystyk i paska postępu
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const activeTasksCount = totalTasksCount - completedTasksCount;
  const completionRate =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const highPriorityCount = tasks.filter((t) => t.priority === 'HIGH' && !t.completed).length;
  const mediumPriorityCount = tasks.filter((t) => t.priority === 'MEDIUM' && !t.completed).length;
  const lowPriorityCount = tasks.filter((t) => t.priority === 'LOW' && !t.completed).length;
  const overdueCount = tasks.filter((t) => isOverdue(t.dueDate, t.completed)).length;

  const lowPct = totalTasksCount > 0 ? (lowPriorityCount / totalTasksCount) * 100 : 0;
  const medPct = totalTasksCount > 0 ? (mediumPriorityCount / totalTasksCount) * 100 : 0;
  const highPct = totalTasksCount > 0 ? (highPriorityCount / totalTasksCount) * 100 : 0;
  const compPct = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;

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
      <div className="auth-container">
        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
        <AuthScreen onAuthSuccess={setUser} showToast={showToast} />
      </div>
    );
  }

  // Główny widok aplikacji
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
        totalTasks={totalTasks}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onOpenNewProject={() => {
          setNewProjectName('');
          setNewProjectDesc('');
          setIsNewProjectModalOpen(true);
        }}
        onOpenEditProject={handleOpenEditProject}
        onOpenMembersModal={handleOpenMembersModal}
        onDeleteProject={handleDeleteProject}
        onLogout={handleLogout}
      />

      <div className="app-main">
        <TopNav
          activeProject={activeProject}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onQuickTaskOpen={() => setIsQuickTaskModalOpen(true)}
          onSelectAllProjects={() => setSelectedProjectId(null)}
          searchInputRef={searchInputRef}
          showToast={showToast}
        />

        <main className="workspace-content app-workspace">
          <TaskStatsHeader
            activeProject={activeProject}
            totalTasksCount={totalTasksCount}
            completedTasksCount={completedTasksCount}
            activeTasksCount={activeTasksCount}
            highPriorityCount={highPriorityCount}
            overdueCount={overdueCount}
            completionRate={completionRate}
            lowPct={lowPct}
            medPct={medPct}
            highPct={highPct}
            compPct={compPct}
          />

          <TaskFilterBar
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            assignedToMeOnly={assignedToMeOnly}
            onToggleAssignedToMe={() => setAssignedToMeOnly(!assignedToMeOnly)}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(sb, so) => {
              setSortBy(sb);
              setSortOrder(so);
            }}
            onRefresh={handleRefresh}
            isSyncing={isSyncing}
            taskFilter={taskFilter}
            onTaskFilterChange={setTaskFilter}
            activeView={activeView}
            onViewChange={setActiveView}
            totalTasks={totalTasks}
            activeTasksCount={activeTasksCount}
            highPriorityCount={highPriorityCount}
            completedTasksCount={completedTasksCount}
          />

          {activeView === 'list' && (
            <TaskBacklogTable
              tasks={tasks}
              projects={projects}
              onToggleTask={handleToggleTask}
              onOpenEditTask={handleOpenEditTask}
              onAssigneeChange={handleAssigneeChange}
              onDeleteTask={handleDeleteTask}
              isOverdue={isOverdue}
              formatDate={formatDate}
            />
          )}

          {activeView === 'kanban' && (
            <KanbanBoard
              tasks={tasks}
              draggedTaskId={draggedTaskId}
              setDraggedTaskId={setDraggedTaskId}
              dragOverColumn={dragOverColumn}
              setDragOverColumn={setDragOverColumn}
              onKanbanDrop={handleKanbanDrop}
              onOpenEditTask={handleOpenEditTask}
              onToggleTask={handleToggleTask}
              formatDate={formatDate}
            />
          )}

          {activeView === 'calendar' && (
            <CalendarView
              tasks={tasks}
              onOpenEditTask={handleOpenEditTask}
              onToggleTask={handleToggleTask}
              isOverdue={isOverdue}
              formatDate={formatDate}
            />
          )}

          <TaskPaginationFooter
            page={page}
            setPage={setPage}
            limit={limit}
            setLimit={setLimit}
            totalTasks={totalTasks}
            totalPages={totalPages}
            tasksLength={tasks.length}
            onRefresh={handleRefresh}
            isSyncing={isSyncing}
          />
        </main>
      </div>

      <QuickTaskModal
        isOpen={isQuickTaskModalOpen}
        onClose={() => setIsQuickTaskModalOpen(false)}
        onSubmit={handleCreateTask}
        projects={projects}
        projectId={newTaskProjectId}
        setProjectId={setNewTaskProjectId}
        title={newTaskTitle}
        setTitle={setNewTaskTitle}
        description={newTaskDesc}
        setDescription={setNewTaskDesc}
        priority={newTaskPriority}
        setPriority={setNewTaskPriority}
        dueDate={newTaskDueDate}
        setDueDate={setNewTaskDueDate}
        assignedToId={newTaskAssignedToId}
        setAssignedToId={setNewTaskAssignedToId}
        availableAssignees={availableAssignees}
      />

      <EditTaskModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveEditTask}
        title={editTaskTitle}
        setTitle={setEditTaskTitle}
        description={editTaskDesc}
        setDescription={setEditTaskDesc}
        priority={editTaskPriority}
        setPriority={setEditTaskPriority}
        dueDate={editTaskDueDate}
        setDueDate={setEditTaskDueDate}
        assignedToId={editTaskAssignedToId}
        setAssignedToId={setEditTaskAssignedToId}
        completed={editTaskCompleted}
        setCompleted={setEditTaskCompleted}
        availableAssignees={editTaskAvailableAssignees}
        taskComments={taskComments}
        loadingComments={loadingComments}
        newCommentText={newCommentText}
        setNewCommentText={setNewCommentText}
        isSubmittingComment={isSubmittingComment}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        currentUser={user}
        activeProject={activeProject}
      />

      <ProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onSubmit={handleCreateProject}
        name={newProjectName}
        setName={setNewProjectName}
        description={newProjectDesc}
        setDescription={setNewProjectDesc}
      />

      <ProjectModal
        isOpen={!!editingProject}
        isEdit
        title={editingProject ? `Edytuj projekt: ${editingProject.name}` : undefined}
        onClose={() => setEditingProject(null)}
        onSubmit={handleSaveEditProject}
        name={editProjectName}
        setName={setEditProjectName}
        description={editProjectDesc}
        setDescription={setEditProjectDesc}
      />

      <ProjectMembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        activeProject={activeProject}
        projectMembers={projectMembers}
        currentUser={user}
        isOwnerOfActiveProject={isOwnerOfActiveProject}
        membersModalError={membersModalError || ''}
        newMemberEmail={newMemberEmail}
        setNewMemberEmail={setNewMemberEmail}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
      />

      <ConfirmDialog
        config={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />
    </div>
  );
}

export default App;
