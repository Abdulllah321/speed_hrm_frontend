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

export interface CreateLeaveData {
  employeeId: string;
  leaveTypeId: string;
  dayType: string;
  fromDate: string;
  toDate: string;
  remarks?: string;
}

export interface LeaveEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  leaveType: string;
  leaveTypeName?: string;
  dayType: string;
  fromDate: string;
  toDate: string;
  remarks?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Create leave request
export async function createLeave(data: CreateLeaveData): Promise<{ status: boolean; data?: LeaveEntry; message?: string }> {
  try {
    if (!data.employeeId || !data.leaveTypeId || !data.fromDate || !data.toDate || !data.dayType) {
      return { status: false, message: 'All required fields must be filled' };
    }

    const res = await fetch(`${API_URL}/leave-requests`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create leave request' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    if (result.status && result.data) {
      revalidatePath('/hr/leaves/requests');
      revalidatePath('/hr/leaves/create-leaves');
      return { status: true, data: result.data };
    }
    return { status: false, message: result.message || 'Failed to create leave request' };
  } catch (error) {
    console.error('Error creating leave request:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to create leave request',
    };
  }
}

// Get leave requests for an employee (for data table)
export async function getEmployeeLeaveRequests(employeeId: string): Promise<{ status: boolean; data?: LeaveEntry[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/leave-requests?employeeId=${employeeId}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch leave requests' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    if (result.status && result.data) {
      return { status: true, data: result.data };
    }
    return { status: false, message: 'Invalid response format' };
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch leave requests',
    };
  }
}

