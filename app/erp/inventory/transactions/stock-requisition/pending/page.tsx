'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import {
  stockRequisitionApi,
} from '@/lib/api';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRightLeft,
  Loader2,
  FileText,
  Printer,
  Search,
  Package,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function StockRequisitionPendingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Detail Sheet State
  const [selectedRequisition, setSelectedRequisition] = useState<any>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState<boolean>(false);

  useEffect(() => {
    loadRequisitions();
  }, []);

  const loadRequisitions = async () => {
    setLoading(true);
    try {
      const res = await stockRequisitionApi.getAll();
      if (res.status) {
        // Only keep PENDING requisitions for this view
        const pending = res.data.filter((req: any) => req.status === 'PENDING');
        setRequisitions(pending);
      }
    } catch (error) {
      toast.error('Failed to load pending requisitions list');
    } finally {
      setLoading(false);
    }
  };

  const openDetailSheet = (req: any) => {
    setSelectedRequisition(req);
    setDetailSheetOpen(true);
  };

  const handleCancelRequisition = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this requisition? This will release reserved stock.')) {
      return;
    }
    try {
      const res = await stockRequisitionApi.cancel(id);
      if (res.status) {
        toast.success('Requisition cancelled and stock released');
        setDetailSheetOpen(false);
        await loadRequisitions();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel requisition');
    }
  };

  const filteredRequisitions = requisitions.filter((req) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchNo = req.requisitionNo?.toLowerCase().includes(q);
    const matchFrom = (req.fromLocation?.name || req.fromWarehouse?.name || '').toLowerCase().includes(q);
    const matchTo = (req.toLocation?.name || '').toLowerCase().includes(q);
    const matchRemarks = (req.remarks || '').toLowerCase().includes(q);
    const matchType = (req.documentType || '').toLowerCase().includes(q);
    return matchNo || matchFrom || matchTo || matchRemarks || matchType;
  });

  const totalPending = requisitions.length;
  const totalItemsCount = requisitions.reduce((sum, r) => sum + (r.items?.length || 0), 0);
  const totalUnitsCount = requisitions.reduce(
    (sum, r) => sum + (r.items?.reduce((iSum: number, item: any) => iSum + Number(item.quantity || 0), 0) || 0),
    0
  );

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
            Warehouse Pending Requisitions
          </h1>
          <p className="text-muted-foreground mt-1">
            Approved stock requisitions ready for warehouse picking, packing, and dispatch to outlets.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="border-2 font-bold shadow-sm">
            <Link href="/erp/inventory/transactions/stock-requisition">
              <ArrowLeft className="h-4 w-4 mr-2" /> All Requisitions
            </Link>
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 font-bold shadow-sm text-white" asChild>
            <Link href="/erp/inventory/transactions/stock-transfer">
              <ArrowRightLeft className="h-4 w-4 mr-2" /> Stock Transfer
            </Link>
          </Button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-sm bg-gradient-to-br from-indigo-50/70 to-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Pending Requisitions</p>
              <p className="text-2xl font-extrabold text-gray-900">{totalPending}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-gradient-to-br from-purple-50/70 to-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Total Product Lines</p>
              <p className="text-2xl font-extrabold text-gray-900">{totalItemsCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-gradient-to-br from-emerald-50/70 to-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Units Reserved</p>
              <p className="text-2xl font-extrabold text-gray-900">{totalUnitsCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-md">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">Pending Picking/Packing List</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Click "Transfer Stock" to convert into a stock transfer and dispatch</p>
            </div>
            <div className="relative w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search SRN #, outlet, WH..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredRequisitions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground font-semibold">
              {searchQuery ? 'No pending requisitions matching search query.' : 'No pending stock requisitions at the moment.'}
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-bold">Requisition No</TableHead>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold">From Warehouse</TableHead>
                    <TableHead className="font-bold">To Location</TableHead>
                    <TableHead className="font-bold text-center">Items / Units</TableHead>
                    <TableHead className="font-bold">Remarks</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequisitions.map((req) => {
                    const reqTotalUnits = req.items?.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0) || 0;
                    return (
                      <TableRow key={req.id} className="hover:bg-indigo-50/20 transition-colors">
                        <TableCell className="font-bold text-indigo-600 font-mono">{req.requisitionNo}</TableCell>
                        <TableCell className="text-xs">{new Date(req.requisitionDate).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium text-xs">{req.fromLocation?.name || req.fromWarehouse?.name || '—'}</TableCell>
                        <TableCell className="font-medium text-xs">{req.toLocation?.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono text-[11px] bg-gray-50">
                            {req.items?.length || 0} items ({reqTotalUnits} pcs)
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs">{req.remarks || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1.5 flex-wrap">
                            <Button
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 text-xs shadow-sm"
                              asChild
                            >
                              <Link href={`/erp/inventory/transactions/stock-transfer?requisitionId=${req.id}`}>
                                <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Transfer Stock
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-semibold"
                              onClick={() => openDetailSheet(req)}
                            >
                              View Detail
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              asChild
                            >
                              <Link
                                href={`/erp/inventory/transactions/stock-requisition/slip/${req.id}`}
                                target="_blank"
                                title="Print Slip"
                              >
                                <Printer className="h-4 w-4 text-gray-600" />
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 text-xs font-semibold"
                              onClick={() => handleCancelRequisition(req.id)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slide-out detail sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {selectedRequisition && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <SheetTitle className="text-2xl font-bold text-indigo-600 font-mono">
                      {selectedRequisition.requisitionNo}
                    </SheetTitle>
                    <SheetDescription className="text-xs font-semibold text-gray-500 mt-1">
                      Created on {new Date(selectedRequisition.requisitionDate).toLocaleString()}
                    </SheetDescription>
                  </div>
                  <div>
                    <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300 font-bold">
                      Approved (Pending Transfer)
                    </Badge>
                  </div>
                </div>
              </SheetHeader>

              {/* SRN Metadata Info */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">FROM WAREHOUSE</span>
                  <span className="font-semibold text-gray-800">{selectedRequisition.fromLocation?.name || selectedRequisition.fromWarehouse?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">TO OUTLET / SHOP</span>
                  <span className="font-semibold text-gray-800">{selectedRequisition.toLocation?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">DOCUMENT TYPE</span>
                  <span className="font-semibold text-indigo-600">{selectedRequisition.documentType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">FINANCIAL YEAR</span>
                  <span className="font-semibold text-gray-800">{selectedRequisition.financialYear || '-'}</span>
                </div>
                {selectedRequisition.remarks && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-xs">REMARKS</span>
                    <span className="text-gray-700">{selectedRequisition.remarks}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 flex items-center gap-1.5">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    Items Requisitioned
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-bold">
                    Total Items: {selectedRequisition.items?.length || 0}
                  </Badge>
                  <Badge variant="outline" className="font-bold">
                    Total Req Qty: {selectedRequisition.items?.reduce((sum: number, item: any) => sum + Number(item.quantity), 0) || 0} pcs
                  </Badge>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-100/60">
                      <TableRow>
                        <TableHead className="font-bold">SKU</TableHead>
                        <TableHead className="font-bold">Description</TableHead>
                        <TableHead className="font-bold">Color</TableHead>
                        <TableHead className="font-bold">Size</TableHead>
                        <TableHead className="font-bold w-[100px] text-center">Req Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRequisition.items?.map((item: any) => {
                        const originalQty = Number(item.quantity);

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-semibold font-mono text-xs">{item.item?.sku}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs">{item.item?.description}</TableCell>
                            <TableCell className="text-xs text-muted-foreground font-semibold">
                              {item.item?.color?.name || <span className="text-muted-foreground/30">—</span>}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-semibold">
                              {item.item?.size?.name || <span className="text-muted-foreground/30">—</span>}
                            </TableCell>
                            <TableCell className="text-center font-bold text-indigo-600">{originalQty}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Action Footer */}
              <SheetFooter className="pt-4 border-t gap-2 sm:gap-0">
                <div className="flex justify-between w-full items-center flex-wrap gap-2">
                  <div>
                    <Button
                      variant="destructive"
                      onClick={() => handleCancelRequisition(selectedRequisition.id)}
                    >
                      Cancel Requisition
                    </Button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-sm"
                      asChild
                    >
                      <Link href={`/erp/inventory/transactions/stock-transfer?requisitionId=${selectedRequisition.id}`}>
                        <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Transfer Stock
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link
                        href={`/erp/inventory/transactions/stock-requisition/slip/${selectedRequisition.id}`}
                        target="_blank"
                      >
                        <Printer className="h-4 w-4 mr-1.5" /> Print
                      </Link>
                    </Button>
                    <Button variant="outline" onClick={() => setDetailSheetOpen(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

