const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include', // ✅ Send cookies with every request
    cache: 'no-store',
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

// Department API
export const departmentApi = {
  getAll: () => fetchApi<{ status: boolean; data: Department[] }>('/departments'),
  getById: (id: number) => fetchApi<{ status: boolean; data: Department }>(`/departments/${id}`),
  create: (name: string) => fetchApi<{ status: boolean; data: Department; message: string }>('/departments', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  update: (id: number, name: string) => fetchApi<{ status: boolean; data: Department; message: string }>(`/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  }),
  delete: (id: number) => fetchApi<{ status: boolean; message: string }>(`/departments/${id}`, {
    method: 'DELETE',
  }),
};

// Sub-Department API
export const subDepartmentApi = {
  getAll: () => fetchApi<{ status: boolean; data: SubDepartment[] }>('/sub-departments'),
  getByDepartment: (departmentId: number) => fetchApi<{ status: boolean; data: SubDepartment[] }>(`/sub-departments/department/${departmentId}`),
  create: (name: string, departmentId: number) => fetchApi<{ status: boolean; data: SubDepartment; message: string }>('/sub-departments', {
    method: 'POST',
    body: JSON.stringify({ name, departmentId }),
  }),
  update: (id: number, name: string, departmentId?: number) => fetchApi<{ status: boolean; data: SubDepartment; message: string }>(`/sub-departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, departmentId }),
  }),
  delete: (id: number) => fetchApi<{ status: boolean; message: string }>(`/sub-departments/${id}`, {
    method: 'DELETE',
  }),
};

export interface DashboardStats {
  overview: {
    totalEmployees: number;
    inactiveEmployees: number;
    presentToday: number;
    absentToday: number;
    pendingLeaves: number;
    pendingAttendanceQueries: number;
  };
  departmentStats: {
    name: string;
    count: number;
  }[];
}

export const dashboardApi = {
  getStats: () => fetchApi<DashboardStats>('/dashboard/stats'),
};

// Types
export interface Department {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  subDepartments?: SubDepartment[];
}

export interface SubDepartment {
  id: number;
  name: string;
  departmentId: number;
  department?: Department;
  createdAt: string;
  updatedAt: string;
}

