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

export interface Increment {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeGradeId?: string;
  employeeGradeName?: string;
  designationId?: string;
  designationName?: string;
  incrementType: 'Increment' | 'Decrement';
  incrementAmount?: number;
  incrementPercentage?: number;
  incrementMethod: 'Amount' | 'Percent';
  salary: number;
  promotionDate: string;
  currentMonth: string;
  monthsOfIncrement: number;
  notes?: string;
  status?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncrementData {
  employeeId: string;
  employeeGradeId?: string;
  designationId?: string;
  incrementType: 'Increment' | 'Decrement';
  incrementAmount?: number;
  incrementPercentage?: number;
  incrementMethod: 'Amount' | 'Percent';
  salary: number;
  promotionDate: string;
  currentMonth: string;
  monthsOfIncrement: number;
  notes?: string;
}

export interface UpdateIncrementData {
  employeeGradeId?: string;
  designationId?: string;
  incrementType?: 'Increment' | 'Decrement';
  incrementAmount?: number;
  incrementPercentage?: number;
  incrementMethod?: 'Amount' | 'Percent';
  salary?: number;
  promotionDate?: string;
  currentMonth?: string;
  monthsOfIncrement?: number;
  notes?: string;
}

// Bulk create increments
export async function bulkCreateIncrements(data: {
  increments: CreateIncrementData[];
}): Promise<{ status: boolean; data?: Increment[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/increments/bulk`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create increments' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error creating increments:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create increments' };
  }
}

// Get all increments
export async function getIncrements(params?: {
  employeeId?: string;
  month?: string;
  year?: string;
}): Promise<{ status: boolean; data?: Increment[]; message?: string }> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.employeeId) queryParams.append('employeeId', params.employeeId);
    if (params?.month) queryParams.append('month', params.month);
    if (params?.year) queryParams.append('year', params.year);

    const res = await fetch(`${API_URL}/increments?${queryParams.toString()}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch increments' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching increments:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch increments. Please check your connection.' 
    };
  }
}

// Get increment by id
export async function getIncrementById(id: string): Promise<{ status: boolean; data?: Increment; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/increments/${id}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch increment' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching increment:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch increment' 
    };
  }
}

// Update increment
export async function updateIncrement(id: string, data: UpdateIncrementData): Promise<{ status: boolean; data?: Increment; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/increments/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update increment' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error updating increment:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update increment' };
  }
}

// Delete increment
export async function deleteIncrement(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/increments/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete increment' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error deleting increment:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete increment' };
  }
}

