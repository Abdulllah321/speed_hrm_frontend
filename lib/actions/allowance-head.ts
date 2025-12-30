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

export interface AllowanceHead {
  id: string;
  name: string;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Get all allowance heads
export async function getAllowanceHeads(): Promise<{ status: boolean; data?: AllowanceHead[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/allowance-heads`, {
      headers: await getAuthHeaders(false),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch allowance heads' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching allowance heads:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch allowance heads. Please check your connection.'
    };
  }
}

// Get allowance head by id
export async function getAllowanceHeadById(id: string): Promise<{ status: boolean; data?: AllowanceHead; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/allowance-heads/${id}`, {
      headers: await getAuthHeaders(false),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch allowance head' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching allowance head:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch allowance head'
    };
  }
}

// Create allowance head
export async function createAllowanceHead(data: { name: string; status?: string }): Promise<{ status: boolean; data?: AllowanceHead; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/allowance-heads`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create allowance head' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error creating allowance head:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create allowance head' };
  }
}

// Create allowance heads bulk
export async function createAllowanceHeadsBulk(items: { name: string; status?: string }[]): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/allowance-heads/bulk`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ items }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create allowance heads' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error creating allowance heads:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create allowance heads' };
  }
}

// Update allowance head
export async function updateAllowanceHead(id: string, data: { name: string; status?: string }): Promise<{ status: boolean; data?: AllowanceHead; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/allowance-heads/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ ...data, id }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update allowance head' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error updating allowance head:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update allowance head' };
  }
}

// Delete allowance head
export async function deleteAllowanceHead(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/allowance-heads/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(false),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete allowance head' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error deleting allowance head:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete allowance head' };
  }
}

// Update allowance heads bulk
export async function updateAllowanceHeads(items: {
  id: string;
  name: string;
  status?: string;
}[]): Promise<{ status: boolean; message?: string }> {
  try {
    const results = await Promise.all(
      items.map(item => updateAllowanceHead(item.id, item))
    );

    const failed = results.filter(r => !r.status);
    if (failed.length > 0) {
      return { status: false, message: `${failed.length} allowance head(s) failed to update` };
    }

    return { status: true, message: `${results.length} allowance head(s) updated successfully` };
  } catch (error) {
    console.error('Error updating allowance heads:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update allowance heads' };
  }
}

// Delete allowance heads bulk
export async function deleteAllowanceHeads(ids: string[]): Promise<{ status: boolean; message?: string }> {
  try {
    const results = await Promise.all(
      ids.map(id => deleteAllowanceHead(id))
    );

    const failed = results.filter(r => !r.status);
    if (failed.length > 0) {
      return { status: false, message: `${failed.length} allowance head(s) failed to delete` };
    }

    return { status: true, message: `${results.length} allowance head(s) deleted successfully` };
  } catch (error) {
    console.error('Error deleting allowance heads:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete allowance heads' };
  }
}

