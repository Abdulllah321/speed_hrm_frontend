"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { getCkPedroSalesReport } from "@/lib/actions/pos-sales";
import { getLocations, Location } from "@/lib/actions/location";
import { CkPedroReportRecord, CkPedroReportTotals } from "./types";
import { exportCkPedroToExcel } from "./excel-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Calendar,
  Store,
  ShoppingBag,
  DollarSign,
  Receipt,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/utils";

export function CkPedroSaleView() {
  const [isPending, startTransition] = useTransition();

  // Filters
  const today = new Date().toISOString().split("T")[0];
  const [asOfDate, setAsOfDate] = useState<string>(today);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [search, setSearch] = useState<string>("");

  // Data
  const [records, setRecords] = useState<CkPedroReportRecord[]>([]);
  const [totals, setTotals] = useState<CkPedroReportTotals | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Load locations on mount and filter STRICTLY for C&K and Pedro
  useEffect(() => {
    getLocations().then((res: any) => {
      const locList: Location[] = Array.isArray(res) ? res : res?.data || [];
      const isCkOrPedroLoc = (loc: Location) => {
        const c = (loc.code || "").toUpperCase().trim();
        const n = (loc.name || "").toUpperCase().trim();
        // C&K or Pedro only (exclude Puma and other brands)
        if (c.startsWith("CK") || (c.startsWith("P") && !c.startsWith("PU"))) return true;
        if (n.includes("C&K") || n.includes("CHARLES") || n.includes("PEDRO")) return true;
        return false;
      };

      const ckPedroStores = locList.filter(isCkOrPedroLoc);
      setLocations(ckPedroStores);
    });
  }, []);

  const locationOptions: MultiSelectOption[] = useMemo(() => {
    return locations.map((loc) => ({
      value: loc.id,
      label: `${loc.name} (${loc.code || "No Code"})`,
    }));
  }, [locations]);

  const loadReport = () => {
    startTransition(async () => {
      try {
        const res = await getCkPedroSalesReport({
          asOfDate,
          locationIds: selectedLocations,
          search,
        });

        if (res && res.status && res.data) {
          setRecords(res.data.records || []);
          setTotals(res.data.totals || null);
          setPage(1);
          toast.success(`Loaded ${res.data.records?.length || 0} transaction records`);
        } else {
          setRecords([]);
          setTotals(null);
          toast.error(res?.message || "Failed to load report data");
        }
      } catch (err: any) {
        toast.error(err.message || "An error occurred while loading the report");
      }
    });
  };

  useEffect(() => {
    loadReport();
  }, []);

  // Filtered in-memory records based on search input
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase().trim();
    return records.filter(
      (r) =>
        r.article?.toLowerCase().includes(q) ||
        r.barCode?.toLowerCase().includes(q) ||
        r.transactionID?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q)
    );
  }, [records, search]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;

  // Export handler
  const handleExport = async () => {
    if (records.length === 0) {
      toast.warning("No records available to export");
      return;
    }

    try {
      // Direct client-side export
      exportCkPedroToExcel(filteredRecords, asOfDate);
      toast.success("Excel file downloaded successfully!");
    } catch (e: any) {
      // Fallback to backend export endpoint
      const baseUrl = getApiBaseUrl();
      const locParam = selectedLocations.length > 0 ? selectedLocations.join(",") : "all";
      const exportUrl = `${baseUrl}/api/pos-sales/reports/ck-pedro-sale/export?asOfDate=${asOfDate}&locationId=${locParam}&search=${encodeURIComponent(
        search
      )}`;
      window.open(exportUrl, "_blank");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              C&K and Pedro Sales Report
            </h1>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
              Singapore Principal Export
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Complete Cash Memo, Exchange, and Claim register for Charles &amp; Keith and Pedro with 1.1% Cost factor and tax breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExport}
            disabled={isPending || records.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export to Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Calendar className="h-3.5 w-3.5" />
                As of Date (YYYY-MM-DD)
              </Label>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Store className="h-3.5 w-3.5" />
                C&K &amp; Pedro Stores (Select Store)
              </Label>
              <MultiSelect
                options={locationOptions}
                selected={selectedLocations}
                onValueChange={setSelectedLocations}
                placeholder="All C&K &amp; Pedro Stores"
                searchPlaceholder="Search store..."
                showSelectAll={true}
                className="h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Search className="h-3.5 w-3.5" />
                Search Article / Barcode / ID
              </Label>
              <Input
                type="text"
                placeholder="e.g. CK1-70580202 or CM-2828"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
              />
            </div>

            <div>
              <Button
                onClick={loadReport}
                disabled={isPending}
                className="w-full h-9 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Filter className="h-4 w-4" />
                )}
                Apply Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI Cards */}
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <ShoppingBag className="h-3.5 w-3.5 text-blue-500" /> Sold Qty
              </div>
              <div className="text-lg font-bold mt-1 text-slate-800 dark:text-slate-100">
                {totals.totalSoldQty.toLocaleString()} pcs
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {totals.totalRecords} records
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-slate-500" /> Total Price W.O.T
              </div>
              <div className="text-lg font-bold mt-1 text-slate-800 dark:text-slate-100">
                Rs. {totals.totalPriceWOT.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Gross Selling Price
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Percent className="h-3.5 w-3.5 text-amber-500" /> Discount Amount
              </div>
              <div className="text-lg font-bold mt-1 text-amber-600 dark:text-amber-400">
                Rs. {totals.totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Total Line Discount
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Receipt className="h-3.5 w-3.5 text-indigo-500" /> Value Ex Sales Tax
              </div>
              <div className="text-lg font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                Rs. {totals.totalValueExSalesTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Price - Discount
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Percent className="h-3.5 w-3.5 text-red-500" /> Total Sales Tax
              </div>
              <div className="text-lg font-bold mt-1 text-red-600 dark:text-red-400">
                Rs. {totals.totalSalesTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                GST (18% / 25%)
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200">
            <CardContent className="p-3">
              <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                <Receipt className="h-3.5 w-3.5 text-emerald-600" /> Value Incl Tax
              </div>
              <div className="text-lg font-bold mt-1 text-emerald-700 dark:text-emerald-200">
                Rs. {totals.totalValueInclSalesTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-emerald-600/80 mt-0.5">
                Grand Total Cash Memo
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="p-3 bg-muted/40 border-b flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="font-semibold text-slate-700 dark:text-slate-300">
            Showing {filteredRecords.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(page * pageSize, filteredRecords.length)} of {filteredRecords.length} records
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="px-2 text-xs font-medium">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <Table className="text-xs border-collapse">
            <TableHeader className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 z-10 shadow-sm">
              <TableRow className="border-b">
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">Country</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">Date</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">Location</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">Article</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">BarCode</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">SoldQty</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">UnitCost (1.1%)</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">GrossPrice</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">NetPrice</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-center whitespace-nowrap">TransactionID</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-center whitespace-nowrap">StaffID</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-center whitespace-nowrap">Emp_Code</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">Price_W_O_T</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">Total_Price_W_O_T</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">DiscountAmount</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">Value Ex Sales Tax</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">Sales Tax</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">Total Sales Tax</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">Value Incl Sales Tax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell colSpan={19} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground font-medium">
                        Loading C&K and Pedro transactions...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={19} className="h-32 text-center text-muted-foreground">
                    No transactions found for the selected date range and filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((r, idx) => {
                  const isReturn = r.soldQty < 0;
                  return (
                    <TableRow
                      key={`${r.transactionID}-${r.article}-${idx}`}
                      className={`hover:bg-muted/50 ${isReturn ? "bg-red-50/50 dark:bg-red-950/20" : ""}`}
                    >
                      <TableCell className="font-medium whitespace-nowrap">{r.country}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                      <TableCell className="font-mono text-[11px] whitespace-nowrap">{r.location}</TableCell>
                      <TableCell className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {r.article}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] whitespace-nowrap">{r.barCode}</TableCell>
                      <TableCell className={`text-right font-bold whitespace-nowrap ${isReturn ? "text-red-600" : ""}`}>
                        {r.soldQty}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {r.unitCost.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {r.grossPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {r.netPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center font-mono font-medium whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            r.transactionID.startsWith("CM")
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : r.transactionID.startsWith("EX")
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                          }`}
                        >
                          {r.transactionID}
                        </span>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">{r.staffID}</TableCell>
                      <TableCell className="text-center whitespace-nowrap">{r.emp_Code}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {r.price_W_O_T.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap font-medium">
                        {r.total_Price_W_O_T.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-amber-600 dark:text-amber-400">
                        {r.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap font-semibold">
                        {r.valueExSalesTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-red-600 dark:text-red-400">
                        {r.salesTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {r.totalSalesTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap font-bold text-emerald-700 dark:text-emerald-300">
                        {r.valueInclSalesTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
