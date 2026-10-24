const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

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

export interface Project {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  userId: number;
  _count?: {
    tasks: number;
  };
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
  projectId: number;
  userId: number;
  project?: {
    id: number;
    name: string;
  };
}

export const api = {
  auth: {
    register: (body: { name: string; email: string; password: string }) =>
      request<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    login: (body: { email: string; password: string }) =>
      request<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    me: () => request<{ user: User }>('/auth/me'),
  },
  projects: {
    getAll: () => request<Project[]>('/projects'),
    create: (body: { name: string; description?: string }) =>
      request<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      request<{ message: string }>(`/projects/${id}`, {
        method: 'DELETE',
      }),
  },
  tasks: {
    getAll: (params?: { projectId?: number; completed?: boolean }) => {
      const query = new URLSearchParams();
      if (params?.projectId) {
        query.append('projectId', params.projectId.toString());
      }
      if (params?.completed !== undefined) {
        query.append('completed', params.completed.toString());
      }
      const qs = query.toString();
      return request<Task[]>(`/tasks${qs ? `?${qs}` : ''}`);
    },
    create: (body: {
      title: string;
      description?: string;
      projectId: number;
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
        projectId?: number;
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
