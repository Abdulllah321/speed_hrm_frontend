"use client";

import { ColumnDef } from "@tanstack/react-table";
import { PFEmployee } from "@/lib/actions/pf-employee";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<PFEmployee>[] = [
    {
        accessorKey: "employeeId",
        header: "Employee ID",
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue("employeeId")}</div>
        ),
    },
    {
        accessorKey: "employeeName",
        header: "Employee Name",
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue("employeeName")}</div>
        ),
    },
    {
        accessorKey: "department",
        header: "Department",
    },
    {
        accessorKey: "subDepartment",
        header: "Sub Department",
    },
    {
        accessorKey: "designation",
        header: "Designation",
    },
    {
        accessorKey: "employeeContribution",
        header: "Employee Contribution",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("employeeContribution"));
            const formatted = new Intl.NumberFormat("en-PK", {
                style: "currency",
                currency: "PKR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(amount);
            return <div className="text-right font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: "employerContribution",
        header: "Employer Contribution",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("employerContribution"));
            const formatted = new Intl.NumberFormat("en-PK", {
                style: "currency",
                currency: "PKR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(amount);
            return <div className="text-right font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: "totalPFBalance",
        header: "Total PF Balance",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("totalPFBalance"));
            const formatted = new Intl.NumberFormat("en-PK", {
                style: "currency",
                currency: "PKR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(amount);
            return (
                <div className="text-right font-bold text-green-600">{formatted}</div>
            );
        },
    },
    {
        accessorKey: "lastContributionMonth",
        header: "Last Contribution",
        cell: ({ row }) => (
            <Badge variant="outline">{row.getValue("lastContributionMonth")}</Badge>
        ),
    },
    {
        accessorKey: "totalMonths",
        header: "Total Months",
        cell: ({ row }) => (
            <div className="text-center">
                <Badge variant="secondary">{row.getValue("totalMonths")}</Badge>
            </div>
        ),
    },
];
