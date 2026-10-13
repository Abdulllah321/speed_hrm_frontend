'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import { getTransferRequests } from '@/lib/actions/transfer-request';

interface TransferSlip {
    id: string;
    requestNo: string;
    status: string;
    transferType: string;
    createdAt: string;
    approvedAt?: string;
    fromWarehouse?: { name: string; code: string };
    toWarehouse?: { name: string; code: string };
    fromLocation?: { name: string; code: string };
    toLocation?: { name: string; code: string };
    brand?: { name: string };
    creatorName?: string;
    checkerName?: string;
    authorizerName?: string;
    checkedAt?: string;
    authorizedAt?: string;
    notes?: string;
    items: Array<{
        id: string;
        quantity: number;
        item: {
            sku: string;
            description: string;
            unitPrice?: number;
            retailPrice?: number;
            brand?: { name: string } | string | null;
            brandName?: string;
            category?: { name: string } | null;
            color?: { name: string } | null;
            size?: { name: string } | null;
        };
    }>;
    claim?: {
        claimNo: string;
        claimType: string;
        reviewNotes?: string;
        reasonNotes?: string;
        reasonCode?: string;
    };
}

export default function ClaimTransferSlipPage() {
    const params = useParams();
    const router = useRouter();
    const rawId = (params?.id as string) || '';
    const id = rawId ? rawId.replace(/^\/+/, '') : '';

    const [transfer, setTransfer] = useState<TransferSlip | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadTransferSlip();
        }
    }, [id]);

    const loadTransferSlip = async () => {
        setLoading(true);
        try {
            const result = await getTransferRequests({ id });

            if (result.status && result.data) {
                const found = Array.isArray(result.data)
                    ? result.data.find((t: any) => t.id === id) || result.data[0]
                    : result.data;

                if (found) {
                    setTransfer(found);
                } else {
                    toast.error('Transfer slip not found');
                }
            } else {
                toast.error('Transfer slip not found');
            }
        } catch (error) {
            console.error('Failed to load transfer slip:', error);
            toast.error('Failed to load transfer slip');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleBack = () => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push('/erp/inventory/transactions/plm-claims');
        }
    };

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? '-' : format(d, 'dd-MMM-yyyy');
        } catch {
            return '-';
        }
    };

    const formatDateTime = (dateStr?: string | null) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? '-' : format(d, 'dd-MMM-yyyy, hh:mm a');
        } catch {
            return '-';
        }
    };

    const getBrandName = (item: any, fallbackBrand?: any): string => {
        if (!item) return (fallbackBrand?.name || 'GENERAL').toUpperCase();
        if (typeof item.brand === 'object' && item.brand?.name) return String(item.brand.name).trim().toUpperCase();
        if (typeof item.brand === 'string' && item.brand.trim()) return item.brand.trim().toUpperCase();
        if (item.brandName) return String(item.brandName).trim().toUpperCase();
        if (fallbackBrand?.name) return String(fallbackBrand.name).trim().toUpperCase();

        const desc = (item.description || '').toUpperCase();
        if (desc.includes('NIKE')) return 'NIKE';
        if (desc.includes('PUMA')) return 'PUMA';
        if (desc.includes('ADIDAS') || desc.includes('ADISSAGE')) return 'ADIDAS';
        if (desc.includes('SKECHERS')) return 'SKECHERS';

        return 'GENERAL';
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-muted-foreground text-sm font-semibold">Loading Transfer Slip...</p>
            </div>
        );
    }

    if (!transfer) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-gray-50">
                <p className="text-lg font-semibold text-rose-600">Transfer Slip Not Found</p>
                <Link href="/erp/inventory/transactions/plm-claims">
                    <Button variant="outline" className="font-bold">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to PLM Claims
                    </Button>
                </Link>
            </div>
        );
    }

    const distinctBrandNames = Array.from(
        new Set(
            (transfer.items || [])
                .map((i) => getBrandName(i.item, transfer.brand))
                .filter((b) => b && b !== 'GENERAL')
        )
    );

    const brandHeaderTitle =
        distinctBrandNames.length === 1
            ? distinctBrandNames[0]
            : distinctBrandNames.length > 1
            ? distinctBrandNames.join(' • ')
            : transfer.brand?.name || 'DEFECTIVE CLAIM RETURN TO PLM';

    const grandTotalQty = (transfer.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const grandTotalValue = (transfer.items || []).reduce((sum, item) => {
        const price = Number(item.item?.unitPrice ?? item.item?.retailPrice ?? 0);
        return sum + Number(item.quantity || 0) * price;
    }, 0);

    return (
        <>
            {/* Global Print Styles to Strictly Force Exactly 1 Page and Eliminate Blank 2nd Page */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: portrait;
                        margin: 5mm 8mm;
                    }

                    html,
                    body {
                        height: 100% !important;
                        max-height: 100% !important;
                        overflow: hidden !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    header,
                    nav,
                    aside,
                    footer,
                    [data-sidebar],
                    [data-slot="sidebar"],
                    [role="banner"],
                    [role="navigation"],
                    .no-print,
                    .screen-only {
                        display: none !important;
                        height: 0 !important;
                        max-height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden !important;
                    }

                    #claim-transfer-slip-print {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        background: #ffffff !important;
                        page-break-after: avoid !important;
                        page-break-inside: avoid !important;
                        break-after: avoid !important;
                        break-inside: avoid !important;
                    }

                    #claim-transfer-slip-print * {
                        page-break-after: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>

            <div className="min-h-screen print:min-h-0 print:h-auto print:py-0 print:my-0 bg-gray-100 print:bg-white text-black py-6">
                {/* Screen Top Action Bar (Hidden on print) */}
                <div className="screen-only no-print print:hidden max-w-4xl mx-auto mb-4 flex justify-between items-center bg-white border border-gray-200 p-3.5 rounded-lg shadow-sm">
                    <Button variant="outline" className="font-bold border-2" onClick={handleBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Ready for Single-Page Print
                        </span>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5" onClick={handlePrint}>
                            <Printer className="h-4 w-4 mr-2" /> Print Slip
                        </Button>
                    </div>
                </div>

                {/* A4 / Letter Document Area (Compact & Optimized for 1-Page Output) */}
                <div
                    id="claim-transfer-slip-print"
                    className="bg-white p-6 sm:p-8 print:p-0 print:m-0 print:shadow-none print:border-0 print:rounded-none max-w-4xl mx-auto shadow-md border border-gray-200 rounded-lg"
                >
                    {/* Header: Company Logo, Name & Title */}
                    <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2.5 print:pb-1.5 print:mb-2">
                        <div className="flex items-center gap-3">
                            <img src="/image.png" alt="Company Logo" className="w-24 sm:w-28 object-contain print:w-24" />
                        </div>

                        <div className="text-center flex-1 pr-10">
                            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Speed (Private) Limited</h1>
                            <p className="text-sm sm:text-base font-bold text-gray-800 tracking-wide mt-0.5">Claim Transfer Note</p>
                            <p className="text-xs font-extrabold uppercase border-b-2 border-black inline-block px-5 mt-0.5 tracking-wider text-gray-900">
                                {brandHeaderTitle}
                            </p>
                        </div>
                    </div>

                    {/* Meta Parameters Grid (Compact 2-Column Info Grid) */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[11.5px] print:text-[11px] border-b pb-2 mb-2 print:pb-1.5 print:mb-1.5">
                        <div className="space-y-0.5">
                            <div className="flex items-start">
                                <span className="font-semibold w-32 text-gray-600 shrink-0">From Location :</span>
                                <span className="font-bold text-gray-900">
                                    {transfer.fromLocation?.name || transfer.fromWarehouse?.name || '-'}
                                    {(transfer.fromLocation?.code || transfer.fromWarehouse?.code) && (
                                        <span className="ml-1 text-gray-500 font-medium">
                                            ({transfer.fromLocation?.code || transfer.fromWarehouse?.code})
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-start">
                                <span className="font-semibold w-32 text-gray-600 shrink-0">To Location/WH :</span>
                                <span className="font-bold text-gray-900">
                                    {transfer.toWarehouse?.name || transfer.toLocation?.name || 'PRODUCT LINE MANAGEMENT'}
                                    {(transfer.toWarehouse?.code || transfer.toLocation?.code) && (
                                        <span className="ml-1 text-gray-500 font-medium">
                                            ({transfer.toWarehouse?.code || transfer.toLocation?.code})
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center">
                                <span className="font-semibold w-32 text-gray-600 shrink-0">Transfer Type :</span>
                                <span className="font-bold text-gray-800">{transfer.transferType || 'CLAIM_TO_PLM'}</span>
                            </div>
                            <div className="flex items-center">
                                <span className="font-semibold w-32 text-gray-600 shrink-0">S.T.N. No :</span>
                                <span className="font-bold text-xs font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                    {transfer.requestNo || '-'}
                                </span>
                            </div>
                            {transfer.claim?.claimNo && (
                                <div className="flex items-center">
                                    <span className="font-semibold w-32 text-gray-600 shrink-0">Claim Number :</span>
                                    <span className="font-bold text-xs font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                        {transfer.claim.claimNo}
                                    </span>
                                </div>
                            )}
                            {transfer.claim?.claimType && (
                                <div className="flex items-center">
                                    <span className="font-semibold w-32 text-gray-600 shrink-0">Claim Type :</span>
                                    <span className="font-bold text-gray-800 uppercase">{transfer.claim.claimType}</span>
                                </div>
                            )}
                            {distinctBrandNames.length > 1 && (
                                <div className="flex items-center gap-1 pt-0.5">
                                    <span className="font-semibold w-32 text-gray-600 shrink-0">Brands :</span>
                                    <span className="font-bold text-gray-800 flex flex-wrap gap-1">
                                        {distinctBrandNames.map((bName) => (
                                            <span
                                                key={bName}
                                                className="inline-block bg-gray-100 text-gray-900 text-[10px] px-1.5 py-0.5 rounded border border-gray-300 font-extrabold"
                                            >
                                                {bName}
                                            </span>
                                        ))}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1 text-right flex flex-col items-end justify-start">
                            <div className="flex gap-2">
                                <span className="font-semibold text-gray-600">Date :</span>
                                <span className="font-bold text-gray-800">{formatDate(transfer.createdAt)}</span>
                            </div>
                            <div className="flex gap-2 items-center">
                                <span className="font-semibold text-gray-600">Status :</span>
                                <span
                                    className={`font-bold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded border ${
                                        transfer.status === 'COMPLETED'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : transfer.status === 'PENDING'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    }`}
                                >
                                    {transfer.status === 'COMPLETED' ? 'COMPLETED (RECEIVED)' : transfer.status}
                                </span>
                            </div>
                            <div className="flex gap-2 text-[11px] text-gray-500">
                                <span className="font-semibold text-gray-500">Created Time :</span>
                                <span className="font-medium text-gray-700">{formatDateTime(transfer.createdAt)}</span>
                            </div>
                            {transfer.approvedAt && (
                                <div className="flex gap-2 text-[11px] text-gray-500">
                                    <span className="font-semibold text-gray-500">Acknowledged At :</span>
                                    <span className="font-medium text-gray-700">{formatDateTime(transfer.approvedAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ERP Review Remarks / Notes Banner */}
                    {(transfer.claim?.reviewNotes || transfer.notes) && (
                        <div className="mb-2.5 print:mb-2 bg-amber-50/70 border border-amber-300 rounded p-2 text-xs">
                            <span className="font-bold text-amber-900 uppercase tracking-wider block mb-0.5 text-[10.5px]">
                                ERP Review Remarks / Notes:
                            </span>
                            <p className="text-gray-900 font-medium whitespace-pre-wrap leading-tight text-[11px]">
                                {transfer.claim?.reviewNotes || transfer.notes}
                            </p>
                        </div>
                    )}

                    {/* Items Table */}
                    <div className="w-full text-xs mb-2 print:mb-1.5">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b-2 border-black text-[10.5px] uppercase tracking-wider text-gray-800 font-bold bg-gray-50 print:bg-transparent">
                                    <th className="py-1 px-1.5 text-left w-8">#</th>
                                    <th className="py-1 px-1.5 text-left">SKU / Item Code</th>
                                    <th className="py-1 px-1.5 text-left">Brand</th>
                                    <th className="py-1 px-1.5 text-left">Description</th>
                                    <th className="py-1 px-1.5 text-center">Color</th>
                                    <th className="py-1 px-1.5 text-center">Size</th>
                                    <th className="py-1 px-1.5 text-right">Qty</th>
                                    <th className="py-1 px-1.5 text-right pr-2">Selling Price (Rs.)</th>
                                    <th className="py-1 px-1.5 text-right">Total Value (Rs.)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {transfer.items.map((item, index) => {
                                    const price = Number(item.item?.unitPrice ?? item.item?.retailPrice ?? 0);
                                    const total = Number(item.quantity || 0) * price;
                                    const brand = getBrandName(item.item, transfer.brand);
                                    return (
                                        <tr key={item.id} className="text-[11.5px] hover:bg-gray-50/50">
                                            <td className="py-1.5 px-1.5 text-gray-500 font-medium">{index + 1}</td>
                                            <td className="py-1.5 px-1.5 font-mono font-bold text-gray-900">{item.item.sku}</td>
                                            <td className="py-1.5 px-1.5 font-semibold text-gray-800">{brand}</td>
                                            <td className="py-1.5 px-1.5 text-gray-700">{item.item.description || '-'}</td>
                                            <td className="py-1.5 px-1.5 text-center text-gray-600">{item.item.color?.name || '-'}</td>
                                            <td className="py-1.5 px-1.5 text-center font-medium text-gray-800">{item.item.size?.name || '-'}</td>
                                            <td className="py-1.5 px-1.5 text-right font-bold text-gray-900">{item.quantity}</td>
                                            <td className="py-1.5 px-1.5 text-right pr-2 font-medium text-gray-800">
                                                {price > 0 ? price.toLocaleString('en-PK', { minimumFractionDigits: 0 }) : '-'}
                                            </td>
                                            <td className="py-1.5 px-1.5 text-right font-bold text-gray-900">
                                                {total > 0 ? total.toLocaleString('en-PK', { minimumFractionDigits: 0 }) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Grand Totals Section */}
                    <div className="flex justify-between items-center font-black border-t-2 border-black pt-1.5 text-xs">
                        <div className="uppercase tracking-wider">Grand Totals:</div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <span className="text-[11px] text-gray-500 font-semibold mr-1.5">Total Quantity:</span>
                                <span className="text-sm font-black text-gray-900">{grandTotalQty}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[11px] text-gray-500 font-semibold mr-1.5">Total Value:</span>
                                <span className="text-sm font-black text-gray-900">
                                    {grandTotalValue > 0
                                        ? `Rs. ${grandTotalValue.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`
                                        : '-'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* System Note */}
                    <div className="mt-2.5 print:mt-1.5 border-t border-dashed border-gray-300 pt-1 text-[10px] text-gray-500 leading-tight">
                        <p>
                            <span className="font-bold text-gray-700">Note:</span> This is a system-generated Claim Transfer Note for defective items transferred from POS Outlet to Product Line Management for physical inspection and warranty disposition.
                        </p>
                        {transfer.status === 'PENDING' && (
                            <p className="text-amber-700 font-semibold mt-0.5">
                                ⚠️ This transfer is pending PLM acknowledgment. Inventory will be updated upon acknowledgment.
                            </p>
                        )}
                        {transfer.status === 'COMPLETED' && (
                            <p className="text-emerald-700 font-semibold mt-0.5">
                                ✅ This transfer has been acknowledged and inventory has been updated.
                            </p>
                        )}
                    </div>

                    {/* Corporate 4-Box Signatures Grid */}
                    <div className="grid grid-cols-4 gap-2.5 mt-5 print:mt-3">
                        <div className="border border-black h-16 print:h-14 p-1 flex flex-col justify-between items-center bg-white text-black">
                            <span className="text-[8.5px] font-bold text-center border-b border-black w-full pb-0.5 uppercase">
                                PREPARED BY (OUTLET)
                            </span>
                            {transfer.creatorName ? (
                                <div className="text-center">
                                    <p className="text-[10px] font-semibold leading-none">{transfer.creatorName}</p>
                                    <p className="text-[8px] text-gray-600 mt-0.5 leading-none">{formatDate(transfer.createdAt)}</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="border-b border-gray-400 w-14 mx-auto mb-0.5"></div>
                                    <p className="text-[8px] text-gray-400 italic leading-none">Outlet Incharge</p>
                                </div>
                            )}
                        </div>

                        <div className="border border-black h-16 print:h-14 p-1 flex flex-col justify-between items-center bg-white text-black">
                            <span className="text-[8.5px] font-bold text-center border-b border-black w-full pb-0.5 uppercase">
                                CHECKED BY (CHECKER)
                            </span>
                            {transfer.checkerName ? (
                                <div className="text-center">
                                    <p className="text-[10px] font-semibold leading-none">{transfer.checkerName}</p>
                                    <p className="text-[8px] text-gray-600 mt-0.5 leading-none">{transfer.checkedAt ? formatDate(transfer.checkedAt) : ''}</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="border-b border-gray-400 w-14 mx-auto mb-0.5"></div>
                                    <p className="text-[8px] text-gray-400 italic leading-none">Sign &amp; Date</p>
                                </div>
                            )}
                        </div>

                        <div className="border border-black h-16 print:h-14 p-1 flex flex-col justify-between items-center bg-white text-black">
                            <span className="text-[8.5px] font-bold text-center border-b border-black w-full pb-0.5 uppercase">
                                APPROVED BY (PLM)
                            </span>
                            {transfer.authorizerName ? (
                                <div className="text-center">
                                    <p className="text-[10px] font-semibold leading-none">{transfer.authorizerName}</p>
                                    <p className="text-[8px] text-gray-600 mt-0.5 leading-none">{transfer.authorizedAt ? formatDate(transfer.authorizedAt) : ''}</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="border-b border-gray-400 w-14 mx-auto mb-0.5"></div>
                                    <p className="text-[8px] text-gray-400 italic leading-none">PLM Manager</p>
                                </div>
                            )}
                        </div>

                        <div className="border border-black h-16 print:h-14 p-1 flex flex-col justify-between items-center bg-white text-black">
                            <span className="text-[8.5px] font-bold text-center border-b border-black w-full pb-0.5 uppercase">
                                RECEIVED BY (RECEIVER)
                            </span>
                            <div className="text-center">
                                <div className="border-b border-gray-400 w-14 mx-auto mb-0.5"></div>
                                <p className="text-[8px] text-gray-400 italic leading-none">Sign &amp; Date</p>
                            </div>
                        </div>
                    </div>

                    {/* Document Footer */}
                    <div className="mt-3 print:mt-2 text-center text-[9px] text-gray-400 border-t pt-1">
                        <p>Speed (Private) Limited • ERP Product Line Management System • System Generated Document</p>
                    </div>
                </div>
            </div>
        </>
    );
}
