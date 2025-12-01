'use server';

import { getAccessToken } from '../auth';

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function getAuthHeaders() {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}


export interface Branch {
  id: string;
  name: string;
  address: string | null;
  cityId: string | null;
  city?: {
    id: string;
    name: string;
    country?: { id: string; name: string };
  } | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// Get all branches
export async function getBranches(): Promise<{ status: boolean; data?: Branch[]; message?: string }> {
  try {   
    const res = await fetch(`${API_URL}/branches`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch branches' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    
    return res.json();
  } catch (error) {
    console.error('Error fetching branches:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch branches. Please check your connection.' 
    };
  }
}

// Get branch by id
export async function getBranchById(id: string): Promise<{ status: boolean; data?: Branch; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/branches/${id}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch branch' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    
    return res.json();
  } catch (error) {
    console.error('Error fetching branch:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch branch' 
    };
  }
}

// Create branch
export async function createBranch(data: { name: string; address?: string; cityId?: string; status?: string }): Promise<{ status: boolean; data?: Branch; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/branches`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create branch' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    
    return res.json();
  } catch (error) {
    console.error('Error creating branch:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create branch' };
  }
}

// Create branches bulk
export async function createBranchesBulk(items: { name: string; address?: string; cityId?: string; status?: string }[]): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/branches/bulk`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ items }),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create branches' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    
    return res.json();
  } catch (error) {
    console.error('Error creating branches:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create branches' };
  }
}

// Update branch
export async function updateBranch(id: string, data: { name: string; address?: string; cityId?: string; status?: string }): Promise<{ status: boolean; data?: Branch; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/branches/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update branch' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    
    return res.json();
  } catch (error) {
    console.error('Error updating branch:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update branch' };
  }
}

// Update branches bulk
export async function updateBranchesBulk(items: { id: string; name: string; address?: string; cityId?: string; status?: string }[]): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/branches/bulk`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ items }),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update branches' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    
    return res.json();
  } catch (error) {
    console.error('Error updating branches:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update branches' };
  }
}

// Delete branch
export async function deleteBranch(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/branches/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete branch' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    
    return res.json();
  } catch (error) {
    console.error('Error deleting branch:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete branch' };
  }
}

// Delete branches bulk
export async function deleteBranches(ids: string[]): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/branches/bulk`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete branches' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    
    return res.json();
  } catch (error) {
    console.error('Error deleting branches:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete branches' };
  }
}

