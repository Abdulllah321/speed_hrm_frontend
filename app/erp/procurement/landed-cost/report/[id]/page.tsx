'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLandedCost, exportLandedCost } from '@/lib/actions/landed-cost';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { 
    Printer, 
    ArrowLeft, 
    Loader2, 
    Search, 
    Filter, 
    RotateCcw, 
    Coins, 
    Briefcase, 
    TrendingUp, 
    PackageCheck, 
    Anchor, 
    Globe, 
    Calendar, 
    FileText,
    FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

export default function LandedCostReportPage() {
    const params = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedHsCodes, setSelectedHsCodes] = useState<string[]>([]);
    const [selectedSkus, setSelectedSkus] = useState<string[]>([]);

    const id = params.id as string;

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    const fetchData = async () => {
        try {
            const res = await getLandedCost(id);
            setData(res);
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch report data');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const [exporting, setExporting] = useState(false);

    const handleExportExcel = async () => {
        setExporting(true);
        try {
            await exportLandedCost(id, {
                search: searchTerm,
                hsCodes: selectedHsCodes,
                skus: selectedSkus,
            });
            toast.success("Excel export initiated! You'll receive an in-app notification when the file is ready to download.", {
                duration: 5000,
            });
        } catch (error: any) {
            toast.error(error.message || "Failed to initiate Excel export");
        } finally {
            setExporting(false);
        }
    };


    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50/50 dark:bg-slate-950/50">
                <div className="text-center space-y-3">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Generating beautiful audit report...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex h-screen items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-950/50">
                <Card className="max-w-md w-full text-center p-6 border-red-200 dark:border-red-900 shadow-lg bg-white dark:bg-slate-900">
                    <p className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Record Not Found</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Landed cost ledger data failed to load or does not exist.</p>
                    <Button variant="outline" onClick={() => router.back()} className="w-full">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                    </Button>
                </Card>
            </div>
        );
    }

    // Filter items
    const filteredItems = data.items.filter((item: any) => {
        const skuString = item.sku || '';
        const descString = item.description || '';
        
        // Search term filter (SKU or Description)
        const matchesSearch = 
            skuString.toLowerCase().includes(searchTerm.toLowerCase()) ||
            descString.toLowerCase().includes(searchTerm.toLowerCase());
            
        // Multiple HS codes filter
        const matchesHsCode = selectedHsCodes.length === 0 || selectedHsCodes.includes(item.hsCode);
        
        // Multiple SKUs filter
        const matchesSku = selectedSkus.length === 0 || selectedSkus.includes(item.sku);
        
        return matchesSearch && matchesHsCode && matchesSku;
    });

    // Unique HS codes for the filter dropdown
    const hsCodes = Array.from(new Set(data.items.map((item: any) => item.hsCode).filter(Boolean))) as string[];
    const hsCodeOptions = hsCodes.map(code => ({ value: code, label: code }));

    // Unique SKUs for the filter dropdown
    const skus = Array.from(new Set(data.items.map((item: any) => item.sku).filter(Boolean))) as string[];
    const skuOptions = skus.map(sku => ({ value: sku, label: sku }));

    // Calculate dynamic totals for summary cards & footer
    const totals = filteredItems.reduce((acc: any, item: any) => {
        const qty = Number(item.qty || 0);
        const invForeign = Number(item.invoiceForeign || 0);
        const freightForeign = Number(item.freightForeign || 0);
        const invPKR = Number(item.invoicePKR || 0);
        const ins = Number(item.insuranceCharges || 0);
        const land = Number(item.landingCharges || 0);
        const av = Number(item.assessableValue || 0);
        
        const cd = Number(item.customsDutyAmount || 0);
        const rd = Number(item.regulatoryDutyAmount || 0);
        const acd = Number(item.additionalCustomsDutyAmount || 0);
        const st = Number(item.salesTaxAmount || 0);
        const ast = Number(item.additionalSalesTaxAmount || 0);
        const it = Number(item.incomeTaxAmount || 0);
        const excise = Number(item.exciseChargesAmount || 0);
        
        const itemDuty = cd + rd + acd + st + ast + it;
        const totalDuty = itemDuty + excise;

        const misFreight = Number(item.misFreightPKR || 0);
        const misDoThc = Number(item.misDoThcPKR || 0);
        const misBank = Number(item.misBankPKR || 0);
        const misInsurance = Number(item.misInsurancePKR || 0);
        const misClgFwd = Number(item.misClgFwdPKR || 0);
        
        const totalOther = misFreight + misDoThc + misBank + misInsurance + misClgFwd;
        const totalCost = Number(item.totalCostPKR || 0);

        return {
            qty: acc.qty + qty,
            invForeign: acc.invForeign + invForeign,
            freightForeign: acc.freightForeign + freightForeign,
            invPKR: acc.invPKR + invPKR,
            ins: acc.ins + ins,
            land: acc.land + land,
            av: acc.av + av,
            cd: acc.cd + cd,
            rd: acc.rd + rd,
            acd: acc.acd + acd,
            st: acc.st + st,
            ast: acc.ast + ast,
            it: acc.it + it,
            excise: acc.excise + excise,
            totalDuty: acc.totalDuty + totalDuty,
            misFreight: acc.misFreight + misFreight,
            misDoThc: acc.misDoThc + misDoThc,
            misBank: acc.misBank + misBank,
            misInsurance: acc.misInsurance + misInsurance,
            misClgFwd: acc.misClgFwd + misClgFwd,
            totalOther: acc.totalOther + totalOther,
            totalCost: acc.totalCost + totalCost,
        };
    }, {
        qty: 0,
        invForeign: 0,
        freightForeign: 0,
        invPKR: 0,
        ins: 0,
        land: 0,
        av: 0,
        cd: 0,
        rd: 0,
        acd: 0,
        st: 0,
        ast: 0,
        it: 0,
        excise: 0,
        totalDuty: 0,
        misFreight: 0,
        misDoThc: 0,
        misBank: 0,
        misInsurance: 0,
        misClgFwd: 0,
        totalOther: 0,
        totalCost: 0,
    });

    const isLocalPurchase = data.grn?.purchaseOrder?.orderType === 'LOCAL';

    return (
        <div className="p-4 md:p-6 space-y-6 printable-report max-w-[100vw] overflow-x-hidden bg-slate-50/30 dark:bg-slate-950/20 min-h-screen text-slate-900 dark:text-slate-100 transition-colors duration-200">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
                
                body {
                    font-family: 'Plus Jakarta Sans', sans-serif;
                }

                /* Premium Scrollbar */
                .sticky-table-container div[data-slot="table-container"]::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .sticky-table-container div[data-slot="table-container"]::-webkit-scrollbar-track {
                    background: transparent;
                }
                .sticky-table-container div[data-slot="table-container"]::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 3px;
                }
                .dark .sticky-table-container div[data-slot="table-container"]::-webkit-scrollbar-thumb {
                    background: #334155;
                }
                .sticky-table-container div[data-slot="table-container"]::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                .dark .sticky-table-container div[data-slot="table-container"]::-webkit-scrollbar-thumb:hover {
                    background: #475569;
                }
                
                /* Sticky Headers and Footer */
                .sticky-table-container div[data-slot="table-container"] {
                    max-height: 620px !important;
                    overflow: auto !important;
                    position: relative !important;
                }
                .sticky-table-container div[data-slot="table-container"] table {
                    border-collapse: separate !important;
                    border-spacing: 0 !important;
                }
                .sticky-table-container thead tr:nth-child(1) th {
                    position: sticky !important;
                    top: 0 !important;
                    z-index: 40 !important;
                }
                .sticky-table-container thead tr:nth-child(2) th {
                    position: sticky !important;
                    top: 32px !important;
                    z-index: 40 !important;
                }
                .sticky-table-container tfoot tr td {
                    position: sticky !important;
                    bottom: 0 !important;
                    z-index: 30 !important;
                    background-color: #f8fafc !important;
                    color: #0f172a !important;
                    font-weight: 800;
                    border-top: 3px double #94a3b8;
                    border-bottom: 2px solid #cbd5e1;
                    box-shadow: 0 -3px 6px rgba(0, 0, 0, 0.05);
                }

                /* Dark mode table footer overrides */
                .dark .sticky-table-container tfoot tr td {
                    background-color: #0f172a !important;
                    color: #f1f5f9 !important;
                    border-top: 3px double #475569;
                    border-bottom: 2px solid #1e293b;
                    box-shadow: 0 -3px 6px rgba(0, 0, 0, 0.25);
                }

                @page {
                    size: A4 landscape;
                    margin: 10mm;
                }
                @media print {
                    .no-print { display: none !important; }
                    .printable-report { margin: 0; padding: 0; width: 100%; max-width: none; font-size: 7.5px; }
                    body { background: white !important; color: black !important; }
                    .card { border: none !important; box-shadow: none !important; margin-bottom: 5px; }
                    .sticky-table-container { overflow: visible !important; max-height: none !important; }
                    table { width: 100% !important; border-collapse: collapse !important; }
                    thead { display: table-header-group; }
                    tr { page-break-inside: avoid; }
                    th, td { padding: 2px 1px !important; border: 1px solid #9ca3af !important; word-break: break-all; }
                }
            `}</style>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center no-print gap-4 pb-2">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 gap-1.5 transition-all">
                    <ArrowLeft className="h-4 w-4" /> Back to List
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push('/erp/procurement/landed-cost/setup')} className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 bg-white dark:bg-slate-900">
                        Landed Cost Setup
                    </Button>
                    <Button 
                        size="sm" 
                        onClick={handleExportExcel} 
                        disabled={exporting}
                        className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-550 dark:hover:bg-emerald-650 text-white shadow-sm font-semibold gap-1.5"
                    >
                        {exporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <FileSpreadsheet className="h-4 w-4" />
                        )}
                        {exporting ? 'Exporting...' : 'Export Excel'}
                    </Button>
                    <Button size="sm" onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-550 dark:hover:bg-indigo-650 text-white shadow-sm font-semibold gap-1.5">
                        <Printer className="h-4 w-4" /> Print Ledger
                    </Button>
                </div>
            </div>

            {/* Banner Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-indigo-900/40 dark:border-indigo-950 relative overflow-hidden">
                <div className="absolute top-[-50%] left-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-[-50%] right-[-10%] w-[300px] h-[300px] rounded-full bg-pink-500/10 blur-3xl pointer-events-none"></div>
                
                <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent">
                            Landed Cost Detailed Audit Ledger
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            {data.status || 'Valued'}
                        </span>
                    </div>
                    <p className="text-slate-400 dark:text-slate-500 text-xs md:text-sm max-w-xl">
                        Comprehensive landing valuation ledger. Compiles shipment details, custom duties, tax calculations, and MIS breakdowns.
                    </p>
                </div>
                
                <div className="text-left md:text-right relative z-10 shrink-0 bg-white/5 backdrop-blur-md border border-white/10 dark:border-white/5 p-3.5 rounded-xl">
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">Landed Cost Number</p>
                    <p className="text-lg font-bold text-indigo-200 dark:text-indigo-300">{data.landedCostNumber}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-300 dark:text-slate-400">
                        <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{data.date ? format(new Date(data.date), 'dd MMM yyyy HH:mm') : '-'}</span>
                    </div>
                </div>
            </div>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Cost */}
                <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 backdrop-blur-sm border border-indigo-100/50 dark:border-indigo-950/30 rounded-2xl p-5 hover:shadow-md transition-all duration-300 flex items-center gap-4 bg-white dark:bg-slate-900">
                    <div className="p-3.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-550/20 text-indigo-600 dark:text-indigo-400">
                        <Coins className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Cost (PKR)</p>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{formatCurrency(totals.totalCost)}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">Valued for {filteredItems.length} items</p>
                    </div>
                </div>

                {/* Duties */}
                <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/10 backdrop-blur-sm border border-amber-100/50 dark:border-amber-950/30 rounded-2xl p-5 hover:shadow-md transition-all duration-300 flex items-center gap-4 bg-white dark:bg-slate-900">
                    <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-550/20 text-amber-600 dark:text-amber-400">
                        <Briefcase className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">Duties & Taxes</p>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{formatCurrency(totals.totalDuty)}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">Incl. Customs, ST, IT & Excise</p>
                    </div>
                </div>

                {/* MIS Charges */}
                <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10 backdrop-blur-sm border border-emerald-100/50 dark:border-emerald-950/30 rounded-2xl p-5 hover:shadow-md transition-all duration-300 flex items-center gap-4 bg-white dark:bg-slate-900">
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-550/20 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">MIS & Other Expenses</p>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{formatCurrency(totals.totalOther)}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">Freight, DO/THC, Clearing, Bank</p>
                    </div>
                </div>

                {/* Total Quantity */}
                <div className="bg-gradient-to-br from-pink-500/5 to-red-500/5 dark:from-pink-500/10 dark:to-red-500/10 backdrop-blur-sm border border-pink-100/50 dark:border-pink-950/30 rounded-2xl p-5 hover:shadow-md transition-all duration-300 flex items-center gap-4 bg-white dark:bg-slate-900">
                    <div className="p-3.5 rounded-xl bg-pink-500/10 dark:bg-pink-550/20 text-pink-600 dark:text-pink-400">
                        <PackageCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Quantity</p>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{totals.qty.toLocaleString()} Units</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">Avg: ₨ {(totals.qty > 0 ? totals.totalCost / totals.qty : 0).toFixed(2)} / unit</p>
                    </div>
                </div>
            </div>

            {/* Metadata and Documentation Summary */}
            <Card className="card shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 dark:text-slate-300">
                    <div className="space-y-2 border-r border-slate-100 dark:border-slate-800 pr-4">
                        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold border-b border-indigo-50/80 dark:border-indigo-950/40 pb-1.5">
                            <Anchor className="h-4 w-4 text-indigo-500" />
                            <span>Logistics & Shipping Details</span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-1 mt-2">
                            <span className="text-slate-400 dark:text-slate-500 font-medium">LC Number:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{data.lcNo || '-'}</span>
                            <span className="text-slate-400 dark:text-slate-500 font-medium">B/L Number:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{data.blNo || '-'}</span>
                            <span className="text-slate-400 dark:text-slate-500 font-medium">B/L Date:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{data.blDate ? format(new Date(data.blDate), 'dd-MM-yyyy') : '-'}</span>
                        </div>
                    </div>

                    <div className="space-y-2 border-r border-slate-100 dark:border-slate-800 pr-4">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold border-b border-amber-50/80 dark:border-amber-950/40 pb-1.5">
                            <Globe className="h-4 w-4 text-amber-500" />
                            <span>Customs & Origin Metadata</span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-1 mt-2">
                            <span className="text-slate-400 dark:text-slate-500 font-medium">GD Number:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{data.gdNo || '-'}</span>
                            <span className="text-slate-400 dark:text-slate-500 font-medium">Country of Origin:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{data.countryOfOrigin || '-'}</span>
                            <span className="text-slate-400 dark:text-slate-500 font-medium">Season / Category:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{data.season || '-'} / {data.category || '-'}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold border-b border-emerald-50/80 dark:border-emerald-950/40 pb-1.5">
                            <FileText className="h-4 w-4 text-emerald-500" />
                            <span>Procurement References</span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-1 mt-2">
                            <span className="text-slate-400 dark:text-slate-500 font-medium">GRN Number:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{data.grn?.grnNumber || '-'}</span>
                            <span className="text-slate-400 dark:text-slate-500 font-medium">Supplier Vendor:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{data.supplier?.name || '-'}</span>
                            {data.currency?.toUpperCase() !== 'PKR' && Number(data.exchangeRate) !== 1 && !isLocalPurchase && (
                                <>
                                    <span className="text-slate-400 dark:text-slate-500 font-medium">Exchange Rate:</span>
                                    <span className="font-semibold text-indigo-700 dark:text-indigo-400">{data.currency} (@{Number(data.exchangeRate).toFixed(2)})</span>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filter Panel */}
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl shadow-sm no-print w-full">
                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                    {/* Search Field */}
                    <div className="relative w-full sm:w-[240px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <Input 
                            placeholder="Filter by description..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="pl-9 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900/50 transition-all text-xs"
                        />
                    </div>

                    {/* HS Code Filter (MultiSelect) */}
                    <div className="w-full sm:w-[240px]">
                        <MultiSelect 
                            options={hsCodeOptions}
                            value={selectedHsCodes}
                            onValueChange={setSelectedHsCodes}
                            placeholder="Filter by HS Codes"
                            className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
                        />
                    </div>

                    {/* SKU Filter (MultiSelect) */}
                    <div className="w-full sm:w-[240px]">
                        <MultiSelect 
                            options={skuOptions}
                            value={selectedSkus}
                            onValueChange={setSelectedSkus}
                            placeholder="Filter by SKUs"
                            className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
                        />
                    </div>

                    {/* Clear Button */}
                    {(searchTerm || selectedHsCodes.length > 0 || selectedSkus.length > 0) && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setSearchTerm(''); setSelectedHsCodes([]); setSelectedSkus([]); }} 
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 gap-1.5 h-9"
                        >
                            <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
                        </Button>
                    )}
                </div>

                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                    Showing {filteredItems.length} of {data.items.length} records
                </span>
            </div>

            {/* Comprehensive Table */}
            <div className="border border-slate-200/80 dark:border-slate-805 rounded-xl shadow-lg bg-white dark:bg-slate-950 overflow-hidden border-slate-200 dark:border-slate-800">
                <div className="sticky-table-container custom-scrollbar">
                    <Table className="text-[10px] whitespace-nowrap border-collapse">
                        <thead>
                            {/* Group Headers */}
                            <tr className="bg-slate-800 dark:bg-slate-900 divide-x divide-slate-700 dark:divide-slate-800 text-white font-bold h-8">
                                <th colSpan={12} className="text-center bg-slate-900 dark:bg-slate-950 border-r border-slate-800 dark:border-slate-900 text-[10px] tracking-wider py-1.5">
                                    SHIPMENT & ITEM DETAILS
                                </th>
                                <th colSpan={9} className="text-center bg-blue-700 dark:bg-blue-900 border-r border-blue-800 dark:border-blue-950 text-[10px] tracking-wider py-1.5">
                                    ASSESSABLE VALUE
                                </th>
                                {!isLocalPurchase && (
                                    <>
                                        <th colSpan={10} className="text-center bg-amber-700 dark:bg-amber-900 border-r border-amber-800 dark:border-amber-950 text-[10px] tracking-wider py-1.5">
                                            DUTY & TAX CALCULATION
                                        </th>
                                        <th colSpan={1} className="text-center bg-violet-700 dark:bg-violet-900 border-r border-violet-800 dark:border-violet-950 text-[10px] tracking-wider py-1.5">
                                            FREIGHT
                                        </th>
                                        <th colSpan={12} className="text-center bg-emerald-700 dark:bg-emerald-900 border-r border-emerald-800 dark:border-emerald-950 text-[10px] tracking-wider py-1.5">
                                            MIS BREAKDOWN (SHARES)
                                        </th>
                                    </>
                                )}
                                <th colSpan={isLocalPurchase ? 2 : 3} className="text-center bg-indigo-700 dark:bg-indigo-905 text-[10px] tracking-wider py-1.5">
                                    TOTAL VALUATIONS
                                </th>
                            </tr>
                            {/* Detailed Headers */}
                            <tr className="bg-slate-105 dark:bg-slate-800 text-slate-700 dark:text-slate-300 divide-x divide-slate-200 dark:divide-slate-700 font-semibold h-7 border-b border-slate-300 dark:border-slate-700">
                                {/* Shipment */}
                                <th className="px-2 text-center">LC#</th>
                                <th className="px-2 text-center">BL#</th>
                                <th className="px-2 text-center">BL Date</th>
                                <th className="px-2 text-center">GD#</th>
                                <th className="px-2 text-center">Origin</th>
                                <th className="px-2 text-center">Season</th>
                                <th className="px-2 text-center">Cat</th>
                                <th className="px-2 text-center">S.Inv</th>
                                <th className="px-2 text-center">Date</th>
                                <th className="px-2 text-left font-bold text-slate-900 dark:text-white">SKU</th>
                                <th className="px-2 text-left">Description</th>
                                <th className="px-2 text-center border-r border-slate-300 dark:border-slate-700">HS Code</th>

                                {/* AV */}
                                <th className="px-2 text-right bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300">Qty</th>
                                <th className="px-2 text-right bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 font-medium">{isLocalPurchase ? 'FOB PKR' : 'FOB Foreign'}</th>
                                <th className="px-2 text-right bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 font-medium">{isLocalPurchase ? 'Inv PKR' : 'Inv Foreign'}</th>
                                <th className="px-2 text-right bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300">Freight USD</th>
                                <th className="px-2 text-right bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300">Ex Rate</th>
                                <th className="px-2 text-right bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300">Invoice PKR</th>
                                <th className="px-2 text-right bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300">Insurance</th>
                                <th className="px-2 text-right bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300">Landing</th>
                                <th className="px-2 text-right bg-blue-100 dark:bg-blue-900 font-bold border-r border-blue-300 dark:border-blue-950 text-blue-955 dark:text-blue-100">AV (PKR)</th>

                                {!isLocalPurchase && (
                                    <>
                                        {/* Duties */}
                                        <th className="px-2 text-right bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300">CD</th>
                                        <th className="px-2 text-right bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300">RD</th>
                                        <th className="px-2 text-right bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300">ACD</th>
                                        <th className="px-2 text-right bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300">vST</th>
                                        <th className="px-2 text-right bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300">ST</th>
                                        <th className="px-2 text-right bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300">AST</th>
                                        <th className="px-2 text-right bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300">vIT</th>
                                        <th className="px-2 text-right bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300">IT</th>
                                        <th className="px-2 text-right bg-orange-100/90 dark:bg-orange-955/50 text-orange-955 dark:text-orange-300 font-bold">Excise</th>
                                        <th className="px-2 text-right bg-amber-100 dark:bg-amber-900 font-bold border-r border-amber-300 dark:border-amber-950 text-amber-955 dark:text-amber-100">Total Duty</th>

                                        {/* Freight (MIS) */}
                                        <th className="px-2 text-right bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 border-r border-purple-300 dark:border-purple-800">Freight (MIS)</th>

                                        {/* MIS */}
                                        <th className="px-2 text-right bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">Frg USD</th>
                                        <th className="px-2 text-right bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">Frg PKR</th>
                                        <th className="px-2 text-center bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">Inv#</th>
                                        <th className="px-2 text-center bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">Date</th>
                                        <th className="px-2 text-right bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">DO/THC</th>
                                        <th className="px-2 text-center bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">PO#</th>
                                        <th className="px-2 text-center bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">Date</th>
                                        <th className="px-2 text-right bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">Bank</th>
                                        <th className="px-2 text-right bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">Ins</th>
                                        <th className="px-2 text-center bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">Pol#</th>
                                        <th className="px-2 text-right bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">Clg/Fwd</th>
                                        <th className="px-2 text-center bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 border-r border-emerald-300 dark:border-emerald-800">Bill#</th>

                                        <th className="px-2 text-right bg-indigo-50/50 dark:bg-indigo-950/25 text-indigo-900 dark:text-indigo-300">Other Charges</th>
                                    </>
                                )}
                                <th className="px-2 text-right bg-indigo-50/50 dark:bg-indigo-950/25 text-indigo-900 dark:text-indigo-300">Unit Cost</th>
                                <th className="px-2 text-right bg-indigo-600 dark:bg-indigo-700 text-white font-bold">Final Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {filteredItems.map((item: any, idx: number) => {
                                const itemDuty = Number(item.customsDutyAmount || 0) + Number(item.regulatoryDutyAmount || 0) + Number(item.additionalCustomsDutyAmount || 0) + Number(item.salesTaxAmount || 0) + Number(item.additionalSalesTaxAmount || 0) + Number(item.incomeTaxAmount || 0);
                                const totalDutyInclExcise = itemDuty + Number(item.exciseChargesAmount || 0);

                                return (
                                    <tr key={idx} className="divide-x divide-slate-100 dark:divide-slate-800 hover:bg-indigo-50/15 dark:hover:bg-indigo-950/20 even:bg-slate-50/30 dark:even:bg-slate-900/15 transition-colors">
                                        {/* Shipment & Item */}
                                        <td className="px-2 py-1.5 text-center text-slate-500 dark:text-slate-400">{data.lcNo || '-'}</td>
                                        <td className="px-2 py-1.5 text-center text-slate-500 dark:text-slate-400">{data.blNo || '-'}</td>
                                        <td className="px-2 py-1.5 text-center text-slate-500 dark:text-slate-400">{data.blDate ? format(new Date(data.blDate), 'dd-MM-yy') : '-'}</td>
                                        <td className="px-2 py-1.5 text-center text-slate-500 dark:text-slate-400">{data.gdNo || '-'}</td>
                                        <td className="px-2 py-1.5 text-center text-slate-500 dark:text-slate-400">{data.countryOfOrigin || '-'}</td>
                                        <td className="px-2 py-1.5 text-center text-slate-500 dark:text-slate-400">{data.season || '-'}</td>
                                        <td className="px-2 py-1.5 text-center text-slate-500 dark:text-slate-400">{data.category || '-'}</td>
                                        <td className="px-2 py-1.5 text-center text-slate-500 dark:text-slate-400">{data.shippingInvoiceNo || '-'}</td>
                                        <td className="px-2 py-1.5 text-center text-slate-500 dark:text-slate-400">{data.shippingInvoiceDate ? format(new Date(data.shippingInvoiceDate), 'dd-MM-yy') : '-'}</td>
                                        <td className="px-2 py-1.5 text-left font-semibold text-slate-900 dark:text-slate-100">{item.sku}</td>
                                        <td className="px-2 py-1.5 text-left max-w-[140px] truncate text-slate-600 dark:text-slate-300" title={item.description}>{item.description}</td>
                                        <td className="px-2 py-1.5 text-center border-r border-slate-300 dark:border-slate-700 font-mono text-[9px] text-slate-500 dark:text-slate-400">{item.hsCode || '-'}</td>

                                        {/* AV */}
                                        <td className="px-2 py-1.5 text-right bg-blue-50/10 dark:bg-blue-950/5 font-medium">{Number(item.qty).toLocaleString()}</td>
                                        <td className="px-2 py-1.5 text-right bg-blue-50/10 dark:bg-blue-950/5">{formatCurrency(item.unitFob)}</td>
                                        <td className="px-2 py-1.5 text-right bg-blue-50/10 dark:bg-blue-950/5 font-medium">{formatCurrency(item.invoiceForeign)}</td>
                                        <td className="px-2 py-1.5 text-right bg-blue-50/10 dark:bg-blue-950/5">{formatCurrency(item.freightForeign)}</td>
                                        <td className="px-2 py-1.5 text-right bg-blue-50/10 dark:bg-blue-950/5 text-slate-500 dark:text-slate-400">{Number(item.exchangeRate).toFixed(2)}</td>
                                        <td className="px-2 py-1.5 text-right bg-blue-50/10 dark:bg-blue-950/5">{formatCurrency(item.invoicePKR)}</td>
                                        <td className="px-2 py-1.5 text-right bg-blue-50/10 dark:bg-blue-950/5 text-slate-500 dark:text-slate-400">{formatCurrency(item.insuranceCharges)}</td>
                                        <td className="px-2 py-1.5 text-right bg-blue-50/10 dark:bg-blue-950/5 text-slate-500 dark:text-slate-400">{formatCurrency(item.landingCharges)}</td>
                                        <td className="px-2 py-1.5 text-right bg-blue-50 dark:bg-blue-950/40 font-bold border-r border-blue-300 dark:border-blue-900 text-blue-900 dark:text-blue-300">{formatCurrency(item.assessableValue)}</td>

                                        {!isLocalPurchase && (
                                            <>
                                                {/* Duties */}
                                                <td className="px-2 py-1.5 text-right bg-amber-50/10 dark:bg-amber-950/5">{Number(item.customsDutyAmount || 0).toLocaleString()}</td>
                                                <td className="px-2 py-1.5 text-right bg-amber-50/10 dark:bg-amber-950/5">{Number(item.regulatoryDutyAmount || 0).toLocaleString()}</td>
                                                <td className="px-2 py-1.5 text-right bg-amber-50/10 dark:bg-amber-950/5">{Number(item.additionalCustomsDutyAmount || 0).toLocaleString()}</td>
                                                <td className="px-2 py-1.5 text-right bg-amber-50/10 dark:bg-amber-950/5 text-slate-400 dark:text-slate-500">
                                                    {(Number(item.assessableValue) + Number(item.customsDutyAmount || 0) + Number(item.regulatoryDutyAmount || 0) + Number(item.additionalCustomsDutyAmount || 0)).toLocaleString()}
                                                </td>
                                                <td className="px-2 py-1.5 text-right bg-amber-50/10 dark:bg-amber-950/5">{Number(item.salesTaxAmount || 0).toLocaleString()}</td>
                                                <td className="px-2 py-1.5 text-right bg-amber-50/10 dark:bg-amber-950/5">{Number(item.additionalSalesTaxAmount || 0).toLocaleString()}</td>
                                                <td className="px-2 py-1.5 text-right bg-amber-50/10 dark:bg-amber-950/5 text-slate-400 dark:text-slate-500">
                                                    {(Number(item.assessableValue) + Number(item.customsDutyAmount || 0) + Number(item.regulatoryDutyAmount || 0) + Number(item.additionalCustomsDutyAmount || 0) + Number(item.salesTaxAmount || 0) + Number(item.additionalSalesTaxAmount || 0)).toLocaleString()}
                                                </td>
                                                <td className="px-2 py-1.5 text-right bg-amber-50/10 dark:bg-amber-950/5">{Number(item.incomeTaxAmount || 0).toLocaleString()}</td>
                                                {/* Excise Charges Amount */}
                                                <td className="px-2 py-1.5 text-right bg-orange-50 dark:bg-orange-955/30 font-semibold text-orange-900 dark:text-orange-300">{Number(item.exciseChargesAmount || 0).toLocaleString()}</td>
                                                {/* Total Duty */}
                                                <td className="px-2 py-1.5 text-right bg-amber-50 dark:bg-amber-950/20 font-bold border-r border-amber-300 dark:border-amber-900 text-amber-900 dark:text-amber-300">
                                                    {formatCurrency(totalDutyInclExcise)}
                                                </td>

                                                {/* Freight (MIS) */}
                                                <td className="px-2 py-1.5 text-right bg-purple-50/20 dark:bg-purple-950/10 font-bold border-r border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-300">{formatCurrency(item.misFreightPKR || 0)}</td>

                                                {/* MIS shares */}
                                                <td className="px-2 py-1.5 text-right text-slate-500 dark:text-slate-400">{formatCurrency(item.misFreightUSD || 0)}</td>
                                                <td className="px-2 py-1.5 text-right text-slate-600 dark:text-slate-300">{formatCurrency(item.misFreightPKR || 0)}</td>
                                                <td className="px-2 py-1.5 text-center text-slate-400">{item.misFreightInvNo || '-'}</td>
                                                <td className="px-2 py-1.5 text-center text-slate-400">{item.misFreightDate || '-'}</td>
                                                <td className="px-2 py-1.5 text-right text-slate-600 dark:text-slate-300">{Number(item.misDoThcPKR || 0).toLocaleString()}</td>
                                                <td className="px-2 py-1.5 text-center text-slate-400">{item.misDoThcPoNo || '-'}</td>
                                                <td className="px-2 py-1.5 text-center text-slate-400">{item.misDoThcDate || '-'}</td>
                                                <td className="px-2 py-1.5 text-right text-slate-600 dark:text-slate-300">{Number(item.misBankPKR || 0).toLocaleString()}</td>
                                                <td className="px-2 py-1.5 text-right text-slate-600 dark:text-slate-300">{Number(item.misInsurancePKR || 0).toLocaleString()}</td>
                                                <td className="px-2 py-1.5 text-center text-slate-400">{item.misInsurancePolicyNo || '-'}</td>
                                                <td className="px-2 py-1.5 text-right text-slate-600 dark:text-slate-300">{formatCurrency(item.misClgFwdPKR || 0)}</td>
                                                <td className="px-2 py-1.5 text-center border-r border-emerald-300 dark:border-emerald-800 text-slate-400 dark:text-slate-500">{item.misClgFwdBillNo || '-'}</td>

                                                {/* Totals */}
                                                <td className="px-2 py-1.5 text-right font-bold bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200">
                                                    {formatCurrency(Number(item.misFreightPKR || 0) + Number(item.misDoThcPKR || 0) + Number(item.misBankPKR || 0) + Number(item.misInsurancePKR || 0) + Number(item.misClgFwdPKR || 0))}
                                                </td>
                                            </>
                                        )}
                                        <td className="px-2 py-1.5 text-right font-bold bg-slate-50 dark:bg-slate-900/50 text-indigo-800 dark:text-indigo-300">{formatCurrency(item.unitCostPKR)}</td>
                                        <td className="px-2 py-1.5 text-right font-extrabold bg-indigo-600 dark:bg-indigo-700 text-white">{formatCurrency(item.totalCostPKR)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                                <td colSpan={12} className="px-3 py-2 text-left font-black tracking-wider uppercase bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700">
                                    Filtered Ledger Totals ({filteredItems.length} items)
                                </td>
                                
                                {/* AV Totals */}
                                <td className="px-2 py-2 text-right bg-blue-100/85 dark:bg-blue-950/60 text-blue-950 dark:text-blue-200 font-black">{Number(totals.qty).toLocaleString()}</td>
                                <td className="px-2 py-2 text-right bg-blue-100/50 dark:bg-blue-950/30">-</td>
                                <td className="px-2 py-2 text-right bg-blue-100/85 dark:bg-blue-950/60 text-blue-950 dark:text-blue-200 font-black">{formatCurrency(totals.invForeign)}</td>
                                <td className="px-2 py-2 text-right bg-blue-100/50 dark:bg-blue-950/30">{formatCurrency(totals.freightForeign)}</td>
                                <td className="px-2 py-2 text-right bg-blue-100/50 dark:bg-blue-950/30">-</td>
                                <td className="px-2 py-2 text-right bg-blue-100/85 dark:bg-blue-950/60 text-blue-950 dark:text-blue-200 font-black">{formatCurrency(totals.invPKR)}</td>
                                <td className="px-2 py-2 text-right bg-blue-100/50 dark:bg-blue-950/30">{formatCurrency(totals.ins)}</td>
                                <td className="px-2 py-2 text-right bg-blue-100/50 dark:bg-blue-950/30">{formatCurrency(totals.land)}</td>
                                <td className="px-2 py-2 text-right bg-blue-200 dark:bg-blue-900 text-blue-955 dark:text-blue-100 font-black border-r border-blue-300 dark:border-blue-950">{formatCurrency(totals.av)}</td>
                                 {!isLocalPurchase && (
                                     <>
                                         {/* Duty Totals */}
                                         <td className="px-2 py-2 text-right bg-amber-100/70 dark:bg-amber-950/60 text-amber-955 dark:text-amber-200 font-black">{Number(totals.cd).toLocaleString()}</td>
                                         <td className="px-2 py-2 text-right bg-amber-100/70 dark:bg-amber-950/60 text-amber-955 dark:text-amber-200 font-black">{Number(totals.rd).toLocaleString()}</td>
                                         <td className="px-2 py-2 text-right bg-amber-100/70 dark:bg-amber-950/60 text-amber-955 dark:text-amber-200 font-black">{Number(totals.acd).toLocaleString()}</td>
                                         <td className="px-2 py-2 text-right bg-amber-100/50 dark:bg-amber-950/30 text-slate-500 dark:text-slate-400 font-bold">
                                             {(totals.av + totals.cd + totals.rd + totals.acd).toLocaleString()}
                                         </td>
                                         <td className="px-2 py-2 text-right bg-amber-100/70 dark:bg-amber-950/60 text-amber-955 dark:text-amber-200 font-black">{Number(totals.st).toLocaleString()}</td>
                                         <td className="px-2 py-2 text-right bg-amber-100/70 dark:bg-amber-950/60 text-amber-955 dark:text-amber-200 font-black">{Number(totals.ast).toLocaleString()}</td>
                                         <td className="px-2 py-2 text-right bg-amber-100/50 dark:bg-amber-950/30 text-slate-500 dark:text-slate-400 font-bold">
                                             {(totals.av + totals.cd + totals.rd + totals.acd + totals.st + totals.ast).toLocaleString()}
                                         </td>
                                         <td className="px-2 py-2 text-right bg-amber-100/70 dark:bg-amber-950/60 text-amber-955 dark:text-amber-200 font-black">{Number(totals.it).toLocaleString()}</td>
                                         {/* Excise Charges Amount Total */}
                                         <td className="px-2 py-2 text-right bg-orange-100 dark:bg-orange-950/50 text-orange-955 dark:text-orange-200 font-black">{Number(totals.excise).toLocaleString()}</td>
                                         <td className="px-2 py-2 text-right bg-amber-200 dark:bg-amber-900 text-amber-955 dark:text-amber-100 font-black border-r border-amber-300 dark:border-amber-950">{formatCurrency(totals.totalDuty)}</td>

                                         {/* Freight MIS Total */}
                                         <td className="px-2 py-2 text-right bg-purple-100 dark:bg-purple-950/50 text-purple-955 dark:text-purple-200 font-black border-r border-purple-300 dark:border-purple-800">{formatCurrency(totals.misFreight)}</td>

                                         {/* MIS breakdown Totals */}
                                         <td className="px-2 py-2 text-right bg-emerald-50 dark:bg-emerald-950/10">-</td>
                                         <td className="px-2 py-2 text-right bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-955 dark:text-emerald-200 font-black">{formatCurrency(totals.misFreight)}</td>
                                         <td className="px-2 py-2 text-center bg-emerald-50 dark:bg-emerald-950/10">-</td>
                                         <td className="px-2 py-2 text-center bg-emerald-50 dark:bg-emerald-950/10">-</td>
                                         <td className="px-2 py-2 text-right bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-955 dark:text-emerald-200 font-black">{Number(totals.misDoThc).toLocaleString()}</td>
                                         <td className="px-2 py-2 text-center bg-emerald-50 dark:bg-emerald-950/10">-</td>
                                         <td className="px-2 py-2 text-center bg-emerald-50 dark:bg-emerald-950/10">-</td>
                                         <td className="px-2 py-2 text-right bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-955 dark:text-emerald-200 font-black">{Number(totals.misBank).toLocaleString()}</td>
                                         <td className="px-2 py-2 text-right bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-955 dark:text-emerald-200 font-black">{Number(totals.misInsurance).toLocaleString()}</td>
                                         <td className="px-2 py-2 text-center bg-emerald-50 dark:bg-emerald-950/10">-</td>
                                         <td className="px-2 py-2 text-right bg-emerald-100/80 dark:bg-emerald-950/5 text-emerald-955 dark:text-emerald-200 font-black">{formatCurrency(totals.misClgFwd)}</td>
                                         <td className="px-2 py-2 text-center bg-emerald-50 dark:bg-emerald-950/10 border-r border-emerald-300 dark:border-emerald-800">-</td>

                                         {/* Final Totals */}
                                         <td className="px-2 py-2 text-right bg-slate-105 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-black">{formatCurrency(totals.totalOther)}</td>
                                     </>
                                 )}
                                 <td className="px-2 py-2 text-right bg-slate-105 dark:bg-slate-900">-</td>
                                <td className="px-2 py-2 text-right bg-indigo-600 dark:bg-indigo-700 text-white font-black text-xs">{formatCurrency(totals.totalCost)}</td>
                            </tr>
                        </tfoot>
                    </Table>
                </div>
            </div>

            {/* Signature Section */}
            <div className="mt-12 grid grid-cols-3 gap-8 text-center pt-8 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-4">
                    <div className="h-10"></div>
                    <div className="border-t border-slate-300 dark:border-slate-700 pt-2 uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">Prepared By</div>
                </div>
                <div className="space-y-4">
                    <div className="h-10"></div>
                    <div className="border-t border-slate-300 dark:border-slate-700 pt-2 uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">Internal Audit</div>
                </div>
                <div className="space-y-4">
                    <div className="h-10"></div>
                    <div className="border-t border-slate-300 dark:border-slate-700 pt-2 uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">Management Approval</div>
                </div>
            </div>
        </div>
    );
}
