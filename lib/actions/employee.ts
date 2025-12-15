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
  laptop?: boolean;
  card?: boolean;
  mobileSim?: boolean;
  key?: boolean;
  tools?: boolean;
  accountType?: string | null;
  roles?: string | null;
  status: string;
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

