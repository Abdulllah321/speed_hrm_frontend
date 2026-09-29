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
    CheckCircle2,
    XCircle,
    Loader2,
    Download,
    X,
    AlertCircle,
    HandCoins,
} from 'lucide-react';
import { toast } from 'sonner';
import { getEmployeesForDropdown, type EmployeeDropdownOption } from '@/lib/actions/employee';
import { getLoanTypes, type LoanType } from '@/lib/actions/loan-type';
import { bulkCreateLoanRequests } from '@/lib/actions/loan-request';
import { format } from 'date-fns';

interface LoanRequestBulkUploadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const DISBURSEMENT_MAP: Record<string, string> = {
    'withsalary': 'with_salary',
    'with_salary': 'with_salary',
    'withpayroll': 'with_salary',
    'salary': 'with_salary',
    'separately': 'separately',
    'separate': 'separately',
    'cash': 'separately',
    'direct': 'separately',
};

interface ParsedLoanRow {
    rowIndex: number;
    employeeIdCode: string;
    employeeName: string;
    loanTypeName: string;
    amount: number;
    paidAmount: number;
    requestedDate: string;
    repaymentStartMonthYear: string;
    numberOfInstallments: number;
    disbursementType: string;
    reason: string;
    additionalDetails: string;
    resolvedEmployeeId?: string;
    resolvedLoanTypeId?: string;
}

interface ValidationError {
    row: number;
    empId: string;
    field: string;
    reason: string;
}

type UploaderPhase = 'select' | 'validating' | 'errors' | 'preview' | 'importing' | 'complete';

export function LoanRequestBulkUploadModal({
    open,
    onOpenChange,
    onSuccess,
}: LoanRequestBulkUploadModalProps) {
    const [phase, setPhase] = useState<UploaderPhase>('select');
    const [file, setFile] = useState<File | null>(null);
    const [employees, setEmployees] = useState<EmployeeDropdownOption[]>([]);
    const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
    const [loadingMetadata, setLoadingMetadata] = useState(false);
    const [parsedRows, setParsedRows] = useState<ParsedLoanRow[]>([]);
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [importProgress, setImportProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        const loadMetadata = async () => {
            setLoadingMetadata(true);
            try {
                const [empRes, loanTypesRes] = await Promise.all([
                    getEmployeesForDropdown({ limit: 10000 }),
                    getLoanTypes(),
                ]);
                if (empRes.status && empRes.data) setEmployees(empRes.data);
                if (loanTypesRes.status && loanTypesRes.data) {
                    setLoanTypes(loanTypesRes.data.filter((t: LoanType) => t.status === 'active'));
                }
            } catch (error) {
                console.error('Failed to load import metadata:', error);
                toast.error('Failed to load employees and loan types for validation.');
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

    const parseDateString = (rawVal: any): string | null => {
        if (!rawVal) return null;
        if (rawVal instanceof Date) return format(rawVal, 'yyyy-MM-dd');
        let str = String(rawVal).trim();
        if (!str) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
            const [dd, mm, yyyy] = str.split('/');
            return `${yyyy}-${mm}-${dd}`;
        }
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
            const parts = str.split('/');
            return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
        const serial = Number(str);
        if (!isNaN(serial) && serial > 30000 && serial < 60000) {
            try {
                const date = new Date((serial - 25569) * 86400 * 1000);
                if (!isNaN(date.getTime())) return format(date, 'yyyy-MM-dd');
            } catch {}
        }
        return null;
    };

    const parseMonthYear = (rawVal: any): string | null => {
        if (!rawVal) return null;
        if (rawVal instanceof Date) return format(rawVal, 'yyyy-MM');
        let str = String(rawVal).trim();
        if (!str) return null;
        if (/^\d{4}-\d{2}$/.test(str)) return str;
        if (/^\d{4}\/\d{2}$/.test(str)) return str.replace('/', '-');
        if (/^\d{2}\/\d{4}$/.test(str)) {
            const [mm, yyyy] = str.split('/');
            return `${yyyy}-${mm.padStart(2, '0')}`;
        }
        if (/^\d{2}-\d{4}$/.test(str)) {
            const [mm, yyyy] = str.split('-');
            return `${yyyy}-${mm.padStart(2, '0')}`;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str.substring(0, 7);
        const serial = Number(str);
        if (!isNaN(serial) && serial > 30000 && serial < 60000) {
            try {
                const date = new Date((serial - 25569) * 86400 * 1000);
                if (!isNaN(date.getTime())) return format(date, 'yyyy-MM');
            } catch {}
        }
        return null;
    };

    const handleUploadAndValidate = async () => {
        if (!file) return;
        setPhase('validating');
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                if (jsonRows.length === 0) {
                    setErrors([{ row: 1, empId: '???', field: 'File', reason: 'The uploaded file is empty.' }]);
                    setPhase('errors');
                    return;
                }

                const findKey = (rowObj: any, matchers: string[]) => {
                    const keys = Object.keys(rowObj);
                    return keys.find(k => {
                        const normalized = k.toLowerCase().replace(/[\s_\-]/g, '');
                        return matchers.includes(normalized);
                    });
                };

                const validationErrors: ValidationError[] = [];
                const validRows: ParsedLoanRow[] = [];

                jsonRows.forEach((row, idx) => {
                    const rowNum = idx + 2;
                    const empIdKey    = findKey(row, ['empid', 'employeeid', 'employee_id', 'identity', 'emp_id', 'code']);
                    const loanTypeKey = findKey(row, ['loantype', 'loan_type', 'type', 'loantypename']);
                    const amountKey   = findKey(row, ['loanamount', 'amount', 'loan_amount', 'value']);
                    const paidAmtKey  = findKey(row, ['alreadypaidamount', 'paidamount', 'paid_amount', 'alreadypaid', 'already_paid']);
                    const dateKey     = findKey(row, ['requesteddate', 'requested_date', 'date', 'requestdate']);
                    const repayKey    = findKey(row, ['repaymentstartmonthyear', 'repaymentstart', 'repayment_start', 'repayment', 'repaymonth', 'startmonth']);
                    const installKey  = findKey(row, ['numberofinstallments', 'installments', 'installment', 'no_of_installments', 'noofinstallments']);
                    const disbursKey  = findKey(row, ['disbursementmethod', 'disbursement_method', 'disbursementtype', 'disbursement_type', 'disbursement', 'method']);
                    const reasonKey   = findKey(row, ['reason', 'reasondetail', 'remarks', 'note', 'notes']);
                    const detailsKey  = findKey(row, ['additionaldetails', 'additional_details', 'details', 'description']);

                    const rawEmpId = empIdKey ? String(row[empIdKey]).trim() : '';
                    if (!rawEmpId || ['employee id', 'employeeid', 'empid', 'emp id', 'identity'].includes(rawEmpId.toLowerCase())) return;

                    const rawLoanType  = loanTypeKey ? String(row[loanTypeKey]).trim() : '';
                    const rawAmount    = amountKey   ? String(row[amountKey]).trim()   : '';
                    const rawPaidAmt   = paidAmtKey  ? String(row[paidAmtKey]).trim()  : '0';
                    const rawDate      = dateKey     ? row[dateKey]                    : '';
                    const rawRepay     = repayKey    ? row[repayKey]                   : '';
                    const rawInstall   = installKey  ? String(row[installKey]).trim()  : '1';
                    const rawDisburs   = disbursKey  ? String(row[disbursKey]).trim().toLowerCase().replace(/[\s_\-\/]/g, '') : 'withsalary';
                    const rawReason    = reasonKey   ? String(row[reasonKey]).trim()   : '';
                    const rawDetails   = detailsKey  ? String(row[detailsKey]).trim()  : '';

                    const employee = employees.find(e =>
                        e.employeeId.trim().toLowerCase() === rawEmpId.toLowerCase() ||
                        e.id.toLowerCase() === rawEmpId.toLowerCase()
                    );
                    if (!employee) {
                        validationErrors.push({ row: rowNum, empId: rawEmpId, field: 'Emp ID', reason: `Employee ID "${rawEmpId}" not found in system.` });
                        return;
                    }

                    if (!rawLoanType) {
                        validationErrors.push({ row: rowNum, empId: rawEmpId, field: 'Loan Type', reason: 'Loan Type is required.' });
                        return;
                    }
                    const loanType = loanTypes.find(t =>
                        t.name.trim().toLowerCase() === rawLoanType.toLowerCase() ||
                        t.id.toLowerCase() === rawLoanType.toLowerCase()
                    );
                    if (!loanType) {
                        validationErrors.push({ row: rowNum, empId: rawEmpId, field: 'Loan Type', reason: `Loan Type "${rawLoanType}" not found or inactive.` });
                        return;
                    }

                    const parsedAmount = parseFloat(rawAmount);
                    if (isNaN(parsedAmount) || parsedAmount <= 0) {
                        validationErrors.push({ row: rowNum, empId: rawEmpId, field: 'Loan Amount', reason: 'Loan Amount must be greater than 0.' });
                        return;
                    }

                    const parsedPaidAmt = rawPaidAmt ? parseFloat(rawPaidAmt) : 0;
                    if (isNaN(parsedPaidAmt) || parsedPaidAmt < 0) {
                        validationErrors.push({ row: rowNum, empId: rawEmpId, field: 'Already Paid Amount', reason: 'Already Paid Amount must be 0 or a positive number.' });
                        return;
                    }

                    const parsedDate = parseDateString(rawDate);
                    if (!parsedDate) {
                        validationErrors.push({ row: rowNum, empId: rawEmpId, field: 'Requested Date', reason: `Invalid date: "${rawDate}". Use format YYYY-MM-DD.` });
                        return;
                    }

                    let parsedRepay: string | undefined = undefined;
                    if (rawRepay) {
                        const r = parseMonthYear(rawRepay);
                        if (!r) {
                            validationErrors.push({ row: rowNum, empId: rawEmpId, field: 'Repayment Start', reason: `Invalid month: "${rawRepay}". Use format YYYY-MM (e.g. 2026-10).` });
                            return;
                        }
                        parsedRepay = r;
                    }

                    if (!rawReason) {
                        validationErrors.push({ row: rowNum, empId: rawEmpId, field: 'Reason', reason: 'Reason (Detail) is required.' });
                        return;
                    }

                    const parsedInstallments = parseInt(rawInstall);
                    const installments = isNaN(parsedInstallments) || parsedInstallments < 1 ? 1 : Math.min(parsedInstallments, 120);
                    const disbursementType = DISBURSEMENT_MAP[rawDisburs] || 'with_salary';

                    validRows.push({
                        rowIndex: rowNum,
                        employeeIdCode: rawEmpId,
                        employeeName: employee.employeeName,
                        loanTypeName: loanType.name,
                        amount: parsedAmount,
                        paidAmount: parsedPaidAmt,
                        requestedDate: parsedDate,
                        repaymentStartMonthYear: parsedRepay || '',
                        numberOfInstallments: installments,
                        disbursementType,
                        reason: rawReason,
                        additionalDetails: rawDetails,
                        resolvedEmployeeId: employee.id,
                        resolvedLoanTypeId: loanType.id,
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
                setErrors([{ row: 0, empId: '???', field: 'Parser', reason: 'Error reading file. Ensure it is not corrupted and matches template.' }]);
                setPhase('errors');
            }
        };
        reader.onerror = () => {
            setErrors([{ row: 0, empId: '???', field: 'File', reason: 'Failed to read file contents.' }]);
            setPhase('errors');
        };
        reader.readAsArrayBuffer(file);
    };

    const handleConfirmImport = async () => {
        if (parsedRows.length === 0 || phase === 'importing') return;
        setPhase('importing');
        setImportProgress(10);
        try {
            const payload = parsedRows.map(r => ({
                employeeId: r.resolvedEmployeeId!,
                loanTypeId: r.resolvedLoanTypeId!,
                amount: r.amount,
                paidAmount: r.paidAmount || undefined,
                requestedDate: r.requestedDate,
                repaymentStartMonthYear: r.repaymentStartMonthYear || undefined,
                numberOfInstallments: r.numberOfInstallments,
                disbursementType: r.disbursementType,
                reason: r.reason,
                additionalDetails: r.additionalDetails || undefined,
            }));
            setImportProgress(50);
            const res = await bulkCreateLoanRequests(payload);
            setImportProgress(100);
            if (res.status) {
                toast.success(`Successfully imported ${parsedRows.length} loan request(s)!`);
                setPhase('complete');
                onSuccess?.();
            } else {
                toast.error(res.message || 'Failed to import loan requests.');
                setPhase('preview');
            }
        } catch (error) {
            console.error('Import failed:', error);
            toast.error('An error occurred during loan request import.');
            setPhase('preview');
        }
    };

    const downloadTemplate = () => {
        const headers = [
            'Employee ID *', 'Loan Type *', 'Loan Amount *', 'Already Paid Amount',
            'Requested Date * (YYYY-MM-DD)', 'Repayment Start Month (YYYY-MM)',
            'No. of Installments (1-120)', 'Disbursement Method (with_salary/separately)',
            'Reason (Detail) *', 'Additional Details',
        ];
        const ex1 = ['EMP-001', 'Personal Loan', '50000',  '0',    '2026-09-01', '2026-10', '12', 'with_salary', 'Medical emergency', ''];
        const ex2 = ['EMP-002', 'Car Loan',       '200000', '5000', '2026-09-01', '2026-11', '24', 'separately',  'Vehicle purchase',  'Honda City'];
        const ex3 = ['EMP-003', 'Housing Loan',   '500000', '0',    '2026-09-15', '2026-12', '60', 'with_salary', 'Home renovation',   ''];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ex1, ex2, ex3]);
        ws['!cols'] = [{wch:15},{wch:18},{wch:16},{wch:22},{wch:28},{wch:28},{wch:26},{wch:38},{wch:22},{wch:20}];
        XLSX.utils.book_append_sheet(wb, ws, 'Loan Requests');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'loan_request_bulk_import_template.xlsx';
        link.click();
    };

    const disbursementLabel = (val: string) => val === 'with_salary' ? 'With Salary' : 'Separately';

    const totalAmount = useMemo(() => parsedRows.reduce((sum, r) => sum + r.amount, 0), [parsedRows]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl sm:max-w-3xl md:max-w-4xl p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <HandCoins className="h-5 w-5 text-primary animate-pulse" />
                        Bulk Upload Loan Requests
                    </DialogTitle>
                    <DialogDescription>
                        Upload a CSV or Excel file to create loan requests for multiple employees at once.
                    </DialogDescription>
                </DialogHeader>

                {loadingMetadata ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">Loading employees and loan types...</p>
                    </div>
                ) : (
                    <div className="my-4 min-h-[300px]">
                        {phase === 'select' && (
                            <div className="space-y-4">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 cursor-pointer rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-4 group"
                                >
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, .xlsx, .xls" className="hidden" />
                                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Upload className="h-7 w-7 text-primary" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-base font-bold">{file ? file.name : 'Select or drag your CSV/Excel file'}</p>
                                        <p className="text-xs text-muted-foreground font-medium">Supported formats: .csv, .xlsx, .xls (Max size: 5MB)</p>
                                    </div>
                                </div>
                                <div className="bg-muted/40 rounded-xl border p-4 space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Required Columns (* = mandatory)</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-foreground/80">
                                        <span>&#8226; Employee ID *</span>
                                        <span>&#8226; Loan Type *</span>
                                        <span>&#8226; Loan Amount *</span>
                                        <span>&#8226; Already Paid Amount</span>
                                        <span>&#8226; Requested Date * (YYYY-MM-DD)</span>
                                        <span>&#8226; Repayment Start Month (YYYY-MM)</span>
                                        <span>&#8226; No. of Installments (1-120)</span>
                                        <span>&#8226; Disbursement Method</span>
                                        <span>&#8226; Reason (Detail) *</span>
                                        <span>&#8226; Additional Details</span>
                                    </div>
                                </div>
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
                                <p className="text-xs text-muted-foreground">Verifying employee records, loan types, and formats.</p>
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
                                                        <TableCell className="font-bold text-xs">{err.empId || '???'}</TableCell>
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-muted/40 p-4 rounded-xl border flex flex-col items-center justify-center">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Records</span>
                                        <span className="text-2xl font-black">{parsedRows.length}</span>
                                    </div>
                                    <div className="bg-muted/40 p-4 rounded-xl border flex flex-col items-center justify-center">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Amount</span>
                                        <span className="text-2xl font-black text-primary">Rs. {totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="border rounded-xl overflow-hidden bg-card text-left">
                                    <ScrollArea className="h-[200px]">
                                        <Table>
                                            <TableHeader className="bg-muted sticky top-0 z-10">
                                                <TableRow>
                                                    <TableHead className="w-[80px] font-bold text-xs">Emp ID</TableHead>
                                                    <TableHead className="font-bold text-xs">Name</TableHead>
                                                    <TableHead className="w-[100px] font-bold text-xs">Loan Type</TableHead>
                                                    <TableHead className="w-[90px] font-bold text-xs text-right">Amount</TableHead>
                                                    <TableHead className="w-[80px] font-bold text-xs text-right">Paid</TableHead>
                                                    <TableHead className="w-[95px] font-bold text-xs text-center">Req. Date</TableHead>
                                                    <TableHead className="w-[80px] font-bold text-xs text-center">Repay Start</TableHead>
                                                    <TableHead className="w-[45px] font-bold text-xs text-center">Inst.</TableHead>
                                                    <TableHead className="w-[90px] font-bold text-xs text-center">Disbursement</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {parsedRows.map((row, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="font-bold text-xs">{row.employeeIdCode}</TableCell>
                                                        <TableCell className="text-xs font-semibold">{row.employeeName}</TableCell>
                                                        <TableCell className="text-xs">{row.loanTypeName}</TableCell>
                                                        <TableCell className="text-xs font-bold text-right">Rs. {row.amount.toLocaleString()}</TableCell>
                                                        <TableCell className="text-xs text-right text-muted-foreground">{row.paidAmount > 0 ? `Rs. ${row.paidAmount.toLocaleString()}` : '-'}</TableCell>
                                                        <TableCell className="text-xs text-center font-mono">{row.requestedDate}</TableCell>
                                                        <TableCell className="text-xs text-center font-mono">{row.repaymentStartMonthYear || '-'}</TableCell>
                                                        <TableCell className="text-xs text-center">{row.numberOfInstallments}</TableCell>
                                                        <TableCell className="text-xs text-center">{row.disbursementType === 'with_salary' ? 'With Salary' : 'Separately'}</TableCell>
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
                                    <p className="text-sm font-bold text-foreground">Importing Loan Requests...</p>
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
                                        All verified loan requests have been successfully created.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter className="border-t pt-4">
                    {phase === 'select' && (
                        <div className="flex justify-end gap-2 w-full">
                            <Button variant="ghost" onClick={() => onOpenChange(false)} type="button">Cancel</Button>
                            <Button disabled={!file || loadingMetadata} onClick={handleUploadAndValidate} type="button">
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
                                <Button variant="outline" onClick={resetStates} type="button">Upload Another File</Button>
                                <Button variant="ghost" onClick={() => onOpenChange(false)} type="button">Close</Button>
                            </div>
                        </div>
                    )}
                    {phase === 'preview' && (
                        <div className="flex justify-between w-full items-center">
                            <Button variant="ghost" onClick={resetStates} type="button">
                                <X className="h-4 w-4 mr-2" /> Cancel Import
                            </Button>
                            <Button onClick={handleConfirmImport} type="button" className="bg-green-600 hover:bg-green-700 text-white font-bold">
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Import
                            </Button>
                        </div>
                    )}
                    {phase === 'complete' && (
                        <div className="flex justify-end gap-2 w-full">
                            <Button onClick={() => onOpenChange(false)} type="button">Close</Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
