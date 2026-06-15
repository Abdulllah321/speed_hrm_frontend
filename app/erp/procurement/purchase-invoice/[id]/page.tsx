'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, DollarSign, FileText, CheckCircle, XCircle, Printer, Building2, Download } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { getPurchaseInvoice, approvePurchaseInvoice, cancelPurchaseInvoice } from '@/lib/actions/purchase-invoice';
import { PurchaseInvoice as ApiPurchaseInvoice } from '@/lib/api';
import { toast } from 'sonner';
import { PermissionGuard } from "@/components/auth/permission-guard";
import * as XLSX from 'xlsx';

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
            if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
            if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "");
            return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + convert(n % 10000000) : "");
        };
        
        return convert(n) + " Only";
    };

    return `Rs. ${inWords(amount)}.`;
}

function fmt(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface PaymentVoucherInvoice {
  id: string;
  paidAmount: number;
  paymentVoucher: {
    id: string;
    pvNo: string;
    pvDate: string;
  };
}

interface PurchaseInvoice extends Omit<ApiPurchaseInvoice, 'subtotal' | 'advanceTaxRate' | 'advanceTaxAmount' | 'totalAmount' | 'paidAmount' | 'remainingAmount'> {
  paymentVouchers?: PaymentVoucherInvoice[];
  subtotal?: number;
  advanceTaxRate?: number;
  advanceTaxAmount?: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

interface InvoiceItem {
  id: string;
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  item?: {
    itemId: string;
    description: string;
  };
}

export default function PurchaseInvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const handleExportXLSX = () => {
    if (!invoice) return;
    try {
      const invoiceData = [
        ["Purchase Invoice Detail"],
        [],
        ["Invoice Number:", invoice.invoiceNumber],
        ["Invoice Date:", new Date(invoice.invoiceDate).toLocaleDateString()],
        ["Supplier:", `${invoice.supplier?.name} (${invoice.supplier?.code})`],
        ["Status:", invoice.status],
        ["Payment Status:", invoice.paymentStatus],
        [],
        ["Invoice Summary"],
        ["Subtotal:", Number(invoice.subtotal || 0)],
        ["Tax Amount (Sales Tax):", Number(invoice.taxAmount || 0)],
        [`Advance Tax (${Number(invoice.advanceTaxRate || 0.5)}%):`, Number(invoice.advanceTaxAmount || 0)],
        ["Discount Amount:", Number(invoice.discountAmount || 0)],
        ["Total Amount:", Number(invoice.totalAmount || 0)],
        ["Paid Amount:", Number(invoice.paidAmount || 0)],
        ["Remaining Amount:", Number(invoice.remainingAmount || 0)],
        [],
        ["Item Details"],
        ["SKU", "Description", "Quantity", "Unit Price", "Tax Rate (%)", "Tax Amount", "Discount Rate (%)", "Discount Amount", "Line Total"]
      ];

      const itemRows = (invoice.items || []).map((item: any) => [
        item.item?.sku || item.sku || "-",
        item.item?.description || item.description || "-",
        Number(item.quantity || 0),
        Number(item.unitPrice || 0),
        Number(item.taxRate || 0),
        Number(item.taxAmount || 0),
        Number(item.discountRate || 0),
        Number(item.discountAmount || 0),
        Number(item.lineTotal || 0)
      ]);

      const finalData = [...invoiceData, ...itemRows];
      const worksheet = XLSX.utils.aoa_to_sheet(finalData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice Detail");

      const maxLens = finalData[18]?.map((_, colIdx) => {
        return Math.max(
          ...finalData.map((row) => String(row[colIdx] ?? "").length)
        );
      }) || [];
      worksheet["!cols"] = maxLens.map((w) => ({ wch: Math.max(w + 2, 10) }));

      XLSX.writeFile(workbook, `purchase-invoice-${invoice.invoiceNumber}.xlsx`);
      toast.success("Excel exported successfully");
    } catch (error) {
      console.error("Export Excel error:", error);
      toast.error("Failed to export Excel");
    }
  };

  const handleExportCSV = () => {
    if (!invoice) return;
    try {
      const lines = [
        ["Purchase Invoice Detail"],
        ["Invoice Number", invoice.invoiceNumber],
        ["Invoice Date", new Date(invoice.invoiceDate).toLocaleDateString()],
        ["Supplier", `${invoice.supplier?.name} (${invoice.supplier?.code})`],
        ["Status", invoice.status],
        ["Payment Status", invoice.paymentStatus],
        [],
        ["Invoice Summary"],
        ["Subtotal", Number(invoice.subtotal || 0)],
        ["Tax Amount", Number(invoice.taxAmount || 0)],
        [`Advance Tax (${Number(invoice.advanceTaxRate || 0.5)}%)`, Number(invoice.advanceTaxAmount || 0)],
        ["Discount Amount", Number(invoice.discountAmount || 0)],
        ["Total Amount", Number(invoice.totalAmount || 0)],
        ["Paid Amount", Number(invoice.paidAmount || 0)],
        ["Remaining Amount", Number(invoice.remainingAmount || 0)],
        [],
        ["Item Details"],
        ["SKU", "Description", "Quantity", "Unit Price", "Tax Rate (%)", "Tax Amount", "Discount Rate (%)", "Discount Amount", "Line Total"]
      ];

      (invoice.items || []).forEach((item: any) => {
        lines.push([
          item.item?.sku || item.sku || "-",
          item.item?.description || item.description || "-",
          Number(item.quantity || 0),
          Number(item.unitPrice || 0),
          Number(item.taxRate || 0),
          Number(item.taxAmount || 0),
          Number(item.discountRate || 0),
          Number(item.discountAmount || 0),
          Number(item.lineTotal || 0)
        ]);
      });

      const csvContent = lines.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `purchase-invoice-${invoice.invoiceNumber}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV exported successfully");
    } catch (error) {
      console.error("Export CSV error:", error);
      toast.error("Failed to export CSV");
    }
  };

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      // Add cache busting to force fresh data
      const data = await getPurchaseInvoice(id);
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
      const result = await approvePurchaseInvoice(id);
      
      console.log('Approve result:', result);
      
      // Check if approval was successful
      if (result && result.status === 'APPROVED') {
        // Immediately update the local state with approved status
        if (invoice) {
          const updatedInvoice = {
            ...invoice,
            status: 'APPROVED' as const
          };
          setInvoice(updatedInvoice);
        }
        
        toast.success('Invoice approved successfully');
        
        // Also fetch fresh data in background
        setTimeout(async () => {
          const freshData = await getPurchaseInvoice(id);
          setInvoice(freshData);
        }, 500);
      } else {
        // If result doesn't have APPROVED status, something went wrong
        toast.error('Failed to approve invoice. Please check configuration.');
      }
    } catch (error: any) {
      console.error('Error approving invoice:', error);
      // Show the actual error message from backend
      const errorMessage = error.message || error.error?.message || 'Failed to approve invoice';
      
      // If it's a finance account configuration error, show helpful message
      if (errorMessage.includes('Finance account not configured')) {
        toast.error(
          'Finance account not configured. Please set up PURCHASES_LOCAL account in Finance → Account Configuration.',
          { duration: 6000 }
        );
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this invoice?')) return;
    try {
      setActionLoading(true);
      await cancelPurchaseInvoice(id);
      
      // Immediately update the local state with cancelled status
      if (invoice) {
        setInvoice({
          ...invoice,
          status: 'CANCELLED'
        });
      }
      
      toast.success('Invoice cancelled successfully');
      
      // Also fetch fresh data in background
      setTimeout(() => {
        fetchInvoice();
      }, 500);
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
    <PermissionGuard permissions="erp.procurement.pi.read">
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
        <div className="container mx-auto p-6 print:hidden" key={invoice.status}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold">Invoice {invoice.invoiceNumber}</h1>
                <p className="text-gray-600">Purchase Invoice Details</p>
              </div>
            </div>
            <div className="flex gap-2" key={`buttons-${invoice.status}`}>
              <PermissionGuard permissions="erp.procurement.pi.update" fallback={null}>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/erp/procurement/purchase-invoice/${invoice.id}/edit`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </PermissionGuard>
              {invoice.status === 'DRAFT' && (
                <>
                  <PermissionGuard permissions="erp.procurement.pi.update" fallback={null}>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={handleCancel}
                      disabled={actionLoading}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </PermissionGuard>
                  <PermissionGuard permissions="erp.procurement.pi.post" fallback={null}>
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleApprove}
                      disabled={actionLoading}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </PermissionGuard>
                </>
              )}
              {invoice.status === 'APPROVED' && (
                <PermissionGuard permissions="erp.finance.payment-voucher.create" fallback={null}>
                  <Button
                    onClick={() => router.push(`/erp/finance/payment-voucher/create?invoiceId=${invoice.id}`)}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Create Payment
                  </Button>
                </PermissionGuard>
              )}
              <Button onClick={handleExportXLSX} variant="outline" className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 gap-2">
                  <Download className="h-4 w-4" /> Export Excel
              </Button>
              <Button onClick={handleExportCSV} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" /> Export CSV
              </Button>
              <Button onClick={() => window.print()} variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" /> Print Invoice
              </Button>
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
                    <p className="font-medium">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Supplier</label>
                    <p className="font-medium">{invoice.supplier?.name} ({invoice.supplier?.code})</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div>
                      <Badge className={getStatusBadge(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Status</label>
                    <div>
                      <Badge className={getPaymentStatusBadge(invoice.paymentStatus)}>
                        {invoice.paymentStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Total Amount</label>
                    <p className="font-medium">{invoice.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">SKU</th>
                        <th className="text-left p-3">Item Details</th>
                        <th className="text-right p-3">Quantity</th>
                        <th className="text-right p-3">Unit Price</th>
                        <th className="text-right p-3">Tax Rate (%)</th>
                        <th className="text-right p-3">Tax Amount</th>
                        <th className="text-right p-3">Discount (%)</th>
                        <th className="text-right p-3">Discount Amount</th>
                        <th className="text-right p-3">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items?.map((item: any) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-3 font-mono text-sm">{item.item?.sku || item.sku || "-"}</td>
                          <td className="p-3">
                            <div className="font-medium">{item.item?.description || item.description}</div>
                            <div className="text-sm text-gray-500">{item.item?.itemId || item.itemId}</div>
                          </td>
                          <td className="p-3 text-right">{Number(item.quantity).toLocaleString()}</td>
                          <td className="p-3 text-right">{Number(item.unitPrice).toLocaleString()}</td>
                          <td className="p-3 text-right">{Number(item.taxRate || 0)}%</td>
                          <td className="p-3 text-right">{Number(item.taxAmount || 0).toLocaleString()}</td>
                          <td className="p-3 text-right">{Number(item.discountRate || 0)}%</td>
                          <td className="p-3 text-right">{Number(item.discountAmount || 0).toLocaleString()}</td>
                          <td className="p-3 text-right font-medium">{Number(item.lineTotal).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {invoice.paymentVouchers && invoice.paymentVouchers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">PV Number</th>
                          <th className="text-left p-3">Date</th>
                          <th className="text-right p-3">Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.paymentVouchers.map((pv) => (
                          <tr key={pv.id} className="border-b">
                            <td className="p-3 font-medium">
                              <Link
                                href={`/erp/finance/payment-voucher/${pv.paymentVoucher.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {pv.paymentVoucher.pvNo}
                              </Link>
                            </td>
                            <td className="p-3">
                              {new Date(pv.paymentVoucher.pvDate).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-right">
                              {pv.paidAmount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{Number(invoice.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sales Tax</span>
                  <span className="font-medium">{Number(invoice.taxAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Invoice Discount</span>
                  <span className="font-medium">-{Number(invoice.discountAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Advance Tax ({Number(invoice.advanceTaxRate || 0.5)}%)</span>
                  <span className="font-medium">{Number(invoice.advanceTaxAmount || 0).toLocaleString()}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Total Amount</span>
                  <span className="font-semibold">{Number(invoice.totalAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid Amount</span>
                  <span className="font-medium text-green-600">{Number(invoice.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div className="border-t pt-4 flex justify-between">
                  <span className="text-lg font-bold">Remaining</span>
                  <span className="text-lg font-bold text-red-600">{Number(invoice.remainingAmount || 0).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Print View */}
      <div id="print-section" className="hidden print:block min-h-screen bg-white p-0">
          <div className="w-full max-w-[1000px] mx-auto bg-white text-black p-8 font-sans print:p-8 print:max-w-none box-border">
              {/* Header */}
              <div className="flex justify-between mb-6 gap-4 items-start">
                  {/* Logo */}
                  <div className="w-[20%] flex flex-col items-start justify-center">
                     <img src="/image.png" alt="Logo" className="w-32 object-contain" />
                  </div>
                  
                  {/* Title */}
                  <div className="w-[35%] flex flex-col justify-center">
                    <div className="bg-[#eef2f6] text-black w-full text-center py-2 text-xl sm:text-xl font-bold  print:bg-[#eef2f6] [-webkit-print-color-adjust:exact] [color-adjust:exact]">
                      Purchase Invoice
                    </div>
                  </div>

                  {/* Details Box */}
                  <div className="w-[45%] bg-[#f8fafc] text-xs sm:text-[13px] p-2 border border-gray-300 print:bg-[#f8fafc] [-webkit-print-color-adjust:exact] [color-adjust:exact] flex flex-col justify-center">
                     <div className="flex justify-between mb-2">
                       <span className="font-bold">Invoice Number:</span>
                       <span className="font-bold">{invoice.invoiceNumber}</span>
                     </div>
                     <div className="flex justify-between">
                       <div className="flex gap-2">
                         <span className="font-bold">Date:</span>
                         <span>{new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}</span>
                       </div>
                     </div>
                  </div>
              </div>

              {/* Vendor / Ship To Box */}
              <div className="flex gap-4 mb-4 text-xs sm:text-[13px]">
                  <div className="w-1/2 p-2 border border-gray-300 flex flex-col justify-center">
                      <div className="font-bold border-b border-gray-300 mb-2 pb-1">Supplier Details</div>
                      <div className="flex gap-2 mb-1"><span className="font-bold w-16 shrink-0">Name:</span> <span>{invoice.supplier?.name}</span></div>
                      <div className="flex gap-2 mb-1"><span className="font-bold w-16 shrink-0">Code:</span> <span>{invoice.supplier?.code}</span></div>
                  </div>
                  <div className="w-1/2 p-2 border border-gray-300 flex flex-col justify-center">
                      <div className="font-bold border-b border-gray-300 mb-2 pb-1">Bill To</div>
                      <div className="flex gap-2 mb-1"><span className="font-bold w-16 shrink-0">Name:</span> <span>Speed Limit ERP</span></div>
                      <div className="flex gap-2"><span className="font-bold w-16 shrink-0">Address:</span> <span>Karachi, Pakistan</span></div>
                  </div>
              </div>

              {/* Table */}
              <table className="w-full text-xs sm:text-[13px] mb-4 border-collapse table-fixed">
                  <thead>
                    <tr className="border-y-2 border-black">
                      <th className="py-2 pr-2 text-left font-bold w-[40%]">Item Details</th>
                      <th className="py-2 pr-2 text-right font-bold w-[15%]">Qty</th>
                      <th className="py-2 pr-2 text-right font-bold w-[15%]">Unit Price</th>
                      <th className="py-2 pr-2 text-right font-bold w-[10%]">Tax %</th>
                      <th className="py-2 text-right font-bold w-[20%]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items && invoice.items.length > 0 ? (
                      invoice.items.map((item: any, i: number) => (
                        <tr key={item.id || i} className="border-b border-gray-300 align-top">
                          <td className="py-2 pr-2 overflow-hidden text-ellipsis">
                            <div className="font-bold font-mono">{item.item?.sku || item.sku || '-'}</div>
                            <div className="text-sm font-medium text-gray-500">{item.item?.itemId || item.itemId}</div>
                            <div className="text-gray-700">{item.item?.description || item.description || '-'}</div>
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {item.quantity}
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {fmt(Number(item.unitPrice))}
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {item.taxRate}%
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {fmt(Number(item.lineTotal))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                          <td colSpan={5} className="py-4 text-center text-muted-foreground border-b border-gray-300">
                              No items found for this invoice
                          </td>
                      </tr>
                    )}
                  </tbody>
              </table>

              {/* Totals Section */}
              <div className="flex border-b border-black pb-4 text-xs sm:text-[13px] justify-between">
                   <div className="w-[50%] pt-4 flex flex-col justify-end">
                       <div className="flex gap-2 font-bold mb-1">
                           <span className="whitespace-nowrap">In Words:</span>
                           <span className="underline decoration-1 underline-offset-2 break-words">{numberToWords(Number(invoice.totalAmount || 0))}</span>
                       </div>
                   </div>
                   <div className="w-[45%] flex flex-col space-y-1 text-right">
                       <div className="flex justify-between">
                           <span className="text-gray-600">Subtotal:</span>
                           <span className="tabular-nums font-medium">{fmt(Number(invoice.subtotal || 0))}</span>
                       </div>
                       <div className="flex justify-between">
                           <span className="text-gray-600">Sales Tax:</span>
                           <span className="tabular-nums font-medium">{fmt(Number(invoice.taxAmount || 0))}</span>
                       </div>
                       <div className="flex justify-between">
                           <span className="text-gray-600">Discount:</span>
                           <span className="tabular-nums font-medium">-{fmt(Number(invoice.discountAmount || 0))}</span>
                       </div>
                       <div className="flex justify-between">
                           <span className="text-gray-600">Advance Tax ({Number(invoice.advanceTaxRate || 0.5)}%):</span>
                           <span className="tabular-nums font-medium">{fmt(Number(invoice.advanceTaxAmount || 0))}</span>
                       </div>
                       <div className="flex justify-between border-t border-black pt-1 font-bold">
                           <span>Total Amount:</span>
                           <span className="tabular-nums font-bold" style={{ borderBottom: '3px double black' }}>{fmt(Number(invoice.totalAmount || 0))}</span>
                       </div>
                   </div>
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