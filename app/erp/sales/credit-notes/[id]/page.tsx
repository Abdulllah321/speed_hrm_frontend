'use client';

import { useState, useEffect, use } from 'react';
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
              margin: 0;
              size: auto;
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

        {/* Print Layout */}
        <div id="print-section" className="hidden print:block min-h-screen bg-white p-0">
          <div className="w-full max-w-[1000px] mx-auto bg-white text-black p-8 font-sans print:p-8 box-border">
            <div className="flex justify-between mb-6 gap-4 items-start">
              <div className="w-[20%] flex flex-col items-start justify-center">
                <img src="/image.png" alt="Logo" className="w-32 object-contain" />
              </div>
              <div className="w-[35%] text-center py-2 text-xl font-bold bg-[#eef2f6]">
                CREDIT NOTE
              </div>
              <div className="w-[45%] bg-[#f8fafc] text-xs p-2 border border-gray-300">
                <div className="flex justify-between mb-1 font-bold">
                  <span>Credit Note #:</span>
                  <span>{creditNote.creditNoteNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{formatDate(creditNote.date)}</span>
                </div>
                {creditNote.salesReturn && (
                  <div className="flex justify-between mt-1 pt-1 border-t">
                    <span>Sales Return #:</span>
                    <span>{creditNote.salesReturn.returnNumber}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border border-gray-300 mb-6 text-sm">
              <div className="font-bold border-b pb-2 mb-2">Customer Details</div>
              <div><span className="font-semibold">Customer Name:</span> {creditNote.customer?.name}</div>
            </div>

            <div className="p-4 border border-gray-400 bg-gray-50 flex justify-between items-center text-lg font-bold">
              <span>TOTAL CREDIT AMOUNT:</span>
              <span className="text-xl" style={{ borderBottom: '3px double black' }}>
                PKR {fmtInt(Number(creditNote.amount))}
              </span>
            </div>
          </div>
        </div>
      </>
    </PermissionGuard>
  );
}
