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

export interface Employee {
  id: string;
  employeeId: string;
  employeeName: string;
  fatherHusbandName?: string;
  cnicNumber?: string;
  cnicExpiryDate?: string;
  lifetimeCnic?: boolean;
  joiningDate?: string;
  dateOfBirth?: string;
  nationality?: string;
  gender?: string;
  contactNumber?: string;
  emergencyContactNumber?: string;
  emergencyContactPersonName?: string;
  personalEmail?: string;
  officialEmail?: string;
  currentAddress?: string;
  permanentAddress?: string;
  bankName?: string;
  accountNumber?: string;
  accountTitle?: string;
  accountType?: string;
  employeeSalary?: number;
  department?: { id: string; name: string } | string;
  subDepartment?: { id: string; name: string } | string;
  designation?: { id: string; name: string } | string;
  employeeGrade?: { id: string; grade: string } | string;
  maritalStatus?: { id: string; name: string } | string;
  employmentStatus?: { id: string; status: string } | string;
  country?: { id: string; name: string } | string;
  state?: { id: string; name: string } | string;
  city?: { id: string; name: string } | string;
  workingHoursPolicy?: { id: string; name: string } | string;
  leavesPolicy?: { id: string; name: string } | string;
  
  // Relation objects for display
  departmentRelation?: { id: string; name: string };
  subDepartmentRelation?: { id: string; name: string };
  designationRelation?: { id: string; name: string };
  employeeGradeRelation?: { id: string; grade: string };
  maritalStatusRelation?: { id: string; name: string };
  employmentStatusRelation?: { id: string; status: string };
  countryRelation?: { id: string; name: string };
  stateRelation?: { id: string; name: string };
  cityRelation?: { id: string; name: string };
  workingHoursPolicyRelation?: { id: string; name: string };
  leavesPolicyRelation?: { id: string; name: string };
  avatarUrl?: string | null;
  qualifications?: {
    id: string;
    degree: string;
    institution: string;
    passingYear: string;
    gradeOrDivision?: string;
  }[];
  createdAt: string;
  updatedAt: string;
  status: string;
}

export const employeeApi = {
  getProfile: (id: string, includeHistory: boolean = false) => 
    fetchApi<{ status: boolean; data: Employee }>(`/employees/${id}?includeHistory=${includeHistory}`),
};

export const dashboardApi = {
  getStats: () => fetchApi<DashboardStats>('/dashboard/stats'),
  getEmployeeStats: () => fetchApi<EmployeeDashboardStats>('/dashboard/employee-stats'),
};

export interface EmployeeDashboardStats {
  overview: {
    presentMonth: number;
    absentMonth: number;
    lateMonth: number;
    pendingLeaves: number;
    pendingAttendanceQueries: number;
  };
  upcomingHoliday?: {
    name: string;
    dateFrom: string;
    dateTo: string;
  };
  recentActivities: {
    date: string;
    checkIn?: string;
    checkOut?: string;
    status: string;
  }[];
}

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

