import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { api, setTokens, User, Project, Task, Priority, ProjectMember } from './api';

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

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('MEDIUM');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState<number | ''>('');
  const [newTaskAssignedToId, setNewTaskAssignedToId] = useState<number | ''>('');

  const [globalError, setGlobalError] = useState<string | null>(null);

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

      const data = await api.tasks.getAll(params);
      setTasks(data);
    } catch (err: any) {
      setGlobalError(err.message || 'Błąd ładowania zadań');
    }
  }, [selectedProjectId, taskFilter, priorityFilter, assignedToMeOnly, searchQuery, sortBy, sortOrder]);

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
      } else {
        const res = await api.auth.register({ name, email, password });
        setTokens({ token: res.token, refreshToken: res.refreshToken });
        setUser(res.user);
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
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      setGlobalError(null);
      await api.projects.create({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
      });
      setNewProjectName('');
      setNewProjectDesc('');
      await loadProjects();
    } catch (err: any) {
      setGlobalError(err.message || 'Błąd tworzenia projektu');
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten projekt wraz z wszystkimi jego zadaniami?')) {
      return;
    }
    try {
      setGlobalError(null);
      await api.projects.delete(id);
      if (selectedProjectId === id) {
        setSelectedProjectId(null);
      }
      await loadProjects();
      await loadTasks();
    } catch (err: any) {
      setGlobalError(err.message || 'Błąd usuwania projektu');
    }
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
      await loadProjectMembers(selectedProjectId);
      await loadProjects();
    } catch (err: any) {
      setMembersModalError(err.message || 'Nie udało się dodać członka');
    }
  };

  const handleRemoveMember = async (projectId: number, memberUserId: number) => {
    try {
      setMembersModalError(null);
      await api.projects.removeMember(projectId, memberUserId);
      await loadProjectMembers(projectId);
      await loadProjects();
      await loadTasks();
    } catch (err: any) {
      setMembersModalError(err.message || 'Nie udało się usunąć członka');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || newTaskProjectId === '') return;
    try {
      setGlobalError(null);

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
      await loadTasks();
      await loadProjects();
    } catch (err: any) {
      setGlobalError(err.message || 'Błąd dodawania zadania');
    }
  };

  const handleToggleTask = async (task: Task) => {
    try {
      setGlobalError(null);
      await api.tasks.update(task.id, { completed: !task.completed });
      await loadTasks();
    } catch (err: any) {
      setGlobalError(err.message || 'Błąd aktualizacji zadania');
    }
  };

  const handleAssigneeChange = async (task: Task, newAssigneeId: number | null) => {
    try {
      setGlobalError(null);
      await api.tasks.update(task.id, { assignedToId: newAssigneeId });
      await loadTasks();
    } catch (err: any) {
      setGlobalError(err.message || 'Błąd zmiany przypisania zadania');
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      setGlobalError(null);
      await api.tasks.delete(id);
      await loadTasks();
      await loadProjects();
    } catch (err: any) {
      setGlobalError(err.message || 'Błąd usuwania zadania');
    }
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

  // Pobierz członków dla formularza nowego zadania
  const taskFormProject = projects.find((p) => p.id === Number(newTaskProjectId));
  const availableAssignees = taskFormProject?.members || [];

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
              onClick={() => setSelectedProjectId(null)}
            >
              <span>Wszystkie dostępne</span>
            </div>

            {projects.map((proj) => {
              const isOwner = proj.userId === user.id;
              return (
                <div
                  key={proj.id}
                  className={`project-item ${selectedProjectId === proj.id ? 'active' : ''}`}
                  onClick={() => setSelectedProjectId(proj.id)}
                >
                  <div className="project-info">
                    <div className="project-title-row">
                      <span className="project-name">{proj.name}</span>
                      <span className={`role-badge ${isOwner ? 'owner' : 'member'}`}>
                        {isOwner ? 'Właściciel' : 'Członek'}
                      </span>
                    </div>
                    <div className="project-subtext">
                      Zadania: {proj._count?.tasks ?? 0} • Członkowie: {proj._count?.members ?? (proj.members?.length || 1)}
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
                          handleDeleteProject(proj.id);
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

            {/* Wyszukiwarka i Sortowanie */}
            <div className="controls-row">
              <input
                type="text"
                className="search-input"
                placeholder="🔍 Szukaj w zadaniach..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="sort-group">
                <label>Sortuj:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="createdAt">Data dodania</option>
                  <option value="dueDate">Termin</option>
                  <option value="priority">Priorytet</option>
                  <option value="title">Tytuł</option>
                </select>
                <button
                  type="button"
                  className="btn btn-secondary sort-btn"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
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
                  onClick={() => setTaskFilter('all')}
                >
                  Wszystkie statusy
                </button>
                <button
                  className={`filter-btn ${taskFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setTaskFilter('active')}
                >
                  Do zrobienia
                </button>
                <button
                  className={`filter-btn ${taskFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setTaskFilter('completed')}
                >
                  Ukończone
                </button>

                <button
                  className={`filter-btn assignee-filter-btn ${assignedToMeOnly ? 'active' : ''}`}
                  onClick={() => setAssignedToMeOnly(!assignedToMeOnly)}
                >
                  📌 Przypisane do mnie
                </button>
              </div>

              <div className="priority-filters">
                <button
                  className={`filter-btn priority-btn ${priorityFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setPriorityFilter('ALL')}
                >
                  Wszystkie priorytety
                </button>
                <button
                  className={`filter-btn priority-btn high ${priorityFilter === 'HIGH' ? 'active' : ''}`}
                  onClick={() => setPriorityFilter('HIGH')}
                >
                  Wysoki
                </button>
                <button
                  className={`filter-btn priority-btn medium ${priorityFilter === 'MEDIUM' ? 'active' : ''}`}
                  onClick={() => setPriorityFilter('MEDIUM')}
                >
                  Średni
                </button>
                <button
                  className={`filter-btn priority-btn low ${priorityFilter === 'LOW' ? 'active' : ''}`}
                  onClick={() => setPriorityFilter('LOW')}
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
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="btn btn-danger"
                        title="Usuń zadanie"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

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
                          onClick={() => handleRemoveMember(activeProject.id, member.userId)}
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
    </div>
  );
}

export default App;
