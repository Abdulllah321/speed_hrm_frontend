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

export interface ExitClearance {
  id: string;
  employeeId: string;
  employeeName: string;
  designation?: string | null;
  department?: string | null;
  subDepartment?: string | null;
  location?: string | null;
  leavingReason?: string | null;
  contractEnd?: string | null;
  lastWorkingDate: string;
  reportingManager?: string | null;
  date: string;
  // IT Department
  itAccessControl: boolean;
  itPasswordInactivated: boolean;
  itLaptopReturned: boolean;
  itEquipment: boolean;
  itWifiDevice: boolean;
  itMobileDevice: boolean;
  itSimCard: boolean;
  itBillsSettlement: boolean;
  // Finance Department
  financeAdvance: boolean;
  financeLoan: boolean;
  financeOtherLiabilities: boolean;
  // Admin Department
  adminVehicle: boolean;
  adminKeys: boolean;
  adminOfficeAccessories: boolean;
  adminMobilePhone: boolean;
  adminVisitingCards: boolean;
  // HR Department
  hrEobi: boolean;
  hrProvidentFund: boolean;
  hrIdCard: boolean;
  hrMedical: boolean;
  hrThumbImpression: boolean;
  hrLeavesRemaining: boolean;
  hrOtherCompensation: boolean;
  note?: string | null;
  approvalStatus: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  subDepartment?: string;
  designation: string;
}

// Get all exit clearances
export async function getAllExitClearances(): Promise<{ status: boolean; data?: ExitClearance[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/exit-clearances`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch exit clearances' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    // Backend returns { status: true, data: ExitClearance[] }
    if (result.status && result.data) {
      return { status: true, data: result.data };
    }
    return { status: false, message: 'Invalid response format' };
  } catch (error) {
    console.error('Error fetching exit clearances:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch exit clearances. Please check your connection.',
    };
  }
}

// Get exit clearance by ID
export async function getExitClearanceById(id: string): Promise<{ status: boolean; data?: ExitClearance; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/exit-clearances/${id}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch exit clearance' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    // Backend returns { status: true, data: ExitClearance }
    if (result.status && result.data) {
      return { status: true, data: result.data };
    }
    return { status: false, message: result.message || 'Exit clearance not found' };
  } catch (error) {
    console.error('Error fetching exit clearance:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch exit clearance',
    };
  }
}

// Create exit clearance
export async function createExitClearance(data: Omit<ExitClearance, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ status: boolean; data?: ExitClearance; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/exit-clearances`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create exit clearance' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    // Backend returns { status: true, data: ExitClearance }
    if (result.status && result.data) {
      revalidatePath('/dashboard/exit-clearance/list');
      return { status: true, data: result.data };
    }
    return { status: false, message: result.message || 'Failed to create exit clearance' };
  } catch (error) {
    console.error('Error creating exit clearance:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to create exit clearance',
    };
  }
}

// Update exit clearance
export async function updateExitClearance(id: string, data: Partial<ExitClearance>): Promise<{ status: boolean; data?: ExitClearance; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/exit-clearances/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update exit clearance' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    // Backend returns { status: true, data: ExitClearance }
    if (result.status && result.data) {
      revalidatePath('/dashboard/exit-clearance/list');
      return { status: true, data: result.data };
    }
    return { status: false, message: result.message || 'Failed to update exit clearance' };
  } catch (error) {
    console.error('Error updating exit clearance:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to update exit clearance',
    };
  }
}

// Delete exit clearance
export async function deleteExitClearance(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/exit-clearances/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete exit clearance' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    revalidatePath('/dashboard/exit-clearance/list');
    return { status: true, message: 'Exit clearance deleted successfully' };
  } catch (error) {
    console.error('Error deleting exit clearance:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to delete exit clearance',
    };
  }
}

// Get all employees for clearance
export async function getAllEmployeesForClearance(): Promise<{ status: boolean; data?: Employee[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employees`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch employees' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    // Backend returns { status: true, data: employees[] }
    if (result.status && result.data) {
      // Map the full employee data to the Employee interface format
      // Backend now returns names directly in department, subDepartment, designation fields
      const employees: Employee[] = result.data.map((emp: any) => ({
        id: emp.id,
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        department: emp.department || emp.departmentId || '',
        subDepartment: emp.subDepartment || emp.subDepartmentId || undefined,
        designation: emp.designation || emp.designationId || '',
      }));
      return { status: true, data: employees };
    }
    return { status: false, message: 'Invalid response format' };
  } catch (error) {
    console.error('Error fetching employees:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch employees',
    };
  }
}

// Get employee department info
export async function getEmployeeDepartmentInfo(employeeId: string): Promise<{ status: boolean; data?: Employee; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employee-department/${employeeId}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch employee details' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const data = await res.json();
    return { status: true, data };
  } catch (error) {
    console.error('Error fetching employee details:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch employee details',
    };
  }
}
