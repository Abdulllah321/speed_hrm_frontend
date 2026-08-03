"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Printer, FileSpreadsheet, ArrowUpRight, ArrowDownRight, Users, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { getPayrollReconciliation } from "@/lib/actions/payroll";
import { format } from "date-fns";
import { MonthYearPicker } from "@/components/ui/month-year-picker";

export function ReconciliationContent() {
    const [isPending, startTransition] = useTransition();
    const [monthYear, setMonthYear] = useState(format(new Date(), "yyyy-MM"));
    const [data, setData] = useState<any>(null);

    const loadData = (mY: string) => {
        const [year, month] = mY.split("-");
        startTransition(async () => {
            const res = await getPayrollReconciliation(month, year);
            if (res.status) {
                setData(res.data);
            } else {
                toast.error(res.message || "Failed to load reconciliation report");
            }
        });
    };

    useEffect(() => {
        loadData(monthYear);
    }, []);

    const handleSearch = () => {
        loadData(monthYear);
    };

    const handleExportExcel = () => {
        const [year, month] = monthYear.split("-");
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
        // Trigger direct browser download from backend excel export endpoint
        window.open(`${backendUrl}/api/payroll/reconciliation/excel?month=${month}&year=${year}`, "_blank");
    };

    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (val?: number) => {
        if (val === undefined || val === null) return "0";
        return new Intl.NumberFormat("en-PK", {
            maximumFractionDigits: 0,
        }).format(val);
    };

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Payroll Reconciliation Report
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Comprehensive M-1 vs Month M baseline, joiners, exiters, incentives & deductions reconciliation.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handlePrint} className="gap-2">
                        <Printer className="h-4 w-4" />
                        Print Report
                    </Button>
                    <Button onClick={handleExportExcel} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <FileSpreadsheet className="h-4 w-4" />
                        Export Excel
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="print:hidden border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                    <div className="w-64">
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Select Month & Year</label>
                        <MonthYearPicker
                            value={monthYear}
                            onChange={(val) => setMonthYear(val)}
                        />
                    </div>
                    <div className="pt-5">
                        <Button onClick={handleSearch} disabled={isPending} className="gap-2">
                            <Search className="h-4 w-4" />
                            {isPending ? "Loading..." : "Generate Report"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Info Banner if payroll has not been generated */}
            {data && (!data.hasCurrentPayroll || !data.hasPrevPayroll) && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 p-3 rounded-lg text-xs font-medium flex items-center gap-2 print:hidden">
                    <span className="font-bold">Notice:</span>
                    {!data.hasCurrentPayroll && !data.hasPrevPayroll ? (
                        <span>No saved payroll records found in system for both {data.currentMonthLabel} and {data.prevMonthLabel}. Generate payroll first to populate records.</span>
                    ) : !data.hasCurrentPayroll ? (
                        <span>No saved payroll record found for {data.currentMonthLabel}. Current month numbers will show 0 until payroll is generated.</span>
                    ) : (
                        <span>No saved payroll record found for previous month ({data.prevMonthLabel}). Previous month numbers show 0.</span>
                    )}
                </div>
            )}

            {/* Summary Cards */}

            {data && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
                    <Card className="border-l-4 border-l-blue-500 shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Current Net Payable ({data.currentMonthLabel})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                PKR {formatCurrency(data.netPayable?.currentAmount)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-slate-400 shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Previous Net Payable ({data.prevMonthLabel})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-xl font-bold text-slate-700 dark:text-slate-300">
                                PKR {formatCurrency(data.netPayable?.prevAmount)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Incoming Employees
                            </CardTitle>
                            <UserPlus className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                {data.incomingEmployees?.list?.length || 0} Employees
                            </div>
                            <p className="text-xs text-muted-foreground">
                                +PKR {formatCurrency(data.incomingEmployees?.totalAmount)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-rose-500 shadow-sm">
                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Left / Resigned Employees
                            </CardTitle>
                            <UserMinus className="h-4 w-4 text-rose-500" />
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
                                {data.leftEmployees?.list?.length || 0} Employees
                            </div>
                            <p className="text-xs text-muted-foreground">
                                -PKR {formatCurrency(data.leftEmployees?.totalAmount)}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Reconciliation Report Document View */}
            {data && (
                <Card className="shadow-lg border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-8">
                    {/* Excel Sheet Header */}
                    <div className="text-center space-y-1 pb-6 border-b border-slate-300 dark:border-slate-800">
                        <h2 className="text-xl font-black tracking-wide uppercase">SPEED (PRIVATE LIMITED)</h2>
                        <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 uppercase">SUMMARY OF PAYROLL RECONCILIATION</h3>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase">FOR {data.currentMonthLabel}</p>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto mt-6">
                        <table className="w-full text-xs text-left border-collapse border border-slate-300 dark:border-slate-800">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-800">
                                    <th className="p-2 border border-slate-300 dark:border-slate-800 font-bold uppercase w-[40%]">DESCRIPTION</th>
                                    <th className="p-2 border border-slate-300 dark:border-slate-800 font-bold uppercase w-[10%] text-center">V.NO</th>
                                    <th className="p-2 border border-slate-300 dark:border-slate-800 font-bold uppercase w-[12%] text-center">CHEQUE NO</th>
                                    <th className="p-2 border border-slate-300 dark:border-slate-800 font-bold uppercase w-[10%] text-center">DATE</th>
                                    <th className="p-2 border border-slate-300 dark:border-slate-800 font-bold uppercase w-[14%] text-right">CURRENT MONTH</th>
                                    <th className="p-2 border border-slate-300 dark:border-slate-800 font-bold uppercase w-[14%] text-right">PREVIOUS MONTH</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {/* Base Payroll */}
                                <tr className="bg-slate-50 dark:bg-slate-900/50 font-bold">
                                    <td className="p-2 border border-slate-300 dark:border-slate-800">{data.basePayroll?.prevMonthName}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.basePayroll?.currentAmount)}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.basePayroll?.prevAmount)}</td>
                                </tr>

                                {/* Left Employees */}
                                {data.leftEmployees?.list?.length > 0 && (
                                    <>
                                        {data.leftEmployees.list.map((emp: any, idx: number) => (
                                            <tr key={idx} className="text-rose-700 dark:text-rose-400">
                                                <td className="p-2 border border-slate-300 dark:border-slate-800 pl-6">Less: {emp.name}</td>
                                                <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                                <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                                <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                                <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">({formatCurrency(emp.amount)})</td>
                                                <td className="p-2 border border-slate-300 dark:border-slate-800 text-right"></td>
                                            </tr>
                                        ))}
                                    </>
                                )}

                                {/* Previous Month Incentive Row */}
                                {data.incentives?.prevMonthIncentive && (
                                    <tr className="font-semibold text-slate-800 dark:text-slate-200">
                                        <td className="p-2 border border-slate-300 dark:border-slate-800">{data.incentives.prevMonthIncentive.label}</td>
                                        <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                        <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                        <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                        <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.incentives.prevMonthIncentive.currentAmount)}</td>
                                        <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.incentives.prevMonthIncentive.prevAmount)}</td>
                                    </tr>
                                )}

                                {/* Incoming Employees Header */}
                                <tr className="bg-slate-100 dark:bg-slate-900 font-bold">
                                    <td colSpan={6} className="p-2 border border-slate-300 dark:border-slate-800 uppercase">ADD : INCOMING EMPLOYEES/INCREMENTS</td>
                                </tr>
                                {data.incomingEmployees?.list?.length > 0 ? (
                                    data.incomingEmployees.list.map((emp: any, idx: number) => (
                                        <tr key={idx} className="text-emerald-700 dark:text-emerald-400">
                                            <td className="p-2 border border-slate-300 dark:border-slate-800 pl-6">{emp.name}</td>
                                            <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                            <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                            <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                            <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(emp.amount)}</td>
                                            <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(emp.amount)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="p-2 border border-slate-300 dark:border-slate-800 text-muted-foreground pl-6 italic">No new incoming employees this month.</td>
                                    </tr>
                                )}

                                {/* Current Month Incentive Row */}
                                {data.incentives?.currentMonthIncentive && (
                                    <tr className="font-semibold text-slate-800 dark:text-slate-200">
                                        <td className="p-2 border border-slate-300 dark:border-slate-800">{data.incentives.currentMonthIncentive.label}</td>
                                        <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                        <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                        <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                        <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.incentives.currentMonthIncentive.currentAmount)}</td>
                                        <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.incentives.currentMonthIncentive.prevAmount)}</td>
                                    </tr>
                                )}


                                {/* Deductions Header */}
                                <tr className="bg-slate-100 dark:bg-slate-900 font-bold">
                                    <td colSpan={6} className="p-2 border border-slate-300 dark:border-slate-800 uppercase">LESS: DEDUCTION MADE DURING THE MONTH</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 pl-6">LEAVE WITHOUT PAY attendence</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.deductions?.lwp?.currentAmount)}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.deductions?.lwp?.prevAmount)}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 pl-6">INCOME TAX-SALARY</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.deductions?.taxSalary?.currentAmount)}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.deductions?.taxSalary?.prevAmount)}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 pl-6">ADVANCE SALARY</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.deductions?.advanceSalary?.currentAmount)}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.deductions?.advanceSalary?.prevAmount)}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 pl-6">LOAN TO EMPLOYEES</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.deductions?.loanToEmployees?.currentAmount)}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.deductions?.loanToEmployees?.prevAmount)}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 pl-6">PROVIDENT FUND</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.deductions?.providentFund?.currentAmount)}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.deductions?.providentFund?.prevAmount)}</td>
                                </tr>
                                <tr className="font-extrabold bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 uppercase">TOTAL DEDUCTIONS</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.deductions?.totalDeductions?.currentAmount)}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.deductions?.totalDeductions?.prevAmount)}</td>
                                </tr>


                                {/* Net Payable */}
                                <tr className="font-black text-sm bg-slate-100 dark:bg-slate-900">
                                    <td className="p-2.5 border border-slate-300 dark:border-slate-800 uppercase">NET PAYABLE</td>
                                    <td className="p-2.5 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2.5 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2.5 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2.5 border border-slate-300 dark:border-slate-800 text-right text-blue-700 dark:text-blue-400">{formatCurrency(data.netPayable?.currentAmount)}</td>
                                    <td className="p-2.5 border border-slate-300 dark:border-slate-800 text-right text-blue-700 dark:text-blue-400">{formatCurrency(data.netPayable?.prevAmount)}</td>
                                </tr>

                                {/* Statutory Section */}
                                <tr className="bg-slate-100 dark:bg-slate-900 font-bold">
                                    <td colSpan={6} className="p-2 border border-slate-300 dark:border-slate-800 uppercase">STATUTORY & EMPLOYER CONTRIBUTIONS</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 pl-6">EOBI CONTRIBUTION COMPANY</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.statutory?.eobiCompany?.currentAmount)}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.statutory?.eobiCompany?.prevAmount)}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 pl-6">EOBI CONTRIBUTION EMPLOYEE</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.statutory?.eobiEmployee?.currentAmount)}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.statutory?.eobiEmployee?.prevAmount)}</td>
                                </tr>

                                <tr className="font-semibold bg-slate-50 dark:bg-slate-900/40">
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 font-bold">TOTAL EOBI</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-center font-bold">CHQ #</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right font-bold">{formatCurrency(data.statutory?.totalEobi?.currentAmount)}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right font-bold">{formatCurrency(data.statutory?.totalEobi?.prevAmount)}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 pl-6">PROVIDENT FUND-CO'S CONT.</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.statutory?.pfCompany?.currentAmount)}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.statutory?.pfCompany?.prevAmount)}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 pl-6">PROVIDENT FUND-EMPLOYEES CONT.</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.statutory?.pfEmployee?.currentAmount)}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right">{formatCurrency(data.statutory?.pfEmployee?.prevAmount)}</td>
                                </tr>
                                <tr className="font-semibold bg-slate-50 dark:bg-slate-900/40">
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 font-bold">TOTAL P.F.</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-center font-bold">CHQ #</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right font-bold">{formatCurrency(data.statutory?.totalPf?.currentAmount)}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right font-bold">{formatCurrency(data.statutory?.totalPf?.prevAmount)}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 font-bold">INCOME TAX</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-center font-bold">CHQ #</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-center font-semibold">Advice</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800"></td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right font-bold">{formatCurrency(data.statutory?.incomeTax?.currentAmount)}</td>
                                    <td className="p-2 border border-slate-300 dark:border-slate-800 text-right font-bold">{formatCurrency(data.statutory?.incomeTax?.prevAmount)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Sign-off Footer */}
                    <div className="mt-16 pt-8 border-t border-slate-300 dark:border-slate-800 grid grid-cols-3 gap-8 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                        <div>
                            <div className="border-b border-slate-400 w-32 mx-auto mb-2"></div>
                            Prepared by
                        </div>
                        <div>
                            <div className="border-b border-slate-400 w-32 mx-auto mb-2"></div>
                            Checked by
                        </div>
                        <div>
                            <div className="border-b border-slate-400 w-32 mx-auto mb-2"></div>
                            Approved by
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
