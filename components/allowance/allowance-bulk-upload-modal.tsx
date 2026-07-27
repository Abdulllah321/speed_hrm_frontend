'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
    AlertCircle,
    Coins,
} from 'lucide-react';
import { toast } from 'sonner';
import { getEmployeesForDropdown, type EmployeeDropdownOption } from '@/lib/actions/employee';
import { getAllowanceHeads, bulkCreateAllowances, type AllowanceHead } from '@/lib/actions/allowance';
import { format } from 'date-fns';

interface AllowanceBulkUploadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

interface ParsedAllowanceRow {
    rowIndex: number;
    employeeIdCode: string; // The user-provided emp ID (e.g. EMP-001)
    employeeName: string;   // Optional provided name
    allowanceTypeName: string; // E.g. Fuel Allowance
    amount: number;
    month: string;          // Format: YYYY-MM
    isTaxable: boolean;
    notes: string;
    // Resolved entity references
    resolvedEmployeeId?: string; // The database UUID
    resolvedAllowanceHeadId?: string; // The database UUID
}

interface ValidationError {
    row: number;
    empId: string;
    field: string;
    reason: string;
}

type UploaderPhase = 'select' | 'validating' | 'errors' | 'preview' | 'importing' | 'complete';

export function AllowanceBulkUploadModal({
    open,
    onOpenChange,
    onSuccess
}: AllowanceBulkUploadModalProps) {
    const [phase, setPhase] = useState<UploaderPhase>('select');
    const [file, setFile] = useState<File | null>(null);
    const [employees, setEmployees] = useState<EmployeeDropdownOption[]>([]);
    const [allowanceHeads, setAllowanceHeads] = useState<AllowanceHead[]>([]);
    const [loadingMetadata, setLoadingMetadata] = useState(false);
    
    const [parsedRows, setParsedRows] = useState<ParsedAllowanceRow[]>([]);
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [importProgress, setImportProgress] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch active employees and allowance heads on dialog open
    useEffect(() => {
        if (!open) return;
        
        const loadMetadata = async () => {
            setLoadingMetadata(true);
            try {
                const [empRes, headsRes] = await Promise.all([
                    getEmployeesForDropdown({ limit: 10000 }),
                    getAllowanceHeads()
                ]);

                if (empRes.status && empRes.data) {
                    setEmployees(empRes.data);
                }
                if (headsRes.status && headsRes.data) {
                    setAllowanceHeads(headsRes.data.filter(h => h.status === 'active'));
                }
            } catch (error) {
                console.error('Failed to load import metadata:', error);
                toast.error('Failed to load employees and allowance types for validation.');
            } finally {
                setLoadingMetadata(false);
            }
        };

        loadMetadata();
        resetStates();
    }, [open]);

    const resetStates = () => {
        setPhase('select');
        setFile(null);
        setParsedRows([]);
        setErrors([]);
        setImportProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        const ext = selected.name.split('.').pop()?.toLowerCase();
        if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
            setFile(selected);
            setPhase('select');
        } else {
            toast.error('Invalid file type. Please upload a CSV or Excel file.');
        }
    };

    // Robust Month parsing
    const parseMonthString = (rawVal: any): string | null => {
        if (!rawVal) return null;
        
        // 1. If date number or date object
        if (rawVal instanceof Date) {
            return format(rawVal, 'yyyy-MM');
        }

        let str = String(rawVal).trim();
        if (!str) return null;

        // 2. Format YYYY-MM
        if (/^\d{4}-\d{2}$/.test(str)) {
            return str;
        }

        // 3. Format YYYY/MM
        if (/^\d{4}\/\d{2}$/.test(str)) {
            return str.replace('/', '-');
        }

        // 4. Format MM/YYYY
        if (/^\d{2}\/\d{4}$/.test(str)) {
            const [mm, yyyy] = str.split('/');
            return `${yyyy}-${mm.padStart(2, '0')}`;
        }

        // 5. Format MM-YYYY
        if (/^\d{2}-\d{4}$/.test(str)) {
            const [mm, yyyy] = str.split('-');
            return `${yyyy}-${mm.padStart(2, '0')}`;
        }

        // 6. Check if it's an Excel Date Serial Number (e.g. 45000)
        const serial = Number(str);
        if (!isNaN(serial) && serial > 30000 && serial < 60000) {
            try {
                const date = new Date((serial - 25569) * 86400 * 1000);
                if (!isNaN(date.getTime())) {
                    return format(date, 'yyyy-MM');
                }
            } catch {}
        }

        return null;
    };

    const handleUploadAndValidate = async () => {
        if (!file) return;

        setPhase('validating');
        
        // Read file
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                if (jsonRows.length === 0) {
                    setErrors([{ row: 1, empId: '—', field: 'File', reason: 'The uploaded file is empty.' }]);
                    setPhase('errors');
                    return;
                }

                // Helper to normalize keys to match header names
                const findKey = (rowObj: any, matchers: string[]) => {
                    const keys = Object.keys(rowObj);
                    return keys.find(k => {
                        const normalized = k.toLowerCase().replace(/[\s_\-]/g, '');
                        return matchers.includes(normalized);
                    });
                };

                const validationErrors: ValidationError[] = [];
                const validRows: ParsedAllowanceRow[] = [];

                jsonRows.forEach((row, idx) => {
                    const rowNum = idx + 2; // header is row 1

                    // Find header mappings
                    const empIdKey = findKey(row, ['empid', 'employeeid', 'employee_id', 'code', 'emp_id']);
                    const nameKey = findKey(row, ['name', 'employeename', 'employee_name']);
                    const typeKey = findKey(row, ['allowancetype', 'type', 'allowancehead', 'allowance_type', 'allowance_head', 'allowanceheadname']);
                    const amountKey = findKey(row, ['amount', 'value', 'allowanceamount', 'allowance_amount']);
                    const monthKey = findKey(row, ['month', 'monthyear', 'month_year', 'period', 'date']);
                    const taxableKey = findKey(row, ['istaxable', 'taxable', 'is_taxable']);
                    const notesKey = findKey(row, ['notes', 'remarks', 'note', 'remark']);

                    const rawEmpId = empIdKey ? String(row[empIdKey]).trim() : '';
                    const rawName = nameKey ? String(row[nameKey]).trim() : '';
                    const rawType = typeKey ? String(row[typeKey]).trim() : '';
                    const rawAmount = amountKey ? String(row[amountKey]).trim() : '';
                    const rawMonth = monthKey ? row[monthKey] : '';
                    const rawTaxable = taxableKey ? String(row[taxableKey]).trim().toLowerCase() : 'false';
                    const rawNotes = notesKey ? String(row[notesKey]).trim() : '';

                    // 1. Validate Employee ID existence
                    if (!rawEmpId) {
                        validationErrors.push({ row: rowNum, empId: '—', field: 'emp ID', reason: 'Employee ID is required.' });
                        return;
                    }

                    const employee = employees.find(e => 
                        e.employeeId.trim().toLowerCase() === rawEmpId.toLowerCase() || 
                        e.id.toLowerCase() === rawEmpId.toLowerCase()
                    );

                    if (!employee) {
                        validationErrors.push({ row: rowNum, empId: rawEmpId, field: 'emp ID', reason: `Employee ID "${rawEmpId}" not found in system.` });
                        return;
                    }

                    // 2. Validate Allowance Type existence
                    if (!rawType) {
                        validationErrors.push({ row: rowNum, empId: rawEmpId, field: 'allowance type', reason: 'Allowance type is required.' });
                        return;
                    }

                    const allowanceHead = allowanceHeads.find(h => 
                        h.name.trim().toLowerCase() === rawType.toLowerCase() || 
                        h.id.toLowerCase() === rawType.toLowerCase()
                    );

                    if (!allowanceHead) {
                        validationErrors.push({ row: rowNum, empId: rawEmpId, field: 'allowance type', reason: `Allowance Type "${rawType}" not found or inactive.` });
                        return;
                    }

                    // 3. Validate Amount
                    const parsedAmount = parseFloat(rawAmount);
                    if (isNaN(parsedAmount) || parsedAmount <= 0) {
                        validationErrors.push({ row: rowNum, empId: rawEmpId, field: 'amount', reason: 'Amount must be a valid number greater than 0.' });
                        return;
                    }

                    // 4. Validate Month Year
                    const parsedMonth = parseMonthString(rawMonth);
                    if (!parsedMonth) {
                        validationErrors.push({ row: rowNum, empId: rawEmpId, field: 'month', reason: `Invalid month value: "${rawMonth}". Must be format YYYY-MM (e.g. 2026-07).` });
                        return;
                    }

                    // 5. Parse Taxable & Notes
                    const isTaxable = ['true', '1', 'yes', 'y'].includes(rawTaxable);

                    validRows.push({
                        rowIndex: rowNum,
                        employeeIdCode: rawEmpId,
                        employeeName: employee.employeeName,
                        allowanceTypeName: allowanceHead.name,
                        amount: parsedAmount,
                        month: parsedMonth,
                        isTaxable,
                        notes: rawNotes,
                        resolvedEmployeeId: employee.id,
                        resolvedAllowanceHeadId: allowanceHead.id,
                    });
                });

                if (validationErrors.length > 0) {
                    setErrors(validationErrors);
                    setPhase('errors');
                } else {
                    setParsedRows(validRows);
                    setPhase('preview');
                }
            } catch (err) {
                console.error(err);
                setErrors([{ row: 0, empId: '—', field: 'Parser', reason: 'Error reading file. Ensure it is not corrupted and matches template.' }]);
                setPhase('errors');
            }
        };
        reader.onerror = () => {
            setErrors([{ row: 0, empId: '—', field: 'File', reason: 'Failed to read file contents.' }]);
            setPhase('errors');
        };
        reader.readAsArrayBuffer(file);
    };

    const handleConfirmImport = async () => {
        if (parsedRows.length === 0 || phase === 'importing') return;

        setPhase('importing');
        setImportProgress(10);

        try {
            // Group allowances by month-year since the bulk API takes a month-year per request
            const groupedByMonth = new Map<string, ParsedAllowanceRow[]>();
            parsedRows.forEach(row => {
                if (!groupedByMonth.has(row.month)) {
                    groupedByMonth.set(row.month, []);
                }
                groupedByMonth.get(row.month)!.push(row);
            });

            const monthGroups = Array.from(groupedByMonth.entries());
            let successCount = 0;
            const errorsList: string[] = [];

            for (let i = 0; i < monthGroups.length; i++) {
                const [monthYear, rows] = monthGroups[i];
                const [year, month] = monthYear.split('-');

                const res = await bulkCreateAllowances({
                    month,
                    year,
                    date: `${monthYear}-01`,
                    allowances: rows.map(r => ({
                        employeeId: r.resolvedEmployeeId!,
                        allowanceHeadId: r.resolvedAllowanceHeadId!,
                        amount: r.amount,
                        type: 'specific',
                        isTaxable: r.isTaxable,
                        notes: r.notes || undefined,
                    }))
                });

                if (res.status) {
                    successCount += rows.length;
                } else {
                    errorsList.push(res.message || `Failed to import for ${monthYear}`);
                }

                setImportProgress(Math.min(90, Math.floor((i + 1) / monthGroups.length * 100)));
            }

            if (errorsList.length === 0) {
                setImportProgress(100);
                toast.success(`Successfully imported ${successCount} allowances!`);
                setPhase('complete');
                onSuccess?.();
            } else {
                toast.error(errorsList.join(', '));
                setPhase('preview');
            }
        } catch (error) {
            console.error('Import process failed:', error);
            toast.error('An error occurred during allowance import.');
            setPhase('preview');
        }
    };

    const downloadTemplate = () => {
        const headers = ["emp ID", "name", "allowance type", "amount", "month", "is taxable", "notes"];
        const exampleRow = ["EMP-00123", "John Doe", "Fuel Allowance", "2500", "2026-07", "true", "Monthly fuel allowance"];
        const csvContent = [headers.join(","), exampleRow.join(",")].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "allowance_bulk_import_template.csv";
        link.click();
    };

    const totalAmount = useMemo(() => {
        return parsedRows.reduce((sum, r) => sum + r.amount, 0);
    }, [parsedRows]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl sm:max-w-3xl md:max-w-4xl p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Coins className="h-5 w-5 text-primary animate-pulse" />
                        Bulk Upload Allowances
                    </DialogTitle>
                    <DialogDescription>
                        Upload a CSV or Excel file to assign allowances to multiple employees at once.
                    </DialogDescription>
                </DialogHeader>

                {loadingMetadata ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">Loading active employees & allowance heads...</p>
                    </div>
                ) : (
                    <div className="my-4 min-h-[300px]">
                        {phase === 'select' && (
                            <div className="space-y-6">
                                {/* Upload Drag & Drop Area */}
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 cursor-pointer rounded-2xl p-12 transition-all flex flex-col items-center justify-center gap-4 group"
                                >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange}
                                        accept=".csv, .xlsx, .xls"
                                        className="hidden" 
                                    />
                                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Upload className="h-7 w-7 text-primary" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-base font-bold">
                                            {file ? file.name : 'Select or drag your CSV/Excel file'}
                                        </p>
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Supported formats: .csv, .xlsx, .xls (Max size: 5MB)
                                        </p>
                                    </div>
                                </div>

                                {/* Guidelines / Template Row */}
                                <div className="flex justify-between items-center bg-muted/50 p-4 rounded-xl border">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Download excel sheet format</p>
                                        <p className="text-sm text-foreground/80 font-medium">Use the format template to ensure zero errors during verification.</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={downloadTemplate} type="button">
                                        <Download className="h-4 w-4 mr-2" /> Download Template
                                    </Button>
                                </div>
                            </div>
                        )}

                        {phase === 'validating' && (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm font-bold text-foreground">Validating File Data...</p>
                                <p className="text-xs text-muted-foreground">Verifying employee records, allowance names, and formats.</p>
                            </div>
                        )}

                        {phase === 'errors' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 text-destructive">
                                    <XCircle className="h-5 w-5 shrink-0" />
                                    <div>
                                        <p className="font-bold text-sm">Validation Failed</p>
                                        <p className="text-xs opacity-90">{errors.length} issue(s) detected. Fix the errors below and upload the file again.</p>
                                    </div>
                                </div>

                                <div className="border rounded-xl overflow-hidden bg-card text-left">
                                    <ScrollArea className="h-[250px]">
                                        <Table>
                                            <TableHeader className="bg-muted sticky top-0 z-10">
                                                <TableRow>
                                                    <TableHead className="w-[80px] font-bold text-xs text-center">Row</TableHead>
                                                    <TableHead className="w-[150px] font-bold text-xs">Emp ID</TableHead>
                                                    <TableHead className="w-[120px] font-bold text-xs">Column</TableHead>
                                                    <TableHead className="font-bold text-xs text-destructive">Error Reason</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {errors.map((err, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="font-mono text-xs text-center">{err.row}</TableCell>
                                                        <TableCell className="font-bold text-xs">{err.empId || '—'}</TableCell>
                                                        <TableCell className="text-xs font-semibold">{err.field}</TableCell>
                                                        <TableCell className="text-xs text-destructive font-medium">{err.reason}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>
                            </div>
                        )}

                        {phase === 'preview' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-700">
                                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                                    <div>
                                        <p className="font-bold text-sm">File Verified Successfully</p>
                                        <p className="text-xs opacity-90">All {parsedRows.length} records verified and ready for import.</p>
                                    </div>
                                </div>

                                {/* Stats Info Cards */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-muted/40 p-4 rounded-xl border flex flex-col items-center justify-center">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Records</span>
                                        <span className="text-2xl font-black">{parsedRows.length}</span>
                                    </div>
                                    <div className="bg-muted/40 p-4 rounded-xl border flex flex-col items-center justify-center">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Value</span>
                                        <span className="text-2xl font-black text-primary">Rs. {totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="border rounded-xl overflow-hidden bg-card text-left">
                                    <ScrollArea className="h-[200px]">
                                        <Table>
                                            <TableHeader className="bg-muted sticky top-0 z-10">
                                                <TableRow>
                                                    <TableHead className="w-[120px] font-bold text-xs">Emp ID</TableHead>
                                                    <TableHead className="font-bold text-xs">Employee Name</TableHead>
                                                    <TableHead className="w-[150px] font-bold text-xs">Allowance</TableHead>
                                                    <TableHead className="w-[100px] font-bold text-xs text-right">Amount</TableHead>
                                                    <TableHead className="w-[100px] font-bold text-xs text-center">Month</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {parsedRows.map((row, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="font-bold text-xs">{row.employeeIdCode}</TableCell>
                                                        <TableCell className="text-xs font-semibold">{row.employeeName}</TableCell>
                                                        <TableCell className="text-xs">{row.allowanceTypeName}</TableCell>
                                                        <TableCell className="text-xs font-bold text-right">Rs. {row.amount.toLocaleString()}</TableCell>
                                                        <TableCell className="text-xs text-center font-mono">{row.month}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>
                            </div>
                        )}

                        {phase === 'importing' && (
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <div className="text-center space-y-1">
                                    <p className="text-sm font-bold text-foreground">Importing Allowances...</p>
                                    <p className="text-xs text-muted-foreground font-medium">Please do not close this modal or refresh the page.</p>
                                </div>
                                <div className="w-64">
                                    <Progress value={importProgress} className="h-2 rounded-full" />
                                </div>
                            </div>
                        )}

                        {phase === 'complete' && (
                            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                                <CheckCircle2 className="h-14 w-14 text-green-600 animate-bounce" />
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-green-700">Import Completed!</h3>
                                    <p className="text-sm text-muted-foreground font-medium">
                                        All verified allowances have been successfully added to employee payrolls.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter className="border-t pt-4">
                    {phase === 'select' && (
                        <div className="flex justify-end gap-2 w-full">
                            <Button variant="ghost" onClick={() => onOpenChange(false)} type="button">
                                Cancel
                            </Button>
                            <Button 
                                disabled={!file || loadingMetadata}
                                onClick={handleUploadAndValidate}
                                type="button"
                            >
                                Validate File
                            </Button>
                        </div>
                    )}

                    {phase === 'errors' && (
                        <div className="flex justify-between w-full items-center">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                Please fix errors in your file and try again.
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={resetStates} type="button">
                                    Upload Another File
                                </Button>
                                <Button variant="ghost" onClick={() => onOpenChange(false)} type="button">
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}

                    {phase === 'preview' && (
                        <div className="flex justify-between w-full items-center">
                            <Button variant="ghost" onClick={resetStates} type="button">
                                <X className="h-4 w-4 mr-2" /> Cancel Import
                            </Button>
                            <Button 
                                onClick={handleConfirmImport}
                                type="button"
                                className="bg-green-600 hover:bg-green-700 text-white font-bold"
                            >
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Import
                            </Button>
                        </div>
                    )}

                    {phase === 'complete' && (
                        <div className="flex justify-end gap-2 w-full">
                            <Button onClick={() => onOpenChange(false)} type="button">
                                Close
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
