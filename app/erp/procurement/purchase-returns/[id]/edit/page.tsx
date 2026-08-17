'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Trash2, Printer } from 'lucide-react';
import Link from 'next/link';
import { purchaseReturnApi, PurchaseReturn, UpdatePurchaseReturnDto, warehouseApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PermissionGuard } from "@/components/auth/permission-guard";
import { getSeasons, Season } from '@/lib/actions/season';

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

function fmtInt(n: number) {
  return Math.round(n).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function EditPurchaseReturnPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [purchaseReturn, setPurchaseReturn] = useState<PurchaseReturn | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);

  const [formData, setFormData] = useState<UpdatePurchaseReturnDto>({
    warehouseId: '',
    returnType: 'DEFECTIVE',
    returnDate: '',
    seasonId: '',
    companyGstNumber: '12-01-9999-663-46',
    supplierGstNumber: '',
    reason: '',
    notes: '',
    staxEInvoiceNumber: '',
    items: [],
  });

  useEffect(() => {
    loadWarehouses();
    loadSeasons();
    if (params.id) {
      loadPurchaseReturn(params.id as string);
    }
  }, [params.id]);

  const loadSeasons = async () => {
    try {
      const res = await getSeasons();
      if (res && res.data) {
        setSeasons(res.data);
      }
    } catch (error) {
      console.error('Error loading seasons:', error);
    }
  };

  const loadWarehouses = async () => {
    try {
      const data = await warehouseApi.getAll();
      setWarehouses(data);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadPurchaseReturn = async (id: string) => {
    try {
      setLoading(true);
      const data = await purchaseReturnApi.getById(id);
      setPurchaseReturn(data);

      const advRate = Number(data.purchaseInvoice?.advanceTaxRate || 0.5);

      let invoiceItems: any[] = data.purchaseInvoice?.items || [];

      // Fallback: If purchaseInvoice items are not directly included, fetch from eligibleInvoices
      if (invoiceItems.length === 0 && (data.purchaseInvoiceId || data.purchaseInvoice?.id)) {
        try {
          const eligibleDocs = await purchaseReturnApi.getEligibleInvoices();
          const targetId = data.purchaseInvoiceId || data.purchaseInvoice?.id;
          const doc = eligibleDocs.find((d: any) => d.id === targetId);
          if (doc?.items) {
            invoiceItems = doc.items;
          }
        } catch (e) {
          console.error('Error fetching fallback invoice items:', e);
        }
      }

      let formItems: any[] = [];

      const getItemSize = (item: any) => {
        if (typeof item?.item?.size === 'object' && item?.item?.size?.name) return item.item.size.name;
        if (typeof item?.item?.size === 'string') return item.item.size;
        if (typeof item?.size === 'object' && item?.size?.name) return item.size.name;
        if (typeof item?.size === 'string') return item.size;
        return '';
      };

      const getItemColor = (item: any) => {
        if (typeof item?.item?.color === 'object' && item?.item?.color?.name) return item.item.color.name;
        if (typeof item?.item?.color === 'string') return item.item.color;
        if (typeof item?.color === 'object' && item?.color?.name) return item.color.name;
        if (typeof item?.color === 'string') return item.color;
        return '';
      };

      if (invoiceItems.length > 0) {
        formItems = invoiceItems.map((invItem: any) => {
          const existingReturnItem = (data.items || []).find(
            (retItem: any) => retItem.purchaseInvoiceItemId === invItem.id || retItem.itemId === invItem.itemId
          );

          const returnQty = existingReturnItem ? Number(existingReturnItem.returnQty) : 0;
          const unitPrice = Number(invItem.unitPrice || 0);
          const discRate = Number(invItem.discountRate || 0);
          const taxRate = Number(invItem.taxRate || 0);

          const discAmt = returnQty * unitPrice * discRate / 100;
          const valExcl = returnQty * unitPrice - discAmt;
          const taxAmt = valExcl * taxRate / 100;
          const valIncl = valExcl + taxAmt;
          const lineTotal = returnQty > 0 ? valIncl : 0;

          return {
            sourceItemType: 'INVOICE_ITEM',
            purchaseInvoiceItemId: invItem.id,
            itemId: invItem.itemId,
            sku: invItem.item?.sku || invItem.sku || '',
            hsCodeStr: invItem.item?.hsCodeStr || invItem.hsCodeStr || '',
            description: invItem.description || invItem.item?.description || '',
            quantity: Number(invItem.quantity || 0),
            unitPrice: unitPrice,
            taxRate: taxRate,
            taxAmount: Number(invItem.taxAmount || 0),
            discountRate: discRate,
            discountAmount: Number(invItem.discountAmount || 0),
            size: getItemSize(invItem),
            color: getItemColor(invItem),
            returnQty: returnQty,
            lineTotal: lineTotal,
            reason: existingReturnItem?.reason || '',
          };
        });
      } else {
        formItems = (data.items || []).map((item: any) => {
          const returnQty = Number(item.returnQty || 0);
          const unitPrice = Number(item.unitPrice || 0);
          const discRate = Number(item.purchaseInvoiceItem?.discountRate || 0);
          const taxRate = Number(item.purchaseInvoiceItem?.taxRate || 0);

          const discAmt = returnQty * unitPrice * discRate / 100;
          const valExcl = returnQty * unitPrice - discAmt;
          const taxAmt = valExcl * taxRate / 100;
          const valIncl = valExcl + taxAmt;
          const lineTotal = valIncl;

          return {
            sourceItemType: item.sourceItemType,
            purchaseInvoiceItemId: item.purchaseInvoiceItemId,
            grnItemId: item.grnItemId,
            landedCostItemId: item.landedCostItemId,
            itemId: item.itemId,
            sku: item.item?.sku || item.sku || '',
            hsCodeStr: item.item?.hsCodeStr || item.hsCodeStr || '',
            description: item.description || item.item?.description || '',
            quantity: Number(item.purchaseInvoiceItem?.quantity || item.returnQty || 0),
            unitPrice: unitPrice,
            taxRate: taxRate,
            discountRate: discRate,
            size: getItemSize(item),
            color: getItemColor(item),
            brand: item.item?.brand?.name || item.brand || '',
            returnQty: returnQty,
            lineTotal: Number(item.lineTotal || lineTotal),
            reason: item.reason || '',
          };
        });
      }

      setFormData({
        warehouseId: data.warehouseId || '',
        returnType: data.returnType,
        returnDate: data.returnDate ? new Date(data.returnDate).toISOString().split('T')[0] : '',
        seasonId: data.seasonId || '',
        companyGstNumber: data.companyGstNumber || '12-01-9999-663-46',
        supplierGstNumber: data.supplierGstNumber || data.supplier?.gstNumber || data.supplier?.strnNo || data.supplier?.ntnNo || '',
        reason: data.reason || '',
        notes: data.notes || '',
        staxEInvoiceNumber: data.staxEInvoiceNumber || '',
        items: formItems,
      });
    } catch (error) {
      console.error('Error loading purchase return:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items!];
    const item = { ...updatedItems[index], [field]: value };
    
    if (field === 'returnQty') {
      const returnQty = Number(value);
      const unitCost = Number(item.unitPrice || 0);
      const discRate = Number(item.discountRate || 0);
      const taxRate = Number(item.taxRate || 0);
      const advRate = Number(purchaseReturn?.purchaseInvoice?.advanceTaxRate || 0.5);

      const discAmt = returnQty * unitCost * discRate / 100;
      const valExcl = returnQty * unitCost - discAmt;
      const taxAmt = valExcl * taxRate / 100;
      const valIncl = valExcl + taxAmt;
      const lineTotal = valIncl;

      item.lineTotal = lineTotal;
    }
    
    updatedItems[index] = item;
    setFormData({ ...formData, items: updatedItems });
  };

  const removeItem = (index: number) => {
    const updatedItems = [...formData.items!];
    updatedItems[index].returnQty = 0;
    updatedItems[index].lineTotal = 0;
    setFormData({ ...formData, items: updatedItems });
  };

  const calculateTotal = () => {
    return (formData.items || []).reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!purchaseReturn) return;

    if (!formData.warehouseId) {
      alert('Please select a warehouse');
      return;
    }

    const validItems = (formData.items || []).filter(item => Number(item.returnQty) > 0);
    if (validItems.length === 0) {
      alert('Please specify return quantities for at least one item');
      return;
    }

    try {
      setLoading(true);
      const apiItems = validItems.map((item: any) => ({
        sourceItemType: item.sourceItemType,
        purchaseInvoiceItemId: item.purchaseInvoiceItemId,
        grnItemId: item.grnItemId,
        landedCostItemId: item.landedCostItemId,
        itemId: item.itemId,
        description: item.description,
        returnQty: Number(item.returnQty),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
        reason: item.reason || undefined,
      }));

      await purchaseReturnApi.update(purchaseReturn.id, {
        ...formData,
        items: apiItems,
      });
      router.push('/erp/procurement/purchase-returns');
    } catch (error) {
      console.error('Error updating purchase return:', error);
      alert('Error updating purchase return');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !purchaseReturn) {
    return <div className="p-6 text-center">Loading purchase return...</div>;
  }

  if (!purchaseReturn) {
    return <div className="p-6 text-center text-red-500">Purchase return not found</div>;
  }

  if (purchaseReturn.status !== 'DRAFT') {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="text-red-500 text-lg font-semibold">This purchase return cannot be edited because it is {purchaseReturn.status}.</div>
        <Link href={`/erp/procurement/purchase-returns/${purchaseReturn.id}`} transitionTypes={["nav-back"]}>
          <Button>View Return</Button>
        </Link>
      </div>
    );
  }

  const grnNo = purchaseReturn.grn?.grnNumber || purchaseReturn.purchaseInvoice?.grn?.grnNumber || (purchaseReturn.purchaseInvoice?.landedCost as any)?.grn?.grnNumber || purchaseReturn.landedCost?.grn?.grnNumber || '—';

  return (
    <PermissionGuard permissions="erp.procurement.pret.update">
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
            <Link href={`/erp/procurement/purchase-returns/${purchaseReturn.id}`} transitionTypes={["nav-back"]}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Edit Purchase Return {purchaseReturn.returnNumber}</h1>
              <p className="text-gray-600">Modify return details and quantities</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Source Reference Card */}
            <Card>
              <CardHeader>
                <CardTitle>Return Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Source Document</Label>
                    <Input 
                      value={
                        purchaseReturn.purchaseInvoice?.invoiceNumber 
                          ? `${purchaseReturn.purchaseInvoice.invoiceNumber} ${grnNo !== '—' ? `(GRN: ${grnNo})` : ''} - ${purchaseReturn.supplier?.name || ''}` 
                          : `${purchaseReturn.sourceType} - ${purchaseReturn.supplier?.name || ''}`
                      } 
                      disabled 
                      className="font-medium"
                    />
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Return Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div className="space-y-2">
                        <Label>Return Number</Label>
                        <Input value={purchaseReturn.returnNumber} disabled className="font-medium" />
                      </div>
                      <div className="space-y-2">
                        <Label>PR Creation Date (Auto)</Label>
                        <Input value={formatDate(purchaseReturn.createdAt)} disabled className="bg-gray-50 text-gray-700 font-medium" />
                      </div>
                      <div className="space-y-2">
                        <Label>Sale Tax Invoice Date</Label>
                        <Input
                          type="date"
                          value={formData.returnDate || ''}
                          onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                          className="font-medium"
                        />
                      </div>
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
                            <SelectItem value="SHORTAGE">Shortage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Season field removed */}
                      <div className="space-y-2">
                        <Label>Supplier</Label>
                        <Input value={purchaseReturn.supplier?.name || 'N/A'} disabled />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>GRN Number</Label>
                        <Input value={grnNo} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>STax e-Inv #</Label>
                        <Input
                          value={formData.staxEInvoiceNumber || '—'}
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Company GST #</Label>
                        <Input
                          value={formData.companyGstNumber || ''}
                          onChange={(e) => setFormData({ ...formData, companyGstNumber: e.target.value })}
                          placeholder="Company GST / STRN #"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Supplier GST #</Label>
                        <Input
                          value={formData.supplierGstNumber || ''}
                          onChange={(e) => setFormData({ ...formData, supplierGstNumber: e.target.value })}
                          placeholder="Supplier GST / STRN #"
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
                     {/* Internal Notes field removed */}
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Purchase Return'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        title="Print Draft Return"
                        onClick={() => window.print()}
                        disabled={(formData.items || []).filter(item => Number(item.returnQty) > 0).length === 0}
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
                        <th className="text-right p-3">Disc %</th>
                        <th className="text-right p-3">Disc Amt</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(formData.items || []).map((item: any, index: number) => {
                        const returnQty = Number(item.returnQty || 0);
                        const unitCost = Number(item.unitPrice || 0);
                        const discRate = Number(item.discountRate || 0);
                        
                        const discAmt  = returnQty * unitCost * discRate / 100;
                        const valExcl  = returnQty * unitCost - discAmt;
                        const taxRate  = Number(item.taxRate || 0);
                        const taxAmt   = valExcl * taxRate / 100;
                        const valIncl  = valExcl + taxAmt;
                        const lineTotal = valIncl;

                        return (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-mono text-xs">{item.sku || "—"}</td>
                            <td className="p-3 font-mono text-xs text-gray-500">{item.hsCodeStr || "—"}</td>
                            <td className="p-3">
                              <div className="font-medium">{item.description || "—"}</div>
                              <div className="text-xs text-gray-400 mt-2">
                                <Input
                                  placeholder="Reason (optional)"
                                  className="h-8 text-xs py-1 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:ring-0 focus:outline-none transition-all"
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
                                className="h-9 text-center bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:ring-0 focus:outline-none w-20 mx-auto transition-all"
                                value={item.returnQty}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (item.quantity && val > item.quantity) {
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
                            <td className="p-3 text-right tabular-nums">{discRate}%</td>
                            <td className="p-3 text-right tabular-nums">{formatCurrency(discAmt)}</td>
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
                    {(() => {
                      let tQty = 0, tUnitCost = 0, tValExcl = 0, tSalesTax = 0, tValIncl = 0, tDiscAmt = 0, tLineTotal = 0;
                      (formData.items || []).forEach((item: any) => {
                        const qty      = Number(item.returnQty || 0);
                        const unitCost = Number(item.unitPrice || 0);
                        const discRate = Number(item.discountRate || 0);
                        const discAmt  = qty * unitCost * discRate / 100;
                        const valExcl  = qty * unitCost - discAmt;
                        const taxRate  = Number(item.taxRate || 0);
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
                            <td colSpan={6} className="p-3 text-right">Total:</td>
                            <td className="p-3 text-center tabular-nums font-bold">{tQty}</td>
                            <td className="p-3 text-right tabular-nums">{formatCurrency(tUnitCost)}</td>
                            <td className="p-3 text-right tabular-nums">{formatCurrency(tValExcl)}</td>
                            <td className="p-3"></td>
                            <td className="p-3 text-right tabular-nums">{formatCurrency(tSalesTax)}</td>
                            <td className="p-3 text-right tabular-nums">{formatCurrency(tValIncl)}</td>
                            <td className="p-3"></td>
                            <td className="p-3 text-right tabular-nums">{formatCurrency(tDiscAmt)}</td>
                            <td className="p-3"></td>
                          </tr>
                        </tfoot>
                      );
                    })()}
                  </table>
                </div>
              </CardContent>
            </Card>
          </form>
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
                      <p className="text-xs font-semibold text-gray-700 mt-0.5">GST #: {formData.companyGstNumber || purchaseReturn.companyGstNumber || '12-01-9999-663-46'}</p>
                      {(() => {
                        const printBrands = Array.from(
                          new Set(
                            (formData.items || [])
                              .filter((item: any) => Number(item.returnQty) > 0)
                              .map((i: any) => i.brand || i.item?.brand?.name)
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
                    <div className="w-[35%] bg-[#f8fafc] text-xs p-2 border border-gray-300 print:bg-[#f8fafc] [-webkit-print-color-adjust:exact] flex flex-col justify-center">
                        <div className="flex justify-between mb-1">
                           <span className="font-bold">Return Number:</span>
                           <span className="font-bold">{purchaseReturn.returnNumber}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                           <span className="font-bold">PR Creation Date:</span>
                           <span>{formatDate(purchaseReturn.createdAt)}</span>
                        </div>
                        {(formData.seasonId || purchaseReturn.season) && (
                           <div className="flex justify-between mb-1">
                              <span className="font-bold">Season:</span>
                              <span>{seasons.find(s => s.id === formData.seasonId)?.name || purchaseReturn.season?.name || '—'}</span>
                           </div>
                        )}
                        {purchaseReturn.purchaseInvoice && (
                           <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
                              <span className="font-bold">Source Invoice:</span>
                              <span>{purchaseReturn.purchaseInvoice.invoiceNumber}</span>
                           </div>
                        )}
                        {grnNo !== '—' && (
                           <div className="flex justify-between mt-1">
                              <span className="font-bold">GRN Number:</span>
                              <span>{grnNo}</span>
                           </div>
                        )}
                        {formData.staxEInvoiceNumber && (
                           <div className="flex justify-between mt-1">
                              <span className="font-bold">STax e-Inv #:</span>
                              <span>{formData.staxEInvoiceNumber}</span>
                           </div>
                        )}
                        <div className="flex justify-between mb-1">
                           <span className="font-bold">Sale Tax Invoice Date:</span>
                           <span>{formatDate(formData.returnDate ? new Date(formData.returnDate) : purchaseReturn.returnDate)}</span>
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
                           const raw = formData.supplierGstNumber || purchaseReturn.supplier?.gstNumber || purchaseReturn.supplier?.strnNo;
                           const val = (raw && raw.toLowerCase() !== 'registered') ? raw : '';
                           return val ? (
                             <div className="flex gap-2 mb-1">
                               <span className="font-bold w-16 shrink-0">GST #:</span>
                               <span>{val}</span>
                             </div>
                           ) : null;
                         })()}
                    </div>
                    <div className="w-1/2 p-2 border border-gray-300 flex flex-col justify-center">
                        <div className="font-bold border-b border-gray-300 mb-2 pb-1">Warehouse</div>
                        <div className="flex gap-2 mb-1">
                          <span className="font-bold w-16 shrink-0">Name:</span> 
                          <span>{warehouses.find(w => w.id === formData.warehouseId)?.name || purchaseReturn.warehouse?.name || 'N/A'}</span>
                        </div>
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
                      {(() => {
                        const validItems = (formData.items || []).filter(item => Number(item.returnQty) > 0);
                        if (validItems.length > 0) {
                          return validItems.map((item: any, i: number) => {
                            const qty      = Number(item.returnQty      || 0);
                            const unitCost = Number(item.unitPrice     || 0);
                            
                            const discRate = Number(item.discountRate  || 0);
                            const discAmt  = qty * unitCost * discRate / 100;
                            const valExcl  = qty * unitCost - discAmt;
                            
                            const taxRate  = Number(item.taxRate       || 0);
                            const taxAmt   = valExcl * taxRate / 100;
                            const valIncl  = valExcl + taxAmt;

                            return (
                              <tr key={i} className="border-b border-gray-300 align-top">
                                <td className="py-1 pr-1 tabular-nums">{i + 1}</td>
                                <td className="py-1 pr-1 font-mono font-bold">{item.sku || '—'}</td>
                                <td className="py-1 pr-1 font-mono text-gray-500">{item.hsCodeStr || '—'}</td>
                                <td className="py-1 pr-1 text-gray-800">
                                  <div>{item.description || '—'}</div>
                                  {item.reason && <div className="text-[9px] text-gray-500 italic mt-0.5">Reason: {item.reason}</div>}
                                </td>
                                <td className="py-1 pr-1 text-left">{item.size || '—'}</td>
                                <td className="py-1 pr-1 text-left">{item.color || '—'}</td>
                                <td className="py-1 pr-1 text-right tabular-nums">{qty}</td>
                                <td className="py-1 pr-1 text-right tabular-nums">{fmtInt(unitCost)}</td>
                                <td className="py-1 pr-1 text-right tabular-nums">{fmtInt(valExcl)}</td>
                                <td className="py-1 pr-1 text-right tabular-nums">{taxRate}%</td>
                                <td className="py-1 pr-1 text-right tabular-nums">{fmtInt(taxAmt)}</td>
                                <td className="py-1 text-right tabular-nums font-semibold">{fmtInt(valIncl)}</td>
                              </tr>
                            );
                          });
                        } else {
                          return (
                            <tr>
                                <td colSpan={12} className="py-4 text-center text-muted-foreground border-b border-gray-300">
                                    No items to return selected
                                </td>
                            </tr>
                          );
                        }
                      })()}
                    </tbody>
                    {(() => {
                      let tQty = 0, tUnitCost = 0, tValExcl = 0, tSalesTax = 0, tValIncl = 0, tLineTotal = 0;
                      (formData.items || []).filter(item => Number(item.returnQty) > 0).forEach((item: any) => {
                        const qty      = Number(item.returnQty || 0);
                        const unitCost = Number(item.unitPrice || 0);
                        const discRate = Number(item.discountRate || 0);
                        const discAmt  = qty * unitCost * discRate / 100;
                        const valExcl  = qty * unitCost - discAmt;
                        const taxRate  = Number(item.taxRate || 0);
                        const taxAmt   = valExcl * taxRate / 100;
                        const valIncl  = valExcl + taxAmt;

                        tQty += qty;
                        tUnitCost += unitCost;
                        tValExcl += valExcl;
                        tSalesTax += taxAmt;
                        tValIncl += valIncl;
                        tLineTotal += valIncl;
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
                        <span className="font-bold border-b-2 border-black pb-0.5">{fmtInt(calculateTotal())}</span>
                    </div>
                    <div className="flex gap-2 font-bold mb-1">
                        <span className="whitespace-nowrap">In Words:</span>
                        <span className="underline decoration-1 underline-offset-2 break-words">{numberToWords(calculateTotal())}</span>
                    </div>
                    {formData.reason && (
                      <div className="text-left text-xs mt-2 border-t pt-2 border-dashed border-gray-300">
                        <span className="font-bold">Reason for Return: </span>
                        <span className="text-gray-700">{formData.reason}</span>
                      </div>
                    )}
                    {formData.notes && (
                      <div className="text-left text-xs mt-1">
                        <span className="font-bold">Internal Notes: </span>
                        <span className="text-gray-700">{formData.notes}</span>
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