"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { getCkPedroStockReport } from "@/lib/actions/pos-sales";
import { getLocations, Location } from "@/lib/actions/location";
import { CkPedroStockRecord, CkPedroStockTotals } from "./types";
import { exportCkPedroStockToExcel } from "./excel-export";
import Link from "next/link";
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
  Loader2,
  Calendar,
  Store,
  Boxes,
  DollarSign,
  PackageCheck,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/utils";

export function CkPedroStockView() {
  const [isPending, startTransition] = useTransition();

  // Filters
  const today = new Date().toISOString().split("T")[0];
  const [asOfDate, setAsOfDate] = useState<string>(today);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [search, setSearch] = useState<string>("");

  // Data
  const [records, setRecords] = useState<CkPedroStockRecord[]>([]);
  const [totals, setTotals] = useState<CkPedroStockTotals | null>(null);
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
        const res = await getCkPedroStockReport({
          asOfDate,
          locationIds: selectedLocations,
          search,
        });

        if (res && res.status && res.data) {
          setRecords(res.data.records || []);
          setTotals(res.data.totals || null);
          setPage(1);
          toast.success(`Loaded ${res.data.records?.length || 0} stock items`);
        } else {
          setRecords([]);
          setTotals(null);
          toast.error(res?.message || "Failed to load stock data");
        }
      } catch (err: any) {
        toast.error(err.message || "An error occurred while loading the report");
      }
    });
  };

  useEffect(() => {
    loadReport();
  }, []);

  // Filtered in-memory records based on search
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase().trim();
    return records.filter(
      (r) =>
        r.articleNo?.toLowerCase().includes(q) ||
        r.barCode?.toLowerCase().includes(q) ||
        r.storeName?.toLowerCase().includes(q)
    );
  }, [records, search]);

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
      exportCkPedroStockToExcel(filteredRecords, asOfDate);
      toast.success("Stock Excel file downloaded successfully!");
    } catch (e: any) {
      const baseUrl = getApiBaseUrl();
      const locParam = selectedLocations.length > 0 ? selectedLocations.join(",") : "all";
      const exportUrl = `${baseUrl}/api/pos-sales/reports/ck-pedro-stock/export?asOfDate=${asOfDate}&locationId=${locParam}&search=${encodeURIComponent(
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
              C&K and Pedro Stock Report
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full dark:bg-emerald-900 dark:text-emerald-300">
              Singapore Principal Stock
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Available On Hand Inventory for Charles &amp; Keith and Pedro with 1.1% Cost factor and selling prices without sales tax.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/erp/reports/pos/ck-pedro-sale">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
              Go to Sales Report <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
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
                C&K &amp; Pedro Stores (Multi-Select)
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
                Search Article / Barcode
              </Label>
              <Input
                type="text"
                placeholder="e.g. P-AIRPILLOW-L or barcode"
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-blue-500" /> Total Active SKUs
              </div>
              <div className="text-lg font-bold mt-1 text-slate-800 dark:text-slate-100">
                {totals.totalRecords.toLocaleString()} items
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Across selected outlets
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Boxes className="h-3.5 w-3.5 text-emerald-500" /> Total On Hand Qty
              </div>
              <div className="text-lg font-bold mt-1 text-emerald-700 dark:text-emerald-300">
                {totals.totalOnHandQty.toLocaleString()} pcs
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Available Stock
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-indigo-500" /> Total Landed Cost (1.1%)
              </div>
              <div className="text-lg font-bold mt-1 text-indigo-700 dark:text-indigo-300">
                Rs. {totals.totalLandedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                System Cost + 1.1% Factor
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <PackageCheck className="h-3.5 w-3.5 text-amber-500" /> Total Gross Selling Value
              </div>
              <div className="text-lg font-bold mt-1 text-slate-800 dark:text-slate-100">
                Rs. {totals.totalGrossValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Value Without Sales Tax
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
            {Math.min(page * pageSize, filteredRecords.length)} of {filteredRecords.length} items
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
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">StoreName</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">ArticleNo</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">BarCode</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">Batch</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">OnHandQty</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">UnitLandedCost (1.1%)</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">UnitGrossPrice</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">UnitNetPrice</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-100 text-center whitespace-nowrap">Column1</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground font-medium">
                        Loading C&K and Pedro stock inventory...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                    No stock records found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((r, idx) => (
                  <TableRow
                    key={`${r.storeName}-${r.articleNo}-${r.barCode}-${idx}`}
                    className="hover:bg-muted/50"
                  >
                    <TableCell className="font-medium whitespace-nowrap">{r.country}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                    <TableCell className="font-mono text-[11px] whitespace-nowrap font-semibold">
                      {r.storeName}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {r.articleNo}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] whitespace-nowrap">{r.barCode}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{r.batch || "-"}</TableCell>
                    <TableCell className="text-right font-bold whitespace-nowrap text-emerald-700 dark:text-emerald-300">
                      {r.onHandQty.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {r.unitLandedCost.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {r.unitGrossPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {r.unitNetPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap text-muted-foreground">-</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

