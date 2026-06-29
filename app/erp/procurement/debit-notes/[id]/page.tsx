'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, ArrowLeft } from 'lucide-react';
import { debitNoteApi, DebitNote } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PermissionGuard } from "@/components/auth/permission-guard";

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

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function DebitNoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [note, setNote] = useState<DebitNote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadNote();
  }, [id]);

  const loadNote = async () => {
    try {
      setLoading(true);
      const data = await debitNoteApi.getById(id as string);
      setNote(data);
    } catch (error) {
      console.error('Error loading debit note:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading debit note...</div>;
  if (!note) return <div className="p-6 text-center">Debit note not found</div>;

  return (
    <PermissionGuard permissions="erp.procurement.dn.read">
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

        <div className="p-6 space-y-6 max-w-4xl mx-auto print:hidden">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print Debit Note
            </Button>
          </div>

          <div className="bg-white p-8 border rounded-lg shadow-sm">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-6 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-red-600">DEBIT NOTE</h1>
                <p className="text-gray-500 mt-1">Ref No: {note.debitNoteNo}</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold">Speed Limit</h2>
                <p className="text-gray-600 text-sm">Industrial Area, Karachi</p>
                <p className="text-gray-600 text-sm">NTN: 1234567-8</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Debit To:</h3>
                <div className="space-y-1">
                  <p className="font-bold text-lg">{note.supplier?.name}</p>
                  <p className="text-gray-600">{note.supplier?.code}</p>
                  <p className="text-gray-600">{note.supplier?.address || 'Pakistan'}</p>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Details:</h3>
                <div className="space-y-1">
                  <p><span className="text-gray-500">Date:</span> {formatDate(note.date)}</p>
                  <p>
                    <span className="text-gray-500">Status:</span>{' '}
                    <Badge className={statusColors[note.status as keyof typeof statusColors]}>
                      {note.status}
                    </Badge>
                  </p>
                  {note.purchaseInvoice && (
                    <p><span className="text-gray-500">Against Invoice:</span> {note.purchaseInvoice.invoiceNumber}</p>
                  )}
                  {note.purchaseReturn && (
                    <p><span className="text-gray-500">Against Return:</span> {note.purchaseReturn.returnNumber}</p>
                  )}
                  {note.purchaseReturn?.staxEInvoiceNumber && (
                    <p><span className="text-gray-500">STax e-Inv #:</span> {note.purchaseReturn.staxEInvoiceNumber}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 p-6 rounded-lg border mb-8">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-700">Total Adjustment Amount:</span>
                <span className="text-2xl font-bold text-red-600">{formatCurrency(note.amount)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2 italic">
                Note: This amount has been debited to your account against the goods returned.
              </p>
            </div>

            {/* Breakdown */}
            {note.purchaseReturn?.items && note.purchaseReturn.items.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-lg font-bold mb-4">Return Items Details</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="text-left p-2">Item</th>
                                <th className="text-right p-2">Qty</th>
                                <th className="text-right p-2">Unit Price</th>
                                <th className="text-right p-2">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {note.purchaseReturn.items.map((item: any) => (
                                <tr key={item.id} className="border-b">
                                    <td className="p-2">{item.description || item.item?.description || 'Item'}</td>
                                    <td className="p-2 text-right">{item.returnQty}</td>
                                    <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                                    <td className="p-2 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-16 flex justify-between border-t pt-8">
              <div className="text-center w-40">
                <div className="border-t border-dashed pt-2 text-xs text-gray-500">Prepared By</div>
              </div>
              <div className="text-center w-40">
                <div className="border-t border-dashed pt-2 text-xs text-gray-500">Authorized Signature</div>
              </div>
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
                      <div className="bg-[#eef2f6] text-black w-full text-center py-2 text-xl sm:text-xl font-bold print:bg-[#eef2f6] [-webkit-print-color-adjust:exact] [color-adjust:exact]">
                        Debit Note
                      </div>
                    </div>

                    {/* Details Box */}
                    <div className="w-[45%] bg-[#f8fafc] text-xs sm:text-[13px] p-2 border border-gray-300 print:bg-[#f8fafc] [-webkit-print-color-adjust:exact] [color-adjust:exact] flex flex-col justify-center">
                       <div className="flex justify-between mb-2">
                          <span className="font-bold">Debit Note Number:</span>
                          <span className="font-bold">{note.debitNoteNo}</span>
                       </div>
                       <div className="flex justify-between mb-2">
                          <div className="flex gap-2">
                            <span className="font-bold">Date:</span>
                            <span>{formatDate(note.date)}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-bold">Status:</span>
                            <span>{note.status}</span>
                          </div>
                       </div>
                       {note.purchaseReturn?.returnNumber && (
                          <div className="flex justify-between mb-2">
                             <span className="font-bold">Against Return #:</span>
                             <span>{note.purchaseReturn.returnNumber}</span>
                          </div>
                       )}
                       {note.purchaseInvoice?.invoiceNumber && (
                          <div className="flex justify-between mb-2">
                             <span className="font-bold">Against Invoice #:</span>
                             <span>{note.purchaseInvoice.invoiceNumber}</span>
                          </div>
                       )}
                       {note.purchaseReturn?.staxEInvoiceNumber && (
                          <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
                             <span className="font-bold">STax e-Inv #:</span>
                             <span>{note.purchaseReturn.staxEInvoiceNumber}</span>
                          </div>
                       )}
                    </div>
                </div>

                {/* Vendor / Ship To Box */}
                <div className="flex gap-4 mb-4 text-xs sm:text-[13px]">
                    <div className="w-1/2 p-2 border border-gray-300 flex flex-col justify-center">
                        <div className="font-bold border-b border-gray-300 mb-2 pb-1">Supplier Details</div>
                        <div className="flex gap-2 mb-1"><span className="font-bold w-16 shrink-0">Name:</span> <span>{note.supplier?.name || 'N/A'}</span></div>
                        <div className="flex gap-2 mb-1"><span className="font-bold w-16 shrink-0">Code:</span> <span>{note.supplier?.code || 'N/A'}</span></div>
                    </div>
                    <div className="w-1/2 p-2 border border-gray-300 flex flex-col justify-center">
                        <div className="font-bold border-b border-gray-300 mb-2 pb-1">Warehouse</div>
                        <div className="flex gap-2 mb-1"><span className="font-bold w-16 shrink-0">Name:</span> <span>{note.purchaseReturn?.warehouse?.name || 'N/A'}</span></div>
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
                      {note.purchaseReturn?.items && note.purchaseReturn.items.length > 0 ? (
                        note.purchaseReturn.items.map((item: any, i: number) => {
                          const advRate  = Number(note.purchaseInvoice?.advanceTaxRate || note.purchaseReturn?.purchaseInvoice?.advanceTaxRate || 0.5);
                          const qty      = Number(item.returnQty      || 0);
                          const unitCost = Number(item.unitPrice     || 0);
                          
                          const discRate = Number(item.purchaseInvoiceItem?.discountRate  || 0);
                          const discAmt  = qty * unitCost * discRate / 100;
                          const valExcl  = qty * unitCost - discAmt;
                          
                          const taxRate  = Number(item.purchaseInvoiceItem?.taxRate       || 0);
                          const taxAmt   = valExcl * taxRate / 100;
                          const valIncl  = valExcl + taxAmt;
                          
                          const itemAdv  = valIncl * advRate / 100;
                          const lineTotal = valIncl + itemAdv;

                          return (
                            <tr key={item.id || i} className="border-b border-gray-300 align-top">
                              <td className="py-1 pr-1 tabular-nums">{i + 1}</td>
                              <td className="py-1 pr-1 font-mono font-bold">{item.item?.sku || item.sku || '—'}</td>
                              <td className="py-1 pr-1 font-mono text-gray-500">{item.item?.hsCodeStr || '—'}</td>
                              <td className="py-1 pr-1 text-gray-800">
                                <div>{item.description || item.item?.description || '—'}</div>
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
                        })
                      ) : (
                        <tr>
                            <td colSpan={11} className="py-4 text-center text-muted-foreground border-b border-gray-300">
                                No items found for this debit note
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
                            <span className="underline decoration-1 underline-offset-2 break-words">{numberToWords(Number(note.amount || 0))}</span>
                        </div>
                    </div>
                    <div className="w-[45%] flex flex-col space-y-1 text-right">
                        {(() => {
                          const advRate  = Number(note.purchaseInvoice?.advanceTaxRate || note.purchaseReturn?.purchaseInvoice?.advanceTaxRate || 0.5);
                          const subtotal = Number(note.purchaseReturn?.subtotal || 0);
                          const salesTax = Number(note.purchaseReturn?.taxAmount || 0);
                          const total    = Number(note.amount || 0);
                          
                          let totalQty = 0;
                          let totalDiscount = 0;
                          let totalAdvTax = 0;
                          
                          (note.purchaseReturn?.items || []).forEach((item: any) => {
                            const qty      = Number(item.returnQty      || 0);
                            const unitCost = Number(item.unitPrice     || 0);
                            const discRate = Number(item.purchaseInvoiceItem?.discountRate  || 0);
                            const discAmt  = qty * unitCost * discRate / 100;
                            const valExcl  = qty * unitCost - discAmt;
                            const taxRate  = Number(item.purchaseInvoiceItem?.taxRate       || 0);
                            const taxAmt   = valExcl * taxRate / 100;
                            const valIncl  = valExcl + taxAmt;
                            const itemAdv  = valIncl * advRate / 100;
                            
                            totalQty += qty;
                            totalDiscount += discAmt;
                            totalAdvTax += itemAdv;
                          });
                          
                          const valExcl = subtotal - totalDiscount;
                          const valIncl = valExcl + salesTax;

                          return (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Total QTY:</span>
                                <span className="tabular-nums font-medium">{fmtInt(totalQty)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Subtotal (Gross):</span>
                                <span className="tabular-nums font-medium">{fmtInt(subtotal)}</span>
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
                                <span className="tabular-nums font-medium">{fmtInt(salesTax)}</span>
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
                                <span>Total Adjustment Amount:</span>
                                <span className="tabular-nums font-bold" style={{ borderBottom: '3px double black' }}>{fmtInt(total)}</span>
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
