'use client';

import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Upload,
    FileText,
    CheckCircle2,
    XCircle,
    Loader2,
    Download,
    X,
    AlertTriangle,
    FileSpreadsheet,
    StopCircle,
    RefreshCcw,
    Package,
} from 'lucide-react';
import { inventoryApi } from '@/lib/api';
import { toast } from 'sonner';

// --- Types -------------------------------------------------------------------

interface ParsedRow {
    rowIndex: number;
    barCode: string;
    quantity: number;
}

export interface SalesOrderImportItem {
    id: string;
    sku: string;
    description: string;
    availableStock: number;
    costPrice: number;
    salePrice: number;
    taxRate: number;
    quantity: number;
}

type RowStatus = 'pending' | 'searching' | 'found' | 'not_found' | 'no_stock' | 'over_qty' | 'error';

interface RowResult {
    rowIndex: number;
    barCode: string;
    requestedQuantity: number;  // original from Excel
    quantity: number;           // final quantity to be added to order
    status: RowStatus;
    id?: string;
    sku?: string;
    description?: string;
    availableStock?: number;
    costPrice?: number;
    salePrice?: number;
    taxRate?: number;
    reason?: string;      // error/warning reason
    mergeNote?: string;   // shown when rows were combined
}

type Phase = 'select' | 'running' | 'done';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    warehouseId: string;
    warehouseName?: string;
    onImportComplete: (items: SalesOrderImportItem[]) => void;
}

// --- Helper: parse file ------------------------------------------------------

function parseFile(file: File): Promise<ParsedRow[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                const normalise = (k: string) => k.toLowerCase().replace(/[\s_\-]/g, '');
                const rows: ParsedRow[] = [];
                jsonRows.forEach((raw, idx) => {
                    const keys = Object.keys(raw);
                    const barcodeKey = keys.find((k) =>
                        ['barcode', 'barcodenumber', 'bar_code', 'sku', 'itemcode'].includes(normalise(k))
                    );
                    const qtyKey = keys.find((k) => ['quantity', 'qty'].includes(normalise(k)));
                    const barCode = barcodeKey ? String(raw[barcodeKey]).trim() : '';
                    const quantity = qtyKey ? parseFloat(String(raw[qtyKey])) : NaN;
                    if (barCode) {
                        rows.push({
                            rowIndex: idx + 2,
                            barCode,
                            quantity: isNaN(quantity) || quantity <= 0 ? 1 : Math.floor(quantity),
                        });
                    }
                });
                resolve(rows);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

// --- Status badge ------------------------------------------------------------

function StatusBadge({ status }: { status: RowStatus }) {
    switch (status) {
        case 'pending':
            return <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold text-muted-foreground">Pending</Badge>;
        case 'searching':
            return <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold text-blue-500 border-blue-300 bg-blue-50 animate-pulse">Searching</Badge>;
        case 'found':
            return <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold text-green-600 border-green-300 bg-green-50">✓ Found</Badge>;
        case 'not_found':
            return <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold text-destructive border-destructive/30 bg-destructive/5">Not Found</Badge>;
        case 'no_stock':
            return <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold text-amber-600 border-amber-300 bg-amber-50">No Stock</Badge>;
        case 'over_qty':
            return <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold text-rose-700 border-rose-400 bg-rose-50">Qty Exceeded</Badge>;
        case 'error':
            return <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold text-destructive border-destructive/30 bg-destructive/5">Error</Badge>;
    }
}

// --- Component ---------------------------------------------------------------

export function SalesOrderBulkItemUploadModal({
    open,
    onOpenChange,
    warehouseId,
    warehouseName,
    onImportComplete,
}: Props) {
    const [phase, setPhase] = useState<Phase>('select');
    const [file, setFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [rows, setRows] = useState<RowResult[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef(false);
    const scrollBottomRef = useRef<HTMLDivElement>(null);

    const total = rows.length;
    const processed = rows.filter((r) => r.status !== 'pending' && r.status !== 'searching').length;
    const found = rows.filter((r) => r.status === 'found').length;
    const failed = rows.filter((r) => ['not_found', 'no_stock', 'over_qty', 'error'].includes(r.status)).length;
    const progress = total > 0 ? Math.round((processed / total) * 100) : 0;
    const isRunning = phase === 'running';
    const isDone = phase === 'done';

    const handleFileSelect = (f: File | undefined) => {
        if (!f) return;
        const ext = f.name.split('.').pop()?.toLowerCase();
        if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
            setFile(f);
        } else {
            toast.error('Invalid file type. Please upload CSV or Excel (.csv, .xlsx, .xls) files.');
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleDownloadTemplate = () => {
        const csvContent = 'BarCode,Quantity\n889362319896,10\n889362319897,5\n889362319898,3';
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'sales_order_items_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Template CSV downloaded successfully.');
    };

    const handleStart = useCallback(async () => {
        if (!file) return;
        if (!warehouseId) {
            toast.error('Please select a warehouse before uploading items.');
            return;
        }
        abortRef.current = false;
        let parsed: ParsedRow[];
        try {
            parsed = await parseFile(file);
        } catch {
            toast.error('Failed to parse file. Check the format and try again.');
            return;
        }
        if (parsed.length === 0) {
            toast.error('No valid rows found. Ensure the file has "BarCode" and "Quantity" columns.');
            return;
        }

        // ── Merge duplicate barcodes: sum their quantities ────────────────────
        const mergeMap = new Map<string, { rowIndex: number; rowNumbers: number[]; quantity: number }>();
        parsed.forEach((r) => {
            const key = r.barCode.toLowerCase();
            if (mergeMap.has(key)) {
                const existing = mergeMap.get(key)!;
                existing.quantity += r.quantity;
                existing.rowNumbers.push(r.rowIndex);
            } else {
                mergeMap.set(key, { rowIndex: r.rowIndex, rowNumbers: [r.rowIndex], quantity: r.quantity });
            }
        });
        // Rebuild as deduplicated parsed rows, preserving original barCode casing
        const barcaseLookup = new Map<string, string>();
        parsed.forEach((r) => { if (!barcaseLookup.has(r.barCode.toLowerCase())) barcaseLookup.set(r.barCode.toLowerCase(), r.barCode); });
        const deduped: (ParsedRow & { mergedFrom?: number[] })[] = [];
        mergeMap.forEach((val, key) => {
            deduped.push({
                rowIndex: val.rowIndex,
                barCode: barcaseLookup.get(key) || key,
                quantity: val.quantity,
                mergedFrom: val.rowNumbers.length > 1 ? val.rowNumbers : undefined,
            });
        });

        if (parsed.length !== deduped.length) {
            toast.info('Duplicate barcodes detected — quantities combined into ' + deduped.length + ' unique item(s).');
        }

        const initRows: RowResult[] = deduped.map((r) => ({
            rowIndex: r.rowIndex,
            barCode: r.barCode,
            requestedQuantity: r.quantity,
            quantity: r.quantity,
            status: 'pending',
            mergeNote: r.mergedFrom
                ? 'Rows ' + r.mergedFrom.join(', ') + ' combined → total qty ' + r.quantity
                : undefined,
        }));
        setRows(initRows);
        setCurrentIndex(0);
        setPhase('running');
        const results: RowResult[] = [...initRows];
        for (let i = 0; i < deduped.length; i++) {
            if (abortRef.current) break;
            const row = deduped[i];
            results[i] = { ...results[i], status: 'searching' };
            setRows([...results]);
            setCurrentIndex(i);
            try {
                const res = await inventoryApi.search(row.barCode, warehouseId);
                if (res.status && res.data && res.data.length > 0) {
                    const product = res.data[0];
                    const availableStock = Number(product.totalQuantity || product.stockQty || 0);
                    if (availableStock <= 0) {
                        results[i] = {
                            ...results[i],
                            status: 'no_stock',
                            sku: product.sku || product.barCode || row.barCode,
                            description: product.description || 'Unknown Item',
                            availableStock: 0,
                            reason: 'Item found but out of stock in selected warehouse',
                        };
                    } else if (row.quantity > availableStock) {
                        // Quantity exceeds available stock — validation error, skip this item
                        results[i] = {
                            ...results[i],
                            status: 'over_qty',
                            sku: product.sku || product.barCode || row.barCode,
                            description: product.description || 'Unknown Item',
                            availableStock,
                            reason: 'Requested ' + row.quantity + ' units but only ' + availableStock + ' available in warehouse',
                        };
                    } else {
                        // Quantity is within available stock — all good
                        results[i] = {
                            ...results[i],
                            status: 'found',
                            id: product.id,
                            sku: product.sku || product.barCode || row.barCode,
                            description: product.description || 'Unknown Item',
                            availableStock,
                            costPrice: Number(product.unitCost || 0),
                            salePrice: Number(product.unitPrice || 0),
                            taxRate: Number(product.taxRate1 || 0),
                            quantity: row.quantity,
                            reason: undefined,  // clear any pending reason
                        };
                    }
                } else {
                    results[i] = {
                        ...results[i],
                        status: 'not_found',
                        reason: 'Barcode not found in warehouse inventory',
                    };
                }
            } catch (err: any) {
                results[i] = {
                    ...results[i],
                    status: 'error',
                    reason: err?.message || 'Search request failed',
                };
            }
            setRows([...results]);
            setTimeout(() => { scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 50);
            await new Promise((res) => setTimeout(res, 80));
        }
        setPhase('done');
        const matched = results.filter((r) => r.status === 'found');
        if (matched.length === 0) {
            toast.error('No items were found or in stock. Please check your barcodes and selected warehouse.');
        } else if (matched.length < results.length) {
            toast.warning(matched.length + ' of ' + results.length + ' items matched. ' + (results.length - matched.length) + ' skipped.');
        } else {
            toast.success('All ' + matched.length + ' item(s) matched and ready to add!');
        }
    }, [file, warehouseId]);

    const handleAbort = () => {
        abortRef.current = true;
        setPhase('done');
        toast.info('Import aborted.');
    };

    const handleConfirm = () => {
        const matched = rows.filter((r) => r.status === 'found');
        if (matched.length === 0) {
            toast.error('No matched items to import.');
            return;
        }
        const items: SalesOrderImportItem[] = matched.map((r) => ({
            id: r.id!,
            sku: r.sku!,
            description: r.description || '',
            availableStock: r.availableStock ?? 0,
            costPrice: r.costPrice ?? 0,
            salePrice: r.salePrice ?? 0,
            taxRate: r.taxRate ?? 0,
            quantity: r.quantity,
        }));
        onImportComplete(items);
        onOpenChange(false);
        reset();
    };

    const handleDownloadErrorReport = () => {
        const errors = rows.filter((r) => ['not_found', 'no_stock', 'over_qty', 'error'].includes(r.status));
        if (errors.length === 0) return;
        const ws = XLSX.utils.json_to_sheet(
            errors.map((r) => ({
                Row: r.rowIndex,
                BarCode: r.barCode,
                'Requested Qty': r.quantity,
                'Available Stock': r.availableStock ?? 0,
                Status: r.status.replace('_', ' ').toUpperCase(),
                Reason: r.reason || 'Not found',
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Errors');
        XLSX.writeFile(wb, 'sales_order_import_errors_' + new Date().toISOString().slice(0, 10) + '.xlsx');
        toast.success('Error report downloaded.');
    };

    const reset = () => {
        setFile(null);
        setRows([]);
        setCurrentIndex(0);
        setPhase('select');
        setIsDragOver(false);
        abortRef.current = false;
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        if (isRunning) handleAbort();
        onOpenChange(false);
        setTimeout(reset, 300);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent
                onInteractOutside={(e) => { if (isRunning) e.preventDefault(); }}
                className="sm:max-w-[820px] w-full flex flex-col p-0 bg-card max-h-[90vh]"
            >
                <DialogHeader className="p-6 pb-4 border-b bg-muted/30 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-violet-100 text-violet-700 p-2.5 rounded-xl">
                                <FileSpreadsheet className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold tracking-tight">Bulk Import Items</DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    Upload a CSV/Excel with{' '}
                                    <span className="font-mono font-bold text-violet-600">BarCode</span> and{' '}
                                    <span className="font-mono font-bold text-violet-600">Quantity</span>{' '}
                                    columns. Items are validated against the selected warehouse.
                                </DialogDescription>
                            </div>
                        </div>
                        {warehouseName && (
                            <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-md text-xs font-semibold text-violet-800 shrink-0">
                                <Package className="h-4 w-4 text-violet-600" />
                                <span>WH: <strong>{warehouseName}</strong></span>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 w-full overflow-y-auto max-h-[55vh]">
                    <div className="p-6 space-y-5">
                        {phase === 'select' && (
                            <>
                                <div
                                    className={"border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer " + (isDragOver ? 'border-violet-500 bg-violet-50/50' : file ? 'border-emerald-400 bg-emerald-50/20' : 'border-muted-foreground/25 hover:border-violet-400 hover:bg-muted/30')}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={(e) => handleFileSelect(e.target.files?.[0])} />
                                    {file ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="bg-emerald-100 text-emerald-700 p-3 rounded-full"><FileText className="h-8 w-8" /></div>
                                            <div className="font-bold text-base">{file.name}</div>
                                            <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB - Ready for validation</div>
                                            <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive hover:bg-destructive/10 mt-1 h-7" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                                                <X className="h-3.5 w-3.5 mr-1" /> Remove File
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="bg-violet-50 text-violet-600 p-3 rounded-full"><Upload className="h-8 w-8" /></div>
                                            <div className="font-bold text-base">Click to browse or drag and drop your file</div>
                                            <p className="text-xs text-muted-foreground max-w-sm">Supports CSV or Excel (.xlsx, .xls) containing <span className="font-mono text-violet-600 font-bold">BarCode</span> and <span className="font-mono text-violet-600 font-bold">Quantity</span> columns.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between bg-muted/40 border rounded-xl p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-background rounded-lg border text-violet-600"><Download className="h-4 w-4" /></div>
                                        <div>
                                            <div className="text-xs font-bold">Download Standard Template</div>
                                            <div className="text-[11px] text-muted-foreground">2-column CSV format (BarCode, Quantity) compatible with barcode scanners.</div>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" className="text-xs font-bold text-violet-700 border-violet-200 hover:bg-violet-50 shrink-0" onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(); }}>
                                        <Download className="h-3.5 w-3.5 mr-1.5" /> Download CSV
                                    </Button>
                                </div>
                            </>
                        )}

                        {(phase === 'running' || phase === 'done') && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-muted-foreground">{isDone ? 'Validation complete' : ('Validating row ' + (currentIndex + 1) + ' of ' + total + '...')}</span>
                                        <span className="font-bold text-violet-600">{progress}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2 bg-muted" />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Valid Items</span>
                                        <span className="text-2xl font-black text-emerald-700 mt-1">{found} <span className="text-xs font-semibold text-emerald-600">found</span></span>
                                    </div>
                                    <div className={"rounded-xl p-3.5 flex flex-col border " + (failed > 0 ? 'bg-rose-50 border-rose-200' : 'bg-muted/40 border-muted')}>
                                        <span className={"text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 " + (failed > 0 ? 'text-rose-700' : 'text-muted-foreground')}>
                                            <XCircle className="h-3.5 w-3.5" /> Skipped
                                        </span>
                                        <span className={"text-2xl font-black mt-1 " + (failed > 0 ? 'text-rose-700' : 'text-gray-700')}>{failed} <span className="text-xs font-semibold text-muted-foreground">items</span></span>
                                    </div>
                                    <div className="bg-muted/40 border rounded-xl p-3.5 flex flex-col">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Total Rows</span>
                                        <span className="text-2xl font-black text-gray-900 mt-1">{total} <span className="text-xs font-semibold text-muted-foreground">processed</span></span>
                                    </div>
                                </div>
                                <div className="border rounded-xl overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="font-bold text-xs w-10">#</TableHead>
                                                <TableHead className="font-bold text-xs">Barcode</TableHead>
                                                <TableHead className="font-bold text-xs">Item</TableHead>
                                                <TableHead className="font-bold text-xs text-center">Req. Qty</TableHead>
                                                <TableHead className="font-bold text-xs text-center">Stock</TableHead>
                                                <TableHead className="font-bold text-xs text-center">Final Qty</TableHead>
                                                <TableHead className="font-bold text-xs">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rows.map((r, idx) => (
                                                <TableRow key={idx} className={"text-xs transition-colors " + (r.status === 'searching' ? 'bg-blue-50/50' : '') + (r.status === 'found' ? 'bg-emerald-50/30' : '') + (['not_found', 'no_stock', 'over_qty', 'error'].includes(r.status) ? 'bg-rose-50/30' : '')}>
                                                    <TableCell className="text-muted-foreground font-mono">{r.rowIndex}</TableCell>
                                                    <TableCell className="font-mono font-bold text-violet-700">{r.barCode}</TableCell>
                                                    <TableCell className="max-w-[180px]">
                                                        {r.status === 'searching' ? (
                                                            <div className="flex items-center gap-1.5 text-blue-600"><Loader2 className="h-3 w-3 animate-spin" /><span className="text-[10px]">Searching...</span></div>
                                                        ) : (
                                                            <div>
                                                                {r.sku && <div className="font-mono text-[10px] text-muted-foreground">{r.sku}</div>}
                                                                <div className="truncate">{r.description || (r.status === 'pending' ? <span className="text-muted-foreground italic text-[10px]">Pending...</span> : '-')}</div>
                                                                {r.mergeNote && <div className="text-[10px] mt-0.5 text-blue-600 font-semibold">{r.mergeNote}</div>}
                                                                {r.reason && <div className="text-[10px] mt-0.5 text-rose-600 font-semibold">{r.reason}</div>}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold">{r.requestedQuantity ?? r.quantity}</TableCell>
                                                    <TableCell className={"text-center font-bold " + ((r.availableStock ?? 0) > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                                                        {r.availableStock != null ? r.availableStock : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-violet-700">{r.status === 'found' ? r.quantity : '-'}</TableCell>
                                                    <TableCell><StatusBadge status={r.status} /></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <div ref={scrollBottomRef} />
                                </div>
                                {isDone && failed > 0 && (
                                    <div className="flex items-center justify-between border border-rose-200 bg-rose-50/30 rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-rose-700">
                                            <AlertTriangle className="h-4 w-4 shrink-0" />
                                            <span className="text-xs font-semibold">{failed} item(s) could not be resolved. Download the error report for details.</span>
                                        </div>
                                        <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-rose-300 text-rose-700 hover:bg-rose-50 gap-1.5 shrink-0" onClick={handleDownloadErrorReport}>
                                            <Download className="h-3.5 w-3.5" /> Download Error Report
                                        </Button>
                                    </div>
                                )}
                                {isDone && failed === 0 && found > 0 && (
                                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                        <div className="text-xs text-emerald-800"><strong>Perfect Match!</strong> All {found} items have available stock in <strong>{warehouseName || 'the selected warehouse'}</strong>.</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 border-t bg-muted/20 shrink-0 flex-row items-center justify-between gap-2">
                    <Button variant="outline" onClick={handleClose}>{isRunning ? 'Close (aborts)' : 'Cancel'}</Button>
                    <div className="flex items-center gap-2">
                        {phase === 'select' && (
                            <Button className="bg-violet-600 hover:bg-violet-700 text-white font-bold gap-2" disabled={!file} onClick={handleStart}>
                                <Upload className="h-4 w-4" /> Validate and Import
                            </Button>
                        )}
                        {isRunning && (
                            <Button variant="destructive" className="font-bold gap-2" onClick={handleAbort}>
                                <StopCircle className="h-4 w-4" /> Abort
                            </Button>
                        )}
                        {isDone && (
                            <>
                                <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5" onClick={reset}>
                                    <RefreshCcw className="h-3.5 w-3.5" /> Upload Different File
                                </Button>
                                <Button className="bg-violet-600 hover:bg-violet-700 text-white font-bold gap-2" disabled={found === 0} onClick={handleConfirm}>
                                    <CheckCircle2 className="h-4 w-4" /> Add {found} Item{found !== 1 ? 's' : ''} to Order
                                </Button>
                            </>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
