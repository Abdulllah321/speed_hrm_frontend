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

export interface DeductionHead {
  id: string;
  name: string;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Get all deduction heads
export async function getDeductionHeads(): Promise<{ status: boolean; data?: DeductionHead[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/deduction-heads`, {
      headers: await getAuthHeaders(false),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch deduction heads' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching deduction heads:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch deduction heads. Please check your connection.'
    };
  }
}

// Get deduction head by id
export async function getDeductionHeadById(id: string): Promise<{ status: boolean; data?: DeductionHead; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/deduction-heads/${id}`, {
      headers: await getAuthHeaders(false),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch deduction head' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching deduction head:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch deduction head'
    };
  }
}

// Create deduction head
export async function createDeductionHead(data: { name: string; status?: string }): Promise<{ status: boolean; data?: DeductionHead; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/deduction-heads`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create deduction head' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error creating deduction head:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create deduction head' };
  }
}

// Create deduction heads bulk
export async function createDeductionHeadsBulk(items: { name: string; status?: string }[]): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/deduction-heads/bulk`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ items }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create deduction heads' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error creating deduction heads:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create deduction heads' };
  }
}

// Update deduction head
export async function updateDeductionHead(id: string, data: { name: string; status?: string }): Promise<{ status: boolean; data?: DeductionHead; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/deduction-heads/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ ...data, id }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update deduction head' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error updating deduction head:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update deduction head' };
  }
}

// Delete deduction head
export async function deleteDeductionHead(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/deduction-heads/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(false),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete deduction head' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error deleting deduction head:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete deduction head' };
  }
}

// Update deduction heads bulk
export async function updateDeductionHeads(items: {
  id: string;
  name: string;
  status?: string;
}[]): Promise<{ status: boolean; message?: string }> {
  try {
    const results = await Promise.all(
      items.map(item => updateDeductionHead(item.id, item))
    );

    const failed = results.filter(r => !r.status);
    if (failed.length > 0) {
      return { status: false, message: `${failed.length} deduction head(s) failed to update` };
    }

    return { status: true, message: `${results.length} deduction head(s) updated successfully` };
  } catch (error) {
    console.error('Error updating deduction heads:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update deduction heads' };
  }
}

// Delete deduction heads bulk
export async function deleteDeductionHeads(ids: string[]): Promise<{ status: boolean; message?: string }> {
  try {
    const results = await Promise.all(
      ids.map(id => deleteDeductionHead(id))
    );

    const failed = results.filter(r => !r.status);
    if (failed.length > 0) {
      return { status: false, message: `${failed.length} deduction head(s) failed to delete` };
    }

    return { status: true, message: `${results.length} deduction head(s) deleted successfully` };
  } catch (error) {
    console.error('Error deleting deduction heads:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete deduction heads' };
  }
}

