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

export interface PFEmployee {
    id: string;
    employeeId: string;
    employeeName: string;
    department: string;
    subDepartment: string;
    designation: string;
    employeeContribution: number;
    employerContribution: number;
    totalPFBalance: number;
    lastContributionMonth: string;
    totalMonths: number;
}

// Get all PF employees with their balances
export async function getPFEmployees(): Promise<{ status: boolean; data?: PFEmployee[]; message?: string }> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/pf/employees`, {
            method: 'GET',
            headers,
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to fetch PF employees' }));
            return { status: false, message: errorData.message || `HTTP error! status: ${response.status}` };
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error fetching PF employees:', error);
        return {
            status: false,
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
        };
    }
}
