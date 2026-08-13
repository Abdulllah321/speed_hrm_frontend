'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Check, X, Printer, Building2 } from 'lucide-react';
import Link from 'next/link';
import { purchaseReturnApi, PurchaseReturn } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PermissionGuard } from "@/components/auth/permission-guard";

export function numberToWords(amount: number): string {
    const a = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = [
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ];

    const inWords = (num: number): string => {
        let n = Math.floor(num);
        if (n === 0) return "Zero";

        const convert = (n: number): string => {
            if (n < 20) return a[n];
            if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? "-" + a[n % 10] : "");
            if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convert(n % 100) : "");
            if (n < 1000000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
            if (n < 1000000000) return convert(Math.floor(n / 1000000)) + " Million" + (n % 1000000 !== 0 ? " " + convert(n % 1000000) : "");
            return convert(Math.floor(n / 1000000000)) + " Billion" + (n % 1000000000 !== 0 ? " " + convert(n % 1000000000) : "");
        };

        return convert(n) + " Only";
    };

    return `Rs. ${inWords(amount)}.`;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtInt(n: number) {
  return Math.round(n).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const returnTypeLabels = {
  DEFECTIVE: 'Defective',
  EXCESS: 'Excess',
  WRONG_ITEM: 'Wrong Item',
  DAMAGED: 'Damaged',
  SHORTAGE: 'Shortage',
};

export default function PurchaseReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [purchaseReturn, setPurchaseReturn] = useState<PurchaseReturn | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadPurchaseReturn(params.id as string);
    }
  }, [params.id]);

  const loadPurchaseReturn = async (id: string) => {
    try {
      setLoading(true);
      const data = await purchaseReturnApi.getById(id);
      setPurchaseReturn(data);
    } catch (error) {
      console.error('Error loading purchase return:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!purchaseReturn) return;

    try {
      await purchaseReturnApi.updateStatus(purchaseReturn.id, status, 'current-user-id'); // Replace with actual user ID
      loadPurchaseReturn(purchaseReturn.id);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSubmit = async () => {
    if (!purchaseReturn) return;
    
    if (confirm('Submit this return for approval?')) {
      await handleStatusUpdate('SUBMITTED');
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading purchase return...</div>;
  }

  if (!purchaseReturn) {
    return <div className="p-6 text-center text-red-500">Purchase return not found</div>;
  }

  return (
    <PermissionGuard permissions="erp.procurement.pret.read">
      <>
        <style jsx global>{`
            @media print {
                body {
                    visibility: hidden;
                }
                #print-section {
                    visibility: visible;
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: auto;
                    margin: 0;
                    padding: 0;
                    background: white;
                    z-index: 9999;
                }
                #print-section * {
                    visibility: visible;
                }
                @page {
                    margin: 0;
                    size: auto;
                }
                header, nav, footer, aside, .banner {
                    display: none !important;
                }
            }
        `}</style>
        <div className="container mx-auto p-6 print:hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold">Purchase Return {purchaseReturn.returnNumber}</h1>
                <p className="text-gray-600">Return details and status</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {purchaseReturn.status === 'DRAFT' && (
                <PermissionGuard permissions="erp.procurement.pret.update" fallback={null}>
                  <>
                    <Link href={`/erp/procurement/purchase-returns/${purchaseReturn.id}/edit`} transitionTypes={["nav-forward"]}>
                      <Button variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Button onClick={handleSubmit}>
                      Submit for Approval
                    </Button>
                  </>
                </PermissionGuard>
              )}
              {purchaseReturn.status === 'SUBMITTED' && (
                <PermissionGuard permissions="erp.procurement.pret.update" fallback={null}>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="text-green-600"
                      onClick={() => handleStatusUpdate('APPROVED')}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-red-600"
                      onClick={() => handleStatusUpdate('REJECTED')}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </PermissionGuard>
              )}
              <Button onClick={() => window.print()} variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" /> Print Return
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Return Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Return Number</label>
                      <p className="font-medium">{purchaseReturn.returnNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">PR Creation Date (Auto)</label>
                      <p className="font-medium">{formatDate(purchaseReturn.createdAt)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Sale Tax Invoice Date</label>
                      <p className="font-medium">{formatDate(purchaseReturn.returnDate)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Season</label>
                      <p className="font-medium">{purchaseReturn.season?.name || '—'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Supplier</label>
                      <p className="font-medium">{purchaseReturn.supplier?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Warehouse</label>
                      <p className="font-medium">{purchaseReturn.warehouse?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Company GST #</label>
                      <p className="font-medium">{purchaseReturn.companyGstNumber || '—'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Supplier GST #</label>
                      <p className="font-medium">
                        {(() => {
                          const rawGst = purchaseReturn.supplierGstNumber || purchaseReturn.supplier?.strnNo || purchaseReturn.supplier?.ntnNo;
                          return (rawGst && rawGst.toLowerCase() !== 'registered') ? rawGst : '—';
                        })()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Return Type</label>
                      <p className="font-medium">{returnTypeLabels[purchaseReturn.returnType as keyof typeof returnTypeLabels] || purchaseReturn.returnType}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <div>
                        <Badge className={statusColors[purchaseReturn.status as keyof typeof statusColors]}>
                          {purchaseReturn.status}
                        </Badge>
                      </div>
                    </div>
                    {purchaseReturn.staxEInvoiceNumber && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">STax e-Inv #</label>
                        <p className="font-medium">{purchaseReturn.staxEInvoiceNumber}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Return Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Return Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                          <th className="text-left p-3">SKU</th>
                          <th className="text-left p-3">HS Code</th>
                          <th className="text-left p-3">Description</th>
                          <th className="text-left p-3">Size</th>
                          <th className="text-left p-3">Color</th>
                          <th className="text-right p-3">Return Qty</th>
                          <th className="text-right p-3">Unit Cost</th>
                          <th className="text-right p-3">Val. Excl. Tax</th>
                          <th className="text-right p-3">Sales Tax %</th>
                          <th className="text-right p-3">Sales Tax Amt</th>
                          <th className="text-right p-3">Val. Incl. Tax</th>
                          <th className="text-right p-3">Disc %</th>
                          <th className="text-right p-3">Disc Amt</th>
                          <th className="text-left p-3">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseReturn.items.map((item: any) => {
                          const qty      = Number(item.returnQty      || 0);
                          const unitCost = Number(item.unitPrice     || 0);
                          
                          const discRate = Number(item.purchaseInvoiceItem?.discountRate  || 0);
                          const discAmt  = qty * unitCost * discRate / 100;
                          const valExcl  = qty * unitCost - discAmt;
                          
                          const taxRate  = Number(item.purchaseInvoiceItem?.taxRate       || 0);
                          const taxAmt   = valExcl * taxRate / 100;
                          const valIncl  = valExcl + taxAmt;
                          
                          const lineTotal = valIncl;

                          return (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                              <td className="p-3 font-mono text-xs">{item.item?.sku || item.sku || "—"}</td>
                              <td className="p-3 font-mono text-xs text-gray-500">{item.item?.hsCodeStr || "—"}</td>
                              <td className="p-3">
                                <div className="font-medium">{item.description || item.item?.description || "—"}</div>
                              </td>
                              <td className="p-3 text-left">{item.item?.size?.name || "—"}</td>
                              <td className="p-3 text-left">{item.item?.color?.name || "—"}</td>
                              <td className="p-3 text-right tabular-nums">{fmt(qty)}</td>
                              <td className="p-3 text-right tabular-nums">{fmt(unitCost)}</td>
                              <td className="p-3 text-right tabular-nums">{fmt(valExcl)}</td>
                              <td className="p-3 text-right tabular-nums">{taxRate}%</td>
                              <td className="p-3 text-right tabular-nums">{fmt(taxAmt)}</td>
                              <td className="p-3 text-right tabular-nums">{fmt(valIncl)}</td>
                              <td className="p-3 text-right tabular-nums">{discRate}%</td>
                              <td className="p-3 text-right tabular-nums">{fmt(discAmt)}</td>
                              <td className="p-3 text-left text-xs text-gray-600">{item.reason || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {(() => {
                        let tQty = 0, tUnitCost = 0, tValExcl = 0, tSalesTax = 0, tValIncl = 0, tDiscAmt = 0, tLineTotal = 0;
                        (purchaseReturn.items || []).forEach((item: any) => {
                          const qty      = Number(item.returnQty || 0);
                          const unitCost = Number(item.unitPrice || 0);
                          const discRate = Number(item.purchaseInvoiceItem?.discountRate || 0);
                          const discAmt  = qty * unitCost * discRate / 100;
                          const valExcl  = qty * unitCost - discAmt;
                          const taxRate  = Number(item.purchaseInvoiceItem?.taxRate || 0);
                          const taxAmt   = valExcl * taxRate / 100;
                          const valIncl  = valExcl + taxAmt;

                          tQty += qty;
                          tUnitCost += unitCost;
                          tValExcl += valExcl;
                          tSalesTax += taxAmt;
                          tValIncl += valIncl;
                          tDiscAmt += discAmt;
                          tLineTotal += valIncl;
                        });

                        return (
                          <tfoot className="border-t-2 border-gray-300 font-bold bg-gray-50">
                            <tr>
                              <td colSpan={5} className="p-3 text-right">Total:</td>
                              <td className="p-3 text-right tabular-nums">{fmt(tQty)}</td>
                              <td className="p-3 text-right tabular-nums">{fmt(tUnitCost)}</td>
                              <td className="p-3 text-right tabular-nums">{fmt(tValExcl)}</td>
                              <td className="p-3"></td>
                              <td className="p-3 text-right tabular-nums">{fmt(tSalesTax)}</td>
                              <td className="p-3 text-right tabular-nums">{fmt(tValIncl)}</td>
                              <td className="p-3"></td>
                              <td className="p-3 text-right tabular-nums">{fmt(tDiscAmt)}</td>
                              <td className="p-3 text-left text-xs text-gray-600"></td>
                            </tr>
                          </tfoot>
                        );
                      })()}
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Source Document Reference */}
              <Card>
                <CardHeader>
                  <CardTitle>Source Document</CardTitle>
                </CardHeader>
                <CardContent>
                  {purchaseReturn.sourceType === 'INVOICE' && purchaseReturn.purchaseInvoice && (
                    <div>
                      <h3 className="font-semibold">Purchase Invoice Reference</h3>
                      <p className="text-gray-600">Invoice Number: {purchaseReturn.purchaseInvoice.invoiceNumber}</p>
                      <p className="text-gray-600">Date: {formatDate(purchaseReturn.purchaseInvoice.invoiceDate)}</p>
                      {(purchaseReturn.purchaseInvoice.grn?.grnNumber || (purchaseReturn.purchaseInvoice.landedCost as any)?.grn?.grnNumber) && (
                        <p className="text-gray-600">GRN Number: {purchaseReturn.purchaseInvoice.grn?.grnNumber || (purchaseReturn.purchaseInvoice.landedCost as any)?.grn?.grnNumber}</p>
                      )}
                      {purchaseReturn.purchaseInvoice.landedCost && (
                        <p className="text-gray-600">LC Number: {purchaseReturn.purchaseInvoice.landedCost.landedCostNumber}</p>
                      )}
                    </div>
                  )}
                  {purchaseReturn.sourceType === 'GRN' && purchaseReturn.grn && (
                    <div>
                      <h3 className="font-semibold">GRN Reference</h3>
                      <p className="text-gray-600">GRN Number: {purchaseReturn.grn.grnNumber}</p>
                      <p className="text-gray-600">PO Number: {purchaseReturn.grn.purchaseOrder?.poNumber}</p>
                    </div>
                  )}
                  {purchaseReturn.sourceType === 'LANDED_COST' && purchaseReturn.landedCost && (
                    <div>
                      <h3 className="font-semibold">Landed Cost Reference</h3>
                      <p className="text-gray-600">LC Number: {purchaseReturn.landedCost.landedCostNumber}</p>
                      <p className="text-gray-600">PO Number: {purchaseReturn.landedCost.purchaseOrder?.poNumber}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Approval Info */}
              {purchaseReturn.status === 'APPROVED' && purchaseReturn.approvedBy && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Approval & Financial Impact</CardTitle>
                    {purchaseReturn.debitNote && (
                      <Link href={`/erp/procurement/debit-notes/${purchaseReturn.debitNote.id}`} transitionTypes={["nav-forward"]}>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                          View Debit Note
                        </Button>
                      </Link>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-500">Approved By:</span>
                        <div className="font-medium">{purchaseReturn.approvedBy}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Approved At:</span>
                        <div className="font-medium">{formatDate(purchaseReturn.approvedAt!)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column (Summary) */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const advRate  = Number(purchaseReturn.purchaseInvoice?.advanceTaxRate || 0.5);
                    
                    let totalQty = 0;
                    let grossSubtotal = 0;
                    let totalDiscount = 0;
                    let totalSalesTax = 0;
                    let totalAdvTax = 0;
                    let totalAmount = 0;
                    
                    (purchaseReturn.items || []).forEach((item: any) => {
                      const qty      = Number(item.returnQty      || 0);
                      const unitCost = Number(item.unitPrice     || 0);
                      const discRate = Number(item.purchaseInvoiceItem?.discountRate  || 0);
                      const discAmt  = qty * unitCost * discRate / 100;
                      const valExcl  = qty * unitCost - discAmt;
                      const taxRate  = Number(item.purchaseInvoiceItem?.taxRate       || 0);
                      const taxAmt   = valExcl * taxRate / 100;
                      const valIncl  = valExcl + taxAmt;
                      
                      totalQty += qty;
                      grossSubtotal += qty * unitCost;
                      totalDiscount += discAmt;
                      totalSalesTax += taxAmt;
                      totalAmount += valIncl;
                    });
                    
                    const valExcl = grossSubtotal - totalDiscount;
                    const valIncl = valExcl + totalSalesTax;
                    
                    return (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total QTY</span>
                          <span className="font-medium tabular-nums">{fmtInt(totalQty)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Subtotal (Gross)</span>
                          <span className="font-medium tabular-nums">{fmtInt(grossSubtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Discount</span>
                          <span className="font-medium tabular-nums text-red-600">-{fmtInt(totalDiscount)}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t pt-2">
                          <span className="text-gray-700 font-medium">Value Excl. Sales Tax</span>
                          <span className="font-semibold tabular-nums">{fmtInt(valExcl)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Sale Tax Amount</span>
                          <span className="font-medium tabular-nums">{fmtInt(totalSalesTax)}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t pt-2">
                          <span className="text-gray-700 font-medium">Value Incl. Sales Tax</span>
                          <span className="font-semibold tabular-nums">{fmtInt(valIncl)}</span>
                        </div>
                        <hr />
                        <div className="flex justify-between font-semibold">
                          <span>Total Return Amount</span>
                          <span className="tabular-nums font-bold text-lg text-blue-700">{fmtInt(totalAmount)}</span>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              {purchaseReturn.reason && (
                <Card>
                  <CardHeader>
                    <CardTitle>Return Reason</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{purchaseReturn.reason}</p>
                  </CardContent>
                </Card>
              )}

              {purchaseReturn.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{purchaseReturn.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Print View */}
        <div id="print-section" className="hidden print:block min-h-screen bg-white p-0">
            <div className="w-full max-w-[1000px] mx-auto bg-white text-black p-8 font-sans print:p-8 print:max-w-none box-border">
                {/* Header */}
                <div className="flex justify-between mb-6 gap-4 items-start border-b pb-4">
                    {/* Logo */}
                    <div className="w-[20%] flex flex-col items-start justify-center">
                       <img src="/image.png" alt="Logo" className="w-28 object-contain" />
                    </div>
                    
                    {/* Center Title & Details */}
                    <div className="flex-1 text-center flex flex-col items-center justify-center">
                      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Speed (Private) Limited</h1>
                      <p className="text-xs font-semibold text-gray-700 mt-0.5">GST #: {purchaseReturn.companyGstNumber || '12-01-9999-663-46'}</p>
                      {(() => {
                         const printBrands = Array.from(
                           new Set(
                             (purchaseReturn.items || [])
                               .map((i: any) => i.item?.brand?.name || i.brand)
                               .filter(Boolean)
                           )
                         ).join(', ');
                         return (
                           <div className="bg-[#eef2f6] text-black w-full py-1.5 px-4 mt-2 text-lg sm:text-xl font-bold border border-gray-300 print:bg-[#eef2f6] [-webkit-print-color-adjust:exact]">
                             Purchase Return {printBrands ? `| ${printBrands}` : ''}
                           </div>
                         );
                       })()}
                    </div>

                    {/* Details Box */}
                    <div className="w-[35%] bg-[#f8fafc] text-xs p-2 border border-gray-300 print:bg-[#f8fafc] [-webkit-print-color-adjust:exact] flex flex-col">
                        <div className="flex justify-between mb-1">
                           <span className="font-bold">Return Number:</span>
                           <span className="font-bold">{purchaseReturn.returnNumber}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                           <span className="font-bold">PR Creation Date:</span>
                           <span>{formatDate(purchaseReturn.createdAt)}</span>
                        </div>
                        {purchaseReturn.season?.name && (
                           <div className="flex justify-between mb-1">
                              <span className="font-bold">Season:</span>
                              <span>{purchaseReturn.season.name}</span>
                           </div>
                        )}
                        {purchaseReturn.purchaseInvoice && (
                           <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
                              <span className="font-bold">Source Invoice:</span>
                              <span>{purchaseReturn.purchaseInvoice.invoiceNumber}</span>
                           </div>
                        )}
                        {(purchaseReturn.grn?.grnNumber || purchaseReturn.purchaseInvoice?.grn?.grnNumber || (purchaseReturn.purchaseInvoice?.landedCost as any)?.grn?.grnNumber || purchaseReturn.landedCost?.grn?.grnNumber) && (
                           <div className="flex justify-between mt-1">
                              <span className="font-bold">GRN Number:</span>
                              <span>{purchaseReturn.grn?.grnNumber || purchaseReturn.purchaseInvoice?.grn?.grnNumber || (purchaseReturn.purchaseInvoice?.landedCost as any)?.grn?.grnNumber || purchaseReturn.landedCost?.grn?.grnNumber}</span>
                           </div>
                        )}
                        {purchaseReturn.staxEInvoiceNumber && (
                           <div className="flex justify-between mt-1">
                              <span className="font-bold">STax e-Inv #:</span>
                              <span>{purchaseReturn.staxEInvoiceNumber}</span>
                           </div>
                        )}
                        <div className="flex justify-between mb-1">
                           <span className="font-bold">Sale Tax Invoice Date:</span>
                           <span>{formatDate(purchaseReturn.returnDate)}</span>
                        </div>
                     </div>
                </div>

                {/* Vendor / Ship To Box */}
                <div className="flex gap-4 mb-4 text-xs sm:text-[13px]">
                    <div className="w-1/2 p-2 border border-gray-300 flex flex-col justify-center">
                        <div className="font-bold border-b border-gray-300 mb-2 pb-1">Supplier Details</div>
                        <div className="flex gap-2 mb-1"><span className="font-bold w-16 shrink-0">Name:</span> <span>{purchaseReturn.supplier?.name || 'N/A'}</span></div>
                        {purchaseReturn.supplier?.address && (
                          <div className="flex gap-2 mb-1"><span className="font-bold w-16 shrink-0">Address:</span> <span>{purchaseReturn.supplier.address}</span></div>
                        )}
                        {(() => {
                           const rawGst = purchaseReturn.supplierGstNumber || purchaseReturn.supplier?.gstNumber || purchaseReturn.supplier?.strnNo;
                           const gstVal = (rawGst && rawGst.toLowerCase() !== 'registered') ? rawGst : '';
                           return gstVal ? (
                             <div className="flex gap-2 mb-1">
                               <span className="font-bold w-16 shrink-0">GST #:</span>
                               <span>{gstVal}</span>
                             </div>
                           ) : null;
                         })()}
                    </div>
                    <div className="w-1/2 p-2 border border-gray-300 flex flex-col justify-center">
                        <div className="font-bold border-b border-gray-300 mb-2 pb-1">Warehouse</div>
                        <div className="flex gap-2 mb-1"><span className="font-bold w-16 shrink-0">Name:</span> <span>{purchaseReturn.warehouse?.name || 'N/A'}</span></div>
                    </div>
                </div>

                {/* Table */}
                <table className="w-full text-[10px] sm:text-[11px] mb-4 border-collapse">
                    <thead>
                      <tr className="border-y-2 border-black">
                        <th className="py-1 pr-1 text-left font-bold w-[3%] whitespace-nowrap">#</th>
                        <th className="py-1 pr-1 text-left font-bold w-[10%] whitespace-nowrap">SKU</th>
                        <th className="py-1 pr-1 text-left font-bold w-[9%] whitespace-nowrap">HS Code</th>
                        <th className="py-1 pr-1 text-left font-bold w-[19%]">Description</th>
                        <th className="py-1 pr-1 text-left font-bold w-[6%] whitespace-nowrap">Size</th>
                        <th className="py-1 pr-1 text-left font-bold w-[7%] whitespace-nowrap">Color</th>
                        <th className="py-1 pr-1 text-right font-bold w-[5%] whitespace-nowrap">Qty</th>
                        <th className="py-1 pr-1 text-right font-bold w-[8%] whitespace-nowrap">Unit Cost</th>
                        <th className="py-1 pr-1 text-right font-bold w-[9%] whitespace-nowrap">Val Excl Tax</th>
                        <th className="py-1 pr-1 text-right font-bold w-[6%] whitespace-nowrap">Sales Tax Rate</th>
                        <th className="py-1 pr-1 text-right font-bold w-[8%] whitespace-nowrap">Sales Tax</th>
                        <th className="py-1 text-right font-bold w-[12%] whitespace-nowrap">Val Incl Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseReturn.items && purchaseReturn.items.length > 0 ? (
                        purchaseReturn.items.map((item: any, i: number) => {
                          const qty      = Number(item.returnQty      || 0);
                          const unitCost = Number(item.unitPrice     || 0);
                          
                          const discRate = Number(item.purchaseInvoiceItem?.discountRate  || 0);
                          const discAmt  = qty * unitCost * discRate / 100;
                          const valExcl  = qty * unitCost - discAmt;
                          
                          const taxRate  = Number(item.purchaseInvoiceItem?.taxRate       || 0);
                          const taxAmt   = valExcl * taxRate / 100;
                          const valIncl  = valExcl + taxAmt;

                          return (
                            <tr key={item.id || i} className="border-b border-gray-300 align-top">
                              <td className="py-1 pr-1 tabular-nums">{i + 1}</td>
                              <td className="py-1 pr-1 font-mono font-bold">{item.item?.sku || item.sku || '—'}</td>
                              <td className="py-1 pr-1 font-mono text-gray-500">{item.item?.hsCodeStr || '—'}</td>
                              <td className="py-1 pr-1 text-gray-800">
                                <div>{item.description || item.item?.description || '—'}</div>
                                {item.reason && <div className="text-[9px] text-gray-500 italic mt-0.5">Reason: {item.reason}</div>}
                              </td>
                              <td className="py-1 pr-1 text-left">{item.item?.size?.name || item.size || '—'}</td>
                              <td className="py-1 pr-1 text-left">{item.item?.color?.name || item.color || '—'}</td>
                              <td className="py-1 pr-1 text-right tabular-nums">{qty}</td>
                              <td className="py-1 pr-1 text-right tabular-nums">{fmtInt(unitCost)}</td>
                              <td className="py-1 pr-1 text-right tabular-nums">{fmtInt(valExcl)}</td>
                              <td className="py-1 pr-1 text-right tabular-nums">{taxRate}%</td>
                              <td className="py-1 pr-1 text-right tabular-nums">{fmtInt(taxAmt)}</td>
                              <td className="py-1 text-right tabular-nums font-semibold">{fmtInt(valIncl)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                            <td colSpan={12} className="py-4 text-center text-muted-foreground border-b border-gray-300">
                                No items found for this return
                            </td>
                        </tr>
                      )}
                    </tbody>
                    {(() => {
                      let tQty = 0, tUnitCost = 0, tValExcl = 0, tSalesTax = 0, tValIncl = 0;
                      (purchaseReturn.items || []).forEach((item: any) => {
                        const qty      = Number(item.returnQty || 0);
                        const unitCost = Number(item.unitPrice || 0);
                        const discRate = Number(item.purchaseInvoiceItem?.discountRate || 0);
                        const discAmt  = qty * unitCost * discRate / 100;
                        const valExcl  = qty * unitCost - discAmt;
                        const taxRate  = Number(item.purchaseInvoiceItem?.taxRate || 0);
                        const taxAmt   = valExcl * taxRate / 100;
                        const valIncl  = valExcl + taxAmt;

                        tQty += qty;
                        tUnitCost += unitCost;
                        tValExcl += valExcl;
                        tSalesTax += taxAmt;
                        tValIncl += valIncl;
                      });

                      return (
                        <tfoot className="border-y-2 border-black font-bold">
                          <tr>
                            <td colSpan={6} className="py-1 pr-1 text-right">Total:</td>
                            <td className="py-1 pr-1 text-right tabular-nums">{fmtInt(tQty)}</td>
                            <td className="py-1 pr-1 text-right tabular-nums">{fmtInt(tUnitCost)}</td>
                            <td className="py-1 pr-1 text-right tabular-nums">{fmtInt(tValExcl)}</td>
                            <td className="py-1 pr-1 text-right"></td>
                            <td className="py-1 pr-1 text-right tabular-nums">{fmtInt(tSalesTax)}</td>
                            <td className="py-1 text-right tabular-nums font-bold">{fmtInt(tValIncl)}</td>
                          </tr>
                        </tfoot>
                      );
                    })()}
                </table>

                {/* Totals Section */}
                <div className="border-b border-black pb-4 text-xs sm:text-[13px] pt-3">
                    <div className="flex gap-2 font-bold mb-1">
                        <span className="whitespace-nowrap">Total Return Amount:</span>
                        <span className="font-bold border-b-2 border-black pb-0.5">{fmtInt(Number(purchaseReturn.totalAmount || 0))}</span>
                    </div>
                    <div className="flex gap-2 font-bold mb-1">
                        <span className="whitespace-nowrap">In Words:</span>
                        <span className="underline decoration-1 underline-offset-2 break-words">{numberToWords(Number(purchaseReturn.totalAmount || 0))}</span>
                    </div>
                    {purchaseReturn.reason && (
                      <div className="text-left text-xs mt-2 border-t pt-2 border-dashed border-gray-300">
                        <span className="font-bold">Reason for Return: </span>
                        <span className="text-gray-700">{purchaseReturn.reason}</span>
                      </div>
                    )}
                    {purchaseReturn.notes && (
                      <div className="text-left text-xs mt-1">
                        <span className="font-bold">Internal Notes: </span>
                        <span className="text-gray-700">{purchaseReturn.notes}</span>
                      </div>
                    )}
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-3 mt-8">
                    <div className="border border-black h-20 p-2 flex flex-col justify-start items-center">
                        <span className="text-[10px] sm:text-[11px] font-bold text-center">PREPARED BY</span>
                    </div>
                    <div className="border border-black h-20 p-2 flex flex-col justify-start items-center">
                        <span className="text-[10px] sm:text-[11px] font-bold text-center">CHECKED BY</span>
                    </div>
                    <div className="border border-black h-20 p-2 flex flex-col justify-start items-center">
                        <span className="text-[10px] sm:text-[11px] font-bold text-center">APPROVED BY</span>
                    </div>
                </div>
            </div>
        </div>
      </>
    </PermissionGuard>
  );
}