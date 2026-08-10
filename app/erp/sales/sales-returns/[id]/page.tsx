'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, CheckCircle, XCircle, Send, Printer, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { salesReturnApi, SalesReturn } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PermissionGuard } from "@/components/auth/permission-guard";

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

function fmtInt(n: number) {
  return Math.round(n).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function SalesReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [salesReturn, setSalesReturn] = useState<SalesReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadReturn();
  }, [resolvedParams.id]);

  const loadReturn = async () => {
    try {
      setLoading(true);
      const data = await salesReturnApi.getById(resolvedParams.id);
      setSalesReturn(data);
    } catch (error) {
      console.error('Error loading sales return:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!confirm(`Are you sure you want to change status to ${status}?`)) return;

    try {
      setUpdating(true);
      await salesReturnApi.updateStatus(resolvedParams.id, status, status === 'APPROVED' ? 'Manager' : undefined);
      loadReturn();
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert(error?.message || 'Error updating status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading sales return...</div>;
  }

  if (!salesReturn) {
    return <div className="p-6 text-center text-red-600">Sales return not found</div>;
  }

  const sourceDocNo = salesReturn.salesInvoice?.invoiceNo || salesReturn.deliveryChallan?.challanNo || 'N/A';

  return (
    <PermissionGuard permissions="erp.sales.invoice.read">
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

        <div className="p-6 space-y-6 print:hidden">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/erp/sales/sales-returns" transitionTypes={["nav-back"]}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{salesReturn.returnNumber}</h1>
                  <Badge className={(statusColors as any)[salesReturn.status]}>
                    {salesReturn.status}
                  </Badge>
                </div>
                <p className="text-gray-600">
                  Return against {sourceDocNo} - {salesReturn.customer?.name}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-1" /> Print
              </Button>

              {salesReturn.status === 'DRAFT' && (
                <>
                  <Link href={`/erp/sales/sales-returns/${salesReturn.id}/edit`} transitionTypes={["nav-forward"]}>
                    <Button variant="outline">
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  </Link>
                  <Button
                    onClick={() => handleStatusUpdate('SUBMITTED')}
                    disabled={updating}
                  >
                    <Send className="w-4 h-4 mr-1" /> Submit for Approval
                  </Button>
                </>
              )}

              {salesReturn.status === 'SUBMITTED' && (
                <>
                  <Button
                    onClick={() => handleStatusUpdate('APPROVED')}
                    disabled={updating}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate('REJECTED')}
                    disabled={updating}
                    variant="destructive"
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Credit Note Banner */}
          {salesReturn.creditNote && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-green-700" />
                  <div>
                    <h3 className="font-semibold text-green-900">
                      Credit Note Generated: {salesReturn.creditNote.creditNoteNo}
                    </h3>
                    <p className="text-sm text-green-700">
                      Customer balance credited with {formatCurrency(salesReturn.creditNote.amount)}
                    </p>
                  </div>
                </div>
                <Link href={`/erp/sales/credit-notes/${salesReturn.creditNote.id}`}>
                  <Button size="sm" variant="outline" className="bg-white text-green-800 border-green-300">
                    View Credit Note
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Return Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Source Document:</span>
                  <span className="font-semibold">{sourceDocNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span>{salesReturn.customer?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Warehouse:</span>
                  <span>{salesReturn.warehouse?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Return Type:</span>
                  <Badge variant="outline">{salesReturn.returnType}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Return Date:</span>
                  <span>{formatDate(salesReturn.returnDate)}</span>
                </div>
                {salesReturn.reason && (
                  <div>
                    <span className="text-gray-600 block mb-1">Reason:</span>
                    <p className="bg-gray-50 p-2 rounded text-sm">{salesReturn.reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Return Amount:</span>
                  <span>{formatCurrency(salesReturn.totalAmount)}</span>
                </div>
                {salesReturn.approvedBy && (
                  <div className="pt-4 border-t space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Approved By:</span>
                      <span>{salesReturn.approvedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Approved At:</span>
                      <span>{formatDate(salesReturn.approvedAt!)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Returned Items ({salesReturn.items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                      <th className="text-left p-3">SKU</th>
                      <th className="text-left p-3">Description</th>
                      <th className="text-left p-3">Size</th>
                      <th className="text-left p-3">Color</th>
                      <th className="text-right p-3">Return Qty</th>
                      <th className="text-right p-3">Unit Price</th>
                      <th className="text-right p-3 font-bold">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReturn.items.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{item.item?.sku || '—'}</td>
                        <td className="p-3">
                          <div className="font-medium">{item.description || item.item?.description || '—'}</div>
                          {item.reason && <div className="text-xs text-gray-400">Reason: {item.reason}</div>}
                        </td>
                        <td className="p-3">{item.item?.size?.name || '—'}</td>
                        <td className="p-3">{item.item?.color?.name || '—'}</td>
                        <td className="p-3 text-right font-semibold">{Number(item.returnQty)}</td>
                        <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-3 text-right font-bold text-blue-700">{formatCurrency(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Print Layout */}
        <div id="print-section" className="hidden print:block min-h-screen bg-white p-0">
          <div className="w-full max-w-[1000px] mx-auto bg-white text-black p-8 font-sans print:p-8 box-border">
            <div className="flex justify-between mb-6 gap-4 items-start">
              <div className="w-[20%] flex flex-col items-start justify-center">
                <img src="/image.png" alt="Logo" className="w-32 object-contain" />
              </div>
              <div className="w-[35%] text-center py-2 text-xl font-bold bg-[#eef2f6]">
                Sales Return Voucher
              </div>
              <div className="w-[45%] bg-[#f8fafc] text-xs p-2 border border-gray-300">
                <div className="flex justify-between mb-1 font-bold">
                  <span>Return #:</span>
                  <span>{salesReturn.returnNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{formatDate(salesReturn.returnDate)}</span>
                </div>
                <div className="flex justify-between mt-1 pt-1 border-t">
                  <span>Source Doc:</span>
                  <span>{sourceDocNo}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mb-4 text-xs">
              <div className="w-1/2 p-2 border border-gray-300">
                <div className="font-bold border-b mb-1 pb-1">Customer</div>
                <div>{salesReturn.customer?.name}</div>
              </div>
              <div className="w-1/2 p-2 border border-gray-300">
                <div className="font-bold border-b mb-1 pb-1">Warehouse</div>
                <div>{salesReturn.warehouse?.name}</div>
              </div>
            </div>

            <table className="w-full text-[11px] mb-4 border-collapse">
              <thead>
                <tr className="border-y-2 border-black">
                  <th className="py-1 text-left w-[5%]">#</th>
                  <th className="py-1 text-left w-[15%]">SKU</th>
                  <th className="py-1 text-left w-[40%]">Description</th>
                  <th className="py-1 text-right w-[10%]">Qty</th>
                  <th className="py-1 text-right w-[15%]">Unit Price</th>
                  <th className="py-1 text-right w-[15%]">Total</th>
                </tr>
              </thead>
              <tbody>
                {salesReturn.items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-1">{i + 1}</td>
                    <td className="py-1 font-mono font-bold">{item.item?.sku || '—'}</td>
                    <td className="py-1">{item.description || item.item?.description || '—'}</td>
                    <td className="py-1 text-right">{Number(item.returnQty)}</td>
                    <td className="py-1 text-right">{fmtInt(Number(item.unitPrice))}</td>
                    <td className="py-1 text-right font-semibold">{fmtInt(Number(item.lineTotal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between border-t border-black pt-2 text-xs font-bold">
              <span>Total Amount:</span>
              <span className="text-right" style={{ borderBottom: '3px double black' }}>{fmtInt(Number(salesReturn.totalAmount))}</span>
            </div>
          </div>
        </div>
      </>
    </PermissionGuard>
  );
}
