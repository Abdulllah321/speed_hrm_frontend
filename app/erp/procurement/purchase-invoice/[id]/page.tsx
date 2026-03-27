'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, DollarSign, FileText, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { purchaseInvoiceApi, PurchaseInvoice as ApiPurchaseInvoice } from '@/lib/api';
import { toast } from 'sonner';

interface PaymentVoucherInvoice {
  id: string;
  paidAmount: number;
  paymentVoucher: {
    id: string;
    pvNo: string;
    pvDate: string;
  };
}

interface PurchaseInvoice extends ApiPurchaseInvoice {
  paymentVouchers?: PaymentVoucherInvoice[];
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
}

export default function PurchaseInvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const data = await purchaseInvoiceApi.getById(id);
      setInvoice(data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      await purchaseInvoiceApi.approve(id);
      toast.success('Invoice approved successfully');
      fetchInvoice();
    } catch (error: any) {
      console.error('Error approving invoice:', error);
      toast.error(error.message || 'Failed to approve invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this invoice?')) return;
    try {
      setActionLoading(true);
      await purchaseInvoiceApi.cancel(id);
      toast.success('Invoice cancelled successfully');
      fetchInvoice();
    } catch (error: any) {
      console.error('Error cancelling invoice:', error);
      toast.error(error.message || 'Failed to cancel invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusColors = {
      UNPAID: 'bg-red-100 text-red-800',
      PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
      FULLY_PAID: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
    };
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Invoice not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/erp/procurement/purchase-invoice">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Invoice {invoice.invoiceNumber}</h1>
            <p className="text-gray-600">Purchase Invoice Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/erp/procurement/purchase-invoice/${invoice.id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          {invoice.status === 'DRAFT' && (
            <>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
                disabled={actionLoading}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </>
          )}
          {invoice.status === 'APPROVED' && (
            <Button
              onClick={() => router.push(`/erp/finance/payment-voucher/create?invoiceId=${invoice.id}`)}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Create Payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Invoice Number</label>
                  <p className="font-medium">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Invoice Date</label>
                  <p>{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                </div>
                {invoice.dueDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Due Date</label>
                    <p>{new Date(invoice.dueDate).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusBadge(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Status</label>
                  <div className="mt-1">
                    <Badge className={getPaymentStatusBadge(invoice.paymentStatus)}>
                      {invoice.paymentStatus.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Information */}
          <Card>
            <CardHeader>
              <CardTitle>Supplier Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Supplier Name</label>
                  <p className="font-medium">{invoice.supplier?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Supplier Code</label>
                  <p>{invoice.supplier?.code || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reference Documents */}
          {(invoice.grn || invoice.landedCost) && (
            <Card>
              <CardHeader>
                <CardTitle>Reference Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invoice.grn && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">GRN Reference</label>
                      <p className="font-medium">{invoice.grn.grnNumber}</p>
                    </div>
                  )}
                  {invoice.landedCost && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Landed Cost Reference</label>
                      <p className="font-medium">{invoice.landedCost.landedCostNumber}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Description</th>
                      <th className="text-right p-3">Qty</th>
                      <th className="text-right p-3">Unit Price</th>
                      <th className="text-right p-3">Tax %</th>
                      <th className="text-right p-3">Discount %</th>
                      <th className="text-right p-3">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-3">{item.description}</td>
                        <td className="p-3 text-right">{item.quantity}</td>
                        <td className="p-3 text-right">{item.unitPrice.toLocaleString()}</td>
                        <td className="p-3 text-right">{item.taxRate}%</td>
                        <td className="p-3 text-right">{item.discountRate}%</td>
                        <td className="p-3 text-right font-medium">{item.lineTotal.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{invoice.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax Amount:</span>
                  <span>{invoice.taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span>-{invoice.discountAmount.toLocaleString()}</span>
                </div>
                <hr />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount:</span>
                  <span>{invoice.totalAmount.toLocaleString()}</span>
                </div>
                <hr />
                <div className="flex justify-between text-green-600">
                  <span>Paid Amount:</span>
                  <span>{invoice.paidAmount.toLocaleString()}</span>
                </div>
                 <div className="flex justify-between text-amber-600">
                   <span>Returns / Adjustments:</span>
                   <span>-{invoice.returnAmount.toLocaleString()}</span>
                 </div>
                 <hr />
                 <div className="flex justify-between text-red-600 font-bold">
                   <span>Net Outstanding:</span>
                   <span>{invoice.remainingAmount.toLocaleString()}</span>
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          {invoice.paymentVouchers && invoice.paymentVouchers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoice.paymentVouchers.map((payment) => (
                    <div key={payment.id} className="border-b pb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{payment.paymentVoucher.pvNo}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.paymentVoucher.pvDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="font-medium text-green-600">
                          {payment.paidAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}