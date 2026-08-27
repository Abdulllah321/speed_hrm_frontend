'use server';

import { authFetch } from '@/lib/auth';

export interface EOBIEmployee {
    id: string;
    employeeId: string;
    employeeName: string;
    eobiRegion?: string | null;
    department: string;
    subDepartment: string;
    designation: string;
    employeeContribution: number;
    employerContribution: number;
    totalEOBIBalance: number;
    totalWithdrawn: number;
    availableBalance: number;
    lastContributionMonth: string;
    totalMonths: number;
    selectedMonthEmployeeContribution?: number;
    selectedMonthEmployerContribution?: number;
    selectedMonthTotalContribution?: number;
    hasContributionInSelectedMonth?: boolean;
}

export interface EOBIRegionStat {
    count: number;
    employeeContribution: number;
    employerContribution: number;
    totalContribution: number;
    totalBalance: number;
    selectedMonthTotal: number;
    employeeMonthlyRate: number;
    employerMonthlyRate: number;
}

export interface EOBIAvailableMonth {
    month: string;
    year: string;
    monthYear: string;
}

export interface EOBIEmployeesResponse {
    status: boolean;
    data?: EOBIEmployee[];
    availableMonths?: EOBIAvailableMonth[];
    regionBreakdown?: Record<string, EOBIRegionStat>;
    message?: string;
}

export interface EOBIFilters {
    month?: string;
    year?: string;
    region?: string;
    departmentId?: string;
}

// Get all EOBI employees with their balances and optional month/region filters
export async function getEOBIEmployees(filters?: EOBIFilters): Promise<EOBIEmployeesResponse> {
    try {
        const queryParams = new URLSearchParams();
        if (filters?.month) queryParams.append('month', filters.month);
        if (filters?.year) queryParams.append('year', filters.year);
        if (filters?.region && filters.region !== 'all') queryParams.append('region', filters.region);
        if (filters?.departmentId && filters.departmentId !== 'all') queryParams.append('departmentId', filters.departmentId);

        const url = `/eobi/employees${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await authFetch(url, {
            method: 'GET',
        });

        const result = response.data;

        if (!response.ok) {
            return {
                status: false,
                message: result.message || `HTTP error! status: ${response.status}`
            };
        }

        return result;
    } catch (error) {
        console.error('Error fetching EOBI employees:', error);
        return {
            status: false,
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
        };
    }
}

// Get single employee EOBI balance
export async function getEmployeeEOBIBalance(employeeId: string): Promise<{
    status: boolean;
    data?: { totalEOBIBalance: number; totalWithdrawn: number; availableBalance: number };
    message?: string;
}> {
    try {
        const result = await getEOBIEmployees();
        if (!result.status || !result.data) {
            return { status: false, message: result.message };
        }
        const employee = result.data.find((e) => e.id === employeeId);
        if (!employee) {
            return { status: false, message: 'Employee not found' };
        }
        return {
            status: true,
            data: {
                totalEOBIBalance: employee.totalEOBIBalance,
                totalWithdrawn: employee.totalWithdrawn,
                availableBalance: employee.availableBalance,
            },
        };
    } catch (error) {
        return {
            status: false,
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
        };
    }
}

// Recalculate EOBI contributions based on employee profiles
export async function recalculateEOBIContributions(month?: string, year?: string): Promise<{
    status: boolean;
    message?: string;
    updatedCount?: number;
}> {
    try {
        const response = await authFetch(`/eobi/recalculate-contributions`, {
            method: 'POST',
            body: JSON.stringify({ month, year }),
        });

        if (!response.ok) {
            const errorData = response.data || { message: "Failed to recalculate EOBI rates" };
            return { status: false, message: errorData.message || `HTTP error! status: ${response.status}` };
        }

        return response.data;
    } catch (error) {
        console.error('Error recalculating EOBI contributions:', error);
        return {
            status: false,
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
        };
    }
}
