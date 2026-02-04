'use server';
import { authFetch } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL;

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  department?: string | null;
  subDepartment?: string | null;
  leaveType: string;
  leaveTypeName?: string;
  dayType: string;
  fromDate: string;
  toDate: string;
  approval1?: string | null;
  approval1Status?: string | null;
  approval2?: string | null;
  approval2Status?: string | null;
  remarks?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveRequestFilters {
  departmentId?: string;
  subDepartmentId?: string;
  employeeId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}
// Get all leave requests
export async function getLeaveRequests(filters?: LeaveRequestFilters): Promise<{ status: boolean; data?: LeaveRequest[]; message?: string }> {
  try {
    const queryParams = new URLSearchParams();
    if (filters?.departmentId) queryParams.append('departmentId', filters.departmentId);
    if (filters?.subDepartmentId) queryParams.append('subDepartmentId', filters.subDepartmentId);
    if (filters?.employeeId) queryParams.append('employeeId', filters.employeeId);
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.fromDate) queryParams.append('fromDate', filters.fromDate);
    if (filters?.toDate) queryParams.append('toDate', filters.toDate);
    const url = `${API_URL}/leave-requests${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
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
      message: error instanceof Error ? error.message : 'Failed to fetch leave requests. Please check your connection.',
    };
  }
}
// Get leave request by ID
export async function getLeaveRequestById(id: string): Promise<{ status: boolean; data?: LeaveRequest; message?: string }> {
  try {
    const res = await authFetch(`/leave-requests/${id}`, {
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch leave request' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    const result = await res.json();
    if (result.status && result.data) {
      return { status: true, data: result.data };
    }
    return { status: false, message: result.message || 'Leave request not found' };
  } catch (error) {
    console.error('Error fetching leave request:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch leave request',
    };
  }
}
// Approve leave application
export async function approveLeaveApplication(
  id: string,
  level?: 1 | 2,
): Promise<{ status: boolean; data?: LeaveRequest; message?: string }> {
  try {
    const endpoint = level
      ? `${API_URL}/leave-applications/${id}/approve-level/${level}`
      : `${API_URL}/leave-applications/${id}/approve`;
    const res = await fetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify({}), // Empty object for JSON body
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to approve leave application' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    const result = await res.json();
    if (result.status && result.data) {
      revalidatePath('/hr/leaves/requests');
      revalidatePath('/hr/leaves/create-leaves');
      return { status: true, data: result.data };
    }
    return { status: false, message: result.message || 'Failed to approve leave application' };
  } catch (error) {
    console.error('Error approving leave application:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to approve leave application',
    };
  }
}
// Reject leave application
export async function rejectLeaveApplication(
  id: string,
  remarks?: string,
  level?: 1 | 2,
): Promise<{ status: boolean; data?: LeaveRequest; message?: string }> {
  try {
    const endpoint = level
      ? `${API_URL}/leave-applications/${id}/reject-level/${level}`
      : `${API_URL}/leave-applications/${id}/reject`;
    const res = await fetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ remarks: remarks || '' }), // Always send remarks field
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to reject leave application' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    const result = await res.json();
    if (result.status && result.data) {
      revalidatePath('/hr/leaves/requests');
      revalidatePath('/hr/leaves/create-leaves');
      return { status: true, data: result.data };
    }
    return { status: false, message: result.message || 'Failed to reject leave application' };
  } catch (error) {
    console.error('Error rejecting leave application:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to reject leave application',
    };
  }
}
