'use client';

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle2, Loader2, Download, X, Info, Database } from 'lucide-react';
import { useUploadProgress } from '@/hooks/use-upload-progress';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiBaseUrl } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BASE = () => `${getApiBaseUrl()}/stock-requisition/bulk-upload`;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    warehouses: { id: string; name: string }[];
    locations: { id: string; name: string; code?: string }[];
    brands: { id: string; name: string }[];
    // Pre-filled defaults from page
    defaultWarehouseId?: string;
    defaultLocationId?: string;
    defaultBrandId?: string;
    defaultDocumentType?: string;
    defaultFinancialYear?: string;
    defaultRemarks?: string;
    defaultNotes?: string;
}

export function SrnBulkUploadModal({
    open, onOpenChange, onSuccess,
    warehouses, locations, brands,
    defaultWarehouseId = '', defaultLocationId = '', defaultBrandId = '',
    defaultDocumentType = 'New Arrival', defaultFinancialYear = '25-26',
    defaultRemarks = '', defaultNotes = '',
}: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [uploadId, setUploadId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const errorEndRef = useRef<HTMLDivElement>(null);

    // Metadata state
    const [fromWarehouseId, setFromWarehouseId] = useState(defaultWarehouseId);
    const [toLocationId, setToLocationId] = useState(defaultLocationId);
    const [brandId, setBrandId] = useState(defaultBrandId || 'none');
    const [documentType, setDocumentType] = useState(defaultDocumentType);
    const [financialYear, setFinancialYear] = useState(defaultFinancialYear);
    const [remarks, setRemarks] = useState(defaultRemarks);
    const [notes, setNotes] = useState(defaultNotes);

    // Sync defaults when modal opens
    React.useEffect(() => {
        if (open) {
            setFromWarehouseId(defaultWarehouseId);
            setToLocationId(defaultLocationId);
            setBrandId(defaultBrandId || 'none');
            setDocumentType(defaultDocumentType);
            setFinancialYear(defaultFinancialYear);
            setRemarks(defaultRemarks);
            setNotes(defaultNotes);
        }
    }, [open]);

    const { data, speed, isValidated, isValidating, isFailed, isProcessing, isCancelled } = useUploadProgress(uploadId, 'srn');

    React.useEffect(() => {
        if (showErrors && errorEndRef.current) errorEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [data?.errors?.length, showErrors]);

    React.useEffect(() => {
        if (data?.errors && data.errors.length > 0) {
            setShowErrors(true);
        }
    }, [data?.errors?.length]);

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

    const handleUpload = async () => {
        if (!file) return;
        if (!fromWarehouseId) { toast.error('Please select a source warehouse first.'); return; }
        if (!toLocationId) { toast.error('Please select a destination location first.'); return; }

        setIsUploading(true);
        setUploadId(null);

        const formData = new FormData();
        formData.append('file', file);

        const params = new URLSearchParams();
        params.append('fromWarehouseId', fromWarehouseId);
        params.append('toLocationId', toLocationId);
        if (brandId && brandId !== 'none') params.append('brandId', brandId);
        params.append('documentType', documentType);
        params.append('financialYear', financialYear);
        if (remarks) params.append('remarks', remarks);
        if (notes) params.append('notes', notes);

        try {
            const res = await fetch(`${BASE()}?${params.toString()}`, { method: 'POST', body: formData, credentials: 'include' });
            const result = await res.json();
            if (result.status && result.data?.uploadId) {
                setUploadId(result.data.uploadId);
                toast.success('File uploaded. Validation started...');
            } else {
                toast.error(result.message || 'Failed to initiate upload');
            }
        } catch {
            toast.error('An error occurred during upload');
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirm = async () => {
        if (!uploadId || isConfirming) return;
        if (!fromWarehouseId) { toast.error('Please select a source warehouse.'); return; }
        if (!toLocationId) { toast.error('Please select a destination location.'); return; }

        setIsConfirming(true);
        const params = new URLSearchParams();
        params.append('fromWarehouseId', fromWarehouseId);
        params.append('toLocationId', toLocationId);
        if (brandId && brandId !== 'none') params.append('brandId', brandId);
        params.append('documentType', documentType);
        params.append('financialYear', financialYear);
        if (remarks) params.append('remarks', remarks);
        if (notes) params.append('notes', notes);

        try {
            const res = await fetch(`${BASE()}/${uploadId}/confirm?${params.toString()}`, { method: 'POST', credentials: 'include' });
            const result = await res.json();
            if (result.status) {
                toast.success('SRN import started');
            } else {
                toast.error(result.message || 'Failed to start import');
                setIsConfirming(false);
            }
        } catch {
            toast.error('An error occurred during confirmation');
            setIsConfirming(false);
        }
    };

    const handleCancel = async () => {
        if (!uploadId) return;
        try {
            const res = await fetch(`${BASE()}/${uploadId}`, { method: 'DELETE', credentials: 'include' });
            const result = await res.json();
            if (result.status) { toast.info('Job cancelled'); setUploadId(null); }
        } catch { }
    };

    const reset = () => {
        setFile(null); setUploadId(null);
        setIsUploading(false); setIsConfirming(false); setShowErrors(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        if (isProcessing) { onOpenChange(false); return; }
        if (data?.status === 'completed' && (data?.successRecords ?? 0) > 0 && onSuccess) { onSuccess(); }
        onOpenChange(false);
        if (data?.status === 'completed' || isFailed || isCancelled || !uploadId) setTimeout(reset, 300);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent
                showCloseButton={false}
                noScroll
                onInteractOutside={(e) => { if (isProcessing) e.preventDefault(); }}
                className="sm:max-w-[780px] w-full flex flex-col p-0 bg-card max-h-[90vh]"
            >
                <DialogHeader className="p-6 pb-2 border-b bg-muted/30 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                        <Upload className="h-6 w-6 text-indigo-600" />
                        Bulk Upload SRN
                        {data?.status && <Badge variant="outline" className="ml-2 capitalize">{data.status}</Badge>}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        Upload a CSV/Excel with <strong>BarCode</strong> column + <strong>Quantity</strong>.
                        Items will be resolved from master data and stock will be reserved automatically.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 w-full overflow-y-auto">
                    <div className="p-6 space-y-6">

                        {/* ── Metadata Settings (always visible) ── */}
                        <div className="p-5 rounded-2xl border bg-indigo-50/40 space-y-4">
                            <div className="flex items-center gap-2 border-b pb-3">
                                <Database className="h-5 w-5 text-indigo-600" />
                                <h4 className="font-bold text-base">SRN Settings</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Source Warehouse <span className="text-destructive">*</span></Label>
                                    <Select value={fromWarehouseId} onValueChange={setFromWarehouseId} disabled={!!uploadId}>
                                        <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Select Warehouse" /></SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Destination Outlet <span className="text-destructive">*</span></Label>
                                    <Select value={toLocationId} onValueChange={setToLocationId} disabled={!!uploadId}>
                                        <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Select Outlet" /></SelectTrigger>
                                        <SelectContent>
                                            {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.code ? `${l.code} · ${l.name}` : l.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Brand (Optional)</Label>
                                    <Select value={brandId} onValueChange={setBrandId} disabled={!!uploadId}>
                                        <SelectTrigger className="bg-background h-10"><SelectValue placeholder="No Brand Filter" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Brand Filter</SelectItem>
                                            {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Document Type</Label>
                                    <Select value={documentType} onValueChange={setDocumentType} disabled={!!uploadId}>
                                        <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="New Arrival">New Arrival</SelectItem>
                                            <SelectItem value="Replenish">Replenish</SelectItem>
                                            <SelectItem value="Store Request">Store Request</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Financial Year</Label>
                                    <Input value={financialYear} onChange={e => setFinancialYear(e.target.value)} disabled={!!uploadId} className="bg-background h-10" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Remarks</Label>
                                    <Input value={remarks} onChange={e => setRemarks(e.target.value)} disabled={!!uploadId} placeholder="e.g. SU26 2ND SHIP" className="bg-background h-10" />
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Notes</Label>
                                    <Input value={notes} onChange={e => setNotes(e.target.value)} disabled={!!uploadId} placeholder="Additional instructions..." className="bg-background h-10" />
                                </div>
                            </div>
                        </div>

                        {!uploadId ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Dropzone */}
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 group ${file ? 'border-indigo-500/50 bg-indigo-50/30' : 'border-muted-foreground/20 hover:border-indigo-400/40 hover:bg-muted/50'}`}
                                >
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv,.xlsx,.xls" className="hidden" />
                                    {file ? (
                                        <>
                                            <div className="h-16 w-16 rounded-2xl bg-indigo-100 flex items-center justify-center">
                                                <FileText className="h-8 w-8 text-indigo-600" />
                                            </div>
                                            <div className="text-center space-y-1">
                                                <p className="font-bold text-lg">{file.name}</p>
                                                <Badge variant="secondary" className="font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</Badge>
                                            </div>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 rounded-full"
                                                onClick={e => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                                                <X className="h-4 w-4 mr-2" /> Change File
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center group-hover:bg-indigo-50">
                                                <Upload className="h-8 w-8 text-muted-foreground group-hover:text-indigo-600 transition-colors" />
                                            </div>
                                            <div className="text-center space-y-1">
                                                <p className="font-bold text-lg">Upload SRN items list</p>
                                                <p className="text-sm text-muted-foreground">One row per item — <strong>BarCode</strong> + Quantity</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {['.CSV', '.XLSX', '.XLS'].map(ext => <Badge key={ext} variant="outline">{ext}</Badge>)}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Template download */}
                                <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center border shadow-sm">
                                            <Download className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">Download Template</p>
                                            <p className="text-xs text-muted-foreground">BarCode, Quantity</p>
                                        </div>
                                    </div>
                                    <Button variant="secondary" size="sm" onClick={() => window.open(`${BASE()}/template/download`, '_blank')}>
                                        Get CSV Template
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                {/* Progress */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
                                                <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">
                                                    {isValidating ? 'Phase 1: Validating' : data?.status === 'processing' ? 'Phase 2: Creating SRNs' : 'Status'}
                                                </p>
                                            </div>
                                            <h3 className="text-xl font-black truncate max-w-[400px]">{data?.filename}</h3>
                                            <p className="text-sm text-muted-foreground italic">{data?.message || 'Preparing...'}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-4xl font-black text-indigo-600">{data?.progress ?? 0}</span>
                                            <span className="text-xl font-bold text-indigo-400">%</span>
                                        </div>
                                    </div>
                                    <Progress value={data?.progress ?? 0} className="h-4 rounded-full" />
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="bg-muted/40 p-4 rounded-2xl border flex flex-col items-center">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Rows</span>
                                        <span className="text-2xl font-black">{(data?.totalRecords ?? 0).toLocaleString()}</span>
                                    </div>
                                    <div className="bg-green-500/10 p-4 rounded-2xl border border-green-500/20 flex flex-col items-center">
                                        <span className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">{data?.status === 'completed' ? 'SRNs Created' : 'Valid'}</span>
                                        <span className="text-2xl font-black text-green-600">{(data?.successRecords ?? 0).toLocaleString()}</span>
                                    </div>
                                    <div className="bg-destructive/10 p-4 rounded-2xl border border-destructive/20 flex flex-col items-center">
                                        <span className="text-[10px] font-black text-destructive uppercase tracking-widest mb-1">Invalid</span>
                                        <span className="text-2xl font-black text-destructive">{(data?.failedRecords ?? 0).toLocaleString()}</span>
                                    </div>
                                    <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 flex flex-col items-center">
                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Processed</span>
                                        <span className="text-2xl font-black text-amber-600">{(data?.processedRecords ?? 0).toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Validation results */}
                                {(isValidated || (data?.status === 'completed' && (data?.failedRecords ?? 0) > 0)) && (
                                    <div className="p-5 rounded-2xl border-2 border-dashed bg-card space-y-3 animate-in fade-in duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isValidated && data?.failedRecords === 0 ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                                                {isValidated && data?.failedRecords === 0 ? (
                                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                                ) : (
                                                    <Info className="h-6 w-6 text-amber-600" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-black">
                                                    {data?.status === 'completed' ? 'Import Report' : 'Validation Complete'}
                                                </h4>
                                                <p className="text-sm text-muted-foreground">
                                                    {data?.status === 'completed'
                                                        ? `${data?.successRecords} rows successfully imported, ${data?.failedRecords} rows failed.`
                                                        : data?.failedRecords === 0
                                                            ? 'All rows valid. Confirm below to create SRNs and reserve stock.'
                                                            : `${data?.failedRecords} rows have issues and will be skipped.`}
                                                </p>
                                            </div>
                                        </div>
                                        {(data?.failedRecords ?? 0) > 0 && (
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setShowErrors(!showErrors)}>
                                                    {showErrors ? 'Hide Errors' : 'View Errors'}
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => window.open(`${BASE()}/${uploadId}/error-report`, '_blank')} className="text-destructive">
                                                    <Download className="h-4 w-4 mr-2" /> Download Report
                                                </Button>
                                            </div>
                                        )}
                                        {showErrors && data?.errors && data.errors.length > 0 && (
                                            <div className="border rounded-xl overflow-hidden bg-background/50">
                                                <ScrollArea className="h-[220px]">
                                                    <Table>
                                                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                                            <TableRow>
                                                                <TableHead className="w-[60px] font-black uppercase text-[10px]">Row</TableHead>
                                                                <TableHead className="w-[100px] font-black uppercase text-[10px]">Field</TableHead>
                                                                <TableHead className="font-black uppercase text-[10px]">Issue</TableHead>
                                                                <TableHead className="font-black uppercase text-[10px]">Value</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {data.errors.slice(0, 100).map((err, i) => (
                                                                <TableRow key={i}>
                                                                    <TableCell className="font-mono text-xs font-bold text-muted-foreground">{err.row}</TableCell>
                                                                    <TableCell className="text-xs font-bold capitalize">{(err as any).field || err.data?.field || 'unknown'}</TableCell>
                                                                    <TableCell className="text-xs text-destructive font-semibold">{err.reason}</TableCell>
                                                                    <TableCell className="text-xs font-mono">{(err as any).value || err.data?.value || '—'}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                            <div ref={errorEndRef} />
                                                        </TableBody>
                                                    </Table>
                                                </ScrollArea>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Completion (Fully Successful) */}
                                {data?.status === 'completed' && (data?.failedRecords ?? 0) === 0 && (
                                    <div className="p-8 bg-green-500/5 border-2 border-green-500/20 rounded-3xl flex flex-col items-center gap-3 text-center animate-in fade-in duration-300">
                                        <div className="h-14 w-14 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <CheckCircle2 className="h-9 w-9 text-green-600" />
                                        </div>
                                        <h3 className="text-2xl font-black text-green-700">Import Successful!</h3>
                                        <p className="text-green-600/80 font-medium">{data?.successRecords} Stock Requisition(s) created and stock reserved.</p>
                                    </div>
                                )}

                                {/* Completion (Partially or Fully Failed) */}
                                {data?.status === 'completed' && (data?.failedRecords ?? 0) > 0 && (
                                    <div className={`p-8 border-2 rounded-3xl flex flex-col items-center gap-3 text-center animate-in fade-in duration-300 ${data?.successRecords > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                        <div className={`h-14 w-14 rounded-full flex items-center justify-center ${data?.successRecords > 0 ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
                                            {data?.successRecords > 0 ? (
                                                <Info className="h-9 w-9 text-amber-600" />
                                            ) : (
                                                <X className="h-9 w-9 text-red-600" />
                                            )}
                                        </div>
                                        <h3 className={`text-2xl font-black ${data?.successRecords > 0 ? 'text-amber-700' : 'text-red-700'}`}>
                                            {data?.successRecords > 0 ? 'Import Completed with Warnings' : 'Import Failed'}
                                        </h3>
                                        <p className={`font-medium ${data?.successRecords > 0 ? 'text-amber-600/80' : 'text-red-600/80'}`}>
                                            {data?.successRecords > 0 
                                                ? `${data?.successRecords} Stock Requisition(s) created, but ${data?.failedRecords} rows failed.`
                                                : `Could not create any Stock Requisition due to stock/validation errors.`}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 border-t bg-muted/30 shrink-0">
                    <div className="flex justify-between w-full items-center">
                        <div>
                            {isProcessing && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold italic">
                                    <Info className="h-3 w-3" /> Creating SRNs in background...
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3">
                            {!uploadId ? (
                                <>
                                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                                    <Button
                                        disabled={!file || isUploading}
                                        onClick={handleUpload}
                                        className="px-8 font-black bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Queuing...</> : <><Upload className="h-4 w-4 mr-2" /> Start Validation</>}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {isProcessing ? (
                                        <Button variant="destructive" onClick={handleCancel}>Abort Job</Button>
                                    ) : isValidated && data?.status === 'validated' ? (
                                        <div className="flex gap-3">
                                            <Button variant="outline" onClick={reset} disabled={isProcessing || isConfirming}>Re-upload File</Button>
                                            <Button
                                                onClick={handleConfirm}
                                                disabled={isProcessing || isConfirming}
                                                className="px-10 font-black bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
                                            >
                                                {isConfirming
                                                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...</>
                                                    : <><Database className="mr-2 h-4 w-4" /> Confirm & Create SRNs</>}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button variant="outline" onClick={reset}>Upload Another</Button>
                                    )}
                                    {(data?.status === 'completed' || isFailed || isCancelled) && (
                                        <Button onClick={handleClose} className="font-black px-8">Done</Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
