                                                                                                                           "use client";

import React, { useEffect, useState, useTransition, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getLocations, Location } from "@/lib/actions/location";
import {
  getCostOfSalesReport,
  queueCostOfSalesExport,
  getCostOfSalesExportStatus,
  CostOfSalesReportData,
} from "@/lib/actions/cost-of-sales";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Printer,
  Loader2,
  Calendar,
  Search,
  Store,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  DollarSign,
  Layers,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { cn, getApiBaseUrl } from "@/lib/utils";

export default function CostOfSalesReportPage() {
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

  const [reportData, setReportData] = useState<CostOfSalesReportData | null>(null);
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
      const result = await getCostOfSalesReport({
        locationId: locationParam ?? "",
        startDate: dateRange.from?.toISOString(),
        endDate: dateRange.to?.toISOString(),
        search: searchQuery.trim() || undefined,
      });
      if (result && result.status && result.data) {
        setReportData(result.data);
      } else {
        toast.error("Failed to load Cost of Sales report");
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
        const res = await getCostOfSalesExportStatus(exportJobId);
        if (res && res.status && res.data) {
          const { state, progress } = res.data;
          setExportProgress(progress || 0);

          if (state === "completed") {
            setExportState("completed");
            toast.success("Excel export processed successfully! Click to download.");
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
        const res = await getCostOfSalesExportStatus(pdfJobId);
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
      const downloadUrl = `${getApiBaseUrl()}/api/pos-sales/reports/cost-of-sales/export-download/${exportJobId}`;
      window.open(downloadUrl, "_blank");
      return;
    }

    setExportState("queueing");
    setExportProgress(0);
    try {
      const res = await queueCostOfSalesExport({
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
      const downloadUrl = `${getApiBaseUrl()}/api/pos-sales/reports/cost-of-sales/export-download/${pdfJobId}`;
      window.open(downloadUrl, "_blank");
      return;
    }

    setPdfExportState("queueing");
    setPdfExportProgress(0);
    try {
      const res = await queueCostOfSalesExport({
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

  // Flatten deep hierarchical tree for virtualization
  const flatRows = useMemo(() => {
    if (!reportData || !reportData.outlets) return [];
    const rows: any[] = [];

    for (const outlet of reportData.outlets) {
      rows.push({
        type: "outlet-header",
        id: `outlet-${outlet.locationId}`,
        name: outlet.locationName,
      });

      for (const div of outlet.divisions) {
        rows.push({
          type: "div-header",
          id: `div-${div.divisionId}`,
          name: div.divisionName,
        });

        for (const brand of div.brands) {
          rows.push({
            type: "brand-header",
            id: `brand-${brand.brandId}`,
            name: brand.brandName,
          });

          for (const gender of brand.genders) {
            rows.push({
              type: "gender-header",
              id: `gender-${gender.genderId}`,
              name: gender.genderName,
            });

            for (const cat of gender.categories) {
              rows.push({
                type: "cat-header",
                id: `cat-${cat.categoryId}`,
                name: cat.categoryName,
              });

              for (const prod of cat.products) {
                for (const item of prod.sizes) {
                  rows.push({
                    type: "size-item",
                    id: `item-${item.id}`,
                    productLabel: prod.productLabel,
                    size: item.size,
                    quantity: item.quantity,
                    costPrice: item.costPrice,
                    totalCost: item.totalCost,
                  });
                }

                rows.push({
                  type: "prod-subtotal",
                  id: `prod-sub-${prod.sku}`,
                  label: `Total for ${prod.sku}`,
                  totals: prod.totals,
                });
              }

              rows.push({
                type: "cat-subtotal",
                id: `cat-sub-${cat.categoryId}`,
                label: `Category Total: ${cat.categoryName}`,
                totals: cat.totals,
              });
            }

            rows.push({
              type: "gender-subtotal",
              id: `gender-sub-${gender.genderId}`,
              label: `Gender Total: ${gender.genderName}`,
              totals: gender.totals,
            });
          }

          rows.push({
            type: "brand-subtotal",
            id: `brand-sub-${brand.brandId}`,
            label: `Brand Total: ${brand.brandName}`,
            totals: brand.totals,
          });
        }

        rows.push({
          type: "div-subtotal",
          id: `div-sub-${div.divisionId}`,
          label: `Division Total: ${div.divisionName}`,
          totals: div.totals,
        });
      }

      rows.push({
        type: "outlet-subtotal",
        id: `outlet-sub-${outlet.locationId}`,
        name: outlet.locationName,
        totals: outlet.totals,
      });
    }

    return rows;
  }, [reportData]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 34,
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
      {/* Page Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl text-white shadow-md shadow-emerald-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Cost of Sales Report
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Itemized costing of goods sold per outlet with hierarchical category aggregation
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
                <Store className="w-3.5 h-3.5 text-emerald-500" />
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
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
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
                <Search className="w-3.5 h-3.5 text-emerald-500" />
                Search Product / SKU / Category
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="SKU, Product, Category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchReport()}
                  className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xl print:hidden">
                $
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-wide uppercase text-emerald-400 print:text-slate-900 print:text-center print:text-lg">
                  {activeSelectionNames}
                </h2>
                <div className="text-xs text-slate-300 font-semibold tracking-wider uppercase flex flex-wrap items-center gap-2 print:text-teal-800 print:text-center print:justify-center mt-1">
                  <span>ERP Reports</span>
                  <span>|</span>
                  <span>Cost of Sales</span>
                  <span className="print:hidden">|</span>
                  <span className="text-slate-400 normal-case font-normal print:hidden">
                    Hierarchy: <span className="font-semibold text-slate-200">Division &rarr; Brand &rarr; Gender &rarr; Category &rarr; Product &rarr; Size</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-1.5 print:text-right">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono print:border-none print:bg-transparent print:text-emerald-700 print:text-sm">
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

          {/* Loading State */}
          {isPending && (
            <div className="p-12 flex flex-col items-center justify-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-sm font-medium">Aggregating sold articles cost of sales...</p>
            </div>
          )}

          {/* Empty State */}
          {!isPending && flatRows.length === 0 && (
            <div className="p-16 flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                <Tag className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                No Sold Articles Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                No POS sales were recorded for the selected outlets and date range. Try expanding your date range or outlet selection.
              </p>
            </div>
          )}

          {/* Virtualized Hierarchical Table */}
          {!isPending && flatRows.length > 0 && (
            <div ref={parentRef} className="overflow-auto max-h-[750px] w-full print:max-h-none print:overflow-visible">
              <table className="w-full text-xs text-left border-collapse min-w-[900px] print:min-w-full font-sans">
                <thead className="sticky top-0 z-20 bg-slate-900 text-slate-100 shadow-sm print:static print:bg-slate-100 print:text-slate-900 print:border-y-2 print:border-black">
                  <tr>
                    <th className="p-2.5 font-bold min-w-[320px]">GPC / Category / Product</th>
                    <th className="p-2.5 font-bold w-[90px] text-center">Size</th>
                    <th className="p-2.5 font-bold w-[120px] text-right">Quantity</th>
                    <th className="p-2.5 font-bold w-[150px] text-right">Cost Price (Rs.)</th>
                    <th className="p-2.5 font-bold w-[160px] text-right">Total Cost (Rs.)</th>
                  </tr>
                </thead>

                <tbody>
                  {paddingTop > 0 && (
                    <tr>
                      <td colSpan={5} style={{ height: `${paddingTop}px` }} />
                    </tr>
                  )}

                  {virtualItems.map((virtualRow) => {
                    const row = flatRows[virtualRow.index];

                    if (row.type === "outlet-header") {
                      return (
                        <tr key={row.id} className="bg-slate-800 text-slate-100 border-y border-slate-700">
                          <td colSpan={5} className="p-3 font-extrabold text-sm uppercase tracking-wider text-emerald-400">
                            OUTLET: {row.name}
                          </td>
                        </tr>
                      );
                    }

                    if (row.type === "div-header") {
                      return (
                        <tr key={row.id} className="bg-slate-100 dark:bg-slate-800/80 border-t border-slate-300 dark:border-slate-700">
                          <td colSpan={5} className="p-2 font-bold text-sky-700 dark:text-sky-400 pl-4">
                            Division: {row.name}
                          </td>
                        </tr>
                      );
                    }

                    if (row.type === "brand-header") {
                      return (
                        <tr key={row.id} className="bg-slate-50 dark:bg-slate-800/40">
                          <td colSpan={5} className="p-2 font-semibold text-slate-700 dark:text-slate-300 pl-8">
                            Brand: {row.name}
                          </td>
                        </tr>
                      );
                    }

                    if (row.type === "gender-header") {
                      return (
                        <tr key={row.id} className="bg-white dark:bg-slate-900">
                          <td colSpan={5} className="p-2 font-medium text-slate-600 dark:text-slate-400 pl-12">
                            Gender: {row.name}
                          </td>
                        </tr>
                      );
                    }

                    if (row.type === "cat-header") {
                      return (
                        <tr key={row.id} className="bg-white dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800">
                          <td colSpan={5} className="p-2 font-semibold text-teal-700 dark:text-teal-400 pl-16">
                            Category: {row.name}
                          </td>
                        </tr>
                      );
                    }

                    if (row.type === "size-item") {
                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/60 transition-colors"
                        >
                          <td className="p-2 pl-20 font-normal text-slate-800 dark:text-slate-200 truncate max-w-[360px]" title={row.productLabel}>
                            {row.productLabel}
                          </td>
                          <td className="p-2 text-center font-semibold text-slate-700 dark:text-slate-300">{row.size}</td>
                          <td className="p-2 text-right font-mono font-medium">{formatQty(row.quantity)}</td>
                          <td className="p-2 text-right font-mono text-slate-600 dark:text-slate-400">{formatNum(row.costPrice)}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">{formatNum(row.totalCost)}</td>
                        </tr>
                      );
                    }

                    if (row.type === "prod-subtotal") {
                      return (
                        <tr key={row.id} className="bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800">
                          <td className="p-1.5 pl-20 font-bold text-xs text-slate-600 dark:text-slate-400">{row.label}</td>
                          <td></td>
                          <td className="p-1.5 text-right font-mono font-bold">{formatQty(row.totals.quantity)}</td>
                          <td></td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{formatNum(row.totals.totalCost)}</td>
                        </tr>
                      );
                    }

                    if (row.type === "cat-subtotal") {
                      return (
                        <tr key={row.id} className="bg-teal-50/50 dark:bg-teal-950/20 border-t border-teal-300 dark:border-teal-800 border-b-2 border-teal-600">
                          <td className="p-2 pl-16 font-bold text-teal-800 dark:text-teal-300">{row.label}</td>
                          <td></td>
                          <td className="p-2 text-right font-mono font-bold text-teal-900 dark:text-teal-200">{formatQty(row.totals.quantity)}</td>
                          <td></td>
                          <td className="p-2 text-right font-mono font-bold text-teal-900 dark:text-teal-200">{formatNum(row.totals.totalCost)}</td>
                        </tr>
                      );
                    }

                    if (row.type === "gender-subtotal") {
                      return (
                        <tr key={row.id} className="bg-slate-100/60 dark:bg-slate-800/40 border-t border-slate-300 dark:border-slate-700 border-b-2 border-slate-400">
                          <td className="p-2 pl-12 font-bold text-slate-700 dark:text-slate-300">{row.label}</td>
                          <td></td>
                          <td className="p-2 text-right font-mono font-bold">{formatQty(row.totals.quantity)}</td>
                          <td></td>
                          <td className="p-2 text-right font-mono font-bold">{formatNum(row.totals.totalCost)}</td>
                        </tr>
                      );
                    }

                    if (row.type === "brand-subtotal") {
                      return (
                        <tr key={row.id} className="bg-slate-100 dark:bg-slate-800/60 border-t border-slate-400 dark:border-slate-600 border-b-2 border-slate-600">
                          <td className="p-2 pl-8 font-bold text-slate-800 dark:text-slate-200">{row.label}</td>
                          <td></td>
                          <td className="p-2 text-right font-mono font-bold">{formatQty(row.totals.quantity)}</td>
                          <td></td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">{formatNum(row.totals.totalCost)}</td>
                        </tr>
                      );
                    }

                    if (row.type === "div-subtotal") {
                      return (
                        <tr key={row.id} className="bg-sky-50 dark:bg-sky-950/30 border-t-2 border-sky-400 border-b-2 border-sky-700">
                          <td className="p-2.5 pl-4 font-extrabold text-sky-900 dark:text-sky-300">{row.label}</td>
                          <td></td>
                          <td className="p-2.5 text-right font-mono font-extrabold text-sky-900 dark:text-sky-300">{formatQty(row.totals.quantity)}</td>
                          <td></td>
                          <td className="p-2.5 text-right font-mono font-extrabold text-sky-900 dark:text-sky-200">{formatNum(row.totals.totalCost)}</td>
                        </tr>
                      );
                    }

                    if (row.type === "outlet-subtotal") {
                      return (
                        <tr key={row.id} className="bg-slate-900 text-white border-t-2 border-b-2 border-black">
                          <td className="p-3 font-extrabold text-emerald-400 uppercase tracking-wider">
                            TOTAL FOR {row.name}
                          </td>
                          <td></td>
                          <td className="p-3 text-right font-mono font-extrabold">{formatQty(row.totals.quantity)}</td>
                          <td></td>
                          <td className="p-3 text-right font-mono font-black text-emerald-300 text-sm underline decoration-double">{formatNum(row.totals.totalCost)}</td>
                        </tr>
                      );
                    }

                    return null;
                  })}

                  {paddingBottom > 0 && (
                    <tr>
                      <td colSpan={5} style={{ height: `${paddingBottom}px` }} />
                    </tr>
                  )}
                </tbody>

                {/* Grand Total Footer */}
                {reportData && reportData.grandTotals && (
                  <tfoot className="sticky bottom-0 z-20 bg-slate-950 text-white font-bold border-t-2 border-slate-900 shadow-md print:static">
                    <tr>
                      <td className="p-3.5 uppercase tracking-wider font-black text-xs text-emerald-400">
                        GRAND TOTAL (ALL OUTLETS)
                      </td>
                      <td></td>
                      <td className="p-3.5 text-right font-mono font-black text-sm">{formatQty(reportData.grandTotals.quantity)}</td>
                      <td></td>
                      <td className="p-3.5 text-right font-mono font-black text-emerald-400 text-base">{formatNum(reportData.grandTotals.totalCost)}</td>
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
