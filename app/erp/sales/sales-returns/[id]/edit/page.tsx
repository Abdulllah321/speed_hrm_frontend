'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { salesReturnApi, SalesReturn, warehouseApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { PermissionGuard } from "@/components/auth/permission-guard";

export default function EditSalesReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [salesReturn, setSalesReturn] = useState<SalesReturn | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const [formData, setFormData] = useState<any>({
    warehouseId: '',
    returnType: 'DEFECTIVE',
    reason: '',
    notes: '',
    staxEInvoiceNumber: '',
    items: [],
  });

  useEffect(() => {
    loadData();
  }, [resolvedParams.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [data, whList] = await Promise.all([
        salesReturnApi.getById(resolvedParams.id),
        warehouseApi.getAll(),
      ]);

      if (data.status !== 'DRAFT') {
        alert('Only DRAFT sales returns can be edited');
        router.push(`/erp/sales/sales-returns/${resolvedParams.id}`);
        return;
      }

      setSalesReturn(data);
      setWarehouses(whList);
      setFormData({
        warehouseId: data.warehouseId,
        returnType: data.returnType,
        reason: data.reason || '',
        notes: data.notes || '',
        staxEInvoiceNumber: data.staxEInvoiceNumber || '',
        items: data.items.map(item => ({
          sourceItemType: item.sourceItemType,
          salesInvoiceItemId: item.salesInvoiceItemId,
          deliveryChallanItemId: item.deliveryChallanItemId,
          itemId: item.itemId,
          sku: item.item?.sku || '',
          description: item.description || item.item?.description || '',
          size: item.item?.size?.name || '',
          color: item.item?.color?.name || '',
          returnQty: Number(item.returnQty),
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
          reason: item.reason || '',
        })),
      });
    } catch (error) {
      console.error('Error loading sales return:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    const item = { ...updatedItems[index], [field]: value };
    
    if (field === 'returnQty') {
      const returnQty = Number(value);
      const unitCost = Number(item.unitPrice || 0);
      item.lineTotal = returnQty * unitCost;
    }
    
    updatedItems[index] = item;
    setFormData({ ...formData, items: updatedItems });
  };

  const removeItem = (index: number) => {
    const updatedItems = formData.items.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum: number, item: any) => sum + (item.lineTotal || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = formData.items.filter((item: any) => item.returnQty > 0);
    if (validItems.length === 0) {
      alert('Please specify return quantities for at least one item');
      return;
    }

    try {
      setSaving(true);
      await salesReturnApi.update(resolvedParams.id, {
        warehouseId: formData.warehouseId,
        returnType: formData.returnType,
        reason: formData.reason,
        notes: formData.notes,
        staxEInvoiceNumber: formData.staxEInvoiceNumber,
        items: validItems.map((item: any) => ({
          sourceItemType: item.sourceItemType,
          salesInvoiceItemId: item.salesInvoiceItemId,
          deliveryChallanItemId: item.deliveryChallanItemId,
          itemId: item.itemId,
          description: item.description,
          returnQty: Number(item.returnQty),
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
          reason: item.reason || undefined,
        })),
      });
      router.push(`/erp/sales/sales-returns/${resolvedParams.id}`);
    } catch (error) {
      console.error('Error updating sales return:', error);
      alert('Error updating sales return');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading return for editing...</div>;
  }

  if (!salesReturn) {
    return <div className="p-6 text-center text-red-600">Sales return not found</div>;
  }

  return (
    <PermissionGuard permissions="erp.sales.invoice.read">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/erp/sales/sales-returns/${salesReturn.id}`} transitionTypes={["nav-back"]}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Sales Return {salesReturn.returnNumber}</h1>
            <p className="text-gray-600">Modify draft return details</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Return Header</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Warehouse</Label>
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

                    <div className="space-y-2">
                      <Label>STax e-Inv #</Label>
                      <Input
                        value={formData.staxEInvoiceNumber}
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
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? 'Saving Changes...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
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
                      <th className="text-center p-3 font-semibold text-blue-700" style={{ width: '120px' }}>Return Qty</th>
                      <th className="text-right p-3">Unit Price</th>
                      <th className="text-right p-3 font-bold">Line Total</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item: any, index: number) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{item.sku || "—"}</td>
                        <td className="p-3">
                          <div className="font-medium">{item.description || "—"}</div>
                        </td>
                        <td className="p-3">{item.size || "—"}</td>
                        <td className="p-3">{item.color || "—"}</td>
                        <td className="p-3 text-center">
                          <Input
                            type="number"
                            min="0"
                            className="h-9 text-center bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white focus:ring-0 focus:outline-none w-20 mx-auto transition-all"
                            value={item.returnQty}
                            onChange={(e) => handleItemChange(index, 'returnQty', Number(e.target.value))}
                          />
                        </td>
                        <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-3 text-right font-semibold text-blue-700">{formatCurrency(item.lineTotal)}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </PermissionGuard>
  );
}
