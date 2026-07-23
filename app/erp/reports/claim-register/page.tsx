"use client";

import React, { useEffect, useState, useTransition, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getLocations, Location } from "@/lib/actions/location";
import {
  getClaimRegisterReport,
  queueClaimRegisterReportExport,
  getClaimRegisterReportExportStatus,
  ClaimRegisterReportData,
  OutletClaimGroup,
} from "@/lib/actions/claim-register";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Download,
  Printer,
  Loader2,
  Calendar,
  Search,
  Store,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Tag,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { cn, getApiBaseUrl } from "@/lib/utils";

export default function ClaimRegisterReportPage() {
  const { user } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  const locationParam = useMemo(
    () => (selectedLocationIds.length > 0 ? selectedLocationIds.join(",") : undefined),
    [selectedLocationIds],
  );

  const activeSelectionNames = useMemo(() => {
    if (selectedLocationIds.length > 0)
      return locations
        .filter((l) => selectedLocationIds.includes(l.id))
        .map((l) => l.name)
        .join(", ");
    return "All Outlets";
  }, [selectedLocationIds, locations]);

  const locationOptions: MultiSelectOption[] = useMemo(
    () =>
      locations.map((loc) => ({
        value: loc.id,
        label: loc.name,
        description: loc.code ? `Code: ${loc.code}` : undefined,
      })),
    [locations],
  );

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [searchQuery, setSearchQuery] = useState<string>("");

  const [reportData, setReportData] = useState<ClaimRegisterReportData | null>(null);
  const [isPending, startTransition] = useTransition();

  // Excel Export Queue States
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportState, setExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
  const [exportProgress, setExportProgress] = useState<number>(0);

  // PDF Export Queue States
  const [pdfJobId, setPdfJobId] = useState<string | null>(null);
  const [pdfExportState, setPdfExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
  const [pdfExportProgress, setPdfExportProgress] = useState<number>(0);

  // Fetch Locations on mount
  useEffect(() => {
    getLocations()
      .then((data: any) => {
        if (Array.isArray(data)) setLocations(data);
        else if (data?.status && Array.isArray(data?.data)) setLocations(data.data);
      })
      .catch(console.error);
  }, []);

  const fetchReport = useCallback(() => {
    if (!dateRange.from || !dateRange.to) return;
    startTransition(async () => {
      const result = await getClaimRegisterReport({
        locationId: locationParam ?? "",
        startDate: dateRange.from?.toISOString(),
        endDate: dateRange.to?.toISOString(),
        search: searchQuery.trim() || undefined,
      });
      if (result && result.status && result.data) {
        setReportData(result.data);
      } else {
        toast.error("Failed to load claim register report");
      }
    });
  }, [locationParam, dateRange, searchQuery]);

  useEffect(() => {
    fetchReport();
  }, [locationParam, dateRange]);

  // Poll Excel Job Status
  useEffect(() => {
    if (exportState !== "queueing" && exportState !== "processing") return;
    if (!exportJobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await getClaimRegisterReportExportStatus(exportJobId);
        if (res && res.status && res.data) {
          const { state, progress } = res.data;
          setExportProgress(progress || 0);

          if (state === "completed") {
            setExportState("completed");
            toast.success("Excel Export processed successfully! Click to download.");
            clearInterval(interval);
          } else if (state === "failed") {
            setExportState("failed");
            toast.error("Excel export job failed.");
            clearInterval(interval);
          } else {
            setExportState("processing");
          }
        }
      } catch (err) {
        console.error("Error polling Excel job status:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [exportState, exportJobId]);

  // Poll PDF Job Status
  useEffect(() => {
    if (pdfExportState !== "queueing" && pdfExportState !== "processing") return;
    if (!pdfJobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await getClaimRegisterReportExportStatus(pdfJobId);
        if (res && res.status && res.data) {
          const { state, progress } = res.data;
          setPdfExportProgress(progress || 0);

          if (state === "completed") {
            setPdfExportState("completed");
            toast.success("PDF document generated! Click to download.");
            clearInterval(interval);
          } else if (state === "failed") {
            setPdfExportState("failed");
            toast.error("PDF export job failed.");
            clearInterval(interval);
          } else {
            setPdfExportState("processing");
          }
        }
      } catch (err) {
        console.error("Error polling PDF job status:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pdfExportState, pdfJobId]);

  const handleExportExcelClick = async () => {
    if (!dateRange.from || !dateRange.to) return;

    if (exportState === "completed" && exportJobId) {
      const downloadUrl = `${getApiBaseUrl()}/api/pos-claims/reports/claim-register/export-download/${exportJobId}`;
      window.open(downloadUrl, "_blank");
      return;
    }

    setExportState("queueing");
    setExportProgress(0);
    try {
      const res = await queueClaimRegisterReportExport({
        locationId: locationParam ?? "",
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        format: "xlsx",
        search: searchQuery.trim() || undefined,
      });

      if (res && res.status && res.data?.jobId) {
        setExportJobId(res.data.jobId);
        setExportState("processing");
        toast.info("Excel export added to server queue...");
      } else {
        setExportState("failed");
        toast.error(res?.message || "Failed to queue Excel export");
      }
    } catch (err) {
      setExportState("failed");
      toast.error("An error occurred while queueing Excel export");
    }
  };

  const handleExportPdfClick = async () => {
    if (!dateRange.from || !dateRange.to) return;

    if (pdfExportState === "completed" && pdfJobId) {
      const downloadUrl = `${getApiBaseUrl()}/api/pos-claims/reports/claim-register/export-download/${pdfJobId}`;
      window.open(downloadUrl, "_blank");
      return;
    }

    setPdfExportState("queueing");
    setPdfExportProgress(0);
    try {
      const res = await queueClaimRegisterReportExport({
        locationId: locationParam ?? "",
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        format: "pdf",
        search: searchQuery.trim() || undefined,
      });

      if (res && res.status && res.data?.jobId) {
        setPdfJobId(res.data.jobId);
        setPdfExportState("processing");
        toast.info("PDF generation added to server queue...");
      } else {
        setPdfExportState("failed");
        toast.error(res?.message || "Failed to queue PDF export");
      }
    } catch (err) {
      setPdfExportState("failed");
      toast.error("An error occurred while queueing PDF export");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Flatten nested report data into a flat array for virtualization
  const flatRows = useMemo(() => {
    if (!reportData || !reportData.outlets) return [];
    const rows: any[] = [];

    for (const outlet of reportData.outlets) {
      rows.push({
        type: "outlet-header",
        id: `outlet-${outlet.locationId}`,
        locationName: outlet.locationName,
      });

      for (const claimGroup of outlet.claims) {
        for (const item of claimGroup.items) {
          rows.push({
            type: "item",
            id: `item-${item.id}`,
            data: item,
          });
        }

        rows.push({
          type: "claim-subtotal",
          id: `claim-sub-${claimGroup.claimId}`,
          claimNumber: claimGroup.claimNumber,
          totals: claimGroup.totals,
        });
      }

      rows.push({
        type: "outlet-subtotal",
        id: `outlet-sub-${outlet.locationId}`,
        locationName: outlet.locationName,
        totals: outlet.totals,
      });
    }

    return rows;
  }, [reportData]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  const formatNum = (val: number) => {
    if (val === undefined || val === null) return "-";
    return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatQty = (val: number) => {
    if (val === undefined || val === null) return "-";
    return val.toLocaleString("en-US");
  };

  const getExcelButtonLabel = () => {
    if (exportState === "queueing") return "Queueing...";
    if (exportState === "processing") return `Generating (${exportProgress}%)`;
    if (exportState === "completed") return "Download Excel";
    if (exportState === "failed") return "Retry Excel";
    return "Export Excel";
  };

  const getPdfButtonLabel = () => {
    if (pdfExportState === "queueing") return "Queueing...";
    if (pdfExportState === "processing") return `Generating (${pdfExportProgress}%)`;
    if (pdfExportState === "completed") return "Download PDF";
    if (pdfExportState === "failed") return "Retry PDF";
    return "Export PDF";
  };

  return (
    <div className="flex flex-col space-y-6 p-6 min-h-screen bg-slate-50/50 dark:bg-slate-950/50 print:bg-white print:p-0">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Claim Register Report
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sales returns, claim vouchers, settled invoices, and itemized breakdown
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReport}
            disabled={isPending}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={cn("w-4 h-4", isPending && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          {/* Export Excel Button */}
          <Button
            variant={exportState === "completed" ? "default" : "outline"}
            size="sm"
            onClick={handleExportExcelClick}
            disabled={exportState === "queueing" || exportState === "processing"}
            className={cn(
              "h-9 gap-1.5 transition-all",
              exportState === "completed" && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
            )}
          >
            {exportState === "processing" || exportState === "queueing" ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>{getExcelButtonLabel()}</span>
          </Button>

          {/* Export PDF Button */}
          <Button
            variant={pdfExportState === "completed" ? "default" : "outline"}
            size="sm"
            onClick={handleExportPdfClick}
            disabled={pdfExportState === "queueing" || pdfExportState === "processing"}
            className={cn(
              "h-9 gap-1.5 transition-all",
              pdfExportState === "completed" && "bg-rose-600 hover:bg-rose-700 text-white shadow-sm",
            )}
          >
            {pdfExportState === "processing" || pdfExportState === "queueing" ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>{getPdfButtonLabel()}</span>
          </Button>

          {/* Print Button */}
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 gap-1.5">
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="shadow-sm border-slate-200/80 dark:border-slate-800 print:hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Multi-Outlet Selection */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-indigo-500" />
                Select Outlets
              </label>
              <MultiSelect
                options={locationOptions}
                selected={selectedLocationIds}
                onChange={setSelectedLocationIds}
                placeholder="All Outlets"
                className="w-full"
              />
            </div>

            {/* Date Range Picker */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Date Range
              </label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                className="w-full"
              />
            </div>

            {/* Search Query */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-500" />
                Search Claims / Invoice / SKU
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Claim #, Inv #, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchReport()}
                  className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Report Document View */}
      <Card className="shadow-md border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden print:border-none print:shadow-none print:bg-transparent">
        <CardContent className="p-0">
          {/* Top Banner Information */}
          <div className="p-4 sm:p-6 bg-slate-900 text-white dark:bg-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 print:bg-white print:text-black print:p-0 print:border-b-2 print:border-black">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-xl text-indigo-400 print:hidden">
                ✓
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-wide uppercase text-indigo-300 print:text-blue-900 print:text-center print:text-lg">
                  {activeSelectionNames}
                </h2>
                <div className="text-xs text-slate-300 font-semibold tracking-wider uppercase flex flex-wrap items-center gap-2 print:text-red-700 print:text-center print:justify-center mt-1">
                  <span>Sales Return</span>
                  <span>|</span>
                  <span>Claim Register</span>
                  <span>|</span>
                  <span className="text-indigo-400 print:text-red-700">Crystal</span>
                  <span className="print:hidden">|</span>
                  <span className="text-slate-400 normal-case font-normal print:hidden">
                    Hierarchy: <span className="font-semibold text-slate-200">Outlet &rarr; Claim # &rarr; Item Detail</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-1.5 print:text-right">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold font-mono print:border-none print:bg-transparent print:text-red-600 print:text-sm">
                Date Range: {dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : ""} -{" "}
                {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : ""}
              </div>
              {searchQuery.trim() && (
                <div className="inline-flex items-center px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium print:text-black print:border-none">
                  Active Filter: "{searchQuery.trim()}"
                </div>
              )}
            </div>
          </div>

          {/* Loading Indicator */}
          {isPending && (
            <div className="p-12 flex flex-col items-center justify-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm font-medium">Aggregating claim data...</p>
            </div>
          )}

          {/* Empty State */}
          {!isPending && flatRows.length === 0 && (
            <div className="p-16 flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                <Tag className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                No Claims Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                No sales return claims were recorded for the selected outlets and date range. Try adjusting your filter parameters.
              </p>
            </div>
          )}

          {/* Virtualized Table */}
          {!isPending && flatRows.length > 0 && (
            <div ref={parentRef} className="overflow-auto max-h-[750px] w-full print:max-h-none print:overflow-visible">
              <table className="w-full text-xs text-left border-collapse min-w-[1300px] print:min-w-full font-sans">
                <thead className="sticky top-0 z-20 bg-slate-800 text-slate-100 shadow-sm print:static print:bg-slate-100 print:text-slate-900 print:border-y-2 print:border-black">
                  <tr>
                    <th className="p-2 font-bold w-[100px]">Base CM #</th>
                    <th className="p-2 font-bold w-[90px]">Base Date</th>
                    <th className="p-2 font-bold w-[100px]">Claim #</th>
                    <th className="p-2 font-bold w-[90px]">Claim Date</th>
                    <th className="p-2 font-bold w-[100px]">Settled Inv #</th>
                    <th className="p-2 font-bold w-[90px]">Settled Date</th>
                    <th className="p-2 font-bold min-w-[180px]">Product Description</th>
                    <th className="p-2 font-bold w-[110px]">Product</th>
                    <th className="p-2 font-bold w-[60px] text-center">Size</th>
                    <th className="p-2 font-bold w-[90px] text-center">HS Code</th>
                    <th className="p-2 font-bold w-[60px] text-right">Qty</th>
                    <th className="p-2 font-bold w-[90px] text-right">Unit Price</th>
                    <th className="p-2 font-bold w-[65px] text-right">Tax %</th>
                    <th className="p-2 font-bold w-[100px] text-right">Price WOT</th>
                    <th className="p-2 font-bold w-[95px] text-right">Sub Total</th>
                    <th className="p-2 font-bold w-[90px] text-right">Discount</th>
                    <th className="p-2 font-bold w-[90px] text-right">Tax Amt</th>
                    <th className="p-2 font-bold w-[100px] text-right">Net Total</th>
                  </tr>
                </thead>

                <tbody>
                  {paddingTop > 0 && (
                    <tr>
                      <td colSpan={18} style={{ height: `${paddingTop}px` }} />
                    </tr>
                  )}

                  {virtualItems.map((virtualRow) => {
                    const row = flatRows[virtualRow.index];

                    if (row.type === "outlet-header") {
                      return (
                        <tr key={row.id} className="bg-slate-100 dark:bg-slate-800 border-y border-slate-300 dark:border-slate-700">
                          <td colSpan={18} className="p-2.5 font-extrabold text-sm text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                            Outlet: {row.locationName}
                          </td>
                        </tr>
                      );
                    }

                    if (row.type === "item") {
                      const item = row.data;
                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-800 transition-colors"
                        >
                          <td className="p-2 font-mono text-slate-700 dark:text-slate-300">{item.baseCmNumber}</td>
                          <td className="p-2 text-slate-600 dark:text-slate-400">{item.baseCmDate}</td>
                          <td className="p-2 font-mono font-medium text-slate-900 dark:text-slate-100">{item.claimNumber}</td>
                          <td className="p-2 text-slate-600 dark:text-slate-400">{item.claimDate}</td>
                          <td className="p-2 font-mono text-slate-700 dark:text-slate-300">{item.settledInvNumber}</td>
                          <td className="p-2 text-slate-600 dark:text-slate-400">{item.settledDate}</td>
                          <td className="p-2 font-medium text-slate-900 dark:text-slate-100 truncate max-w-[220px]" title={item.productDescription}>
                            {item.productDescription}
                          </td>
                          <td className="p-2 font-mono text-xs text-indigo-600 dark:text-indigo-400">{item.productSku}</td>
                          <td className="p-2 text-center font-semibold">{item.size}</td>
                          <td className="p-2 text-center font-mono text-xs text-slate-500">{item.hsCode}</td>
                          <td className="p-2 text-right font-medium">{formatQty(item.quantity)}</td>
                          <td className="p-2 text-right font-mono">{formatNum(item.unitPrice)}</td>
                          <td className="p-2 text-right font-mono text-slate-500">{item.taxPercent.toFixed(2)}</td>
                          <td className="p-2 text-right font-mono">{formatNum(item.unitPriceWot)}</td>
                          <td className="p-2 text-right font-mono font-medium">{formatNum(item.subTotal)}</td>
                          <td className="p-2 text-right font-mono text-amber-600 dark:text-amber-400">{formatNum(item.discountAmount)}</td>
                          <td className="p-2 text-right font-mono text-indigo-600 dark:text-indigo-400">{formatNum(item.taxAmount)}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">{formatNum(item.netTotal)}</td>
                        </tr>
                      );
                    }

                    if (row.type === "claim-subtotal") {
                      return (
                        <tr key={row.id} className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-300 border-b-2 border-slate-900 dark:border-slate-100">
                          <td colSpan={8}></td>
                          <td colSpan={2} className="p-1.5 text-center">
                            <span className="inline-block px-2 py-0.5 border border-slate-900 dark:border-slate-100 rounded text-xs font-bold bg-white dark:bg-slate-800">
                              Claim #: {row.claimNumber}
                            </span>
                          </td>
                          <td className="p-2 text-right font-bold">{formatQty(row.totals.quantity)}</td>
                          <td colSpan={3}></td>
                          <td className="p-2 text-right font-mono font-bold">{formatNum(row.totals.subTotal)}</td>
                          <td className="p-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400">{formatNum(row.totals.discountAmount)}</td>
                          <td className="p-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatNum(row.totals.taxAmount)}</td>
                          <td className="p-2 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100 border-b-2 border-slate-900 dark:border-slate-100">{formatNum(row.totals.netTotal)}</td>
                        </tr>
                      );
                    }

                    if (row.type === "outlet-subtotal") {
                      return (
                        <tr key={row.id} className="bg-indigo-50/70 dark:bg-indigo-950/40 border-t-2 border-b-2 border-indigo-900 dark:border-indigo-400">
                          <td colSpan={8} className="p-3 font-extrabold text-indigo-950 dark:text-indigo-200">
                            Total for {row.locationName}
                          </td>
                          <td colSpan={2}></td>
                          <td className="p-3 text-right font-extrabold text-indigo-950 dark:text-indigo-200">{formatQty(row.totals.quantity)}</td>
                          <td colSpan={3}></td>
                          <td className="p-3 text-right font-mono font-extrabold text-indigo-950 dark:text-indigo-200">{formatNum(row.totals.subTotal)}</td>
                          <td className="p-3 text-right font-mono font-extrabold text-amber-700 dark:text-amber-300">{formatNum(row.totals.discountAmount)}</td>
                          <td className="p-3 text-right font-mono font-extrabold text-indigo-700 dark:text-indigo-300">{formatNum(row.totals.taxAmount)}</td>
                          <td className="p-3 text-right font-mono font-black text-indigo-950 dark:text-indigo-100 underline decoration-double">{formatNum(row.totals.netTotal)}</td>
                        </tr>
                      );
                    }

                    return null;
                  })}

                  {paddingBottom > 0 && (
                    <tr>
                      <td colSpan={18} style={{ height: `${paddingBottom}px` }} />
                    </tr>
                  )}
                </tbody>

                {/* Grand Total Footer */}
                {reportData.grandTotals && (
                  <tfoot className="sticky bottom-0 z-20 bg-slate-900 text-white font-bold border-t-2 border-slate-950 shadow-md print:static">
                    <tr>
                      <td colSpan={8} className="p-3 uppercase tracking-wider font-black text-xs text-indigo-300">
                        GRAND TOTAL (ALL OUTLETS)
                      </td>
                      <td colSpan={2}></td>
                      <td className="p-3 text-right font-black">{formatQty(reportData.grandTotals.quantity)}</td>
                      <td colSpan={3}></td>
                      <td className="p-3 text-right font-mono font-black">{formatNum(reportData.grandTotals.subTotal)}</td>
                      <td className="p-3 text-right font-mono font-black text-amber-300">{formatNum(reportData.grandTotals.discountAmount)}</td>
                      <td className="p-3 text-right font-mono font-black text-indigo-300">{formatNum(reportData.grandTotals.taxAmount)}</td>
                      <td className="p-3 text-right font-mono font-black text-emerald-400 text-sm">{formatNum(reportData.grandTotals.netTotal)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
