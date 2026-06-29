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
  AlertTriangle,
  CheckCircle,
  Printer,
} from 'lucide-react';
import Link from 'next/link';

export default function StockRequisitionPendingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [requisitions, setRequisitions] = useState<any[]>([]);

  // Detail Sheet State
  const [selectedRequisition, setSelectedRequisition] = useState<any>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState<boolean>(false);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [stnQuantities, setStnQuantities] = useState<Record<string, number>>({});

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
    // Pre-populate quantities for STN conversion
    const qtyMap: Record<string, number> = {};
    req.items.forEach((item: any) => {
      qtyMap[item.itemId] = Number(item.quantity);
    });
    setStnQuantities(qtyMap);
    setIsConverting(false);
    setDetailSheetOpen(true);
  };

  const handleStnQtyChange = (itemId: string, val: number, maxQty: number) => {
    if (val < 0) return;
    if (val > maxQty) {
      toast.warning(`Cannot exceed requisition quantity of ${maxQty}`);
      return;
    }
    setStnQuantities((prev) => ({
      ...prev,
      [itemId]: val,
    }));
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

  const handleConvertToSTN = async () => {
    if (!selectedRequisition) return;

    // Build items payload
    const itemsPayload = selectedRequisition.items.map((item: any) => ({
      itemId: item.itemId,
      quantity: stnQuantities[item.itemId] ?? Number(item.quantity),
    })).filter((item: any) => item.quantity > 0);

    if (itemsPayload.length === 0) {
      toast.error('Please specify transfer quantity for at least one item');
      return;
    }

    setSubmitting(true);
    try {
      const res = await stockRequisitionApi.convertToSTN(selectedRequisition.id, {
        items: itemsPayload,
        notes: `Converted from SRN ${selectedRequisition.requisitionNo}`,
      });

      if (res.status) {
        const stnId = res.data?.id;
        toast.success('Requisition converted to STN successfully! Opening print preview...');
        setDetailSheetOpen(false);
        loadRequisitions();
        // Redirect directly to STN print slip page
        if (stnId) {
          router.push(`/erp/inventory/transactions/stock-transfer/slip/${stnId}`);
        } else {
          router.push('/erp/inventory/transactions/stock-transfer');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to convert requisition to STN');
    } finally {
      setSubmitting(false);
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
            Pick, adjust, and convert pending Outlet Stock Requisition Notes (SRN) into Stock Transfer Notes (STN).
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
                        <Button
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                          onClick={() => {
                            openDetailSheet(req);
                            setIsConverting(true);
                          }}
                        >
                          <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Convert to STN
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
                  {isConverting && (
                    <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> WH Picking mode (Quantities can only be decreased)
                    </Badge>
                  )}
                </div>

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-100/60">
                      <TableRow>
                        <TableHead className="font-bold">SKU</TableHead>
                        <TableHead className="font-bold">Description</TableHead>
                        <TableHead className="font-bold w-[120px] text-center">Req Qty</TableHead>
                        {isConverting && (
                          <TableHead className="font-bold w-[120px] text-center text-amber-700">
                            Transfer Qty
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRequisition.items.map((item: any) => {
                        const originalQty = Number(item.quantity);
                        const currentStnQty = stnQuantities[item.itemId] ?? originalQty;

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-semibold">{item.item?.sku}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{item.item?.description}</TableCell>
                            <TableCell className="text-center font-semibold">{originalQty}</TableCell>
                            {isConverting && (
                              <TableCell className="bg-amber-50/40">
                                <Input
                                  type="number"
                                  min={0}
                                  max={originalQty}
                                  value={currentStnQty}
                                  onChange={(e) =>
                                    handleStnQtyChange(
                                      item.itemId,
                                      parseInt(e.target.value) || 0,
                                      originalQty,
                                    )
                                  }
                                  className="w-20 text-center mx-auto border-amber-300 focus-visible:ring-amber-500 font-bold"
                                />
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Action Footer */}
              <SheetFooter className="pt-4 border-t gap-2 sm:gap-0">
                {isConverting ? (
                  <div className="flex gap-2 w-full justify-end">
                    <Button variant="outline" onClick={() => setIsConverting(false)}>
                      Back to View
                    </Button>
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                      disabled={submitting}
                      onClick={handleConvertToSTN}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Converting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" /> Confirm & Issue STN
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
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
                      <Button
                        className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                        onClick={() => setIsConverting(true)}
                      >
                        Convert to STN
                      </Button>
                    </div>
                  </div>
                )}
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
