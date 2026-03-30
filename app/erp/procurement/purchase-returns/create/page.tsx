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
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { purchaseReturnApi, CreatePurchaseReturnDto } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface SourceDocument {
  id: string;
  grnNumber?: string;
  landedCostNumber?: string;
  supplier: { id: string; name: string };
  warehouse: { id: string; name: string };
  items: Array<{
    id: string;
    itemId: string;
    description?: string;
    receivedQty?: number;
    qty?: number;
    unitPrice?: number;
    unitCostPKR?: number;
  }>;
}

export default function CreatePurchaseReturnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sourceType, setSourceType] = useState<'GRN' | 'LANDED_COST'>('GRN');
  const [eligibleDocs, setEligibleDocs] = useState<SourceDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<SourceDocument | null>(null);
  
  const [formData, setFormData] = useState<CreatePurchaseReturnDto>({
    sourceType: 'GRN',
    supplierId: '',
    warehouseId: '',
    returnType: 'DEFECTIVE',
    reason: '',
    notes: '',
    items: [],
  });

  useEffect(() => {
    loadEligibleDocuments();
  }, [sourceType]);

  const loadEligibleDocuments = async () => {
    try {
      setLoading(true);
      const data = sourceType === 'GRN' 
        ? await purchaseReturnApi.getEligibleGrns()
        : await purchaseReturnApi.getEligibleLandedCosts();
      setEligibleDocs(data);
    } catch (error) {
      console.error('Error loading eligible documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSourceTypeChange = (type: 'GRN' | 'LANDED_COST') => {
    setSourceType(type);
    setSelectedDoc(null);
    setFormData({
      ...formData,
      sourceType: type,
      grnId: undefined,
      landedCostId: undefined,
      supplierId: '',
      warehouseId: '',
      items: [],
    });
  };

  const handleDocumentSelect = (docId: string) => {
    const doc = eligibleDocs.find(d => d.id === docId);
    if (!doc || !doc.supplier) return;

    setSelectedDoc(doc);
    setFormData({
      ...formData,
      [sourceType === 'GRN' ? 'grnId' : 'landedCostId']: docId,
      supplierId: doc.supplier.id,
      warehouseId: doc.warehouse.id,
      items: doc.items.map(item => ({
        sourceItemType: sourceType === 'GRN' ? 'GRN_ITEM' : 'LANDED_COST_ITEM',
        [sourceType === 'GRN' ? 'grnItemId' : 'landedCostItemId']: item.id,
        itemId: item.itemId,
        displayCode: (item as any).displayCode || item.itemId,
        description: item.description || '',
        returnQty: 0,
        unitPrice: sourceType === 'GRN' ? (item.unitPrice || 0) : (item.unitCostPKR || 0),
        lineTotal: 0,
        reason: '',
      })),
    });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'returnQty') {
      updatedItems[index].lineTotal = value * updatedItems[index].unitPrice;
    }
    
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
    
    // Validate items have return quantities
    const validItems = formData.items.filter(item => item.returnQty > 0);
    if (validItems.length === 0) {
      alert('Please specify return quantities for at least one item');
      return;
    }

    try {
      setLoading(true);
      
      // Strip displayCode from items before sending to API 
      // (Redundant as itemId is already sent and causes 400 error due to forbidNonWhitelisted in backend)
      const apiItems = validItems.map(({ displayCode, ...item }: any) => item);

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
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
     
        <div>
          <h1 className="text-2xl font-bold">Create Purchase Return</h1>
          <p className="text-gray-600">Return items to supplier</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Return Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                type="button"
                variant={sourceType === 'GRN' ? 'default' : 'outline'}
                onClick={() => handleSourceTypeChange('GRN')}
              >
                From GRN (Direct)
              </Button>
              <Button
                type="button"
                variant={sourceType === 'LANDED_COST' ? 'default' : 'outline'}
                onClick={() => handleSourceTypeChange('LANDED_COST')}
              >
                From Landed Cost (Valued)
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Select {sourceType === 'GRN' ? 'GRN' : 'Landed Cost'}</Label>
                <Select onValueChange={handleDocumentSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${sourceType === 'GRN' ? 'GRN' : 'Landed Cost'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleDocs.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {sourceType === 'GRN' ? doc.grnNumber : doc.landedCostNumber} - {doc.supplier?.name || 'Unknown Supplier'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Return Type</Label>
                <Select 
                  value={formData.returnType} 
                  onValueChange={(value: any) => setFormData({ ...formData, returnType: value })}
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
            </div>

            <div>
              <Label>Return Reason</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Explain the reason for return..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        {selectedDoc && (
          <Card>
            <CardHeader>
              <CardTitle>Return Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Item</th>
                      <th className="text-left p-3">Available Qty</th>
                      <th className="text-left p-3">Return Qty</th>
                      <th className="text-left p-3">Unit Price</th>
                      <th className="text-left p-3">Line Total</th>
                      <th className="text-left p-3">Reason</th>
                      <th className="text-left p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => {
                      const sourceItem = selectedDoc.items.find(si => si.id === 
                        (sourceType === 'GRN' ? item.grnItemId : item.landedCostItemId)
                      );
                      const availableQty = sourceItem?.receivedQty || sourceItem?.qty || 0;

                      return (
                        <tr key={index} className="border-b">
                          <td className="p-3">
                            <div>
                              <div className="font-medium">{item.description || 'Item data unavailable'}</div>
                              <div className="text-sm text-gray-500">{(item as any).displayCode || item.itemId}</div>
                            </div>
                          </td>
                          <td className="p-3">{availableQty}</td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min="0"
                              max={availableQty}
                              step="0.01"
                              value={item.returnQty}
                              onChange={(e) => handleItemChange(index, 'returnQty', parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </td>
                          <td className="p-3">{formatCurrency(item.unitPrice)}</td>
                          <td className="p-3">{formatCurrency(item.lineTotal)}</td>
                          <td className="p-3">
                            <Input
                              value={item.reason}
                              onChange={(e) => handleItemChange(index, 'reason', e.target.value)}
                              placeholder="Item reason..."
                              className="w-32"
                            />
                          </td>
                          <td className="p-3">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
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

              <div className="mt-4 flex justify-end">
                <div className="text-lg font-semibold">
                  Total: {formatCurrency(calculateTotal())}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or comments..."
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/erp/procurement/purchase-returns">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || !selectedDoc}>
            {loading ? 'Creating...' : 'Create Return'}
          </Button>
        </div>
      </form>
    </div>
  );
}