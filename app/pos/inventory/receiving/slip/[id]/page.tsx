"use client";

import React, { useEffect, useState } from "react";
import { getTransferRequests } from "@/lib/actions/transfer-request";
import { format } from "date-fns";
import { 
    Printer, 
    ArrowLeft, 
    PackageCheck, 
    Calendar, 
    Clock, 
    Truck, 
    MapPin,
    Barcode,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReceivingSlipPage({ params }: { params: { id: string } }) {
    const [request, setRequest] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRequest = async () => {
            try {
                const res = await getTransferRequests({ id: params.id });
                if (res.status && res.data && res.data.length > 0) {
                    setRequest(res.data[0]);
                }
            } catch (error) {
                console.error("Failed to fetch slip details", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRequest();
    }, [params.id]);

    if (isLoading) {
        return (
            <div className="p-8 max-w-4xl mx-auto space-y-6">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <div className="grid grid-cols-2 gap-6">
                    <Skeleton className="h-32 w-full rounded-2xl" />
                    <Skeleton className="h-32 w-full rounded-2xl" />
                </div>
                <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
        );
    }

    if (!request) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="bg-white p-12 rounded-3xl shadow-xl flex flex-col items-center">
                    <div className="bg-red-50 p-4 rounded-full mb-6">
                        <PackageCheck className="h-12 w-12 text-red-500" />
                    </div>
                    <p className="text-2xl font-black text-gray-900 mb-2">Slip Not Found</p>
                    <p className="text-gray-500 mb-8">The transfer request you are looking for does not exist.</p>
                    <Button onClick={() => window.close()} size="lg" className="rounded-xl px-8">Close Window</Button>
                </div>
            </div>
        );
    }

    const totalQty = (request.items || []).reduce((sum: number, i: any) => sum + Number(i.quantity || 0), 0);
    const sourceName = request.fromWarehouse?.name || request.warehouse?.name || request.sourceWarehouse?.name || request.fromLocation?.name || "LOGISTIC AREA";
    const destName = request.toWarehouse?.name || request.toLocation?.name || "THIS LOCATION";
    
    // Status styling
    const isCompleted = request.status === 'RECEIVED' || request.status === 'COMPLETED';

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans print:bg-white print:p-0 selection:bg-black selection:text-white">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { margin: 0; size: A4 portrait; }
                    body { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                        background: white !important;
                    }
                    /* Ensure backgrounds and shadows are printed if possible */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Hide scrollbars during print */
                    ::-webkit-scrollbar { display: none; }
                }
            ` }} />
            
            {/* Action Bar */}
            <div className="max-w-[21cm] mx-auto mb-6 flex justify-between items-center print:hidden bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-200 backdrop-blur-xl bg-white/80 sticky top-4 z-50">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => window.close()} className="rounded-full hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="font-bold text-gray-900 leading-none">Slip Preview</h2>
                        <p className="text-xs text-gray-500 mt-1">A4 Printable Format</p>
                    </div>
                </div>
                <Button onClick={() => window.print()} className="bg-black hover:bg-gray-800 text-white rounded-xl shadow-lg shadow-black/10 px-6">
                    <Printer className="h-4 w-4 mr-2" /> Print Slip
                </Button>
            </div>

            {/* Printable Paper Area (A4 dimensions roughly) */}
            <div className="max-w-[21cm] mx-auto bg-white shadow-2xl rounded-3xl border border-gray-100 overflow-hidden relative print:shadow-none print:border-none print:rounded-none">
                
                {/* Decorative Top Bar */}
                <div className="h-3 w-full bg-black print:bg-black absolute top-0 left-0 right-0"></div>

                <div className="p-10 sm:p-14 mt-2 relative z-10">
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-gray-100 pb-10 mb-10 gap-8">
                        <div className="flex items-center gap-6">
                            <div className="bg-black text-white p-5 rounded-2xl shadow-xl shadow-black/10 print:bg-black print:text-white">
                                <PackageCheck className="h-10 w-10" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-1">
                                    Receiving Slip
                                </h1>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold tracking-widest text-gray-400 uppercase">Speed HRM POS</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                    <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                        {request.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end">
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col items-end w-48 shadow-sm">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">
                                    <Barcode className="h-4 w-4" /> Transfer No
                                </div>
                                <div className="text-2xl font-mono font-black text-black tracking-tight">{request.requestNo}</div>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500 font-medium mt-4">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    {format(new Date(request.createdAt), "dd MMM yyyy")}
                                </div>
                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    {format(new Date(request.createdAt), "HH:mm")}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Warehouses Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        {/* Source */}
                        <div className="bg-gray-50/80 rounded-3xl p-6 border border-gray-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Truck className="h-24 w-24" />
                            </div>
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <div className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-100">
                                    <Truck className="h-5 w-5 text-black" />
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Dispatched From</h3>
                            </div>
                            <p className="text-2xl font-bold text-black leading-tight relative z-10">{sourceName}</p>
                        </div>
                        
                        {/* Destination */}
                        <div className="bg-gray-50/80 rounded-3xl p-6 border border-gray-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <MapPin className="h-24 w-24" />
                            </div>
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <div className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-100">
                                    <MapPin className="h-5 w-5 text-black" />
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Receiving At</h3>
                            </div>
                            <p className="text-2xl font-bold text-black leading-tight relative z-10">{destName}</p>
                        </div>
                    </div>

                    {/* Items Table Section */}
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-4">
                            <h3 className="text-lg font-black text-black uppercase tracking-wider">Itemized Breakdown</h3>
                            <div className="h-px bg-gray-200 flex-1"></div>
                        </div>
                        
                        <div className="border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-200">
                                        <th className="py-4 px-6 font-black text-gray-500 text-xs uppercase tracking-widest w-16">#</th>
                                        <th className="py-4 px-6 font-black text-gray-500 text-xs uppercase tracking-widest">Description</th>
                                        <th className="py-4 px-6 font-black text-gray-500 text-xs uppercase tracking-widest w-40">SKU / Code</th>
                                        <th className="py-4 px-6 font-black text-gray-500 text-xs uppercase tracking-widest text-right w-32">Qty</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {request.items?.map((item: any, index: number) => (
                                        <tr key={index} className="hover:bg-gray-50/50 transition-colors bg-white">
                                            <td className="py-5 px-6 text-gray-400 font-bold text-sm">{String(index + 1).padStart(2, '0')}</td>
                                            <td className="py-5 px-6">
                                                <div className="font-bold text-gray-900 text-base leading-tight">
                                                    {item.item?.description || "Unknown Item"}
                                                </div>
                                                {item.item?.brand?.name && (
                                                    <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-gray-100 text-gray-600 mt-2">
                                                        {item.item.brand.name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-5 px-6 text-gray-600 font-mono text-sm">{item.item?.sku || "N/A"}</td>
                                            <td className="py-5 px-6 text-right">
                                                <span className="font-black text-black text-lg bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">{item.quantity}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary / Totals */}
                    <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
                        {/* Terms or Notes */}
                        <div className="flex-1 text-sm text-gray-500">
                            {request.remarks || request.notes ? (
                                <>
                                    <p className="font-bold text-gray-900 mb-1">Important Notes:</p>
                                    <p className="leading-relaxed text-gray-500 max-w-sm whitespace-pre-wrap">
                                        {request.remarks || request.notes}
                                    </p>
                                </>
                            ) : null}
                        </div>
                        
                        {/* Total Box */}
                        <div className="bg-black text-white rounded-3xl p-8 w-full md:w-80 shadow-2xl shadow-black/20 print:bg-black print:text-white relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 opacity-10">
                                <PackageCheck className="w-40 h-40" />
                            </div>
                            <div className="relative z-10 flex flex-col items-center">
                                <span className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Total Items Shipped</span>
                                <div className="text-5xl font-black tracking-tighter mb-4">{totalQty}</div>
                                <div className="h-px w-full bg-white/20 mb-4"></div>
                                <span className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                                    {request.items?.length || 0} Unique SKUs
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Signatures Area */}
                    <div className="grid grid-cols-2 gap-16 mt-16 pt-12 border-t-2 border-dashed border-gray-200">
                        <div className="flex flex-col items-center">
                            <div className="w-full border-b border-gray-300 mb-3"></div>
                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Dispatched By</span>
                            <span className="text-[10px] text-gray-400 mt-1">Signature & Date</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-full border-b border-gray-300 mb-3"></div>
                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Received By</span>
                            <span className="text-[10px] text-gray-400 mt-1">Signature & Date</span>
                        </div>
                    </div>
                    
                    {/* Watermark / Footer */}
                    <div className="mt-16 text-center">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                            Generated by Speed HRM Point of Sale
                        </p>
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1">
                            Printed on {format(new Date(), "dd MMM yyyy 'at' HH:mm:ss")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
