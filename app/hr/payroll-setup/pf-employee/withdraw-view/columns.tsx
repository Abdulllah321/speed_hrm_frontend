"use client";

import { ColumnDef } from "@tanstack/react-table";
import { PFWithdrawal } from "@/lib/actions/pf-withdrawal";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export const columns: ColumnDef<PFWithdrawal>[] = [
    {
        accessorKey: "employee.employeeId",
        header: "Employee ID",
        cell: ({ row }) => (
            <div className="font-medium">{row.original.employee.employeeId}</div>
        ),
    },
    {
        accessorKey: "employee.employeeName",
        header: "Employee Name",
        cell: ({ row }) => (
            <div className="font-medium">{row.original.employee.employeeName}</div>
        ),
    },
    {
        accessorKey: "employee.department.name",
        header: "Department",
        cell: ({ row }) => row.original.employee.department.name,
    },
    {
        accessorKey: "employee.subDepartment.name",
        header: "Sub Department",
        cell: ({ row }) => row.original.employee.subDepartment?.name || "N/A",
    },
    {
        accessorKey: "withdrawalAmount",
        header: "Withdrawal Amount",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("withdrawalAmount"));
            const formatted = new Intl.NumberFormat("en-PK", {
                style: "currency",
                currency: "PKR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(amount);
            return <div className="text-right font-bold">{formatted}</div>;
        },
    },
    {
        accessorKey: "monthYear",
        header: "Month/Year",
        cell: ({ row }) => {
            const [year, month] = row.getValue<string>("monthYear").split("-");
            const monthNames = [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
            ];
            return `${monthNames[parseInt(month) - 1]} ${year}`;
        },
    },
    {
        accessorKey: "withdrawalDate",
        header: "Withdrawal Date",
        cell: ({ row }) => {
            const date = new Date(row.getValue("withdrawalDate"));
            return format(date, "dd MMM yyyy");
        },
    },
    {
        accessorKey: "approvalStatus",
        header: "Approval Status",
        cell: ({ row }) => {
            const status = row.getValue<string>("approvalStatus");
            const variant =
                status === "approved"
                    ? "default"
                    : status === "rejected"
                        ? "destructive"
                        : "secondary";
            return (
                <Badge variant={variant} className="capitalize">
                    {status}
                </Badge>
            );
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue<string>("status");
            const variant =
                status === "processed"
                    ? "default"
                    : status === "cancelled"
                        ? "destructive"
                        : "secondary";
            return (
                <Badge variant={variant} className="capitalize">
                    {status}
                </Badge>
            );
        },
    },
];
