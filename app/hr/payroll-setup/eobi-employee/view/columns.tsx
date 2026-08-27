"use client";

import { ColumnDef } from "@tanstack/react-table";
import { EOBIEmployee } from "@/lib/actions/eobi-employee";
import { Badge } from "@/components/ui/badge";

const formatPKR = (amount: number) =>
    new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);

export function getColumns(isMonthlyView: boolean, selectedMonthLabel?: string): ColumnDef<EOBIEmployee>[] {
    const getRegionBadge = (region?: string | null) => {
        const r = region || "Punjab";
        if (r.toLowerCase() === "islamabad") {
            return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200">Islamabad</Badge>;
        }
        if (r.toLowerCase() === "sindh") {
            return <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200">Sindh</Badge>;
        }
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200">Punjab</Badge>;
    };

    if (isMonthlyView) {
        return [
            {
                id: "serialNumber",
                header: "S.No",
                cell: ({ row }) => <div className="text-center">{row.index + 1}</div>,
            },
            {
                id: "employeeDetails",
                accessorFn: (row) => `${row.employeeName} ${row.employeeId} ${row.department} ${row.subDepartment || ''} ${row.designation || ''}`,
                header: "Employee Details",
                cell: ({ row }) => (
                    <div className="space-y-1">
                        <div className="font-semibold text-foreground">{row.original.employeeName}</div>
                        <div className="text-xs text-muted-foreground">
                            {row.original.employeeId} • {row.original.department}
                            {row.original.subDepartment ? ` (${row.original.subDepartment})` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {row.original.designation || "N/A"}
                        </div>
                    </div>
                ),
            },
            {
                accessorKey: "eobiRegion",
                header: "EOBI Region",
                cell: ({ row }) => getRegionBadge(row.original.eobiRegion),
            },
            {
                accessorKey: "selectedMonthEmployeeContribution",
                header: "Employee Contrib.",
                cell: ({ row }) => {
                    const val = row.original.selectedMonthEmployeeContribution || 0;
                    return (
                        <div className="font-medium text-slate-700 dark:text-slate-200">
                            {val > 0 ? formatPKR(val) : <span className="text-muted-foreground">-</span>}
                        </div>
                    );
                },
            },
            {
                accessorKey: "selectedMonthEmployerContribution",
                header: "Employer Contrib.",
                cell: ({ row }) => {
                    const val = row.original.selectedMonthEmployerContribution || 0;
                    return (
                        <div className="font-medium text-slate-700 dark:text-slate-200">
                            {val > 0 ? formatPKR(val) : <span className="text-muted-foreground">-</span>}
                        </div>
                    );
                },
            },
            {
                accessorKey: "selectedMonthTotalContribution",
                header: `${selectedMonthLabel || "Month"} Total`,
                cell: ({ row }) => {
                    const val = row.original.selectedMonthTotalContribution || 0;
                    const hasContrib = row.original.hasContributionInSelectedMonth;
                    return (
                        <div className="space-y-0.5">
                            <div className={`font-bold ${val > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                                {val > 0 ? formatPKR(val) : "Rs. 0"}
                            </div>
                            {hasContrib ? (
                                <Badge variant="outline" className="text-[10px] text-green-600 border-green-300 py-0">
                                    Contributed
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 py-0">
                                    No Record
                                </Badge>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: "availableBalance",
                header: "Cumulative Available",
                cell: ({ row }) => (
                    <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {formatPKR(row.original.availableBalance)}
                    </div>
                ),
            },
        ];
    }

    return [
        {
            id: "serialNumber",
            header: "S.No",
            cell: ({ row }) => <div className="text-center">{row.index + 1}</div>,
        },
        {
            id: "employeeDetails",
            accessorFn: (row) => `${row.employeeName} ${row.employeeId} ${row.department} ${row.subDepartment || ''} ${row.designation || ''}`,
            header: "Employee Details",
            cell: ({ row }) => (
                <div className="space-y-1">
                    <div className="font-medium">{row.original.employeeName}</div>
                    <div className="text-xs text-muted-foreground">
                        {row.original.employeeId} • {row.original.department}
                        {row.original.subDepartment ? ` (${row.original.subDepartment})` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">{row.original.designation || "N/A"}</div>
                </div>
            ),
        },
        {
            accessorKey: "eobiRegion",
            header: "Region",
            cell: ({ row }) => getRegionBadge(row.original.eobiRegion),
        },
        {
            accessorKey: "totalEOBIBalance",
            header: "Total Balance (Gross)",
            cell: ({ row }) => (
                <div className="font-medium text-slate-700 dark:text-slate-200">
                    {formatPKR(row.original.totalEOBIBalance)}
                </div>
            ),
        },
        {
            accessorKey: "totalWithdrawn",
            header: "Total Withdrawn",
            cell: ({ row }) => {
                const amount = row.original.totalWithdrawn;
                return (
                    <div className={`font-medium ${amount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                        {amount > 0 ? `-${formatPKR(amount)}` : formatPKR(0)}
                    </div>
                );
            },
        },
        {
            accessorKey: "availableBalance",
            header: "Available Balance",
            cell: ({ row }) => {
                const amount = row.original.availableBalance;
                return (
                    <div className={`font-bold ${amount <= 0 ? "text-red-600" : "text-green-600 dark:text-green-400"}`}>
                        {formatPKR(amount)}
                    </div>
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
            header: "Months",
            cell: ({ row }) => (
                <div className="text-center">
                    <Badge variant="secondary">{row.getValue("totalMonths")}</Badge>
                </div>
            ),
        },
    ];
}

export const columns = getColumns(false);
