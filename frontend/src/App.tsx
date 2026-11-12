import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { api, setTokens, User, Project, Task, Priority, ProjectMember } from './api';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Auth state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
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

  // New task form state
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

  // Notifications & confirmation
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

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

  // Load projects
  const loadProjects = useCallback(async () => {
    try {
      const data = await api.projects.getAll();
      setProjects(data);
      if (data.length > 0 && newTaskProjectId === '') {
        setNewTaskProjectId(data[0].id);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Błąd ładowania projektów');
    }
  }, [newTaskProjectId]);

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
      setGlobalError(err.message || 'Błąd ładowania zadań');
    }
  }, [selectedProjectId, taskFilter, priorityFilter, assignedToMeOnly, searchQuery, sortBy, sortOrder, page, limit]);

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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (authMode === 'login') {
        const res = await api.auth.login({ email, password });
        setTokens({ token: res.token, refreshToken: res.refreshToken });
        setUser(res.user);
        showToast(`Witaj ponownie, ${res.user.name}!`, 'success');
      } else {
        const res = await api.auth.register({ name, email, password });
        setTokens({ token: res.token, refreshToken: res.refreshToken });
        setUser(res.user);
        showToast(`Witaj w aplikacji, ${res.user.name}!`, 'success');
      }
      setEmail('');
      setPassword('');
      setName('');
    } catch (err: any) {
      setAuthError(err.message || 'Błąd autoryzacji');
    }
  };

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
      setGlobalError(null);
      const created = await api.projects.create({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
      });
      setNewProjectName('');
      setNewProjectDesc('');
      showToast(`Projekt "${created.name}" został utworzony`, 'success');
      await loadProjects();
    } catch (err: any) {
      showToast(err.message || 'Błąd tworzenia projektu', 'error');
    }
  };

  // Edycja projektu
  const handleOpenEditProject = (proj: Project) => {
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

  // Usuwanie projektu z potwierdzeniem
  const handleDeleteProject = (proj: Project) => {
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

  const handleOpenMembersModal = async (projectId: number) => {
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
      showToast('Zadanie dodane pomyślnie', 'success');
      await loadTasks();
      await loadProjects();
    } catch (err: any) {
      showToast(err.message || 'Błąd dodawania zadania', 'error');
    }
  };

  // Edycja zadania
  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || '');
    setEditTaskPriority(task.priority);
    setEditTaskDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    setEditTaskProjectId(task.projectId);
    setEditTaskAssignedToId(task.assignedToId || '');
    setEditTaskCompleted(task.completed);
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

  // Toggle ukończenia
  const handleToggleTask = async (task: Task) => {
    try {
      const nextCompleted = !task.completed;
      await api.tasks.update(task.id, { completed: nextCompleted });
      showToast(
        nextCompleted ? `Ukończono zadanie: "${task.title}"` : `Zadanie "${task.title}" powróciło do aktywnych`,
        'success'
      );
      await loadTasks();
    } catch (err: any) {
      showToast(err.message || 'Błąd aktualizacji zadania', 'error');
    }
  };

  // Zmiana przypisania
  const handleAssigneeChange = async (task: Task, newAssigneeId: number | null) => {
    try {
      await api.tasks.update(task.id, { assignedToId: newAssigneeId });
      showToast('Zaktualizowano przypisaną osobę', 'success');
      await loadTasks();
    } catch (err: any) {
      showToast(err.message || 'Błąd zmiany przypisania zadania', 'error');
    }
  };

  // Usuwanie zadania z potwierdzeniem
  const handleDeleteTask = (task: Task) => {
    setConfirmDialog({
      title: 'Usuń zadanie',
      message: `Czy na pewno chcesz usunąć zadanie "${task.title}"?`,
      confirmLabel: 'Usuń zadanie',
      isDanger: true,
      onConfirm: async () => {
        try {
          await api.tasks.delete(task.id);
          showToast('Zadanie zostało usunięte', 'info');
          await loadTasks();
          await loadProjects();
        } catch (err: any) {
          showToast(err.message || 'Błąd usuwania zadania', 'error');
        }
      },
    });
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const isOverdue = (dateStr: string | null, completed: boolean) => {
    if (!dateStr || completed) return false;
    return new Date(dateStr).getTime() < Date.now();
  };

  const activeProject = projects.find((p) => p.id === selectedProjectId);
  const isOwnerOfActiveProject = activeProject?.userId === user?.id;

  // Dostępni członkowie dla formularza tworzenia zadania
  const taskFormProject = projects.find((p) => p.id === Number(newTaskProjectId));
  const availableAssignees = taskFormProject?.members || [];

  // Dostępni członkowie dla modala edycji zadania
  const editTaskSelectedProject = projects.find((p) => p.id === Number(editTaskProjectId));
  const editTaskAvailableAssignees = editTaskSelectedProject?.members || [];

  // Obliczenia statystyk i paska postępu
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const activeTasksCount = totalTasksCount - completedTasksCount;
  const completionRate =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const highPriorityCount = tasks.filter((t) => t.priority === 'HIGH').length;
  const mediumPriorityCount = tasks.filter((t) => t.priority === 'MEDIUM').length;
  const lowPriorityCount = tasks.filter((t) => t.priority === 'LOW').length;
  const overdueCount = tasks.filter((t) => isOverdue(t.dueDate, t.completed)).length;

  if (loadingUser) {
    return (
      <div className="app-container" style={{ textAlign: 'center', marginTop: 100 }}>
        Ładowanie...
      </div>
    );
  }

  // Ekran logowania i rejestracji
  if (!user) {
    return (
      <div className="app-container">
        {/* Kontener powiadomień Toast */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast-item ${toast.type}`}>
              <div className="toast-message">
                <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                className="toast-close"
                onClick={() => removeToast(toast.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="auth-wrapper">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('login');
                setAuthError(null);
              }}
            >
              Logowanie
            </button>
            <button
              className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('register');
                setAuthError(null);
              }}
            >
              Rejestracja
            </button>
          </div>

          {authError && <div className="error-message">{authError}</div>}

          <form onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <div className="form-group">
                <label>Imię i nazwisko</label>
                <input
                  type="text"
                  required
                  placeholder="Jan Kowalski"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div className="form-group">
              <label>Adres e-mail</label>
              <input
                type="email"
                required
                placeholder="jan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Hasło</label>
              <input
                type="password"
                required
                placeholder="Minimum 6 znaków"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-block">
              {authMode === 'login' ? 'Zaloguj się' : 'Zarejestruj się'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Kontener powiadomień Toast */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item ${toast.type}`}>
            <div className="toast-message">
              <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(toast.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <header className="app-header">
        <h1>Menedżer Projektów i Zadań</h1>
        <div className="user-info">
          <div>
            <div className="user-name">{user.name}</div>
            <div className="user-email">{user.email}</div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary">
            Wyloguj
          </button>
        </div>
      </header>

      {globalError && <div className="error-message">{globalError}</div>}

      <div className="dashboard-grid">
        {/* Lewy panel - Projekty */}
        <div>
          <div className="panel">
            <h2>Twoje Projekty</h2>

            <div
              className={`project-item ${selectedProjectId === null ? 'active' : ''}`}
              onClick={() => {
                setSelectedProjectId(null);
                setPage(1);
              }}
            >
              <span>Wszystkie dostępne</span>
            </div>

            {projects.map((proj) => {
              const isOwner = proj.userId === user.id;
              return (
                <div
                  key={proj.id}
                  className={`project-item ${selectedProjectId === proj.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedProjectId(proj.id);
                    setPage(1);
                  }}
                >
                  <div className="project-info">
                    <div className="project-title-row">
                      <span className="project-name">{proj.name}</span>
                      <span className={`role-badge ${isOwner ? 'owner' : 'member'}`}>
                        {isOwner ? 'Właściciel' : 'Członek'}
                      </span>
                    </div>
                    <div className="project-subtext">
                      Zadania: {proj._count?.tasks ?? 0} • Członkowie:{' '}
                      {proj._count?.members ?? (proj.members?.length || 1)}
                    </div>
                  </div>

                  <div className="project-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenMembersModal(proj.id);
                      }}
                      className="btn-icon"
                      title="Zarządzaj członkami"
                    >
                      👥
                    </button>
                    {isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditProject(proj);
                        }}
                        className="btn-icon-secondary"
                        title="Edytuj projekt"
                      >
                        ✏️
                      </button>
                    )}
                    {isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(proj);
                        }}
                        className="btn btn-danger"
                        title="Usuń projekt"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <h3>Dodaj nowy projekt</h3>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <input
                  type="text"
                  required
                  placeholder="Nazwa projektu"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <textarea
                  rows={2}
                  placeholder="Opis (opcjonalnie)"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-block">
                Utwórz projekt
              </button>
            </form>
          </div>
        </div>

        {/* Prawy panel - Zadania */}
        <div>
          <div className="panel">
            <div className="panel-header-with-action">
              <h2>
                Zadania
                {activeProject && (
                  <small style={{ fontSize: '0.85rem', color: '#666', marginLeft: 8 }}>
                    (Projekt: {activeProject.name})
                  </small>
                )}
              </h2>

              <div style={{ display: 'flex', gap: 8 }}>
                {activeProject && isOwnerOfActiveProject && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleOpenEditProject(activeProject)}
                    title="Edytuj nazwę lub opis projektu"
                  >
                    ✏️ Edytuj projekt
                  </button>
                )}
                {activeProject && (
                  <button
                    type="button"
                    className="btn btn-secondary members-btn"
                    onClick={() => handleOpenMembersModal(activeProject.id)}
                  >
                    👥 Członkowie ({activeProject._count?.members ?? (activeProject.members?.length || 1)})
                  </button>
                )}
              </div>
            </div>

            {/* Opis aktywnego projektu */}
            {activeProject?.description && (
              <div className="project-desc-banner">
                <strong>Opis projektu:</strong> {activeProject.description}
              </div>
            )}

            {/* Karta Statystyk i Pasek Postępu Projektu */}
            <div className="project-stats-card">
              <div className="stats-summary-row">
                <span>
                  Postęp realizacji: <strong>{completedTasksCount}</strong> z <strong>{totalTasksCount}</strong> zadań
                </span>
                <span>
                  <strong>{completionRate}%</strong> ukończono
                </span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="stats-badges-row">
                <span className="stat-pill">📋 Aktywne: {activeTasksCount}</span>
                <span className="stat-pill">✅ Zrobione: {completedTasksCount}</span>
                <span className="stat-pill high">🔴 Wysoki: {highPriorityCount}</span>
                <span className="stat-pill medium">🟡 Średni: {mediumPriorityCount}</span>
                <span className="stat-pill low">🟢 Niski: {lowPriorityCount}</span>
                {overdueCount > 0 && (
                  <span className="stat-pill high">⚠️ Po terminie: {overdueCount}</span>
                )}
              </div>
            </div>

            {/* Wyszukiwarka i Sortowanie */}
            <div className="controls-row">
              <input
                type="text"
                className="search-input"
                placeholder="🔍 Szukaj w zadaniach..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />

              <div className="sort-group">
                <label>Sortuj:</label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <option value="createdAt">Data dodania</option>
                  <option value="dueDate">Termin</option>
                  <option value="priority">Priorytet</option>
                  <option value="title">Tytuł</option>
                </select>
                <button
                  type="button"
                  className="btn btn-secondary sort-btn"
                  onClick={() => {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    setPage(1);
                  }}
                  title="Zmień kierunek sortowania"
                >
                  {sortOrder === 'asc' ? '↑ Rosnąco' : '↓ Malejąco'}
                </button>
              </div>
            </div>

            {/* Filtry zadań: status + priorytet + przypisanie */}
            <div className="filters-container">
              <div className="tasks-filters">
                <button
                  className={`filter-btn ${taskFilter === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setTaskFilter('all');
                    setPage(1);
                  }}
                >
                  Wszystkie statusy
                </button>
                <button
                  className={`filter-btn ${taskFilter === 'active' ? 'active' : ''}`}
                  onClick={() => {
                    setTaskFilter('active');
                    setPage(1);
                  }}
                >
                  Do zrobienia
                </button>
                <button
                  className={`filter-btn ${taskFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => {
                    setTaskFilter('completed');
                    setPage(1);
                  }}
                >
                  Ukończone
                </button>

                <button
                  className={`filter-btn assignee-filter-btn ${assignedToMeOnly ? 'active' : ''}`}
                  onClick={() => {
                    setAssignedToMeOnly(!assignedToMeOnly);
                    setPage(1);
                  }}
                >
                  📌 Przypisane do mnie
                </button>
              </div>

              <div className="priority-filters">
                <button
                  className={`filter-btn priority-btn ${priorityFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => {
                    setPriorityFilter('ALL');
                    setPage(1);
                  }}
                >
                  Wszystkie priorytety
                </button>
                <button
                  className={`filter-btn priority-btn high ${priorityFilter === 'HIGH' ? 'active' : ''}`}
                  onClick={() => {
                    setPriorityFilter('HIGH');
                    setPage(1);
                  }}
                >
                  Wysoki
                </button>
                <button
                  className={`filter-btn priority-btn medium ${priorityFilter === 'MEDIUM' ? 'active' : ''}`}
                  onClick={() => {
                    setPriorityFilter('MEDIUM');
                    setPage(1);
                  }}
                >
                  Średni
                </button>
                <button
                  className={`filter-btn priority-btn low ${priorityFilter === 'LOW' ? 'active' : ''}`}
                  onClick={() => {
                    setPriorityFilter('LOW');
                    setPage(1);
                  }}
                >
                  Niski
                </button>
              </div>
            </div>

            {/* Formularz dodawania zadania */}
            <h3>Dodaj nowe zadanie</h3>
            {projects.length === 0 ? (
              <p className="empty-state">Utwórz najpierw projekt, aby dodać zadanie.</p>
            ) : (
              <form onSubmit={handleCreateTask} className="task-form">
                <div className="form-group">
                  <input
                    type="text"
                    required
                    placeholder="Tytuł zadania"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Opis zadania (opcjonalnie)"
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                  />
                </div>

                <div className="form-row-4">
                  <div className="form-group">
                    <label>Projekt</label>
                    <select
                      value={newTaskProjectId}
                      onChange={(e) => {
                        const pid = Number(e.target.value);
                        setNewTaskProjectId(pid);
                        setNewTaskAssignedToId('');
                      }}
                      required
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.userId !== user.id ? '(zespół)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Priorytet</label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                    >
                      <option value="LOW">Niski (LOW)</option>
                      <option value="MEDIUM">Średni (MEDIUM)</option>
                      <option value="HIGH">Wysoki (HIGH)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Termin (dueDate)</label>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Przypisz do</label>
                    <select
                      value={newTaskAssignedToId}
                      onChange={(e) =>
                        setNewTaskAssignedToId(
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                    >
                      <option value="">Nieprzypisane</option>
                      {availableAssignees.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.user.name} {m.userId === user.id ? '(Ty)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn">
                  Dodaj zadanie
                </button>
              </form>
            )}

            {/* Lista zadań */}
            {tasks.length === 0 ? (
              <div className="empty-state">
                {searchQuery || priorityFilter !== 'ALL' || taskFilter !== 'all' || assignedToMeOnly
                  ? 'Brak zadań spełniających wybrane kryteria wyszukiwania.'
                  : 'Brak zadań do wyświetlenia.'}
              </div>
            ) : (
              <div className="tasks-list">
                {tasks.map((task) => {
                  const overdue = isOverdue(task.dueDate, task.completed);
                  const taskProject = projects.find((p) => p.id === task.projectId);
                  const projectMembersList = taskProject?.members || [];

                  return (
                    <div key={task.id} className="task-item">
                      <input
                        type="checkbox"
                        className="task-checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTask(task)}
                      />
                      <div className="task-content">
                        <div className="task-header-line">
                          <span className={`task-title ${task.completed ? 'completed' : ''}`}>
                            {task.title}
                          </span>
                          <span className={`priority-tag ${task.priority.toLowerCase()}`}>
                            {task.priority === 'HIGH' ? 'Wysoki' : task.priority === 'MEDIUM' ? 'Średni' : 'Niski'}
                          </span>
                        </div>

                        {task.description && (
                          <div className="task-description">{task.description}</div>
                        )}

                        <div className="task-footer-tags">
                          {task.project && (
                            <span className="task-project-tag">📁 {task.project.name}</span>
                          )}
                          {task.user && (
                            <span className="task-author-tag">Autor: {task.user.name}</span>
                          )}

                          {/* Selektor osoby przypisanej */}
                          <span className="task-assignee-badge">
                            👤 Przypisany:
                            <select
                              className="assignee-select"
                              value={task.assignedToId || ''}
                              onChange={(e) => {
                                const newId = e.target.value === '' ? null : Number(e.target.value);
                                handleAssigneeChange(task, newId);
                              }}
                            >
                              <option value="">(Brak)</option>
                              {projectMembersList.map((m) => (
                                <option key={m.userId} value={m.userId}>
                                  {m.user.name} {m.userId === user.id ? '(Ty)' : ''}
                                </option>
                              ))}
                            </select>
                          </span>

                          {task.dueDate && (
                            <span className={`due-date-tag ${overdue ? 'overdue' : ''}`}>
                              📅 {formatDueDate(task.dueDate)} {overdue ? '(po terminie!)' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="task-item-actions">
                        <button
                          onClick={() => handleOpenEditTask(task)}
                          className="btn-icon-secondary"
                          title="Edytuj zadanie"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task)}
                          className="btn btn-danger"
                          title="Usuń zadanie"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Paginacja zadań */}
            {totalTasks > 0 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  <span>
                    Wyświetlono {Math.min((page - 1) * limit + 1, totalTasks)}–
                    {Math.min(page * limit, totalTasks)} z {totalTasks} zadań
                  </span>

                  <div className="pagination-limit-select">
                    <label>Na stronę:</label>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                <div className="pagination-nav">
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={page <= 1}
                    onClick={() => setPage(1)}
                    title="Pierwsza strona"
                  >
                    «
                  </button>
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    title="Poprzednia strona"
                  >
                    ‹ Poprzednia
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .map((p, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const hasGap = prevPage && p - prevPage > 1;
                      return (
                        <React.Fragment key={p}>
                          {hasGap && <span style={{ padding: '0 4px', color: '#999' }}>…</span>}
                          <button
                            type="button"
                            className={`pagination-btn ${p === page ? 'active' : ''}`}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    title="Następna strona"
                  >
                    Następna ›
                  </button>
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                    title="Ostatnia strona"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal edycji projektu */}
      {editingProject && (
        <div className="modal-backdrop" onClick={() => setEditingProject(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edycja projektu: {editingProject.name}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setEditingProject(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditProject}>
              <div className="form-group">
                <label>Nazwa projektu</label>
                <input
                  type="text"
                  required
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Opis projektu</label>
                <textarea
                  rows={3}
                  placeholder="Wpisz opis projektu..."
                  value={editProjectDesc}
                  onChange={(e) => setEditProjectDesc(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingProject(null)}
                >
                  Anuluj
                </button>
                <button type="submit" className="btn">
                  Zapisz zmiany
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal edycji zadania */}
      {editingTask && (
        <div className="modal-backdrop" onClick={() => setEditingTask(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edycja zadania</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setEditingTask(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditTask}>
              <div className="form-group">
                <label>Tytuł zadania</label>
                <input
                  type="text"
                  required
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Opis zadania</label>
                <textarea
                  rows={3}
                  placeholder="Opis zadania (opcjonalnie)"
                  value={editTaskDesc}
                  onChange={(e) => setEditTaskDesc(e.target.value)}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Projekt</label>
                  <select
                    value={editTaskProjectId}
                    onChange={(e) => {
                      const newPid = Number(e.target.value);
                      setEditTaskProjectId(newPid);
                      setEditTaskAssignedToId('');
                    }}
                    required
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Priorytet</label>
                  <select
                    value={editTaskPriority}
                    onChange={(e) => setEditTaskPriority(e.target.value as Priority)}
                  >
                    <option value="LOW">Niski (LOW)</option>
                    <option value="MEDIUM">Średni (MEDIUM)</option>
                    <option value="HIGH">Wysoki (HIGH)</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ margin: 0 }}>Termin (dueDate)</label>
                    {editTaskDueDate && (
                      <button
                        type="button"
                        onClick={() => setEditTaskDueDate('')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#c5221f',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                        }}
                      >
                        Wyczyść
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    style={{ marginTop: 4 }}
                    value={editTaskDueDate}
                    onChange={(e) => setEditTaskDueDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Przypisz do</label>
                  <select
                    value={editTaskAssignedToId}
                    onChange={(e) =>
                      setEditTaskAssignedToId(
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                  >
                    <option value="">Nieprzypisane</option>
                    {editTaskAvailableAssignees.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name} {m.userId === user.id ? '(Ty)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input
                  type="checkbox"
                  id="editCompletedCheck"
                  checked={editTaskCompleted}
                  onChange={(e) => setEditTaskCompleted(e.target.checked)}
                  style={{ width: 'auto', margin: 0 }}
                />
                <label htmlFor="editCompletedCheck" style={{ margin: 0, cursor: 'pointer' }}>
                  Oznacz jako ukończone
                </label>
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingTask(null)}
                >
                  Anuluj
                </button>
                <button type="submit" className="btn">
                  Zapisz zmiany
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal zarządzania członkami projektu */}
      {isMembersModalOpen && activeProject && (
        <div className="modal-backdrop" onClick={() => setIsMembersModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Członkowie projektu: {activeProject.name}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsMembersModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {membersModalError && (
              <div className="error-message">{membersModalError}</div>
            )}

            {isOwnerOfActiveProject && (
              <form onSubmit={handleAddMember} className="add-member-form">
                <input
                  type="email"
                  required
                  placeholder="Wpisz e-mail użytkownika..."
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                />
                <button type="submit" className="btn">
                  Dodaj do projektu
                </button>
              </form>
            )}

            <div className="members-list">
              <h4>Lista członków ({projectMembers.length}):</h4>
              {projectMembers.map((member) => {
                const isProjectOwner = activeProject.userId === member.userId;
                const canRemove =
                  (isOwnerOfActiveProject && !isProjectOwner) || member.userId === user.id;

                return (
                  <div key={member.id} className="member-item">
                    <div className="member-info">
                      <div className="member-name">{member.user.name}</div>
                      <div className="member-email">{member.user.email}</div>
                    </div>

                    <div className="member-actions">
                      <span className={`role-badge ${member.role.toLowerCase()}`}>
                        {member.role === 'OWNER' ? 'Właściciel' : 'Członek'}
                      </span>

                      {canRemove && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRemoveMember(activeProject.id, member.userId, member.user.name)}
                          title={member.userId === user.id ? 'Opuść projekt' : 'Usuń członka'}
                        >
                          {member.userId === user.id ? 'Opuść' : 'Usuń'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal potwierdzenia akcji (zamiast window.confirm) */}
      {confirmDialog && (
        <div className="modal-backdrop" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmDialog.title}</h3>
            <div className="confirm-modal-message">{confirmDialog.message}</div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDialog(null)}
              >
                {confirmDialog.cancelLabel || 'Anuluj'}
              </button>
              <button
                type="button"
                className={`btn ${confirmDialog.isDanger ? 'btn-danger' : ''}`}
                onClick={async () => {
                  const onConfirm = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  await onConfirm();
                }}
              >
                {confirmDialog.confirmLabel || 'Potwierdź'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
