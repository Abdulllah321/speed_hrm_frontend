'use client';

import React, { useState, useCallback, useRef } from 'react';
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
import {
    Upload,
    FileText,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    Download,
    X,
    History,
    Info
} from 'lucide-react';
import { useUploadProgress, UploadError } from '@/hooks/use-upload-progress';
import { toast } from 'sonner';
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
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { getApiBaseUrl } from '@/lib/utils';

interface BulkUploadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function BulkUploadModal({ open, onOpenChange, onSuccess }: BulkUploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploadId, setUploadId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, speed, isComplete, isFailed, isProcessing, isCancelled } = useUploadProgress(uploadId);

    // Auto-scroll to latest errors
    const errorEndRef = useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (showErrors && errorEndRef.current) {
            errorEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [data?.errors?.length, showErrors]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const ext = selectedFile.name.split('.').pop()?.toLowerCase();
            if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
                setFile(selectedFile);
            } else {
                toast.error('Invalid file type. Please upload CSV or Excel files.');
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setUploadId(null);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${getApiBaseUrl()}/items/bulk-upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            const result = await response.json();

            if (result.status && result.data?.uploadId) {
                setUploadId(result.data.uploadId);
                toast.success('Upload initiated successfully');
            } else {
                toast.error(result.message || 'Failed to initiate upload');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('An error occurred during upload');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancel = async () => {
        if (!uploadId) return;

        try {
            const response = await fetch(`${getApiBaseUrl()}/api/items/bulk-upload/${uploadId}`, {
                method: 'DELETE',
            });

            const result = await response.json();
            if (result.status) {
                toast.info('Upload cancelled');
            }
        } catch (error) {
            console.error('Cancel failed:', error);
        }
    };

    const downloadTemplate = () => {
        window.open(`${getApiBaseUrl()}/api/items/bulk-upload/template/download`, '_blank');
    };

    const downloadErrorReport = () => {
        if (!uploadId) return;
        window.open(`${getApiBaseUrl()}/api/items/bulk-upload/${uploadId}/error-report`, '_blank');
    };

    const reset = () => {
        setFile(null);
        setUploadId(null);
        setIsUploading(false);
        setShowErrors(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        if (isProcessing) {
            if (confirm('An upload is in progress. Are you sure you want to close?')) {
                onOpenChange(false);
            }
        } else {
            if (isComplete && onSuccess) onSuccess();
            onOpenChange(false);
            if (!isProcessing) reset();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Upload className="h-6 w-6 text-primary" />
                        Bulk Item Upload
                    </DialogTitle>
                    <DialogDescription>
                        Upload a CSV or Excel file to add multiple items at once.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {!uploadId ? (
                        <div className="space-y-6">
                            {/* File Dropzone */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`
                  border-2 border-dashed rounded-xl p-10 
                  flex flex-col items-center justify-center gap-4 cursor-pointer
                  transition-colors duration-200
                  ${file ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/40 hover:bg-muted/50'}
                `}
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
                                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                            <FileText className="h-8 w-8 text-primary" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-semibold text-lg">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to upload
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFile(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                        >
                                            <X className="h-4 w-4 mr-2" /> Remove file
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                                            <Upload className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-semibold text-lg">Click or drag file to upload</p>
                                            <p className="text-sm text-muted-foreground">
                                                Supports CSV, XLSX, XLS (Max 50MB)
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Template Download */}
                            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded bg-background flex items-center justify-center border shadow-sm">
                                        <Download className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Need a template?</p>
                                        <p className="text-xs text-muted-foreground">Download our sample CSV to ensure correct formatting.</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                                    Download Template
                                </Button>
                            </div>

                            {/* Features List */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex gap-3 p-3 rounded-lg border border-border/50 bg-card/50">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Auto Master Data</p>
                                        <p className="text-xs text-muted-foreground">Creates missing Sizes, Colors, Categories, etc. automatically.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 p-3 rounded-lg border border-border/50 bg-card/50">
                                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Fault Tolerant</p>
                                        <p className="text-xs text-muted-foreground">Invalid rows are skipped and logged while others keep uploading.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Progress Header */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
                                            {data?.message || (isProcessing ? 'Processing payload...' : isComplete ? 'Upload completed' : isFailed ? 'Upload failed' : isCancelled ? 'Upload cancelled' : 'Pending...')}
                                        </p>
                                        <h3 className="text-xl font-bold">{data?.filename}</h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold">{data?.progress ?? 0}%</p>
                                        {isProcessing && (
                                            <p className="text-xs font-medium text-primary flex items-center justify-end gap-1">
                                                <History className="h-3 w-3" />
                                                {speed} records/sec
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <Progress value={data?.progress ?? 0} className="h-3 rounded-full" />
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex flex-col">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total</span>
                                    <span className="text-2xl font-bold">{(data?.totalRecords ?? 0).toLocaleString()}</span>
                                </div>
                                <div className="bg-green-500/5 p-4 rounded-xl border border-green-500/20 flex flex-col">
                                    <span className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Success</span>
                                    <span className="text-2xl font-bold text-green-600">{(data?.successRecords ?? 0).toLocaleString()}</span>
                                </div>
                                <div className="bg-destructive/5 p-4 rounded-xl border border-destructive/20 flex flex-col">
                                    <span className="text-xs font-medium text-destructive uppercase tracking-wider mb-1">Failed</span>
                                    <span className="text-2xl font-bold text-destructive">{(data?.failedRecords ?? 0).toLocaleString()}</span>
                                </div>
                                <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/20 flex flex-col">
                                    <span className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-1">Skipped</span>
                                    <span className="text-2xl font-bold text-amber-600">{(data?.skippedRecords ?? 0).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Detailed Error Panel */}
                            {data && data.errors && data.errors.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                                            <XCircle className="h-4 w-4" />
                                            Issues Found ({data.errors.length})
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={downloadErrorReport}>
                                            <Download className="h-3.5 w-3.5 mr-1.5" /> Download report
                                        </Button>
                                    </div>

                                    <div className="border rounded-lg overflow-hidden bg-card">
                                        <ScrollArea className="h-[200px]">
                                            <Table>
                                                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                                    <TableRow>
                                                        <TableHead className="w-[80px]">Row</TableHead>
                                                        <TableHead>Reason</TableHead>
                                                        <TableHead className="text-right">Details</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {data.errors.map((err, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell className="font-mono text-xs">{err.row}</TableCell>
                                                            <TableCell className="text-xs text-destructive font-medium">{err.reason}</TableCell>
                                                            <TableCell className="text-right">
                                                                <Badge variant="outline" className="text-[10px] font-mono">
                                                                    {err.data?.value || 'N/A'}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <div ref={errorEndRef} />
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </div>
                                </div>
                            )}

                            {isComplete && data?.failedRecords === 0 && (
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex gap-3 items-center text-green-700">
                                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                                    <p className="text-sm font-medium">All items have been successfully uploaded and processed!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-2 bg-muted/20 border-t">
                    <div className="flex justify-between w-full items-center">
                        <div>
                            {isProcessing && (
                                <p className="text-xs text-muted-foreground italic">
                                    Don't close this window until processing is complete for the best experience.
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {!uploadId ? (
                                <>
                                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                                        Cancel
                                    </Button>
                                    <Button disabled={!file || isUploading} onClick={handleUpload}>
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Queuing...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-4 w-4 mr-2" />
                                                Start Upload
                                            </>
                                        )}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {isProcessing ? (
                                        <Button variant="destructive" onClick={handleCancel}>
                                            Cancel Processing
                                        </Button>
                                    ) : (
                                        <Button variant="outline" onClick={reset}>
                                            Upload Another
                                        </Button>
                                    )}
                                    {(isComplete || isFailed || isCancelled) && (
                                        <Button onClick={() => onOpenChange(false)}>
                                            Close
                                        </Button>
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
