"use server";

import { getAccessToken } from "../auth";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_URL || "http://localhost:5000/api";

async function getAuthHeaders() {
  const token = await getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export interface SocialSecurityEmployee {
  id: string;
  registrationNumber: string;
  baseSalary: string | number; // Decimal from prisma might be string or number
  monthlyContribution: string | number;
  status: string;
  employee: {
    id: string;
    employeeId: string;
    employeeName: string;
    department: {
      id: string;
      name: string;
    } | null;
  };
  institution: {
    id: string;
    name: string;
    code: string;
  };
}

export async function getSocialSecurityEmployees(): Promise<{ status: boolean; data?: SocialSecurityEmployee[]; message?: string }> {
  try {
    const headers = await getAuthHeaders();

    const [registrationsResponse, contributionsResponse] = await Promise.all([
      fetch(`${API_URL}/social-security-employee-registrations`, {
        method: "GET",
        headers,
        cache: "no-store",
      }),
      fetch(`${API_URL}/social-security-contributions`, {
        method: "GET",
        headers,
        cache: "no-store",
      }),
    ]);

    if (!registrationsResponse.ok) {
      const errorData = await registrationsResponse
        .json()
        .catch(() => ({ message: "Failed to fetch Social Security employees" }));
      return {
        status: false,
        message: errorData.message || `HTTP error! status: ${registrationsResponse.status}`,
      };
    }

    const registrationsResult = await registrationsResponse.json();
    const registrations: SocialSecurityEmployee[] = registrationsResult.data || [];

    let contributions: any[] = [];
    if (contributionsResponse.ok) {
      const contributionsResult = await contributionsResponse.json().catch(() => ({ data: [] }));
      contributions = contributionsResult.data || [];
    }

    const latestContributionByRegistration = new Map<string, any>();
    for (const contrib of contributions) {
      const registrationId = contrib.employeeRegistrationId as string | undefined;
      if (!registrationId) continue;
      const existing = latestContributionByRegistration.get(registrationId);
      if (!existing) {
        latestContributionByRegistration.set(registrationId, contrib);
        continue;
      }
      const existingDate = new Date(existing.date || existing.createdAt);
      const currentDate = new Date(contrib.date || contrib.createdAt);
      if (currentDate > existingDate) {
        latestContributionByRegistration.set(registrationId, contrib);
      }
    }

    const enrichedRegistrations = registrations.map((reg) => {
      const contrib = latestContributionByRegistration.get(reg.id);
      if (!contrib) return reg;
      return {
        ...reg,
        monthlyContribution: contrib.contributionAmount,
      };
    });

    return { status: true, data: enrichedRegistrations };
  } catch (error) {
    console.error("Error fetching Social Security employees:", error);
    return {
      status: false,
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
