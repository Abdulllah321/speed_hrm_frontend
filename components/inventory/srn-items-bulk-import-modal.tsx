'use client';

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  AlertTriangle,
  Loader2,
  Download,
  X,
  FileSpreadsheet,
  ArrowRight,
  Warehouse,
} from 'lucide-react';
import { stockRequisitionApi } from '@/lib/api';
import { toast } from 'sonner';

interface SkippedItem {
  sku: string;
  description?: string;
  requestedQty: number;
  availableStock: number;
  reason: string;
}

interface ImportSummary {
  totalProcessed: number;
  importedCount: number;
  skippedCount: number;
  warehouseName: string;
}

interface SrnItemsBulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId: string;
  warehouseName: string;
  onItemsImported: (items: any[]) => void;
}

export function SrnItemsBulkImportModal({
  open,
  onOpenChange,
  warehouseId,
  warehouseName,
  onItemsImported,
}: SrnItemsBulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Result state after validation
  const [validItems, setValidItems] = useState<any[]>([]);
  const [skippedItems, setSkippedItems] = useState<SkippedItem[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [hasValidated, setHasValidated] = useState(false);

  const reset = () => {
    setFile(null);
    setValidItems([]);
    setSkippedItems([]);
    setSummary(null);
    setHasValidated(false);
    setIsValidating(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  const handleFileSelect = (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
      setFile(selectedFile);
      setHasValidated(false);
      setValidItems([]);
      setSkippedItems([]);
      setSummary(null);
    } else {
      toast.error('Invalid file format. Please upload CSV or Excel (.xlsx, .xls) files.');
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
    const csvContent = 'data:text/csv;charset=utf-8,BarCode,Quantity\n8901234567890,10\n8901234567891,5\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'srn_items_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded CSV sample template');
  };

  const handleValidateAndImport = async () => {
    if (!file) {
      toast.error('Please choose a file to upload');
      return;
    }
    if (!warehouseId) {
      toast.error('Please select a Source Warehouse first');
      return;
    }

    setIsValidating(true);
    const toastId = toast.loading(`Validating stock in ${warehouseName || 'Warehouse'}...`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await stockRequisitionApi.uploadExcel(formData, warehouseId);
      if (res.status && res.data) {
        const payloadData = res.data;
        const validList = Array.isArray(payloadData) ? payloadData : (payloadData.validItems || []);
        const skippedList: SkippedItem[] = Array.isArray(payloadData) ? [] : (payloadData.skippedItems || []);
        const sum: ImportSummary = Array.isArray(payloadData)
          ? {
              totalProcessed: validList.length,
              importedCount: validList.length,
              skippedCount: 0,
              warehouseName: warehouseName || 'Warehouse',
            }
          : payloadData.summary || {
              totalProcessed: validList.length + skippedList.length,
              importedCount: validList.length,
              skippedCount: skippedList.length,
              warehouseName: warehouseName || 'Warehouse',
            };

        setValidItems(validList);
        setSkippedItems(skippedList);
        setSummary(sum);
        setHasValidated(true);

        if (validList.length > 0) {
          // Immediately populate valid items into requisition list
          onItemsImported(validList);
        }

        if (validList.length > 0 && skippedList.length === 0) {
          toast.success(`Successfully imported all ${validList.length} items with available warehouse stock!`, { id: toastId });
          handleClose();
        } else if (validList.length > 0 && skippedList.length > 0) {
          toast.warning(
            `Added ${validList.length} available items to list. ${skippedList.length} item(s) are out of stock. View error report below.`,
            { id: toastId, duration: 7000 }
          );
        } else {
          toast.error(`None of the items have available stock in ${warehouseName || 'warehouse'}. View error report below.`, { id: toastId });
        }
      } else {
        toast.error('Failed to parse items from file', { id: toastId });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process file', { id: toastId, duration: 6000 });
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmAddToList = () => {
    handleClose();
  };

  const handleDownloadErrorReport = () => {
    if (skippedItems.length === 0) return;

    let csv = 'SKU / BarCode,Description,Requested Qty,Warehouse Available Stock,Status / Reason\n';
    skippedItems.forEach((item) => {
      csv += `"${item.sku}","${(item.description || '').replace(/"/g, '""')}",${item.requestedQty || 0},${item.availableStock || 0},"${(item.reason || '').replace(/"/g, '""')}"\n`;
    });

    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `out_of_stock_error_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Downloaded Out-of-Stock Error Report (CSV)');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[760px] w-full flex flex-col p-0 bg-card max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Bulk Import Items (Excel / CSV)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Import items into your requisition table with automatic warehouse stock verification.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-md text-xs font-semibold text-indigo-800">
              <Warehouse className="h-4 w-4 text-indigo-600" />
              <span>Target WH: <strong>{warehouseName || 'Selected WH'}</strong></span>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <ScrollArea className="flex-1 p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {!hasValidated ? (
              <>
                {/* Drag and Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    isDragOver
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : file
                      ? 'border-emerald-400 bg-emerald-50/20'
                      : 'border-muted-foreground/25 hover:border-indigo-400 hover:bg-muted/30'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />

                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-emerald-100 text-emerald-700 p-3 rounded-full">
                        <FileText className="h-8 w-8" />
                      </div>
                      <div className="font-bold text-base text-gray-900">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB · Ready for validation
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:bg-destructive/10 mt-1 h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          reset();
                        }}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Remove File
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-indigo-50 text-indigo-600 p-3 rounded-full">
                        <Upload className="h-8 w-8" />
                      </div>
                      <div className="font-bold text-base text-gray-900">
                        Click to browse or drag and drop your file
                      </div>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Supports CSV or Excel spreadsheets containing <strong>BarCode / SKU</strong> and <strong>Quantity</strong>.
                      </p>
                    </div>
                  )}
                </div>

                {/* Template Download Banner */}
                <div className="flex items-center justify-between bg-muted/40 border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-lg border text-indigo-600">
                      <Download className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">Download Standard Template</div>
                      <div className="text-[11px] text-muted-foreground">
                        2-column CSV format (BarCode, Quantity) compatible with all barcode scanners.
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                    onClick={handleDownloadTemplate}
                  >
                    Download CSV
                  </Button>
                </div>
              </>
            ) : (
              /* Validation Results View */
              <div className="space-y-5">
                {/* Summary Statistics Bar */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Available Stock
                    </span>
                    <span className="text-2xl font-black text-emerald-700 mt-1">
                      {summary?.importedCount || 0}{' '}
                      <span className="text-xs font-semibold text-emerald-600">Items Valid</span>
                    </span>
                  </div>

                  <div className={`rounded-xl p-3.5 flex flex-col border ${
                    (summary?.skippedCount || 0) > 0 ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      (summary?.skippedCount || 0) > 0 ? 'text-rose-700' : 'text-gray-600'
                    }`}>
                      <XCircle className="h-3.5 w-3.5" /> Out of Stock / Skipped
                    </span>
                    <span className={`text-2xl font-black mt-1 ${
                      (summary?.skippedCount || 0) > 0 ? 'text-rose-700' : 'text-gray-700'
                    }`}>
                      {summary?.skippedCount || 0}{' '}
                      <span className="text-xs font-semibold text-muted-foreground">Items</span>
                    </span>
                  </div>

                  <div className="bg-muted/40 border rounded-xl p-3.5 flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" /> Total Rows
                    </span>
                    <span className="text-2xl font-black text-gray-900 mt-1">
                      {summary?.totalProcessed || 0}{' '}
                      <span className="text-xs font-semibold text-muted-foreground">Processed</span>
                    </span>
                  </div>
                </div>

                {/* Skipped Items Report Table */}
                {skippedItems.length > 0 ? (
                  <div className="space-y-2 border border-rose-200 rounded-xl overflow-hidden bg-rose-50/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-rose-700">
                        <AlertTriangle className="h-4 w-4" />
                        <h4 className="font-bold text-sm">Out-of-Stock / Skipped Items Report ({skippedItems.length})</h4>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-bold border-rose-300 text-rose-700 hover:bg-rose-50 gap-1.5"
                        onClick={handleDownloadErrorReport}
                      >
                        <Download className="h-3.5 w-3.5" /> Download Error Report (CSV)
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The following items could not be imported because they have zero available stock in <strong>{warehouseName}</strong>:
                    </p>

                    <div className="border rounded-lg overflow-hidden bg-background mt-2">
                      <ScrollArea className="h-48">
                        <Table>
                          <TableHeader className="bg-muted/50 sticky top-0">
                            <TableRow>
                              <TableHead className="font-bold text-xs">SKU / BarCode</TableHead>
                              <TableHead className="font-bold text-xs">Description</TableHead>
                              <TableHead className="font-bold text-xs text-center">Requested</TableHead>
                              <TableHead className="font-bold text-xs text-center">WH Stock</TableHead>
                              <TableHead className="font-bold text-xs">Reason / Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {skippedItems.map((item, idx) => (
                              <TableRow key={idx} className="hover:bg-rose-50/30 text-xs">
                                <TableCell className="font-mono font-bold text-rose-700">{item.sku}</TableCell>
                                <TableCell className="max-w-[200px] truncate text-gray-700">{item.description || '—'}</TableCell>
                                <TableCell className="text-center font-bold">{item.requestedQty || 0}</TableCell>
                                <TableCell className="text-center font-bold text-rose-600">{item.availableStock || 0}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 font-semibold text-[10px]">
                                    {item.reason || '0 Stock'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div className="text-xs text-emerald-800">
                      <strong>Perfect Match!</strong> All items in the uploaded file exist in catalog and have sufficient available stock in <strong>{warehouseName}</strong>.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t bg-muted/20 shrink-0 flex items-center justify-between">
          <Button variant="outline" onClick={handleClose} disabled={isValidating}>
            Cancel
          </Button>

          {!hasValidated ? (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 font-bold gap-2"
              disabled={!file || isValidating}
              onClick={handleValidateAndImport}
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Validating Stock...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Validate & Check Stock
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHasValidated(false)}
                className="text-xs font-semibold"
              >
                Upload Different File
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 font-bold gap-2 text-white shadow-sm"
                onClick={handleConfirmAddToList}
              >
                <CheckCircle2 className="h-4 w-4" /> Continue to Requisition ({validItems.length} Added)
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
