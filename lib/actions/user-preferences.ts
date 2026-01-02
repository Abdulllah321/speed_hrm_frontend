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

export interface UserPreference {
  id: string;
  userId: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export async function getUserPreference(
  key: string
): Promise<{ status: boolean; data?: UserPreference | null; message?: string }> {
  try {
    // Encode the key for URL
    const encodedKey = encodeURIComponent(key);
    const res = await fetch(`${API_URL}/user-preferences/${encodedKey}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch user preference' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching user preference:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch user preference. Please check your connection.',
    };
  }
}

export async function saveUserPreference(
  key: string,
  value: string
): Promise<{ status: boolean; data?: UserPreference; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/user-preferences`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ key, value }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to save user preference' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error saving user preference:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to save user preference. Please check your connection.',
    };
  }
}

