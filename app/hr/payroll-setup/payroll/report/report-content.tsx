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
        monthYear: [format(new Date(), "yyyy-MM")] as string | string[],
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
            if (!filters.monthYear || (Array.isArray(filters.monthYear) && filters.monthYear.length === 0)) {
                toast.error("Please select at least one month/year");
                return;
            }

            // Enforce employee restriction in search
            const effectiveEmployeeId = !canViewAll && user?.employeeId 
                ? user.employeeId 
                : (selectedEmployeeIds.length > 0 ? selectedEmployeeIds.join(",") : "all");
            
            try {
                const monthsYears = Array.isArray(filters.monthYear)
                    ? filters.monthYear.join(",")
                    : filters.monthYear;
                const result = await getPayrollReport({
                    monthsYears,
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

        // Helper functions
        const isHouseRentHead = (name: string) => {
            const lower = name.toLowerCase();
            return lower.includes("house rent") || lower === "hra";
        };

        const isUtilityHead = (name: string) => {
            return name.toLowerCase().includes("utility");
        };

        const getBasicSalary = (row: any) => {
            const basicObj = (row.salaryBreakup || []).find((b: any) => 
                b.name.toLowerCase().includes("basic")
            );
            return basicObj ? Number(basicObj.amount || 0) : 0;
        };

        const getHouseRentAmount = (row: any) => {
            const hrObj = (row.salaryBreakup || []).find((b: any) => isHouseRentHead(b.name)) 
                || (row.allowanceBreakup || []).find((a: any) => isHouseRentHead(a.name));
            return hrObj ? Number(hrObj.amount || 0) : 0;
        };

        const getUtilityAmount = (row: any) => {
            const utObj = (row.salaryBreakup || []).find((b: any) => isUtilityHead(b.name)) 
                || (row.allowanceBreakup || []).find((a: any) => isUtilityHead(a.name));
            return utObj ? Number(utObj.amount || 0) : 0;
        };

        const getAllowanceAmount = (row: any, head: string) => {
            if (head === "Overtime") return Number(row.overtimeAmount || 0);
            if (head === "Leave Encashment") return Number(row.leaveEncashmentAmount || 0);
            if (head === "Loan Disbursed") return Number(row.loanDisbursement || 0);
            if (head === "Advance Salary Amt (+)") return Number(row.advanceSalaryDisbursement || 0);
            
            // Check in bonusBreakup first to prioritize specific named bonuses
            const hasBonusBreakup = row.bonusBreakup && row.bonusBreakup.length > 0;
            if (hasBonusBreakup) {
                const bon = row.bonusBreakup.find((b: any) => (b.name || "Bonus") === head);
                if (bon) return Number(bon.amount || 0);
            } else if (head === "Bonus") {
                return Number(row.bonusAmount || 0);
            }
            
            const sal = (row.salaryBreakup || []).find((b: any) => b.name === head);
            if (sal) return Number(sal.amount || 0);
            
            const allow = (row.allowanceBreakup || []).find((a: any) => a.name === head);
            if (allow) return Number(allow.amount || 0);

            return 0;
        };

        const getDeductionAmount = (row: any, head: string) => {
            const ded = (row.deductionBreakup || []).find((d: any) => d.name === head);
            return ded ? Number(ded.amount || 0) : 0;
        };

        // Collect dynamic headers
        const allowanceHeads = new Set<string>();
        const deductionHeads = new Set<string>();

        let hasHouseRent = false;
        let hasUtility = false;

        data.forEach(row => {
            (row.salaryBreakup || []).forEach(b => {
                if (b.name.toLowerCase().includes("basic")) return;
                if (isHouseRentHead(b.name)) {
                    hasHouseRent = true;
                    return;
                }
                if (isUtilityHead(b.name)) {
                    hasUtility = true;
                    return;
                }
                allowanceHeads.add(b.name);
            });
            (row.allowanceBreakup || []).forEach(a => {
                if (isHouseRentHead(a.name)) {
                    hasHouseRent = true;
                    return;
                }
                if (isUtilityHead(a.name)) {
                    hasUtility = true;
                    return;
                }
                allowanceHeads.add(a.name);
            });
            if (Number(row.overtimeAmount || 0) > 0) allowanceHeads.add("Overtime");
            
            // Deduplicate: If specific bonus breakup is available, use it; otherwise fall back to generic "Bonus"
            if (row.bonusBreakup && row.bonusBreakup.length > 0) {
                row.bonusBreakup.forEach(b => {
                    if (isHouseRentHead(b.name || "Bonus")) {
                        hasHouseRent = true;
                        return;
                    }
                    if (isUtilityHead(b.name || "Bonus")) {
                        hasUtility = true;
                        return;
                    }
                    allowanceHeads.add(b.name || "Bonus");
                });
            } else if (Number(row.bonusAmount || 0) > 0) {
                allowanceHeads.add("Bonus");
            }
            
            if (Number(row.leaveEncashmentAmount || 0) > 0) allowanceHeads.add("Leave Encashment");
            if (Number(row.loanDisbursement || 0) > 0) allowanceHeads.add("Loan Disbursed");
            if (Number(row.advanceSalaryDisbursement || 0) > 0) allowanceHeads.add("Advance Salary Amt (+)");

            (row.deductionBreakup || []).forEach(d => deductionHeads.add(d.name));
        });

        const sortedAllowanceHeads = Array.from(allowanceHeads).sort();
        const sortedDeductionHeads = Array.from(deductionHeads).sort();

        // Calculate totals for specific items and column-wise totals
        const columnTotals: { [key: string]: number } = {
            basicSalary: 0,
            houseRent: 0,
            utility: 0,
            grossSalary: 0,
            pf: 0,
            tax: 0,
            loan: 0,
            advance: 0,
            attendance: 0,
            totalDeductions: 0,
            netSalary: 0,
        };

        sortedAllowanceHeads.forEach(head => {
            columnTotals[`allow_${head}`] = 0;
        });
        sortedDeductionHeads.forEach(head => {
            columnTotals[`ded_${head}`] = 0;
        });

        let basicSalaryTotal = 0;
        let utilityTotal = 0;
        let houseRentTotal = 0;
        let pfTotal = 0;
        let taxTotal = 0;

        data.forEach(row => {
            const basic = getBasicSalary(row);
            columnTotals.basicSalary += basic;
            basicSalaryTotal += basic;

            const houseRent = getHouseRentAmount(row);
            columnTotals.houseRent += houseRent;
            houseRentTotal += houseRent;

            const utility = getUtilityAmount(row);
            columnTotals.utility += utility;
            utilityTotal += utility;

            sortedAllowanceHeads.forEach(head => {
                const amt = getAllowanceAmount(row, head);
                columnTotals[`allow_${head}`] += amt;
            });

            columnTotals.grossSalary += Number(row.grossSalary || 0);
            columnTotals.pf += Number(row.providentFundDeduction || 0);
            pfTotal += Number(row.providentFundDeduction || 0);
            columnTotals.tax += Number(row.taxDeduction || 0);
            taxTotal += Number(row.taxDeduction || 0);
            columnTotals.loan += Number(row.loanDeduction || 0);
            columnTotals.advance += Number(row.advanceSalaryDeduction || 0);
            columnTotals.attendance += Number(row.attendanceDeduction || 0);

            sortedDeductionHeads.forEach(head => {
                columnTotals[`ded_${head}`] += getDeductionAmount(row, head);
            });

            const deductionBreakupTotal = (row.deductionBreakup || []).reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);
            const totalDed = Number(row.attendanceDeduction || 0) +
                Number(row.loanDeduction || 0) + Number(row.advanceSalaryDeduction || 0) +
                Number(row.providentFundDeduction || 0) +
                Number(row.taxDeduction || 0) + deductionBreakupTotal;

            columnTotals.totalDeductions += totalDed;
            columnTotals.netSalary += Number(row.netSalary || 0);
        });

        const selectedLocationName = filters.locationId === "all" 
            ? "All Locations" 
            : locations.find(l => l.id === filters.locationId)?.name || "";

        const getFormattedMonthYear = (monthYearVal: string | string[]) => {
            if (!monthYearVal) return "";
            const array = Array.isArray(monthYearVal) ? monthYearVal : [monthYearVal];
            if (array.length === 0) return "";
            const formatSingle = (str: string) => {
                try {
                    const [year, month] = str.split("-");
                    const date = new Date(Number(year), Number(month) - 1, 1);
                    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                } catch (e) {
                    return str;
                }
            };
            if (array.length <= 3) {
                return array.map(formatSingle).join(", ");
            }
            return `${array.slice(0, 3).map(formatSingle).join(", ")} (+${array.length - 3} more)`;
        };
        const formattedMonthYear = getFormattedMonthYear(filters.monthYear);
        const joinedMonthYear = Array.isArray(filters.monthYear) ? filters.monthYear.join(", ") : filters.monthYear;

        const getFormattedRowMonth = (row: any) => {
            const m = row.payroll?.month;
            const y = row.payroll?.year;
            if (!m || !y) return "—";
            const monthNames = [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
            ];
            const idx = parseInt(m) - 1;
            return `${monthNames[idx] || m} ${y}`;
        };

        const printContent = `
      <html>
        <head>
          <title>Payroll Report - ${joinedMonthYear}</title>
          <style>
            @page { size: A4 portrait; margin: 4mm; }
            body { font-family: Arial, sans-serif; font-size: 7px; margin: 0; padding: 0; color: #111; width: 100%; }
            h2 { text-align: center; font-size: 11px; margin: 0 0 2px 0; font-weight: bold; }
            h3 { text-align: center; font-size: 8.5px; margin: 0 0 2px 0; font-weight: normal; }
            h4 { text-align: center; font-size: 7.5px; margin: 0 0 4px 0; font-weight: normal; color: #444; }
            .header-info { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 6.5px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; }
            th, td { border: 1px solid #444; padding: 4px 2px; text-align: left; vertical-align: middle; font-size: 5.5px; }
            th { background-color: #1e293b; color: white; font-weight: bold; text-align: center; font-size: 5.5px; text-transform: uppercase; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .bg-gray { background-color: #f1f5f9 !important; }
            .bg-green { background-color: #dcfce7 !important; }
            .no-wrap { white-space: nowrap; }
            .total-row { background-color: #fef3c7 !important; font-weight: bold; }
            .net-salary { color: #15803d; font-weight: bold; }
            .deduction { color: #b91c1c; }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <span>${new Date().toLocaleDateString()}</span>
            <span>Payroll Report - ${joinedMonthYear}</span>
          </div>
          
          <div style="text-align: center; margin-bottom: 10px;">
            <h2 style="margin: 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">SPEED (PRIVATE) LIMITED</h2>
            <h3 style="margin: 3px 0 0 0; font-size: 11px; font-weight: normal;">Salary Sheet for the Month of ${formattedMonthYear}</h3>
            ${selectedLocationName ? `<h4 style="margin: 2px 0 0 0; font-size: 9px; font-weight: normal; color: #555;"><b>Location:</b> ${selectedLocationName}</h4>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 3%">S.No</th>
                <th style="width: 8%">Month</th>
                <th style="width: 16%">Employee Name</th>
                <th style="width: 7%">Basic Salary</th>
                ${hasHouseRent ? `<th style="width: 7%">House Rent</th>` : ''}
                ${hasUtility ? `<th style="width: 7%">Utility</th>` : ''}
                <th style="width: 7%">Total Salary</th>
                ${sortedAllowanceHeads.map(head => `<th>${head}</th>`).join('')}
                <th style="width: 7%">Gross Salary</th>
                <th style="width: 5%">PF</th>
                <th style="width: 5%">Tax</th>
                <th style="width: 5%">Loan</th>
                <th style="width: 5%">Advance</th>
                <th style="width: 5%">Attendance</th>
                ${sortedDeductionHeads.map(head => `<th>${head}</th>`).join('')}
                <th style="width: 7%">Total Ded.</th>
                <th style="width: 7%">Net Salary</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((row, i) => {
                  const basic = getBasicSalary(row);
                  const houseRent = getHouseRentAmount(row);
                  const utility = getUtilityAmount(row);
                  const deductionBreakupTotal = (row.deductionBreakup || []).reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);
                  const totalDed = Number(row.attendanceDeduction || 0) +
                      Number(row.loanDeduction || 0) + Number(row.advanceSalaryDeduction || 0) +
                      Number(row.providentFundDeduction || 0) +
                      Number(row.taxDeduction || 0) + deductionBreakupTotal;

                  return `
                    <tr>
                      <td class="text-center">${i + 1}</td>
                      <td class="no-wrap">${getFormattedRowMonth(row)}</td>
                      <td class="no-wrap"><b>${row.employee?.employeeName || ''}</b></td>
                      <td class="text-right">${Math.round(basic).toLocaleString()}</td>
                      ${hasHouseRent ? `<td class="text-right">${houseRent > 0 ? Math.round(houseRent).toLocaleString() : '0'}</td>` : ''}
                      ${hasUtility ? `<td class="text-right">${utility > 0 ? Math.round(utility).toLocaleString() : '0'}</td>` : ''}
                      <td class="text-right font-bold bg-gray">${Math.round(basic + houseRent + utility).toLocaleString()}</td>
                      ${sortedAllowanceHeads.map(head => {
                          const amt = getAllowanceAmount(row, head);
                          return `<td class="text-right">${amt > 0 ? Math.round(amt).toLocaleString() : '0'}</td>`;
                      }).join('')}
                      <td class="text-right font-bold bg-gray">${Math.round(Number(row.grossSalary || 0)).toLocaleString()}</td>
                      <td class="text-right">${Number(row.providentFundDeduction || 0) > 0 ? Math.round(Number(row.providentFundDeduction || 0)).toLocaleString() : '0'}</td>
                      <td class="text-right">${Number(row.taxDeduction || 0) > 0 ? Math.round(Number(row.taxDeduction || 0)).toLocaleString() : '0'}</td>
                      <td class="text-right">${Number(row.loanDeduction || 0) > 0 ? Math.round(Number(row.loanDeduction || 0)).toLocaleString() : '0'}</td>
                      <td class="text-right">${Number(row.advanceSalaryDeduction || 0) > 0 ? Math.round(Number(row.advanceSalaryDeduction || 0)).toLocaleString() : '0'}</td>
                      <td class="text-right">${Number(row.attendanceDeduction || 0) > 0 ? Math.round(Number(row.attendanceDeduction || 0)).toLocaleString() : '0'}</td>
                      ${sortedDeductionHeads.map(head => {
                          const amt = getDeductionAmount(row, head);
                          return `<td class="text-right">${amt > 0 ? Math.round(amt).toLocaleString() : '0'}</td>`;
                      }).join('')}
                      <td class="text-right font-bold bg-gray deduction">${Math.round(totalDed).toLocaleString()}</td>
                      <td class="text-right font-bold bg-green net-salary">${Math.round(Number(row.netSalary || 0)).toLocaleString()}</td>
                    </tr>
                  `;
              }).join('')}
              <tr class="font-bold total-row">
                <td colspan="3" class="text-right"><b>Grand Total:</b></td>
                <td class="text-right"><b>${Math.round(columnTotals.basicSalary).toLocaleString()}</b></td>
                ${hasHouseRent ? `<td class="text-right"><b>${Math.round(columnTotals.houseRent).toLocaleString()}</b></td>` : ''}
                ${hasUtility ? `<td class="text-right"><b>${Math.round(columnTotals.utility).toLocaleString()}</b></td>` : ''}
                <td class="text-right"><b>${Math.round(columnTotals.basicSalary + columnTotals.houseRent + columnTotals.utility).toLocaleString()}</b></td>
                ${sortedAllowanceHeads.map(head => `
                  <td class="text-right"><b>${Math.round(columnTotals[`allow_${head}`]).toLocaleString()}</b></td>
                `).join('')}
                <td class="text-right"><b>${Math.round(columnTotals.grossSalary).toLocaleString()}</b></td>
                <td class="text-right"><b>${Math.round(columnTotals.pf).toLocaleString()}</b></td>
                <td class="text-right"><b>${Math.round(columnTotals.tax).toLocaleString()}</b></td>
                <td class="text-right"><b>${Math.round(columnTotals.loan).toLocaleString()}</b></td>
                <td class="text-right"><b>${Math.round(columnTotals.advance).toLocaleString()}</b></td>
                <td class="text-right"><b>${Math.round(columnTotals.attendance).toLocaleString()}</b></td>
                ${sortedDeductionHeads.map(head => `
                  <td class="text-right"><b>${Math.round(columnTotals[`ded_${head}`]).toLocaleString()}</b></td>
                `).join('')}
                <td class="text-right deduction"><b>${Math.round(columnTotals.totalDeductions).toLocaleString()}</b></td>
                <td class="text-right net-salary"><b>${Math.round(columnTotals.netSalary).toLocaleString()}</b></td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: flex-start; page-break-inside: avoid;">
            <div class="summary-box" style="width: 140px; border: 1px solid #ccc; padding: 5px; background-color: #f9fafb;">
              <h3 style="margin-top: 0; margin-bottom: 4px; font-size: 8px; border-bottom: 1px solid #ddd; padding-bottom: 2px; text-align: left; font-weight: bold;">Grand Summary</h3>
              <div style="display: flex; justify-content: space-between; font-size: 7px; margin-bottom: 2px;">
                <span><b>Basic Salary:</b></span>
                <span>${Math.round(basicSalaryTotal).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 7px; margin-bottom: 2px;">
                <span><b>House Rent:</b></span>
                <span>${Math.round(houseRentTotal).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 7px; margin-bottom: 2px;">
                <span><b>Utility:</b></span>
                <span>${Math.round(utilityTotal).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 7px; margin-bottom: 2px;">
                <span><b>PF:</b></span>
                <span>${Math.round(pfTotal).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 7px; margin-bottom: 2px;">
                <span><b>Tax:</b></span>
                <span>${Math.round(taxTotal).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 7px; margin-top: 4px; border-top: 1.5px solid #333; padding-top: 2px; font-weight: bold;">
                <span>Total:</span>
                <span>${Math.round(basicSalaryTotal + houseRentTotal + utilityTotal + pfTotal + taxTotal).toLocaleString()}</span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; width: 68%; font-size: 7px; margin-top: 25px; padding-right: 5px;">
              <div style="text-align: center; width: 100px;">
                <div style="border-top: 1px solid #000; margin-bottom: 4px;"></div>
                <b>Prepared By</b>
              </div>
              <div style="text-align: center; width: 100px;">
                <div style="border-top: 1px solid #000; margin-bottom: 4px;"></div>
                <b>Checked By</b>
              </div>
              <div style="text-align: center; width: 100px;">
                <div style="border-top: 1px solid #000; margin-bottom: 4px;"></div>
                <b>Approved By</b>
              </div>
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
            const monthsYears = Array.isArray(filters.monthYear)
                ? filters.monthYear.join(",")
                : filters.monthYear;
            const result = await getPayrollReport({
                monthsYears,
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
            const filenameSuffix = Array.isArray(filters.monthYear)
                ? filters.monthYear.join("_")
                : filters.monthYear;
            link.download = `payroll-report-${filenameSuffix}-detailed.csv`;
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
                                onChange={(val) => setFilters(p => ({ ...p, monthYear: val as string[] }))}
                                multiple={true}
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
