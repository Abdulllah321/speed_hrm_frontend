'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Autocomplete } from '@/components/ui/autocomplete';
import { EmployeeSelect } from '@/components/employees/employee-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { MultiSelect } from '@/components/ui/multi-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Save,
  Play,
  CheckCircle,
  Undo,
  Search,
  Eye,
  Calculator,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { getDepartments, getSubDepartmentsByDepartment } from '@/lib/actions/department';
import { getLocations } from '@/lib/actions/location';
import { getEmployeeById, getAllEmployeesForDropdown } from '@/lib/actions/employee';
import {
  createCprTax,
  previewCprTax,
  confirmBatchCprTax,
  type CprTaxPreviewRecord,
} from '@/lib/actions/cpr-tax';
import { CprCalculationModal } from '@/components/cpr-tax/cpr-calculation-modal';

const formatPKR = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(Number(amount));
};

export default function CreateCprTaxPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Mode: 'generate' (2-step calculation preview) or 'manual' (single entry form)
  const [activeTab, setActiveTab] = useState<'generate' | 'manual'>('generate');

  // Generator Filters & Step State
  const [genStep, setGenStep] = useState<'select' | 'preview'>('select');
  const [monthYear, setMonthYear] = useState<string>(new Date().toISOString().slice(0, 7));
  const [genDeptId, setGenDeptId] = useState<string>('all');
  const [genSubDeptId, setGenSubDeptId] = useState<string>('all');
  const [genLocationId, setGenLocationId] = useState<string>('all');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [empDropdownOptions, setEmpDropdownOptions] = useState<{ label: string; value: string }[]>([]);

  // Preview Data & Search
  const [previewData, setPreviewData] = useState<CprTaxPreviewRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalRecord, setActiveModalRecord] = useState<CprTaxPreviewRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Departments, SubDepartments, Locations
  const [departments, setDepartments] = useState<any[]>([]);
  const [subDepartments, setSubDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Single Manual Form State
  const [manualLoading, setManualLoading] = useState(false);
  const [manualEmpLoading, setManualEmpLoading] = useState(false);
  const [manualData, setManualData] = useState({
    departmentId: '',
    subDepartmentId: '',
    employeeId: '',
    cnic: '',
    name: '',
    city: '',
    cprNo: '',
    carAmount: '',
    ntn: '',
    taxableAmountAnnual: '',
    taxableAmountGross: '',
    taxAmountMonthlyTax: '',
    taxPeriod: '',
    paymentDate: '',
  });

  // Fetch departments & locations on mount
  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [deptRes, locRes] = await Promise.all([getDepartments(), getLocations()]);
        if (deptRes.status && deptRes.data) setDepartments(deptRes.data);
        if (locRes.status && locRes.data) setLocations(locRes.data);
      } catch (error) {
        console.error('Failed to load metadata:', error);
      }
    };
    fetchMasters();
  }, []);

  // Fetch sub-departments for generator filter
  useEffect(() => {
    const fetchSubDeps = async () => {
      if (genDeptId && genDeptId !== 'all') {
        try {
          const res = await getSubDepartmentsByDepartment(genDeptId);
          if (res.status && res.data) setSubDepartments(res.data);
          else setSubDepartments([]);
        } catch (err) {
          setSubDepartments([]);
        }
      } else {
        setSubDepartments([]);
        setGenSubDeptId('all');
      }
    };
    fetchSubDeps();
  }, [genDeptId]);

  // Fetch employee options for generator dropdown
  useEffect(() => {
    const fetchEmps = async () => {
      try {
        const res = await getAllEmployeesForDropdown({
          departmentId: genDeptId !== 'all' ? genDeptId : undefined,
          subDepartmentId: genSubDeptId !== 'all' ? genSubDeptId : undefined,
          locationId: genLocationId !== 'all' ? genLocationId : undefined,
        });
        if (res.status && res.data) {
          setEmpDropdownOptions(
            res.data.map((e) => ({
              value: e.id,
              label: `(${e.employeeId}) ${e.employeeName}`,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to fetch employee options:', err);
      }
    };
    fetchEmps();
  }, [genDeptId, genSubDeptId, genLocationId]);

  // Handle Preview Calculation Submit
  const handlePreviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthYear) {
      toast.error('Please select Month and Year');
      return;
    }

    const [year, month] = monthYear.split('-');
    startTransition(async () => {
      const res = await previewCprTax({
        month,
        year,
        departmentId: genDeptId !== 'all' ? genDeptId : undefined,
        subDepartmentId: genSubDeptId !== 'all' ? genSubDeptId : undefined,
        locationId: genLocationId !== 'all' ? genLocationId : undefined,
        employeeIds: selectedEmpIds.length > 0 ? selectedEmpIds : undefined,
      });

      if (res.status && res.data) {
        if (res.data.length === 0) {
          toast.warning('No payroll records found for the selected period/filters.');
        } else {
          setPreviewData(res.data);
          setGenStep('preview');
          toast.success(`CPR Tax Preview generated for ${res.data.length} employees.`);
        }
      } else {
        toast.error(res.message || 'Failed to generate CPR Tax preview.');
      }
    });
  };

  // Recalculate row when Car Amount or CPR No is changed in preview table
  const handlePreviewRowChange = (index: number, field: string, value: any) => {
    const updated = [...previewData];
    const row = { ...updated[index] };

    if (field === 'cprNo') {
      row.cprNo = value;
    } else if (field === 'carAmount') {
      const carVal = parseFloat(value) || 0;
      row.carAmount = carVal;
      row.carBenefit = carVal * 0.05;
      row.taxableAmountAnnual = row.baseAnnualTaxable + row.carBenefit;

      // Recalculate tax from slab if present
      if (row.slab && row.taxableAmountAnnual > 0) {
        const excess = Math.max(0, row.taxableAmountAnnual - row.slab.minAmount);
        const annualTax = row.slab.fixedAmount + excess * (row.slab.rate / 100);
        row.taxAmountAnnual = Math.round(annualTax);

        const remTax = Math.max(0, annualTax - (row.ytdTaxDeducted || 0));
        row.taxAmountMonthlyTax = Math.max(
          0,
          Math.round(remTax / (row.remainingMonths || 12))
        );
      }
    }

    updated[index] = row;
    setPreviewData(updated);
  };

  // Confirm and Save Batch CPR Tax
  const handleConfirmBatch = async () => {
    if (previewData.length === 0) return;

    startTransition(async () => {
      const payloadRecords = previewData.map((row) => ({
        employeeId: row.employeeId,
        cnic: row.cnic,
        name: row.name,
        city: row.city || undefined,
        cprNo: row.cprNo,
        carAmount: row.carAmount,
        ntn: row.ntn || undefined,
        taxableAmountAnnual: row.taxableAmountAnnual,
        taxableAmountGross: row.taxableAmountGross,
        taxAmountMonthlyTax: row.taxAmountMonthlyTax,
        taxAmountAnnual: row.taxAmountAnnual,
        taxPeriod: row.taxPeriod,
        paymentDate: row.paymentDate ? new Date(row.paymentDate).toISOString() : undefined,
      }));

      const res = await confirmBatchCprTax({
        taxPeriod: monthYear,
        records: payloadRecords,
      });

      if (res.status) {
        toast.success(res.message || 'CPR Tax records confirmed successfully!');
        router.push(`/hr/payroll-setup/cpr-tax/view?months=${monthYear}`);
      } else {
        toast.error(res.message || 'Failed to confirm CPR Tax records.');
      }
    });
  };

  // Handle Manual Form Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualData.cnic.trim()) return toast.error('CNIC is required');
    if (!manualData.name.trim()) return toast.error('Name is required');
    if (!manualData.cprNo.trim()) return toast.error('CPR Number is required');

    setManualLoading(true);
    try {
      const res = await createCprTax({
        employeeId: manualData.employeeId || undefined,
        cnic: manualData.cnic.trim(),
        name: manualData.name.trim(),
        city: manualData.city.trim() || undefined,
        cprNo: manualData.cprNo.trim(),
        carAmount: manualData.carAmount ? parseFloat(manualData.carAmount) : undefined,
        ntn: manualData.ntn.trim() || undefined,
        taxableAmountAnnual: manualData.taxableAmountAnnual
          ? parseFloat(manualData.taxableAmountAnnual)
          : undefined,
        taxableAmountGross: manualData.taxableAmountGross
          ? parseFloat(manualData.taxableAmountGross)
          : undefined,
        taxAmountMonthlyTax: manualData.taxAmountMonthlyTax
          ? parseFloat(manualData.taxAmountMonthlyTax)
          : undefined,
        taxPeriod: manualData.taxPeriod.trim() || undefined,
        paymentDate: manualData.paymentDate
          ? new Date(manualData.paymentDate).toISOString()
          : undefined,
      });

      if (res.status) {
        toast.success(res.message || 'CPR Tax record created successfully!');
        router.push('/hr/payroll-setup/cpr-tax/view');
      } else {
        toast.error(res.message || 'Failed to create CPR Tax record');
      }
    } catch (err) {
      toast.error('An error occurred while creating CPR Tax record');
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/hr/payroll-setup/cpr-tax/view">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Generate & Create CPR Tax</h1>
            <p className="text-sm text-muted-foreground">
              Preview CPR Tax calculations or manually enter custom tax records
            </p>
          </div>
        </div>
      </div>

      {/* Tabs for Preview Calculation vs Manual Entry */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'generate' | 'manual')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="generate" className="gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Generate Preview (Batch)
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Plus className="h-4 w-4" />
            Manual Single Entry
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BATCH GENERATE & CALCULATION PREVIEW */}
        <TabsContent value="generate" className="space-y-6 mt-4">
          {genStep === 'select' ? (
            <Card className="shadow-lg border border-border/50">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle>Calculation Parameters</CardTitle>
                <CardDescription>
                  Select month, year, and parameters to compute CPR tax preview for employees
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handlePreviewSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Month Year Picker */}
                    <div className="space-y-2">
                      <Label htmlFor="monthYear">
                        Select Month & Year <span className="text-destructive">*</span>
                      </Label>
                      <MonthYearPicker
                        value={monthYear}
                        onChange={(val) => setMonthYear(Array.isArray(val) ? val[0] : val)}
                        className="w-full"
                      />
                    </div>

                    {/* Department Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="genDept">Filter Department</Label>
                      <Autocomplete
                        options={[
                          { value: 'all', label: 'All Departments' },
                          ...departments.map((d) => ({ value: d.id, label: d.name })),
                        ]}
                        value={genDeptId}
                        onValueChange={(val) => {
                          setGenDeptId(val);
                          setGenSubDeptId('all');
                        }}
                        placeholder="Select Department"
                      />
                    </div>

                    {/* SubDepartment Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="genSubDept">Filter Sub Department</Label>
                      <Autocomplete
                        options={[
                          { value: 'all', label: 'All Sub Departments' },
                          ...subDepartments.map((s) => ({ value: s.id, label: s.name })),
                        ]}
                        value={genSubDeptId}
                        onValueChange={setGenSubDeptId}
                        placeholder="Select Sub Department"
                        disabled={genDeptId === 'all'}
                      />
                    </div>

                    {/* Location Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="genLoc">Filter Location</Label>
                      <Autocomplete
                        options={[
                          { value: 'all', label: 'All Locations' },
                          ...locations.map((l) => ({ value: l.id, label: l.name })),
                        ]}
                        value={genLocationId}
                        onValueChange={setGenLocationId}
                        placeholder="Select Location"
                      />
                    </div>
                  </div>

                  {/* MultiSelect Employees */}
                  <div className="space-y-2">
                    <Label>Select Specific Employees (Optional)</Label>
                    <MultiSelect
                      options={empDropdownOptions}
                      value={selectedEmpIds}
                      onValueChange={setSelectedEmpIds}
                      placeholder="Select specific employees..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end pt-4 border-t border-border/50">
                    <Button type="submit" disabled={isPending} size="lg" className="gap-2">
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Calculating Preview...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Preview CPR Tax Calculation
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            /* PREVIEW SCREEN (STEP 2) */
            <Card className="border-0 shadow-xl bg-card animate-in fade-in zoom-in-95 duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    CPR Tax Calculation Preview ({monthYear})
                  </CardTitle>
                  <CardDescription>
                    Review calculated tax, edit CPR No/Car Amount inline, and click Confirm to save.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employee..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setGenStep('select')}
                    disabled={isPending}
                    size="sm"
                  >
                    <Undo className="h-4 w-4 mr-1.5" />
                    Back to Filters
                  </Button>
                  <Button onClick={handleConfirmBatch} disabled={isPending} size="sm">
                    {isPending ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                    )}
                    Confirm & Save CPR Tax
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-[50px]">S.No</TableHead>
                        <TableHead className="w-[140px]">Employee</TableHead>
                        <TableHead className="w-[140px]">Taxpayer Name</TableHead>
                        <TableHead className="w-[130px]">CNIC</TableHead>
                        <TableHead className="w-[180px]">CPR Number</TableHead>
                        <TableHead className="w-[140px] text-right">Car Amount</TableHead>
                        <TableHead className="w-[130px] text-right">Taxable Gross</TableHead>
                        <TableHead className="w-[130px] text-right">Taxable Annual</TableHead>
                        <TableHead className="w-[120px] text-right">Annual Tax</TableHead>
                        <TableHead className="w-[120px] text-right">Monthly Tax</TableHead>
                        <TableHead className="w-[70px] text-center">Preview</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData
                        .filter((row) => {
                          if (!searchQuery.trim()) return true;
                          const q = searchQuery.toLowerCase();
                          return (
                            row.employeeName.toLowerCase().includes(q) ||
                            row.employeeCode.toLowerCase().includes(q) ||
                            row.name.toLowerCase().includes(q) ||
                            row.cnic.toLowerCase().includes(q)
                          );
                        })
                        .map((row, idx) => (
                          <TableRow key={row.employeeId || idx}>
                            <TableCell className="text-xs">{idx + 1}</TableCell>
                            <TableCell className="font-medium text-xs">
                              <div>{row.employeeName}</div>
                              <span className="text-[10px] text-muted-foreground">
                                {row.employeeCode}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs font-medium">{row.name}</TableCell>
                            <TableCell className="text-xs font-mono">{row.cnic}</TableCell>
                            <TableCell>
                              <Input
                                value={row.cprNo}
                                onChange={(e) =>
                                  handlePreviewRowChange(idx, 'cprNo', e.target.value)
                                }
                                className="h-8 text-xs font-mono"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                value={row.carAmount || ''}
                                onChange={(e) =>
                                  handlePreviewRowChange(idx, 'carAmount', e.target.value)
                                }
                                placeholder="0"
                                className="h-8 text-xs font-semibold text-right"
                              />
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium">
                              {formatPKR(row.taxableAmountGross)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-primary">
                              {formatPKR(row.taxableAmountAnnual)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold">
                              {formatPKR(row.taxAmountAnnual)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-bold text-red-600 dark:text-red-400">
                              {formatPKR(row.taxAmountMonthlyTax)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-primary"
                                onClick={() => {
                                  setActiveModalRecord(row);
                                  setModalOpen(true);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2: MANUAL SINGLE ENTRY FORM */}
        <TabsContent value="manual" className="mt-4">
          <form onSubmit={handleManualSubmit}>
            <Card className="shadow-lg border border-border/50">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle>CPR Tax Information</CardTitle>
                <CardDescription>
                  Link this record to an employee or enter the taxpayer details directly.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Employee Matching Fields */}
                <div className="bg-muted/10 border border-dashed border-border p-4 rounded-xl space-y-4">
                  <h3 className="text-sm font-semibold text-foreground/80">
                    Employee Linking (Optional)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manualDept">Filter Department</Label>
                      <Autocomplete
                        options={departments.map((dept) => ({
                          value: dept.id,
                          label: dept.name,
                        }))}
                        value={manualData.departmentId}
                        onValueChange={(val) =>
                          setManualData((prev) => ({
                            ...prev,
                            departmentId: val,
                            subDepartmentId: '',
                            employeeId: '',
                          }))
                        }
                        placeholder="Select Department"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manualSubDept">Filter Sub Department</Label>
                      <Autocomplete
                        options={subDepartments.map((s) => ({
                          value: s.id,
                          label: s.name,
                        }))}
                        value={manualData.subDepartmentId}
                        onValueChange={(val) =>
                          setManualData((prev) => ({
                            ...prev,
                            subDepartmentId: val,
                            employeeId: '',
                          }))
                        }
                        placeholder={
                          manualData.departmentId
                            ? 'Select Sub Department'
                            : 'Select department first'
                        }
                        disabled={!manualData.departmentId}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manualEmp">Select Employee</Label>
                      <EmployeeSelect
                        value={manualData.employeeId}
                        onValueChange={async (empId) => {
                          setManualData((prev) => ({ ...prev, employeeId: empId }));
                          if (empId) {
                            setManualEmpLoading(true);
                            try {
                              const empRes = await getEmployeeById(empId);
                              if (empRes.status && empRes.data) {
                                setManualData((prev) => ({
                                  ...prev,
                                  name: empRes.data.employeeName || '',
                                  cnic: empRes.data.cnicNumber || '',
                                }));
                                toast.info('Auto-filled Employee Name and CNIC');
                              }
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setManualEmpLoading(false);
                            }
                          }
                        }}
                        departmentId={manualData.departmentId || undefined}
                        subDepartmentId={manualData.subDepartmentId || undefined}
                        placeholder="Select Employee"
                      />
                    </div>
                  </div>
                </div>

                {/* Main Taxpayer Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Taxpayer Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={manualData.name}
                      onChange={(e) =>
                        setManualData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Enter taxpayer name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnic">
                      Taxpayer CNIC <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cnic"
                      value={manualData.cnic}
                      onChange={(e) =>
                        setManualData((prev) => ({ ...prev, cnic: e.target.value }))
                      }
                      placeholder="e.g. 42501-1498900-1"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cprNo">
                      CPR Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cprNo"
                      value={manualData.cprNo}
                      onChange={(e) =>
                        setManualData((prev) => ({ ...prev, cprNo: e.target.value }))
                      }
                      placeholder="e.g. IT-20260529-0101-1714853"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ntn">Taxpayer NTN (Optional)</Label>
                    <Input
                      id="ntn"
                      value={manualData.ntn}
                      onChange={(e) =>
                        setManualData((prev) => ({ ...prev, ntn: e.target.value }))
                      }
                      placeholder="e.g. 1234567-8"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City (Optional)</Label>
                    <Input
                      id="city"
                      value={manualData.city}
                      onChange={(e) =>
                        setManualData((prev) => ({ ...prev, city: e.target.value }))
                      }
                      placeholder="e.g. KARACHI"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="carAmount">Car Amount (Optional)</Label>
                    <Input
                      id="carAmount"
                      type="number"
                      value={manualData.carAmount}
                      onChange={(e) =>
                        setManualData((prev) => ({ ...prev, carAmount: e.target.value }))
                      }
                      placeholder="e.g. 2209835"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxableAmountAnnual">Taxable Amount Annual (Optional)</Label>
                    <Input
                      id="taxableAmountAnnual"
                      type="number"
                      value={manualData.taxableAmountAnnual}
                      onChange={(e) =>
                        setManualData((prev) => ({
                          ...prev,
                          taxableAmountAnnual: e.target.value,
                        }))
                      }
                      placeholder="Annual Taxable Amount"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxableAmountGross">Taxable Amount Gross (Optional)</Label>
                    <Input
                      id="taxableAmountGross"
                      type="number"
                      value={manualData.taxableAmountGross}
                      onChange={(e) =>
                        setManualData((prev) => ({
                          ...prev,
                          taxableAmountGross: e.target.value,
                        }))
                      }
                      placeholder="Gross Taxable Amount"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxAmountMonthlyTax">Monthly Tax Amount (Optional)</Label>
                    <Input
                      id="taxAmountMonthlyTax"
                      type="number"
                      value={manualData.taxAmountMonthlyTax}
                      onChange={(e) =>
                        setManualData((prev) => ({
                          ...prev,
                          taxAmountMonthlyTax: e.target.value,
                        }))
                      }
                      placeholder="Monthly Tax Amount"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxPeriod">Tax Period (Optional)</Label>
                    <Input
                      id="taxPeriod"
                      value={manualData.taxPeriod}
                      onChange={(e) =>
                        setManualData((prev) => ({ ...prev, taxPeriod: e.target.value }))
                      }
                      placeholder="e.g. 2026-05"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                  <Link href="/hr/payroll-setup/cpr-tax/view">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={manualLoading || manualEmpLoading} className="gap-2">
                    {manualLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save CPR Tax
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>

      {/* CPR Tax Calculation Breakdown Modal */}
      <CprCalculationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        record={activeModalRecord}
      />
    </div>
  );
}
