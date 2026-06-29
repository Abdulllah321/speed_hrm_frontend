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
import { MultiSelect } from "@/components/ui/multi-select";
import { useEmployeeDropdown } from "@/hooks/use-employee-dropdown";
import { getAllEmployeesForDropdown } from "@/lib/actions/employee";
import { type Location } from "@/lib/actions/location";
import { Autocomplete } from "@/components/ui/autocomplete";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ReportContentProps {
    initialDepartments: Department[];
    initialLocations: Location[];
}

export function ReportContent({ initialDepartments, initialLocations }: ReportContentProps) {
    const { user, isAdmin, hasPermission } = useAuth();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [data, setData] = useState<PayrollReportRow[]>([]);
    const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
    const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);

    // If user is not admin and doesn't have create permission, redirect or restrict view
    const canViewAll = isAdmin() || hasPermission("payroll.create");

    useEffect(() => {
        // Double protection: If user shouldn't be here, redirect them to Payslips
        if (user && !canViewAll) {
            router.push("/hr/payroll-setup/payroll/payslips");
        }
    }, [user, canViewAll, router]);

    const [filters, setFilters] = useState({
        departmentId: "all",
        subDepartmentId: "all",
        locationId: "all",
        monthYear: format(new Date(), "yyyy-MM"),
    });

    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [loadingEmployeesForLocation, setLoadingEmployeesForLocation] = useState(false);
    const [locations] = useState<Location[]>(initialLocations);

    const { totalCount, isInitialLoading, multiSelectProps } = useEmployeeDropdown({
        departmentId: filters.departmentId,
        subDepartmentId: filters.subDepartmentId,
        locationId: filters.locationId,
        selectedIds: selectedEmployeeIds,
    });

    // Fetch and select all employees for selected location
    useEffect(() => {
        const selectAllEmployeesForLocation = async () => {
            if (filters.locationId && filters.locationId !== "all") {
                setLoadingEmployeesForLocation(true);
                try {
                    const result = await getAllEmployeesForDropdown({
                        locationId: filters.locationId,
                        departmentId: filters.departmentId !== "all" ? filters.departmentId : undefined,
                        subDepartmentId: filters.subDepartmentId !== "all" ? filters.subDepartmentId : undefined,
                    });
                    if (result.status && result.data) {
                        const ids = result.data.map(emp => emp.id);
                        setSelectedEmployeeIds(ids);
                    }
                } catch (error) {
                    console.error("Failed to select employees for location:", error);
                } finally {
                    setLoadingEmployeesForLocation(false);
                }
            } else {
                setSelectedEmployeeIds([]);
            }
        };

        selectAllEmployeesForLocation();
    }, [filters.locationId, filters.departmentId, filters.subDepartmentId]);

    const handleDepartmentChange = async (val: string) => {
        setFilters(prev => ({ ...prev, departmentId: val, subDepartmentId: "all" }));
        setSelectedEmployeeIds([]);
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
            if (!filters.monthYear) {
                toast.error("Please select a month/year");
                return;
            }

            // Enforce employee restriction in search
            const effectiveEmployeeId = !canViewAll && user?.employeeId 
                ? user.employeeId 
                : (selectedEmployeeIds.length > 0 ? selectedEmployeeIds.join(",") : "all");
            
            try {
                const [year, month] = filters.monthYear.split("-");
                const result = await getPayrollReport({
                    month,
                    year,
                    departmentId: filters.departmentId,
                    subDepartmentId: filters.subDepartmentId,
                    employeeId: effectiveEmployeeId,
                    locationId: filters.locationId,
                });

                if (result.status && result.data) {
                    // Double check data filtering on client side
                    const filteredData = !canViewAll && user?.employeeId
                        ? result.data.filter(row => row.employee?.id === user.employeeId || row.employeeId === user.employeeId)
                        : result.data;
                    
                    setData(filteredData);
                    
                    if (filteredData.length === 0) {
                        toast.info("No records found for the selected filters.");
                    } else {
                        toast.success(`Found ${filteredData.length} records`);
                    }
                } else {
                    console.error("Failed to fetch data:", result.message);
                    toast.error("Failed to fetch report data");
                    setData([]);
                }
            } catch (error) {
                console.error("Search error:", error);
                toast.error("Failed to fetch report data");
                setData([]);
            }
        });
    };

    const totals = useMemo(() => {
        return data.reduce((acc, curr) => {
            const rowGross = Number(curr.grossSalary || 0);
            const deductionBreakupTotal = (curr.deductionBreakup || []).reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);
            const rowDeductions =
                Number(curr.attendanceDeduction || 0) +
                Number(curr.loanDeduction || 0) +
                Number(curr.advanceSalaryDeduction || 0) +
                Number(curr.providentFundDeduction || 0) +
                Number(curr.taxDeduction || 0) +
                deductionBreakupTotal;

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

        // Calculate totals for specific items
        let basicSalaryTotal = 0;
        let utilityTotal = 0;
        let houseRentTotal = 0;
        let pfTotal = 0;
        let taxTotal = 0;

        data.forEach(row => {
            // Basic Salary
            const basicObj = (row.salaryBreakup || []).find((b: any) => 
                b.name.toLowerCase().includes("basic")
            );
            if (basicObj) basicSalaryTotal += Number(basicObj.amount || 0);

            // Utility
            const utilityObj = (row.salaryBreakup || []).find((b: any) => 
                b.name.toLowerCase().includes("utility")
            ) || (row.allowanceBreakup || []).find((a: any) => 
                a.name.toLowerCase().includes("utility")
            );
            if (utilityObj) utilityTotal += Number(utilityObj.amount || 0);

            // House Rent
            const hrObj = (row.salaryBreakup || []).find((b: any) => 
                b.name.toLowerCase().includes("house rent") || b.name.toLowerCase() === "hra"
            ) || (row.allowanceBreakup || []).find((a: any) => 
                a.name.toLowerCase().includes("house rent") || a.name.toLowerCase() === "hra"
            );
            if (hrObj) houseRentTotal += Number(hrObj.amount || 0);

            // PF
            pfTotal += Number(row.providentFundDeduction || 0);

            // Tax
            taxTotal += Number(row.taxDeduction || 0);
        });

        const selectedLocationName = filters.locationId === "all" 
            ? "All Locations" 
            : locations.find(l => l.id === filters.locationId)?.name || "";

        const getFormattedMonthYear = (monthYearStr: string) => {
            if (!monthYearStr) return "";
            try {
                const [year, month] = monthYearStr.split("-");
                const date = new Date(Number(year), Number(month) - 1, 1);
                return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            } catch (e) {
                return monthYearStr;
            }
        };
        const formattedMonthYear = getFormattedMonthYear(filters.monthYear);

        const printContent = `
      <html>
        <head>
          <title>Payroll Report - ${filters.monthYear}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 9px; margin: 10px; }
            h2 { text-align: center; font-size: 14px; margin-bottom: 5px; }
            h3 { text-align: center; font-size: 11px; margin-bottom: 5px; }
            h4 { text-align: center; font-size: 10px; margin-bottom: 10px; }
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
              @page { size: A4 portrait; margin: 8mm; }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <span>${new Date().toLocaleDateString()}</span>
            <span>Payroll Report - ${filters.monthYear}</span>
          </div>
          
          <div style="text-align: center; margin-bottom: 15px;">
            <h2 style="margin: 0; font-size: 15px; font-weight: bold; text-transform: uppercase;">SPEED (PRIVATE) LIMITED</h2>
            <h3 style="margin: 5px 0 0 0; font-size: 12px; font-weight: normal;">Salary Sheet for the Month of ${formattedMonthYear}</h3>
            ${selectedLocationName ? `<h4 style="margin: 3px 0 0 0; font-size: 10px; font-weight: normal; color: #555;"><b>Location:</b> ${selectedLocationName}</h4>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%">S.No</th>
                <th style="width: 25%">Employee</th>
                <th style="width: 35%">Salary/Allowances</th>
                <th style="width: 20%">Deductions</th>
                <th style="width: 15%">Net Salary</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((row, i) => {
            const salaryBreakup = row.salaryBreakup || [];
            const allowanceBreakup = row.allowanceBreakup || [];
            const deductionBreakup = row.deductionBreakup || [];
            const deductionBreakupTotal = deductionBreakup.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);
            const totalGross = Number(row.grossSalary || 0);
            const totalDed = Number(row.attendanceDeduction || 0) +
                Number(row.loanDeduction || 0) + Number(row.advanceSalaryDeduction || 0) +
                Number(row.providentFundDeduction || 0) +
                Number(row.taxDeduction || 0) + deductionBreakupTotal;

            return `
                <tr>
                  <td>${i + 1}</td>
                  <td><b>(${row.employee.employeeId}) ${row.employee.employeeName}</b></td>
                  <td>
                    ${salaryBreakup.map((b: any) => `<div class="breakup-item"><span class="breakup-label">${b.name}:</span><span class="breakup-value">${Math.round(Number(b.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>`).join('')}
                    ${allowanceBreakup.map((a: any) => `<div class="breakup-item"><span class="breakup-label">${a.name}:</span><span class="breakup-value">${Math.round(Number(a.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>`).join('')}
                    ${Number(row.overtimeAmount || 0) > 0 ? `<div class="breakup-item"><span class="breakup-label">Overtime:</span><span class="breakup-value">${Math.round(Number(row.overtimeAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>` : ''}
                    ${row.bonusBreakup && row.bonusBreakup.length > 0 ?
                      row.bonusBreakup.map((b: any) => `<div class="breakup-item"><span class="breakup-label">${b.name || 'Bonus'}:</span><span class="breakup-value">${Math.round(Number(b.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>`).join('')
                      : (Number(row.bonusAmount || 0) > 0 ? `<div class="breakup-item"><span class="breakup-label">Bonus:</span><span class="breakup-value">${Math.round(Number(row.bonusAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>` : '')}
                    ${Number(row.leaveEncashmentAmount || 0) > 0 ? `<div class="breakup-item"><span class="breakup-label">Leave Encashment:</span><span class="breakup-value">${Math.round(Number(row.leaveEncashmentAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>` : ''}
                    <div class="total-row breakup-item" style="margin-top: 4px; border-top: 2px solid #333; padding: 2px 0;">
                      <span class="breakup-label">Gross:</span>
                      <span class="breakup-value">${Math.round(totalGross).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                  </td>
                  <td>
                    <div class="breakup-item"><span class="breakup-label">PF:</span><span class="breakup-value">${Math.round(Number(row.providentFundDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>
                    <div class="breakup-item"><span class="breakup-label">Advance:</span><span class="breakup-value">${Math.round(Number(row.advanceSalaryDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>
                    <div class="breakup-item"><span class="breakup-label">Loan:</span><span class="breakup-value">${Math.round(Number(row.loanDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>
                    ${Number(row.taxDeduction || 0) > 0 ? `<div class="breakup-item"><span class="breakup-label">Tax:</span><span class="breakup-value">${Math.round(Number(row.taxDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>` : ''}
                    ${deductionBreakup.map((d: any) => `<div class="breakup-item"><span class="breakup-label">${d.name}:</span><span class="breakup-value">${Math.round(Number(d.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>`).join('')}
                    <div class="breakup-item"><span class="breakup-label">Attendance:</span><span class="breakup-value">${Math.round(Number(row.attendanceDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>
                    <div class="total-row deduction breakup-item" style="margin-top: 4px; border-top: 1px solid #999; padding: 2px 0;">
                      <span class="breakup-label">Total:</span>
                      <span class="breakup-value">${Math.round(totalDed).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                  </td>
                  <td class="net-salary text-right">${Math.round(Number(row.netSalary || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                </tr>
              `}).join('')}
              <tr class="font-bold bg-green">
                <td colspan="2" class="text-right"><b>Grand Total:</b></td>
                <td class="text-right"><b>${Math.round(totals.grossSalary).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</b></td>
                <td class="text-right"><b>${Math.round(totals.totalDeductions).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</b></td>
                <td class="net-salary text-right"><b>${Math.round(totals.netSalary).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</b></td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 20px; display: flex; justify-content: flex-end; page-break-inside: avoid;">
            <div class="summary-box" style="width: 250px; border: 1px solid #ccc; padding: 10px; background-color: #f9fafb;">
              <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 11px; border-bottom: 1px solid #ddd; padding-bottom: 4px; text-align: left;">Grand Summary</h3>
              <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 4px;">
                <span><b>Basic Salary:</b></span>
                <span>${Math.round(basicSalaryTotal).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 4px;">
                <span><b>House Rent:</b></span>
                <span>${Math.round(houseRentTotal).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 4px;">
                <span><b>Utility:</b></span>
                <span>${Math.round(utilityTotal).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 4px;">
                <span><b>PF:</b></span>
                <span>${Math.round(pfTotal).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 4px;">
                <span><b>Tax:</b></span>
                <span>${Math.round(taxTotal).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 9px; margin-top: 8px; border-top: 2px solid #333; padding-top: 4px; font-weight: bold;">
                <span>Total:</span>
                <span>${Math.round(basicSalaryTotal + houseRentTotal + utilityTotal + pfTotal + taxTotal).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 60px; display: flex; justify-content: space-between; font-size: 10px; padding: 0 20px; page-break-inside: avoid;">
            <div style="text-align: center; width: 180px;">
              <div style="border-top: 1px solid #000; margin-bottom: 5px;"></div>
              <b>Prepared By</b>
            </div>
            <div style="text-align: center; width: 180px;">
              <div style="border-top: 1px solid #000; margin-bottom: 5px;"></div>
              <b>Checked By</b>
            </div>
            <div style="text-align: center; width: 180px;">
              <div style="border-top: 1px solid #000; margin-bottom: 5px;"></div>
              <b>Approved By</b>
            </div>
          </div>
        </body>
      </html>
    `;
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    };

    const handleExportCSV = async () => {
        if (data.length === 0) {
            toast.error("No data to export");
            return;
        }

        try {
            toast.info("Fetching all records for export...");

            // Fetch ALL records matching current filters for the selected month
            const [year, month] = filters.monthYear.split("-");
            const result = await getPayrollReport({
                month,
                year,
                departmentId: filters.departmentId !== "all" ? filters.departmentId : undefined,
                subDepartmentId: filters.subDepartmentId !== "all" ? filters.subDepartmentId : undefined,
                employeeId: selectedEmployeeIds.length > 0 ? selectedEmployeeIds.join(",") : undefined,
                locationId: filters.locationId !== "all" ? filters.locationId : undefined,
            });

            if (!result.status || !result.data || result.data.length === 0) {
                toast.error("No records found to export");
                return;
            }

            const exportData = result.data as PayrollReportRow[];

            // 1. Identify all dynamic columns
            const salaryHeads = new Set<string>();
            const allowanceHeads = new Set<string>();
            const bonusHeads = new Set<string>();
            const deductionHeads = new Set<string>();

            exportData.forEach(row => {
                (row.salaryBreakup || []).forEach(b => salaryHeads.add(b.name));
                (row.allowanceBreakup || []).forEach(a => allowanceHeads.add(a.name));
                (row.bonusBreakup || []).forEach(b => bonusHeads.add(b.name));
                (row.deductionBreakup || []).forEach(d => deductionHeads.add(d.name));
            });

            const sortedSalaryHeads = Array.from(salaryHeads).sort();
            const sortedAllowanceHeads = Array.from(allowanceHeads).sort();
            const sortedBonusHeads = Array.from(bonusHeads).sort();
            const sortedDeductionHeads = Array.from(deductionHeads).sort();

            // 2. Generate Headers
            const staticHeadersPre = [
                "S.No", "Employee ID", "Employee Name", "Month", "Year", "Department", "Sub-Department", "Designation",
                "Country", "Province", "City", "Station"
            ];

            const staticHeadersPost = [
                "Leave Encashment",
                "Gross Salary",
                "Taxable Income",
                "Tax Deduction",
                "PF Deduction",
                "Loan Deduction",
                "Advance Salary Deduction",
                "Attendance Deduction",
                "Net Salary",
                "Bank Name",
                "Account No",
                "Payment Mode"
            ];

            const headers = [
                ...staticHeadersPre,
                ...sortedSalaryHeads.map(h => `Salary: ${h}`),
                ...sortedAllowanceHeads.map(h => `Allowance: ${h}`),
                ...sortedBonusHeads.map(h => `Bonus: ${h}`),
                ...sortedDeductionHeads.map(h => `Deduction: ${h}`),
                ...staticHeadersPost
            ];

            // 3. Generate Rows
            const rows = exportData.map((row, i) => {
                const emp = row.employee;

                // Helper to get component amount
                const getAmount = (list: any[], name: string) => {
                    const found = list.find(item => item.name === name);
                    return found ? Number(found.amount || 0) : 0;
                };

                const dynamicValues = [
                    ...sortedSalaryHeads.map(h => getAmount(row.salaryBreakup || [], h)),
                    ...sortedAllowanceHeads.map(h => getAmount(row.allowanceBreakup || [], h)),
                    ...sortedBonusHeads.map(h => getAmount(row.bonusBreakup || [], h)),
                    ...sortedDeductionHeads.map(h => getAmount(row.deductionBreakup || [], h))
                ];

                return [
                    i + 1,
                    `"${emp.employeeId}"`,
                    `"${emp.employeeName}"`,
                    `"${row.payroll?.month || ""}"`,
                    `"${row.payroll?.year || ""}"`,
                    `"${emp.department?.name || ""}"`,
                    `"${emp.subDepartment?.name || ""}"`,
                    `"${emp.designation?.name || ""}"`,
                    `"${emp.country?.name || ""}"`,
                    `"${emp.state?.name || ""}"`,
                    `"${emp.city?.name || ""}"`,
                    `"${emp.branch?.name || ""}"`,
                    ...dynamicValues,
                    Number(row.leaveEncashmentAmount || 0),
                    Number(row.grossSalary || 0),
                    Number(row.taxBreakup?.taxableIncome || 0),
                    Number(row.taxDeduction || 0),
                    Number(row.providentFundDeduction || 0),
                    Number(row.loanDeduction || 0),
                    Number(row.advanceSalaryDeduction || 0),
                    Number(row.attendanceDeduction || 0),
                    Number(row.netSalary || 0),
                    `"${row.bankName || ""}"`,
                    `"${row.accountNumber || ""}"`,
                    `"${row.paymentMode || "Bank Transfer"}"`
                ];
            });

            const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            
            // Generate filename based on selected month
            link.download = `payroll-report-${filters.monthYear}-detailed.csv`;
            link.click();

            toast.success(`Exported ${exportData.length} records successfully`);
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export records");
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>View Payroll Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {canViewAll && (
                            <>
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
                                        onValueChange={(val) => {
                                            setFilters(p => ({ ...p, subDepartmentId: val || "all" }));
                                            setSelectedEmployeeIds([]);
                                        }}
                                        disabled={filters.departmentId === "all" || loadingSubDepartments}
                                        placeholder="All Sub Departments"
                                        searchPlaceholder="Search sub department..."
                                        isLoading={loadingSubDepartments}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Location</Label>
                                    <Select
                                        value={filters.locationId}
                                        onValueChange={(val) => setFilters(prev => ({ ...prev, locationId: val }))}
                                        disabled={isPending}
                                    >
                                        <SelectTrigger id="location">
                                            <SelectValue placeholder="Select Location" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Locations</SelectItem>
                                            {locations.map((loc) => (
                                                <SelectItem key={loc.id} value={loc.id}>
                                                    {loc.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        <div className="space-y-2">
                            <Label>Month/Year</Label>
                            <MonthYearPicker
                                value={filters.monthYear}
                                onChange={(val) => setFilters(p => ({ ...p, monthYear: val as string }))}
                                multiple={false}
                                placeholder="Select month and year"
                            />
                        </div>
                    </div>

                    {canViewAll && (
                        <div className="space-y-2">
                            <Label htmlFor="employee">Select Employees (Optional)</Label>
                            {isInitialLoading || loadingEmployeesForLocation ? (
                                <div className="h-10 bg-muted rounded-md animate-pulse flex items-center justify-center text-sm text-muted-foreground">
                                    Loading employees...
                                </div>
                            ) : (
                                <MultiSelect
                                    options={multiSelectProps.options}
                                    value={selectedEmployeeIds}
                                    onValueChange={setSelectedEmployeeIds}
                                    onSearch={multiSelectProps.onSearch}
                                    onLoadMore={multiSelectProps.onLoadMore}
                                    hasMore={multiSelectProps.hasMore}
                                    isLoading={multiSelectProps.isLoading}
                                    placeholder="Select specific employees..."
                                    searchPlaceholder="Search by name or employee ID..."
                                    emptyMessage={multiSelectProps.isLoading ? "Loading employees..." : "No employees found"}
                                    disabled={isPending}
                                    showSelectAll={false}
                                />
                            )}
                            <p className="text-sm text-muted-foreground">
                                {selectedEmployeeIds.length > 0
                                    ? `${selectedEmployeeIds.length} employees selected`
                                    : `All ${totalCount} employees in filter`}
                            </p>
                        </div>
                    )}

                    <div className="flex justify-between items-center gap-2 pt-2">
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrint}>
                                <Printer className="w-4 h-4 mr-2" /> Print
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleExportCSV}>
                                <Download className="w-4 h-4 mr-2" /> Export CSV
                            </Button>
                        </div>
                        <Button onClick={handleSearch} disabled={isPending} className="w-48">
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                            Search
                        </Button>
                    </div>

                    <div className="">
                        <DataTable
                            columns={columns}
                            data={data}
                            searchFields={[{ key: "employee.employeeName", label: "Employee Name" }]}
                            tableId="report-content"
                            canBulkEdit={false}
                            canBulkDelete={false}
                        />
                    </div>

                    {data.length > 0 && (
                        <div className="mt-4 p-4 bg-gray-50 border rounded-md grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Gross</p>
                                <p className="text-xl font-bold">
                                    {Math.round(totals.grossSalary).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Tax</p>
                                <p className="text-xl font-bold text-destructive">
                                    {Math.round(totals.taxDeduction).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Deductions</p>
                                <p className="text-xl font-bold text-destructive">
                                    {Math.round(totals.totalDeductions).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Net Payout</p>
                                <p className="text-xl font-bold text-green-600">
                                    {Math.round(totals.netSalary).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
