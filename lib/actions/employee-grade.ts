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

export interface EmployeeGrade {
  id: string;
  grade: string;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Get all employee grades
export async function getEmployeeGrades(): Promise<{ status: boolean; data?: EmployeeGrade[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employee-grades`, {
      headers: await getAuthHeaders(false),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch employee grades' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching employee grades:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch employee grades. Please check your connection.'
    };
  }
}

// Get employee grade by id
export async function getEmployeeGradeById(id: string): Promise<{ status: boolean; data?: EmployeeGrade; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employee-grades/${id}`, {
      headers: await getAuthHeaders(false),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch employee grade' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching employee grade:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch employee grade'
    };
  }
}

// Create employee grade
export async function createEmployeeGrade(data: { grade: string; status?: string }): Promise<{ status: boolean; data?: EmployeeGrade; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employee-grades`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create employee grade' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error creating employee grade:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create employee grade' };
  }
}

// Create employee grades bulk
export async function createEmployeeGradesBulk(items: { grade: string; status?: string }[]): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employee-grades/bulk`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ items }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create employee grades' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error creating employee grades:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create employee grades' };
  }
}

// Update employee grade
export async function updateEmployeeGrade(id: string, data: { grade: string; status?: string }): Promise<{ status: boolean; data?: EmployeeGrade; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employee-grades/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ ...data, id }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update employee grade' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error updating employee grade:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update employee grade' };
  }
}

// Delete employee grade
export async function deleteEmployeeGrade(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employee-grades/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(false),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete employee grade' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error deleting employee grade:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete employee grade' };
  }
}

// Update employee grades bulk
export async function updateEmployeeGrades(items: {
  id: string;
  grade: string;
  status?: string;
}[]): Promise<{ status: boolean; message?: string }> {
  try {
    const results = await Promise.all(
      items.map(item => updateEmployeeGrade(item.id, item))
    );

    const failed = results.filter(r => !r.status);
    if (failed.length > 0) {
      return { status: false, message: `${failed.length} employee grade(s) failed to update` };
    }

    return { status: true, message: `${results.length} employee grade(s) updated successfully` };
  } catch (error) {
    console.error('Error updating employee grades:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update employee grades' };
  }
}

// Delete employee grades bulk
export async function deleteEmployeeGrades(ids: string[]): Promise<{ status: boolean; message?: string }> {
  try {
    const results = await Promise.all(
      ids.map(id => deleteEmployeeGrade(id))
    );

    const failed = results.filter(r => !r.status);
    if (failed.length > 0) {
      return { status: false, message: `${failed.length} employee grade(s) failed to delete` };
    }

    return { status: true, message: `${results.length} employee grade(s) deleted successfully` };
  } catch (error) {
    console.error('Error deleting employee grades:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete employee grades' };
  }
}

