import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { api, setToken, User, Project, Task } from './api';

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

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState<number | ''>('');

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
      const params: { projectId?: number; completed?: boolean } = {};
      if (selectedProjectId !== null) {
        params.projectId = selectedProjectId;
      }
      if (taskFilter === 'active') {
        params.completed = false;
      } else if (taskFilter === 'completed') {
        params.completed = true;
      }
      const data = await api.tasks.getAll(params);
      setTasks(data);
    } catch (err: any) {
      setGlobalError(err.message || 'Błąd ładowania zadań');
    }
  }, [selectedProjectId, taskFilter]);

  // Initial user check
  useEffect(() => {
    async function checkAuth() {
      try {
        const { user } = await api.auth.me();
        setUser(user);
      } catch {
        setToken(null);
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
      loadTasks();
    }
  }, [user, loadProjects, loadTasks]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (authMode === 'login') {
        const res = await api.auth.login({ email, password });
        setToken(res.token);
        setUser(res.user);
      } else {
        const res = await api.auth.register({ name, email, password });
        setToken(res.token);
        setUser(res.user);
      }
      setEmail('');
      setPassword('');
      setName('');
    } catch (err: any) {
      setAuthError(err.message || 'Błąd autoryzacji');
    }
  };

  const handleLogout = () => {
    setToken(null);
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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || newTaskProjectId === '') return;
    try {
      setGlobalError(null);
      await api.tasks.create({
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || undefined,
        projectId: Number(newTaskProjectId),
      });
      setNewTaskTitle('');
      setNewTaskDesc('');
      await loadTasks();
      await loadProjects(); // Odśwież licznik zadań w projektach
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

  if (loadingUser) {
    return <div className="app-container" style={{ textAlign: 'center', marginTop: 100 }}>Ładowanie...</div>;
  }

  // Widok logowania / rejestracji
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

  // Główny widok dashboardu po zalogowaniu
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
              <span>Wszystkie projekty</span>
            </div>

            {projects.map((proj) => (
              <div
                key={proj.id}
                className={`project-item ${selectedProjectId === proj.id ? 'active' : ''}`}
                onClick={() => setSelectedProjectId(proj.id)}
              >
                <div className="project-info">
                  <span>{proj.name}</span>
                  <span className="project-badge">
                    {proj._count?.tasks ?? 0}
                  </span>
                </div>
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
              </div>
            ))}

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
            <h2>
              Zadania
              {selectedProjectId !== null && (
                <small style={{ fontSize: '0.85rem', color: '#666', marginLeft: 8 }}>
                  (Projekt: {projects.find((p) => p.id === selectedProjectId)?.name})
                </small>
              )}
            </h2>

            {/* Formularz dodawania zadania */}
            <h3>Dodaj nowe zadanie</h3>
            {projects.length === 0 ? (
              <p className="empty-state">Utwórz najpierw projekt, aby dodać zadanie.</p>
            ) : (
              <form onSubmit={handleCreateTask} style={{ marginBottom: 24 }}>
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
                <div className="form-group">
                  <label>Wybierz projekt</label>
                  <select
                    value={newTaskProjectId}
                    onChange={(e) => setNewTaskProjectId(Number(e.target.value))}
                    required
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn">
                  Dodaj zadanie
                </button>
              </form>
            )}

            {/* Filtry zadań */}
            <div className="tasks-filters">
              <button
                className={`filter-btn ${taskFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTaskFilter('all')}
              >
                Wszystkie
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
            </div>

            {/* Lista zadań */}
            {tasks.length === 0 ? (
              <div className="empty-state">Brak zadań do wyświetlenia.</div>
            ) : (
              <div>
                {tasks.map((task) => (
                  <div key={task.id} className="task-item">
                    <input
                      type="checkbox"
                      className="task-checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task)}
                    />
                    <div className="task-content">
                      <div className={`task-title ${task.completed ? 'completed' : ''}`}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="task-description">{task.description}</div>
                      )}
                      {task.project && (
                        <span className="task-project-tag">{task.project.name}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="btn btn-danger"
                      title="Usuń zadanie"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
