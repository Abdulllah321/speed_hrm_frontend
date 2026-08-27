"use client";

import { useState, useMemo, useTransition } from "react";
import DataTable from "@/components/common/data-table";
import { getColumns } from "./columns";
import {
    EOBIEmployee,
    EOBIAvailableMonth,
    EOBIRegionStat,
    getEOBIEmployees,
    recalculateEOBIContributions,
} from "@/lib/actions/eobi-employee";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Users,
    TrendingUp,
    DollarSign,
    MapPin,
    Calendar,
    RefreshCw,
    Loader2,
    Building2,
    FileText,
    CheckCircle2,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface EOBIEmployeeListProps {
    initialData: EOBIEmployee[];
    initialAvailableMonths?: EOBIAvailableMonth[];
    initialRegionBreakdown?: Record<string, EOBIRegionStat>;
}

const REGION_OPTIONS = [
    { value: "all", label: "All Regions", color: "slate" },
    { value: "Islamabad", label: "Islamabad", color: "purple" },
    { value: "Punjab", label: "Punjab", color: "emerald" },
    { value: "Sindh", label: "Sindh", color: "cyan" },
];

export function EOBIEmployeeList({
    initialData,
    initialAvailableMonths = [],
    initialRegionBreakdown = {},
}: EOBIEmployeeListProps) {
    const [employees, setEmployees] = useState<EOBIEmployee[]>(initialData);
    const [availableMonths] = useState<EOBIAvailableMonth[]>(initialAvailableMonths);
    const [regionBreakdown, setRegionBreakdown] = useState<Record<string, EOBIRegionStat>>(initialRegionBreakdown);

    const [selectedRegion, setSelectedRegion] = useState<string>("all");
    const [selectedMonthYear, setSelectedMonthYear] = useState<string>("all"); // "all" or "MM-YYYY"
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoading, startLoading] = useTransition();
    const router = useRouter();

    const isMonthlyView = selectedMonthYear !== "all";

    // Parse selected month & year label
    const selectedMonthInfo = useMemo(() => {
        if (selectedMonthYear === "all") return null;
        const [m, y] = selectedMonthYear.split("-");
        const found = availableMonths.find(
            (item) => String(parseInt(item.month, 10)) === String(parseInt(m, 10)) && item.year === y
        );
        return {
            month: m,
            year: y,
            label: found ? found.monthYear : `${m}/${y}`,
        };
    }, [selectedMonthYear, availableMonths]);

    // Handle fetching filtered data from server when month/year or region changes
    const fetchFilteredData = (monthYearVal: string, regionVal: string) => {
        startLoading(async () => {
            let m: string | undefined = undefined;
            let y: string | undefined = undefined;

            if (monthYearVal !== "all") {
                const parts = monthYearVal.split("-");
                m = parts[0];
                y = parts[1];
            }

            const res = await getEOBIEmployees({
                month: m,
                year: y,
                region: regionVal !== "all" ? regionVal : undefined,
            });

            if (res.status && res.data) {
                setEmployees(res.data);
                if (res.regionBreakdown) {
                    setRegionBreakdown(res.regionBreakdown);
                }
            } else {
                toast.error(res.message || "Failed to load filtered EOBI data");
            }
        });
    };

    const handleRegionChange = (newRegion: string) => {
        setSelectedRegion(newRegion);
        fetchFilteredData(selectedMonthYear, newRegion);
    };

    const handleMonthYearChange = (newMonthYear: string) => {
        setSelectedMonthYear(newMonthYear);
        fetchFilteredData(newMonthYear, selectedRegion);
    };

    const handleResetFilters = () => {
        setSelectedRegion("all");
        setSelectedMonthYear("all");
        fetchFilteredData("all", "all");
    };

    const handleSyncEOBIRates = async () => {
        setIsSyncing(true);
        try {
            const res = await recalculateEOBIContributions();
            if (res.status) {
                toast.success(res.message || "EOBI contributions synced with employee regions!");
                router.refresh();
                fetchFilteredData(selectedMonthYear, selectedRegion);
            } else {
                toast.error(res.message || "Failed to sync EOBI contributions.");
            }
        } catch (err) {
            console.error("Sync error:", err);
            toast.error("Failed to sync EOBI contributions.");
        } finally {
            setIsSyncing(false);
        }
    };

    // Calculate dynamic summary statistics
    const totalEmployees = employees.length;
    const totalEOBIBalance = employees.reduce((sum, emp) => sum + emp.totalEOBIBalance, 0);
    const totalEmployeeContribution = employees.reduce(
        (sum, emp) =>
            sum +
            (isMonthlyView
                ? emp.selectedMonthEmployeeContribution || 0
                : emp.employeeContribution),
        0
    );
    const totalEmployerContribution = employees.reduce(
        (sum, emp) =>
            sum +
            (isMonthlyView
                ? emp.selectedMonthEmployerContribution || 0
                : emp.employerContribution),
        0
    );
    const totalMonthlyAmount = totalEmployeeContribution + totalEmployerContribution;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PK", {
            style: "currency",
            currency: "PKR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Columns based on active view mode
    const activeColumns = useMemo(
        () => getColumns(isMonthlyView, selectedMonthInfo?.label),
        [isMonthlyView, selectedMonthInfo]
    );

    return (
        <div className="space-y-6">
            {/* Header with Title & Action buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-primary" />
                        EOBI Employee Balances & Contributions
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Track month-wise contributions and region-specific rates (Islamabad, Punjab, Sindh)
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSyncEOBIRates}
                        disabled={isSyncing || isLoading}
                    >
                        {isSyncing ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2 text-primary" />
                        )}
                        Sync EOBI Rates
                    </Button>
                    <Button variant="default" size="sm" asChild className="bg-primary hover:bg-primary/90">
                        <Link href="/hr/payroll-setup/eobi-employee/report">
                            <FileText className="h-4 w-4 mr-2" />
                            View EOBI Report
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Region & Month Filter Controls Card */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Region Selector Pills */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                                <MapPin className="h-3.5 w-3.5 text-primary" />
                                Filter by Region
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {REGION_OPTIONS.map((reg) => {
                                    const isSelected = selectedRegion === reg.value;
                                    const count =
                                        reg.value === "all"
                                            ? Object.values(regionBreakdown).reduce((acc, r) => acc + r.count, 0) || initialData.length
                                            : regionBreakdown[reg.value]?.count || 0;

                                    return (
                                        <button
                                            key={reg.value}
                                            type="button"
                                            onClick={() => handleRegionChange(reg.value)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 border ${
                                                isSelected
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                    : "bg-background hover:bg-muted text-foreground border-slate-200 dark:border-slate-800"
                                            }`}
                                        >
                                            <span>{reg.label}</span>
                                            <span
                                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    isSelected
                                                        ? "bg-white/20 text-white"
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                                }`}
                                            >
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Month & Year Selection Dropdown */}
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1.5 min-w-[220px]">
                                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    Period / Month View
                                </label>
                                <Select
                                    value={selectedMonthYear}
                                    onValueChange={handleMonthYearChange}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Select Month/Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            <span className="font-semibold text-foreground">
                                                All Time (Cumulative Balance)
                                            </span>
                                        </SelectItem>
                                        {availableMonths.map((item) => (
                                            <SelectItem
                                                key={`${item.month}-${item.year}`}
                                                value={`${item.month}-${item.year}`}
                                            >
                                                <span>{item.monthYear}</span>
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
                                    className="h-9 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Reset Filters
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Region Rate & Breakdown Overview Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Islamabad */}
                {(() => {
                    const isb = regionBreakdown["Islamabad"] || {
                        count: 0,
                        totalBalance: 0,
                        selectedMonthTotal: 0,
                        employeeMonthlyRate: 407,
                        employerMonthlyRate: 2035,
                    };
                    const empRate = isb.employeeMonthlyRate || 407;
                    const emprRate = isb.employerMonthlyRate || 2035;
                    const totalRate = empRate + emprRate;

                    return (
                        <Card className={`border transition-all ${selectedRegion === "Islamabad" ? "ring-2 ring-purple-500 bg-purple-50/20 dark:bg-purple-950/10" : ""}`}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                                        <CardTitle className="text-sm font-semibold">Islamabad Region</CardTitle>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] text-purple-700 dark:text-purple-300 border-purple-300">
                                        {empRate.toLocaleString()} / {emprRate.toLocaleString()}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    Rs. {empRate.toLocaleString()} Employee + Rs. {emprRate.toLocaleString()} Employer = <strong>Rs. {totalRate.toLocaleString()}</strong>/mo
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-baseline justify-between">
                                    <div>
                                        <span className="text-2xl font-bold text-foreground">
                                            {isb.count}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-1.5">Employees</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                                            {formatCurrency(
                                                isMonthlyView
                                                    ? isb.selectedMonthTotal || 0
                                                    : isb.totalBalance || 0
                                            )}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {isMonthlyView ? "Month Total" : "Total Balance"}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })()}

                {/* Punjab */}
                {(() => {
                    const pjb = regionBreakdown["Punjab"] || {
                        count: 0,
                        totalBalance: 0,
                        selectedMonthTotal: 0,
                        employeeMonthlyRate: 400,
                        employerMonthlyRate: 2000,
                    };
                    const empRate = pjb.employeeMonthlyRate || 400;
                    const emprRate = pjb.employerMonthlyRate || 2000;
                    const totalRate = empRate + emprRate;

                    return (
                        <Card className={`border transition-all ${selectedRegion === "Punjab" ? "ring-2 ring-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10" : ""}`}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                        <CardTitle className="text-sm font-semibold">Punjab Region</CardTitle>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-300 border-emerald-300">
                                        {empRate.toLocaleString()} / {emprRate.toLocaleString()}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    Rs. {empRate.toLocaleString()} Employee + Rs. {emprRate.toLocaleString()} Employer = <strong>Rs. {totalRate.toLocaleString()}</strong>/mo
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-baseline justify-between">
                                    <div>
                                        <span className="text-2xl font-bold text-foreground">
                                            {pjb.count}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-1.5">Employees</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                            {formatCurrency(
                                                isMonthlyView
                                                    ? pjb.selectedMonthTotal || 0
                                                    : pjb.totalBalance || 0
                                            )}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {isMonthlyView ? "Month Total" : "Total Balance"}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })()}

                {/* Sindh */}
                {(() => {
                    const snd = regionBreakdown["Sindh"] || {
                        count: 0,
                        totalBalance: 0,
                        selectedMonthTotal: 0,
                        employeeMonthlyRate: 400,
                        employerMonthlyRate: 2000,
                    };
                    const empRate = snd.employeeMonthlyRate || 400;
                    const emprRate = snd.employerMonthlyRate || 2000;
                    const totalRate = empRate + emprRate;

                    return (
                        <Card className={`border transition-all ${selectedRegion === "Sindh" ? "ring-2 ring-cyan-500 bg-cyan-50/20 dark:bg-cyan-950/10" : ""}`}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                                        <CardTitle className="text-sm font-semibold">Sindh Region</CardTitle>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] text-cyan-700 dark:text-cyan-300 border-cyan-300">
                                        {empRate.toLocaleString()} / {emprRate.toLocaleString()}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    Rs. {empRate.toLocaleString()} Employee + Rs. {emprRate.toLocaleString()} Employer = <strong>Rs. {totalRate.toLocaleString()}</strong>/mo
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-baseline justify-between">
                                    <div>
                                        <span className="text-2xl font-bold text-foreground">
                                            {snd.count}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-1.5">Employees</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                                            {formatCurrency(
                                                isMonthlyView
                                                    ? snd.selectedMonthTotal || 0
                                                    : snd.totalBalance || 0
                                            )}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {isMonthlyView ? "Month Total" : "Total Balance"}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })()}
            </div>

            {/* Dynamic Metric Cards for Current Filter Selection */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {selectedRegion !== "all" ? `${selectedRegion} Employees` : "Total Employees"}
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalEmployees}</div>
                        <p className="text-xs text-muted-foreground">
                            {selectedRegion !== "all" ? `In ${selectedRegion} region` : "Across all regions"}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {isMonthlyView ? `${selectedMonthInfo?.label} Total` : "Total EOBI Balance"}
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(isMonthlyView ? totalMonthlyAmount : totalEOBIBalance)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {isMonthlyView ? "Employee + Employer for month" : "Cumulative contributions"}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Employee Contribution</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(totalEmployeeContribution)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {isMonthlyView ? `For ${selectedMonthInfo?.label}` : "Total employee share"}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Employer Contribution</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(totalEmployerContribution)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {isMonthlyView ? `For ${selectedMonthInfo?.label}` : "Total company share"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Data Table */}
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <span>EOBI Employee List</span>
                            {selectedRegion !== "all" && (
                                <Badge variant="secondary" className="font-normal text-xs">
                                    Region: {selectedRegion}
                                </Badge>
                            )}
                            {isMonthlyView && (
                                <Badge variant="secondary" className="font-normal text-xs">
                                    Month: {selectedMonthInfo?.label}
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {isMonthlyView
                                ? `Showing individual contribution breakdown for ${selectedMonthInfo?.label}`
                                : "Showing cumulative EOBI balances and withdrawal status"}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span>Updating EOBI records...</span>
                        </div>
                    ) : (
                        <DataTable<EOBIEmployee>
                            columns={activeColumns}
                            data={employees}
                            searchFields={[
                                { key: "employeeDetails", label: "Employee" },
                            ]}
                            tableId="eobi-employee-list"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
