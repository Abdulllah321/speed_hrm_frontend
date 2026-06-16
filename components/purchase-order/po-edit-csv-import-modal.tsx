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
    RefreshCcw,
} from 'lucide-react';
import { inventoryApi } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedRow {
    rowIndex: number;
    barCode: string;
    quantity: number;
}

export interface ImportedOrderItem {
    itemId: string;
    itemName: string;
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

type RowStatus = 'pending' | 'searching' | 'found' | 'not_found' | 'error';

interface RowResult {
    rowIndex: number;
    barCode: string;
    quantity: number;
    status: RowStatus;
    /** Resolved item info when found */
    itemId?: string;
    itemName?: string;
    description?: string;
    unitPrice?: number;
    /** Error / reason when not found */
    reason?: string;
}

type Phase = 'select' | 'running' | 'done';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Called with matched items to replace PO items list */
    onImportComplete: (items: ImportedOrderItem[]) => void;
}

// ─── Helper: parse file → rows ────────────────────────────────────────────────

function parseFile(file: File): Promise<ParsedRow[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                // Normalise header names (case-insensitive, strip spaces)
                const normalise = (k: string) => k.toLowerCase().replace(/[\s_\-]/g, '');

                const rows: ParsedRow[] = [];
                jsonRows.forEach((raw, idx) => {
                    const keys = Object.keys(raw);
                    const barcodeKey = keys.find((k) => ['barcode', 'bar_code', 'bar code'].includes(normalise(k)));
                    const qtyKey = keys.find((k) => ['quantity', 'qty'].includes(normalise(k)));

                    const barCode = barcodeKey ? String(raw[barcodeKey]).trim() : '';
                    const quantity = qtyKey ? parseFloat(String(raw[qtyKey])) : NaN;

                    if (barCode) {
                        rows.push({
                            rowIndex: idx + 2, // 1-based + header
                            barCode,
                            quantity: isNaN(quantity) || quantity <= 0 ? 1 : quantity,
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

// ─── Component ───────────────────────────────────────────────────────────────

export function PoEditCsvImportModal({ open, onOpenChange, onImportComplete }: Props) {
    const [phase, setPhase] = useState<Phase>('select');
    const [file, setFile] = useState<File | null>(null);
    const [rows, setRows] = useState<RowResult[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef(false);
    const scrollBottomRef = useRef<HTMLDivElement>(null);

    // ── Derived ──────────────────────────────────────────────────────────────

    const total = rows.length;
    const processed = rows.filter((r) => r.status !== 'pending' && r.status !== 'searching').length;
    const found = rows.filter((r) => r.status === 'found').length;
    const notFound = rows.filter((r) => r.status === 'not_found' || r.status === 'error').length;
    const progress = total > 0 ? Math.round((processed / total) * 100) : 0;
    const isRunning = phase === 'running';
    const isDone = phase === 'done';

    // ── File handling ─────────────────────────────────────────────────────────

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const ext = f.name.split('.').pop()?.toLowerCase();
        if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
            setFile(f);
        } else {
            toast.error('Invalid file type. Please upload CSV or Excel files.');
        }
    };

    // ── Run import ────────────────────────────────────────────────────────────

    const handleStart = useCallback(async () => {
        if (!file) return;
        abortRef.current = false;

        let parsed: ParsedRow[];
        try {
            parsed = await parseFile(file);
        } catch {
            toast.error('Failed to parse file. Check the format.');
            return;
        }

        if (parsed.length === 0) {
            toast.error('No valid rows found. Ensure the file has "barCode" and "quantity" columns.');
            return;
        }

        // Initialise result rows
        const initRows: RowResult[] = parsed.map((r) => ({
            rowIndex: r.rowIndex,
            barCode: r.barCode,
            quantity: r.quantity,
            status: 'pending',
        }));

        setRows(initRows);
        setCurrentIndex(0);
        setPhase('running');

        const results: RowResult[] = [...initRows];

        for (let i = 0; i < parsed.length; i++) {
            if (abortRef.current) break;

            const row = parsed[i];

            // Mark as searching
            results[i] = { ...results[i], status: 'searching' };
            setRows([...results]);
            setCurrentIndex(i);

            try {
                const res = await inventoryApi.search(row.barCode);
                if (res.status && res.data && res.data.length > 0) {
                    // Prefer exact barCode match (case-insensitive); fall back to first result
                    const exactMatch = res.data.find(
                        (i: any) => i.barCode?.trim().toLowerCase() === row.barCode.trim().toLowerCase()
                    );
                    const item = exactMatch ?? null;

                    if (!item) {
                        results[i] = {
                            ...results[i],
                            status: 'not_found',
                            reason: 'No exact barcode match found',
                        };
                    } else {
                        results[i] = {
                            ...results[i],
                            status: 'found',
                            itemId: item.id,
                            itemName: item.sku,
                            description: item.description || '',
                            unitPrice: Number(item.unitPrice ?? 0),
                        };
                    }
                } else {
                    results[i] = {
                        ...results[i],
                        status: 'not_found',
                        reason: 'No item found for this barcode',
                    };
                }
            } catch (err: any) {
                results[i] = {
                    ...results[i],
                    status: 'error',
                    reason: err?.message || 'Search failed',
                };
            }

            setRows([...results]);

            // Scroll to bottom of list
            setTimeout(() => {
                scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 50);

            // Small debounce so UI updates are visible (avoid hammering API)
            await new Promise((res) => setTimeout(res, 80));
        }

        setPhase('done');

        const matched = results.filter((r) => r.status === 'found');
        if (matched.length === 0) {
            toast.error('No items were found. Check your barcodes.');
        } else {
            toast.success(`${matched.length} item(s) matched and ready to import.`);
        }
    }, [file]);

    // ── Abort ─────────────────────────────────────────────────────────────────

    const handleAbort = () => {
        abortRef.current = true;
        setPhase('done');
        toast.info('Import aborted.');
    };

    // ── Confirm import ────────────────────────────────────────────────────────

    const handleConfirm = () => {
        const matched = rows.filter((r) => r.status === 'found');
        if (matched.length === 0) {
            toast.error('No matched items to import.');
            return;
        }

        const items: ImportedOrderItem[] = matched.map((r) => ({
            itemId: r.itemId!,
            itemName: r.itemName!,
            description: r.description || '',
            quantity: r.quantity,
            unitPrice: r.unitPrice ?? 0,
            lineTotal: r.quantity * (r.unitPrice ?? 0),
        }));

        onImportComplete(items);
        onOpenChange(false);
        reset();
    };

    // ── Export error report ───────────────────────────────────────────────────

    const handleDownloadErrorReport = () => {
        const errors = rows.filter((r) => r.status === 'not_found' || r.status === 'error');
        if (errors.length === 0) return;

        const ws = XLSX.utils.json_to_sheet(
            errors.map((r) => ({
                Row: r.rowIndex,
                BarCode: r.barCode,
                Quantity: r.quantity,
                Reason: r.reason || 'Not found',
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Errors');
        XLSX.writeFile(wb, 'po_edit_import_errors.xlsx');
    };

    // ── Reset ─────────────────────────────────────────────────────────────────

    const reset = () => {
        setFile(null);
        setRows([]);
        setCurrentIndex(0);
        setPhase('select');
        abortRef.current = false;
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        if (isRunning) {
            handleAbort();
        }
        onOpenChange(false);
        setTimeout(reset, 300);
    };

    // ─── Status badge helper ──────────────────────────────────────────────────

    const statusBadge = (status: RowStatus) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold text-muted-foreground">Pending</Badge>;
            case 'searching':
                return <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold text-blue-500 border-blue-300 bg-blue-50 dark:bg-blue-950/30 animate-pulse">Searching…</Badge>;
            case 'found':
                return <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">Found</Badge>;
            case 'not_found':
                return <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold text-destructive border-destructive/30 bg-destructive/5">Not Found</Badge>;
            case 'error':
                return <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">Error</Badge>;
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent
                showCloseButton={false}
                noScroll
                onInteractOutside={(e) => { if (isRunning) e.preventDefault(); }}
                className="sm:max-w-[800px] w-full flex flex-col p-0 bg-card max-h-[90vh]"
            >
                {/* ── Header ── */}
                <DialogHeader className="p-6 pb-3 border-b bg-muted/30 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        Import Items from CSV / Excel
                        {phase !== 'select' && (
                            <Badge variant="outline" className="ml-2 capitalize text-xs">
                                {phase === 'running' ? 'Processing…' : 'Done'}
                            </Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        Upload a CSV or Excel file with <span className="font-mono font-bold">barCode</span> and <span className="font-mono font-bold">quantity</span> columns.
                        Existing items will be replaced with the matched items.
                    </DialogDescription>
                </DialogHeader>

                {/* ── Body ── */}
                <ScrollArea className="flex-1 w-full overflow-y-auto">
                    <div className="p-6 space-y-5">

                        {/* ── Phase: Select file ── */}
                        {phase === 'select' && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-400">
                                {/* Drop zone */}
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        'border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 group',
                                        file
                                            ? 'border-primary/50 bg-primary/5'
                                            : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/50'
                                    )}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".csv,.xlsx,.xls"
                                        className="hidden"
                                    />
                                    {file ? (
                                        <>
                                            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                                                <FileText className="h-8 w-8 text-primary" />
                                            </div>
                                            <div className="text-center space-y-1">
                                                <p className="font-bold text-lg">{file.name}</p>
                                                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                                                    <Badge variant="secondary" className="font-mono">{(file.size / 1024).toFixed(1)} KB</Badge>
                                                    Ready to import
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFile(null);
                                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                                }}
                                            >
                                                <X className="h-4 w-4 mr-1" /> Change File
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                                                <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                            <div className="text-center space-y-2">
                                                <p className="font-bold text-lg">Click to select file</p>
                                                <p className="text-sm text-muted-foreground max-w-xs">
                                                    File must have <span className="font-mono font-semibold">barCode</span> and <span className="font-mono font-semibold">quantity</span> columns.
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                {['.CSV', '.XLSX', '.XLS'].map((ext) => (
                                                    <Badge key={ext} variant="outline" className="bg-background/50 font-mono">{ext}</Badge>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Column hint */}
                                <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                    <div className="text-sm text-muted-foreground space-y-1">
                                        <p className="font-semibold text-foreground">How it works</p>
                                        <ul className="list-disc pl-4 space-y-0.5">
                                            <li>Each row is looked up by its barcode in the item master.</li>
                                            <li>All currently selected PO items will be <strong>cleared</strong> and replaced with matched results.</li>
                                            <li>Barcodes not found will be reported — existing items are not touched for those rows.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Phase: Running / Done ── */}
                        {(phase === 'running' || phase === 'done') && (
                            <div className="space-y-6 animate-in fade-in duration-400">

                                {/* Progress section */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                {isRunning && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                                {isDone && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                                <p className="text-xs font-black text-primary uppercase tracking-widest">
                                                    {isRunning ? `Processing row ${currentIndex + 1} of ${total}…` : 'Processing complete'}
                                                </p>
                                            </div>
                                            <p className="text-lg font-black truncate max-w-[380px] text-foreground">{file?.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-baseline justify-end gap-1">
                                                <span className="text-4xl font-black text-primary">{progress}</span>
                                                <span className="text-xl font-bold text-primary/70">%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Progress value={progress} className="h-3 rounded-full" />
                                </div>

                                {/* Stats cards */}
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="bg-muted/40 p-4 rounded-2xl border flex flex-col items-center justify-center shadow-sm">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Rows</span>
                                        <span className="text-3xl font-black">{total}</span>
                                    </div>
                                    <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 flex flex-col items-center justify-center shadow-sm">
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Processed</span>
                                        <span className="text-3xl font-black text-blue-600">{processed}</span>
                                    </div>
                                    <div className="bg-green-500/10 p-4 rounded-2xl border border-green-500/20 flex flex-col items-center justify-center shadow-sm">
                                        <span className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Found</span>
                                        <span className="text-3xl font-black text-green-600">{found}</span>
                                    </div>
                                    <div className="bg-destructive/10 p-4 rounded-2xl border border-destructive/20 flex flex-col items-center justify-center shadow-sm">
                                        <span className="text-[10px] font-black text-destructive uppercase tracking-widest mb-1">Not Found</span>
                                        <span className="text-3xl font-black text-destructive">{notFound}</span>
                                    </div>
                                </div>

                                {/* Real-time rows table */}
                                <div className="border rounded-xl overflow-hidden shadow-sm bg-background/50">
                                    <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                            Row-by-row Status
                                        </span>
                                        {isDone && notFound > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleDownloadErrorReport}
                                                className="h-7 text-xs font-bold text-destructive hover:bg-destructive/5"
                                            >
                                                <Download className="h-3.5 w-3.5 mr-1.5" />
                                                Download Error Report
                                            </Button>
                                        )}
                                    </div>
                                    <ScrollArea className="h-[280px]">
                                        <Table>
                                            <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                                <TableRow>
                                                    <TableHead className="w-[50px] font-black uppercase text-[10px]">Row</TableHead>
                                                    <TableHead className="font-black uppercase text-[10px]">BarCode</TableHead>
                                                    <TableHead className="font-black uppercase text-[10px] text-right">Qty</TableHead>
                                                    <TableHead className="font-black uppercase text-[10px]">Matched Item</TableHead>
                                                    <TableHead className="font-black uppercase text-[10px]">Status</TableHead>
                                                    <TableHead className="font-black uppercase text-[10px]">Note</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {rows.map((row, i) => (
                                                    <TableRow
                                                        key={i}
                                                        className={cn(
                                                            'transition-colors',
                                                            row.status === 'found' && 'bg-green-500/5',
                                                            row.status === 'not_found' && 'bg-destructive/5',
                                                            row.status === 'searching' && 'bg-blue-500/5',
                                                            row.status === 'error' && 'bg-amber-500/5',
                                                        )}
                                                    >
                                                        <TableCell className="font-mono text-xs font-bold text-muted-foreground">{row.rowIndex}</TableCell>
                                                        <TableCell className="font-mono text-xs font-semibold">{row.barCode}</TableCell>
                                                        <TableCell className="text-xs font-bold text-right">{row.quantity}</TableCell>
                                                        <TableCell className="text-xs">
                                                            {row.status === 'found' ? (
                                                                <div>
                                                                    <div className="font-bold text-foreground">{row.itemName}</div>
                                                                    <div className="text-muted-foreground truncate max-w-[160px]">{row.description}</div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{statusBadge(row.status)}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                                                            {row.reason || (row.status === 'found' ? `PKR ${row.unitPrice?.toFixed(2)}` : '')}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                <tr>
                                                    <td><div ref={scrollBottomRef} /></td>
                                                </tr>
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>

                                {/* Done summary */}
                                {isDone && found > 0 && (
                                    <div className="p-5 bg-green-500/5 border-2 border-green-500/20 rounded-2xl flex items-center gap-4 animate-in zoom-in-95 duration-400">
                                        <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="h-7 w-7 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-black text-green-700">{found} item(s) matched successfully</p>
                                            <p className="text-sm text-green-600/80">
                                                Click <strong>Apply to PO</strong> to replace the current items list with these results.
                                                {notFound > 0 && ` (${notFound} barcode(s) not found will be skipped.)`}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {isDone && found === 0 && (
                                    <div className="p-5 bg-destructive/5 border-2 border-destructive/20 rounded-2xl flex items-center gap-4 animate-in zoom-in-95 duration-400">
                                        <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                                            <XCircle className="h-7 w-7 text-destructive" />
                                        </div>
                                        <div>
                                            <p className="font-black text-destructive">No items matched</p>
                                            <p className="text-sm text-destructive/80">
                                                None of the barcodes could be resolved. Check the file and try again.
                                            </p>
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* ── Footer ── */}
                <DialogFooter className="p-5 border-t bg-muted/30 shrink-0">
                    <div className="flex justify-between w-full items-center">
                        <div>
                            {isRunning && (
                                <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Resolving barcodes — please wait…
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {phase === 'select' && (
                                <>
                                    <Button variant="ghost" onClick={handleClose} className="font-bold">Cancel</Button>
                                    <Button
                                        disabled={!file}
                                        onClick={handleStart}
                                        className="px-8 font-black shadow-lg shadow-primary/20"
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Start Import
                                    </Button>
                                </>
                            )}

                            {isRunning && (
                                <Button
                                    variant="destructive"
                                    onClick={handleAbort}
                                    className="font-bold"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Abort
                                </Button>
                            )}

                            {isDone && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={reset}
                                        className="font-bold"
                                    >
                                        <RefreshCcw className="h-4 w-4 mr-2" />
                                        Re-upload
                                    </Button>
                                    <Button
                                        onClick={handleConfirm}
                                        disabled={found === 0}
                                        className="px-8 font-black bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 disabled:opacity-50"
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Apply to PO ({found} items)
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
