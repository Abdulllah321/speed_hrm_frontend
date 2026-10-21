"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import DataTable from "@/components/common/data-table";
import {
  getPivotedColumns,
  getPeriodColumnTitle,
  monthNames,
  type RawPayrollDetailRecord,
  type PivotedTaxReportRow,
} from "./columns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import {
  Printer,
  Download,
  Search,
  Loader2,
  FileSpreadsheet,
  Coins,
  Users,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getPayrollReport } from "@/lib/actions/payroll";
import {
  Department,
  SubDepartment,
  getSubDepartmentsByDepartment,
} from "@/lib/actions/department";
import { MultiSelect } from "@/components/ui/multi-select";
import { useEmployeeDropdown } from "@/hooks/use-employee-dropdown";
import { getAllEmployeesForDropdown } from "@/lib/actions/employee";
import { type Location } from "@/lib/actions/location";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Switch } from "@/components/ui/switch";
import * as XLSX from "xlsx";

interface TaxReportContentProps {
  initialDepartments: Department[];
  initialLocations: Location[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export function TaxReportContent({
  initialDepartments,
  initialLocations,
}: TaxReportContentProps) {
  const [isPending, startTransition] = useTransition();
  const [rawRecords, setRawRecords] = useState<RawPayrollDetailRecord[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [, setLoadingSubDepartments] = useState(false);
  const [onlyWithTax, setOnlyWithTax] = useState(false);

  const [filters, setFilters] = useState({
    departmentId: "all",
    subDepartmentId: "all",
    locationId: "all",
    monthYear: [format(new Date(), "yyyy-MM")] as string | string[],
  });

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [, setLoadingEmployeesForLocation] = useState(false);
  const [locations] = useState<Location[]>(initialLocations);

  const { totalCount, multiSelectProps } = useEmployeeDropdown({
    departmentId: filters.departmentId,
    subDepartmentId: filters.subDepartmentId,
    locationId: filters.locationId,
    selectedIds: selectedEmployeeIds,
  });

  // Auto select employees when location changes
  useEffect(() => {
    const selectAllEmployeesForLocation = async () => {
      if (filters.locationId && filters.locationId !== "all") {
        setLoadingEmployeesForLocation(true);
        try {
          const result = await getAllEmployeesForDropdown({
            locationId: filters.locationId,
            departmentId:
              filters.departmentId !== "all" ? filters.departmentId : undefined,
            subDepartmentId:
              filters.subDepartmentId !== "all"
                ? filters.subDepartmentId
                : undefined,
          });
          if (result.status && result.data) {
            const ids = result.data.map((emp) => emp.id);
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
    setFilters((prev) => ({
      ...prev,
      departmentId: val,
      subDepartmentId: "all",
    }));
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
      if (
        !filters.monthYear ||
        (Array.isArray(filters.monthYear) && filters.monthYear.length === 0)
      ) {
        toast.error("Please select at least one month/year");
        return;
      }

      const monthsYearsParam = Array.isArray(filters.monthYear)
        ? filters.monthYear.join(",")
        : filters.monthYear;

      try {
        const result = await getPayrollReport({
          monthsYears: monthsYearsParam,
          departmentId:
            filters.departmentId !== "all" ? filters.departmentId : undefined,
          subDepartmentId:
            filters.subDepartmentId !== "all"
              ? filters.subDepartmentId
              : undefined,
          locationId:
            filters.locationId !== "all" ? filters.locationId : undefined,
          employeeId:
            selectedEmployeeIds.length > 0
              ? selectedEmployeeIds.join(",")
              : undefined,
        });

        if (result.status && result.data) {
          setRawRecords(result.data as RawPayrollDetailRecord[]);
          setHasSearched(true);
          toast.success(
            `Loaded ${result.data.length} records for selected period(s)`,
          );
        } else {
          setRawRecords([]);
          setHasSearched(true);
          toast.error(result.message || "Failed to fetch tax records");
        }
      } catch (err) {
        console.error("Search error:", err);
        toast.error("An error occurred while fetching tax data");
      }
    });
  };

  // Distinct period keys ("YYYY-MM") ordered latest first (e.g. SEP, AUG)
  const distinctPeriods = useMemo(() => {
    const periodSet = new Set<string>();

    if (Array.isArray(filters.monthYear)) {
      filters.monthYear.forEach((p) => {
        if (p) periodSet.add(p);
      });
    } else if (filters.monthYear) {
      periodSet.add(filters.monthYear);
    }

    rawRecords.forEach((r) => {
      if (r.payroll?.month && r.payroll?.year) {
        const ym = `${r.payroll.year}-${String(Number(r.payroll.month)).padStart(2, "0")}`;
        periodSet.add(ym);
      }
    });

    // Sort descending (e.g. 2026-09, 2026-08) so latest month column is first as in screenshot
    return Array.from(periodSet).sort((a, b) => b.localeCompare(a));
  }, [filters.monthYear, rawRecords]);

  // Pivot records by Employee & Natural Sequence Sorting (1, 2, 3, 4, 5...)
  const displayData = useMemo(() => {
    const empMap = new Map<string, PivotedTaxReportRow>();

    rawRecords.forEach((record) => {
      const emp = record.employee;
      if (!emp) return;

      const empKey = emp.id;
      if (!empMap.has(empKey)) {
        empMap.set(empKey, {
          employeeId: emp.id,
          employeeCode: emp.employeeId || "",
          employeeName: emp.employeeName || "—",
          cnicNumber: emp.cnicNumber || "—",
          department: emp.department?.name || "—",
          subDepartment: emp.subDepartment?.name || "",
          designation: emp.designation?.name || "—",
          monthlyTaxes: {},
          totalTax: 0,
        });
      }

      const row = empMap.get(empKey)!;
      if (record.payroll?.month && record.payroll?.year) {
        const ym = `${record.payroll.year}-${String(Number(record.payroll.month)).padStart(2, "0")}`;
        const taxVal = Number(record.taxDeduction || 0);
        row.monthlyTaxes[ym] = (row.monthlyTaxes[ym] || 0) + taxVal;
        row.totalTax += taxVal;
      }
    });

    let list = Array.from(empMap.values());

    // Filter if user toggled "Only with Tax Deduction (> 0)"
    if (onlyWithTax) {
      list = list.filter((row) => row.totalTax > 0);
    }

    // Natural numerical sequence sort on employeeCode (1, 2, 3, 4, 5, 6, 10...)
    list.sort((a, b) => {
      return a.employeeCode.localeCompare(b.employeeCode, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

    return list;
  }, [rawRecords, onlyWithTax]);

  // Dynamically constructed TanStack table columns
  const tableColumns = useMemo(() => {
    return getPivotedColumns(distinctPeriods);
  }, [distinctPeriods]);

  // Summary Metrics
  const stats = useMemo(() => {
    const totalTax = displayData.reduce((sum, r) => sum + r.totalTax, 0);
    const countTaxed = displayData.filter((r) => r.totalTax > 0).length;
    const avgTax = countTaxed > 0 ? totalTax / countTaxed : 0;

    return {
      totalTax,
      countTaxed,
      totalEmployees: displayData.length,
      avgTax,
    };
  }, [displayData]);

  // Export to Excel (.xlsx) with month-wise columns & total
  const handleExportExcel = () => {
    if (displayData.length === 0) {
      toast.error("No records to export");
      return;
    }

    try {
      const rows = displayData.map((row, index) => {
        const rowObj: Record<string, any> = {
          "S.No": index + 1,
          "Emp ID": row.employeeCode,
          "Employee Name": row.employeeName,
          "CNIC": row.cnicNumber,
          "Department": row.department,
          "Sub Department": row.subDepartment,
          "Designation": row.designation,
        };

        distinctPeriods.forEach((periodKey) => {
          const colHeader = getPeriodColumnTitle(periodKey, distinctPeriods);
          rowObj[colHeader] = Number(
            (row.monthlyTaxes[periodKey] || 0).toFixed(2),
          );
        });

        if (distinctPeriods.length > 1) {
          rowObj["Total Tax (PKR)"] = Number(row.totalTax.toFixed(2));
        }

        return rowObj;
      });

      // Add summary Total row
      const totalRow: Record<string, any> = {
        "S.No": "" as any,
        "Emp ID": "",
        "Employee Name": "TOTAL",
        "CNIC": "",
        "Department": "",
        "Sub Department": "",
        "Designation": "",
      };

      distinctPeriods.forEach((periodKey) => {
        const colHeader = getPeriodColumnTitle(periodKey, distinctPeriods);
        const sumForPeriod = displayData.reduce(
          (acc, r) => acc + (r.monthlyTaxes[periodKey] || 0),
          0,
        );
        totalRow[colHeader] = Number(sumForPeriod.toFixed(2));
      });

      if (distinctPeriods.length > 1) {
        totalRow["Total Tax (PKR)"] = Number(stats.totalTax.toFixed(2));
      }

      rows.push(totalRow);

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Set column widths
      worksheet["!cols"] = [
        { wch: 8 },  // S.No
        { wch: 12 }, // Emp ID
        { wch: 25 }, // Employee Name
        { wch: 18 }, // CNIC
        { wch: 22 }, // Department
        { wch: 18 }, // Sub Department
        { wch: 22 }, // Designation
        ...distinctPeriods.map(() => ({ wch: 24 })), // Month columns
        ...(distinctPeriods.length > 1 ? [{ wch: 20 }] : []), // Total column
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Tax Deduction");

      const fileSuffix = Array.isArray(filters.monthYear)
        ? filters.monthYear.join("_")
        : filters.monthYear;

      XLSX.writeFile(
        workbook,
        `payroll-tax-deduction-report-${fileSuffix}.xlsx`,
      );
      toast.success(`Exported ${displayData.length} records to Excel`);
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to generate Excel file");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (displayData.length === 0) {
      toast.error("No records to export");
      return;
    }

    const monthHeaders = distinctPeriods.map((p) =>
      getPeriodColumnTitle(p, distinctPeriods),
    );

    const headers = [
      "S.No",
      "Emp ID",
      "Employee Name",
      "CNIC",
      "Department",
      "Sub Department",
      "Designation",
      ...monthHeaders,
      ...(distinctPeriods.length > 1 ? ["Total Tax (PKR)"] : []),
    ];

    const rows = displayData.map((row, index) => {
      const monthValues = distinctPeriods.map((p) =>
        (row.monthlyTaxes[p] || 0).toFixed(2),
      );

      return [
        index + 1,
        `"${row.employeeCode}"`,
        `"${row.employeeName}"`,
        `"${row.cnicNumber}"`,
        `"${row.department}"`,
        `"${row.subDepartment}"`,
        `"${row.designation}"`,
        ...monthValues,
        ...(distinctPeriods.length > 1 ? [row.totalTax.toFixed(2)] : []),
      ];
    });

    // Append total row
    const monthTotals = distinctPeriods.map((p) => {
      const sum = displayData.reduce(
        (acc, r) => acc + (r.monthlyTaxes[p] || 0),
        0,
      );
      return sum.toFixed(2);
    });

    rows.push([
      "",
      "",
      '"TOTAL"',
      "",
      "",
      "",
      "",
      ...monthTotals,
      ...(distinctPeriods.length > 1 ? [stats.totalTax.toFixed(2)] : []),
    ]);

    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);

    const fileSuffix = Array.isArray(filters.monthYear)
      ? filters.monthYear.join("_")
      : filters.monthYear;
    link.download = `payroll-tax-deduction-report-${fileSuffix}.csv`;
    link.click();

    toast.success(`Exported ${displayData.length} records to CSV`);
  };

  // Print Report
  const handlePrint = () => {
    if (displayData.length === 0) {
      toast.error("No data to print");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const monthHeadersHtml = distinctPeriods
      .map(
        (p) =>
          `<th style="text-align: right; white-space: nowrap;">${getPeriodColumnTitle(p, distinctPeriods)}</th>`,
      )
      .join("");

    const totalHeaderHtml =
      distinctPeriods.length > 1
        ? `<th style="text-align: right; white-space: nowrap;">Total Tax (PKR)</th>`
        : "";

    const tableRows = displayData
      .map((row, index) => {
        const monthCellsHtml = distinctPeriods
          .map((p) => {
            const val = row.monthlyTaxes[p] || 0;
            return `<td style="text-align: right; font-family: monospace; font-weight: 600; color: ${val > 0 ? "#b91c1c" : "#64748b"};">${val > 0 ? val.toFixed(2) : "0.00"}</td>`;
          })
          .join("");

        const totalCellHtml =
          distinctPeriods.length > 1
            ? `<td style="text-align: right; font-family: monospace; font-weight: bold; color: #991b1b;">${row.totalTax.toFixed(2)}</td>`
            : "";

        return `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="font-family: monospace; font-weight: bold;">${row.employeeCode}</td>
            <td><strong>${row.employeeName}</strong></td>
            <td style="font-family: monospace;">${row.cnicNumber}</td>
            <td>${row.department}</td>
            <td>${row.designation}</td>
            ${monthCellsHtml}
            ${totalCellHtml}
          </tr>
        `;
      })
      .join("");

    const monthTotalsHtml = distinctPeriods
      .map((p) => {
        const sum = displayData.reduce(
          (acc, r) => acc + (r.monthlyTaxes[p] || 0),
          0,
        );
        return `<td style="text-align: right; font-family: monospace; font-weight: bold; color: #b91c1c;">${sum.toFixed(2)}</td>`;
      })
      .join("");

    const grandTotalHtml =
      distinctPeriods.length > 1
        ? `<td style="text-align: right; font-family: monospace; font-weight: bold; color: #991b1b;">${stats.totalTax.toFixed(2)}</td>`
        : "";

    const periodLabel = distinctPeriods
      .map((p) => {
        const [y, m] = p.split("-");
        const idx = parseInt(m, 10) - 1;
        return `${monthNames[idx]?.toUpperCase() || m} ${y}`;
      })
      .join(", ");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payroll Tax Deduction Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #111827; font-size: 11px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; }
            h1 { margin: 0 0 4px 0; font-size: 20px; color: #1e293b; }
            .subtitle { font-size: 12px; color: #64748b; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; }
            th { background: #f1f5f9; font-weight: 600; text-align: left; }
            .total-row { background: #f8fafc; font-weight: bold; font-size: 11px; }
            @media print {
              body { padding: 0; }
              @page { size: landscape; margin: 12mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Payroll Tax Deduction Report</h1>
            <div class="subtitle">Month-wise Tax Deducted From Payroll</div>
          </div>
          <div class="meta">
            <div><strong>Selected Month(s):</strong> ${periodLabel}</div>
            <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
            <div><strong>Total Employees:</strong> ${displayData.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">S.No</th>
                <th style="width: 60px;">Emp ID</th>
                <th>Employee Name</th>
                <th style="width: 100px;">CNIC</th>
                <th>Department</th>
                <th>Designation</th>
                ${monthHeadersHtml}
                ${totalHeaderHtml}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
              <tr class="total-row">
                <td colspan="6" style="text-align: right; padding-right: 12px;">TOTAL:</td>
                ${monthTotalsHtml}
                ${grandTotalHtml}
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">
                Payroll Tax Deduction Report
              </CardTitle>
              <CardDescription>
                Month-wise columns for tax deducted directly from payroll per
                employee.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={displayData.length === 0}
                className="cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-1.5" /> Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={displayData.length === 0}
                className="cursor-pointer"
              >
                <Download className="w-4 h-4 mr-1.5" /> Export CSV
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleExportExcel}
                disabled={displayData.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Export Excel
                (.xlsx)
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Department */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Department</Label>
              <Autocomplete
                options={initialDepartments.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
                value={filters.departmentId}
                onValueChange={handleDepartmentChange}
                placeholder="All Departments"
                searchPlaceholder="Search department..."
              />
            </div>

            {/* Sub Department */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Sub Department</Label>
              <Autocomplete
                options={subDepartments.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
                value={filters.subDepartmentId}
                onValueChange={(val) =>
                  setFilters((p) => ({ ...p, subDepartmentId: val || "all" }))
                }
                placeholder="All Sub Departments"
                searchPlaceholder="Search sub department..."
                disabled={
                  filters.departmentId === "all" || subDepartments.length === 0
                }
              />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Location</Label>
              <Select
                value={filters.locationId}
                onValueChange={(val) =>
                  setFilters((prev) => ({ ...prev, locationId: val }))
                }
                disabled={isPending}
              >
                <SelectTrigger id="location" className="w-full">
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

            {/* Month / Year (Multi-select enabled!) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Month(s) / Year(s)
              </Label>
              <MonthYearPicker
                value={filters.monthYear}
                onChange={(val) =>
                  setFilters((p) => ({ ...p, monthYear: val as string[] }))
                }
                multiple={true}
                placeholder="Select one or multiple months"
              />
            </div>
          </div>

          {/* Employee multi-select row */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Specific Employee(s)</Label>
            <MultiSelect
              options={multiSelectProps.options}
              value={selectedEmployeeIds}
              onValueChange={setSelectedEmployeeIds}
              onSearch={multiSelectProps.onSearch}
              onLoadMore={multiSelectProps.onLoadMore}
              hasMore={multiSelectProps.hasMore}
              isLoading={multiSelectProps.isLoading}
              placeholder="Select specific employees (Optional)..."
              searchPlaceholder="Search by name or employee ID..."
              emptyMessage={
                multiSelectProps.isLoading
                  ? "Loading employees..."
                  : "No employees found"
              }
              disabled={isPending}
              showSelectAll={false}
            />
            <p className="text-[11px] text-muted-foreground">
              {selectedEmployeeIds.length > 0
                ? `${selectedEmployeeIds.length} employee(s) selected`
                : `Showing all ${totalCount} employees in selected filter`}
            </p>
          </div>

          {/* Action Row: Toggle & Search */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t">
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="only-tax"
                  checked={onlyWithTax}
                  onCheckedChange={setOnlyWithTax}
                />
                <Label
                  htmlFor="only-tax"
                  className="text-xs font-medium cursor-pointer"
                >
                  Show only employees with Tax Deduction (&gt; 0)
                </Label>
              </div>
            </div>

            <Button
              onClick={handleSearch}
              disabled={isPending}
              className="min-w-40 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Fetching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Fetch Tax Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Stats Cards */}
      {hasSearched && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/60 shadow-2xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total Tax Deducted
                </p>
                <p className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mt-1">
                  {formatCurrency(stats.totalTax)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Coins className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-2xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Employees with Tax
                </p>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {stats.countTaxed.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Users className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-2xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total Employees
                </p>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {stats.totalEmployees.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <Filter className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-2xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Avg Tax per Taxed Emp
                </p>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {formatCurrency(stats.avgTax)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Table Card */}
      <Card className="border-border/60 shadow-xs">
        <CardContent className="p-4 md:p-6 overflow-x-auto">
          <DataTable
            columns={tableColumns}
            data={displayData}
            searchFields={[
              { key: "employeeName", label: "Employee Name" },
              { key: "employeeCode", label: "Employee ID" },
              { key: "cnicNumber", label: "CNIC" },
            ]}
            tableId="payroll-tax-report-pivoted-table"
            canBulkEdit={false}
            canBulkDelete={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
