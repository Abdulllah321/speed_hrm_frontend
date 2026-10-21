"use client";

import { ColumnDef } from "@tanstack/react-table";

export type RawPayrollDetailRecord = {
  id: string;
  employeeId: string;
  taxDeduction: number;
  payroll: {
    month: string;
    year: string;
  };
  employee: {
    id: string;
    employeeId: string;
    employeeName: string;
    cnicNumber?: string | null;
    department?: { name: string } | null;
    subDepartment?: { name: string } | null;
    designation?: { name: string } | null;
  };
};

export type PivotedTaxReportRow = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  cnicNumber: string;
  department: string;
  subDepartment: string;
  designation: string;
  monthlyTaxes: Record<string, number>;
  totalTax: number;
};

export const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const getPeriodColumnTitle = (periodKey: string, allPeriods: string[]) => {
  const [year, month] = periodKey.split("-");
  const monthIdx = parseInt(month, 10) - 1;
  const monthShort = monthNames[monthIdx]?.toUpperCase() || month;

  const years = new Set(allPeriods.map((p) => p.split("-")[0]));
  if (years.size > 1) {
    return `Tax Deduction (PKR) ${monthShort} ${year}`;
  }
  return `Tax Deduction (PKR) ${monthShort}`;
};

export function getPivotedColumns(
  distinctPeriods: string[],
): ColumnDef<PivotedTaxReportRow>[] {
  const baseCols: ColumnDef<PivotedTaxReportRow>[] = [
    {
      id: "sNo",
      header: "S.No",
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.index + 1}
        </span>
      ),
    },
    {
      accessorKey: "employeeCode",
      header: "Emp ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-foreground">
          {row.original.employeeCode || "—"}
        </span>
      ),
    },
    {
      accessorKey: "employeeName",
      header: "Employee Name",
      cell: ({ row }) => (
        <div className="font-medium text-sm text-foreground whitespace-nowrap">
          {row.original.employeeName || "—"}
        </div>
      ),
    },
    {
      accessorKey: "cnicNumber",
      header: "CNIC",
      cell: ({ row }) => (
        <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
          {row.original.cnicNumber || "—"}
        </span>
      ),
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => {
        const dept = row.original.department;
        const subDept = row.original.subDepartment;
        return (
          <div className="text-xs">
            <span className="font-medium text-foreground">{dept || "—"}</span>
            {subDept && (
              <span className="block text-[11px] text-muted-foreground">
                {subDept}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "designation",
      header: "Designation",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {row.original.designation || "—"}
        </span>
      ),
    },
  ];

  // Dynamic Month Tax Columns
  const monthCols: ColumnDef<PivotedTaxReportRow>[] = distinctPeriods.map(
    (periodKey) => {
      const headerTitle = getPeriodColumnTitle(periodKey, distinctPeriods);
      return {
        id: `tax_${periodKey}`,
        header: () => (
          <div className="text-right whitespace-nowrap font-semibold">
            {headerTitle}
          </div>
        ),
        cell: ({ row }) => {
          const val = row.original.monthlyTaxes[periodKey];
          if (val === undefined || val === null) {
            return (
              <div className="text-right font-mono text-xs text-muted-foreground">
                —
              </div>
            );
          }
          return (
            <div
              className={`text-right font-mono text-xs font-semibold ${
                val > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground"
              }`}
            >
              {val > 0 ? val.toFixed(2) : "0.00"}
            </div>
          );
        },
      };
    },
  );

  // Total column if multiple months are selected
  const totalCol: ColumnDef<PivotedTaxReportRow>[] =
    distinctPeriods.length > 1
      ? [
          {
            id: "totalTax",
            header: () => (
              <div className="text-right whitespace-nowrap font-bold text-foreground">
                Total Tax (PKR)
              </div>
            ),
            cell: ({ row }) => {
              const total = row.original.totalTax;
              return (
                <div className="text-right font-mono text-xs font-bold text-rose-700 dark:text-rose-300">
                  {total.toFixed(2)}
                </div>
              );
            },
          },
        ]
      : [];

  return [...baseCols, ...monthCols, ...totalCol];
}
