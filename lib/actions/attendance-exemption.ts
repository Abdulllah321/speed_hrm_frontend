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

export interface AttendanceExemption {
  id: string;
  employeeId?: string | null;
  employeeName?: string | null;
  department?: string | null;
  subDepartment?: string | null;
  attendanceDate: string;
  flagType: string;
  exemptionType: string;
  reason: string;
  approvalStatus: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Get all attendance exemptions
export async function getAttendanceExemptions(): Promise<{ status: boolean; data?: AttendanceExemption[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/attendance-exemptions`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch attendance exemptions' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    return { status: true, data: result.data || result };
  } catch (error) {
    console.error('Error fetching attendance exemptions:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch attendance exemptions. Please check your connection.',
    };
  }
}

// Get attendance exemption by ID
export async function getAttendanceExemptionById(id: string): Promise<{ status: boolean; data?: AttendanceExemption; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/attendance-exemptions/${id}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch attendance exemption' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    return { status: true, data: result.data || result };
  } catch (error) {
    console.error('Error fetching attendance exemption:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch attendance exemption',
    };
  }
}

// Create attendance exemption
export async function createAttendanceExemption(data: Omit<AttendanceExemption, 'id' | 'createdAt' | 'updatedAt' | 'approvedBy' | 'approvedAt' | 'rejectionReason'>): Promise<{ status: boolean; data?: AttendanceExemption; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/attendance-exemptions`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create attendance exemption' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    if (result.status && result.data) {
      revalidatePath('/hr/attendance/exemptions-list');
      return { status: true, data: result.data };
    }
    if (result.id || result.status) {
      revalidatePath('/hr/attendance/exemptions-list');
    }
    return { status: true, data: result.data || result };
  } catch (error) {
    console.error('Error creating attendance exemption:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to create attendance exemption',
    };
  }
}

// Update attendance exemption
export async function updateAttendanceExemption(id: string, data: Partial<AttendanceExemption>): Promise<{ status: boolean; data?: AttendanceExemption; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/attendance-exemptions/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update attendance exemption' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    if (result.status && result.data) {
      revalidatePath('/hr/attendance/exemptions-list');
      return { status: true, data: result.data };
    }
    if (result.id || result.status) {
      revalidatePath('/hr/attendance/exemptions-list');
    }
    return { status: true, data: result.data || result };
  } catch (error) {
    console.error('Error updating attendance exemption:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to update attendance exemption',
    };
  }
}

// Delete attendance exemption
export async function deleteAttendanceExemption(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/attendance-exemptions/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete attendance exemption' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    revalidatePath('/hr/attendance/exemptions-list');
    return { status: true, message: 'Attendance exemption deleted successfully' };
  } catch (error) {
    console.error('Error deleting attendance exemption:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to delete attendance exemption',
    };
  }
}

