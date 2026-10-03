"use client";

import React, { useState, useEffect } from "react";
import {
  PackageCheck,
  ArrowLeft,
  RefreshCcw,
  Package,
  ArrowRight,

  Clock,
  CheckCircle2,
  FileText,
  Printer,
  Search,
  Filter,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getIncomingTransferRequests,
  acceptTransferRequest,
} from "@/lib/actions/transfer-request";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { SmartPagination } from "@/components/ui/smart-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function StockReceivingPage() {
  const { user, hasPermission } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  // Filters and Search
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, statusFilter, activeTab]);

  const groupedRequests = React.useMemo(() => {
    const groups: { date: string; items: any[] }[] = [];
    requests.forEach(request => {
        const dateStr = format(new Date(request.createdAt), 'MMMM d, yyyy');
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.date === dateStr) {
            lastGroup.items.push(request);
        } else {
            groups.push({ date: dateStr, items: [request] });
        }
    });
    return groups;
  }, [requests]);

  const handlePrint = (request: any) => {
    setPrintingId(request.id);
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Allow popups to print");
      setPrintingId(null);
      return;
    }

    const dateStr = format(new Date(request.createdAt), "dd/MM/yyyy HH:mm");
    const sourceLoc =
      request.fromWarehouse?.name ||
      request.warehouse?.name ||
      request.sourceWarehouse?.name ||
      request.stockRequisition?.fromWarehouse?.name ||
      request.fromLocation?.name ||
      request.fromWarehouse?.code ||
      "LOGISTIC AREA";
    const destLoc = user?.terminal?.location?.name || "This Location";
    const refNo = request.requestNo || "N/A";
    const outboundNo = request.outboundNo || request.formattedSerialNo || null;
    const notes = request.notes || "";
    const totalQty =
      request.items?.reduce(
        (sum: number, item: any) => sum + Number(item.quantity || 0),
        0,
      ) || 0;

    win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Stock Receiving Note - ${refNo}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #000; font-size: 10px; padding: 20px; line-height: 1.3; }
                    @media print {
                        @page { margin: 0.7cm; }
                        body { padding: 0; }
                    }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 8px; }
                    .logo-box { width: 20%; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; }
                    .logo-img { width: 70px; height: auto; object-fit: contain; }
                    .title-box { width: 35%; background-color: #eef2f6; text-align: center; padding: 6px 4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .title-main { font-size: 16px; font-weight: 800; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; letter-spacing: 0.5px; }
                    .title-sub { font-size: 16px; font-weight: 800; letter-spacing: 0.5px; }
                    .meta-box { width: 45%; background-color: #f8fafc; border: 1px solid #d1d5db; padding: 5px 8px; font-size: 9.5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; display: flex; flex-direction: column; justify-content: center; }
                    .meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                    .meta-row:last-child { margin-bottom: 0; }
                    .meta-label { font-weight: 700; }
                    .meta-val { font-weight: 600; }

                    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5px; table-layout: fixed; }
                    thead tr { border-top: 2px solid #000; border-bottom: 2px solid #000; }
                    th { padding: 3px 4px; text-align: left; font-weight: 700; }
                    th.text-right { text-align: right; }
                    th.text-center { text-align: center; }
                    td { padding: 3px 4px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
                    td.text-right { text-align: right; }
                    td.text-center { text-align: center; }
                    .font-bold { font-weight: 700; }
                    .uppercase { text-transform: uppercase; }

                    .totals-bar { width: 100%; border-top: 2px solid #000; padding: 4px 0; display: flex; justify-content: space-between; align-items: flex-start; font-size: 9.5px; font-weight: 700; margin-top: 0; }
                    .double-underline { border-bottom: 3px double #000; padding-bottom: 1px; }

                    .remarks-box { margin-top: 8px; margin-bottom: 8px; font-size: 9.5px; }
                    .remarks-title { font-weight: 700; font-size: 10px; }
                    .remarks-content { color: #374151; margin-top: 1px; }

                    .signatures-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px; page-break-inside: avoid; break-inside: avoid; }
                    .signature-card { border: 1px solid #000; height: 75px; padding: 4px; text-align: center; font-size: 9px; font-weight: 700; text-transform: uppercase; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo-box">
                        <img src="${window.location.origin}/image.png" alt="Logo" class="logo-img" />
                    </div>
                    <div class="title-box">
                        <div class="title-main">Warehouse Receiving</div>
                        <div class="title-sub">Receiving Note</div>
                    </div>
                    <div class="meta-box">
                        <div class="meta-row">
                            <span class="meta-label">Transfer Number:</span>
                            <span class="meta-val">${refNo}</span>
                        </div>
                        ${
                          outboundNo
                            ? `
                        <div class="meta-row">
                            <span class="meta-label">Outbound Serial No:</span>
                            <span class="meta-val">${outboundNo}</span>
                        </div>`
                            : ""
                        }
                        <div class="meta-row">
                            <span class="meta-label">Date:</span>
                            <span class="meta-val">${dateStr}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Warehouse (Source):</span>
                            <span class="meta-val">${sourceLoc}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Location (Actual):</span>
                            <span class="meta-val">${destLoc}</span>
                        </div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 6%;">S.No</th>
                            <th style="width: 22%;">SKU / Code</th>
                            <th style="width: 42%;">Description</th>
                            <th class="text-center" style="width: 15%;">Size / Color</th>
                            <th class="text-right" style="width: 15%;">Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${request.items
                          .map((item: any, idx: number) => {
                            const sku = item.item?.sku || "—";
                            const desc = item.item?.description || "Item";
                            const sizeStr =
                              item.item?.size?.name || item.item?.size || "—";
                            const colorStr =
                              item.item?.color?.name || item.item?.color || "—";
                            return `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td class="font-bold">${sku}</td>
                                    <td class="uppercase">${desc}</td>
                                    <td class="text-center">${sizeStr} / ${colorStr}</td>
                                    <td class="text-right font-bold">${Number(item.quantity)}</td>
                                </tr>
                            `;
                          })
                          .join("")}
                    </tbody>
                </table>

                <div class="totals-bar">
                    <div>Total Lines: ${request.items.length}</div>
                    <div>
                        <span style="margin-right: 8px;">Total Quantity:</span>
                        <span class="double-underline">${totalQty}</span>
                    </div>
                </div>

                ${
                  notes
                    ? `
                    <div class="remarks-box">
                        <div class="remarks-title">Remarks</div>
                        <div class="remarks-content">${notes}</div>
                    </div>
                `
                    : ""
                }

                <div class="signatures-grid">
                    <div class="signature-card">RECEIVED BY</div>
                    <div class="signature-card">CHECKED BY</div>
                    <div class="signature-card">STORE MANAGER</div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        window.close();
                    };
                </script>
            </body>
            </html>
        `);
    win.document.close();
    win.focus();
    setPrintingId(null);
  };

  const locationId = user?.terminal?.location?.id || user?.locationId;

  const fetchRequests = async () => {
    if (!locationId) return;
    setIsLoading(true);
    try {
      const res = await getIncomingTransferRequests(locationId, {
        status: activeTab === 'history' ? 'history' : undefined,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchQuery,
        sortBy: sortBy,
        statusFilter: statusFilter
      });
      if (res.status) {
        setRequests(res.data || []);
        setTotalPages(res.meta?.totalPages || 1);
        setTotalRecords(res.meta?.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch incoming transfers", error);
      toast.error("Failed to load incoming transfers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
        fetchRequests();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [locationId, activeTab, currentPage, searchQuery, sortBy, statusFilter]);

  const handleAccept = async (requestId: string) => {
    setIsAccepting(requestId);
    try {
      const res = await acceptTransferRequest(requestId, user?.id);
      if (res.status) {
        toast.success("Stock accepted successfully!");
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        toast.error(res.message || "Failed to accept stock");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to accept stock");
    } finally {
      setIsAccepting(null);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="flex-none p-4 md:p-6 border-b backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4 mx-auto w-full">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">
              Stock Receiving
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
              Accept incoming warehouse transfers for
              <Badge variant="outline" className="ml-1 font-bold text-primary">
                {user?.terminal?.location?.name || "This Location"}
              </Badge>
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchRequests}
            disabled={isLoading}
          >
            <RefreshCcw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 pb-20">
        <div className="mx-auto w-full space-y-6">
          {/* Tabs */}
          <div className="flex bg-muted/30 p-1 rounded-xl border border-black/5">
              <button
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeTab === 'pending'
                          ? 'bg-white text-primary shadow-sm border border-black/5'
                          : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => {
                      setActiveTab('pending');
                      setStatusFilter('ALL');
                      setSearchQuery('');
                  }}
              >
                  Pending Actions
              </button>
              <button
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeTab === 'history'
                          ? 'bg-white text-primary shadow-sm border border-black/5'
                          : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => {
                      setActiveTab('history');
                      setStatusFilter('ALL');
                      setSearchQuery('');
                  }}
              >
                  Transfer History
              </button>
          </div>

          {/* Filters & Search UI */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by request no, notes, or warehouse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-dashed focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] bg-white border-dashed">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>

              {activeTab === 'history' && (
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px] bg-white border-dashed">
                          <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="ALL">All Status</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="APPROVED">Approved</SelectItem>
                          <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                  </Select>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <Card className="border-dashed h-[400px] flex flex-col items-center justify-center text-center p-8 bg-muted/5">
              <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                <PackageCheck className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <CardTitle className="text-xl mb-2 text-muted-foreground">
                {activeTab === 'pending' ? "No Incoming Stock" : "No Incoming History"}
              </CardTitle>
              <CardDescription className="max-w-xs mx-auto">
                {activeTab === 'pending' 
                      ? "All transfers have been processed. New transfers will appear here once initiated from the warehouse."
                      : "No completed or rejected inbound transfers found."}
              </CardDescription>
              <Button
                variant="outline"
                className="mt-6"
                onClick={fetchRequests}
              >
                <RefreshCcw className="h-4 w-4 mr-2" /> Check Again
              </Button>
            </Card>
          ) : (
            <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
                            <Table className="min-w-[1000px]">
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[160px]">Request No</TableHead>
                                        <TableHead className="w-[130px]">TR #</TableHead>
                                        <TableHead className="min-w-[300px]">Description / Items</TableHead>
                                        <TableHead className="w-[180px]">Source</TableHead>
                                        <TableHead className="text-right w-[80px]">Qty</TableHead>
                                        <TableHead className="text-center w-[120px]">Status</TableHead>
                                        <TableHead className="text-right w-[160px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupedRequests.map((group) => (
                                        <React.Fragment key={group.date}>
                                            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b">
                                                <TableCell colSpan={7} className="py-2">
                                                    <div className="flex items-center gap-2 font-bold text-xs text-muted-foreground uppercase tracking-wider">
                                                        <Calendar className="h-3 w-3" /> {group.date}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {group.items.map((request) => {
                                                const totalQty = (request.items || []).reduce((sum: number, i: any) => sum + Number(i.quantity || 0), 0);
                                                const totalItemsCount = request.items?.length || 0;
                                                const firstItem = request.items?.[0]?.item;
                                                const brandName = request.brand?.name || firstItem?.brand?.name;
                                                
                                                return (
                                                    <TableRow key={request.id} className="hover:bg-muted/30 group">
                                                        <TableCell className="font-mono text-xs font-bold">{request.requestNo}</TableCell>
                                                        <TableCell>
                                                            {(request.inboundNo || request.formattedSerialNo) && (
                                                                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
                                                                    TR #{request.inboundNo || request.formattedSerialNo}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-sm leading-tight text-gray-800">
                                                                    {totalItemsCount > 1
                                                                      ? `Stock Transfer Note (${totalItemsCount} Products${brandName ? ` · ${brandName}` : ""})`
                                                                      : firstItem?.description || "Incoming Items"}
                                                                </span>
                                                                {totalItemsCount > 1 ? (
                                                                    <div className="flex flex-col gap-1 mt-1.5 w-full">
                                                                        {(request.items || []).slice(0, 3).map((i: any, idx: number) => (
                                                                            <div key={i.id || idx} className="flex justify-between items-center text-[10px] bg-gray-50/80 p-1 px-1.5 rounded border border-gray-100">
                                                                                <span className="truncate flex-1 mr-2 text-gray-600 font-medium" title={i.item?.description}>{i.item?.description || "Unknown Item"}</span>
                                                                                <span className="font-bold text-gray-900 ml-2">x{i.quantity}</span>
                                                                            </div>
                                                                        ))}
                                                                        {totalItemsCount > 3 && (
                                                                            <div className="text-[9px] text-center text-muted-foreground bg-gray-50/50 p-0.5 rounded border border-gray-50 font-medium">
                                                                                + {totalItemsCount - 3} more line items
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                                                                        SKU: {firstItem?.sku || "N/A"}
                                                                    </span>
                                                                )}
                                                                {request.notes && <span className="text-[10px] text-primary/70 font-medium line-clamp-1 mt-1 bg-primary/5 p-1 px-2 rounded w-fit" title={request.notes}>Notes: {request.notes}</span>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs font-medium">
                                                            {request.fromLocation?.name || request.fromWarehouse?.name || "Warehouse/Outlet"}
                                                        </TableCell>
                                                        <TableCell className="text-right font-black text-primary">
                                                            {totalQty}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {request.status === 'COMPLETED' ? (
                                                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-emerald-200 text-[10px] font-bold">
                                                                    Completed
                                                                </Badge>
                                                            ) : request.status === 'APPROVED' || request.status === 'SOURCE_APPROVED' ? (
                                                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200 text-[10px] font-bold">
                                                                    Approved
                                                                </Badge>
                                                            ) : request.status === 'REJECTED' ? (
                                                                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100/80 border-red-200 text-[10px] font-bold">
                                                                    Rejected
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100/80 border-orange-200 text-[10px] font-bold">
                                                                    Pending
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {activeTab === 'pending' && (request.status === 'APPROVED' || request.status === 'SOURCE_APPROVED') && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-8 px-3 text-xs bg-primary hover:bg-primary/90"
                                                                        disabled={isAccepting === request.id || !hasPermission('pos.inventory.receiving.accept')}
                                                                        onClick={() => handleAccept(request.id)}
                                                                    >
                                                                        {isAccepting === request.id ? <RefreshCcw className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                                                                        Accept
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 px-3 text-xs"
                                                                    disabled={printingId === request.id}
                                                                    onClick={() => handlePrint(request)}
                                                                >
                                                                    <Printer className="h-3 w-3 mr-1" /> Print
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
          )}
          
          {/* Pagination Controls */}
                    {!isLoading && totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-black/5">
                            <span className="text-sm text-muted-foreground font-medium">
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalRecords)} of {totalRecords}
                            </span>
                            <SmartPagination 
                                currentPage={currentPage} 
                                totalPages={totalPages} 
                                onPageChange={setCurrentPage} 
                            />
                        </div>
                    )}
                    </div>
      </main>
    </div>
  );
}
