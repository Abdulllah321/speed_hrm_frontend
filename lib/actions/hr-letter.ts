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

export interface HrLetterType {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrLetter {
  id: string;
  employeeId: string;
  employeeName?: string;
  letterTypeId: string;
  letterTypeName?: string;
  letterHeadContent: string;
  note?: string;
  status?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHrLetterData {
  employeeId: string;
  letterTypeId: string;
  letterHeadContent: string;
  note?: string;
}

export interface UpdateHrLetterData {
  letterTypeId?: string;
  letterHeadContent?: string;
  note?: string;
}

// Get all HR letter types
export async function getHrLetterTypes(): Promise<{ status: boolean; data?: HrLetterType[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/hr-letter-types`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch HR letter types' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching HR letter types:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch HR letter types. Please check your connection.' 
    };
  }
}

// Create HR letter
export async function createHrLetter(data: CreateHrLetterData): Promise<{ status: boolean; data?: HrLetter; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/hr-letters`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create HR letter' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error creating HR letter:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create HR letter' };
  }
}

// Get all HR letters
export async function getHrLetters(params?: {
  employeeId?: string;
  letterTypeId?: string;
  departmentId?: string;
  subDepartmentId?: string;
}): Promise<{ status: boolean; data?: HrLetter[]; message?: string }> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.employeeId) queryParams.append('employeeId', params.employeeId);
    if (params?.letterTypeId) queryParams.append('letterTypeId', params.letterTypeId);
    if (params?.departmentId) queryParams.append('departmentId', params.departmentId);
    if (params?.subDepartmentId) queryParams.append('subDepartmentId', params.subDepartmentId);

    const res = await fetch(`${API_URL}/hr-letters?${queryParams.toString()}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch HR letters' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching HR letters:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch HR letters. Please check your connection.' 
    };
  }
}

// Get HR letter by id
export async function getHrLetterById(id: string): Promise<{ status: boolean; data?: HrLetter; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/hr-letters/${id}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch HR letter' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching HR letter:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch HR letter' 
    };
  }
}

// Update HR letter
export async function updateHrLetter(id: string, data: UpdateHrLetterData): Promise<{ status: boolean; data?: HrLetter; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/hr-letters/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update HR letter' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error updating HR letter:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update HR letter' };
  }
}

// Delete HR letter
export async function deleteHrLetter(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/hr-letters/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete HR letter' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error deleting HR letter:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete HR letter' };
  }
}

