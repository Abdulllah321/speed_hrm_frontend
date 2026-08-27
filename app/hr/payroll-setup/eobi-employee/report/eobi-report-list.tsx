"use client";

import { useState, useMemo, useTransition } from "react";
import DataTable from "@/components/common/data-table";
import { columns } from "./columns";
import { EOBIReportItem, getEOBIReportData } from "@/lib/actions/eobi-report";
import { EOBIAvailableMonth, EOBIRegionStat } from "@/lib/actions/eobi-employee";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, MapPin, Calendar, Loader2, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface EOBIReportListProps {
    initialData: EOBIReportItem[];
    initialAvailableMonths?: EOBIAvailableMonth[];
    initialRegionBreakdown?: Record<string, EOBIRegionStat>;
}

const REGION_OPTIONS = [
    { value: "all", label: "All Regions" },
    { value: "Islamabad", label: "Islamabad (370 / 1850)" },
    { value: "Punjab", label: "Punjab (400 / 2000)" },
    { value: "Sindh", label: "Sindh (400 / 2000)" },
];

export function EOBIReportList({
    initialData,
    initialAvailableMonths = [],
    initialRegionBreakdown = {},
}: EOBIReportListProps) {
    const [data, setData] = useState<EOBIReportItem[]>(initialData);
    const [availableMonths] = useState<EOBIAvailableMonth[]>(initialAvailableMonths);
    const [regionBreakdown, setRegionBreakdown] = useState<Record<string, EOBIRegionStat>>(initialRegionBreakdown);

    const [selectedRegion, setSelectedRegion] = useState<string>("all");
    const [selectedMonthYear, setSelectedMonthYear] = useState<string>("all");
    const [isLoading, startLoading] = useTransition();

    const fetchFilteredReport = (monthYearVal: string, regionVal: string) => {
        startLoading(async () => {
            let m: string | undefined = undefined;
            let y: string | undefined = undefined;

            if (monthYearVal !== "all") {
                const parts = monthYearVal.split("-");
                m = parts[0];
                y = parts[1];
            }

            const res = await getEOBIReportData({
                month: m,
                year: y,
                region: regionVal !== "all" ? regionVal : undefined,
            });

            if (res.status && res.data) {
                setData(res.data);
                if (res.regionBreakdown) {
                    setRegionBreakdown(res.regionBreakdown);
                }
            } else {
                toast.error(res.message || "Failed to load filtered report");
            }
        });
    };

    const handleRegionChange = (newRegion: string) => {
        setSelectedRegion(newRegion);
        fetchFilteredReport(selectedMonthYear, newRegion);
    };

    const handleMonthYearChange = (newMonthYear: string) => {
        setSelectedMonthYear(newMonthYear);
        fetchFilteredReport(newMonthYear, selectedRegion);
    };

    const handleResetFilters = () => {
        setSelectedRegion("all");
        setSelectedMonthYear("all");
        fetchFilteredReport("all", "all");
    };

    const selectedMonthLabel = useMemo(() => {
        if (selectedMonthYear === "all") return "All Time";
        const [m, y] = selectedMonthYear.split("-");
        const found = availableMonths.find(
            (item) => String(parseInt(item.month, 10)) === String(parseInt(m, 10)) && item.year === y
        );
        return found ? found.monthYear : `${m}/${y}`;
    }, [selectedMonthYear, availableMonths]);

    const handlePrint = () => {
        if (data.length === 0) {
            toast.error("No data to print");
            return;
        }

        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        const tableRows = data
            .map((item, index) => {
                const department =
                    item.subDepartment && item.subDepartment.length > 0
                        ? `${item.department} - ${item.subDepartment}`
                        : item.department || "";
                const region = item.eobiRegion || "Punjab";
                const totalEOBIBalance = Number(item.totalEOBIBalance || 0).toLocaleString();
                const totalWithdrawal = Number(item.totalWithdrawal || 0).toLocaleString();
                const closingBalance = Number(item.closingBalance || 0).toLocaleString();

                return `
      <tr>
        <td>${index + 1}</td>
        <td>${item.employeeId}</td>
        <td>${item.employeeName}</td>
        <td>${region}</td>
        <td>${department}</td>
        <td>${item.designation || ""}</td>
        <td class="text-right">${totalEOBIBalance}</td>
        <td class="text-right">${totalWithdrawal}</td>
        <td class="text-right font-bold">${closingBalance}</td>
      </tr>
    `;
            })
            .join("");

        const today = new Date();
        const generatedOn = today.toLocaleString();

        printWindow.document.write(`
      <html>
        <head>
          <title>Employee EOBI Report - ${selectedRegion !== 'all' ? selectedRegion : 'All Regions'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; color: #111827; }
            h1 { text-align: center; margin-bottom: 4px; font-size: 18px; }
            .subtitle { text-align: center; font-size: 11px; color: #6b7280; margin-bottom: 16px; }
            .meta { font-size: 10px; color: #6b7280; margin-bottom: 12px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 8px; }
            th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
            th { background: #f3f4f6; font-weight: 600; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            @media print {
              @page { margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <h1>Employee EOBI Report</h1>
          <div class="subtitle">Region: ${selectedRegion !== 'all' ? selectedRegion : 'All Regions'} | Period: ${selectedMonthLabel}</div>
          <div class="meta">
            <div>Generated On: ${generatedOn}</div>
            <div>Total Employees: ${data.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Emp ID</th>
                <th>Name</th>
                <th>Region</th>
                <th>Department</th>
                <th>Designation</th>
                <th class="text-right">Total EOBI</th>
                <th class="text-right">EOBI Withdrawal</th>
                <th class="text-right">EOBI Closing Amount</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const handleExportCSV = () => {
        const headers = [
            "S.No",
            "Emp ID",
            "Name",
            "Region",
            "Department",
            "Designation",
            "Total EOBI",
            "EOBI Withdrawal",
            "EOBI Closing Amount"
        ];

        const rows = data.map((item, index) => [
            index + 1,
            item.employeeId,
            item.employeeName,
            item.eobiRegion || "Punjab",
            item.department,
            item.designation,
            item.totalEOBIBalance,
            item.totalWithdrawal,
            item.closingBalance
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `eobi_report_${selectedRegion}_${selectedMonthYear}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Report exported successfully");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-primary" />
                        View Employee EOBI Report
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Region-wise and month-wise report of EOBI balances, withdrawals, and closing balances
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="default" onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                    </Button>
                    <Button variant="default" onClick={handleExportCSV} className="bg-orange-500 hover:bg-orange-600 text-white">
                        <FileDown className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Filter Card */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm no-print">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Region Filter */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="space-y-1.5 min-w-[200px]">
                                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                    Region
                                </label>
                                <Select value={selectedRegion} onValueChange={handleRegionChange}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Select Region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {REGION_OPTIONS.map((reg) => (
                                            <SelectItem key={reg.value} value={reg.value}>
                                                {reg.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Month / Year Filter */}
                            <div className="space-y-1.5 min-w-[200px]">
                                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    Period
                                </label>
                                <Select value={selectedMonthYear} onValueChange={handleMonthYearChange}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Select Period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Time (Cumulative)</SelectItem>
                                        {availableMonths.map((item) => (
                                            <SelectItem
                                                key={`${item.month}-${item.year}`}
                                                value={`${item.month}-${item.year}`}
                                            >
                                                {item.monthYear}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {(selectedRegion !== "all" || selectedMonthYear !== "all") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetFilters}
                                    className="h-9 text-xs text-muted-foreground hover:text-foreground self-end"
                                >
                                    Reset Filters
                                </Button>
                            )}
                        </div>

                        <div className="text-xs text-muted-foreground text-right">
                            Showing <span className="font-bold text-foreground">{data.length}</span> employee(s)
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <span>EOBI Balances & Withdrawals</span>
                        {selectedRegion !== "all" && (
                            <Badge variant="secondary" className="font-normal text-xs">
                                {selectedRegion}
                            </Badge>
                        )}
                        {selectedMonthYear !== "all" && (
                            <Badge variant="secondary" className="font-normal text-xs">
                                {selectedMonthLabel}
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span>Updating report data...</span>
                        </div>
                    ) : (
                        <DataTable<EOBIReportItem>
                            columns={columns}
                            data={data}
                            searchFields={[
                                { key: "employeeDetails", label: "Employee" },
                            ]}
                            tableId="eobi-report-list"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
