'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, FileText, CheckCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { deliveryChallanApi, customerApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
  code?: string;
  traderId?: string;
  subCode?: string;
  baseMargin?: number;
  cashMargin?: number;
}

interface DeliveryChallanItem {
  id: string;
  itemId: string;
  item: {
    description: string;
    sku: string;
    taxRate1?: number;
  };
  deliveredQty: number;
  salePrice: number;
  total: number;
}

interface DeliveryChallan {
  id: string;
  challanNo: string;
  customer: Customer;
  totalAmount: number;
  items: DeliveryChallanItem[];
  salesOrder?: {
    orderNo?: string;
    baseMargin?: number;
    cashMargin?: number;
    discount?: number;
  };
}

function CreateSalesInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialChallanId = searchParams.get('challanId') || '';

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>([]);

  const [selectedChallanId, setSelectedChallanId] = useState(initialChallanId);
  const [selectedChallan, setSelectedChallan] = useState<DeliveryChallan | null>(null);

  // Calculation parameters at Invoice creation time
  const [baseMargin, setBaseMargin] = useState(0);
  const [cashMargin, setCashMargin] = useState(0);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [customersData, challansData] = await Promise.all([
        customerApi.getAll(),
        deliveryChallanApi.getAll()
      ]);

      setCustomers(customersData.data || []);
      
      // Filter only delivered challans that can be invoiced (not already invoiced)
      const deliveredChallans = (challansData.data || []).filter((challan: any) => 
        challan.status === 'DELIVERED' && (!challan.invoices || challan.invoices.length === 0)
      );
      
      setDeliveryChallans(deliveredChallans);

      // If initialChallanId is passed via URL query
      if (initialChallanId) {
        handleChallanSelection(initialChallanId);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const handleChallanSelection = async (challanId: string) => {
    try {
      setSelectedChallanId(challanId);
      const response = await deliveryChallanApi.getById(challanId);
      const challan = response.data;
      if (challan) {
        setSelectedChallan(challan);
        // Pre-fill margins from customer record
        const custBaseMargin = Number(challan.customer?.baseMargin ?? challan.salesOrder?.baseMargin ?? 0);
        const custCashMargin = Number(challan.customer?.cashMargin ?? challan.salesOrder?.cashMargin ?? 0);
        setBaseMargin(custBaseMargin);
        setCashMargin(custCashMargin);
        setOrderDiscount(Number(challan.salesOrder?.discount ?? 0));
      }
    } catch (error) {
      console.error('Error fetching challan details:', error);
      toast.error('Failed to load delivery challan details');
    }
  };

  // Full FBR calculations executed at invoice time
  const marginPct = Number(baseMargin || 0) + Number(cashMargin || 0);
  const items = selectedChallan?.items || [];

  const itemDetails = items.map(item => {
    const retailPrice = Number(item.salePrice || 0);
    const itemTaxRate = Number(item.item?.taxRate1 ?? 18);
    const qty = Number(item.deliveredQty || 0);

    // 1. Calculate WOST: Retail / (1 + TaxRate/100)
    const wostUnit = retailPrice / (1 + itemTaxRate / 100);
    const wostTotal = wostUnit * qty;

    // 2. Margin discount on WOST
    const marginDiscount = wostTotal * (marginPct / 100);
    const afterDiscount = wostTotal - marginDiscount;

    return {
      ...item,
      retailPrice,
      qty,
      itemTaxRate,
      wostUnit,
      wostTotal,
      marginDiscount,
      afterDiscount,
    };
  });

  const grossRetailTotal = itemDetails.reduce((sum, it) => sum + (it.retailPrice * it.qty), 0);
  const grossWostTotal = itemDetails.reduce((sum, it) => sum + it.wostTotal, 0);
  const baseMarginAmount = (grossWostTotal * Number(baseMargin || 0)) / 100;
  const cashMarginAmount = (grossWostTotal * Number(cashMargin || 0)) / 100;
  const subtotal = grossWostTotal - baseMarginAmount - cashMarginAmount;

  const orderDiscountAmount = Number(orderDiscount || 0);
  const orderDiscountPct = subtotal > 0 ? (orderDiscountAmount / subtotal) * 100 : 0;
  const taxableAmount = Math.max(0, subtotal - orderDiscountAmount);

  const calculatedItems = itemDetails.map(it => {
    const discountedBase = it.afterDiscount * (1 - orderDiscountPct / 100);
    const itemTaxAmount = discountedBase * (it.itemTaxRate / 100);
    const itemTotal = discountedBase + itemTaxAmount;
    return {
      ...it,
      discountedBase,
      itemTaxAmount,
      itemTotal,
    };
  });

  const taxAmount = calculatedItems.reduce((sum, it) => sum + it.itemTaxAmount, 0);
  const totalAmount = taxableAmount + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedChallanId) {
      toast.error('Please select a delivery challan');
      return;
    }

    setLoading(true);

    try {
      await deliveryChallanApi.createInvoice(selectedChallanId, {
        baseMargin,
        cashMargin,
        discount: orderDiscountAmount,
        notes,
      });

      toast.success('Sales invoice created successfully');
      router.push('/erp/sales/invoices');
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create invoice';
      toast.error(errorMessage);
      
      if (errorMessage.includes('delivered') || errorMessage.includes('invoiced')) {
        fetchInitialData();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/erp/sales/invoices" transitionTypes={["nav-back"]}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create Sales Invoice</h1>
            <p className="text-sm text-muted-foreground">
              Calculate FBR taxes, margins, and generate invoice from Delivery Challan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/erp/sales/invoices" transitionTypes={["nav-back"]}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !selectedChallanId}
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Challan & Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliveryChallan">Select Delivery Challan *</Label>
                <Select value={selectedChallanId} onValueChange={handleChallanSelection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery challan" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryChallans.map((challan) => (
                      <SelectItem key={challan.id} value={challan.id}>
                        <div className="flex flex-col text-left">
                          <span className="font-medium">{challan.challanNo}</span>
                          <span className="text-xs text-muted-foreground">
                            {challan.customer?.name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {deliveryChallans.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No delivered challans available for invoicing.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="customer">Customer</Label>
                <Input
                  value={
                    selectedChallan?.customer 
                      ? `${selectedChallan.customer.name} (Trader ID: ${selectedChallan.customer.traderId || 'N/A'})`
                      : 'Auto-populated on challan selection'
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calculation & Margins Configuration */}
        {selectedChallan && (
          <Card>
            <CardHeader>
              <CardTitle>Invoice Margins & Deductions (FBR Calculations)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    Base Margin (%)
                  </Label>
                  <Input
                    type="number"
                    value={baseMargin}
                    onChange={(e) => setBaseMargin(Number(e.target.value))}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Customer default: {Number(selectedChallan.customer?.baseMargin || 0)}%
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-blue-700 dark:text-blue-400 font-semibold">
                    Cash Margin (%)
                  </Label>
                  <Input
                    type="number"
                    value={cashMargin}
                    onChange={(e) => setCashMargin(Number(e.target.value))}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Customer default: {Number(selectedChallan.customer?.cashMargin || 0)}%
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Additional Discount (PKR)</Label>
                  <Input
                    type="number"
                    value={orderDiscount}
                    onChange={(e) => setOrderDiscount(Number(e.target.value))}
                    min="0"
                    step="0.01"
                    placeholder="0"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Direct deduction after customer margin
                  </p>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="notes">Notes / Remarks</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for the invoice..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivered Items Table */}
        {selectedChallan && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Delivered Items Breakdown ({calculatedItems.length})</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Order Ref: {selectedChallan.salesOrder?.orderNo || 'N/A'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-xs">
                      <TableHead className="w-[200px]">Item</TableHead>
                      <TableHead className="text-right w-[100px]">Retail Price</TableHead>
                      <TableHead className="text-right w-[70px]">Delivered</TableHead>
                      <TableHead className="text-right w-[110px]">WOST (Excl. Tax)</TableHead>
                      <TableHead className="text-right w-[110px]">Margin Cut ({marginPct}%)</TableHead>
                      <TableHead className="text-right w-[110px]">Sales Tax</TableHead>
                      <TableHead className="text-right w-[120px]">Total (Incl. Tax)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculatedItems.map((item) => (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell>
                          <div>
                            <div className="font-semibold">{item.item?.sku}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">{item.item?.description}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.retailPrice)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {item.qty}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatCurrency(item.wostTotal)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-amber-600">
                          -{formatCurrency(item.marginDiscount)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-blue-600">
                          <div>+{formatCurrency(item.itemTaxAmount)}</div>
                          <span className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 inline-block font-sans">
                            {item.itemTaxRate}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm text-primary">
                          {formatCurrency(item.itemTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice Summary */}
        {selectedChallan && (
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary & Final Tax Calculation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Gross Retail Value:</span>
                  <span className="font-mono">{formatCurrency(grossRetailTotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Gross WOST (Excl. Tax):</span>
                  <span className="font-mono">{formatCurrency(grossWostTotal)}</span>
                </div>
                {baseMargin > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-medium">
                    <span>Base Margin ({baseMargin}% Cut):</span>
                    <span className="font-mono">-{formatCurrency(baseMarginAmount)}</span>
                  </div>
                )}
                {cashMargin > 0 && (
                  <div className="flex justify-between text-sm text-blue-600 font-medium">
                    <span>Cash Margin ({cashMargin}% Cut):</span>
                    <span className="font-mono">-{formatCurrency(cashMarginAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-b py-1.5 text-sm">
                  <span>Net Subtotal (Excl. Tax):</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                {orderDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-amber-600 font-medium">
                    <span>Additional Discount:</span>
                    <span className="font-mono">-{formatCurrency(orderDiscountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sales Tax (FBR Item-wise):</span>
                  <span className="font-mono text-blue-600 font-medium">+{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-xl border-t pt-3 text-primary">
                  <span>Total Payable:</span>
                  <span className="font-mono">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}

export default function CreateSalesInvoicePage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading invoice creator...</div>}>
      <CreateSalesInvoiceContent />
    </Suspense>
  );
}