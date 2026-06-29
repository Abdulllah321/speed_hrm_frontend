'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface GroupedProduct {
  skuBase: string;
  description: string;
  unitPrice: number;
  totalQty: number;
  totalValue: number;
  sizes: {
    sizeName: string;
    quantity: number;
  }[];
}

interface GroupedSegment {
  segmentName: string;
  totalQty: number;
  totalValue: number;
  products: GroupedProduct[];
}

interface GroupedGender {
  genderName: string;
  totalQty: number;
  totalValue: number;
  segments: GroupedSegment[];
}

interface GroupedCategory {
  categoryName: string;
  totalQty: number;
  totalValue: number;
  genders: GroupedGender[];
}

export default function StockRequisitionDraftSlipPage() {
  const router = useRouter();
  const [requisition, setRequisition] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const dataStr = localStorage.getItem('draft_srn');
      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        setRequisition(parsed);
      } else {
        toast.error('No draft requisition found');
      }
    } catch (e) {
      console.error('Failed to parse draft requisition', e);
      toast.error('Failed to load draft requisition');
    } finally {
      setLoading(false);
    }
  }, []);

  const printSlip = () => {
    window.print();
  };

  // Safe Date formatter
  const formatRequisitionDate = (dateStr: any) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return format(d, 'dd-MMM-yyyy');
    } catch (e) {
      return '';
    }
  };

  // Helper to extract base SKU (e.g. strip size suffix like -2XL, -L, etc.)
  const getBaseSku = (sku: string, sizeName?: string | null) => {
    if (!sku) return '';
    if (!sizeName) return sku;

    const sizeUpper = sizeName.toUpperCase();
    const skuUpper = sku.toUpperCase();

    if (skuUpper.endsWith(`-${sizeUpper}`)) {
      return sku.substring(0, sku.length - sizeUpper.length - 1);
    }
    if (skuUpper.endsWith(` ${sizeUpper}`)) {
      return sku.substring(0, sku.length - sizeUpper.length - 1);
    }
    if (skuUpper.endsWith(sizeUpper)) {
      return sku.substring(0, sku.length - sizeUpper.length);
    }
    return sku;
  };

  // Hierarchy Grouping Function
  const getGroupedHierarchy = (items: any[]): GroupedCategory[] => {
    const categories: Record<string, GroupedCategory> = {};

    if (!items || !Array.isArray(items)) return [];

    items.forEach((reqItem) => {
      if (!reqItem) return;
      const item = reqItem.item;
      if (!item) return;

      const categoryName = item.category?.name || 'UNCLASSIFIED';
      const genderName = item.gender?.name || 'GENERAL';
      const segmentName = item.segment?.name || 'GENERAL';

      const qty = Number(reqItem.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const totalValue = qty * unitPrice;

      const sizeName = item.size?.name || 'Free Size';
      const skuBase = getBaseSku(item.sku, item.size?.name);

      // 1. Initialize Category
      if (!categories[categoryName]) {
        categories[categoryName] = {
          categoryName,
          totalQty: 0,
          totalValue: 0,
          genders: [],
        };
      }
      const cat = categories[categoryName];
      cat.totalQty += qty;
      cat.totalValue += totalValue;

      // 2. Find/Create Gender
      let gend = cat.genders.find((g) => g.genderName === genderName);
      if (!gend) {
        gend = {
          genderName,
          totalQty: 0,
          totalValue: 0,
          segments: [],
        };
        cat.genders.push(gend);
      }
      gend.totalQty += qty;
      gend.totalValue += totalValue;

      // 3. Find/Create Segment
      let seg = gend.segments.find((s) => s.segmentName === segmentName);
      if (!seg) {
        seg = {
          segmentName,
          totalQty: 0,
          totalValue: 0,
          products: [],
        };
        gend.segments.push(seg);
      }
      seg.totalQty += qty;
      seg.totalValue += totalValue;

      // 4. Find/Create Product (group by skuBase + description)
      let prod = seg.products.find((p) => p.skuBase === skuBase);
      if (!prod) {
        prod = {
          skuBase,
          description: item.description || '',
          unitPrice,
          totalQty: 0,
          totalValue: 0,
          sizes: [],
        };
        seg.products.push(prod);
      }
      prod.totalQty += qty;
      prod.totalValue += totalValue;

      // 5. Add size quantity
      const existingSize = prod.sizes.find((sz) => sz.sizeName === sizeName);
      if (existingSize) {
        existingSize.quantity += qty;
      } else {
        prod.sizes.push({ sizeName, quantity: qty });
      }
    });

    return Object.values(categories);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-muted-foreground text-sm font-semibold">Loading Draft Requisition Slip...</p>
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <p className="text-rose-500 font-bold">Draft Requisition Slip Not Found</p>
        <Button onClick={() => window.close()}>Close Window</Button>
      </div>
    );
  }

  const groupedCategories = getGroupedHierarchy(requisition.items || []);
  const grandTotalQty = requisition.items?.reduce((sum: number, i: any) => {
    if (!i) return sum;
    return sum + Number(i.quantity || 0);
  }, 0) || 0;

  const grandTotalValue = requisition.items?.reduce((sum: number, i: any) => {
    if (!i || !i.item) return sum;
    return sum + (Number(i.quantity || 0) * Number(i.item.unitPrice || 0));
  }, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white text-black py-6">
      {/* Top action bar (hidden on print) */}
      <div className="print:hidden bg-white border p-4 flex justify-between items-center shadow-sm max-w-4xl mx-auto rounded-md mb-6">
        <Button variant="outline" className="font-bold border-2" onClick={() => window.close()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Close Preview
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1.5 border border-amber-200 rounded-md">
            DRAFT PRINT PREVIEW
          </span>
          <Button className="bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={printSlip}>
            <Printer className="h-4 w-4 mr-2" /> Print Slip
          </Button>
        </div>
      </div>

      {/* A4 Page Printable Area */}
      <div className="bg-white p-10 max-w-4xl mx-auto shadow-md print:shadow-none print:max-w-none print:p-0 print:m-0 border print:border-0 rounded-md">
        
        {/* Header Logo + Titles */}
        <div className="flex justify-between items-start border-b pb-4 mb-6">
          {/* Stylized Logo mimicking client standard */}
          <div className="flex items-center gap-3">
            <div className="border-[3px] border-black p-2 flex flex-col justify-center items-center w-14 h-14 font-black tracking-tighter leading-none">
              <span className="text-xl">S</span>
              <span className="text-[10px] -mt-1">PEED</span>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 leading-none">SPEED</p>
              <p className="text-xs uppercase font-extrabold text-black leading-none">PRIVATE LIMITED</p>
            </div>
          </div>

          <div className="text-center flex-1 pr-14">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Speed (Private) Limited</h1>
            <p className="text-lg font-bold text-gray-800">Stock Requisition Note</p>
            <p className="text-xl font-extrabold uppercase border-b-2 border-black inline-block px-8 mt-1 tracking-wider">
              {requisition.brand?.name || 'GENERAL'}
            </p>
          </div>
        </div>

        {/* Info Grid (Meta parameters) */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-2.5 text-[13px] border-b pb-5 mb-6">
          <div className="space-y-1.5">
            <div className="flex">
              <span className="font-semibold w-32 text-gray-600">Financial Year :</span>
              <span className="font-bold text-gray-800">{requisition.financialYear || '25-26'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32 text-gray-600">Requester :</span>
              <span className="font-bold text-gray-800">{requisition.toLocation?.name || '-'}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32 text-gray-600">Document Type :</span>
              <span className="font-bold text-gray-800">{requisition.documentType || 'New Arrival'}</span>
            </div>
            <div className="flex items-center">
              <span className="font-semibold w-32 text-gray-600">S.R.N. No :</span>
              <span className="font-bold text-base font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase tracking-widest">
                DRAFT / UNPOSTED
              </span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32 text-gray-600">Employee :</span>
              <span className="font-medium text-gray-800">Shehriyar</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32 text-gray-600">Remarks :</span>
              <span className="font-medium text-gray-800">{requisition.remarks || '-'}</span>
            </div>
          </div>

          <div className="space-y-1.5 text-right flex flex-col items-end justify-start">
            <div className="flex gap-2">
              <span className="font-semibold text-gray-600">Date :</span>
              <span className="font-bold text-gray-800">{formatRequisitionDate(requisition.requisitionDate)}</span>
            </div>
          </div>
        </div>

        {/* Hierarchical Grouping Table */}
        <div className="w-full text-xs">
          {/* Table Headers */}
          <div className="grid grid-cols-12 font-bold border-b border-black pb-2 text-[11px] uppercase tracking-wider text-gray-700">
            <div className="col-span-5">GPC / Category / Product</div>
            <div className="col-span-2 text-center">Size</div>
            <div className="col-span-1 text-center">Quantity</div>
            <div className="col-span-2 text-right pr-4">Selling Price (Rs.)</div>
            <div className="col-span-2 text-right">Total Value (Rs.)</div>
          </div>

          {/* Loop over Grouped Categories */}
          <div className="space-y-6 pt-3">
            {groupedCategories.map((cat) => (
              <div key={cat.categoryName} className="space-y-4">
                {/* Level 1: Category Row */}
                <div className="grid grid-cols-12 font-extrabold border-b pb-1 text-black text-sm uppercase">
                  <div className="col-span-5">{cat.categoryName}</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-1 text-center text-base font-black">{cat.totalQty}</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-black">
                    {cat.totalValue.toLocaleString('en-PK', { minimumFractionDigits: 0 })}
                  </div>
                </div>

                {/* Level 2: Genders */}
                {cat.genders.map((gender) => (
                  <div key={gender.genderName} className="pl-4 space-y-3">
                    <div className="grid grid-cols-12 font-bold text-gray-800 border-b border-dashed pb-0.5 uppercase">
                      <div className="col-span-5">{gender.genderName}</div>
                      <div className="col-span-2"></div>
                      <div className="col-span-1 text-center font-bold">{gender.totalQty}</div>
                      <div className="col-span-2"></div>
                      <div className="col-span-2 text-right font-bold">
                        {gender.totalValue.toLocaleString('en-PK', { minimumFractionDigits: 0 })}
                      </div>
                    </div>

                    {/* Level 3: Segments */}
                    {gender.segments.map((segment) => (
                      <div key={segment.segmentName} className="pl-4 space-y-2">
                        <div className="grid grid-cols-12 font-semibold text-gray-700 uppercase">
                          <div className="col-span-5">{segment.segmentName}</div>
                          <div className="col-span-2"></div>
                          <div className="col-span-1 text-center font-semibold">{segment.totalQty}</div>
                          <div className="col-span-2"></div>
                          <div className="col-span-2 text-right">
                            {segment.totalValue.toLocaleString('en-PK', { minimumFractionDigits: 0 })}
                          </div>
                        </div>

                        {/* Level 4: Products */}
                        {segment.products.map((prod) => (
                          <div key={prod.skuBase} className="pl-4 border-l border-gray-300 space-y-1 my-2">
                            {/* Product Header Row */}
                            <div className="grid grid-cols-12 font-medium text-gray-900">
                              <div className="col-span-5 flex gap-2">
                                <span className="font-bold underline">{prod.skuBase}</span>
                                <span className="text-gray-600 truncate">{prod.description}</span>
                              </div>
                              <div className="col-span-2"></div>
                              <div className="col-span-1 text-center font-bold bg-gray-50">{prod.totalQty}</div>
                              <div className="col-span-2 text-right pr-4">
                                {prod.unitPrice > 0
                                  ? prod.unitPrice.toLocaleString('en-PK', { minimumFractionDigits: 0 })
                                  : '0'}
                              </div>
                              <div className="col-span-2 text-right">
                                {prod.totalValue.toLocaleString('en-PK', { minimumFractionDigits: 0 })}
                              </div>
                            </div>

                            {/* Level 5: Sizes Breakdown */}
                            {prod.sizes.map((sz) => (
                              <div key={sz.sizeName} className="grid grid-cols-12 text-gray-500 text-[11px] pl-6">
                                <div className="col-span-5"></div>
                                <div className="col-span-2 text-center font-mono font-semibold">{sz.sizeName}</div>
                                <div className="col-span-1 text-center font-bold text-gray-800">{sz.quantity}</div>
                                <div className="col-span-2"></div>
                                <div className="col-span-2 text-right"></div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Grand Totals Footer */}
        <div className="grid grid-cols-12 font-black border-t-2 border-black mt-8 pt-3 text-sm">
          <div className="col-span-5 uppercase">Grand Totals:</div>
          <div className="col-span-2"></div>
          <div className="col-span-1 text-center text-lg">{grandTotalQty}</div>
          <div className="col-span-2"></div>
          <div className="col-span-2 text-right text-lg">
            Rs. {grandTotalValue.toLocaleString('en-PK', { minimumFractionDigits: 0 })}
          </div>
        </div>

        {/* Signatures Panel */}
        <div className="grid grid-cols-4 gap-8 mt-24 pt-8 border-t border-dashed border-gray-300 text-center text-[11px] font-bold uppercase tracking-wider text-gray-700">
          <div>
            <div className="border-b border-gray-400 w-3/4 mx-auto mb-2"></div>
            <p>Prepared By (Maker)</p>
            <p className="text-[9px] text-gray-400 font-normal mt-0.5">Sign & Date</p>
          </div>
          <div>
            <div className="border-b border-gray-400 w-3/4 mx-auto mb-2"></div>
            <p>Checked By (Checker)</p>
            <p className="text-[9px] text-gray-400 font-normal mt-0.5">Sign & Date</p>
          </div>
          <div>
            <div className="border-b border-gray-400 w-3/4 mx-auto mb-2"></div>
            <p>Authorized By</p>
            <p className="text-[9px] text-gray-400 font-normal mt-0.5">Sign & Date</p>
          </div>
          <div>
            <div className="border-b border-gray-400 w-3/4 mx-auto mb-2"></div>
            <p>Received By (Outlet Manager)</p>
            <p className="text-[9px] text-gray-400 font-normal mt-0.5">Sign & Date</p>
          </div>
        </div>

        {/* Standard computerized warning footer */}
        <div className="mt-12 text-center text-[10px] text-gray-400 border-t pt-4">
          <p>This is a standard system-generated Stock Requisition Note. Please perform physical inspection upon transfer delivery.</p>
        </div>

      </div>
    </div>
  );
}
