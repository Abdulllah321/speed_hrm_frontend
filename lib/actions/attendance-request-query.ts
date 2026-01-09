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

export interface AttendanceRequestQuery {
  id: string;
  employeeId?: string | null;
  employeeName?: string | null;
  department?: string | null;
  subDepartment?: string | null;
  attendanceDate: string;
  clockInTimeRequest?: string | null;
  clockOutTimeRequest?: string | null;
  breakIn?: string | null;
  breakOut?: string | null;
  query: string;
  approvalStatus: string;
  createdAt?: string;
  updatedAt?: string;
}

// Get all attendance request queries
export async function getAllAttendanceRequestQueries(): Promise<{ status: boolean; data?: AttendanceRequestQuery[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/attendance-request-queries`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch attendance request queries' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    return { status: true, data: result.data || result };
  } catch (error) {
    console.error('Error fetching attendance request queries:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch attendance request queries. Please check your connection.',
    };
  }
}

// Get attendance request query by ID
export async function getAttendanceRequestQueryById(id: string): Promise<{ status: boolean; data?: AttendanceRequestQuery; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/attendance-request-queries/${id}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch attendance request query' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    return { status: true, data: result.data || result };
  } catch (error) {
    console.error('Error fetching attendance request query:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch attendance request query',
    };
  }
}

// Create attendance request query
export async function createAttendanceRequestQuery(data: Omit<AttendanceRequestQuery, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ status: boolean; data?: AttendanceRequestQuery; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/attendance-request-queries`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create attendance request query' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    if (result.status && result.data) {
      revalidatePath('/hr/attendance/request-list');
      return { status: true, data: result.data };
    }
    if (result.id || result.status) {
      revalidatePath('/hr/attendance/request-list');
    }
    return { status: true, data: result.data || result };
  } catch (error) {
    console.error('Error creating attendance request query:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to create attendance request query',
    };
  }
}

// Update attendance request query
export async function updateAttendanceRequestQuery(id: string, data: Partial<AttendanceRequestQuery>): Promise<{ status: boolean; data?: AttendanceRequestQuery; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/attendance-request-queries/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update attendance request query' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    if (result.status && result.data) {
      revalidatePath('/hr/attendance/request-list');
      return { status: true, data: result.data };
    }
    if (result.id || result.status) {
      revalidatePath('/hr/attendance/request-list');
    }
    return { status: true, data: result.data || result };
  } catch (error) {
    console.error('Error updating attendance request query:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to update attendance request query',
    };
  }
}

// Delete attendance request query
export async function deleteAttendanceRequestQuery(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/attendance-request-queries/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete attendance request query' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    revalidatePath('/hr/attendance/request-list');
    return { status: true, message: 'Attendance request query deleted successfully' };
  } catch (error) {
    console.error('Error deleting attendance request query:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to delete attendance request query',
    };
  }
}

