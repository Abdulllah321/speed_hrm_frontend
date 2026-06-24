'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Printer } from 'lucide-react';
import Link from 'next/link';
import { purchaseReturnApi, CreatePurchaseReturnDto, warehouseApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PermissionGuard } from "@/components/auth/permission-guard";

interface SourceDocument {
  id: string;
  grnNumber?: string;
  landedCostNumber?: string;
  invoiceNumber?: string;
  supplier: { id: string; name: string };
  warehouse?: { id: string; name: string };
  items: Array<{
    id: string;
    itemId: string;
    sku?: string;
    hsCodeStr?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxAmount: number;
    discountRate: number;
    discountAmount: number;
    lineTotal: number;
    size?: string;
    color?: string;
  }>;
  advanceTaxRate?: number;
}

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
  return Math.round(n).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtInt(n: number) {
  return Math.round(n).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function CreatePurchaseReturnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sourceType, setSourceType] = useState<'GRN' | 'LANDED_COST' | 'INVOICE'>('INVOICE');
  const [eligibleDocs, setEligibleDocs] = useState<SourceDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<SourceDocument | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<CreatePurchaseReturnDto>({
    sourceType: 'INVOICE',
    supplierId: '',
    warehouseId: '',
    returnType: 'DEFECTIVE',
    reason: '',
    notes: '',
    staxEInvoiceNumber: '',
    items: [],
  });

  useEffect(() => {
    loadEligibleDocuments();
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await warehouseApi.getAll();
      setWarehouses(data);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadEligibleDocuments = async () => {
    try {
      setLoading(true);
      const data = await purchaseReturnApi.getEligibleInvoices();
      setEligibleDocs(data);
    } catch (error) {
      console.error('Error loading eligible documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSelect = (docId: string) => {
    const doc = eligibleDocs.find(d => d.id === docId);
    if (!doc || !doc.supplier) return;

    setSelectedDoc(doc);
    setFormData({
      ...formData,
      grnId: undefined,
      landedCostId: undefined,
      purchaseInvoiceId: docId,
      supplierId: doc.supplier.id,
      warehouseId: doc.warehouse?.id || '',
      items: doc.items.map(item => ({
        sourceItemType: 'INVOICE_ITEM',
        purchaseInvoiceItemId: item.id,
        itemId: item.itemId,
        sku: item.sku || '',
        hsCodeStr: item.hsCodeStr || '',
        description: item.description || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        taxAmount: item.taxAmount || 0,
        discountRate: item.discountRate || 0,
        discountAmount: item.discountAmount || 0,
        size: item.size || '',
        color: item.color || '',
        returnQty: 0,
        lineTotal: 0,
        reason: '',
      })),
    });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    const item = { ...updatedItems[index], [field]: value };
    
    if (field === 'returnQty') {
      const returnQty = Number(value);
      const unitCost = Number(item.unitPrice || 0);
      const discRate = Number(item.discountRate || 0);
      const taxRate = Number(item.taxRate || 0);
      const advRate = Number(selectedDoc?.advanceTaxRate || 0.5);

      const discAmt = returnQty * unitCost * discRate / 100;
      const valExcl = returnQty * unitCost - discAmt;
      const taxAmt = valExcl * taxRate / 100;
      const valIncl = valExcl + taxAmt;
      const itemAdv = valIncl * advRate / 100;
      const lineTotal = valIncl + itemAdv;

      item.lineTotal = lineTotal;
    }
    
    updatedItems[index] = item;
    setFormData({ ...formData, items: updatedItems });
  };

  const removeItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + item.lineTotal, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate warehouse selection
    if (!formData.warehouseId) {
      alert('Please select a warehouse');
      return;
    }
    
    // Validate items have return quantities
    const validItems = formData.items.filter(item => item.returnQty > 0);
    if (validItems.length === 0) {
      alert('Please specify return quantities for at least one item');
      return;
    }

    try {
      setLoading(true);
      
      const apiItems = validItems.map((item: any) => ({
        sourceItemType: item.sourceItemType,
        purchaseInvoiceItemId: item.purchaseInvoiceItemId,
        itemId: item.itemId,
        description: item.description,
        returnQty: Number(item.returnQty),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
        reason: item.reason || undefined,
      }));

      await purchaseReturnApi.create({
        ...formData,
        items: apiItems,
      });
      router.push('/erp/procurement/purchase-returns');
    } catch (error) {
      console.error('Error creating purchase return:', error);
      alert('Error creating purchase return');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionGuard permissions="erp.procurement.pret.create">
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
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Create Purchase Return</h1>
              <p className="text-gray-600">Return items to supplier</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Source Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Return Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Select Purchase Invoice</Label>
                    <Select onValueChange={handleDocumentSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Purchase Invoice" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleDocs.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.invoiceNumber} - {doc.supplier?.name || 'Unknown Supplier'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Select Warehouse</Label>
                    <Select 
                      value={formData.warehouseId}
                      onValueChange={(val) => setFormData({ ...formData, warehouseId: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id}>
                            {wh.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedDoc && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Return Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Return Type</Label>
                            <Select
                              value={formData.returnType}
                              onValueChange={(val: any) => setFormData({ ...formData, returnType: val })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DEFECTIVE">Defective</SelectItem>
                                <SelectItem value="EXCESS">Excess</SelectItem>
                                <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                                <SelectItem value="DAMAGED">Damaged</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Supplier</Label>
                            <Input value={selectedDoc.supplier?.name || 'Unknown Supplier'} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>STax e-Inv #</Label>
                            <Input
                              value={formData.staxEInvoiceNumber || ''}
                              onChange={(e) => setFormData({ ...formData, staxEInvoiceNumber: e.target.value })}
                              placeholder="e.g. ST-123456"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Reason for Return</Label>
                          <Textarea
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            placeholder="Why are you returning these items?"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <Card>
                      <CardHeader>
                        <CardTitle>Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-lg font-bold">
                          <span>Total Return Amount</span>
                          <span>{formatCurrency(calculateTotal())}</span>
                        </div>
                        <div className="space-y-2">
                          <Label>Internal Notes</Label>
                          <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" className="flex-1" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Purchase Return'}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            title="Print Draft Return"
                            onClick={() => window.print()}
                            disabled={formData.items.filter(item => Number(item.returnQty) > 0).length === 0}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Items Table - Full Width */}
                <Card>
                  <CardHeader>
                    <CardTitle>Items to Return</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                            <th className="text-left p-3">SKU</th>
                            <th className="text-left p-3">HS Code</th>
                            <th className="text-left p-3">Description</th>
                            <th className="text-left p-3">Size</th>
                            <th className="text-left p-3">Color</th>
                            <th className="text-right p-3">Invoice Qty</th>
                            <th className="text-center p-3 font-semibold text-blue-700" style={{ width: '120px' }}>Qty to Return</th>
                            <th className="text-right p-3">Unit Cost</th>
                            <th className="text-right p-3">Val. Excl. Tax</th>
                            <th className="text-right p-3">Sales Tax %</th>
                            <th className="text-right p-3">Sales Tax Amt</th>
                            <th className="text-right p-3">Val. Incl. Tax</th>
                            <th className="text-right p-3">Adv. Tax Amt</th>
                            <th className="text-right p-3">Disc %</th>
                            <th className="text-right p-3">Disc Amt</th>
                            <th className="text-right p-3 font-bold">Line Total</th>
                            <th className="p-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.items.map((item: any, index) => {
                            const advRate  = Number(selectedDoc?.advanceTaxRate || 0.5);
                            const returnQty = Number(item.returnQty || 0);
                            const unitCost = Number(item.unitPrice || 0);
                            const discRate = Number(item.discountRate || 0);
                            
                            const discAmt  = returnQty * unitCost * discRate / 100;
                            const valExcl  = returnQty * unitCost - discAmt;
                            const taxRate  = Number(item.taxRate || 0);
                            const taxAmt   = valExcl * taxRate / 100;
                            const valIncl  = valExcl + taxAmt;
                            const itemAdv  = valIncl * advRate / 100;
                            const lineTotal = valIncl + itemAdv;

                            return (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-mono text-xs">{item.sku || "—"}</td>
                                <td className="p-3 font-mono text-xs text-gray-500">{item.hsCodeStr || "—"}</td>
                                <td className="p-3">
                                  <div className="font-medium">{item.description || "—"}</div>
                                  <div className="text-xs text-gray-400 mt-2">
                                    <Input
                                      placeholder="Reason (optional)"
                                      className="h-8 text-xs py-1"
                                      value={item.reason || ''}
                                      onChange={(e) => handleItemChange(index, 'reason', e.target.value)}
                                    />
                                  </div>
                                </td>
                                <td className="p-3 text-left">{item.size || "—"}</td>
                                <td className="p-3 text-left">{item.color || "—"}</td>
                                <td className="p-3 text-right tabular-nums font-semibold">{item.quantity}</td>
                                <td className="p-3 text-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.quantity}
                                    className="h-9 text-center border-blue-300 focus:border-blue-500 bg-blue-50/50"
                                    value={item.returnQty}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      if (val > item.quantity) {
                                        alert(`Return quantity cannot exceed invoice quantity (${item.quantity})`);
                                        handleItemChange(index, 'returnQty', item.quantity);
                                      } else {
                                        handleItemChange(index, 'returnQty', val);
                                      }
                                    }}
                                  />
                                </td>
                                <td className="p-3 text-right tabular-nums">{formatCurrency(unitCost)}</td>
                                <td className="p-3 text-right tabular-nums">{formatCurrency(valExcl)}</td>
                                <td className="p-3 text-right tabular-nums">{taxRate}%</td>
                                <td className="p-3 text-right tabular-nums">{formatCurrency(taxAmt)}</td>
                                <td className="p-3 text-right tabular-nums">{formatCurrency(valIncl)}</td>
                                <td className="p-3 text-right tabular-nums text-orange-600">{formatCurrency(itemAdv)}</td>
                                <td className="p-3 text-right tabular-nums">{discRate}%</td>
                                <td className="p-3 text-right tabular-nums">{formatCurrency(discAmt)}</td>
                                <td className="p-3 text-right tabular-nums font-semibold text-blue-700">{formatCurrency(lineTotal)}</td>
                                <td className="p-3 text-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 p-1 h-auto"
                                    onClick={() => removeItem(index)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </form>
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
                      <div className="bg-[#eef2f6] text-black w-full text-center py-2 text-xl sm:text-xl font-bold print:bg-[#eef2f6] [-webkit-print-color-adjust:exact] [color-adjust:exact]">
                        Purchase Return (Draft)
                      </div>
                    </div>

                    {/* Details Box */}
                    <div className="w-[45%] bg-[#f8fafc] text-xs sm:text-[13px] p-2 border border-gray-300 print:bg-[#f8fafc] [-webkit-print-color-adjust:exact] [color-adjust:exact] flex flex-col justify-center">
                       <div className="flex justify-between mb-2">
                          <span className="font-bold">Return Number:</span>
                          <span className="font-bold">DRAFT</span>
                       </div>
                       <div className="flex justify-between">
                          <div className="flex gap-2">
                            <span className="font-bold">Date:</span>
                            <span>{formatDate(new Date())}</span>
                          </div>
                       </div>
                       {formData.staxEInvoiceNumber && (
                          <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
                             <span className="font-bold">STax e-Inv #:</span>
                             <span>{formData.staxEInvoiceNumber}</span>
                          </div>
                       )}
                    </div>
                </div>

                {/* Vendor / Ship To Box */}
                <div className="flex gap-4 mb-4 text-xs sm:text-[13px]">
                    <div className="w-1/2 p-2 border border-gray-300 flex flex-col justify-center">
                        <div className="font-bold border-b border-gray-300 mb-2 pb-1">Supplier Details</div>
                        <div className="flex gap-2 mb-1"><span className="font-bold w-16 shrink-0">Name:</span> <span>{selectedDoc?.supplier?.name || 'N/A'}</span></div>
                    </div>
                    <div className="w-1/2 p-2 border border-gray-300 flex flex-col justify-center">
                        <div className="font-bold border-b border-gray-300 mb-2 pb-1">Warehouse</div>
                        <div className="flex gap-2 mb-1">
                          <span className="font-bold w-16 shrink-0">Name:</span> 
                          <span>{warehouses.find(w => w.id === formData.warehouseId)?.name || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <table className="w-full text-[10px] sm:text-[11px] mb-4 border-collapse">
                    <thead>
                      <tr className="border-y-2 border-black">
                        <th className="py-1 pr-1 text-left font-bold w-[4%]">#</th>
                        <th className="py-1 pr-1 text-left font-bold w-[9%]">SKU</th>
                        <th className="py-1 pr-1 text-left font-bold w-[7%]">HS Code</th>
                        <th className="py-1 pr-1 text-left font-bold w-[16%]">Description</th>
                        <th className="py-1 pr-1 text-right font-bold w-[6%]">Qty</th>
                        <th className="py-1 pr-1 text-right font-bold w-[8%]">Unit Cost</th>
                        <th className="py-1 pr-1 text-right font-bold w-[10%]">Val Excl Tax</th>
                        <th className="py-1 pr-1 text-right font-bold w-[9%]">Sales Tax</th>
                        <th className="py-1 pr-1 text-right font-bold w-[10%]">Val Incl Tax</th>
                        <th className="py-1 pr-1 text-right font-bold w-[10%]">Adv Tax</th>
                        <th className="py-1 text-right font-bold w-[11%]">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const validItems = formData.items.filter(item => Number(item.returnQty) > 0);
                        if (validItems.length > 0) {
                          return validItems.map((item: any, i: number) => {
                            const advRate  = Number(selectedDoc?.advanceTaxRate || 0.5);
                            const qty      = Number(item.returnQty      || 0);
                            const unitCost = Number(item.unitPrice     || 0);
                            
                            const discRate = Number(item.discountRate  || 0);
                            const discAmt  = qty * unitCost * discRate / 100;
                            const valExcl  = qty * unitCost - discAmt;
                            
                            const taxRate  = Number(item.taxRate       || 0);
                            const taxAmt   = valExcl * taxRate / 100;
                            const valIncl  = valExcl + taxAmt;
                            
                            const itemAdv  = valIncl * advRate / 100;
                            const lineTotal = valIncl + itemAdv;

                            return (
                              <tr key={i} className="border-b border-gray-300 align-top">
                                <td className="py-1 pr-1 tabular-nums">{i + 1}</td>
                                <td className="py-1 pr-1 font-mono font-bold">{item.sku || '—'}</td>
                                <td className="py-1 pr-1 font-mono text-gray-500">{item.hsCodeStr || '—'}</td>
                                <td className="py-1 pr-1 text-gray-800">
                                  <div>{item.description || '—'}</div>
                                  {item.reason && <div className="text-[9px] text-gray-500 italic mt-0.5">Reason: {item.reason}</div>}
                                </td>
                                <td className="py-1 pr-1 text-right tabular-nums">{qty}</td>
                                <td className="py-1 pr-1 text-right tabular-nums">{fmtInt(unitCost)}</td>
                                <td className="py-1 pr-1 text-right tabular-nums">{fmtInt(valExcl)}</td>
                                <td className="py-1 pr-1 text-right tabular-nums">{fmtInt(taxAmt)}</td>
                                <td className="py-1 pr-1 text-right tabular-nums">{fmtInt(valIncl)}</td>
                                <td className="py-1 pr-1 text-right tabular-nums">{fmtInt(itemAdv)}</td>
                                <td className="py-1 text-right tabular-nums font-semibold">{fmtInt(lineTotal)}</td>
                              </tr>
                            );
                          });
                        } else {
                          return (
                            <tr>
                                <td colSpan={11} className="py-4 text-center text-muted-foreground border-b border-gray-300">
                                    No items to return selected
                                </td>
                            </tr>
                          );
                        }
                      })()}
                    </tbody>
                </table>

                {/* Totals Section */}
                <div className="flex border-b border-black pb-4 text-xs sm:text-[13px] justify-between">
                    <div className="w-[50%] pt-4 flex flex-col justify-end">
                        <div className="flex gap-2 font-bold mb-1">
                            <span className="whitespace-nowrap">In Words:</span>
                            <span className="underline decoration-1 underline-offset-2 break-words">{numberToWords(calculateTotal())}</span>
                        </div>
                    </div>
                    <div className="w-[45%] flex flex-col space-y-1 text-right">
                        {(() => {
                          const advRate  = Number(selectedDoc?.advanceTaxRate || 0.5);
                          
                          let totalQty = 0;
                          let grossSubtotal = 0;
                          let totalDiscount = 0;
                          let totalSalesTax = 0;
                          let totalAdvTax = 0;
                          let totalAmount = 0;
                          
                          formData.items.forEach((item: any) => {
                            const qty      = Number(item.returnQty      || 0);
                            const unitCost = Number(item.unitPrice     || 0);
                            const discRate = Number(item.discountRate  || 0);
                            const discAmt  = qty * unitCost * discRate / 100;
                            const valExcl  = qty * unitCost - discAmt;
                            const taxRate  = Number(item.taxRate       || 0);
                            const taxAmt   = valExcl * taxRate / 100;
                            const valIncl  = valExcl + taxAmt;
                            const itemAdv  = valIncl * advRate / 100;
                            const lineTotal = valIncl + itemAdv;
                            
                            totalQty += qty;
                            grossSubtotal += qty * unitCost;
                            totalDiscount += discAmt;
                            totalSalesTax += taxAmt;
                            totalAdvTax += itemAdv;
                            totalAmount += lineTotal;
                          });
                          
                          const valExcl = grossSubtotal - totalDiscount;
                          const valIncl = valExcl + totalSalesTax;

                          return (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Total QTY:</span>
                                <span className="tabular-nums font-medium">{fmtInt(totalQty)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Subtotal (Gross):</span>
                                <span className="tabular-nums font-medium">{fmtInt(grossSubtotal)}</span>
                              </div>
                              {totalDiscount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Discount:</span>
                                  <span className="tabular-nums font-medium">-{fmtInt(totalDiscount)}</span>
                                </div>
                              )}
                              <div className="flex justify-between border-t border-gray-400 pt-1">
                                <span className="font-semibold">Value Excl. Sales Tax:</span>
                                <span className="tabular-nums font-semibold">{fmtInt(valExcl)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Sale Tax Amount:</span>
                                <span className="tabular-nums font-medium">{fmtInt(totalSalesTax)}</span>
                              </div>
                              <div className="flex justify-between border-t border-gray-400 pt-1">
                                <span className="font-semibold">Value Incl. Sales Tax:</span>
                                <span className="tabular-nums font-semibold">{fmtInt(valIncl)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Advance Tax ({advRate}%):</span>
                                <span className="tabular-nums font-medium">{fmtInt(totalAdvTax)}</span>
                              </div>
                              <div className="flex justify-between border-t border-black pt-1 font-bold">
                                <span>Total Return Amount:</span>
                                <span className="tabular-nums font-bold" style={{ borderBottom: '3px double black' }}>{fmtInt(totalAmount)}</span>
                              </div>
                            </>
                          );
                        })()}
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