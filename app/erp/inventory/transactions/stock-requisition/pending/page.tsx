'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import {
  stockRequisitionApi,
} from '@/lib/api';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  FileText,
  Printer,
} from 'lucide-react';
import Link from 'next/link';

export default function StockRequisitionPendingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [requisitions, setRequisitions] = useState<any[]>([]);

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
        loadRequisitions();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel requisition');
    }
  };

  const getStatusBadge = (status: string) => {
    return <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold">Pending</Badge>;
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
            Warehouse Pending Requisitions
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage pending Outlet Stock Requisition Notes (SRN).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="border-2 font-bold shadow-sm">
            <Link href="/erp/inventory/transactions/stock-requisition">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Requisitions
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border shadow-md">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xl font-bold text-gray-800">Pending Picking/Packing List</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : requisitions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground font-semibold">
              No pending stock requisitions at the moment.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="font-bold">Requisition No</TableHead>
                  <TableHead className="font-bold">Date</TableHead>
                  <TableHead className="font-bold">From Warehouse</TableHead>
                  <TableHead className="font-bold">To Location</TableHead>
                  <TableHead className="font-bold">Brand</TableHead>
                  <TableHead className="font-bold">Remarks</TableHead>
                  <TableHead className="text-right font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requisitions.map((req) => (
                  <TableRow key={req.id} className="hover:bg-amber-50/10 transition-colors">
                    <TableCell className="font-bold text-indigo-600">{req.requisitionNo}</TableCell>
                    <TableCell>{new Date(req.requisitionDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{req.fromWarehouse?.name}</TableCell>
                    <TableCell className="font-medium">{req.toLocation?.name}</TableCell>
                    <TableCell>{req.brand?.name || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{req.remarks || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetailSheet(req)}
                        >
                          View Detail
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                    <SheetTitle className="text-2xl font-bold text-indigo-600">
                      {selectedRequisition.requisitionNo}
                    </SheetTitle>
                    <SheetDescription className="text-xs font-semibold text-gray-500 mt-1">
                      Created on {new Date(selectedRequisition.requisitionDate).toLocaleString()}
                    </SheetDescription>
                  </div>
                  <div>{getStatusBadge(selectedRequisition.status)}</div>
                </div>
              </SheetHeader>

              {/* SRN Metadata Info */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">FROM WAREHOUSE</span>
                  <span className="font-semibold text-gray-800">{selectedRequisition.fromWarehouse?.name}</span>
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
                    Total Items: {selectedRequisition.items.length}
                  </Badge>
                  <Badge variant="outline" className="font-bold">
                    Total Req Qty: {selectedRequisition.items.reduce((sum: number, item: any) => sum + Number(item.quantity), 0)}
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
                      {selectedRequisition.items.map((item: any) => {
                        const originalQty = Number(item.quantity);

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-semibold">{item.item?.sku}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{item.item?.description}</TableCell>
                            <TableCell className="text-xs text-muted-foreground font-semibold">
                              {item.item?.color?.name || <span className="text-muted-foreground/30">—</span>}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-semibold">
                              {item.item?.size?.name || <span className="text-muted-foreground/30">—</span>}
                            </TableCell>
                            <TableCell className="text-center font-semibold">{originalQty}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Action Footer */}
              <SheetFooter className="pt-4 border-t gap-2 sm:gap-0">
                <div className="flex justify-between w-full">
                  <div>
                    <Button
                      variant="destructive"
                      onClick={() => handleCancelRequisition(selectedRequisition.id)}
                    >
                      Cancel Requisition
                    </Button>
                  </div>
                  <div className="flex gap-2">
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
