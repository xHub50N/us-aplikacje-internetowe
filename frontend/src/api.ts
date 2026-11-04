const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

export function setTokens(tokens: {
  token?: string | null;
  refreshToken?: string | null;
}) {
  if (tokens.token) {
    localStorage.setItem('token', tokens.token);
  } else if (tokens.token === null) {
    localStorage.removeItem('token');
  }

  if (tokens.refreshToken) {
    localStorage.setItem('refreshToken', tokens.refreshToken);
  } else if (tokens.refreshToken === null) {
    localStorage.removeItem('refreshToken');
  }
}

// Dla kompatybilności wstecznej
export function setToken(token: string | null) {
  setTokens({ token });
}

let isRefreshing = false;

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Jeśli token wygasł (401), spróbuj cichego odświeżenia przez refreshToken
  if (response.status === 401 && !endpoint.startsWith('/auth/') && !isRefreshing) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setTokens({
            token: refreshData.token,
            refreshToken: refreshData.refreshToken,
          });

          // Ponów pierwotne zapytanie z nowym tokenem
          headers['Authorization'] = `Bearer ${refreshData.token}`;
          response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
          });
        } else {
          setTokens({ token: null, refreshToken: null });
        }
      } catch {
        setTokens({ token: null, refreshToken: null });
      } finally {
        isRefreshing = false;
      }
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Wystąpił błąd żądania');
  }

  return data as T;
}

export interface User {
  id: number;
  email: string;
  name: string;
}

export type ProjectRole = 'OWNER' | 'MEMBER';

export interface ProjectMember {
  id: number;
  role: ProjectRole;
  createdAt: string;
  projectId: number;
  userId: number;
  user: {
    id: number;
    email: string;
    name: string;
  };
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  userId: number;
  user?: {
    id: number;
    email: string;
    name: string;
  };
  members?: ProjectMember[];
  _count?: {
    tasks: number;
    members?: number;
  };
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  createdAt: string;
  projectId: number;
  userId: number;
  assignedToId?: number | null;
  user?: {
    id: number;
    email: string;
    name: string;
  };
  assignedTo?: {
    id: number;
    email: string;
    name: string;
  } | null;
  project?: {
    id: number;
    name: string;
  };
}

export interface TaskQueryParams {
  projectId?: number;
  completed?: boolean;
  priority?: Priority;
  assignedToId?: number;
  assignedToMe?: boolean;
  search?: string;
  sortBy?: 'createdAt' | 'dueDate' | 'title' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export const api = {
  auth: {
    register: (body: { name: string; email: string; password: string }) =>
      request<{ user: User; token: string; refreshToken: string }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      ),
    login: (body: { email: string; password: string }) =>
      request<{ user: User; token: string; refreshToken: string }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      ),
    me: () => request<{ user: User }>('/auth/me'),
    logout: () => {
      const refreshToken = getRefreshToken();
      return request<{ message: string }>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    },
  },
  projects: {
    getAll: () => request<Project[]>('/projects'),
    getById: (id: number) => request<Project>(`/projects/${id}`),
    create: (body: { name: string; description?: string }) =>
      request<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      request<{ message: string }>(`/projects/${id}`, {
        method: 'DELETE',
      }),
    getMembers: (id: number) =>
      request<ProjectMember[]>(`/projects/${id}/members`),
    addMember: (id: number, body: { email: string; role?: ProjectRole }) =>
      request<ProjectMember>(`/projects/${id}/members`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    removeMember: (projectId: number, userId: number) =>
      request<{ message: string }>(`/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
      }),
  },
  tasks: {
    getAll: (params?: TaskQueryParams) => {
      const query = new URLSearchParams();
      if (params?.projectId) {
        query.append('projectId', params.projectId.toString());
      }
      if (params?.completed !== undefined) {
        query.append('completed', params.completed.toString());
      }
      if (params?.priority) {
        query.append('priority', params.priority);
      }
      if (params?.assignedToId) {
        query.append('assignedToId', params.assignedToId.toString());
      }
      if (params?.assignedToMe !== undefined) {
        query.append('assignedToMe', params.assignedToMe.toString());
      }
      if (params?.search) {
        query.append('search', params.search);
      }
      if (params?.sortBy) {
        query.append('sortBy', params.sortBy);
      }
      if (params?.sortOrder) {
        query.append('sortOrder', params.sortOrder);
      }
      const qs = query.toString();
      return request<Task[]>(`/tasks${qs ? `?${qs}` : ''}`);
    },
    create: (body: {
      title: string;
      description?: string;
      priority?: Priority;
      dueDate?: string | null;
      projectId: number;
      assignedToId?: number | null;
    }) =>
      request<Task>('/tasks', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (
      id: number,
      body: {
        title?: string;
        description?: string | null;
        completed?: boolean;
        priority?: Priority;
        dueDate?: string | null;
        projectId?: number;
        assignedToId?: number | null;
      }
    ) =>
      request<Task>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      request<{ message: string }>(`/tasks/${id}`, {
        method: 'DELETE',
      }),
  },
};
