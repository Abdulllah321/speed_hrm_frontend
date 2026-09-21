'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { creditNoteApi, CreditNote } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PermissionGuard } from "@/components/auth/permission-guard";

function fmtInt(n: number) {
  return Math.round(n).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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

function formatNumber(n: number) {
  if (n === undefined || n === null || isNaN(n)) return '0';
  return n.toLocaleString('en-US');
}

function AddressDisplay({ address, label, labelWidth }: { address: string | undefined | null, label: string, labelWidth: string }) {
  if (!address) {
    return <div className="flex"><span className={`font-bold shrink-0 ${labelWidth}`}>{label}</span> <span>N/A</span></div>;
  }
  const match = address.match(/(Contact\s*[:#])/i);
  if (match) {
    const splitIndex = match.index!;
    const before = address.substring(0, splitIndex).trim();
    const contactText = match[0];
    const after = address.substring(splitIndex + contactText.length).trim();
    return (
      <>
        <div className="flex mb-0.5"><span className={`font-bold shrink-0 ${labelWidth}`}>{label}</span> <span>{before}</span></div>
        <div className="flex"><span className={`font-bold shrink-0 ${labelWidth}`}>{contactText}</span> <span>{after}</span></div>
      </>
    );
  }
  return <div className="flex"><span className={`font-bold shrink-0 ${labelWidth}`}>{label}</span> <span>{address}</span></div>;
}

interface CreditNoteLineItem {
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

interface CreditNoteProductGroup {
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
  items: CreditNoteLineItem[];
}

interface CreditNoteSubCategoryGroup {
  name: string;
  totalQty: number;
  sellingPrice: number;
  totalValueExclTax: number;
  totalDiscount: number;
  totalSalesTax: number;
  totalAddTax: number;
  totalTaxPayable: number;
  totalValueInclTax: number;
  products: CreditNoteProductGroup[];
}

interface CreditNoteCategoryGroup {
  name: string;
  totalQty: number;
  sellingPrice: number;
  totalValueExclTax: number;
  totalDiscount: number;
  totalSalesTax: number;
  totalAddTax: number;
  totalTaxPayable: number;
  totalValueInclTax: number;
  subCategories: CreditNoteSubCategoryGroup[];
}

function groupCreditNoteItems(items: any[]): CreditNoteCategoryGroup[] {
  if (!items || items.length === 0) return [];
  const categoryMap = new Map<string, CreditNoteCategoryGroup>();

  items.forEach((item: any) => {
    const itemObj = item.item || {};
    const catName = (itemObj.category?.name || item.categoryName || 'GENERAL').toUpperCase();
    const subCatName = (itemObj.brand?.name || itemObj.subCategory?.name || item.brandName || 'YOUNG ATHLETES').toUpperCase();
    const sku = itemObj.sku || item.sku || 'N/A';
    const description = itemObj.description || item.description || 'N/A';
    const color = itemObj.color?.name || item.color || '';
    const size = itemObj.size?.name || itemObj.size?.code || item.size || 'N/A';

    const qty = Number(item.returnQty || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const originalInvoiceItem = item.salesInvoiceItem;
    
    const rate = Number(itemObj.taxRate1 || 18);
    
    const originalItemQty = Number(originalInvoiceItem?.quantity || 1);
    const originalItemDiscount = Number(originalInvoiceItem?.discount || 0);
    const discountPerUnit = originalItemQty > 0 ? (originalItemDiscount / originalItemQty) : 0;
    const discount = discountPerUnit * qty;

    const wostUnitPrice = unitPrice / (1 + rate / 100);
    const wostTotal = wostUnitPrice * qty;

    const valueExclTax = Math.max(0, wostTotal - discount);
    const salesTax = (valueExclTax * rate) / 100;
    const addTax = 0;
    const taxPayable = salesTax + addTax;

    const valueInclTax = valueExclTax + taxPayable;

    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, {
        name: catName, totalQty: 0, sellingPrice: 0, totalValueExclTax: 0, totalDiscount: 0,
        totalSalesTax: 0, totalAddTax: 0, totalTaxPayable: 0, totalValueInclTax: 0, subCategories: [],
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
        name: subCatName, totalQty: 0, sellingPrice: 0, totalValueExclTax: 0, totalDiscount: 0,
        totalSalesTax: 0, totalAddTax: 0, totalTaxPayable: 0, totalValueInclTax: 0, products: [],
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

    let prodGroup = subGroup.products.find((p) => p.sku === sku && p.description === description && p.sellingPrice === unitPrice);
    if (!prodGroup) {
      prodGroup = {
        sku, description, sellingPrice: unitPrice, totalQty: 0, totalValueExclTax: 0, totalDiscount: 0,
        totalSalesTax: 0, totalAddTax: 0, totalTaxPayable: 0, totalValueInclTax: 0, items: [],
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
      color, size, qty, sellingPrice: unitPrice, valueExclTax, discount, salesTax, addTax, taxPayable, valueInclTax,
    });
  });

  return Array.from(categoryMap.values());
}

export default function CreditNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCreditNote();
  }, [resolvedParams.id]);

  const loadCreditNote = async () => {
    try {
      setLoading(true);
      const data = await creditNoteApi.getById(resolvedParams.id);
      setCreditNote(data);
    } catch (error) {
      console.error('Error loading credit note:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading credit note...</div>;
  }

  if (!creditNote) {
    return <div className="p-6 text-center text-red-600">Credit note not found</div>;
  }

  const groupedData = creditNote.salesReturn?.items ? groupCreditNoteItems(creditNote.salesReturn.items) : [];

  const grandQty = groupedData.reduce((acc, cat) => acc + cat.totalQty, 0);
  const grandExclTax = groupedData.reduce((acc, cat) => acc + cat.totalValueExclTax, 0);
  const grandDiscount = groupedData.reduce((acc, cat) => acc + cat.totalDiscount, 0);
  const grandSalesTax = groupedData.reduce((acc, cat) => acc + cat.totalSalesTax, 0);
  const grandAddTax = groupedData.reduce((acc, cat) => acc + cat.totalAddTax, 0);
  const grandTaxPayable = groupedData.reduce((acc, cat) => acc + cat.totalTaxPayable, 0);
  const creditNoteGrandTotal = Number(creditNote.amount) || groupedData.reduce((acc, cat) => acc + cat.totalValueInclTax, 0);

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
              size: auto;
              margin: 8mm;
            }
            header, nav, footer, aside, .banner {
              display: none !important;
            }
          }
        `}</style>

        <div className="p-6 space-y-6 print:hidden">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/erp/sales/credit-notes" transitionTypes={["nav-back"]}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{creditNote.creditNoteNo}</h1>
                <p className="text-gray-600">Credit Note Details</p>
              </div>
            </div>
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1" /> Print Credit Note
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Credit Note Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Credit Note #:</span>
                  <span className="font-semibold">{creditNote.creditNoteNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span>{creditNote.customer?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span>{formatDate(creditNote.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge className="bg-green-100 text-green-800">{creditNote.status}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Amount & Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Credit Amount:</span>
                  <span className="text-green-600">{formatCurrency(creditNote.amount)}</span>
                </div>
                {creditNote.salesReturn && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Source Sales Return:</span>
                    <Link href={`/erp/sales/sales-returns/${creditNote.salesReturn.id}`} className="text-blue-600 underline">
                      {creditNote.salesReturn.returnNumber}
                    </Link>
                  </div>
                )}
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
              <h2 className="text-base font-bold">Credit Note</h2>
              <p className="text-[10px] text-gray-700 leading-tight mt-0.5">
                Office No. 01 | 1st Floor | Services Club Extension Building | Merewether<br />
                Road | Karachi - 75520 | Pakistan. Tel +922135652161 | Fax +922135652166
              </p>
            </div>

            {/* Top Right FY */}
            <div className="w-[28%] text-right text-xs font-bold">
              <span>Financial Year :</span> {getFinancialYear(creditNote.createdAt || creditNote.date)}
            </div>
          </div>

          <div className="border-b-2 border-black mb-2"></div>

          {/* Sub-Header Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs font-sans mb-3">
            {/* Left Side */}
            <div className="space-y-0.5 whitespace-nowrap">
              <div><span className="font-bold inline-block w-32">Credit Note No :</span> {creditNote.creditNoteNo}</div>
              <div><span className="font-bold inline-block w-32">Credit Note Date :</span> {formatDateDisplay(creditNote.createdAt || creditNote.date)}</div>
              <div><span className="font-bold inline-block w-32">Customer Name :</span> {creditNote.customer?.name || 'N/A'}</div>
              <AddressDisplay address={creditNote.customer?.deliveryAddress || creditNote.customer?.address} label="Address :" labelWidth="w-32" />
              <div><span className="font-bold inline-block w-32">Remarks :</span> {creditNote.salesReturn?.reason || creditNote.salesReturn?.notes || '—'}</div>
            </div>

            {/* Right Side */}
            <div className="space-y-0.5 text-right md:text-left">
              <div><span className="font-bold inline-block w-40">Sales Tax Invoice No :</span> {creditNote.salesInvoice?.invoiceNo || '—'}</div>
              <div><span className="font-bold inline-block w-40">STI Date :</span> {formatDateDisplay(creditNote.salesInvoice?.invoiceDate || creditNote.createdAt)}</div>
              <div><span className="font-bold inline-block w-40">GST No. :</span> {creditNote.customer?.strn || creditNote.customer?.gstNo || '—'}</div>
              <div><span className="font-bold inline-block w-40">NTN No. :</span> {creditNote.customer?.ntn || '—'}</div>
            </div>
          </div>

          <div className="border-b-2 border-black mb-2"></div>

            {groupedData.length > 0 && (
              <table className="w-full text-[10px] font-sans border-collapse mb-4">
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
                            <td className="py-1 text-right">{formatNumber(Math.round(sub.totalQty))}</td>
                            <td className="py-1 text-right">{sub.sellingPrice ? formatNumber(Math.round(sub.sellingPrice)) : ''}</td>
                            <td className="py-1 text-right">{formatNumber(Math.round(sub.totalValueExclTax))}</td>
                            <td className="py-1 text-right">{formatNumber(Math.round(sub.totalDiscount))}</td>
                            <td className="py-1 text-right">{formatNumber(Math.round(sub.totalSalesTax))}</td>
                            <td className="py-1 text-right">{formatNumber(Math.round(sub.totalAddTax))}</td>
                            <td className="py-1 text-right">{formatNumber(Math.round(sub.totalTaxPayable))}</td>
                            <td className="py-1 text-right">{formatNumber(Math.round(sub.totalValueInclTax))}</td>
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
                                <td className="py-0.5 text-right">{formatNumber(Math.round(prod.totalQty))}</td>
                                <td className="py-0.5 text-right">{formatNumber(Math.round(prod.sellingPrice))}</td>
                                <td className="py-0.5 text-right">{formatNumber(Math.round(prod.totalValueExclTax))}</td>
                                <td className="py-0.5 text-right">{formatNumber(Math.round(prod.totalDiscount))}</td>
                                <td className="py-0.5 text-right">{formatNumber(Math.round(prod.totalSalesTax))}</td>
                                <td className="py-0.5 text-right">{formatNumber(Math.round(prod.totalAddTax))}</td>
                                <td className="py-0.5 text-right">{formatNumber(Math.round(prod.totalTaxPayable))}</td>
                                <td className="py-0.5 text-right">{formatNumber(Math.round(prod.totalValueInclTax))}</td>
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
                                  <td className="py-0.5 text-right">{formatNumber(Math.round(it.qty))}</td>
                                  <td className="py-0.5 text-right">{formatNumber(Math.round(it.sellingPrice))}</td>
                                  <td className="py-0.5 text-right">{formatNumber(Math.round(it.valueExclTax))}</td>
                                  <td className="py-0.5 text-right">{formatNumber(Math.round(it.discount))}</td>
                                  <td className="py-0.5 text-right">{formatNumber(Math.round(it.salesTax))}</td>
                                  <td className="py-0.5 text-right">{formatNumber(Math.round(it.addTax))}</td>
                                  <td className="py-0.5 text-right">{formatNumber(Math.round(it.taxPayable))}</td>
                                  <td className="py-0.5 text-right">{formatNumber(Math.round(it.valueInclTax))}</td>
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
                    <td className="py-2 text-right border-b-2 border-black" style={{ borderBottomStyle: 'double' }}>{formatNumber(Math.round(grandQty))}</td>
                    <td className="py-2 text-right"></td>
                    <td className="py-2 text-right border-b-2 border-black" style={{ borderBottomStyle: 'double' }}>{formatNumber(Math.round(grandExclTax))}</td>
                    <td className="py-2 text-right border-b-2 border-black" style={{ borderBottomStyle: 'double' }}>{formatNumber(Math.round(grandDiscount))}</td>
                    <td className="py-2 text-right border-b-2 border-black" style={{ borderBottomStyle: 'double' }}>{formatNumber(Math.round(grandSalesTax))}</td>
                    <td className="py-2 text-right border-b-2 border-black" style={{ borderBottomStyle: 'double' }}>{formatNumber(Math.round(grandAddTax))}</td>
                    <td className="py-2 text-right border-b-2 border-black" style={{ borderBottomStyle: 'double' }}>{formatNumber(Math.round(grandTaxPayable))}</td>
                    <td className="py-2 text-right border-b-2 border-black" style={{ borderBottomStyle: 'double' }}>{formatNumber(Math.round(creditNoteGrandTotal))}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            <div className="mt-12 pt-4 text-center text-xs text-gray-600 print:fixed print:bottom-8 print:left-0 print:w-full">
              Please note: This invoice is system-generated and does not require a signature or company stamp.
            </div>
          </div>
        </div>
      </>
    </PermissionGuard>
  );
}
