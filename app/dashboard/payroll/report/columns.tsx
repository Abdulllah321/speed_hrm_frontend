"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export type PayrollReportRow = {
    id: string;
    employeeId: string;
    employee: {
        employeeId: string;
        employeeName: string;
        department: { name: string };
        subDepartment: { name: string } | null;
        designation: { name: string };
        country: { name: string };
        state: { name: string };
        city: { name: string };
        branch: { name: string };
    };
    basicSalary: number;
    totalAllowances: number;
    totalDeductions: number;
    attendanceDeduction: number;
    loanDeduction: number;
    advanceSalaryDeduction: number;
    eobiDeduction: number;
    providentFundDeduction: number;
    taxDeduction: number;
    overtimeAmount: number;
    bonusAmount: number;
    leaveEncashmentAmount: number;
    grossSalary: number;
    netSalary: number;
    salaryBreakup: any[];
    allowanceBreakup: any[];
    deductionBreakup: any[];
    taxBreakup: any;
    attendanceBreakup: any;
    overtimeBreakup: any[];
    bonusBreakup: any[];
    incrementBreakup: any[];
    accountNumber: string | null;
    bankName: string | null;
    paymentMode: string | null;
    paymentStatus: string;
    payroll: {
        month: string;
        year: string;
    };
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

export const columns: ColumnDef<PayrollReportRow>[] = [
    {
        header: "S.No",
        cell: ({ row }) => row.index + 1,
    },
    {
        accessorKey: "employee.employeeName",
        header: "Employee",
        cell: ({ row }) => (
            <div className="min-w-[120px]">
                <div className="font-bold text-sm">({row.original.employee.employeeId}) {row.original.employee.employeeName}</div>
            </div>
        ),
    },
    {
        header: "Emp Details",
        cell: ({ row }) => {
            const emp = row.original.employee;
            return (
                <div className="text-[10px] space-y-0.5 min-w-[150px]">
                    <div className="grid grid-cols-2">
                        <span className="font-bold">Country:</span>
                        <span>{emp.country?.name}</span>
                    </div>
                    <div className="grid grid-cols-2">
                        <span className="font-bold">Province:</span>
                        <span>{emp.state?.name}</span>
                    </div>
                    <div className="grid grid-cols-2">
                        <span className="font-bold">City:</span>
                        <span>{emp.city?.name}</span>
                    </div>
                    <div className="grid grid-cols-2">
                        <span className="font-bold">Station:</span>
                        <span>{emp.branch?.name}</span>
                    </div>
                    <div className="grid grid-cols-2">
                        <span className="font-bold">Dept:</span>
                        <span>{emp.department?.name}</span>
                    </div>
                    <div className="grid grid-cols-2">
                        <span className="font-bold">Sub-Dept:</span>
                        <span>{emp.subDepartment?.name || "-"}</span>
                    </div>
                    <div className="grid grid-cols-2">
                        <span className="font-bold">Designation:</span>
                        <span>{emp.designation?.name}</span>
                    </div>
                </div>
            );
        },
    },
    {
        header: "Salary/Allowances",
        cell: ({ row }) => {
            const data = row.original;
            return (
                <div className="text-[10px] space-y-0.5 min-w-[150px]">
                    {data.salaryBreakup?.map((b: any) => (
                        <div key={b.id} className="grid grid-cols-2">
                            <span className="font-bold">{b.name}:</span>
                            <span className="text-right">{Math.round(Number(b.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                    ))}
                    {data.allowanceBreakup?.map((a: any) => (
                        <div key={a.id} className="grid grid-cols-2">
                            <span className="font-bold">{a.name}:</span>
                            <span className="text-right">{Math.round(Number(a.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                    ))}
                    {data.overtimeAmount > 0 && (
                        <div className="grid grid-cols-2">
                            <span className="font-bold">Overtime:</span>
                            <span className="text-right">{Math.round(Number(data.overtimeAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                    )}
                    {data.bonusAmount > 0 && (
                        <div className="grid grid-cols-2">
                            <span className="font-bold">Bonus:</span>
                            <span className="text-right">{Math.round(Number(data.bonusAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                    )}
                    {data.leaveEncashmentAmount > 0 && (
                        <div className="grid grid-cols-2">
                            <span className="font-bold">Leave Encashment:</span>
                            <span className="text-right">{Math.round(Number(data.leaveEncashmentAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                    )}
                    <div className="border-t border-gray-200 mt-1 pt-1 font-bold bg-gray-50 grid grid-cols-2">
                        <span>Gross:</span>
                        <span className="text-right">
                            {Math.round(Number(data.grossSalary || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>
            );
        },
    },
    {
        header: "Tax",
        cell: ({ row }) => {
            const tax = row.original.taxBreakup;
            const annualTax = (tax?.monthlyTax || 0) * 12;
            return (
                <div className="text-[10px] space-y-0.5 min-w-[120px]">
                    <div className="grid grid-cols-2">
                        <span className="font-bold">Taxable:</span>
                        <span className="text-right">{Math.round(Number(tax?.taxableIncome || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}</span>
                    </div>
                    {tax?.fixedAmountTax > 0 && (
                        <div className="grid grid-cols-2">
                            <span className="font-bold">Fixed Tax:</span>
                            <span className="text-right">{Math.round(Number(tax?.fixedAmountTax || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}</span>
                        </div>
                    )}
                    {tax?.percentageTax > 0 && (
                        <div className="grid grid-cols-2">
                            <span className="font-bold">% Tax:</span>
                            <span className="text-right">{Math.round(Number(tax?.percentageTax || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}</span>
                        </div>
                    )}
                    <div className="grid grid-cols-2">
                        <span className="font-bold">Annual Tax:</span>
                        <span className="text-right">{Math.round(Number(annualTax || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}</span>
                    </div>
                    <div className="grid grid-cols-2">
                        <span className="font-bold">Rebate:</span>
                        <span className="text-right">{Math.round(Number(tax?.totalRebate || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}</span>
                    </div>
                    <div className="grid grid-cols-2 font-bold border-t pt-1 bg-gray-50">
                        <span>Monthly Tax:</span>
                        <span className="text-right">
                            {Math.round(Number(row.original.taxDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>
            );
        },
    },
    {
        header: "Deductions",
        cell: ({ row }) => {
            const data = row.original;
            const deductionBreakupTotal = (data.deductionBreakup || []).reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);
            return (
                <div className="text-[10px] space-y-0.5 min-w-[120px]">
                    <div className="grid grid-cols-2">
                        <span className="font-bold">PF:</span>
                        <span className="text-right">{Math.round(Number(data.providentFundDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="grid grid-cols-2">
                        <span className="font-bold">Advance:</span>
                        <span className="text-right">{Math.round(Number(data.advanceSalaryDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="grid grid-cols-2">
                        <span className="font-bold">EOBI:</span>
                        <span className="text-right">{Math.round(Number(data.eobiDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="grid grid-cols-2">
                        <span className="font-bold">Loan:</span>
                        <span className="text-right">{Math.round(Number(data.loanDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                    {data.deductionBreakup?.map((d: any) => (
                        <div key={d.id} className="grid grid-cols-2">
                            <span className="font-bold">{d.name}:</span>
                            <span className="text-right">{Math.round(Number(d.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                    ))}
                    <div className="grid grid-cols-2">
                        <span className="font-bold">Attendance:</span>
                        <span className="text-right">{Math.round(Number(data.attendanceDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="border-t border-gray-200 mt-1 pt-1 font-bold bg-gray-50 grid grid-cols-2">
                        <span>Total:</span>
                        <span className="text-right">
                            {Math.round(
                                Number(data.attendanceDeduction || 0) +
                                Number(data.loanDeduction || 0) +
                                Number(data.advanceSalaryDeduction || 0) +
                                Number(data.eobiDeduction || 0) +
                                Number(data.providentFundDeduction || 0) +
                                Number(data.taxDeduction || 0) +
                                deductionBreakupTotal
                            ).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "netSalary",
        header: "Net Salary",
        cell: ({ row }) => (
            <div className="font-bold text-green-600">
                {Math.round(Number(row.original.netSalary || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
        ),
    },
    {
        accessorKey: "accountNumber",
        header: "Account No",
    },
    {
        accessorKey: "paymentMode",
        header: "Payment Mode",
    },
];
