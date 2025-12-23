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

export interface AdvanceSalary {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    employeeId: string;
    employeeName: string;
    department?: {
      id: string;
      name: string;
    };
    subDepartment?: {
      id: string;
      name: string;
    };
  };
  amount: number | string;
  neededOn: string;
  deductionMonth: string;
  deductionYear: string;
  deductionMonthYear: string;
  reason: string;
  approvalStatus: string; // pending, approved, rejected
  approvedById?: string;
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  approvedAt?: string;
  rejectionReason?: string;
  status: string; // pending, active, completed, cancelled, rejected
  createdById?: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  updatedById?: string;
  updatedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Get all advance salaries
export async function getAdvanceSalaries(params?: {
  employeeId?: string;
  deductionMonth?: string;
  deductionYear?: string;
  deductionMonthYear?: string;
  approvalStatus?: string;
  status?: string;
}): Promise<{ status: boolean; data?: AdvanceSalary[]; message?: string }> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.employeeId) queryParams.append('employeeId', params.employeeId);
    if (params?.deductionMonth) queryParams.append('deductionMonth', params.deductionMonth);
    if (params?.deductionYear) queryParams.append('deductionYear', params.deductionYear);
    if (params?.deductionMonthYear) queryParams.append('deductionMonthYear', params.deductionMonthYear);
    if (params?.approvalStatus) queryParams.append('approvalStatus', params.approvalStatus);
    if (params?.status) queryParams.append('status', params.status);

    const res = await fetch(`${API_URL}/advance-salaries?${queryParams.toString()}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch advance salaries' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching advance salaries:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch advance salaries. Please check your connection.' 
    };
  }
}

// Get single advance salary
export async function getAdvanceSalaryById(id: string): Promise<{ status: boolean; data?: AdvanceSalary; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/advance-salaries/${id}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch advance salary' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching advance salary:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch advance salary. Please check your connection.' 
    };
  }
}

// Create advance salary (supports multiple employees)
export async function createAdvanceSalary(data: {
  employeeIds: string[];
  amount: number;
  neededOn: string;
  deductionMonthYear: string;
  reason: string;
}): Promise<{ status: boolean; data?: AdvanceSalary[]; message?: string }> {
  try {
    // Parse deductionMonthYear (format: "YYYY-MM")
    const [year, month] = data.deductionMonthYear.split('-');
    const deductionMonth = month.padStart(2, '0');
    const deductionYear = year;

    const advanceSalaries = data.employeeIds.map((employeeId) => ({
      employeeId,
      amount: data.amount,
      neededOn: data.neededOn,
      deductionMonth,
      deductionYear,
      deductionMonthYear: data.deductionMonthYear,
      reason: data.reason,
    }));

    const res = await fetch(`${API_URL}/advance-salaries`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        advanceSalaries,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create advance salary' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error creating advance salary:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create advance salary' };
  }
}

// Update advance salary
export async function updateAdvanceSalary(id: string, data: {
  amount?: number;
  neededOn?: string;
  deductionMonthYear?: string;
  reason?: string;
  status?: string;
}): Promise<{ status: boolean; data?: AdvanceSalary; message?: string }> {
  try {
    const updateData: any = {};

    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.neededOn !== undefined) updateData.neededOn = data.neededOn;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.status !== undefined) updateData.status = data.status;

    if (data.deductionMonthYear !== undefined) {
      const [year, month] = data.deductionMonthYear.split('-');
      updateData.deductionMonth = month.padStart(2, '0');
      updateData.deductionYear = year;
      updateData.deductionMonthYear = data.deductionMonthYear;
    }

    const res = await fetch(`${API_URL}/advance-salaries/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update advance salary' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error updating advance salary:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update advance salary' };
  }
}

// Approve advance salary
export async function approveAdvanceSalary(id: string): Promise<{ status: boolean; data?: AdvanceSalary; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/advance-salaries/${id}/approve`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to approve advance salary' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error approving advance salary:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to approve advance salary' };
  }
}

// Reject advance salary
export async function rejectAdvanceSalary(id: string, rejectionReason?: string): Promise<{ status: boolean; data?: AdvanceSalary; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/advance-salaries/${id}/reject`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ rejectionReason }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to reject advance salary' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error rejecting advance salary:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to reject advance salary' };
  }
}

// Delete advance salary
export async function deleteAdvanceSalary(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/advance-salaries/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete advance salary' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error deleting advance salary:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete advance salary' };
  }
}
