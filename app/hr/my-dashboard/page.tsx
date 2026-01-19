"use client";

import { EmployeeDashboardContent } from "@/components/dashboard/employee-dashboard-content";

export default function MyDashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-muted-foreground hidden">My Dashboard</h1>
            </div>
            <EmployeeDashboardContent />
        </div>
    );
}
