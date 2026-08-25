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
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  X,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { getEmployees, type Employee } from '@/lib/actions/employee';
import { getEmployeeGrades, type EmployeeGrade } from '@/lib/actions/employee-grade';
import { getDesignations, type Designation } from '@/lib/actions/designation';
import {
  bulkCreateIncrements,
  getIncrements,
  type CreateIncrementData,
} from '@/lib/actions/increment';
import { format } from 'date-fns';

interface IncrementBulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedIncrementRow {
  rowIndex: number;
  employeeIdCode: string; // The user-provided emp ID (e.g. EMP-001)
  employeeName: string;   // Matched / user-provided name
  previousSalary: number; // Employee's latest base salary before increment
  incrementType: 'Increment' | 'Decrement';
  incrementMethod: 'Amount' | 'Percent';
  incrementValue: number;
  incrementAmount?: number;
  incrementPercentage?: number;
  salary: number;         // Revised / calculated final salary
  promotionDate: string;  // YYYY-MM-DD
  currentMonth: string;   // YYYY-MM
  gradeName?: string;     // Resolved grade name
  designationName?: string;// Resolved designation name
  notes: string;
  // Resolved database UUID references
  resolvedEmployeeId: string;
  resolvedEmployeeGradeId?: string;
  resolvedDesignationId?: string;
}

interface ValidationError {
  row: number;
  empId: string;
  field: string;
  reason: string;
}

type UploaderPhase = 'select' | 'validating' | 'errors' | 'preview' | 'importing' | 'complete';

export function IncrementBulkUploadModal({
  open,
  onOpenChange,
  onSuccess,
}: IncrementBulkUploadModalProps) {
  const [phase, setPhase] = useState<UploaderPhase>('select');
  const [file, setFile] = useState<File | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeGrades, setEmployeeGrades] = useState<EmployeeGrade[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [latestSalaries, setLatestSalaries] = useState<Record<string, number>>({});
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  const [parsedRows, setParsedRows] = useState<ParsedIncrementRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importProgress, setImportProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch employees, grades, designations, and previous increments on dialog open
  useEffect(() => {
    if (!open) return;

    const loadMetadata = async () => {
      setLoadingMetadata(true);
      try {
        const [empRes, gradesRes, desigRes, incRes] = await Promise.all([
          getEmployees({ limit: 10000 }),
          getEmployeeGrades(),
          getDesignations(),
          getIncrements(),
        ]);

        if (empRes.status && empRes.data) {
          setEmployees(empRes.data);
        }
        if (gradesRes.status && gradesRes.data) {
          setEmployeeGrades(gradesRes.data.filter((g) => g.status === 'active'));
        }
        if (desigRes.status && desigRes.data) {
          setDesignations(desigRes.data.filter((d) => d.status === 'active'));
        }

        // Build latest salary lookup map per employee
        const salariesMap: Record<string, number> = {};
        if (incRes.status && incRes.data && incRes.data.length > 0) {
          // Sort increments by promotionDate desc to find latest
          const sorted = [...incRes.data].sort(
            (a, b) =>
              new Date(b.promotionDate).getTime() -
              new Date(a.promotionDate).getTime()
          );
          sorted.forEach((inc) => {
            if (!salariesMap[inc.employeeId]) {
              salariesMap[inc.employeeId] = Number(inc.salary);
            }
          });
        }
        setLatestSalaries(salariesMap);
      } catch (error) {
        console.error('Failed to load increment import metadata:', error);
        toast.error('Failed to load employee directory and promotion metadata.');
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

  // Robust Date Parser (supports YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, Excel date serials)
  const parseDateString = (rawVal: any): string | null => {
    if (!rawVal) return null;

    if (rawVal instanceof Date) {
      if (!isNaN(rawVal.getTime())) {
        return format(rawVal, 'yyyy-MM-dd');
      }
      return null;
    }

    const str = String(rawVal).trim();
    if (!str) return null;

    // 1. Format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // 2. Format YYYY/MM/DD
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
      return str.replace(/\//g, '-');
    }

    // 3. Format DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(str)) {
      const parts = str.split(/[\/\-]/);
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }

    // 4. Excel Date Serial Number (e.g. 45500)
    const serial = Number(str);
    if (!isNaN(serial) && serial > 30000 && serial < 60000) {
      try {
        const date = new Date((serial - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
          return format(date, 'yyyy-MM-dd');
        }
      } catch {}
    }

    // 5. Try standard Date parsing
    try {
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        return format(date, 'yyyy-MM-dd');
      }
    } catch {}

    return null;
  };

  // Robust Month parser (format YYYY-MM)
  const parseMonthString = (rawVal: any, fallbackDate?: string | null): string | null => {
    if (!rawVal && fallbackDate) {
      return fallbackDate.substring(0, 7); // Extract YYYY-MM from YYYY-MM-DD
    }
    if (!rawVal) return null;

    if (rawVal instanceof Date) {
      return format(rawVal, 'yyyy-MM');
    }

    const str = String(rawVal).trim();
    if (!str) {
      return fallbackDate ? fallbackDate.substring(0, 7) : null;
    }

    // 1. Format YYYY-MM
    if (/^\d{4}-\d{2}$/.test(str)) {
      return str;
    }

    // 2. Format YYYY/MM
    if (/^\d{4}\/\d{2}$/.test(str)) {
      return str.replace('/', '-');
    }

    // 3. Format MM/YYYY
    if (/^\d{1,2}\/\d{4}$/.test(str)) {
      const [mm, yyyy] = str.split('/');
      return `${yyyy}-${mm.padStart(2, '0')}`;
    }

    // 4. Format MM-YYYY
    if (/^\d{1,2}-\d{4}$/.test(str)) {
      const [mm, yyyy] = str.split('-');
      return `${yyyy}-${mm.padStart(2, '0')}`;
    }

    // 5. Check if it's an Excel Date Serial Number
    const serial = Number(str);
    if (!isNaN(serial) && serial > 30000 && serial < 60000) {
      try {
        const date = new Date((serial - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
          return format(date, 'yyyy-MM');
        }
      } catch {}
    }

    return fallbackDate ? fallbackDate.substring(0, 7) : null;
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
          setErrors([
            {
              row: 1,
              empId: '—',
              field: 'File',
              reason: 'The uploaded file is empty.',
            },
          ]);
          setPhase('errors');
          return;
        }

        // Fuzzy key matcher for headers
        const findKey = (rowObj: any, matchers: string[]) => {
          const keys = Object.keys(rowObj);
          return keys.find((k) => {
            const normalized = k.toLowerCase().replace(/[\s_\-\/\.]/g, '');
            return matchers.includes(normalized);
          });
        };

        const validationErrors: ValidationError[] = [];
        const validRows: ParsedIncrementRow[] = [];

        jsonRows.forEach((row, idx) => {
          const rowNum = idx + 2; // header is row 1

          const empIdKey = findKey(row, [
            'employeeid',
            'empid',
            'emp_id',
            'employee_id',
            'id',
            'identity',
            'code',
            'employeecode',
          ]);
          const nameKey = findKey(row, [
            'name',
            'employeename',
            'employee_name',
            'empname',
            'emp_name',
          ]);
          const typeKey = findKey(row, [
            'type',
            'incrementtype',
            'increment_type',
            'action',
            'promotiontype',
            'promotion_type',
            'incdec',
            'incrementdecrement',
          ]);
          const methodKey = findKey(row, [
            'method',
            'incrementmethod',
            'increment_method',
            'calculationtype',
            'calc_type',
          ]);
          const valueKey = findKey(row, [
            'incrementvalue',
            'increment_value',
            'value',
            'amount',
            'incrementamount',
            'increment_amount',
            'percentage',
            'incrementpercentage',
            'increment_percentage',
            'rate',
          ]);
          const dateKey = findKey(row, [
            'promotiondate',
            'promotion_date',
            'effectivedate',
            'effective_date',
            'date',
            'joiningdate',
            'applieddate',
          ]);
          const monthKey = findKey(row, [
            'month',
            'currentmonth',
            'current_month',
            'monthyear',
            'month_year',
            'period',
          ]);
          const gradeKey = findKey(row, [
            'grade',
            'employeegrade',
            'employee_grade',
            'newgrade',
            'new_grade',
            'gradename',
          ]);
          const designationKey = findKey(row, [
            'designation',
            'designationname',
            'designation_name',
            'newdesignation',
            'new_designation',
            'position',
            'title',
            'jobtitle',
          ]);
          const salaryKey = findKey(row, [
            'salary',
            'revisedsalary',
            'revised_salary',
            'newsalary',
            'new_salary',
            'finalsalary',
            'final_salary',
          ]);
          const notesKey = findKey(row, [
            'notes',
            'remarks',
            'remark',
            'note',
            'reason',
            'description',
            'comments',
          ]);

          const rawEmpId = empIdKey ? String(row[empIdKey]).trim() : '';

          // Skip header labels, template placeholder descriptions, or blank rows
          if (
            !rawEmpId ||
            [
              'employee id',
              'employeeid',
              'emp id',
              'empid',
              'identity',
              's.no',
              'sno',
            ].includes(rawEmpId.toLowerCase())
          ) {
            return;
          }

          const rawName = nameKey ? String(row[nameKey]).trim() : '';
          const rawType = typeKey ? String(row[typeKey]).trim() : '';
          const rawMethod = methodKey ? String(row[methodKey]).trim() : '';
          const rawValue = valueKey ? String(row[valueKey]).trim() : '';
          const rawDate = dateKey ? row[dateKey] : '';
          const rawMonth = monthKey ? row[monthKey] : '';
          const rawGrade = gradeKey ? String(row[gradeKey]).trim() : '';
          const rawDesignation = designationKey
            ? String(row[designationKey]).trim()
            : '';
          const rawSalary = salaryKey ? String(row[salaryKey]).trim() : '';
          const rawNotes = notesKey ? String(row[notesKey]).trim() : '';

          // 1. Validate Employee Existence
          const employee = employees.find(
            (e) =>
              e.employeeId.trim().toLowerCase() === rawEmpId.toLowerCase() ||
              e.id.toLowerCase() === rawEmpId.toLowerCase()
          );

          if (!employee) {
            validationErrors.push({
              row: rowNum,
              empId: rawEmpId,
              field: 'Employee ID',
              reason: `Employee ID "${rawEmpId}" not found in system.`,
            });
            return;
          }

          // 2. Resolve Base Salary
          const baseSalary =
            latestSalaries[employee.id] !== undefined
              ? latestSalaries[employee.id]
              : employee.employeeSalary
              ? Number(employee.employeeSalary)
              : 0;

          // 3. Resolve Type (Increment vs Decrement)
          let incrementType: 'Increment' | 'Decrement' = 'Increment';
          if (
            rawType.toLowerCase().includes('dec') ||
            rawType.toLowerCase().includes('demot')
          ) {
            incrementType = 'Decrement';
          }

          // 4. Resolve Method (Amount vs Percent)
          let incrementMethod: 'Amount' | 'Percent' = 'Amount';
          if (
            rawMethod.toLowerCase().includes('percent') ||
            rawMethod.includes('%') ||
            rawValue.includes('%')
          ) {
            incrementMethod = 'Percent';
          }

          // 5. Parse & Validate Increment Value
          const cleanedValueStr = rawValue.replace(/[^\d.-]/g, '');
          const parsedValue = parseFloat(cleanedValueStr);

          // Allow optional value if revised salary is explicitly provided
          let hasExplicitSalary = false;
          let parsedExplicitSalary = 0;
          if (rawSalary) {
            const cleanedSalaryStr = rawSalary.replace(/[^\d.-]/g, '');
            const pSal = parseFloat(cleanedSalaryStr);
            if (!isNaN(pSal) && pSal >= 0) {
              hasExplicitSalary = true;
              parsedExplicitSalary = pSal;
            }
          }

          if (isNaN(parsedValue) || parsedValue <= 0) {
            if (!hasExplicitSalary) {
              validationErrors.push({
                row: rowNum,
                empId: rawEmpId,
                field: 'Increment Value',
                reason:
                  'Increment/Decrement value is required and must be a number greater than 0.',
              });
              return;
            }
          }

          if (
            incrementMethod === 'Percent' &&
            !isNaN(parsedValue) &&
            parsedValue > 100
          ) {
            validationErrors.push({
              row: rowNum,
              empId: rawEmpId,
              field: 'Increment Value',
              reason: 'Percentage value cannot exceed 100%.',
            });
            return;
          }

          const resolvedValue = !isNaN(parsedValue) && parsedValue > 0
            ? parsedValue
            : hasExplicitSalary
            ? Math.abs(parsedExplicitSalary - baseSalary)
            : 0;

          // 6. Validate Promotion / Effective Date
          const parsedDate = parseDateString(rawDate);
          if (!parsedDate) {
            validationErrors.push({
              row: rowNum,
              empId: rawEmpId,
              field: 'Effective Date',
              reason: `Invalid Date "${rawDate}". Expected format YYYY-MM-DD.`,
            });
            return;
          }

          // 7. Validate Current Month (default to YYYY-MM from date)
          const parsedMonth = parseMonthString(rawMonth, parsedDate);
          if (!parsedMonth) {
            validationErrors.push({
              row: rowNum,
              empId: rawEmpId,
              field: 'Month',
              reason: `Invalid Month value "${rawMonth}". Expected format YYYY-MM.`,
            });
            return;
          }

          // 8. Validate Grade (Optional, match active grades or fallback to employee's current grade)
          let resolvedGradeId: string | undefined = undefined;
          let resolvedGradeName: string | undefined = undefined;

          if (rawGrade) {
            const matchedGrade = employeeGrades.find(
              (g) =>
                g.grade.trim().toLowerCase() === rawGrade.toLowerCase() ||
                g.id.toLowerCase() === rawGrade.toLowerCase()
            );
            if (!matchedGrade) {
              validationErrors.push({
                row: rowNum,
                empId: rawEmpId,
                field: 'Employee Grade',
                reason: `Employee Grade "${rawGrade}" not found or inactive.`,
              });
              return;
            }
            resolvedGradeId = matchedGrade.id;
            resolvedGradeName = matchedGrade.grade;
          } else {
            // Keep employee's existing grade if available
            resolvedGradeId =
              (employee as any).employeeGradeId ||
              (typeof employee.employeeGrade === 'string' &&
              employee.employeeGrade.length > 20
                ? employee.employeeGrade
                : undefined);
            resolvedGradeName =
              (employee as any).employeeGradeName ||
              (employee as any).employeeGrade?.grade ||
              (typeof employee.employeeGrade === 'string' &&
              employee.employeeGrade.length <= 20
                ? employee.employeeGrade
                : undefined);
          }

          // 9. Validate Designation (Optional, match active designations or fallback to employee's current designation)
          let resolvedDesignationId: string | undefined = undefined;
          let resolvedDesignationName: string | undefined = undefined;

          if (rawDesignation) {
            const matchedDesig = designations.find(
              (d) =>
                d.name.trim().toLowerCase() === rawDesignation.toLowerCase() ||
                d.id.toLowerCase() === rawDesignation.toLowerCase()
            );
            if (!matchedDesig) {
              validationErrors.push({
                row: rowNum,
                empId: rawEmpId,
                field: 'Designation',
                reason: `Designation "${rawDesignation}" not found or inactive.`,
              });
              return;
            }
            resolvedDesignationId = matchedDesig.id;
            resolvedDesignationName = matchedDesig.name;
          } else {
            // Keep employee's existing designation if available
            resolvedDesignationId =
              (employee as any).designationId ||
              (typeof employee.designation === 'string' &&
              employee.designation.length > 20
                ? employee.designation
                : undefined);
            resolvedDesignationName =
              (employee as any).designationName ||
              (employee as any).designation?.name ||
              (typeof employee.designation === 'string' &&
              employee.designation.length <= 20
                ? employee.designation
                : undefined);
          }

          // 10. Calculate Revised Salary
          let computedSalary = baseSalary;
          if (hasExplicitSalary) {
            computedSalary = parsedExplicitSalary;
          } else if (incrementMethod === 'Amount') {
            computedSalary =
              incrementType === 'Increment'
                ? baseSalary + resolvedValue
                : Math.max(0, baseSalary - resolvedValue);
          } else {
            // Percent
            const percentage = resolvedValue / 100;
            computedSalary =
              incrementType === 'Increment'
                ? baseSalary + baseSalary * percentage
                : Math.max(0, baseSalary - baseSalary * percentage);
          }

          validRows.push({
            rowIndex: rowNum,
            employeeIdCode: rawEmpId,
            employeeName: employee.employeeName || rawName || '—',
            previousSalary: baseSalary,
            incrementType,
            incrementMethod,
            incrementValue: resolvedValue,
            incrementAmount:
              incrementMethod === 'Amount' ? resolvedValue : undefined,
            incrementPercentage:
              incrementMethod === 'Percent' ? resolvedValue : undefined,
            salary: Math.round(computedSalary * 100) / 100,
            promotionDate: parsedDate,
            currentMonth: parsedMonth,
            gradeName: resolvedGradeName,
            designationName: resolvedDesignationName,
            notes: rawNotes,
            resolvedEmployeeId: employee.id,
            resolvedEmployeeGradeId: resolvedGradeId,
            resolvedDesignationId: resolvedDesignationId,
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
        console.error('Error parsing file:', err);
        setErrors([
          {
            row: 0,
            empId: '—',
            field: 'Parser',
            reason:
              'Error reading file. Ensure it is a valid Excel or CSV file matching the template.',
          },
        ]);
        setPhase('errors');
      }
    };
    reader.onerror = () => {
      setErrors([
        {
          row: 0,
          empId: '—',
          field: 'File',
          reason: 'Failed to read file contents.',
        },
      ]);
      setPhase('errors');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0 || phase === 'importing') return;

    setPhase('importing');
    setImportProgress(10);

    try {
      // Prepare payload
      const payloadItems: CreateIncrementData[] = parsedRows.map((r) => ({
        employeeId: r.resolvedEmployeeId,
        employeeGradeId: r.resolvedEmployeeGradeId || undefined,
        designationId: r.resolvedDesignationId || undefined,
        incrementType: r.incrementType,
        incrementAmount: r.incrementAmount,
        incrementPercentage: r.incrementPercentage,
        incrementMethod: r.incrementMethod,
        salary: r.salary,
        promotionDate: r.promotionDate,
        currentMonth: r.currentMonth,
        notes: r.notes || undefined,
      }));

      // Chunk requests into batches of 50 for smooth execution
      const chunkSize = 50;
      let importedCount = 0;
      const errorsList: string[] = [];

      for (let i = 0; i < payloadItems.length; i += chunkSize) {
        const chunk = payloadItems.slice(i, i + chunkSize);
        const res = await bulkCreateIncrements({ increments: chunk });

        if (res.status) {
          importedCount += chunk.length;
        } else {
          errorsList.push(
            res.message || `Failed to import batch ${Math.floor(i / chunkSize) + 1}`
          );
        }

        const pct = Math.min(
          95,
          Math.floor(((i + chunk.length) / payloadItems.length) * 100)
        );
        setImportProgress(pct);
      }

      if (errorsList.length === 0) {
        setImportProgress(100);
        toast.success(
          `Successfully imported ${importedCount} increment/promotion record(s)!`
        );
        setPhase('complete');
        onSuccess?.();
      } else {
        toast.error(errorsList.join(', '));
        setPhase('preview');
      }
    } catch (error) {
      console.error('Import execution failed:', error);
      toast.error('An error occurred during increment bulk import.');
      setPhase('preview');
    }
  };

  // Download official Excel template with sample rows and headers
  const downloadTemplate = () => {
    const data = [
      [
        'Employee ID',
        'Employee Name',
        'Type',
        'Method',
        'Increment Value',
        'Effective Date',
        'Month',
        'New Grade',
        'New Designation',
        'Revised Salary',
        'Notes',
      ],
      [
        'EMP-001',
        'John Doe',
        'Increment',
        'Amount',
        '5000',
        '2026-08-01',
        '2026-08',
        'Grade A',
        'Senior Software Engineer',
        '',
        'Annual appraisal promotion',
      ],
      [
        'EMP-002',
        'Jane Smith',
        'Increment',
        'Percent',
        '10',
        '2026-08-01',
        '2026-08',
        '',
        '',
        '',
        'Mid-year 10% salary increment',
      ],
      [
        'EMP-003',
        'Robert Brown',
        'Decrement',
        'Amount',
        '2000',
        '2026-08-01',
        '2026-08',
        '',
        '',
        '',
        'Role restructuring decrement',
      ],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths for optimal reading
    ws['!cols'] = [
      { wch: 15 }, // Employee ID
      { wch: 20 }, // Employee Name
      { wch: 14 }, // Type
      { wch: 12 }, // Method
      { wch: 16 }, // Increment Value
      { wch: 15 }, // Effective Date
      { wch: 12 }, // Month
      { wch: 16 }, // New Grade
      { wch: 24 }, // New Designation
      { wch: 16 }, // Revised Salary
      { wch: 30 }, // Notes
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Promotion_Increments');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `promotion_increment_import_template_${format(
      new Date(),
      'yyyy-MM-dd'
    )}.xlsx`;
    link.click();
    toast.success('Template downloaded successfully');
  };

  const totalIncrementValue = useMemo(() => {
    return parsedRows.reduce((sum, r) => {
      if (r.incrementType === 'Increment') {
        const val =
          r.incrementMethod === 'Amount'
            ? r.incrementValue
            : (r.previousSalary * r.incrementValue) / 100;
        return sum + val;
      }
      return sum;
    }, 0);
  }, [parsedRows]);

  const totalFinalSalary = useMemo(() => {
    return parsedRows.reduce((sum, r) => sum + r.salary, 0);
  }, [parsedRows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl md:max-w-5xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <TrendingUp className="h-5 w-5 text-primary animate-pulse" />
            Bulk Upload Promotions & Increments
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel spreadsheet to award increments, decrements, and title promotions to multiple employees.
          </DialogDescription>
        </DialogHeader>

        {loadingMetadata ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              Loading active employees, grades & designations...
            </p>
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
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Download Excel Sheet Format
                    </p>
                    <p className="text-sm text-foreground/80 font-medium">
                      Includes all fields: Employee ID, Type, Method, Value, Date, Month, Grade, Designation, Salary, and Notes.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    type="button"
                  >
                    <Download className="h-4 w-4 mr-2" /> Download Template
                  </Button>
                </div>
              </div>
            )}

            {phase === 'validating' && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-bold text-foreground">
                  Validating Increment Data...
                </p>
                <p className="text-xs text-muted-foreground">
                  Verifying employee codes, previous salary packages, grades, and promotion dates.
                </p>
              </div>
            )}

            {phase === 'errors' && (
              <div className="space-y-4">
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 text-destructive">
                  <XCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Validation Failed</p>
                    <p className="text-xs opacity-90">
                      {errors.length} issue(s) detected. Fix the errors below in your file and upload again.
                    </p>
                  </div>
                </div>

                <div className="border rounded-xl overflow-hidden bg-card text-left">
                  <ScrollArea className="h-[260px]">
                    <Table>
                      <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[80px] font-bold text-xs text-center">
                            Row
                          </TableHead>
                          <TableHead className="w-[150px] font-bold text-xs">
                            Emp ID
                          </TableHead>
                          <TableHead className="w-[150px] font-bold text-xs">
                            Column / Field
                          </TableHead>
                          <TableHead className="font-bold text-xs text-destructive">
                            Error Reason
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {errors.map((err, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs text-center">
                              {err.row}
                            </TableCell>
                            <TableCell className="font-bold text-xs">
                              {err.empId || '—'}
                            </TableCell>
                            <TableCell className="text-xs font-semibold">
                              {err.field}
                            </TableCell>
                            <TableCell className="text-xs text-destructive font-medium">
                              {err.reason}
                            </TableCell>
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
                    <p className="text-xs opacity-90">
                      All {parsedRows.length} promotion & increment records verified and ready for import.
                    </p>
                  </div>
                </div>

                {/* Stats Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-muted/40 p-4 rounded-xl border flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                      Total Records
                    </span>
                    <span className="text-2xl font-black">
                      {parsedRows.length}
                    </span>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-xl border flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                      Total Increment Value
                    </span>
                    <span className="text-2xl font-black text-green-600">
                      Rs. {Math.round(totalIncrementValue).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-xl border flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                      Total Revised Payroll
                    </span>
                    <span className="text-2xl font-black text-primary">
                      Rs. {Math.round(totalFinalSalary).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="border rounded-xl overflow-hidden bg-card text-left">
                  <ScrollArea className="h-[240px]">
                    <Table>
                      <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[100px] font-bold text-xs">
                            Emp ID
                          </TableHead>
                          <TableHead className="font-bold text-xs">
                            Employee Name
                          </TableHead>
                          <TableHead className="w-[90px] font-bold text-xs">
                            Type
                          </TableHead>
                          <TableHead className="w-[110px] font-bold text-xs text-right">
                            Increment
                          </TableHead>
                          <TableHead className="w-[110px] font-bold text-xs text-right">
                            Previous Sal
                          </TableHead>
                          <TableHead className="w-[110px] font-bold text-xs text-right">
                            Revised Sal
                          </TableHead>
                          <TableHead className="w-[100px] font-bold text-xs text-center">
                            Date
                          </TableHead>
                          <TableHead className="w-[130px] font-bold text-xs">
                            Designation
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedRows.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-bold text-xs">
                              {row.employeeIdCode}
                            </TableCell>
                            <TableCell className="text-xs font-semibold">
                              {row.employeeName}
                            </TableCell>
                            <TableCell className="text-xs">
                              {row.incrementType === 'Increment' ? (
                                <Badge
                                  variant="secondary"
                                  className="text-green-700 bg-green-50 hover:bg-green-100 font-semibold text-[10px] flex items-center gap-1 w-fit"
                                >
                                  <ArrowUpRight className="h-3 w-3" /> Inc
                                </Badge>
                              ) : (
                                <Badge
                                  variant="destructive"
                                  className="font-semibold text-[10px] flex items-center gap-1 w-fit"
                                >
                                  <TrendingDown className="h-3 w-3" /> Dec
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell
                              className={`text-xs font-bold text-right ${
                                row.incrementType === 'Increment'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {row.incrementMethod === 'Amount'
                                ? `Rs. ${row.incrementValue.toLocaleString()}`
                                : `${row.incrementValue}%`}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground text-right">
                              Rs. {row.previousSalary.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs font-bold text-primary text-right">
                              Rs. {row.salary.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs text-center font-mono">
                              {row.promotionDate}
                            </TableCell>
                            <TableCell className="text-xs truncate max-w-[130px]" title={row.designationName || '—'}>
                              {row.designationName || '—'}
                            </TableCell>
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
                  <p className="text-sm font-bold text-foreground">
                    Importing Promotions & Increments...
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">
                    Applying new salary rates, grades, and designations to employee profiles.
                  </p>
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
                  <h3 className="text-xl font-black text-green-700">
                    Import Completed!
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    All verified promotion and increment records have been successfully applied.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          {phase === 'select' && (
            <div className="flex justify-end gap-2 w-full">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                type="button"
              >
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
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  type="button"
                >
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
