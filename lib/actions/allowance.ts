'use server';

import { getAccessToken } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_URL || 'http://localhost:5000/api';

async function getAuthHeaders() {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export interface AllowanceHead {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Allowance {
  id: string;
  employeeId: string;
  employeeName?: string;
  allowanceHeadId: string;
  allowanceHeadName?: string;
  amount: number;
  date: string;
  month?: string;
  year?: string;
  notes?: string;
  status?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  employeeName: string;
  designation?: string;
  department?: string;
}

// Get all allowance heads
export async function getAllowanceHeads(): Promise<{ status: boolean; data?: AllowanceHead[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/allowance-heads`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch allowance heads' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching allowance heads:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch allowance heads. Please check your connection.' 
    };
  }
}

// Get employees for dropdown
export async function getEmployeesForAllowance(): Promise<{ status: boolean; data?: Employee[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employees?status=active&select=id,employeeId,employeeName,designation,department`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch employees' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    return result;
  } catch (error) {
    console.error('Error fetching employees:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch employees. Please check your connection.' 
    };
  }
}

// Create allowance (single)
export async function createAllowance(data: {
  employeeId: string;
  allowanceHeadId: string;
  amount: number;
  date: string;
  month?: string;
  year?: string;
  notes?: string;
  isTaxable?: boolean;
  taxPercentage?: number;
}): Promise<{ status: boolean; data?: Allowance; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/allowances`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        month: data.month,
        year: data.year,
        date: data.date,
        allowances: [{
          employeeId: data.employeeId,
          allowanceHeadId: data.allowanceHeadId,
          amount: data.amount,
          notes: data.notes,
          isTaxable: data.isTaxable,
          taxPercentage: data.taxPercentage,
        }],
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create allowance' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    return { status: result.status, data: result.data?.[0], message: result.message };
  } catch (error) {
    console.error('Error creating allowance:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create allowance' };
  }
}

// Bulk create allowances
export async function bulkCreateAllowances(data: {
  month: string;
  year: string;
  date: string;
  allowances: Array<{
    employeeId: string;
    allowanceHeadId: string;
    amount: number;
    notes?: string;
    isTaxable?: boolean;
    taxPercentage?: number;
  }>;
}): Promise<{ status: boolean; data?: Allowance[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/allowances/bulk`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create allowances' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error creating allowances:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create allowances' };
  }
}

// Get all allowances
export async function getAllowances(params?: {
  employeeId?: string;
  allowanceHeadId?: string;
  month?: string;
  year?: string;
}): Promise<{ status: boolean; data?: Allowance[]; message?: string }> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.employeeId) queryParams.append('employeeId', params.employeeId);
    if (params?.allowanceHeadId) queryParams.append('allowanceHeadId', params.allowanceHeadId);
    if (params?.month) queryParams.append('month', params.month);
    if (params?.year) queryParams.append('year', params.year);

    const res = await fetch(`${API_URL}/allowances?${queryParams.toString()}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch allowances' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching allowances:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch allowances. Please check your connection.' 
    };
  }
}

// Update allowance
export async function updateAllowance(id: string, data: {
  employeeId?: string;
  allowanceHeadId?: string;
  amount?: number;
  date?: string;
  month?: string;
  year?: string;
  notes?: string;
}): Promise<{ status: boolean; data?: Allowance; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/allowances/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update allowance' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error updating allowance:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update allowance' };
  }
}

// Delete allowance
export async function deleteAllowance(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/allowances/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete allowance' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error deleting allowance:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete allowance' };
  }
}
