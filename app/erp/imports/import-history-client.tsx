"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getImportHistory, getImportModules } from "@/lib/actions/import-history-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Search,
  RefreshCw,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Upload,
  FileUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  FileText,
  Filter,
  X,
  Info,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl, cn } from "@/lib/utils";
import Cookies from "js-cookie";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface ImportRecord {
  id: string;
  filename: string;
  moduleName: string;
  moduleLabel?: string;
  status: string;
  totalRecords: number;
  processedRecords: number;
  successRecords: number;
  failedRecords: number;
  skippedRecords: number;
  message: string | null;
  uploadedFilePath: string | null;
  successReportPath: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface ImportMeta {
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ModuleOption {
  value: string;
  label: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "validating", label: "Validating" },
  { value: "validated", label: "Validated" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const PAGE_SIZES = [10, 20, 50, 100];

// ─────────────────────────────────────────────
// Status Badge helper
// ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    completed: {
      label: "Completed",
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50",
    },
    failed: {
      label: "Failed",
      icon: <XCircle className="h-3 w-3" />,
      className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50",
    },
    processing: {
      label: "Processing",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50",
    },
    validating: {
      label: "Validating",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/50",
    },
    validated: {
      label: "Validated",
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/50",
    },
    pending: {
      label: "Pending",
      icon: <Clock className="h-3 w-3" />,
      className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50",
    },
    cancelled: {
      label: "Cancelled",
      icon: <AlertCircle className="h-3 w-3" />,
      className: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    },
  };
  const cfg = map[status] ?? {
    label: status,
    icon: <AlertTriangle className="h-3 w-3" />,
    className: "bg-slate-100 text-slate-600 border-slate-300",
  };

  return (
    <Badge variant="outline" className={cn("gap-1 font-normal py-0.5 px-2 capitalize", cfg.className)}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

// ─────────────────────────────────────────────
// Detail Modal
// ─────────────────────────────────────────────
function ImportDetailModal({
  record,
  onClose,
}: {
  record: ImportRecord | null;
  onClose: () => void;
}) {
  if (!record) return null;

  const successPct = record.totalRecords > 0 ? Math.round((record.successRecords / record.totalRecords) * 100) : 0;
  const failPct = record.totalRecords > 0 ? Math.round((record.failedRecords / record.totalRecords) * 100) : 0;

  const handleDownloadErrors = () => {
    window.open(`/api/import-history/${record.id}/error-report`, "_blank");
  };

  const handleDownloadSuccess = () => {
    window.open(`/api/import-history/${record.id}/success-report`, "_blank");
  };

  const handleDownloadOriginal = () => {
    window.open(`/api/import-history/${record.id}/download`, "_blank");
  };

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileUp className="h-4.5 w-4.5 text-indigo-500" />
            Import Details
          </DialogTitle>
          <DialogDescription className="truncate text-xs text-muted-foreground">
            {record.filename}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Module + Status row */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs font-medium px-2.5 py-1">
              {record.moduleLabel ?? record.moduleName.replace(/_/g, " ")}
            </Badge>
            <StatusBadge status={record.status} />
          </div>

          {/* Progress bars */}
          {record.totalRecords > 0 && (
            <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Total Records</span>
                <span className="font-semibold text-foreground">{record.totalRecords.toLocaleString()}</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Imported</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{record.successRecords.toLocaleString()} ({successPct}%)</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${successPct}%` }} />
                </div>
              </div>

              {record.failedRecords > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-red-600 dark:text-red-400 font-medium">✗ Failed</span>
                    <span className="text-red-600 dark:text-red-400 font-semibold">{record.failedRecords.toLocaleString()} ({failPct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${failPct}%` }} />
                  </div>
                </div>
              )}

              {record.skippedRecords > 0 && (
                <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400">
                  <span>⚠ Skipped</span>
                  <span className="font-semibold">{record.skippedRecords.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-muted-foreground mb-0.5">Started</p>
              <p className="font-medium">{new Date(record.createdAt).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-muted-foreground mb-0.5">Completed</p>
              <p className="font-medium">
                {record.completedAt ? new Date(record.completedAt).toLocaleString() : "—"}
              </p>
            </div>
          </div>

          {/* Message */}
          {record.message && (
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border">
              <span className="font-medium text-foreground block mb-1">Note</span>
              {record.message}
            </div>
          )}

          {/* Success Report Button */}
          {(record.successReportPath || record.successRecords > 0) && (
            <Button
              variant="outline"
              className="w-full gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900/50 dark:hover:bg-emerald-950/20"
              onClick={handleDownloadSuccess}
            >
              <CheckCircle2 className="h-4 w-4" />
              Download Success Report ({record.successRecords.toLocaleString()} rows)
            </Button>
          )}

          {/* Error Report Button */}
          {record.failedRecords > 0 && (
            <Button
              variant="outline"
              className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-950/20"
              onClick={handleDownloadErrors}
            >
              <Download className="h-4 w-4" />
              Download Error Report ({record.failedRecords} rows)
            </Button>
          )}

          {/* Download Original Upload Button */}
          {record.uploadedFilePath && (
            <Button
              variant="outline"
              className="w-full gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-900/50 dark:hover:bg-indigo-950/20"
              onClick={handleDownloadOriginal}
            >
              <Download className="h-4 w-4" />
              Download Original File
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function ImportHistoryClient() {
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [meta, setMeta] = useState<ImportMeta>({ totalCount: 0, page: 1, limit: 20, totalPages: 0 });
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [pageSize, setPageSize] = useState(20);

  // Detail modal
  const [detailRecord, setDetailRecord] = useState<ImportRecord | null>(null);

  // Stats summary
  const totalSuccess = records.reduce((a, r) => a + r.successRecords, 0);
  const totalFailed = records.reduce((a, r) => a + r.failedRecords, 0);
  const totalRecords = records.reduce((a, r) => a + r.totalRecords, 0);

  // ── Fetch ──
  const fetchData = useCallback(async (page = 1, limit = pageSize) => {
    setLoading(true);
    try {
      const res = await getImportHistory({
        moduleName: selectedModule === "all" ? undefined : selectedModule,
        status: selectedStatus === "all" ? undefined : selectedStatus,
        search: appliedSearch || undefined,
        page,
        limit,
      });
      if (res.status && res.data) {
        setRecords(res.data);
        if (res.meta) setMeta(res.meta);
      } else {
        toast.error(res.message || "Failed to load import history");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [selectedModule, selectedStatus, appliedSearch, pageSize]);

  const fetchModules = async () => {
    const res = await getImportModules();
    if (res.status && res.data) setModules(res.data);
  };

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    fetchData(1, pageSize);
  }, [selectedModule, selectedStatus, appliedSearch, pageSize]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput);
  };

  const clearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setSelectedModule("all");
    setSelectedStatus("all");
  };

  const hasActiveFilters = appliedSearch || selectedModule !== "all" || selectedStatus !== "all";

  const handleDownloadErrors = (record: ImportRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/api/import-history/${record.id}/error-report`, "_blank");
  };

  return (
    <TooltipProvider>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl">
                <Upload className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
                Import History
              </h1>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              View all your bulk import jobs — across all modules — in one unified place.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(meta.page, pageSize)}
            disabled={loading}
            className="gap-2 shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* ── Stats Strip ── */}
        {records.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Total Records (this page)",
                value: totalRecords.toLocaleString(),
                icon: <BarChart3 className="h-4 w-4 text-indigo-500" />,
                cls: "border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/10",
              },
              {
                label: "Imports",
                value: records.length,
                icon: <FileUp className="h-4 w-4 text-violet-500" />,
                cls: "border-violet-100 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/10",
              },
              {
                label: "Rows Imported",
                value: totalSuccess.toLocaleString(),
                icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
                cls: "border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/10",
              },
              {
                label: "Rows Failed",
                value: totalFailed.toLocaleString(),
                icon: <XCircle className="h-4 w-4 text-red-500" />,
                cls: "border-red-100 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/10",
              },
            ].map((s) => (
              <div key={s.label} className={cn("rounded-xl border p-4 flex items-center gap-3", s.cls)}>
                {s.icon}
                <div>
                  <p className="text-2xl font-bold leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="flex flex-col md:flex-row gap-3 bg-muted/30 p-4 rounded-xl border border-border">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search by filename…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 bg-background"
            />
          </form>

          {/* Module Filter */}
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <SelectTrigger className="w-full md:w-52 bg-background">
              <Filter className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {modules.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full md:w-44 bg-background">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear */}
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear all filters" className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* ── Active Filter Chips ── */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {appliedSearch && (
              <Badge variant="secondary" className="gap-1.5 pr-1">
                Search: &quot;{appliedSearch}&quot;
                <button onClick={() => { setSearchInput(""); setAppliedSearch(""); }} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedModule !== "all" && (
              <Badge variant="secondary" className="gap-1.5 pr-1">
                Module: {modules.find(m => m.value === selectedModule)?.label ?? selectedModule}
                <button onClick={() => setSelectedModule("all")} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedStatus !== "all" && (
              <Badge variant="secondary" className="gap-1.5 pr-1">
                Status: {STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label ?? selectedStatus}
                <button onClick={() => setSelectedStatus("all")} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* ── Table ── */}
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-5 font-semibold">File / Module</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-center">Total</TableHead>
                <TableHead className="font-semibold text-center">
                  <span className="text-emerald-600 dark:text-emerald-400">✓ Success</span>
                </TableHead>
                <TableHead className="font-semibold text-center">
                  <span className="text-red-500">✗ Failed</span>
                </TableHead>
                <TableHead className="font-semibold text-center">Skipped</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold text-right pr-5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                      <span className="text-sm">Loading import history…</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <div className="p-4 bg-muted/50 rounded-full">
                        <FileText className="h-8 w-8 opacity-40" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">No import records found</p>
                        <p className="text-sm mt-1">
                          {hasActiveFilters ? "Try clearing the filters above." : "Start a bulk import to see records here."}
                        </p>
                      </div>
                      {hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
                          <X className="h-3.5 w-3.5" /> Clear Filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => {
                  const successPct = record.totalRecords > 0
                    ? Math.round((record.successRecords / record.totalRecords) * 100)
                    : 0;

                  return (
                    <TableRow
                      key={record.id}
                      className="hover:bg-muted/20 cursor-pointer group"
                      onClick={() => setDetailRecord(record)}
                    >
                      {/* File / Module */}
                      <TableCell className="pl-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 shrink-0 mt-0.5">
                            <FileUp className="h-3.5 w-3.5 text-indigo-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate max-w-[220px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {record.filename}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {record.moduleLabel ?? record.moduleName.replace(/_/g, " ")}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusBadge status={record.status} />
                      </TableCell>

                      {/* Total */}
                      <TableCell className="text-center text-sm font-medium">
                        {record.totalRecords > 0 ? record.totalRecords.toLocaleString() : "—"}
                      </TableCell>

                      {/* Success */}
                      <TableCell className="text-center">
                        {record.successRecords > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                              {record.successRecords.toLocaleString()}
                            </span>
                            {record.totalRecords > 0 && (
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${successPct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Failed */}
                      <TableCell className="text-center">
                        {record.failedRecords > 0 ? (
                          <span className="text-sm font-semibold text-red-500">
                            {record.failedRecords.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Skipped */}
                      <TableCell className="text-center">
                        {record.skippedRecords > 0 ? (
                          <span className="text-sm text-amber-600 dark:text-amber-400">
                            {record.skippedRecords.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-xs text-muted-foreground">
                        <div>
                          {new Date(record.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] mt-0.5">
                          {new Date(record.createdAt).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="pr-5 text-right">
                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                                onClick={(e) => { e.stopPropagation(); setDetailRecord(record); }}
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View details</TooltipContent>
                          </Tooltip>

                          {(record.successReportPath || record.successRecords > 0) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/api/import-history/${record.id}/success-report`, "_blank");
                                  }}
                                >
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download success report</TooltipContent>
                            </Tooltip>
                          )}

                          {record.failedRecords > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  onClick={(e) => handleDownloadErrors(record, e)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download error report</TooltipContent>
                            </Tooltip>
                          )}

                          {record.uploadedFilePath && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/api/import-history/${record.id}/download`, "_blank");
                                  }}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download original file</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination ── */}
        {meta.totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.totalCount)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">{meta.totalCount.toLocaleString()}</span>
              </span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={meta.page <= 1 || loading}
                onClick={() => fetchData(1, pageSize)}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={meta.page <= 1 || loading}
                onClick={() => fetchData(meta.page - 1, pageSize)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="px-3 py-1 text-sm rounded-md bg-primary text-primary-foreground font-medium min-w-[2.5rem] text-center">
                {meta.page}
              </span>
              <span className="text-sm text-muted-foreground px-1">/ {meta.totalPages}</span>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={meta.page >= meta.totalPages || loading}
                onClick={() => fetchData(meta.page + 1, pageSize)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={meta.page >= meta.totalPages || loading}
                onClick={() => fetchData(meta.totalPages, pageSize)}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      <ImportDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
    </TooltipProvider>
  );
}
