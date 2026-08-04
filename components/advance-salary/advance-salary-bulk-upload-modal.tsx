'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Banknote,
  Database,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { getEmployeesForDropdown, type EmployeeDropdownOption } from '@/lib/actions/employee';
import { bulkCreateAdvanceSalaries } from '@/lib/actions/advance-salary';
import { format } from 'date-fns';

interface AdvanceSalaryBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedAdvanceSalaryRow {
  rowIndex: number;
  employeeIdCode: string;
  employeeName: string;
  amount: number;
  neededOn: string;
  deductionMonthYear: string;
  disbursementType: string;
  reason: string;
  resolvedEmployeeId?: string;
}

interface ValidationError {
  row: number;
  empId: string;
  field: string;
  reason: string;
  value?: string;
}

type UploaderPhase = 'select' | 'validating' | 'errors' | 'preview' | 'importing' | 'complete';

export function AdvanceSalaryBulkUploadModal({
  open,
  onOpenChange,
  onSuccess,
}: AdvanceSalaryBulkUploadModalProps) {
  const [phase, setPhase] = useState<UploaderPhase>('select');
  const [file, setFile] = useState<File | null>(null);
  const [employees, setEmployees] = useState<EmployeeDropdownOption[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const [parsedRows, setParsedRows] = useState<ParsedAdvanceSalaryRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importProgress, setImportProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch employees on dialog open
  useEffect(() => {
    if (!open) return;

    const loadMetadata = async () => {
      setLoadingMetadata(true);
      try {
        const empRes = await getEmployeesForDropdown({ limit: 10000 });
        if (empRes.status && empRes.data) {
          setEmployees(empRes.data);
        }
      } catch (error) {
        console.error('Failed to load employees for validation:', error);
        toast.error('Failed to load employee directory for validation.');
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
    setShowErrors(false);
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
      toast.error('Invalid file type. Please upload CSV or Excel files.');
    }
  };

  // Helper date parser (YYYY-MM-DD)
  const parseDateString = (rawVal: any): string | null => {
    if (!rawVal) return null;
    if (rawVal instanceof Date) {
      return format(rawVal, 'yyyy-MM-dd');
    }

    const str = String(rawVal).trim();
    if (!str) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) return str.replace(/\//g, '-');

    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(str)) {
      const parts = str.split(/[\/\-]/);
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }

    const serial = Number(str);
    if (!isNaN(serial) && serial > 30000 && serial < 60000) {
      try {
        const date = new Date((serial - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
          return format(date, 'yyyy-MM-dd');
        }
      } catch {}
    }

    return null;
  };

  // Helper month parser (YYYY-MM)
  const parseMonthString = (rawVal: any): string | null => {
    if (!rawVal) return null;
    if (rawVal instanceof Date) {
      return format(rawVal, 'yyyy-MM');
    }

    const str = String(rawVal).trim();
    if (!str) return null;

    if (/^\d{4}-\d{2}$/.test(str)) return str;
    if (/^\d{4}\/\d{2}$/.test(str)) return str.replace('/', '-');

    if (/^\d{1,2}[\/\-]\d{4}$/.test(str)) {
      const [mm, yyyy] = str.split(/[\/\-]/);
      return `${yyyy}-${mm.padStart(2, '0')}`;
    }

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

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (jsonRows.length === 0) {
          setErrors([{ row: 1, empId: '—', field: 'File', reason: 'The uploaded file is empty.', value: 'Empty File' }]);
          setPhase('errors');
          return;
        }

        const findKey = (rowObj: any, matchers: string[]) => {
          const keys = Object.keys(rowObj);
          return keys.find((k) => {
            const normalized = k.toLowerCase().replace(/[\s_\-]/g, '');
            return matchers.includes(normalized);
          });
        };

        const empCodeMap = new Map<string, EmployeeDropdownOption>();
        employees.forEach((emp) => {
          if (emp.employeeId) empCodeMap.set(emp.employeeId.toLowerCase().trim(), emp);
          if (emp.id) empCodeMap.set(emp.id.toLowerCase().trim(), emp);
        });

        const validationErrors: ValidationError[] = [];
        const validRows: ParsedAdvanceSalaryRow[] = [];

        jsonRows.forEach((row, idx) => {
          const rowNum = idx + 2;

          const empIdKey = findKey(row, ['empid', 'employeeid', 'employee_id', 'code', 'emp_id', 'identity']);
          const nameKey = findKey(row, ['name', 'employeename', 'employee_name']);
          const amountKey = findKey(row, ['amount', 'advancesalaryamount', 'advance_amount', 'value']);
          const neededOnKey = findKey(row, ['neededon', 'needed_on', 'neededondate', 'date', 'neededdate']);
          const monthKey = findKey(row, ['deductionmonth', 'deductionmonthyear', 'deduction_month', 'month', 'period']);
          const disbKey = findKey(row, ['disbursementtype', 'disbursement_type', 'disbursement', 'disbursedvia']);
          const reasonKey = findKey(row, ['reason', 'remarks', 'note', 'notes', 'description']);

          const rawEmpId = empIdKey ? String(row[empIdKey]).trim() : '';

          if (
            !rawEmpId ||
            ['employee id', 'employeeid', 'empid', 'emp id', 'code'].includes(rawEmpId.toLowerCase())
          ) {
            return;
          }

          const rawName = nameKey ? String(row[nameKey]).trim() : '';
          const rawAmount = amountKey ? String(row[amountKey]).trim() : '';
          const rawNeededOn = neededOnKey ? row[neededOnKey] : '';
          const rawMonth = monthKey ? row[monthKey] : '';
          const rawDisbursement = disbKey ? String(row[disbKey]).trim().toLowerCase() : '';
          const rawReason = reasonKey ? String(row[reasonKey]).trim() : '';

          // 1. Employee lookup
          const empMatch = empCodeMap.get(rawEmpId.toLowerCase());
          if (!empMatch) {
            validationErrors.push({
              row: rowNum,
              empId: rawEmpId,
              field: 'Employee ID',
              reason: `Employee ID "${rawEmpId}" not found in active employees directory.`,
              value: rawEmpId,
            });
          }

          // 2. Amount validation
          const amountNum = parseFloat(rawAmount);
          if (isNaN(amountNum) || amountNum <= 0) {
            validationErrors.push({
              row: rowNum,
              empId: rawEmpId,
              field: 'Amount',
              reason: `Invalid amount "${rawAmount}". Must be a positive number.`,
              value: rawAmount,
            });
          }

          // 3. Needed On validation
          const parsedNeededOn = parseDateString(rawNeededOn);
          if (!parsedNeededOn) {
            validationErrors.push({
              row: rowNum,
              empId: rawEmpId,
              field: 'Needed On Date',
              reason: `Invalid date "${rawNeededOn}". Expected format: YYYY-MM-DD.`,
              value: String(rawNeededOn),
            });
          }

          // 4. Deduction Month validation
          const parsedMonth = parseMonthString(rawMonth);
          if (!parsedMonth) {
            validationErrors.push({
              row: rowNum,
              empId: rawEmpId,
              field: 'Deduction Month',
              reason: `Invalid deduction month "${rawMonth}". Expected format: YYYY-MM.`,
              value: String(rawMonth),
            });
          }

          // 5. Disbursement Type
          let disbursementType = 'with_payroll';
          if (rawDisbursement) {
            if (['separately', 'separate', 'cash', 'bank'].includes(rawDisbursement)) {
              disbursementType = 'separately';
            } else if (['with_payroll', 'with payroll', 'payroll'].includes(rawDisbursement)) {
              disbursementType = 'with_payroll';
            }
          }

          // 6. Reason validation
          if (!rawReason || rawReason.length < 5) {
            validationErrors.push({
              row: rowNum,
              empId: rawEmpId,
              field: 'Reason',
              reason: 'Reason is required and must be at least 5 characters.',
              value: rawReason || 'Empty',
            });
          }

          if (empMatch && !isNaN(amountNum) && amountNum > 0 && parsedNeededOn && parsedMonth && rawReason && rawReason.length >= 5) {
            validRows.push({
              rowIndex: rowNum,
              employeeIdCode: empMatch.employeeId || rawEmpId,
              employeeName: empMatch.employeeName || rawName,
              amount: amountNum,
              neededOn: parsedNeededOn,
              deductionMonthYear: parsedMonth,
              disbursementType,
              reason: rawReason,
              resolvedEmployeeId: empMatch.id,
            });
          }
        });

        if (validationErrors.length > 0) {
          setErrors(validationErrors);
          setParsedRows(validRows);
          setPhase('errors');
        } else if (validRows.length === 0) {
          setErrors([{ row: 1, empId: '—', field: 'Data', reason: 'No valid data rows found in the uploaded file.', value: 'No Rows' }]);
          setPhase('errors');
        } else {
          setParsedRows(validRows);
          setPhase('preview');
        }
      } catch (err) {
        console.error('Error parsing file:', err);
        setErrors([{ row: 1, empId: '—', field: 'File Read', reason: 'Failed to parse Excel/CSV file.', value: 'Corrupt File' }]);
        setPhase('errors');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    setPhase('importing');
    setImportProgress(35);

    try {
      const payloadItems = parsedRows.map((r) => ({
        employeeId: r.resolvedEmployeeId!,
        amount: r.amount,
        neededOn: r.neededOn,
        deductionMonthYear: r.deductionMonthYear,
        reason: r.reason,
        disbursementType: r.disbursementType,
      }));

      setImportProgress(70);

      const res = await bulkCreateAdvanceSalaries({
        advanceSalaries: payloadItems,
        isApproved: true,
      });

      setImportProgress(100);

      if (res.status) {
        setPhase('complete');
        toast.success(res.message || `Successfully imported ${parsedRows.length} approved advance salary request(s)!`);
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.message || 'Failed to import advance salary records.');
        setPhase('preview');
      }
    } catch (error) {
      console.error('Import execution error:', error);
      toast.error('An error occurred during bulk import.');
      setPhase('preview');
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Employee ID': 'EMP-001',
        'Employee Name': 'John Doe',
        'Amount': 15000,
        'Needed On Date': format(new Date(), 'yyyy-MM-dd'),
        'Deduction Month (YYYY-MM)': format(new Date(), 'yyyy-MM'),
        'Disbursement Type': 'with_payroll',
        'Reason': 'Medical emergency reimbursement support',
      },
      {
        'Employee ID': 'EMP-002',
        'Employee Name': 'Jane Smith',
        'Amount': 20000,
        'Needed On Date': format(new Date(), 'yyyy-MM-dd'),
        'Deduction Month (YYYY-MM)': format(new Date(), 'yyyy-MM'),
        'Disbursement Type': 'separately',
        'Reason': 'Family event advance salary request',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Advance Salaries');

    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 22 },
      { wch: 14 },
      { wch: 16 },
      { wch: 24 },
      { wch: 18 },
      { wch: 45 },
    ];

    XLSX.writeFile(workbook, `Advance_Salary_Bulk_Upload_Template.xlsx`);
    toast.success('Sample Excel template downloaded.');
  };

  const totalAmountSum = parsedRows.reduce((sum, r) => sum + r.amount, 0);
  const totalRowsCount = parsedRows.length + errors.length;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (phase !== 'importing') onOpenChange(val); }}>
      <DialogContent
        showCloseButton={false}
        noScroll
        className="sm:max-w-[750px] w-full flex flex-col p-0 bg-card max-h-[90vh]"
      >
        <DialogHeader className="p-6 pb-2 border-b bg-muted/30 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Banknote className="h-6 w-6 text-primary" />
            Advance Salary Bulk Import
            <Badge variant="outline" className="ml-2 bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
              Approved
            </Badge>
          </DialogTitle>

          <DialogDescription className="text-sm">
            Upload bulk advance salary data sheet. Valid records will be created with Approved status.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 w-full overflow-y-auto">
          <div className="p-6 space-y-6">
            {phase === 'select' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-2xl p-12
                    flex flex-col items-center justify-center gap-4 cursor-pointer
                    transition-all duration-300 relative group
                    ${file
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/50'
                    }
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
                      <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                        <FileText className="h-10 w-10 text-primary" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="font-bold text-xl">{file.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                          <Badge variant="secondary" className="font-mono">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </Badge>
                          Ready for validation
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
                        <X className="h-4 w-4 mr-2" /> Change File
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                        <Upload className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="font-bold text-xl">Upload Bulk Data Sheet</p>
                        <p className="text-sm text-muted-foreground max-w-[340px]">
                          Drag and drop your file, or click to browse.
                        </p>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="bg-background/50 uppercase">.CSV</Badge>
                        <Badge variant="outline" className="bg-background/50 uppercase">.XLSX</Badge>
                        <Badge variant="outline" className="bg-background/50 uppercase">.XLS</Badge>
                      </div>
                    </>
                  )}
                </div>

                {/* Template download */}
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-background flex items-center justify-center border shadow-sm">
                      <Download className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Download Template Sheet</p>
                      <p className="text-xs text-muted-foreground">
                        Get the official formatting template to align your columns correctly.
                      </p>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleDownloadTemplate} className="font-semibold shadow-sm">
                    Get Template
                  </Button>
                </div>
              </div>
            )}

            {phase === 'validating' && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-primary uppercase tracking-widest">Phase 1: Validating Data</p>
                  <h3 className="text-xl font-bold">Validating Advance Salary Records...</h3>
                  <p className="text-xs text-muted-foreground">Checking employee IDs, dates, and amounts against database records</p>
                </div>
              </div>
            )}

            {phase === 'errors' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Stats grid */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-muted/40 p-5 rounded-2xl border flex flex-col items-center justify-center shadow-sm">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Rows</span>
                    <span className="text-3xl font-black">{totalRowsCount}</span>
                  </div>
                  <div className="bg-green-500/10 p-5 rounded-2xl border border-green-500/20 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Valid</span>
                    <span className="text-3xl font-black text-green-600">{parsedRows.length}</span>
                  </div>
                  <div className="bg-destructive/10 p-5 rounded-2xl border border-destructive/20 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-[10px] font-black text-destructive uppercase tracking-widest mb-1">Invalid</span>
                    <span className="text-3xl font-black text-destructive">{errors.length}</span>
                  </div>
                  <div className="bg-amber-500/10 p-5 rounded-2xl border border-amber-500/20 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Processed</span>
                    <span className="text-3xl font-black text-amber-600">{totalRowsCount}</span>
                  </div>
                </div>

                {/* Validation message */}
                <div className="p-6 rounded-2xl border-2 border-dashed bg-card space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-7 w-7 text-destructive" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-destructive">Validation Issues Found</h4>
                      <p className="text-sm text-muted-foreground">
                        {errors.length} row(s) contain invalid values. Fix these in your Excel file and upload again.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowErrors(!showErrors)}
                      className="h-9 font-bold bg-background"
                    >
                      {showErrors ? 'Hide Error Details' : 'View Error Details'}
                    </Button>
                  </div>

                  {showErrors && (
                    <div className="border rounded-xl overflow-hidden shadow-sm bg-background/50 mt-3">
                      <ScrollArea className="h-[250px]">
                        <Table>
                          <TableHeader className="bg-muted/50 sticky top-0 z-10">
                            <TableRow>
                              <TableHead className="w-[60px] font-black uppercase text-[10px]">Row</TableHead>
                              <TableHead className="w-[120px] font-black uppercase text-[10px]">Field</TableHead>
                              <TableHead className="font-black uppercase text-[10px]">Issue Details</TableHead>
                              <TableHead className="text-right font-black uppercase text-[10px]">Provided Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {errors.map((err, i) => (
                              <TableRow key={i} className="hover:bg-muted/20">
                                <TableCell className="font-mono text-xs font-bold text-muted-foreground">{err.row}</TableCell>
                                <TableCell className="text-xs font-bold">{err.field}</TableCell>
                                <TableCell className="text-xs text-destructive font-semibold">{err.reason}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline" className="text-[10px] font-mono font-bold bg-background">
                                    {err.value || err.empId}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </div>
            )}

            {phase === 'preview' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Stats grid */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-muted/40 p-5 rounded-2xl border flex flex-col items-center justify-center shadow-sm">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Rows</span>
                    <span className="text-3xl font-black">{parsedRows.length}</span>
                  </div>
                  <div className="bg-green-500/10 p-5 rounded-2xl border border-green-500/20 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Valid</span>
                    <span className="text-3xl font-black text-green-600">{parsedRows.length}</span>
                  </div>
                  <div className="bg-destructive/10 p-5 rounded-2xl border border-destructive/20 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-[10px] font-black text-destructive uppercase tracking-widest mb-1">Invalid</span>
                    <span className="text-3xl font-black text-destructive">0</span>
                  </div>
                  <div className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Amount</span>
                    <span className="text-xl font-black text-blue-600 truncate">
                      {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(totalAmountSum)}
                    </span>
                  </div>
                </div>

                {/* Validation success banner */}
                <div className="p-6 rounded-2xl border-2 border-dashed bg-card space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-7 w-7 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg">Validation Complete</h4>
                      <p className="text-sm text-muted-foreground">
                        All {parsedRows.length} rows are valid and ready to import with <strong>Approved</strong> status.
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-xl overflow-hidden shadow-sm bg-background/50">
                    <ScrollArea className="h-[220px]">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="w-12 text-[10px] font-black uppercase">#</TableHead>
                            <TableHead className="w-24 text-[10px] font-black uppercase">Emp ID</TableHead>
                            <TableHead className="w-36 text-[10px] font-black uppercase">Employee Name</TableHead>
                            <TableHead className="w-28 text-right text-[10px] font-black uppercase">Amount (PKR)</TableHead>
                            <TableHead className="w-28 text-[10px] font-black uppercase">Needed On</TableHead>
                            <TableHead className="w-24 text-[10px] font-black uppercase">Deduction</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedRows.map((row, i) => (
                            <TableRow key={i} className="hover:bg-muted/20">
                              <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                              <TableCell className="font-mono text-xs font-bold">{row.employeeIdCode}</TableCell>
                              <TableCell className="text-xs font-medium">{row.employeeName}</TableCell>
                              <TableCell className="text-xs font-bold text-right">
                                {new Intl.NumberFormat('en-PK').format(row.amount)}
                              </TableCell>
                              <TableCell className="text-xs">{row.neededOn}</TableCell>
                              <TableCell className="text-xs font-mono">{row.deductionMonthYear}</TableCell>
                              <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]" title={row.reason}>
                                {row.reason}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            )}

            {phase === 'importing' && (
              <div className="space-y-8 py-8 animate-in fade-in duration-500">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <p className="text-sm font-bold text-primary uppercase tracking-widest">
                          Phase 2: Importing & Auto-Approving
                        </p>
                      </div>
                      <h3 className="text-2xl font-black">{file?.name}</h3>
                      <p className="text-sm text-muted-foreground italic font-medium">
                        Saving {parsedRows.length} advance salary records to database...
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-4xl font-black text-primary">{importProgress}</span>
                        <span className="text-xl font-bold text-primary/70">%</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative pt-1">
                    <Progress value={importProgress} className="h-4 rounded-full shadow-inner bg-muted" />
                  </div>
                </div>
              </div>
            )}

            {phase === 'complete' && (
              <div className="p-8 bg-green-500/5 border-2 border-green-500/20 rounded-3xl flex flex-col items-center gap-4 text-center animate-in zoom-in-95 duration-500">
                <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center shadow-lg shadow-green-500/10">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-green-700">Import Successful!</h3>
                  <p className="text-green-600/80 font-medium">
                    {parsedRows.length} advance salary requests have been successfully created with Approved status.
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-muted/30 shrink-0">
          <div className="flex justify-between w-full items-center">
            <div className="max-w-[300px]">
              {phase === 'importing' && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold italic">
                  <Info className="h-3 w-3" />
                  Processing database import...
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {phase === 'select' && (
                <>
                  <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-bold">
                    Cancel
                  </Button>
                  <Button
                    disabled={!file || loadingMetadata}
                    onClick={handleUploadAndValidate}
                    className="px-8 font-black shadow-lg shadow-primary/20"
                  >
                    {loadingMetadata ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading Directory...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Start Validation
                      </>
                    )}
                  </Button>
                </>
              )}

              {phase === 'errors' && (
                <>
                  <Button variant="outline" onClick={resetStates} className="font-bold">
                    Choose Different File
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()} className="font-bold">
                    <Upload className="h-4 w-4 mr-2" /> Re-upload File
                  </Button>
                </>
              )}

              {phase === 'preview' && (
                <>
                  <Button variant="outline" onClick={resetStates} className="font-bold">
                    Re-upload File
                  </Button>
                  <Button
                    onClick={handleConfirmImport}
                    className="px-10 font-black bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Confirm & Import
                  </Button>
                </>
              )}

              {phase === 'complete' && (
                <Button onClick={() => onOpenChange(false)} className="font-black px-8">
                  Done
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
