'use server';

import { getAccessToken } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_URL || 'http://localhost:5000/api';

async function getAuthHeaders() {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export interface Bonus {
  id: string;
  employeeId: string;
         employee?: {
           id: string;
           employeeId: string;
           employeeName: string;
           bankName?: string;
           accountNumber?: string;
           accountTitle?: string;
           department?: {
             id: string;
             name: string;
           };
           subDepartment?: {
             id: string;
             name: string;
           };
         };
  bonusTypeId: string;
  bonusType?: {
    id: string;
    name: string;
    calculationType: string;
  };
  amount: number | string;
  calculationType: string;
  percentage?: number | string | null;
  bonusMonth: string;
  bonusYear: string;
  bonusMonthYear: string;
  paymentMethod?: string;
  adjustmentMethod?: string;
  notes?: string;
  status?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

// Get all bonuses
export async function getBonuses(params?: {
  employeeId?: string;
  bonusTypeId?: string;
  month?: string;
  year?: string;
  bonusMonthYear?: string;
  status?: string;
}): Promise<{ status: boolean; data?: Bonus[]; message?: string }> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.employeeId) queryParams.append('employeeId', params.employeeId);
    if (params?.bonusTypeId) queryParams.append('bonusTypeId', params.bonusTypeId);
    if (params?.month) queryParams.append('month', params.month);
    if (params?.year) queryParams.append('year', params.year);
    if (params?.bonusMonthYear) queryParams.append('bonusMonthYear', params.bonusMonthYear);
    if (params?.status) queryParams.append('status', params.status);

    const res = await fetch(`${API_URL}/bonuses?${queryParams.toString()}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch bonuses' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching bonuses:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch bonuses. Please check your connection.' 
    };
  }
}

// Search bonuses by employees
export async function searchBonusesByEmployees(params: {
  employeeIds: string[];
  bonusMonthYear?: string;
  bonusTypeId?: string;
}): Promise<{ status: boolean; data?: { [employeeId: string]: Bonus[] }; message?: string }> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('employeeIds', params.employeeIds.join(','));
    if (params.bonusMonthYear) queryParams.append('bonusMonthYear', params.bonusMonthYear);
    if (params.bonusTypeId) queryParams.append('bonusTypeId', params.bonusTypeId);

    const res = await fetch(`${API_URL}/bonuses/search?${queryParams.toString()}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to search bonuses' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error searching bonuses:', error);
    return { 
      status: false, 
      message: error instanceof Error ? error.message : 'Failed to search bonuses. Please check your connection.' 
    };
  }
}

// Create bonuses
export async function createBonuses(data: {
  bonusTypeId: string;
  bonusMonthYear: string;
  bonuses: Array<{
    employeeId: string;
    amount: number;
    percentage?: number;
  }>;
  paymentMethod?: string;
  adjustmentMethod?: string;
  notes?: string;
}): Promise<{ status: boolean; data?: Bonus[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/bonuses/bulk`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create bonuses' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error creating bonuses:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create bonuses' };
  }
}

// Update bonus
export async function updateBonus(
  id: string,
  data: {
    bonusTypeId?: string;
    amount?: number;
    percentage?: number;
    paymentMethod?: string;
    adjustmentMethod?: string;
    notes?: string;
    status?: string;
  }
): Promise<{ status: boolean; data?: Bonus; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/bonuses/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update bonus' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error updating bonus:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update bonus' };
  }
}

// Delete bonus
export async function deleteBonus(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/bonuses/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete bonus' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error deleting bonus:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete bonus' };
  }
}

