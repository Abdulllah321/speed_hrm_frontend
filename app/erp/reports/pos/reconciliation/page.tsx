"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getLocations, Location } from "@/lib/actions/location";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { authFetch } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";
import {
    Printer, Receipt, CreditCard, Wallet, Banknote, Clock, User, FileText,
    FileSpreadsheet, Loader2, Check, Download, Calendar, Store, SlidersHorizontal,
    Layers, Layers3, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import * as htmlToImage from "html-to-image";
import { cn } from "@/lib/utils";

export default function ErpReconciliationReportPage() {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<"separate" | "merged">("separate");

    const getTodayString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [layout, setLayout] = useState<"thermal" | "desktop">("desktop");
    const [isDownloading, setIsDownloading] = useState(false);
    const [exportState, setExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
    const [exportProgress, setExportProgress] = useState(0);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        getLocations().then((res: any) => {
            if (Array.isArray(res)) setLocations(res);
            else if (res?.status && Array.isArray(res?.data)) setLocations(res.data);
        }).catch(console.error);
    }, []);

    const locationOptions: MultiSelectOption[] = useMemo(() =>
        locations.map((loc) => ({ value: loc.id, label: loc.name, description: loc.code ? `Code: ${loc.code}` : undefined })),
        [locations]);

    const locationParam = useMemo(() =>
        selectedLocationIds.length > 0 ? selectedLocationIds.join(",") : "", [selectedLocationIds]);

    const activeSelectionNames = useMemo(() => {
        if (selectedLocationIds.length > 0) return locations.filter(l => selectedLocationIds.includes(l.id)).map(l => l.name).join(", ");
        return "All Outlets";
    }, [selectedLocationIds, locations]);

    const fetchDetails = async () => {
        if (!selectedDate) return;
        setLoading(true);
        try {
            const url = `/pos-session/reconciliation/daywise?date=${selectedDate}&locationId=${encodeURIComponent(locationParam)}`;
            const res = await authFetch(url);
            if (res.ok) {
                setData(res.data);
            } else {
                toast.error(res.data?.message || "Failed to load reconciliation details");
                setData(null);
            }
        } catch (err) {
            toast.error("Failed to fetch reconciliation report details.");
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [selectedDate, locationParam]);

    const handlePrint = () => {
        if (!data) return;
        window.print();
    };

    const handleDownloadPdf = async () => {
        if (!data) return;
        setIsDownloading(true);
        const toastId = toast.loading("Generating Reconciliation PDF...");

        try {
            await new Promise((resolve) => setTimeout(resolve, 300));

            if (reportRef.current) {
                const dataUrl = await htmlToImage.toPng(reportRef.current, {
                    backgroundColor: "#ffffff",
                    pixelRatio: 2,
                });

                const imgProps = new jsPDF().getImageProperties(dataUrl);
                const pdfWidth = layout === "thermal" ? 80 : 210;
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                const pdf = new jsPDF({
                    orientation: "portrait",
                    unit: "mm",
                    format: [pdfWidth, pdfHeight]
                });

                pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
                pdf.save(`reconciliation-${selectedDate}.pdf`);
                toast.success("PDF downloaded successfully", { id: toastId });
            } else {
                toast.error("Failed to capture report content", { id: toastId });
            }
        } catch (error) {
            console.error("PDF download error:", error);
            toast.error("An error occurred while downloading the PDF", { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDownloadExcel = async () => {
        if (!selectedDate) return;
        setExportState("queueing");
        setExportProgress(0);
        const toastId = toast.loading("Queueing Excel export job...");
        try {
            const apiBase = getApiBaseUrl();
            const queueRes = await fetch(`${apiBase}/pos-session/reconciliation/daywise/export/queue?date=${selectedDate}&locationId=${encodeURIComponent(locationParam)}`, {
                method: "POST",
                credentials: "include"
            });
            
            if (!queueRes.ok) {
                const text = await queueRes.text();
                let msg = "Failed to queue export job";
                try {
                    const json = JSON.parse(text);
                    msg = json.message || msg;
                } catch {}
                throw new Error(msg);
            }

            const queueData = await queueRes.json();
            const jobId = queueData?.data?.jobId;
            if (!jobId) throw new Error("No job ID returned from server");

            setExportState("processing");
            toast.loading("Processing export: 0% completed", { id: toastId });

            const interval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`${apiBase}/pos-session/reconciliation/daywise/export/${jobId}/status`, { credentials: "include" });
                    if (!statusRes.ok) return;

                    const statusData = await statusRes.json();
                    const { state, progress } = statusData?.data || {};

                    setExportProgress(progress || 0);
                    toast.loading(`Processing export: ${progress || 0}% completed`, { id: toastId });

                    if (state === "completed") {
                        clearInterval(interval);
                        setExportState("completed");
                        toast.loading("Downloading Excel sheet...", { id: toastId });

                        const anchor = document.createElement("a");
                        anchor.href = `${apiBase}/pos-session/reconciliation/daywise/export/${jobId}/download`;
                        document.body.appendChild(anchor);
                        anchor.click();
                        document.body.removeChild(anchor);

                        toast.success("Excel Reconciliation Report exported successfully!", { id: toastId });
                        setTimeout(() => setExportState("idle"), 2000);
                    } else if (state === "failed") {
                        clearInterval(interval);
                        setExportState("failed");
                        toast.error("Background export processor failed", { id: toastId });
                        setTimeout(() => setExportState("idle"), 3000);
                    }
                } catch (err) {
                    clearInterval(interval);
                    setExportState("failed");
                    toast.error("Network error while checking export status", { id: toastId });
                    setTimeout(() => setExportState("idle"), 3000);
                }
            }, 1500);
        } catch (error: any) {
            setExportState("failed");
            toast.error(error.message || "An error occurred during Excel export", { id: toastId });
            setTimeout(() => setExportState("idle"), 3000);
        }
    };

    const formatVal = (val: number | string | null | undefined, isRate: boolean = false) => {
        if (val === null || val === undefined || val === "") return "";
        const num = typeof val === "string" ? parseFloat(val) : val;
        if (isNaN(num)) return val.toString();
        if (num === 0) return "-";
        if (isRate) return num.toFixed(3);
        return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const SingleReportCard = ({ activeReport }: { activeReport: any }) => {
        if (!activeReport) return null;

        const cardPaymentsAmountSum = activeReport.cardPayments?.reduce((acc: number, c: any) => acc + c.amount, 0) || 0;
        const cardPaymentsCommSum = activeReport.cardPayments?.reduce((acc: number, c: any) => acc + c.commission, 0) || 0;

        const cardGiftVouchersAmountSum = activeReport.cardGiftVouchers?.reduce((acc: number, c: any) => acc + c.amount, 0) || 0;
        const cardGiftVouchersCommSum = activeReport.cardGiftVouchers?.reduce((acc: number, c: any) => acc + c.commission, 0) || 0;

        const receivedSubtotal = activeReport.receivedVouchers?.reduce((acc: number, v: any) => acc + v.amount, 0) || 0;
        const receivablesSubtotal = activeReport.receivables?.reduce((acc: number, r: any) => acc + r.amount, 0) || 0;

        const issuedExchangeSubtotal = activeReport.issuedVouchers?.exchangeAndClaims?.reduce((acc: number, v: any) => acc + v.amount, 0) || 0;
        const issuedCreditSubtotal = activeReport.issuedVouchers?.creditVouchers?.reduce((acc: number, v: any) => acc + v.amount, 0) || 0;
        const issuedGiftSubtotal = activeReport.issuedVouchers?.giftVouchers?.reduce((acc: number, v: any) => acc + v.amount, 0) || 0;
        const issuedRefundSubtotal = activeReport.issuedVouchers?.refundVouchers?.reduce((acc: number, v: any) => acc + v.amount, 0) || 0;
        const totalIssuedSubtotal = issuedExchangeSubtotal + issuedGiftSubtotal + issuedRefundSubtotal;

        return (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-2xl overflow-hidden mb-6">
                <CardContent className="p-6 md:p-8 space-y-6">
                    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <Store className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {activeReport.locationName || "Store"}
                                </h2>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                                {activeReport.companyName} • Doc ID: #{activeReport.documentNumber}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            Date: {activeReport.dateRange || selectedDate}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="text-center border-r border-slate-200 dark:border-slate-800 pr-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gross Sales</p>
                            <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">{formatVal(activeReport.financials?.sale)}</p>
                        </div>
                        <div className="text-center border-r border-slate-200 dark:border-slate-800 px-2">
                            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Sales Return</p>
                            <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">{formatVal(activeReport.financials?.salesReturn)}</p>
                        </div>
                        <div className="text-center pl-2">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Net Sales</p>
                            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{formatVal(activeReport.financials?.netSales)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        <div className="space-y-6">
                            <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-slate-50/30">
                                <h3 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                                    <CreditCard className="h-4 w-4 text-sky-600" />
                                    Credit / Debit Cards
                                </h3>
                                <div className="space-y-1.5">
                                    <div className="flex font-bold text-muted-foreground text-[10px] uppercase border-b pb-1">
                                        <span className="w-1/2">Bank</span>
                                        <span className="w-1/4 text-right">Amount</span>
                                        <span className="w-1/4 text-right">Commission</span>
                                    </div>
                                    {activeReport.cardPayments?.map((p: any, i: number) => (
                                        <div key={i} className="flex justify-between py-0.5 font-medium">
                                            <span className="w-1/2 truncate font-semibold">{p.bank}</span>
                                            <span className="w-1/4 text-right font-mono">{formatVal(p.amount)}</span>
                                            <span className="w-1/4 text-right font-mono text-slate-500">{formatVal(p.commission)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between font-extrabold pt-2 border-t text-slate-900 dark:text-slate-100">
                                        <span className="w-1/2">Card Subtotal</span>
                                        <span className="w-1/4 text-right text-sky-600 font-mono">{formatVal(cardPaymentsAmountSum)}</span>
                                        <span className="w-1/4 text-right font-mono text-slate-500">{formatVal(cardPaymentsCommSum)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-slate-50/30">
                                <h3 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                                    <Wallet className="h-4 w-4 text-emerald-600" />
                                    Received Payments
                                </h3>
                                <div className="space-y-1.5">
                                    {activeReport.receivedVouchers?.map((v: any, i: number) => (
                                        <div key={i} className="flex justify-between font-medium">
                                            <span>{v.type}</span>
                                            <span className="font-mono font-bold">{formatVal(v.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between font-extrabold pt-2 border-t text-slate-900 dark:text-slate-100">
                                        <span>Received Subtotal</span>
                                        <span className="text-emerald-600 font-mono">{formatVal(receivedSubtotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-slate-50/30">
                                <h3 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                                    <Receipt className="h-4 w-4 text-amber-600" />
                                    Issued Vouchers
                                </h3>
                                <div className="space-y-1.5">
                                    {activeReport.issuedVouchers?.exchangeAndClaims?.map((v: any, i: number) => (
                                        <div key={i} className="flex justify-between font-medium">
                                            <span>{v.type} ({v.from})</span>
                                            <span className="font-mono font-bold">{formatVal(v.amount)}</span>
                                        </div>
                                    ))}
                                    {activeReport.issuedVouchers?.creditVouchers?.map((v: any, i: number) => (
                                        <div key={i} className="flex justify-between font-medium">
                                            <span>Credit ({v.to})</span>
                                            <span className="font-mono font-bold">{formatVal(v.amount)}</span>
                                        </div>
                                    ))}
                                    {activeReport.issuedVouchers?.giftVouchers?.map((v: any, i: number) => (
                                        <div key={i} className="flex justify-between font-medium">
                                            <span>Gift ({v.to})</span>
                                            <span className="font-mono font-bold">{formatVal(v.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between font-extrabold pt-2 border-t text-slate-900 dark:text-slate-100">
                                        <span>Issued Subtotal</span>
                                        <span className="text-amber-600 font-mono">{formatVal(totalIssuedSubtotal)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-slate-50/30">
                                <h3 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                                    <Banknote className="h-4 w-4 text-indigo-600" />
                                    Cash Breakdown
                                </h3>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between font-medium">
                                        <span>Cash Sale</span>
                                        <span className="font-mono font-bold">{formatVal(activeReport.cashBreakdown?.sale)}</span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                        <span>Gift Vouchers Cash</span>
                                        <span className="font-mono font-bold">{formatVal(activeReport.cashBreakdown?.giftVouchers)}</span>
                                    </div>
                                    <div className="flex justify-between font-extrabold pt-2 border-t text-indigo-600 dark:text-indigo-400">
                                        <span>Net Cash Total</span>
                                        <span className="font-mono">{formatVal(activeReport.cashBreakdown?.total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    if (!mounted) return null;

    const reportsList = data?.locations && Array.isArray(data.locations) && data.locations.length > 0
        ? data.locations
        : (data ? [data] : []);

    return (
        <div className="p-6 space-y-6 max-w-[1700px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5 no-print">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        <Receipt className="h-8 w-8 text-primary" />
                        Sales Reconciliation Report (ERP)
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
                        <Store className="h-4 w-4 text-primary/70" />
                        Outlets: <span className="text-foreground font-semibold ml-1">{activeSelectionNames}</span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button variant={exportState === "completed" ? "default" : "outline"} onClick={handleDownloadExcel}
                        disabled={exportState === "queueing" || exportState === "processing" || loading}
                        className={cn("gap-2 font-semibold transition-all", exportState === "completed" ? "bg-emerald-600 text-white border-none" : "border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400")}>
                        {exportState === "queueing" || exportState === "processing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        {exportState === "processing" ? `Generating ${exportProgress}%` : "Export Excel"}
                    </Button>
                    <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloading || loading} className="gap-2 font-semibold border-red-500/40 text-red-700 hover:bg-red-50 dark:text-red-400">
                        {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                        Export PDF
                    </Button>
                    <Button onClick={handlePrint} disabled={loading} className="gap-2 font-semibold">
                        <Printer className="h-4 w-4" />
                        Print Preview
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900/40 border p-5 rounded-xl shadow-sm no-print">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col gap-1.5 min-w-[280px]">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Store className="h-3.5 w-3.5 text-primary" />
                            Select Outlets / Stores
                        </span>
                        <MultiSelect
                            options={locationOptions}
                            value={selectedLocationIds}
                            onValueChange={setSelectedLocationIds}
                            placeholder="All Outlets"
                            className="bg-background"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            Reconciliation Date
                        </span>
                        <DatePicker
                            value={selectedDate}
                            onChange={(d: string) => setSelectedDate(d)}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5 min-w-[220px]">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Layers3 className="h-3.5 w-3.5 text-primary" />
                            View Mode
                        </span>
                        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg border border-slate-300 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setViewMode("separate")}
                                className={cn(
                                    "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                                    viewMode === "separate" ? "bg-white dark:bg-slate-900 text-primary shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                )}
                            >
                                <Layers className="h-3.5 w-3.5" />
                                Per Outlet Cards
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("merged")}
                                className={cn(
                                    "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                                    viewMode === "merged" ? "bg-white dark:bg-slate-900 text-primary shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                )}
                            >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                Merged Summary
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2 ml-auto">
                        <Button onClick={fetchDetails} disabled={loading} className="h-10 px-5 text-xs font-bold gap-1.5">
                            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            <div ref={reportRef} className="space-y-6">
                {loading ? (
                    <Card className="p-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="font-semibold text-sm">Calculating reconciliation figures for selected outlets...</p>
                        </div>
                    </Card>
                ) : viewMode === "merged" ? (
                    <SingleReportCard activeReport={data?.merged || data} />
                ) : (
                    <div className="space-y-8">
                        {reportsList.map((rep: any, idx: number) => (
                            <div key={rep.locationId || idx} className="space-y-2">
                                <SingleReportCard activeReport={rep} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
