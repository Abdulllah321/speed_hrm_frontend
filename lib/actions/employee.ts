'use server';

import { getAccessToken } from '../auth';
import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function getAuthHeaders() {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export interface Employee {
  id: string;
  employeeId: string;
  employeeName: string;
  fatherHusbandName: string;
  department: string;
  subDepartment?: string | null;
  employeeGrade: string;
  attendanceId: string;
  designation: string;
  maritalStatus: string;
  employmentStatus: string;
  probationExpiryDate?: string | null;
  cnicNumber: string;
  cnicExpiryDate?: string | null;
  lifetimeCnic: boolean;
  joiningDate: string;
  dateOfBirth: string;
  nationality: string;
  gender: string;
  contactNumber: string;
  emergencyContactNumber?: string | null;
  emergencyContactPerson?: string | null;
  personalEmail?: string | null;
  officialEmail: string;
  country: string;
  province: string;
  city: string;
  employeeSalary: number;
  eobi: boolean;
  eobiNumber?: string | null;
  providentFund: boolean;
  overtimeApplicable: boolean;
  daysOff?: string | null;
  reportingManager: string;
  workingHoursPolicy: string;
  branch: string;
  leavesPolicy: string;
  allowRemoteAttendance: boolean;
  currentAddress?: string | null;
  permanentAddress?: string | null;
  bankName: string;
  accountNumber: string;
  accountTitle: string;
  status: string;
  equipmentAssignments?: Array<{
    id: string;
    equipmentId: string;
    equipment?: {
      id: string;
      name: string;
    };
    assignedDate: string;
    returnedDate?: string | null;
    status: string;
  }>;
  createdAt: string;
  updatedAt: string;
  // Optional mapped name fields from backend
  departmentName?: string;
  subDepartmentName?: string | null;
  designationName?: string;
  employeeGradeName?: string;
  branchName?: string;
  provinceName?: string;
  cityName?: string;
  maritalStatusName?: string;
  workingHoursPolicyName?: string;
  leavesPolicyName?: string;
  employmentStatusName?: string;
  qualifications?: Array<{
    id: string;
    qualification: string;
    instituteId?: string | null;
    countryId?: string | null;
    stateId?: string | null;
    cityId?: string | null;
    year?: number | null;
    grade?: string | null;
    documentUrl?: string | null;
  }>;
}

// Get all employees
export async function getEmployees(): Promise<{ status: boolean; data?: Employee[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employees`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch employees' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching employees:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch employees. Please check your connection.' 
    };
  }
}

// Lightweight employee data for dropdowns/selects
export interface EmployeeDropdownOption {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentId: string | null;
  subDepartmentId: string | null;
  departmentName: string | null;
}

// Get employees for dropdown (minimal fields)
export async function getEmployeesForDropdown(): Promise<{ status: boolean; data?: EmployeeDropdownOption[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employees/dropdown`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch employees' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching employees for dropdown:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch employees.' 
    };
  }
}

// Get employee by id
export async function getEmployeeById(id: string): Promise<{ status: boolean; data?: Employee; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employees/${id}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch employee' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching employee:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch employee' 
    };
  }
}

// Create employee
export async function createEmployee(data: {
  employeeId: string;
  employeeName: string;
  fatherHusbandName: string;
  department: string;
  subDepartment?: string;
  employeeGrade: string;
  attendanceId: string;
  designation: string;
  maritalStatus: string;
  employmentStatus: string;
  probationExpiryDate?: string;
  cnicNumber: string;
  cnicExpiryDate?: string;
  lifetimeCnic: boolean;
  joiningDate: string;
  dateOfBirth: string;
  nationality: string;
  gender: string;
  contactNumber: string;
  emergencyContactNumber?: string;
  emergencyContactPersonName?: string;
  personalEmail?: string;
  officialEmail: string;
  country: string;
  state: string;
  city: string;
  employeeSalary: string;
  eobi: boolean;
  eobiNumber?: string;
  providentFund: boolean;
  overtimeApplicable: boolean;
  daysOff?: string;
  reportingManager: string;
  workingHoursPolicy: string;
  branch: string;
  leavesPolicy: string;
  allowRemoteAttendance: boolean;
  currentAddress?: string;
  permanentAddress?: string;
  bankName: string;
  accountNumber: string;
  accountTitle: string;
  selectedEquipments?: string[];
  accountType?: string;
  password?: string;
  roles?: string;
  avatarUrl?: string;
  eobiDocumentUrl?: string;
  documentUrls?: Record<string, string>;
  qualifications?: Array<{
    qualification: string;
    instituteId?: string;
    countryId?: string;
    stateId?: string;
    cityId?: string;
    year?: string;
    grade?: string;
    documentUrl?: string;
  }>;
}): Promise<{ status: boolean; data?: Employee; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create employee' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    if (result.status) {
      revalidatePath('/dashboard/employee/list');
    }
    return result;
  } catch (error) {
    console.error('Error creating employee:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create employee' };
  }
}

// Update employee
export async function updateEmployee(
  id: string, 
  data: Partial<Employee> & {
    qualifications?: Array<{
      qualification: string;
      instituteId?: string;
      countryId?: string;
      stateId?: string;
      cityId?: string;
      year?: string;
      grade?: string;
      documentUrl?: string;
    }>;
  }
): Promise<{ status: boolean; data?: Employee; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employees/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update employee' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    if (result.status) {
      revalidatePath('/dashboard/employee/list');
    }
    return result;
  } catch (error) {
    console.error('Error updating employee:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update employee' };
  }
}

// Delete employee
export async function deleteEmployee(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employees/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete employee' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    if (result.status) {
      revalidatePath('/dashboard/employee/list');
    }
    return result;
  } catch (error) {
    console.error('Error deleting employee:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete employee' };
  }
}

// Lightweight interface for attendance management
export interface EmployeeForAttendance {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentId: string;
  subDepartmentId?: string | null;
  workingHoursPolicyId: string;
  department?: {
    id: string;
    name: string;
  };
  subDepartment?: {
    id: string;
    name: string;
  } | null;
  workingHoursPolicy?: {
    id: string;
    name: string;
    startWorkingHours: string;
    endWorkingHours: string;
  } | null;
}

// Get employees for attendance management (lightweight, only required fields)
export async function getEmployeesForAttendance(filters?: { departmentId?: string; subDepartmentId?: string }): Promise<{ status: boolean; data?: EmployeeForAttendance[]; message?: string }> {
  try {
    const params = new URLSearchParams();
    if (filters?.departmentId) {
      params.append('departmentId', filters.departmentId);
    }
    if (filters?.subDepartmentId) {
      params.append('subDepartmentId', filters.subDepartmentId);
    }

    const url = `${API_URL}/employees/for-attendance${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch employees' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching employees for attendance:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch employees. Please check your connection.' 
    };
  }
}

// Search for inactive employee by CNIC for rejoining
export async function searchEmployeeForRejoin(cnic: string): Promise<{
  status: boolean;
  canRejoin?: boolean;
  data?: Employee;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_URL}/employees/rejoin/search?cnic=${encodeURIComponent(cnic)}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to search employee' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error searching employee for rejoin:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to search employee.',
    };
  }
}

// Rejoin an inactive employee
export async function rejoinEmployee(data: {
  cnic: string;
  employeeId: string;
  attendanceId: string;
  joiningDate: string | Date;
  departmentId?: string;
  subDepartmentId?: string;
  designationId?: string;
  employeeGradeId?: string;
  employmentStatusId?: string;
  employeeSalary?: number;
  branchId?: string;
  workingHoursPolicyId?: string;
  leavesPolicyId?: string;
  reportingManager?: string;
  remarks?: string;
}): Promise<{ status: boolean; data?: Employee; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employees/rejoin`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        ...data,
        joiningDate: data.joiningDate instanceof Date ? data.joiningDate.toISOString() : data.joiningDate,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to rejoin employee' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    if (result.status) {
      revalidatePath('/dashboard/employee');
    }
    return result;
  } catch (error) {
    console.error('Error rejoining employee:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to rejoin employee.',
    };
  }
}

// Get rejoining history for an employee
export async function getEmployeeRejoiningHistory(employeeId: string): Promise<{
  status: boolean;
  data?: Array<{
    id: string;
    previousEmployeeId: string;
    newEmployeeId: string;
    previousAttendanceId: string;
    newAttendanceId: string;
    previousExitDate: string;
    rejoiningDate: string;
    remarks?: string;
    createdAt: string;
  }>;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_URL}/employees/${employeeId}/rejoining-history`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch history' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching rejoining history:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch rejoining history.',
    };
  }
}

