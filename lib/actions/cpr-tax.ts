'use server';
import { authFetch } from '@/lib/auth';

export interface EmployeeMinInfo {
  id: string;
  employeeId: string;
  employeeName: string;
}

export interface CprTaxRecord {
  id: string;
  employeeId: string | null;
  cnic: string;
  name: string;
  city: string | null;
  cprNo: string;
  carAmount: number | string | null;
  ntn: string | null;
  taxableAmountAnnual: number | string | null;
  taxableAmountGross: number | string | null;
  taxAmountMonthlyTax: number | string | null;
  taxAmountAnnual: number | string | null;
  taxPeriod: string | null;
  paymentDate: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeMinInfo;
}

// Fetch all CPR Tax records
export async function getCprTaxes(filters?: {
  month?: string;
  year?: string;
  months?: string;
}): Promise<{ status: boolean; data?: CprTaxRecord[]; message?: string }> {
  try {
    const query = new URLSearchParams();
    if (filters?.month) query.append('month', filters.month);
    if (filters?.year) query.append('year', filters.year);
    if (filters?.months) query.append('months', filters.months);

    const queryString = query.toString();
    const url = `/cpr-tax${queryString ? `?${queryString}` : ''}`;
    const res = await authFetch(url, {});
    if (!res.ok) {
      const errorData = res.data || { message: 'Failed to fetch CPR Tax records' };
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    return res.data;
  } catch (error) {
    console.error('Error fetching CPR Tax records:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch CPR Tax records. Please check your connection.'
    };
  }
}

// Create a single CPR Tax record
export async function createCprTax(data: {
  employeeId?: string;
  cnic: string;
  name: string;
  city?: string;
  cprNo: string;
  carAmount?: number;
  ntn?: string;
  taxableAmountAnnual?: number;
  taxableAmountGross?: number;
  taxAmountMonthlyTax?: number;
  taxPeriod?: string;
  paymentDate?: string;
}): Promise<{ status: boolean; data?: CprTaxRecord; message?: string }> {
  try {
    const res = await authFetch(`/cpr-tax`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = res.data || { message: 'Failed to create CPR Tax record' };
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    return res.data;
  } catch (error) {
    console.error('Error creating CPR Tax record:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to create CPR Tax record. Please check your connection.'
    };
  }
}

// Delete a CPR Tax record
export async function deleteCprTax(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await authFetch(`/cpr-tax/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errorData = res.data || { message: 'Failed to delete CPR Tax record' };
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    return res.data;
  } catch (error) {
    console.error('Error deleting CPR Tax record:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to delete CPR Tax record. Please check your connection.'
    };
  }
}

// Update a CPR Tax record
export async function updateCprTax(id: string, data: {
  employeeId?: string;
  cnic?: string;
  name?: string;
  city?: string;
  cprNo?: string;
  carAmount?: number;
  ntn?: string;
  taxableAmountAnnual?: number;
  taxableAmountGross?: number;
  taxAmountMonthlyTax?: number;
  taxPeriod?: string;
  paymentDate?: string;
}): Promise<{ status: boolean; data?: CprTaxRecord; message?: string }> {
  try {
    const res = await authFetch(`/cpr-tax/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = res.data || { message: 'Failed to update CPR Tax record' };
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    return res.data;
  } catch (error) {
    console.error('Error updating CPR Tax record:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to update CPR Tax record. Please check your connection.'
    };
  }
}

// Queue background Excel export for CPR Tax records
export async function queueCprTaxesExport(filters?: {
  search?: string;
  month?: string;
  year?: string;
  months?: string;
}): Promise<{ status: boolean; message?: string; data?: { jobId: string } }> {
  try {
    const query = new URLSearchParams();
    if (filters?.search) query.append('search', filters.search);
    if (filters?.month) query.append('month', filters.month);
    if (filters?.year) query.append('year', filters.year);
    if (filters?.months) query.append('months', filters.months);

    const queryString = query.toString();
    const url = `/cpr-taxes/export${queryString ? `?${queryString}` : ''}`;
    const res = await authFetch(url, {
      method: 'POST',
    });
    if (!res.ok) {
      const errorData = res.data || { message: 'Failed to queue export' };
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }
    return res.data;
  } catch (error) {
    console.error('Error queuing CPR Tax export:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to queue export. Please check your connection.'
    };
  }
}
