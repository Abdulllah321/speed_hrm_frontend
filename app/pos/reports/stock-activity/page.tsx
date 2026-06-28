"use client";

import React, { useEffect, useState, useTransition, useCallback, useMemo } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
    getStockActivityReport,
    queueStockActivityReportExport,
    getStockActivityReportExportStatus
} from "@/lib/actions/stock-ledger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import {
    Download,
    Printer,
    Loader2,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    Store,
    Layers,
    ShoppingCart,
    Inbox,
    RefreshCw,
    Folder
} from "lucide-react";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { cn, getApiBaseUrl } from "@/lib/utils";

export default function PosStockActivityReportPage() {
    const { user } = useAuth();
    const locationId = user?.terminal?.location?.id || user?.locationId;
    const locationName = user?.terminal?.location?.name || "Store";

    const [dateRange, setDateRange] = useState<DateRange>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const [reportData, setReportData] = useState<any[]>([]);
    const [isPending, startTransition] = useTransition();
    const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

    // Export Background Queue States
    const [exportJobId, setExportJobId] = useState<string | null>(null);
    const [exportState, setExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
    const [exportProgress, setExportProgress] = useState<number>(0);

    const fetchReport = useCallback(() => {
        if (!locationId || !dateRange.from || !dateRange.to) return;
        startTransition(async () => {
            const result = await getStockActivityReport({
                locationId,
                startDate: dateRange.from?.toISOString(),
                endDate: dateRange.to?.toISOString(),
            });
            if (result && result.status !== false) {
                setReportData(result.data || result);
            } else {
                toast.error("Failed to load report data");
            }
        });
    }, [locationId, dateRange]);

    useEffect(() => {
        fetchReport();
    }, [locationId]);

    // Poll Export Job Status
    useEffect(() => {
        if (exportState !== "queueing" && exportState !== "processing") return;
        if (!exportJobId) return;

        const interval = setInterval(async () => {
            try {
                const res = await getStockActivityReportExportStatus(exportJobId);
                if (res && res.status) {
                    const { state, progress } = res.data || {};
                    setExportProgress(progress || 0);

                    if (state === "completed") {
                        setExportState("completed");
                        toast.success("Excel Export processed successfully! Ready to download.");
                        clearInterval(interval);
                    } else if (state === "failed") {
                        setExportState("failed");
                        toast.error("Background export processing failed.");
                        clearInterval(interval);
                    } else {
                        setExportState("processing");
                    }
                }
            } catch (err) {
                console.error("Error polling job status:", err);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [exportState, exportJobId]);

    const handleExportExcelClick = async () => {
        if (!locationId || !dateRange.from || !dateRange.to) return;

        // If completed, trigger download
        if (exportState === "completed" && exportJobId) {
            const base = getApiBaseUrl();
            const url = `${base}/stock-ledger/activity-report/export/${exportJobId}/download`;
            const filename = `stock-activity-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
            
            setDownloadingFile(filename);
            try {
                const response = await fetch(url, { credentials: "include" });
                if (response.ok) {
                    const blob = await response.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    const anchor = document.createElement("a");
                    anchor.href = objectUrl;
                    anchor.download = filename;
                    document.body.appendChild(anchor);
                    anchor.click();
                    document.body.removeChild(anchor);
                    URL.revokeObjectURL(objectUrl);
                    
                    // Reset to idle state after download
                    setExportState("idle");
                    setExportJobId(null);
                    setExportProgress(0);
                } else {
                    toast.error("Download failed. The file may have expired.");
                }
            } catch (err) {
                console.error(err);
                toast.error("Failed to connect to the server.");
            } finally {
                setDownloadingFile(null);
            }
            return;
        }

        // Otherwise queue a new job
        setExportState("queueing");
        try {
            const res = await queueStockActivityReportExport({
                locationId,
                startDate: dateRange.from.toISOString(),
                endDate: dateRange.to.toISOString(),
            });

            if (res && res.status && res.data?.jobId) {
                setExportJobId(res.data.jobId);
                setExportState("processing");
                setExportProgress(5);
                toast.info("Background Excel generation queued. Monitor progress on the export button.");
            } else {
                setExportState("failed");
                toast.error(res.message || "Failed to queue export job.");
            }
        } catch (err) {
            setExportState("failed");
            console.error(err);
            toast.error("Failed to queue export job.");
        }
    };

    const handleDownloadPdf = async () => {
        if (!locationId || !dateRange.from || !dateRange.to) return;
        const base = getApiBaseUrl();
        const queryParams = new URLSearchParams();
        queryParams.append("locationId", locationId);
        queryParams.append("startDate", dateRange.from.toISOString());
        queryParams.append("endDate", dateRange.to.toISOString());

        const downloadUrl = `${base}/stock-ledger/activity-report/pdf?${queryParams.toString()}`;
        const filename = `stock-activity-report-${format(new Date(), "yyyy-MM-dd")}.pdf`;

        setDownloadingFile(filename);
        try {
            const response = await fetch(downloadUrl, { credentials: "include" });
            if (response.ok) {
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = objectUrl;
                anchor.download = filename;
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
                URL.revokeObjectURL(objectUrl);
                toast.success("PDF Report downloaded successfully.");
            } else {
                toast.error("PDF generation failed on the server.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to connect to the server.");
        } finally {
            setDownloadingFile(null);
        }
    };

    // Calculate High Level Metrics from nested hierarchy
    const summaryMetrics = useMemo(() => {
        const m = {
            totalArticles: 0,
            openingBal: 0,
            trfIn: 0,
            trfOut: 0,
            sales: 0,
            transit: 0,
            closingBal: 0,
        };

        for (const g of reportData) {
            m.openingBal += g.totals.bf;
            m.trfIn += g.totals.totalTrfIn;
            m.trfOut += g.totals.totalTrfOut;
            m.sales += g.totals.sales;
            m.transit += g.totals.transit;
            m.closingBal += g.totals.balance;

            // Recurse to count total articles
            g.categories.forEach((cat: any) => {
                cat.divisions.forEach((div: any) => {
                    div.brands.forEach((br: any) => {
                        m.totalArticles += br.articles.length;
                    });
                });
            });
        }
        return m;
    }, [reportData]);

    const getExportButtonText = () => {
        switch (exportState) {
            case "queueing":
                return "Queueing...";
            case "processing":
                return `Generating ${exportProgress}%`;
            case "completed":
                return "Download Excel";
            case "failed":
                return "Retry Excel Export";
            case "idle":
            default:
                return "Export Excel";
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Header Block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5 no-print">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        <TrendingUp className="h-8 w-8 text-primary" />
                        Stock Activity Report
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
                        <Store className="h-4 w-4 text-primary/70" />
                        POS Level Report for <span className="text-foreground font-semibold">{locationName}</span>
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleDownloadPdf}
                        disabled={reportData.length === 0}
                        className="border-red-500/40 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 gap-2 font-semibold"
                    >
                        <Printer className="h-4 w-4" />
                        Download PDF
                    </Button>
                    <Button
                        variant={exportState === "completed" ? "default" : "outline"}
                        onClick={handleExportExcelClick}
                        disabled={(exportState === "queueing" || exportState === "processing") || reportData.length === 0}
                        className={cn(
                            "gap-2 font-semibold transition-all",
                            exportState === "completed"
                                ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 border-none"
                                : "border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        )}
                    >
                        {exportState === "queueing" || exportState === "processing" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        {getExportButtonText()}
                    </Button>
                </div>
            </div>

            {/* Print Header (Visible only when printed) */}
            <div className="hidden print:block mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold text-center text-slate-900">Stock Activity Report</h1>
                <p className="text-sm text-center text-slate-600 mt-1">Outlet: {locationName}</p>
                <p className="text-xs text-center text-slate-500">
                    Period: {dateRange.from ? format(dateRange.from, "dd MMM yyyy") : "Start"} to{" "}
                    {dateRange.to ? format(dateRange.to, "dd MMM yyyy") : "End"}
                </p>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/40 border p-4 rounded-xl shadow-sm no-print">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Date Period:
                    </span>
                    <DateRangePicker
                        initialDateFrom={dateRange.from}
                        initialDateTo={dateRange.to}
                        onUpdate={({ range }: { range: DateRange }) => {
                            if (range) {
                                setDateRange(range);
                            }
                        }}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchReport}
                        disabled={isPending}
                        className="text-primary hover:text-primary/95 text-xs font-bold"
                    >
                        Apply / Refresh
                    </Button>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                    <Folder className="h-4 w-4 text-primary" />
                    <span>Innovative Network &bull; Hierarchical Structure Preview</span>
                </div>
            </div>

            {/* KPI Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 no-print">
                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Total Articles</p>
                            <h3 className="text-xl font-bold mt-1 text-slate-800 dark:text-slate-100">{summaryMetrics.totalArticles}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                            <Layers className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Opening Balance</p>
                            <h3 className="text-xl font-bold mt-1 text-slate-800 dark:text-slate-100">{summaryMetrics.openingBal}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-slate-100 dark:bg-slate-800 text-slate-600">
                            <Inbox className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Transfers IN (Net)</p>
                            <h3 className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">+{summaryMetrics.trfIn}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600">
                            <ArrowUpRight className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Transfers OUT (Net)</p>
                            <h3 className="text-xl font-bold mt-1 text-rose-600 dark:text-rose-400">-{summaryMetrics.trfOut}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600">
                            <ArrowDownRight className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Total Sales</p>
                            <h3 className="text-xl font-bold mt-1 text-slate-800 dark:text-slate-100">{summaryMetrics.sales}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                            <ShoppingCart className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-slate-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">In Transit</p>
                            <h3 className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-500">{summaryMetrics.transit}</h3>
                        </div>
                        <div className="rounded-lg p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-600">
                            <RefreshCw className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tree-structured Scrolling Table */}
            <div className="border rounded-xl shadow-sm overflow-hidden bg-background">
                <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="bg-slate-800 text-slate-100 border-b border-border/80 text-[10px] uppercase font-bold">
                                <th className="p-3 w-[280px] border-r">Article / Variant Info</th>
                                <th className="p-3 w-[100px] border-r text-center">Color</th>
                                <th className="p-3 w-[80px] border-r text-center">Size</th>
                                <th className="p-3 w-[90px] border-r text-right">BF</th>
                                <th className="p-3 w-[90px] text-right bg-emerald-500/5">Wh IN</th>
                                <th className="p-3 w-[90px] text-right bg-emerald-500/5">Out IN</th>
                                <th className="p-3 w-[90px] border-r text-right bg-emerald-500/10 font-extrabold text-emerald-700">Trf IN</th>
                                <th className="p-3 w-[90px] text-right bg-rose-500/5">Wh OUT</th>
                                <th className="p-3 w-[90px] text-right bg-rose-500/5">Out OUT</th>
                                <th className="p-3 w-[90px] border-r text-right bg-rose-500/10 font-extrabold text-rose-700">Trf OUT</th>
                                <th className="p-3 w-[80px] border-r text-right">Exchg</th>
                                <th className="p-3 w-[80px] border-r text-right">Refund</th>
                                <th className="p-3 w-[80px] border-r text-right">Claim</th>
                                <th className="p-3 w-[80px] border-r text-right">Sales</th>
                                <th className="p-3 w-[80px] border-r text-right">Adj</th>
                                <th className="p-3 w-[100px] border-r text-right bg-blue-500/5 font-extrabold text-blue-700">Available</th>
                                <th className="p-3 w-[80px] border-r text-right text-amber-700 font-extrabold">Transit</th>
                                <th className="p-3 w-[110px] text-right bg-slate-500/5 font-extrabold text-slate-800 dark:text-slate-100">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-xs">
                            {isPending ? (
                                <tr>
                                    <td colSpan={18} className="p-8 text-center text-muted-foreground font-medium">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                            Re-arranging hierarchical data and computing stock metrics...
                                        </div>
                                    </td>
                                </tr>
                            ) : reportData.length === 0 ? (
                                <tr>
                                    <td colSpan={18} className="p-8 text-center text-muted-foreground font-medium">
                                        No stock ledger movements or inventory balances found for this period.
                                    </td>
                                </tr>
                            ) : (
                                reportData.map((genderNode) => (
                                    <React.Fragment key={genderNode.gender}>
                                        {/* GENDER ROW */}
                                        <tr className="bg-slate-200 dark:bg-slate-800 font-black text-slate-800 dark:text-slate-100 border-b">
                                            <td colSpan={3} className="p-3 border-r text-sm">
                                                GENDER: {genderNode.gender.toUpperCase()}
                                            </td>
                                            <td className="p-3 border-r text-right">{genderNode.totals.bf}</td>
                                            <td className="p-3 text-right bg-emerald-500/5">{genderNode.totals.fromWarehouse}</td>
                                            <td className="p-3 text-right bg-emerald-500/5">{genderNode.totals.fromOutlet}</td>
                                            <td className="p-3 border-r text-right bg-emerald-500/10 text-emerald-700 font-black">{genderNode.totals.totalTrfIn}</td>
                                            <td className="p-3 text-right bg-rose-500/5">{genderNode.totals.toWarehouse}</td>
                                            <td className="p-3 text-right bg-rose-500/5">{genderNode.totals.toOutlet}</td>
                                            <td className="p-3 border-r text-right bg-rose-500/10 text-rose-700 font-black">{genderNode.totals.totalTrfOut}</td>
                                            <td className="p-3 border-r text-right">{genderNode.totals.exchg}</td>
                                            <td className="p-3 border-r text-right">{genderNode.totals.refund}</td>
                                            <td className="p-3 border-r text-right">{genderNode.totals.claim}</td>
                                            <td className="p-3 border-r text-right">{genderNode.totals.sales}</td>
                                            <td className="p-3 border-r text-right">{genderNode.totals.adj}</td>
                                            <td className="p-3 border-r text-right bg-blue-500/5 text-blue-700 font-black">{genderNode.totals.availableStock}</td>
                                            <td className="p-3 border-r text-right text-amber-700 font-black">{genderNode.totals.transit}</td>
                                            <td className="p-3 text-right bg-slate-500/5 font-black">{genderNode.totals.balance}</td>
                                        </tr>

                                        {genderNode.categories.map((catNode: any) => (
                                            <React.Fragment key={catNode.category}>
                                                {/* CATEGORY ROW */}
                                                <tr className="bg-slate-100 dark:bg-slate-900 font-extrabold text-slate-700 dark:text-slate-200 border-b">
                                                    <td colSpan={3} className="p-3 pl-6 border-r text-xs">
                                                        &nbsp;&nbsp;CATEGORY: {catNode.category.toUpperCase()}
                                                    </td>
                                                    <td className="p-3 border-r text-right">{catNode.totals.bf}</td>
                                                    <td className="p-3 text-right bg-emerald-500/5">{catNode.totals.fromWarehouse}</td>
                                                    <td className="p-3 text-right bg-emerald-500/5">{catNode.totals.fromOutlet}</td>
                                                    <td className="p-3 border-r text-right bg-emerald-500/10 text-emerald-700 font-extrabold">{catNode.totals.totalTrfIn}</td>
                                                    <td className="p-3 text-right bg-rose-500/5">{catNode.totals.toWarehouse}</td>
                                                    <td className="p-3 text-right bg-rose-500/5">{catNode.totals.toOutlet}</td>
                                                    <td className="p-3 border-r text-right bg-rose-500/10 text-rose-700 font-extrabold">{catNode.totals.totalTrfOut}</td>
                                                    <td className="p-3 border-r text-right">{catNode.totals.exchg}</td>
                                                    <td className="p-3 border-r text-right">{catNode.totals.refund}</td>
                                                    <td className="p-3 border-r text-right">{catNode.totals.claim}</td>
                                                    <td className="p-3 border-r text-right">{catNode.totals.sales}</td>
                                                    <td className="p-3 border-r text-right">{catNode.totals.adj}</td>
                                                    <td className="p-3 border-r text-right bg-blue-500/5 text-blue-700 font-extrabold">{catNode.totals.availableStock}</td>
                                                    <td className="p-3 border-r text-right text-amber-700 font-extrabold">{catNode.totals.transit}</td>
                                                    <td className="p-3 text-right bg-slate-500/5 font-extrabold">{catNode.totals.balance}</td>
                                                </tr>

                                                {catNode.divisions.map((divNode: any) => (
                                                    <React.Fragment key={divNode.division}>
                                                        {/* DIVISION ROW */}
                                                        <tr className="bg-slate-50 dark:bg-slate-950/60 font-bold text-slate-600 dark:text-slate-300 border-b">
                                                            <td colSpan={3} className="p-3 pl-10 border-r text-[11px]">
                                                                &nbsp;&nbsp;&nbsp;&nbsp;DIVISION: {divNode.division.toUpperCase()}
                                                            </td>
                                                            <td className="p-3 border-r text-right">{divNode.totals.bf}</td>
                                                            <td className="p-3 text-right bg-emerald-500/5">{divNode.totals.fromWarehouse}</td>
                                                            <td className="p-3 text-right bg-emerald-500/5">{divNode.totals.fromOutlet}</td>
                                                            <td className="p-3 border-r text-right bg-emerald-500/10 text-emerald-700 font-semibold">{divNode.totals.totalTrfIn}</td>
                                                            <td className="p-3 text-right bg-rose-500/5">{divNode.totals.toWarehouse}</td>
                                                            <td className="p-3 text-right bg-rose-500/5">{divNode.totals.toOutlet}</td>
                                                            <td className="p-3 border-r text-right bg-rose-500/10 text-rose-700 font-semibold">{divNode.totals.totalTrfOut}</td>
                                                            <td className="p-3 border-r text-right">{divNode.totals.exchg}</td>
                                                            <td className="p-3 border-r text-right">{divNode.totals.refund}</td>
                                                            <td className="p-3 border-r text-right">{divNode.totals.claim}</td>
                                                            <td className="p-3 border-r text-right">{divNode.totals.sales}</td>
                                                            <td className="p-3 border-r text-right">{divNode.totals.adj}</td>
                                                            <td className="p-3 border-r text-right bg-blue-500/5 text-blue-700 font-semibold">{divNode.totals.availableStock}</td>
                                                            <td className="p-3 border-r text-right text-amber-700 font-semibold">{divNode.totals.transit}</td>
                                                            <td className="p-3 text-right bg-slate-500/5 font-semibold">{divNode.totals.balance}</td>
                                                        </tr>

                                                        {divNode.brands.map((brandNode: any) => (
                                                            <React.Fragment key={brandNode.brand}>
                                                                {/* BRAND ROW */}
                                                                <tr className="bg-slate-50/50 dark:bg-slate-950/30 font-semibold text-slate-500 dark:text-slate-400 border-b">
                                                                    <td colSpan={3} className="p-3 pl-14 border-r text-[10px]">
                                                                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;BRAND: {brandNode.brand.toUpperCase()}
                                                                    </td>
                                                                    <td className="p-3 border-r text-right">{brandNode.totals.bf}</td>
                                                                    <td className="p-3 text-right bg-emerald-500/5">{brandNode.totals.fromWarehouse}</td>
                                                                    <td className="p-3 text-right bg-emerald-500/5">{brandNode.totals.fromOutlet}</td>
                                                                    <td className="p-3 border-r text-right bg-emerald-500/10 text-emerald-700">{brandNode.totals.totalTrfIn}</td>
                                                                    <td className="p-3 text-right bg-rose-500/5">{brandNode.totals.toWarehouse}</td>
                                                                    <td className="p-3 text-right bg-rose-500/5">{brandNode.totals.toOutlet}</td>
                                                                    <td className="p-3 border-r text-right bg-rose-500/10 text-rose-700">{brandNode.totals.totalTrfOut}</td>
                                                                    <td className="p-3 border-r text-right">{brandNode.totals.exchg}</td>
                                                                    <td className="p-3 border-r text-right">{brandNode.totals.refund}</td>
                                                                    <td className="p-3 border-r text-right">{brandNode.totals.claim}</td>
                                                                    <td className="p-3 border-r text-right">{brandNode.totals.sales}</td>
                                                                    <td className="p-3 border-r text-right">{brandNode.totals.adj}</td>
                                                                    <td className="p-3 border-r text-right bg-blue-500/5 text-blue-700">{brandNode.totals.availableStock}</td>
                                                                    <td className="p-3 border-r text-right text-amber-700">{brandNode.totals.transit}</td>
                                                                    <td className="p-3 text-right bg-slate-500/5">{brandNode.totals.balance}</td>
                                                                </tr>

                                                                {brandNode.articles.map((artNode: any) => (
                                                                    <React.Fragment key={artNode.sku}>
                                                                        {/* ARTICLE SUMMARY ROW */}
                                                                        <tr className="bg-slate-100/25 dark:bg-slate-900/15 font-semibold text-slate-800 dark:text-slate-200 border-b">
                                                                            <td className="p-3 pl-20 border-r flex flex-col font-bold">
                                                                                <span className="text-[10px] text-primary">SKU: {artNode.sku}</span>
                                                                                <span className="text-slate-700 dark:text-slate-350">{artNode.articleName}</span>
                                                                            </td>
                                                                            <td className="p-3 border-r text-center text-[10px] font-bold text-muted-foreground uppercase bg-slate-50/20">All Colors</td>
                                                                            <td className="p-3 border-r text-center text-[10px] font-bold text-muted-foreground uppercase bg-slate-50/20">All Sizes</td>
                                                                            <td className="p-3 border-r text-right text-slate-700 font-bold">{artNode.totals.bf}</td>
                                                                            <td className="p-3 text-right text-slate-600 bg-emerald-500/5">{artNode.totals.fromWarehouse}</td>
                                                                            <td className="p-3 text-right text-slate-600 bg-emerald-500/5">{artNode.totals.fromOutlet}</td>
                                                                            <td className="p-3 border-r text-right bg-emerald-500/10 text-emerald-700 font-bold">{artNode.totals.totalTrfIn}</td>
                                                                            <td className="p-3 text-right text-slate-600 bg-rose-500/5">{artNode.totals.toWarehouse}</td>
                                                                            <td className="p-3 text-right text-slate-600 bg-rose-500/5">{artNode.totals.toOutlet}</td>
                                                                            <td className="p-3 border-r text-right bg-rose-500/10 text-rose-700 font-bold">{artNode.totals.totalTrfOut}</td>
                                                                            <td className="p-3 border-r text-right text-slate-600">{artNode.totals.exchg}</td>
                                                                            <td className="p-3 border-r text-right text-slate-600">{artNode.totals.refund}</td>
                                                                            <td className="p-3 border-r text-right text-slate-600">{artNode.totals.claim}</td>
                                                                            <td className="p-3 border-r text-right text-slate-600">{artNode.totals.sales}</td>
                                                                            <td className="p-3 border-r text-right text-slate-600">{artNode.totals.adj}</td>
                                                                            <td className="p-3 border-r text-right bg-blue-500/5 text-blue-700 font-bold">{artNode.totals.availableStock}</td>
                                                                            <td className="p-3 border-r text-right text-amber-700 font-bold">{artNode.totals.transit}</td>
                                                                            <td className="p-3 text-right bg-slate-500/5 text-slate-800 dark:text-slate-100 font-black">{artNode.totals.balance}</td>
                                                                        </tr>

                                                                        {/* VARIANT DETAIL ROWS */}
                                                                        {artNode.variants.map((v: any, vIdx: number) => (
                                                                            <tr key={`${artNode.sku}-${v.color}-${v.size}-${vIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/35 text-slate-600 dark:text-slate-400 bg-background transition-colors">
                                                                                <td className="p-3 border-r pl-24 text-muted-foreground italic">&mdash; Variant Item</td>
                                                                                <td className="p-3 border-r text-center font-semibold text-slate-700 dark:text-slate-300">{v.color}</td>
                                                                                <td className="p-3 border-r text-center font-semibold text-slate-700 dark:text-slate-300">{v.size}</td>
                                                                                <td className="p-3 border-r text-right font-medium">{v.bf}</td>
                                                                                <td className="p-3 text-right">{v.fromWarehouse}</td>
                                                                                <td className="p-3 text-right">{v.fromOutlet}</td>
                                                                                <td className="p-3 border-r text-right bg-emerald-500/5 font-semibold text-emerald-600">{v.totalTrfIn}</td>
                                                                                <td className="p-3 text-right">{v.toWarehouse}</td>
                                                                                <td className="p-3 text-right">{v.toOutlet}</td>
                                                                                <td className="p-3 border-r text-right bg-rose-500/5 font-semibold text-rose-600">{v.totalTrfOut}</td>
                                                                                <td className="p-3 border-r text-right">{v.exchg}</td>
                                                                                <td className="p-3 border-r text-right">{v.refund}</td>
                                                                                <td className="p-3 border-r text-right">{v.claim}</td>
                                                                                <td className="p-3 border-r text-right">{v.sales}</td>
                                                                                <td className="p-3 border-r text-right">{v.adj}</td>
                                                                                <td className="p-3 border-r text-right bg-blue-500/5 font-medium text-blue-600">{v.availableStock}</td>
                                                                                <td className="p-3 border-r text-right font-medium text-amber-600">{v.transit}</td>
                                                                                <td className="p-3 text-right bg-slate-500/5 font-medium text-slate-700 dark:text-slate-300">{v.balance}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </React.Fragment>
                                                                ))}
                                                            </React.Fragment>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Downloader Fixed Overlay Screen */}
            {downloadingFile && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center pointer-events-auto">
                    <div className="bg-background border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl flex flex-col items-center gap-4 text-center">
                        <div className="relative h-12 w-12 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-sm text-foreground">Preparing Download</h4>
                            <p className="text-xs text-muted-foreground break-all max-w-[280px]">
                                Downloading {downloadingFile}... Please wait.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Styling Rules */}
            <style jsx global>{`
                @media print {
                    body {
                        background-color: white !important;
                        color: black !important;
                        font-size: 10px !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }
                    th, td {
                        border: 1px solid #cbd5e1 !important;
                        padding: 6px 4px !important;
                        font-size: 8px !important;
                        color: black !important;
                    }
                    tr {
                        page-break-inside: avoid !important;
                    }
                    thead {
                        display: table-header-group !important;
                    }
                }
            `}</style>
        </div>
    );
}
