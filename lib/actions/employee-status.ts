'use server';

import { getAccessToken } from '../auth';

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function getAuthHeaders(isJson = true) {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

export interface EmployeeStatus {
  id: string;
  status: string;
  statusType: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Get all employee statuses
export async function getEmployeeStatuses(): Promise<{ status: boolean; data?: EmployeeStatus[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employee-statuses`, {
      headers: await getAuthHeaders(false),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch employee statuses' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching employee statuses:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch employee statuses. Please check your connection.'
    };
  }
}

// Get employee status by id
export async function getEmployeeStatusById(id: string): Promise<{ status: boolean; data?: EmployeeStatus; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employee-statuses/${id}`, {
      headers: await getAuthHeaders(false),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch employee status' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching employee status:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch employee status'
    };
  }
}

// Create employee status
export async function createEmployeeStatus(data: { status: string; statusType?: string }): Promise<{ status: boolean; data?: EmployeeStatus; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employee-statuses`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create employee status' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error creating employee status:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create employee status' };
  }
}

// Create employee statuses bulk
export async function createEmployeeStatusesBulk(items: { status: string; statusType?: string }[]): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employee-statuses/bulk`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ items }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create employee statuses' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error creating employee statuses:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create employee statuses' };
  }
}

// Update employee status
export async function updateEmployeeStatus(id: string, data: { status: string; statusType?: string }): Promise<{ status: boolean; data?: EmployeeStatus; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employee-statuses/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ ...data, id }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update employee status' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error updating employee status:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update employee status' };
  }
}

// Delete employee status
export async function deleteEmployeeStatus(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employee-statuses/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(false),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete employee status' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error deleting employee status:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete employee status' };
  }
}

// Update employee statuses bulk
export async function updateEmployeeStatuses(items: {
  id: string;
  status: string;
  statusType?: string;
}[]): Promise<{ status: boolean; message?: string }> {
  try {
    const results = await Promise.all(
      items.map(item => updateEmployeeStatus(item.id, item))
    );

    const failed = results.filter(r => !r.status);
    if (failed.length > 0) {
      return { status: false, message: `${failed.length} employee status(es) failed to update` };
    }

    return { status: true, message: `${results.length} employee status(es) updated successfully` };
  } catch (error) {
    console.error('Error updating employee statuses:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update employee statuses' };
  }
}

// Delete employee statuses bulk
export async function deleteEmployeeStatuses(ids: string[]): Promise<{ status: boolean; message?: string }> {
  try {
    const results = await Promise.all(
      ids.map(id => deleteEmployeeStatus(id))
    );

    const failed = results.filter(r => !r.status);
    if (failed.length > 0) {
      return { status: false, message: `${failed.length} employee status(es) failed to delete` };
    }

    return { status: true, message: `${results.length} employee status(es) deleted successfully` };
  } catch (error) {
    console.error('Error deleting employee statuses:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete employee statuses' };
  }
}

