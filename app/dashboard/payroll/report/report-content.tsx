"use client";

import { useState, useTransition, useMemo } from "react";
import DataTable from "@/components/common/data-table";
import { columns, type PayrollReportRow } from "./columns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { Printer, Download, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getPayrollReport } from "@/lib/actions/payroll";
import { Department, SubDepartment, getSubDepartmentsByDepartment } from "@/lib/actions/department";
import { EmployeeDropdownOption } from "@/lib/actions/employee";
import { Autocomplete } from "@/components/ui/autocomplete";

interface ReportContentProps {
    initialDepartments: Department[];
    initialEmployees: EmployeeDropdownOption[];
}

export function ReportContent({ initialDepartments, initialEmployees }: ReportContentProps) {
    const [isPending, startTransition] = useTransition();
    const [data, setData] = useState<PayrollReportRow[]>([]);
    const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
    const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);

    const [filters, setFilters] = useState({
        departmentId: "all",
        subDepartmentId: "all",
        monthYear: format(new Date(), "yyyy-MM"),
        employeeId: "all",
    });

    const filteredEmployees = useMemo(() => {
        let result = initialEmployees;
        if (filters.departmentId !== "all") {
            result = result.filter(e => e.departmentId === filters.departmentId);
        }
        if (filters.subDepartmentId !== "all") {
            result = result.filter(e => e.subDepartmentId === filters.subDepartmentId);
        }
        return result;
    }, [filters.departmentId, filters.subDepartmentId, initialEmployees]);

    const handleDepartmentChange = async (val: string) => {
        setFilters(prev => ({ ...prev, departmentId: val, subDepartmentId: "all", employeeId: "all" }));
        if (val !== "all") {
            setLoadingSubDepartments(true);
            try {
                const result = await getSubDepartmentsByDepartment(val);
                if (result.status && result.data) {
                    setSubDepartments(result.data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingSubDepartments(false);
            }
        } else {
            setSubDepartments([]);
        }
    };

    const handleSearch = () => {
        startTransition(async () => {
            const [year, month] = filters.monthYear.split("-");
            const result = await getPayrollReport({
                month,
                year,
                departmentId: filters.departmentId,
                subDepartmentId: filters.subDepartmentId,
                employeeId: filters.employeeId,
            });

            if (result.status && result.data) {
                setData(result.data);
                if (result.data.length === 0) {
                    toast.info("No records found for the selected filters.");
                }
            } else {
                toast.error(result.message || "Failed to fetch report");
            }
        });
    };

    const totals = useMemo(() => {
        return data.reduce((acc, curr) => {
            const rowGross = Number(curr.grossSalary || 0) + Number(curr.totalAllowances || 0);
            const rowDeductions =
                Number(curr.totalDeductions || 0) +
                Number(curr.attendanceDeduction || 0) +
                Number(curr.loanDeduction || 0) +
                Number(curr.advanceSalaryDeduction || 0) +
                Number(curr.eobiDeduction || 0) +
                Number(curr.providentFundDeduction || 0) +
                Number(curr.taxDeduction || 0);

            return {
                grossSalary: acc.grossSalary + rowGross,
                netSalary: acc.netSalary + Number(curr.netSalary || 0),
                totalDeductions: acc.totalDeductions + rowDeductions,
                taxDeduction: acc.taxDeduction + Number(curr.taxDeduction || 0),
            };
        }, { grossSalary: 0, netSalary: 0, totalDeductions: 0, taxDeduction: 0 });
    }, [data]);

    const handlePrint = () => {
        if (data.length === 0) {
            toast.error("No data to print");
            return;
        }
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const printContent = `
      <html>
        <head>
          <title>Payroll Report - ${filters.monthYear}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 9px; margin: 10px; }
            h1 { text-align: center; font-size: 14px; margin-bottom: 10px; }
            .header-info { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 4px; text-align: left; vertical-align: top; font-size: 8px; }
            th { background-color: #4f46e5; color: white; font-weight: bold; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .bg-gray { background-color: #f3f4f6; }
            .bg-green { background-color: #dcfce7; }
            .section-header { background-color: #e5e7eb; font-weight: bold; }
            .breakup-item { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 2px 0; }
            .breakup-label { font-weight: 500; }
            .breakup-value { text-align: right; }
            .total-row { background-color: #fef3c7; font-weight: bold; }
            .net-salary { color: #16a34a; font-weight: bold; font-size: 10px; }
            .deduction { color: #dc2626; }
            @media print {
              body { margin: 0; }
              @page { size: landscape; margin: 5mm; }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <span>${new Date().toLocaleDateString()}</span>
            <span>Payroll Report - ${filters.monthYear}</span>
          </div>
          <h1>Payroll Report - ${filters.monthYear}</h1>
          <table>
            <thead>
              <tr>
                <th style="width: 3%">S.No</th>
                <th style="width: 12%">Employee</th>
                <th style="width: 15%">Emp Details</th>
                <th style="width: 18%">Salary/Allowances</th>
                <th style="width: 12%">Tax</th>
                <th style="width: 15%">Deductions</th>
                <th style="width: 8%">Net Salary</th>
                <th style="width: 10%">Account No</th>
                <th style="width: 7%">Payment Mode</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((row, i) => {
            const salaryBreakup = row.salaryBreakup || [];
            const allowanceBreakup = row.allowanceBreakup || [];
            const totalGross = Number(row.grossSalary || 0) + Number(row.totalAllowances || 0);
            const totalDed = Number(row.totalDeductions || 0) + Number(row.attendanceDeduction || 0) +
                Number(row.loanDeduction || 0) + Number(row.advanceSalaryDeduction || 0) +
                Number(row.eobiDeduction || 0) + Number(row.providentFundDeduction || 0) +
                Number(row.taxDeduction || 0);

            return `
                <tr>
                  <td>${i + 1}</td>
                  <td><b>(${row.employee.employeeId}) ${row.employee.employeeName}</b></td>
                  <td>
                    <div><b>Country:</b> ${row.employee.country?.name || '-'}</div>
                    <div><b>Province:</b> ${row.employee.state?.name || '-'}</div>
                    <div><b>City:</b> ${row.employee.city?.name || '-'}</div>
                    <div><b>Station:</b> ${row.employee.branch?.name || '-'}</div>
                    <div><b>Dept:</b> ${row.employee.department?.name || '-'}</div>
                    <div><b>Sub-Dept:</b> ${row.employee.subDepartment?.name || '-'}</div>
                    <div><b>Designation:</b> ${row.employee.designation?.name || '-'}</div>
                  </td>
                  <td>
                    ${salaryBreakup.map((b: any) => `<div class="breakup-item"><span class="breakup-label">${b.name}:</span><span class="breakup-value">${Number(b.amount).toLocaleString()}</span></div>`).join('')}
                    <div class="section-header" style="margin-top: 4px; border-top: 1px solid #999;"><b>Gross:</b> ${Number(row.grossSalary).toLocaleString()}</div>
                    ${allowanceBreakup.map((a: any) => `<div class="breakup-item"><span class="breakup-label">${a.name}:</span><span class="breakup-value">${Number(a.amount).toLocaleString()}</span></div>`).join('')}
                    <div class="total-row" style="margin-top: 4px; border-top: 2px solid #333;"><b>Total Gross:</b> ${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </td>
                  <td>
                    <div><b>Taxable:</b> ${Number(row.taxBreakup?.taxableIncome || 0).toLocaleString()}</div>
                    <div><b>Annual Tax:</b> ${(Number(row.taxDeduction || 0) * 12).toLocaleString()}</div>
                    <div><b>Rebate:</b> ${Number(row.taxBreakup?.totalRebate || 0).toLocaleString()}</div>
                    <div class="section-header" style="margin-top: 4px; border-top: 1px solid #999;"><b>Monthly Tax:</b> ${Number(row.taxDeduction).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </td>
                  <td>
                    <div><b>PF:</b> ${Number(row.providentFundDeduction || 0).toLocaleString()}</div>
                    <div><b>Advance:</b> ${Number(row.advanceSalaryDeduction || 0).toLocaleString()}</div>
                    <div><b>EOBI:</b> ${Number(row.eobiDeduction || 0).toLocaleString()}</div>
                    <div><b>Loan:</b> ${Number(row.loanDeduction || 0).toLocaleString()}</div>
                    <div><b>Attendance:</b> ${Number(row.attendanceDeduction || 0).toLocaleString()}</div>
                    <div class="total-row deduction" style="margin-top: 4px; border-top: 1px solid #999;"><b>Total:</b> ${totalDed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </td>
                  <td class="net-salary">${Number(row.netSalary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>${row.accountNumber || '-'}</td>
                  <td>${row.paymentMode || 'Bank Transfer'}</td>
                </tr>
              `}).join('')}
              <tr class="font-bold bg-green">
                <td colspan="3" class="text-right"><b>Grand Total:</b></td>
                <td><b>${totals.grossSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td>
                <td><b>${totals.taxDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td>
                <td><b>${totals.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td>
                <td class="net-salary"><b>${totals.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    };

    const handleExportCSV = () => {
        if (data.length === 0) return;
        const headers = ["S.No", "Employee ID", "Employee Name", "Department", "Designation", "Gross Salary", "Tax", "Deductions", "Net Salary"];
        const rows = data.map((row, i) => [
            i + 1,
            `"${row.employee.employeeId}"`,
            `"${row.employee.employeeName}"`,
            `"${row.employee.department.name}"`,
            `"${row.employee.designation.name}"`,
            row.grossSalary,
            row.taxDeduction,
            row.totalDeductions,
            row.netSalary,
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `payroll-report-${filters.monthYear}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>View Payroll Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Autocomplete
                                options={initialDepartments.map(d => ({ value: d.id, label: d.name }))}
                                value={filters.departmentId}
                                onValueChange={handleDepartmentChange}
                                placeholder="All Departments"
                                searchPlaceholder="Search department..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Sub Department</Label>
                            <Autocomplete
                                options={subDepartments.map(d => ({ value: d.id, label: d.name }))}
                                value={filters.subDepartmentId}
                                onValueChange={(val) => setFilters(p => ({ ...p, subDepartmentId: val || "all", employeeId: "all" }))}
                                disabled={filters.departmentId === "all" || loadingSubDepartments}
                                placeholder="All Sub Departments"
                                searchPlaceholder="Search sub department..."
                                isLoading={loadingSubDepartments}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Employee</Label>
                            <Autocomplete
                                options={filteredEmployees.map(e => ({ value: e.id, label: `(${e.employeeId}) ${e.employeeName}` }))}
                                value={filters.employeeId}
                                onValueChange={(val) => setFilters(p => ({ ...p, employeeId: val || "all" }))}
                                placeholder="All Employees"
                                searchPlaceholder="Search employee..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Month/Year</Label>
                            <MonthYearPicker
                                value={filters.monthYear}
                                onChange={(val) => setFilters(p => ({ ...p, monthYear: Array.isArray(val) ? val[0] : val }))}
                            />
                        </div>

                        <div className="flex items-end gap-2">
                            <Button onClick={handleSearch} disabled={isPending} className="w-full">
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                                Search
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" /> Print
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportCSV}>
                            <Download className="w-4 h-4 mr-2" /> Export CSV
                        </Button>
                    </div>

                    <div className="">
                        <DataTable
                            columns={columns}
                            data={data}
                            searchFields={[{ key: "employee.employeeName", label: "Employee Name" }]}
                            tableId="report-content"
                        />
                    </div>

                    {data.length > 0 && (
                        <div className="mt-4 p-4 bg-gray-50 border rounded-md grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Gross</p>
                                <p className="text-xl font-bold">
                                    {totals.grossSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Tax</p>
                                <p className="text-xl font-bold text-destructive">
                                    {totals.taxDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Deductions</p>
                                <p className="text-xl font-bold text-destructive">
                                    {totals.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Net Payout</p>
                                <p className="text-xl font-bold text-green-600">
                                    {totals.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
