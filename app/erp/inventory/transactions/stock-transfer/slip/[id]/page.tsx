'use client';

import { use, useEffect, useState } from 'react';
import { getTransferRequests, updateTransferRequestStatus } from '@/lib/actions/transfer-request';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2, CheckCircle2, AlertCircle, XCircle, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';

// ── Hierarchy Types (same as SRN slip) ───────────────────────────────────────
interface GroupedProduct {
  skuBase: string;
  description: string;
  unitPrice: number;
  totalQty: number;
  totalValue: number;
  sizes: { sizeName: string; quantity: number }[];
}
interface GroupedSegment {
  segmentName: string;
  totalQty: number;
  totalValue: number;
  products: GroupedProduct[];
}
interface GroupedGender {
  genderName: string;
  totalQty: number;
  totalValue: number;
  segments: GroupedSegment[];
}
interface GroupedCategory {
  categoryName: string;
  totalQty: number;
  totalValue: number;
  genders: GroupedGender[];
}

export default function TransferSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin, hasPermission } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const isSuperAdmin = isAdmin();
  const canCheck = isSuperAdmin || hasPermission('erp.inventory.transfer.check') || hasPermission('pos.inventory.transfer.check');
  const canAuthorize = isSuperAdmin || hasPermission('erp.inventory.transfer.authorize') || hasPermission('pos.inventory.transfer.authorize');

  const handleStatusUpdate = async (newStatus: string) => {
    setSubmitting(true);
    try {
      const res = await updateTransferRequestStatus(id, newStatus);
      if (res.status) {
        toast.success(`Transfer status updated to ${newStatus.replace('_', ' ')} successfully.`);
        await loadTransferDetails();
      } else {
        toast.error(res.message || 'Failed to update transfer status');
      }
    } catch (error: any) {
      toast.error(error?.message || 'An error occurred while updating status');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    loadTransferDetails();
  }, [id]);

  const loadTransferDetails = async () => {
    try {
      const res = await getTransferRequests();
      const req = res.data?.find((t: any) => t.id === id);
      if (req) {
        setTransfer(req);
      }
    } catch (error) {
      console.error('Failed to load transfer details', error);
    } finally {
      setLoading(false);
    }
  };

  const printSlip = () => window.print();

  const formatDate = (dateStr: any) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '' : format(d, 'dd-MMM-yyyy');
    } catch { return ''; }
  };

  // ── Same base-SKU helper as SRN ──────────────────────────────────────────
  const getBaseSku = (sku: string, sizeName?: string | null) => {
    if (!sku) return '';
    if (!sizeName) return sku;
    const sizeUpper = sizeName.toUpperCase();
    const skuUpper = sku.toUpperCase();
    if (skuUpper.endsWith(`-${sizeUpper}`)) return sku.substring(0, sku.length - sizeUpper.length - 1);
    if (skuUpper.endsWith(` ${sizeUpper}`)) return sku.substring(0, sku.length - sizeUpper.length - 1);
    if (skuUpper.endsWith(sizeUpper)) return sku.substring(0, sku.length - sizeUpper.length);
    return sku;
  };

  // ── Hierarchy grouping (same logic as SRN) ───────────────────────────────
  const getGroupedHierarchy = (items: any[]): GroupedCategory[] => {
    const categories: Record<string, GroupedCategory> = {};
    if (!items || !Array.isArray(items)) return [];

    items.forEach((transferItem) => {
      if (!transferItem) return;
      const item = transferItem.item;
      if (!item) return;

      const categoryName = item.category?.name || 'UNCLASSIFIED';
      const genderName   = item.gender?.name   || 'GENERAL';
      const segmentName  = item.segment?.name  || 'GENERAL';

      const qty        = Number(transferItem.quantity || 0);
      const unitPrice  = Number(item.unitPrice || 0);
      const totalValue = qty * unitPrice;
      const sizeName   = item.size?.name || 'Free Size';
      const skuBase    = getBaseSku(item.sku, item.size?.name);

      if (!categories[categoryName]) {
        categories[categoryName] = { categoryName, totalQty: 0, totalValue: 0, genders: [] };
      }
      const cat = categories[categoryName];
      cat.totalQty += qty; cat.totalValue += totalValue;

      let gend = cat.genders.find((g) => g.genderName === genderName);
      if (!gend) { gend = { genderName, totalQty: 0, totalValue: 0, segments: [] }; cat.genders.push(gend); }
      gend.totalQty += qty; gend.totalValue += totalValue;

      let seg = gend.segments.find((s) => s.segmentName === segmentName);
      if (!seg) { seg = { segmentName, totalQty: 0, totalValue: 0, products: [] }; gend.segments.push(seg); }
      seg.totalQty += qty; seg.totalValue += totalValue;

      let prod = seg.products.find((p) => p.skuBase === skuBase);
      if (!prod) { prod = { skuBase, description: item.description || '', unitPrice, totalQty: 0, totalValue: 0, sizes: [] }; seg.products.push(prod); }
      prod.totalQty += qty; prod.totalValue += totalValue;

      const existingSize = prod.sizes.find((sz) => sz.sizeName === sizeName);
      if (existingSize) { existingSize.quantity += qty; }
      else { prod.sizes.push({ sizeName, quantity: qty }); }
    });

    return Object.values(categories);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-muted-foreground text-sm font-semibold">Loading STN Slip...</p>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <p className="text-rose-500 font-bold">Transfer Not Found</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const groupedCategories = getGroupedHierarchy(transfer.items || []);
  const grandTotalQty = (transfer.items || []).reduce((s: number, i: any) => s + Number(i?.quantity || 0), 0);
  const grandTotalValue = (transfer.items || []).reduce((s: number, i: any) => {
    if (!i?.item) return s;
    return s + Number(i.quantity || 0) * Number(i.item.unitPrice || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white text-black py-6">

      {/* Action Bar (hidden on print) */}
      <div className="print:hidden bg-white border p-4 flex justify-between items-center shadow-sm max-w-4xl mx-auto rounded-md mb-6">
        <Button variant="outline" className="font-bold border-2" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={printSlip}>
          <Printer className="h-4 w-4 mr-2" /> Print STN Slip
        </Button>
      </div>

      {/* Approval Status Card (hidden on print) */}
      {!loading && transfer && (
        <div className="print:hidden bg-white border-2 border-border p-5 shadow-md max-w-4xl mx-auto rounded-md mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground">Status:</span>
                <span className={`font-black text-xs uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                  transfer.status === 'PENDING_CHECKER' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  transfer.status === 'PENDING_AUTHORIZER' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                  transfer.status === 'PENDING' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                  transfer.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                  'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {transfer.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                {transfer.status === 'PENDING_CHECKER' && "This request needs to be checked and approved by a Checker."}
                {transfer.status === 'PENDING_AUTHORIZER' && "This request is checked and is now awaiting final Authorization."}
                {transfer.status === 'PENDING' && "This request is fully authorized and pending dispatch/receipt."}
                {transfer.status === 'REJECTED' && "This request has been rejected and cancelled."}
                {transfer.status === 'COMPLETED' && "This stock transfer is complete."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {transfer.status === 'PENDING_CHECKER' && (
                <>
                  {!canCheck && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-2 rounded-md border border-rose-100">
                      <ShieldAlert className="h-4 w-4" />
                      Requires Checker Role
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="font-bold shadow-sm"
                    disabled={submitting || !canCheck}
                    onClick={() => handleStatusUpdate('REJECTED')}
                  >
                    Reject
                  </Button>
                  <Button
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm"
                    size="sm"
                    disabled={submitting || !canCheck}
                    onClick={() => handleStatusUpdate('PENDING_AUTHORIZER')}
                  >
                    {submitting ? <Loader2 className="h-4.5 w-4.5 animate-spin mr-2" /> : <CheckCircle2 className="h-4.5 w-4.5 mr-2" />}
                    Mark Checked &amp; Approve
                  </Button>
                </>
              )}

              {transfer.status === 'PENDING_AUTHORIZER' && (
                <>
                  {!canAuthorize && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-2 rounded-md border border-rose-100">
                      <ShieldAlert className="h-4 w-4" />
                      Requires Authorizer Role
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="font-bold shadow-sm"
                    disabled={submitting || !canAuthorize}
                    onClick={() => handleStatusUpdate('REJECTED')}
                  >
                    Reject
                  </Button>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
                    size="sm"
                    disabled={submitting || !canAuthorize}
                    onClick={() => handleStatusUpdate('PENDING')}
                  >
                    {submitting ? <Loader2 className="h-4.5 w-4.5 animate-spin mr-2" /> : <CheckCircle2 className="h-4.5 w-4.5 mr-2" />}
                    Authorize &amp; Approve
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* A4 Printable Area — same layout as SRN */}
      <div className="bg-white p-10 max-w-4xl mx-auto shadow-md print:shadow-none print:max-w-none print:p-0 print:m-0 border print:border-0 rounded-md">

        {/* Header — same as SRN */}
        <div className="flex justify-between items-start border-b pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="border-[3px] border-black p-2 flex flex-col justify-center items-center w-14 h-14 font-black tracking-tighter leading-none">
              <span className="text-xl">S</span>
              <span className="text-[10px] -mt-1">PEED</span>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 leading-none">SPEED</p>
              <p className="text-xs uppercase font-extrabold text-black leading-none">PRIVATE LIMITED</p>
            </div>
          </div>

          <div className="text-center flex-1 pr-14">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Speed (Private) Limited</h1>
            <p className="text-lg font-bold text-gray-800">Stock Transfer Note</p>
            <p className="text-xl font-extrabold uppercase border-b-2 border-black inline-block px-8 mt-1 tracking-wider">
              {transfer.brand?.name || transfer.items?.[0]?.item?.brand?.name || 'GENERAL'}
            </p>
          </div>
        </div>

        {/* Info Grid — same as SRN */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-2.5 text-[13px] border-b pb-5 mb-6">
          <div className="space-y-1.5">
            <div className="flex">
              <span className="font-semibold w-36 text-gray-600">From Warehouse :</span>
              <span className="font-bold text-gray-800">{transfer.fromWarehouse?.name || '-'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-36 text-gray-600">To Location :</span>
              <span className="font-bold text-gray-800">{transfer.toLocation?.name || '-'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-36 text-gray-600">Transfer Type :</span>
              <span className="font-bold text-gray-800">{transfer.transferType || '-'}</span>
            </div>
            <div className="flex items-center">
              <span className="font-semibold w-36 text-gray-600">S.T.N. No :</span>
              <span className="font-bold text-base font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                {(transfer.requestNo || '').replace('TR-', '')}
              </span>
            </div>
            {transfer.stockRequisition && (
              <div className="flex">
                <span className="font-semibold w-36 text-gray-600">Ref SRN No :</span>
                <span className="font-medium text-gray-800">{transfer.stockRequisition?.requisitionNo || '-'}</span>
              </div>
            )}
            <div className="flex">
              <span className="font-semibold w-36 text-gray-600">Remarks :</span>
              <span className="font-medium text-gray-800">{transfer.notes || '-'}</span>
            </div>
          </div>

          <div className="space-y-1.5 text-right flex flex-col items-end justify-start">
            <div className="flex gap-2">
              <span className="font-semibold text-gray-600">Date :</span>
              <span className="font-bold text-gray-800">{formatDate(transfer.createdAt)}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-gray-600">Status :</span>
              <span className="font-bold text-indigo-600">{transfer.status}</span>
            </div>
          </div>
        </div>

        {/* Hierarchical Table — exactly like SRN */}
        <div className="w-full text-xs">
          <div className="grid grid-cols-12 font-bold border-b border-black pb-2 text-[11px] uppercase tracking-wider text-gray-700">
            <div className="col-span-5">GPC / Category / Product</div>
            <div className="col-span-2 text-center">Size</div>
            <div className="col-span-1 text-center">Quantity</div>
            <div className="col-span-2 text-right pr-4">Selling Price (Rs.)</div>
            <div className="col-span-2 text-right">Total Value (Rs.)</div>
          </div>

          <div className="space-y-6 pt-3">
            {groupedCategories.map((cat) => (
              <div key={cat.categoryName} className="space-y-4">
                {/* Level 1: Category */}
                <div className="grid grid-cols-12 font-extrabold border-b pb-1 text-black text-sm uppercase">
                  <div className="col-span-5">{cat.categoryName}</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-1 text-center text-base font-black">{cat.totalQty}</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-black">
                    {cat.totalValue.toLocaleString('en-PK', { minimumFractionDigits: 0 })}
                  </div>
                </div>

                {/* Level 2: Genders */}
                {cat.genders.map((gender) => (
                  <div key={gender.genderName} className="pl-4 space-y-3">
                    <div className="grid grid-cols-12 font-bold text-gray-800 border-b border-dashed pb-0.5 uppercase">
                      <div className="col-span-5">{gender.genderName}</div>
                      <div className="col-span-2"></div>
                      <div className="col-span-1 text-center font-bold">{gender.totalQty}</div>
                      <div className="col-span-2"></div>
                      <div className="col-span-2 text-right font-bold">
                        {gender.totalValue.toLocaleString('en-PK', { minimumFractionDigits: 0 })}
                      </div>
                    </div>

                    {/* Level 3: Segments */}
                    {gender.segments.map((segment) => (
                      <div key={segment.segmentName} className="pl-4 space-y-2">
                        <div className="grid grid-cols-12 font-semibold text-gray-700 uppercase">
                          <div className="col-span-5">{segment.segmentName}</div>
                          <div className="col-span-2"></div>
                          <div className="col-span-1 text-center font-semibold">{segment.totalQty}</div>
                          <div className="col-span-2"></div>
                          <div className="col-span-2 text-right">
                            {segment.totalValue.toLocaleString('en-PK', { minimumFractionDigits: 0 })}
                          </div>
                        </div>

                        {/* Level 4: Products */}
                        {segment.products.map((prod) => (
                          <div key={prod.skuBase} className="pl-4 border-l border-gray-300 space-y-1 my-2">
                            <div className="grid grid-cols-12 font-medium text-gray-900">
                              <div className="col-span-5 flex gap-2">
                                <span className="font-bold underline">{prod.skuBase}</span>
                                <span className="text-gray-600 truncate">{prod.description}</span>
                              </div>
                              <div className="col-span-2"></div>
                              <div className="col-span-1 text-center font-bold bg-gray-50">{prod.totalQty}</div>
                              <div className="col-span-2 text-right pr-4">
                                {prod.unitPrice > 0
                                  ? prod.unitPrice.toLocaleString('en-PK', { minimumFractionDigits: 0 })
                                  : '0'}
                              </div>
                              <div className="col-span-2 text-right">
                                {prod.totalValue.toLocaleString('en-PK', { minimumFractionDigits: 0 })}
                              </div>
                            </div>

                            {/* Level 5: Sizes */}
                            {prod.sizes.map((sz) => (
                              <div key={sz.sizeName} className="grid grid-cols-12 text-gray-500 text-[11px] pl-6">
                                <div className="col-span-5"></div>
                                <div className="col-span-2 text-center font-mono font-semibold">{sz.sizeName}</div>
                                <div className="col-span-1 text-center font-bold text-gray-800">{sz.quantity}</div>
                                <div className="col-span-2"></div>
                                <div className="col-span-2"></div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Grand Totals — same as SRN */}
        <div className="grid grid-cols-12 font-black border-t-2 border-black mt-8 pt-3 text-sm">
          <div className="col-span-5 uppercase">Grand Totals:</div>
          <div className="col-span-2"></div>
          <div className="col-span-1 text-center text-lg">{grandTotalQty}</div>
          <div className="col-span-2"></div>
          <div className="col-span-2 text-right text-lg">
            Rs. {grandTotalValue.toLocaleString('en-PK', { minimumFractionDigits: 0 })}
          </div>
        </div>

        {/* Signatures — same as SRN */}
        <div className="grid grid-cols-4 gap-8 mt-24 pt-8 border-t border-dashed border-gray-300 text-center text-[11px] font-bold uppercase tracking-wider text-gray-700">
          <div>
            <div className="border-b border-gray-400 w-3/4 mx-auto mb-2"></div>
            <p>Prepared By (Warehouse)</p>
            <p className="text-[9px] text-gray-400 font-normal mt-0.5">Sign &amp; Date</p>
          </div>
          <div>
            <div className="border-b border-gray-400 w-3/4 mx-auto mb-2"></div>
            <p>Checked By (Checker)</p>
            <p className="text-[9px] text-gray-400 font-normal mt-0.5">Sign &amp; Date</p>
          </div>
          <div>
            <div className="border-b border-gray-400 w-3/4 mx-auto mb-2"></div>
            <p>Authorized By</p>
            <p className="text-[9px] text-gray-400 font-normal mt-0.5">Sign &amp; Date</p>
          </div>
          <div>
            <div className="border-b border-gray-400 w-3/4 mx-auto mb-2"></div>
            <p>Received By (Outlet Manager)</p>
            <p className="text-[9px] text-gray-400 font-normal mt-0.5">Sign &amp; Date</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-[10px] text-gray-400 border-t pt-4">
          <p>This is a system-generated Stock Transfer Note. Please perform physical inspection upon delivery.</p>
        </div>
      </div>
    </div>
  );
}
