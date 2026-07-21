"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, CreditCard, X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { salesInvoiceApi } from "@/lib/api";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

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

function formatNumber(n: number) {
  if (n === undefined || n === null || isNaN(n)) return '0';
  return n.toLocaleString('en-US');
}

function formatDateDisplay(d: string | Date | undefined) {
  if (!d) return 'N/A';
  const date = new Date(d);
  if (isNaN(date.getTime())) return 'N/A';
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function getFinancialYear(d: string | Date | undefined) {
  const date = d ? new Date(d) : new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  let startYear = month >= 6 ? year : year - 1;
  let endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

interface InvoiceLineItem {
  color: string;
  size: string;
  qty: number;
  sellingPrice: number;
  valueExclTax: number;
  discount: number;
  salesTax: number;
  addTax: number;
  taxPayable: number;
  valueInclTax: number;
}

interface InvoiceProductGroup {
  sku: string;
  description: string;
  sellingPrice: number;
  totalQty: number;
  totalValueExclTax: number;
  totalDiscount: number;
  totalSalesTax: number;
  totalAddTax: number;
  totalTaxPayable: number;
  totalValueInclTax: number;
  items: InvoiceLineItem[];
}

interface InvoiceSubCategoryGroup {
  name: string;
  totalQty: number;
  sellingPrice: number;
  totalValueExclTax: number;
  totalDiscount: number;
  totalSalesTax: number;
  totalAddTax: number;
  totalTaxPayable: number;
  totalValueInclTax: number;
  products: InvoiceProductGroup[];
}

interface InvoiceCategoryGroup {
  name: string;
  totalQty: number;
  sellingPrice: number;
  totalValueExclTax: number;
  totalDiscount: number;
  totalSalesTax: number;
  totalAddTax: number;
  totalTaxPayable: number;
  totalValueInclTax: number;
  subCategories: InvoiceSubCategoryGroup[];
}

function groupInvoiceItems(items: any[], defaultTaxRate: number = 18): InvoiceCategoryGroup[] {
  if (!items || items.length === 0) return [];

  const categoryMap = new Map<string, InvoiceCategoryGroup>();

  items.forEach((item: any) => {
    const itemObj = item.item || {};
    const catName = (itemObj.category?.name || item.categoryName || 'GENERAL').toUpperCase();
    const subCatName = (itemObj.brand?.name || itemObj.subCategory?.name || item.brandName || 'YOUNG ATHLETES').toUpperCase();
    const sku = itemObj.sku || item.sku || 'N/A';
    const description = itemObj.description || item.description || 'N/A';
    const color = itemObj.color?.name || item.color || '';
    const size = itemObj.size?.name || itemObj.size?.code || item.size || 'N/A';

    const qty = Number(item.quantity || 0);
    const sellingPrice = Number(item.salePrice || item.unitPrice || 0);
    const discount = Number(item.discount || 0);
    const valueExclTax = item.valueExclTax !== undefined ? Number(item.valueExclTax) : qty * sellingPrice;
    const taxableAmt = Math.max(0, valueExclTax - discount);
    const itemTaxRate = Number(item.taxRate || defaultTaxRate || 18);
    const salesTax = item.salesTax !== undefined ? Number(item.salesTax) : Math.round(taxableAmt * (itemTaxRate / 100));
    const addTax = Number(item.addTax || 0);
    const taxPayable = salesTax + addTax;
    const valueInclTax = item.valueInclTax !== undefined ? Number(item.valueInclTax) : (taxableAmt + taxPayable);

    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, {
        name: catName,
        totalQty: 0,
        sellingPrice: 0,
        totalValueExclTax: 0,
        totalDiscount: 0,
        totalSalesTax: 0,
        totalAddTax: 0,
        totalTaxPayable: 0,
        totalValueInclTax: 0,
        subCategories: [],
      });
    }

    const catGroup = categoryMap.get(catName)!;
    catGroup.totalQty += qty;
    catGroup.totalValueExclTax += valueExclTax;
    catGroup.totalDiscount += discount;
    catGroup.totalSalesTax += salesTax;
    catGroup.totalAddTax += addTax;
    catGroup.totalTaxPayable += taxPayable;
    catGroup.totalValueInclTax += valueInclTax;

    let subGroup = catGroup.subCategories.find((s) => s.name === subCatName);
    if (!subGroup) {
      subGroup = {
        name: subCatName,
        totalQty: 0,
        sellingPrice: 0,
        totalValueExclTax: 0,
        totalDiscount: 0,
        totalSalesTax: 0,
        totalAddTax: 0,
        totalTaxPayable: 0,
        totalValueInclTax: 0,
        products: [],
      };
      catGroup.subCategories.push(subGroup);
    }

    subGroup.totalQty += qty;
    subGroup.totalValueExclTax += valueExclTax;
    subGroup.totalDiscount += discount;
    subGroup.totalSalesTax += salesTax;
    subGroup.totalAddTax += addTax;
    subGroup.totalTaxPayable += taxPayable;
    subGroup.totalValueInclTax += valueInclTax;

    let prodGroup = subGroup.products.find((p) => p.sku === sku && p.description === description && p.sellingPrice === sellingPrice);
    if (!prodGroup) {
      prodGroup = {
        sku,
        description,
        sellingPrice,
        totalQty: 0,
        totalValueExclTax: 0,
        totalDiscount: 0,
        totalSalesTax: 0,
        totalAddTax: 0,
        totalTaxPayable: 0,
        totalValueInclTax: 0,
        items: [],
      };
      subGroup.products.push(prodGroup);
    }

    prodGroup.totalQty += qty;
    prodGroup.totalValueExclTax += valueExclTax;
    prodGroup.totalDiscount += discount;
    prodGroup.totalSalesTax += salesTax;
    prodGroup.totalAddTax += addTax;
    prodGroup.totalTaxPayable += taxPayable;
    prodGroup.totalValueInclTax += valueInclTax;

    prodGroup.items.push({
      color,
      size,
      qty,
      sellingPrice,
      valueExclTax,
      discount,
      salesTax,
      addTax,
      taxPayable,
      valueInclTax,
    });
  });

  return Array.from(categoryMap.values());
}

export default function SalesInvoiceViewPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadInvoice(params.id as string);
    }
  }, [params.id]);

  const loadInvoice = async (id: string) => {
    try {
      setLoading(true);
      const response = await salesInvoiceApi.getById(id);
      const invoiceData = response.data || response;
      setInvoice(invoiceData);
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error("Failed to load sales invoice");
      router.push("/erp/sales/invoices");
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!invoice) return;
    
    try {
      await salesInvoiceApi.post(invoice.id);
      toast.success("Sales invoice posted successfully");
      loadInvoice(invoice.id);
    } catch (error) {
      toast.error("Failed to post invoice");
      console.error(error);
    }
  };

  const handleCancel = async () => {
    if (!invoice) return;
    
    if (!confirm('Are you sure you want to cancel this sales invoice?')) {
      return;
    }
    
    try {
      await salesInvoiceApi.cancel(invoice.id);
      toast.success("Sales invoice cancelled successfully");
      loadInvoice(invoice.id);
    } catch (error) {
      toast.error("Failed to cancel invoice");
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "POSTED":
        return "bg-blue-100 text-blue-800";
      case "PARTIAL":
        return "bg-orange-100 text-orange-800";
      case "PAID":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading sales invoice...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Sales invoice not found</p>
        </div>
      </div>
    );
  }

  const groupedData = groupInvoiceItems(invoice.items || [], invoice.taxRate || 18);

  let grandQty = 0;
  let grandExclTax = 0;
  let grandDiscount = 0;
  let grandSalesTax = 0;
  let grandAddTax = 0;
  let grandTaxPayable = 0;
  let grandValueInclTax = 0;

  groupedData.forEach((cat) => {
    grandQty += cat.totalQty;
    grandExclTax += cat.totalValueExclTax;
    grandDiscount += cat.totalDiscount;
    grandSalesTax += cat.totalSalesTax;
    grandAddTax += cat.totalAddTax;
    grandTaxPayable += cat.totalTaxPayable;
    grandValueInclTax += cat.totalValueInclTax;
  });

  const advanceIncomeTax = Math.round(grandValueInclTax * 0.005);
  const netTotal = grandValueInclTax + advanceIncomeTax;

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }
          @page {
            size: auto;
            margin: 8mm;
          }
        }
      `}</style>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/erp/sales/invoices")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Sales Invoice {invoice.invoiceNo || 'N/A'}
              </h1>
              <p className="text-muted-foreground">
                Created on {invoice.createdAt 
                  ? new Date(invoice.createdAt).toLocaleDateString()
                  : 'N/A'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(invoice.status || 'PENDING')}>
              {invoice.status || 'PENDING'}
            </Badge>
            
            {invoice.status === "PENDING" && (
              <>
                <Button size="sm" onClick={handlePost}>
                  <FileText className="h-4 w-4 mr-2" />
                  Post Invoice
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancel}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            
            {(invoice.status === "POSTED" || invoice.status === "PARTIAL") && (
              <Button 
                size="sm"
                onClick={() => router.push(`/erp/finance/receipt-voucher/create?customerId=${invoice.customerId}&invoiceId=${invoice.id}`)}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Collect Payment
              </Button>
            )}

            <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-2">
              <Printer className="h-4 w-4" /> Print Tax Invoice
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Invoice Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">Name:</span> {invoice.customer?.name || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Code:</span> {invoice.customer?.code || 'N/A'}
                </div>
                {invoice.customer?.email && (
                  <div>
                    <span className="font-medium">Email:</span> {invoice.customer.email}
                  </div>
                )}
                {invoice.customer?.phone && (
                  <div>
                    <span className="font-medium">Phone:</span> {invoice.customer.phone}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">Invoice No:</span> {invoice.invoiceNo || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Sales Order:</span> {invoice.salesOrder?.orderNo || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Delivery Challan:</span> {invoice.deliveryChallan?.challanNo || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Status:</span> 
                  <Badge className={`ml-2 ${getStatusColor(invoice.status || 'PENDING')}`}>
                    {invoice.status || 'PENDING'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Items ({invoice.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Sale Price</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!invoice.items || invoice.items.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No items found
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoice.items.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.item?.description || 'N/A'}</div>
                            </div>
                          </TableCell>
                          <TableCell>{item.item?.sku || 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.salePrice || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.total || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(invoice.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({invoice.taxRate || 0}%):</span>
                  <span>{formatCurrency(invoice.taxAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>{formatCurrency(invoice.discount || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(invoice.grandTotal || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print View */}
      <div id="print-section" className="hidden print:block min-h-screen bg-white p-0">
        <div className="w-full max-w-[1100px] mx-auto bg-white text-black p-6 font-sans print:p-4 print:max-w-none box-border text-[11px]">
          
          {/* Top Company Banner */}
          <div className="flex justify-between items-start mb-1">
            {/* Top Left Logo & Info */}
            <div className="w-[28%] text-xs space-y-0.5">
              <img src="/image.png" alt="Speed Logo" className="h-10 object-contain mb-1" />
              <div><span className="font-bold">GST No. :</span> 12-01-9999-663-46</div>
              <div><span className="font-bold">NTN :</span> 1208373-9</div>
            </div>

            {/* Center Title */}
            <div className="w-[44%] text-center">
              <h1 className="text-xl font-bold tracking-tight">Speed (Private) Limited</h1>
              <h2 className="text-base font-bold">Sales Tax Invoice</h2>
              <p className="text-[10px] text-gray-700 leading-tight mt-0.5">
                Office No. 01 | 1st Floor | Services Club Extension Building | Merewether<br />
                Road | Karachi - 75520 | Pakistan. Tel +922135652161 | Fax +922135652166
              </p>
            </div>

            {/* Top Right FY */}
            <div className="w-[28%] text-right text-xs font-bold">
              <span>Financial Year :</span> {getFinancialYear(invoice.createdAt || invoice.invoiceDate)}
            </div>
          </div>

          <div className="border-b-2 border-black mb-2"></div>

          {/* Sub-Header Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs font-sans mb-3">
            {/* Left Side */}
            <div className="space-y-0.5">
              <div><span className="font-bold inline-block w-28">Invoice No :</span> {invoice.invoiceNo}</div>
              <div><span className="font-bold inline-block w-28">Invoice Date :</span> {formatDateDisplay(invoice.createdAt || invoice.invoiceDate)}</div>
              <div><span className="font-bold inline-block w-28">Customer Name :</span> {invoice.customer?.name || 'N/A'}</div>
              <div><span className="font-bold inline-block w-28">Address :</span> {invoice.customer?.address || 'N/A'}</div>
            </div>

            {/* Right Side */}
            <div className="space-y-0.5 text-right md:text-left">
              <div><span className="font-bold inline-block w-28">Order. No :</span> {invoice.salesOrder?.orderNo || '30'}</div>
              <div><span className="font-bold inline-block w-28">Order Date :</span> {formatDateDisplay(invoice.salesOrder?.orderDate || invoice.createdAt)}</div>
              <div><span className="font-bold inline-block w-28">GST No. :</span> {invoice.customer?.strn || invoice.customer?.gstNo || '1623094-9'}</div>
              <div><span className="font-bold inline-block w-28">NTN No. :</span> {invoice.customer?.ntn || '1623094-9'}</div>
            </div>
          </div>

          <div className="border-b-2 border-black mb-2"></div>

          {/* Grouped Sales Tax Invoice Items Table */}
          <table className="w-full text-[10px] font-sans border-collapse">
            <thead>
              <tr className="border-y-2 border-black font-bold">
                <th className="py-2 text-left w-[18%]">GPC / Category / Product</th>
                <th className="py-2 text-center w-[12%]">Color</th>
                <th className="py-2 text-center w-[5%]">Size</th>
                <th className="py-2 text-right w-[6%]">Quantity</th>
                <th className="py-2 text-right w-[8%]">Selling Price (Rs.)</th>
                <th className="py-2 text-right w-[10%]">Value Excluding Sales Tax (Rs.)</th>
                <th className="py-2 text-right w-[8%]">Discount (Rs.)</th>
                <th className="py-2 text-right w-[8%]">Sales Tax (Rs.)</th>
                <th className="py-2 text-right w-[7%]">Additional Sales Tax (Rs.)</th>
                <th className="py-2 text-right w-[8%]">Sales Tax Payable (Rs.)</th>
                <th className="py-2 text-right w-[10%]">Value Including Sales Tax</th>
              </tr>
            </thead>
            <tbody>
              {groupedData.map((cat, catIdx) => (
                <React.Fragment key={catIdx}>
                  {cat.subCategories.map((sub, subIdx) => (
                    <React.Fragment key={subIdx}>
                      {/* SubCategory Header Row e.g. YOUNG ATHLETES */}
                      <tr className="font-bold border-t border-black">
                        <td className="py-1 uppercase" colSpan={3}>{sub.name}</td>
                        <td className="py-1 text-right">{formatNumber(sub.totalQty)}</td>
                        <td className="py-1 text-right">{sub.sellingPrice ? formatNumber(sub.sellingPrice) : ''}</td>
                        <td className="py-1 text-right">{formatNumber(sub.totalValueExclTax)}</td>
                        <td className="py-1 text-right">{formatNumber(sub.totalDiscount)}</td>
                        <td className="py-1 text-right">{formatNumber(sub.totalSalesTax)}</td>
                        <td className="py-1 text-right">{formatNumber(sub.totalAddTax)}</td>
                        <td className="py-1 text-right">{formatNumber(sub.totalTaxPayable)}</td>
                        <td className="py-1 text-right">{formatNumber(sub.totalValueInclTax)}</td>
                      </tr>
                      <tr className="border-b border-dotted border-black">
                        <td colSpan={11}></td>
                      </tr>

                      {sub.products.map((prod, prodIdx) => (
                        <React.Fragment key={prodIdx}>
                          {/* SKU Code Row */}
                          <tr>
                            <td className="py-0.5 pl-3 text-gray-800 text-[10px]" colSpan={11}>
                              {prod.sku}
                            </td>
                          </tr>
                          {/* Description & Summary Row */}
                          <tr className="font-semibold">
                            <td className="py-0.5 pl-3" colSpan={3}>{prod.description}</td>
                            <td className="py-0.5 text-right">{formatNumber(prod.totalQty)}</td>
                            <td className="py-0.5 text-right">{formatNumber(prod.sellingPrice)}</td>
                            <td className="py-0.5 text-right">{formatNumber(prod.totalValueExclTax)}</td>
                            <td className="py-0.5 text-right">{formatNumber(prod.totalDiscount)}</td>
                            <td className="py-0.5 text-right">{formatNumber(prod.totalSalesTax)}</td>
                            <td className="py-0.5 text-right">{formatNumber(prod.totalAddTax)}</td>
                            <td className="py-0.5 text-right">{formatNumber(prod.totalTaxPayable)}</td>
                            <td className="py-0.5 text-right">{formatNumber(prod.totalValueInclTax)}</td>
                          </tr>
                          <tr className="border-b border-dotted border-black">
                            <td colSpan={11}></td>
                          </tr>

                          {/* Color & Size breakdown rows */}
                          {prod.items.map((it, itIdx) => (
                            <tr key={itIdx}>
                              <td className="py-0.5"></td>
                              <td className="py-0.5 text-center text-gray-700 text-[9.5px]">{it.color}</td>
                              <td className="py-0.5 text-center font-medium">{it.size}</td>
                              <td className="py-0.5 text-right">{formatNumber(it.qty)}</td>
                              <td className="py-0.5 text-right">{formatNumber(it.sellingPrice)}</td>
                              <td className="py-0.5 text-right">{formatNumber(it.valueExclTax)}</td>
                              <td className="py-0.5 text-right">{formatNumber(it.discount)}</td>
                              <td className="py-0.5 text-right">{formatNumber(it.salesTax)}</td>
                              <td className="py-0.5 text-right">{formatNumber(it.addTax)}</td>
                              <td className="py-0.5 text-right">{formatNumber(it.taxPayable)}</td>
                              <td className="py-0.5 text-right">{formatNumber(it.valueInclTax)}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-b-2 border-black font-bold text-xs">
                <td className="py-2" colSpan={3}></td>
                <td className="py-2 text-right border-b-2 border-black" style={{ borderBottomStyle: 'double' }}>{formatNumber(grandQty)}</td>
                <td className="py-2 text-right"></td>
                <td className="py-2 text-right border-b-2 border-black" style={{ borderBottomStyle: 'double' }}>{formatNumber(grandExclTax)}</td>
                <td className="py-2 text-right border-b-2 border-black" style={{ borderBottomStyle: 'double' }}>{formatNumber(grandDiscount)}</td>
                <td className="py-2 text-right border-b-2 border-black" style={{ borderBottomStyle: 'double' }}>{formatNumber(grandSalesTax)}</td>
                <td className="py-2 text-right border-b-2 border-black" style={{ borderBottomStyle: 'double' }}>{formatNumber(grandAddTax)}</td>
                <td className="py-2 text-right border-b-2 border-black" style={{ borderBottomStyle: 'double' }}>{formatNumber(grandTaxPayable)}</td>
                <td className="py-2 text-right border-b-2 border-black" style={{ borderBottomStyle: 'double' }}>{formatNumber(grandValueInclTax)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Bottom Withholding & Net Total Section */}
          <div className="flex justify-between items-start mt-4">
            {/* Left: FBR Digital Badge */}
            <div className="pt-2">
              <div className="border-2 border-[#003366] bg-[#003366] text-white rounded p-2 text-center w-52 shadow-sm">
                <div className="text-yellow-400 font-extrabold text-base tracking-wider leading-tight">FBR</div>
                <div className="text-white font-black text-xl tracking-widest leading-none my-0.5">DIGITAL</div>
                <div className="text-white text-[9px] tracking-tight font-sans">INVOICING SYSTEM</div>
              </div>
            </div>

            {/* Right: Tax Breakdown & Net Total */}
            <div className="w-80 text-xs font-sans space-y-1">
              <div className="flex justify-between font-semibold border-b pb-1">
                <span>Advance Income Tax U/S 236H 0.50%</span>
                <span>{formatNumber(advanceIncomeTax)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-b-2 border-black" style={{ borderBottomStyle: 'double' }}>
                <span>Net Total</span>
                <span>{formatNumber(netTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}