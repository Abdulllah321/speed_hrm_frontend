'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Grn } from '@/lib/api';
import { getGrn } from '@/lib/actions/grn';
import { ArrowLeft } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { Printer, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function GrnDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [grn, setGrn] = useState<Grn | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getGrn(id);
        setGrn(data);
      } catch (error) {
        console.error('Failed to load GRN:', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  if (loading) return <div className="p-0">Loading...</div>;
  if (!grn) return <div className="p-0">Not found</div>;

  return (
    <PermissionGuard permissions="erp.procurement.grn.read">
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

      {/* Dashboard View */}
      <div className="p-6 space-y-6 max-w-5xl mx-auto print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/erp/procurement/grn" transitionTypes={["nav-back"]}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{grn.grnNumber}</h1>
            <p className="text-muted-foreground">
              PO: {grn.purchaseOrder?.poNumber || 'N/A'} • {new Date(grn.receivedDate).toLocaleDateString()}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Badge variant={grn.status === 'SUBMITTED' ? 'default' : 'secondary'} className="text-lg px-3 py-1">
              {grn.status}
            </Badge>
            <Button onClick={() => window.print()} variant="outline" className="gap-2">
                <Printer className="h-4 w-4" /> Print GRN
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">GRN Number</div>
              <div className="font-medium">{grn.grnNumber}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">PO Number</div>
              <div className="font-medium">{grn.purchaseOrder?.poNumber || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Warehouse</div>
              <div className="font-medium">{grn.warehouse?.name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Received Date</div>
              <div className="font-medium">{new Date(grn.receivedDate).toLocaleDateString()}</div>
            </div>
            <div className="md:col-span-4">
              <div className="text-sm text-muted-foreground">Notes</div>
              <div className="font-medium">{grn.notes || '-'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Received Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grn.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">No items</TableCell>
                  </TableRow>
                ) : (
                  grn.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-mono text-sm">{it.item?.itemId || it.itemId}</TableCell>
                      <TableCell>{it.description || '-'}</TableCell>
                      <TableCell className="text-right">{it.receivedQty}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
                    <div className="bg-[#eef2f6] text-black w-full text-center py-2 text-xl sm:text-xl font-bold  print:bg-[#eef2f6] [-webkit-print-color-adjust:exact] [color-adjust:exact]">
                      Goods Receipt Note
                    </div>
                  </div>

                  {/* Details Box */}
                  <div className="w-[45%] bg-[#f8fafc] text-xs sm:text-[13px] p-2 border border-gray-300 print:bg-[#f8fafc] [-webkit-print-color-adjust:exact] [color-adjust:exact] flex flex-col justify-center">
                     <div className="flex justify-between mb-2">
                       <span className="font-bold">GRN Number:</span>
                       <span className="font-bold">{grn.grnNumber}</span>
                     </div>
                     <div className="flex justify-between mb-2">
                       <span className="font-bold">PO Number:</span>
                       <span>{grn.purchaseOrder?.poNumber || 'N/A'}</span>
                     </div>
                     <div className="flex justify-between">
                       <div className="flex gap-2">
                         <span className="font-bold">Date:</span>
                         <span>{new Date(grn.receivedDate).toLocaleDateString('en-GB')}</span>
                       </div>
                     </div>
                  </div>
              </div>

              {/* Warehouse / Ship To Box */}
              <div className="flex gap-4 mb-4 text-xs sm:text-[13px]">
                  <div className="w-1/2 p-2 border border-gray-300 flex flex-col justify-center">
                      <div className="font-bold border-b border-gray-300 mb-2 pb-1">Warehouse</div>
                      <div className="flex gap-2 mb-1"><span className="font-bold w-16 shrink-0">Name:</span> <span>{grn.warehouse?.name || 'N/A'}</span></div>
                      <div className="flex gap-2"><span className="font-bold w-16 shrink-0">Location:</span> <span>Speed Limit ERP Location</span></div>
                  </div>
                  <div className="w-1/2 p-2 border border-gray-300 flex flex-col justify-center">
                      <div className="font-bold border-b border-gray-300 mb-2 pb-1">Ship To</div>
                      <div className="flex gap-2 mb-1"><span className="font-bold w-16 shrink-0">Name:</span> <span>Speed Limit Warehouse</span></div>
                      <div className="flex gap-2"><span className="font-bold w-16 shrink-0">Address:</span> <span>Main Warehouse, Plot #45, Industrial Area, Karachi, Pakistan</span></div>
                  </div>
              </div>

              {/* Table */}
              <table className="w-full text-xs sm:text-[13px] mb-4 border-collapse table-fixed">
                  <thead>
                    <tr className="border-y-2 border-black">
                      <th className="py-2 pr-2 text-left font-bold w-[60%]">Item Details</th>
                      <th className="py-2 pr-2 text-right font-bold w-[40%]">Received Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grn.items && grn.items.length > 0 ? (
                      grn.items.map((item, i) => (
                        <tr key={item.id || i} className="border-b border-gray-300 align-top">
                          <td className="py-2 pr-2 overflow-hidden text-ellipsis">
                            <div className="font-medium">{item.item?.itemId || item.itemId}</div>
                            <div className="text-gray-700">{item.description || '-'}</div>
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums font-bold">
                            {parseFloat(item.receivedQty as any).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                          <td colSpan={2} className="py-4 text-center text-muted-foreground border-b border-gray-300">
                              No items found for this GRN
                          </td>
                      </tr>
                    )}
                  </tbody>
              </table>

              {/* Remarks */}
              <div className="mt-4 mb-8">
                  <div className="font-bold text-xs sm:text-[14px]">Notes & Instructions</div>
                  <p className="text-xs sm:text-[13px] mt-1 text-gray-700 whitespace-pre-wrap">{grn.notes || "N/A"}</p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-3">
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