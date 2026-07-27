"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Download,
  DollarSign,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  getOverallAvailableReservedStockReport,
  queueOverallAvailableReservedStockReportExport,
  getOverallAvailableReservedStockReportExportStatus,
} from "@/lib/actions/stock-ledger";
import { getWarehouses } from "@/lib/actions/warehouse";
import { getLocations } from "@/lib/actions/location";

interface StockNode {
  level: string;
  value: string;
  sku?: string;
  barCode?: string;
  itemName?: string;
  brand?: string;
  division?: string;
  department?: string;
  category?: string;
  gender?: string;
  silhouette?: string;
  season?: string;
  color?: string;
  size?: string;
  totals: {
    availableStock: number;
    reservedStock: number;
    totalStock: number;
    unitPrice: number;
    unitCost: number;
    discountRate: number;
    taxRate: number;
    availableValue: number;
    reservedValue: number;
    totalValue: number;
    availableCostingValue: number;
    reservedCostingValue: number;
    totalCostingValue: number;
    warehouseStocks: Record<string, number>;
    locationStocks: Record<string, number>;
  };
  children?: StockNode[];
}

export default function OverallAvailableReservedStockPage() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<StockNode[]>([]);
  const [grandTotals, setGrandTotals] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [stockLocations, setStockLocations] = useState<{ id: string; name: string; code?: string; shortCode?: string }[]>([]);

  // Filter state
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [includeCosting, setIncludeCosting] = useState(false);

  // Level visibility switches
  const [showBrand, setShowBrand] = useState(true);
  const [showDivision, setShowDivision] = useState(true);
  const [showCategory, setShowCategory] = useState(true);
  const [showGender, setShowGender] = useState(true);
  const [showSilhouette, setShowSilhouette] = useState(true);
  const [showArticle, setShowArticle] = useState(true);
  const [showVariant, setShowVariant] = useState(true);

  // Background export state
  const [exportState, setExportState] = useState<"idle" | "queueing" | "processing" | "completed" | "failed">("idle");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportJobId, setExportJobId] = useState<string | null>(null);

  // Load dropdown lists
  useEffect(() => {
    async function loadOptions() {
      try {
        const [whRes, locRes] = await Promise.all([getWarehouses(), getLocations()]);
        if (whRes?.status && Array.isArray(whRes.data)) {
          setWarehouses(whRes.data);
        }
        if (locRes?.status && Array.isArray(locRes.data)) {
          setStockLocations(locRes.data.filter((l: any) => l.isStockLocation !== false));
        }
      } catch (err) {
        console.error("Error loading warehouses/locations", err);
      }
    }
    loadOptions();
  }, []);

  // Fetch report data
  const handleFetchReport = async () => {
    setLoading(true);
    try {
      const res = await getOverallAvailableReservedStockReport({
        warehouseId: selectedWarehouseIds.join(","),
        locationId: selectedLocationIds.join(","),
        showBrand,
        showDivision,
        showCategory,
        showGender,
        showSilhouette,
        showArticle,
        showVariant,
        includeCosting,
      });

      if (res?.root) {
        setReportData(res.root);
        setGrandTotals(res.grandTotals);
        if (Array.isArray(res.warehouses)) setWarehouses(res.warehouses);
        if (Array.isArray(res.stockLocations)) setStockLocations(res.stockLocations);
      }
    } catch (err) {
      console.error("Failed to fetch overall available reserved stock report", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetchReport();
  }, [includeCosting]);

  // Handle Export Queue
  const handleQueueExport = async (format: "xlsx" | "pdf") => {
    setExportState("queueing");
    setExportProgress(0);
    try {
      const res = await queueOverallAvailableReservedStockReportExport({
        warehouseId: selectedWarehouseIds.join(","),
        locationId: selectedLocationIds.join(","),
        format,
        showBrand,
        showDivision,
        showCategory,
        showGender,
        showSilhouette,
        showArticle,
        showVariant,
        includeCosting,
      });

      if (res?.status && res.data?.jobId) {
        setExportJobId(res.data.jobId);
        setExportState("processing");
      } else {
        setExportState("failed");
      }
    } catch (err) {
      console.error("Failed to queue export", err);
      setExportState("failed");
    }
  };

  // Poll export status
  useEffect(() => {
    if (!exportJobId || exportState !== "processing") return;

    const interval = setInterval(async () => {
      try {
        const res = await getOverallAvailableReservedStockReportExportStatus(exportJobId);
        if (res?.status && res.data) {
          setExportProgress(res.data.progress);
          if (res.data.state === "completed") {
            setExportState("completed");
            clearInterval(interval);
          } else if (res.data.state === "failed") {
            setExportState("failed");
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Error polling export status", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [exportJobId, exportState]);

  // Download Trigger (CORS safe window.open)
  const handleDownloadExport = () => {
    if (!exportJobId) return;
    const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/stock-ledger/overall-available-reserved-stock/export/${exportJobId}/download`;
    window.open(downloadUrl, "_blank");
  };

  // Flatten tree for TanStack virtualizer
  const flatRows = useMemo(() => {
    const rows: { id: string; level: string; value: string; data: StockNode }[] = [];

    const traverse = (node: StockNode, parentId = "") => {
      const id = `${parentId}_${node.level}_${node.value}`;

      if (search) {
        const query = search.toLowerCase();
        const matchesSearch =
          node.value.toLowerCase().includes(query) ||
          (node.sku && node.sku.toLowerCase().includes(query)) ||
          (node.itemName && node.itemName.toLowerCase().includes(query)) ||
          (node.barCode && node.barCode.toLowerCase().includes(query));

        if (matchesSearch) {
          rows.push({ id, level: node.level, value: node.value, data: node });
        }
      } else {
        rows.push({ id, level: node.level, value: node.value, data: node });
      }

      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          traverse(child, id);
        }
      }
    };

    for (const rootNode of reportData) {
      traverse(rootNode);
    }
    return rows;
  }, [reportData, search]);

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
  const paddingBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  const formatVal = (val?: number) => (!val || val === 0 ? "-" : val.toLocaleString());
  const formatPrice = (val?: number) => (!val || val === 0 ? "-" : `Rs. ${val.toLocaleString()}`);

  const warehouseOptions = warehouses.map((w) => ({ label: w.name, value: w.id }));
  const locationOptions = stockLocations.map((l) => ({ label: l.shortCode ? `${l.shortCode} (${l.name})` : l.name, value: l.id }));

  return (
    <div className="p-6 space-y-6 max-w-[1800px] mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-black tracking-tight">Overall Available + Reserved Stock Report</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Comprehensive stock valuation and inventory balance across all warehouses and POS outlets
              </p>
            </div>
          </div>
        </div>

        {/* Costing Variant Switcher */}
        <div className="flex items-center gap-4 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
          <DollarSign className="h-5 w-5 text-indigo-400" />
          <div className="flex items-center space-x-2">
            <Label htmlFor="costing-mode" className="text-xs font-semibold text-slate-300">
              {includeCosting ? "Unit Cost & Unit Price Both" : "Unit Price Only"}
            </Label>
            <Switch
              id="costing-mode"
              checked={includeCosting}
              onCheckedChange={setIncludeCosting}
            />
          </div>
        </div>
      </div>

      {/* Filter Controls Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-600" /> Filters & Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Warehouses</Label>
              <MultiSelect
                options={warehouseOptions}
                selected={selectedWarehouseIds}
                onChange={setSelectedWarehouseIds}
                placeholder="All Warehouses"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Stock Locations / Outlets</Label>
              <MultiSelect
                options={locationOptions}
                selected={selectedLocationIds}
                onChange={setSelectedLocationIds}
                placeholder="All Stock Outlets"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Search Item / SKU / Barcode</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter table rows..."
                  className="pl-9 text-sm"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleFetchReport} disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Apply Filters
              </Button>
            </div>
          </div>

          {/* Hierarchy Level Checkboxes */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700">
            <span className="flex items-center gap-1 font-bold text-slate-900">
              <Layers className="h-3.5 w-3.5" /> Levels:
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showBrand} onChange={(e) => setShowBrand(e.target.checked)} className="rounded" /> Brand
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showDivision} onChange={(e) => setShowDivision(e.target.checked)} className="rounded" /> Division
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showCategory} onChange={(e) => setShowCategory(e.target.checked)} className="rounded" /> Category
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showGender} onChange={(e) => setShowGender(e.target.checked)} className="rounded" /> Gender
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showSilhouette} onChange={(e) => setShowSilhouette(e.target.checked)} className="rounded" /> Silhouette
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showArticle} onChange={(e) => setShowArticle(e.target.checked)} className="rounded" /> Article / SKU
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showVariant} onChange={(e) => setShowVariant(e.target.checked)} className="rounded" /> Variant
            </label>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-3">
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-900">{flatRows.length}</span> rows
            </div>

            <div className="flex items-center gap-2">
              {exportState === "completed" ? (
                <Button onClick={handleDownloadExport} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  <Download className="h-4 w-4 mr-2" /> Download Report File
                </Button>
              ) : exportState === "processing" ? (
                <Button disabled className="bg-slate-700 text-white font-semibold">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating {exportProgress}%
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => handleQueueExport("xlsx")}
                    variant="outline"
                    className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel (.xlsx)
                  </Button>
                  <Button
                    onClick={() => handleQueueExport("pdf")}
                    variant="outline"
                    className="border-red-600 text-red-700 hover:bg-red-50 font-semibold"
                  >
                    <FileText className="h-4 w-4 mr-2" /> Export PDF (.pdf)
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Preview */}
      <Card className="border-slate-200 shadow-md overflow-hidden">
        <CardContent className="p-0">
          <div ref={parentRef} className="overflow-auto max-h-[750px] relative">
            <table className="w-full text-xs text-left border-collapse min-w-[2000px]">
              <thead className="bg-slate-900 text-slate-100 sticky top-0 z-20 shadow-md">
                <tr>
                  <th className="p-3 font-bold border-b border-slate-800">Brand</th>
                  <th className="p-3 font-bold border-b border-slate-800">Division</th>
                  <th className="p-3 font-bold border-b border-slate-800">Department</th>
                  <th className="p-3 font-bold border-b border-slate-800">Product Category</th>
                  <th className="p-3 font-bold border-b border-slate-800">Gender</th>
                  <th className="p-3 font-bold border-b border-slate-800">Silhouette</th>
                  <th className="p-3 font-bold border-b border-slate-800">Season</th>
                  <th className="p-3 font-bold border-b border-slate-800">SKU</th>
                  <th className="p-3 font-bold border-b border-slate-800">BarCode</th>
                  <th className="p-3 font-bold border-b border-slate-800 min-w-[200px]">ItemName</th>
                  <th className="p-3 font-bold text-center border-b border-slate-800">Size</th>
                  <th className="p-3 font-bold text-center border-b border-slate-800">Color</th>
                  <th className="p-3 font-bold text-right border-b border-slate-800">UnitPrice</th>
                  {includeCosting && <th className="p-3 font-bold text-right border-b border-slate-800 text-amber-300">UnitCost</th>}
                  <th className="p-3 font-bold text-right border-b border-slate-800">Disc %</th>
                  <th className="p-3 font-bold text-right border-b border-slate-800">Tax %</th>

                  {/* Warehouses Columns */}
                  {warehouses.map((wh) => (
                    <th key={wh.id} className="p-3 font-bold text-right border-b border-slate-800 text-blue-300 bg-slate-950">
                      WH {wh.name}
                    </th>
                  ))}

                  {/* Stock Locations Columns (Short Code directly, NO LOC prefix) */}
                  {stockLocations.map((loc) => (
                    <th key={loc.id} className="p-3 font-bold text-right border-b border-slate-800 text-emerald-300 bg-slate-950">
                      {loc.shortCode || loc.code || loc.name}
                    </th>
                  ))}

                  {/* Summary Columns */}
                  <th className="p-3 font-bold text-right border-b border-slate-800 text-indigo-300 bg-slate-950">Avail Stock</th>
                  <th className="p-3 font-bold text-right border-b border-slate-800 text-purple-300 bg-slate-950">Res Stock</th>
                  <th className="p-3 font-bold text-right border-b border-slate-800 text-emerald-400 bg-slate-950 font-black">Total Stock</th>
                  <th className="p-3 font-bold text-right border-b border-slate-800 text-indigo-300 bg-slate-950">Avail Value</th>
                  <th className="p-3 font-bold text-right border-b border-slate-800 text-purple-300 bg-slate-950">Res Value</th>
                  <th className="p-3 font-bold text-right border-b border-slate-800 text-emerald-400 bg-slate-950 font-black">Total Value</th>

                  {includeCosting && (
                    <>
                      <th className="p-3 font-bold text-right border-b border-slate-800 text-amber-300 bg-slate-950">Avail Cost Val</th>
                      <th className="p-3 font-bold text-right border-b border-slate-800 text-amber-300 bg-slate-950">Res Cost Val</th>
                      <th className="p-3 font-bold text-right border-b border-slate-800 text-amber-400 bg-slate-950 font-black">Total Cost Val</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={25 + warehouses.length + stockLocations.length} className="p-12 text-center text-slate-500">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-600" />
                      Loading report calculation...
                    </td>
                  </tr>
                ) : flatRows.length === 0 ? (
                  <tr>
                    <td colSpan={25 + warehouses.length + stockLocations.length} className="p-12 text-center text-slate-500">
                      No stock data found matching your filters.
                    </td>
                  </tr>
                ) : (
                  <>
                    {paddingTop > 0 && (
                      <tr>
                        <td colSpan={25 + warehouses.length + stockLocations.length} style={{ height: `${paddingTop}px` }} />
                      </tr>
                    )}

                    {virtualItems.map((virtualRow) => {
                      const row = flatRows[virtualRow.index];
                      const node = row.data;
                      const tot = node.totals;

                      if (row.level === "brand") {
                        return (
                          <tr key={virtualRow.key} ref={rowVirtualizer.measureElement} data-index={virtualRow.index} className="bg-slate-900 text-slate-100 font-extrabold text-[12px] border-b border-slate-800">
                            <td colSpan={13} className="p-2.5 pl-3 text-indigo-300">
                              BRAND: {node.value}
                            </td>
                            {includeCosting && <td className="p-2.5 text-right">-</td>}
                            <td className="p-2.5 text-right">-</td>
                            <td className="p-2.5 text-right">-</td>
                            {warehouses.map((wh) => (
                              <td key={wh.id} className="p-2.5 text-right">{formatVal(tot.warehouseStocks[wh.id])}</td>
                            ))}
                            {stockLocations.map((loc) => (
                              <td key={loc.id} className="p-2.5 text-right">{formatVal(tot.locationStocks[loc.id])}</td>
                            ))}
                            <td className="p-2.5 text-right">{formatVal(tot.availableStock)}</td>
                            <td className="p-2.5 text-right text-purple-300">{formatVal(tot.reservedStock)}</td>
                            <td className="p-2.5 text-right text-emerald-400 font-black">{formatVal(tot.totalStock)}</td>
                            <td className="p-2.5 text-right font-black">{formatPrice(tot.availableValue)}</td>
                            <td className="p-2.5 text-right font-black">{formatPrice(tot.reservedValue)}</td>
                            <td className="p-2.5 text-right text-emerald-400 font-black">{formatPrice(tot.totalValue)}</td>
                            {includeCosting && (
                              <>
                                <td className="p-2.5 text-right font-black text-amber-300">{formatPrice(tot.availableCostingValue)}</td>
                                <td className="p-2.5 text-right font-black text-amber-300">{formatPrice(tot.reservedCostingValue)}</td>
                                <td className="p-2.5 text-right font-black text-amber-400">{formatPrice(tot.totalCostingValue)}</td>
                              </>
                            )}
                          </tr>
                        );
                      }

                      if (row.level === "division") {
                        return (
                          <tr key={virtualRow.key} ref={rowVirtualizer.measureElement} data-index={virtualRow.index} className="bg-slate-800 text-slate-100 font-bold text-[11px] border-b border-slate-700">
                            <td colSpan={13} className="p-2 pl-6 text-blue-300">
                              DIVISION: {node.value}
                            </td>
                            {includeCosting && <td className="p-2 text-right">-</td>}
                            <td className="p-2 text-right">-</td>
                            <td className="p-2 text-right">-</td>
                            {warehouses.map((wh) => (
                              <td key={wh.id} className="p-2 text-right">{formatVal(tot.warehouseStocks[wh.id])}</td>
                            ))}
                            {stockLocations.map((loc) => (
                              <td key={loc.id} className="p-2 text-right">{formatVal(tot.locationStocks[loc.id])}</td>
                            ))}
                            <td className="p-2 text-right">{formatVal(tot.availableStock)}</td>
                            <td className="p-2 text-right text-purple-300">{formatVal(tot.reservedStock)}</td>
                            <td className="p-2 text-right font-extrabold">{formatVal(tot.totalStock)}</td>
                            <td className="p-2 text-right font-extrabold">{formatPrice(tot.availableValue)}</td>
                            <td className="p-2 text-right font-extrabold">{formatPrice(tot.reservedValue)}</td>
                            <td className="p-2 text-right font-extrabold">{formatPrice(tot.totalValue)}</td>
                            {includeCosting && (
                              <>
                                <td className="p-2 text-right font-extrabold text-amber-300">{formatPrice(tot.availableCostingValue)}</td>
                                <td className="p-2 text-right font-extrabold text-amber-300">{formatPrice(tot.reservedCostingValue)}</td>
                                <td className="p-2 text-right font-extrabold text-amber-400">{formatPrice(tot.totalCostingValue)}</td>
                              </>
                            )}
                          </tr>
                        );
                      }

                      // Article & Variant Detail Rows
                      return (
                        <tr key={virtualRow.key} ref={rowVirtualizer.measureElement} data-index={virtualRow.index} className="hover:bg-slate-50 border-b border-slate-200 text-slate-800">
                          <td className="p-2 font-medium">{node.brand || "N/A"}</td>
                          <td className="p-2">{node.division || "N/A"}</td>
                          <td className="p-2">{node.department || "N/A"}</td>
                          <td className="p-2">{node.category || "N/A"}</td>
                          <td className="p-2">{node.gender || "N/A"}</td>
                          <td className="p-2">{node.silhouette || "N/A"}</td>
                          <td className="p-2">{node.season || "N/A"}</td>
                          <td className="p-2 font-mono font-bold text-indigo-700">{node.sku || "N/A"}</td>
                          <td className="p-2 font-mono">{node.barCode || "N/A"}</td>
                          <td className="p-2 font-medium max-w-[250px] truncate">{node.itemName || "N/A"}</td>
                          <td className="p-2 text-center font-bold">{node.size || "N/A"}</td>
                          <td className="p-2 text-center">{node.color || "N/A"}</td>
                          <td className="p-2 text-right font-semibold">{formatPrice(tot.unitPrice)}</td>
                          {includeCosting && <td className="p-2 text-right font-semibold text-amber-700">{formatPrice(tot.unitCost)}</td>}
                          <td className="p-2 text-right">{tot.discountRate || 0}%</td>
                          <td className="p-2 text-right">{tot.taxRate || 0}%</td>

                          {warehouses.map((wh) => (
                            <td key={wh.id} className="p-2 text-right bg-blue-50/30">{formatVal(tot.warehouseStocks[wh.id])}</td>
                          ))}
                          {stockLocations.map((loc) => (
                            <td key={loc.id} className="p-2 text-right bg-emerald-50/30">{formatVal(tot.locationStocks[loc.id])}</td>
                          ))}

                          <td className="p-2 text-right font-bold text-indigo-700">{formatVal(tot.availableStock)}</td>
                          <td className="p-2 text-right font-bold text-purple-700">{formatVal(tot.reservedStock)}</td>
                          <td className="p-2 text-right font-black text-emerald-700">{formatVal(tot.totalStock)}</td>
                          <td className="p-2 text-right font-bold">{formatPrice(tot.availableValue)}</td>
                          <td className="p-2 text-right font-bold">{formatPrice(tot.reservedValue)}</td>
                          <td className="p-2 text-right font-black text-emerald-800">{formatPrice(tot.totalValue)}</td>

                          {includeCosting && (
                            <>
                              <td className="p-2 text-right font-bold text-amber-800">{formatPrice(tot.availableCostingValue)}</td>
                              <td className="p-2 text-right font-bold text-amber-800">{formatPrice(tot.reservedCostingValue)}</td>
                              <td className="p-2 text-right font-black text-amber-900">{formatPrice(tot.totalCostingValue)}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}

                    {paddingBottom > 0 && (
                      <tr>
                        <td colSpan={25 + warehouses.length + stockLocations.length} style={{ height: `${paddingBottom}px` }} />
                      </tr>
                    )}
                  </>
                )}
              </tbody>

              {/* Grand Total Footer */}
              {grandTotals && (
                <tfoot className="bg-slate-900 text-white font-extrabold text-xs sticky bottom-0 z-20">
                  <tr>
                    <td colSpan={13} className="p-3 text-emerald-400">
                      GRAND TOTALS
                    </td>
                    {includeCosting && <td className="p-3 text-right">-</td>}
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right">-</td>
                    {warehouses.map((wh) => (
                      <td key={wh.id} className="p-3 text-right">{formatVal(grandTotals.warehouseStocks[wh.id])}</td>
                    ))}
                    {stockLocations.map((loc) => (
                      <td key={loc.id} className="p-3 text-right">{formatVal(grandTotals.locationStocks[loc.id])}</td>
                    ))}
                    <td className="p-3 text-right text-indigo-300">{formatVal(grandTotals.availableStock)}</td>
                    <td className="p-3 text-right text-purple-300">{formatVal(grandTotals.reservedStock)}</td>
                    <td className="p-3 text-right text-emerald-400 font-black">{formatVal(grandTotals.totalStock)}</td>
                    <td className="p-3 text-right text-indigo-300">{formatPrice(grandTotals.availableValue)}</td>
                    <td className="p-3 text-right text-purple-300">{formatPrice(grandTotals.reservedValue)}</td>
                    <td className="p-3 text-right text-emerald-400 font-black">{formatPrice(grandTotals.totalValue)}</td>
                    {includeCosting && (
                      <>
                        <td className="p-3 text-right text-amber-300">{formatPrice(grandTotals.availableCostingValue)}</td>
                        <td className="p-3 text-right text-amber-300">{formatPrice(grandTotals.reservedCostingValue)}</td>
                        <td className="p-3 text-right text-amber-400 font-black">{formatPrice(grandTotals.totalCostingValue)}</td>
                      </>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
