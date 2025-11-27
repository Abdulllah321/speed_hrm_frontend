'use server';

import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
export async function getBranches(): Promise<{ status: boolean; data: Branch[]; message?: string }> {
  const res = await fetch(`${API_URL}/api/branches`, {
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });
  return res.json();
}

// Get branch by id
export async function getBranchById(id: string): Promise<{ status: boolean; data: Branch; message?: string }> {
  const res = await fetch(`${API_URL}/api/branches/${id}`, {
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });
  return res.json();
}

// Create branch
export async function createBranch(data: { name: string; address?: string; cityId?: string; status?: string }): Promise<{ status: boolean; data?: Branch; message?: string }> {
  const res = await fetch(`${API_URL}/api/branches`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

// Create branches bulk
export async function createBranchesBulk(items: { name: string; address?: string; cityId?: string; status?: string }[]): Promise<{ status: boolean; message?: string }> {
  const res = await fetch(`${API_URL}/api/branches/bulk`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ items }),
  });
  return res.json();
}

// Update branch
export async function updateBranch(id: string, data: { name: string; address?: string; cityId?: string; status?: string }): Promise<{ status: boolean; data?: Branch; message?: string }> {
  const res = await fetch(`${API_URL}/api/branches/${id}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

// Update branches bulk
export async function updateBranchesBulk(items: { id: string; name: string; address?: string; cityId?: string; status?: string }[]): Promise<{ status: boolean; message?: string }> {
  const res = await fetch(`${API_URL}/api/branches/bulk`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ items }),
  });
  return res.json();
}

// Delete branch
export async function deleteBranch(id: string): Promise<{ status: boolean; message?: string }> {
  const res = await fetch(`${API_URL}/api/branches/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });
  return res.json();
}

// Delete branches bulk
export async function deleteBranches(ids: string[]): Promise<{ status: boolean; message?: string }> {
  const res = await fetch(`${API_URL}/api/branches/bulk`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ ids }),
  });
  return res.json();
}

