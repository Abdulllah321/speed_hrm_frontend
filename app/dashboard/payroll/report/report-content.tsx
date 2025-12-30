"use client";

import { useState, useTransition, useMemo } from "react";
import DataTable from "@/components/common/data-table";
import { columns, type PayrollReportRow } from "./columns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { Printer, Download, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getPayrollReport } from "@/lib/actions/payroll";
import { Department, SubDepartment, getSubDepartmentsByDepartment } from "@/lib/actions/department";
import { EmployeeDropdownOption } from "@/lib/actions/employee";

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
        return data.reduce((acc, curr) => ({
            grossSalary: acc.grossSalary + (curr.grossSalary || 0),
            netSalary: acc.netSalary + (curr.netSalary || 0),
            totalDeductions: acc.totalDeductions + (curr.totalDeductions || 0),
            taxDeduction: acc.taxDeduction + (curr.taxDeduction || 0),
        }), { grossSalary: 0, netSalary: 0, totalDeductions: 0, taxDeduction: 0 });
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
            body { font-family: sans-serif; font-size: 10px; margin: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 5px; text-align: left; vertical-align: top; }
            th { background-color: #f0f0f0; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .bg-gray { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>Payroll Report - ${filters.monthYear}</h1>
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Employee</th>
                <th>Details</th>
                <th>Salary/Allowances</th>
                <th>Tax</th>
                <th>Deductions</th>
                <th>Net Salary</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((row, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><b>${row.employee.employeeName}</b><br/>${row.employee.employeeId}</td>
                  <td>
                    Dept: ${row.employee.department.name}<br/>
                    Desig: ${row.employee.designation.name}
                  </td>
                  <td>
                    Gross: ${row.grossSalary.toLocaleString()}<br/>
                    Basic: ${row.basicSalary.toLocaleString()}
                  </td>
                  <td>Monthly: ${row.taxDeduction.toLocaleString()}</td>
                  <td>Total: ${row.totalDeductions.toLocaleString()}</td>
                  <td class="font-bold">${row.netSalary.toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="font-bold bg-gray">
                <td colspan="3" class="text-right">Grand Total:</td>
                <td>${totals.grossSalary.toLocaleString()}</td>
                <td>${totals.taxDeduction.toLocaleString()}</td>
                <td>${totals.totalDeductions.toLocaleString()}</td>
                <td>${totals.netSalary.toLocaleString()}</td>
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
                            <Select value={filters.departmentId} onValueChange={handleDepartmentChange}>
                                <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {initialDepartments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Sub Department</Label>
                            <Select
                                value={filters.subDepartmentId}
                                onValueChange={(val) => setFilters(p => ({ ...p, subDepartmentId: val, employeeId: "all" }))}
                                disabled={filters.departmentId === "all" || loadingSubDepartments}
                            >
                                <SelectTrigger><SelectValue placeholder="Select Sub Department" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sub Departments</SelectItem>
                                    {subDepartments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Employee</Label>
                            <Select
                                value={filters.employeeId}
                                onValueChange={(val) => setFilters(p => ({ ...p, employeeId: val }))}
                            >
                                <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Employees</SelectItem>
                                    {filteredEmployees.map(e => <SelectItem key={e.id} value={e.id}>({e.employeeId}) {e.employeeName}</SelectItem>)}
                                </SelectContent>
                            </Select>
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
                        />
                    </div>

                    {data.length > 0 && (
                        <div className="mt-4 p-4 bg-gray-50 border rounded-md grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Gross</p>
                                <p className="text-xl font-bold">{totals.grossSalary.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Tax</p>
                                <p className="text-xl font-bold text-destructive">{totals.taxDeduction.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Deductions</p>
                                <p className="text-xl font-bold text-destructive">{totals.totalDeductions.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Net Payout</p>
                                <p className="text-xl font-bold text-green-600">{totals.netSalary.toLocaleString()}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
