'use server';

import { getAccessToken } from '../auth';
import { revalidatePath } from 'next/cache';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_URL || 'http://localhost:5000/api';

async function getAuthHeaders() {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export interface LoanRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  department?: string;
  subDepartment?: string;
  loanTypeId: string;
  loanTypeName?: string;
  loanAmount: number;
  perMonthDeduction: number;
  neededOnMonth: string;
  neededOnYear: string;
  description: string;
  status?: string;
  approvalRemarks1?: string;
  approvalRemarks2?: string;
  topUpAmount?: number;
  totalLoan?: number;
  loanAdjustment?: number;
  overallPF?: number;
  paidLoanAmount?: number;
  remainingAmount?: number;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanRequestData {
  employeeId: string;
  loanTypeId: string;
  loanAmount: number;
  perMonthDeduction: number;
  neededOnMonth: string;
  neededOnYear: string;
  description: string;
}

export interface UpdateLoanRequestData {
  employeeId?: string;
  loanTypeId?: string;
  loanAmount?: number;
  perMonthDeduction?: number;
  neededOnMonth?: string;
  neededOnYear?: string;
  description?: string;
}

// Create loan request
export async function createLoanRequest(data: CreateLoanRequestData): Promise<{ status: boolean; data?: LoanRequest; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/loan-requests`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create loan request' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    revalidatePath('/dashboard/payroll-setup/loan-requests');
    return result;
  } catch (error) {
    console.error('Error creating loan request:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create loan request' };
  }
}

// Get all loan requests
export async function getLoanRequests(params?: {
  employeeId?: string;
  month?: string;
  year?: string;
}): Promise<{ status: boolean; data?: LoanRequest[]; message?: string }> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.employeeId) queryParams.append('employeeId', params.employeeId);
    if (params?.month) queryParams.append('month', params.month);
    if (params?.year) queryParams.append('year', params.year);

    const res = await fetch(`${API_URL}/loan-requests?${queryParams.toString()}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch loan requests' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching loan requests:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch loan requests. Please check your connection.' 
    };
  }
}

// Get loan request by id
export async function getLoanRequestById(id: string): Promise<{ status: boolean; data?: LoanRequest; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/loan-requests/${id}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch loan request' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching loan request:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch loan request' 
    };
  }
}

// Update loan request
export async function updateLoanRequest(id: string, data: UpdateLoanRequestData): Promise<{ status: boolean; data?: LoanRequest; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/loan-requests/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update loan request' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    revalidatePath('/dashboard/payroll-setup/loan-requests');
    return result;
  } catch (error) {
    console.error('Error updating loan request:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update loan request' };
  }
}

// Delete loan request
export async function deleteLoanRequest(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/loan-requests/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete loan request' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    revalidatePath('/dashboard/payroll-setup/loan-requests');
    return result;
  } catch (error) {
    console.error('Error deleting loan request:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete loan request' };
  }
}

