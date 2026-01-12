"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Play, CheckCircle, Undo } from "lucide-react";
import Link from "next/link";
import {
    getSubDepartmentsByDepartment,
    type Department,
    type SubDepartment,
} from "@/lib/actions/department";
import { previewPayroll, confirmPayroll } from "@/lib/actions/payroll";
import { type EmployeeDropdownOption } from "@/lib/actions/employee";

interface GeneratePayrollClientProps {
    initialDepartments: Department[];
    initialEmployees: EmployeeDropdownOption[];
    currentUserId: string;
}

export function GeneratePayrollClient({
    initialDepartments,
    initialEmployees,
    currentUserId,
}: GeneratePayrollClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [departments] = useState<Department[]>(initialDepartments);
    const [employees] = useState<EmployeeDropdownOption[]>(initialEmployees);
    // ...
    const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
    const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);
    const [step, setStep] = useState<"select" | "preview">("select");
    const [previewData, setPreviewData] = useState<any[]>([]);


    const [formData, setFormData] = useState({
        department: "all",
        subDepartment: "all",
        monthYear: new Date().toISOString().split('T')[0],
    });

    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

    // Fetch sub-departments when department changes
    useEffect(() => {
        const fetchSubDepartments = async () => {
            if (formData.department && formData.department !== "all") {
                setLoadingSubDepartments(true);
                try {
                    const result = await getSubDepartmentsByDepartment(formData.department);
                    if (result.status && result.data) {
                        setSubDepartments(result.data);
                    } else {
                        setSubDepartments([]);
                    }
                } catch (error) {
                    console.error("Failed to fetch sub-departments:", error);
                    setSubDepartments([]);
                } finally {
                    setLoadingSubDepartments(false);
                }
            } else {
                setSubDepartments([]);
                setFormData((prev) => ({ ...prev, subDepartment: "all" }));
            }
        };

        fetchSubDepartments();
    }, [formData.department]);

    // Filter employees
    const filteredEmployees = employees.filter((emp) => {
        if (formData.department && formData.department !== "all") {
            if (emp.departmentId !== formData.department) return false;
        }
        if (formData.subDepartment && formData.subDepartment !== "all") {
            if (emp.subDepartmentId !== formData.subDepartment) return false;
        }
        return true;
    });

    const handleEmployeeSelectionChange = (selectedIds: string[]) => {
        setSelectedEmployeeIds(selectedIds);
    };

    const employeeOptions: MultiSelectOption[] = filteredEmployees.map((emp) => ({
        value: emp.id,
        label: emp.employeeName,
        description: `${emp.employeeId}${emp.departmentName ? ` • ${emp.departmentName}` : ""}`,
    }));

    const handlePreview = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.monthYear) {
            toast.error("Please select month and year");
            return;
        }

        let idsPayload: string[] | undefined = undefined;
        if (selectedEmployeeIds.length > 0) {
            idsPayload = selectedEmployeeIds;
        } else if (formData.department !== 'all') {
            idsPayload = filteredEmployees.map(e => e.id);
            if (idsPayload.length === 0) {
                toast.error("No employees found in selected department");
                return;
            }
        }

        startTransition(async () => {
            try {
                const [year, month] = formData.monthYear.split("-");
                const result = await previewPayroll({
                    month,
                    year,
                    employeeIds: idsPayload
                });

                if (result.status) {
                    setPreviewData(result.data);
                    setStep("preview");
                    toast.success("Payroll preview generated. Please review and confirm.");
                } else {
                    toast.error(result.message);
                }
            } catch (error) {
                console.error("Error:", error);
                toast.error("Failed to generate preview");
            }
        });
    };

    const handleInputChange = (index: number, field: string, value: string) => {
        const updatedData = [...previewData];
        updatedData[index][field] = parseFloat(value) || 0;

        // Recalculate Gross and Net
        // Simple logic: Gross = Basic + Allowances + Overtime + Bonus
        // Net = Gross - Deductions - Tax - Attendance - Loan - Advance - EOBI - PF
        // Note: Deductions field here is `totalDeductions` which usually means AdHoc deductions.
        // Total Deductions Sum = totalDeductions + tax + attendance + loan + advance + eobi + pf

        const row = updatedData[index];
        // Recalculate bonusAmount from bonusBreakup if it exists, otherwise use the existing value
        const calculatedBonusAmount = row.bonusBreakup && row.bonusBreakup.length > 0
            ? row.bonusBreakup.reduce((sum: number, b: any) => sum + (b.amount || 0), 0)
            : (row.bonusAmount || 0);
        row.bonusAmount = calculatedBonusAmount;
        // Recalculate overtimeAmount from overtimeBreakup if it exists, otherwise use the existing value
        const calculatedOvertimeAmount = row.overtimeBreakup && row.overtimeBreakup.length > 0
            ? row.overtimeBreakup.reduce((sum: number, ot: any) => sum + (ot.amount || 0), 0)
            : (row.overtimeAmount || 0);
        row.overtimeAmount = calculatedOvertimeAmount;
        // Calculate gross salary: Sum of salary breakup components + allowances + overtime + bonus
        const salaryBreakupTotal = row.salaryBreakup && row.salaryBreakup.length > 0
            ? row.salaryBreakup.reduce((sum: number, component: any) => sum + (component.amount || 0), 0)
            : (row.basicSalary || 0);
        row.grossSalary = salaryBreakupTotal + row.totalAllowances + calculatedOvertimeAmount + calculatedBonusAmount;

        const totalDed = row.totalDeductions + row.taxDeduction + row.attendanceDeduction + row.loanDeduction + row.advanceSalaryDeduction + row.eobiDeduction + row.providentFundDeduction;
        row.netSalary = row.grossSalary - totalDed;

        setPreviewData(updatedData);
    };

    const handleConfirm = async () => {
        startTransition(async () => {
            try {
                const [year, month] = formData.monthYear.split("-");
                const result = await confirmPayroll({
                    month,
                    year,
                    generatedBy: currentUserId,
                    details: previewData
                });

                if (result.status) {
                    toast.success(result.message);
                    router.push("/hr/payroll-setup/payroll/create");
                } else {
                    toast.error(result.message);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to confirm payroll");
            }
        })
    }

    return (
        <div className="max-w-6xl mx-auto pb-10">
            <div className="mb-6">
                <Link href="/hr/payroll">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Payroll
                    </Button>
                </Link>
            </div>

            {step === "select" ? (
                <form onSubmit={handlePreview} className="space-y-6">
                    <Card className="border-0 shadow-lg bg-card">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-2xl font-bold">Generate Payroll</CardTitle>
                            <CardDescription className="text-base">
                                Select month and employees to process
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Month-Year */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="monthYear">
                                        Month-Year <span className="text-destructive">*</span>
                                    </Label>
                                    <MonthYearPicker
                                        value={formData.monthYear}
                                        onChange={(value) => {
                                            const actualValue = Array.isArray(value) ? (value[0] ?? "") : value;
                                            setFormData((prev) => ({ ...prev, monthYear: actualValue }));
                                        }}
                                        disabled={isPending}
                                        placeholder="Select month and year"
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-4"></div>

                            {/* Filters */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Department */}
                                <div className="space-y-2">
                                    <Label htmlFor="department">Filter by Department</Label>
                                    <Select
                                        value={formData.department}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, department: val, subDepartment: 'all' }))}
                                        disabled={isPending}
                                    >
                                        <SelectTrigger id="department">
                                            <SelectValue placeholder="Select Department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Departments</SelectItem>
                                            {departments.map((dept) => (
                                                <SelectItem key={dept.id} value={dept.id}>
                                                    {dept.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Sub Department */}
                                <div className="space-y-2">
                                    <Label htmlFor="subDepartment">Filter by Sub Department</Label>
                                    <Select
                                        value={formData.subDepartment === "all" ? undefined : formData.subDepartment}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, subDepartment: val }))}
                                        disabled={isPending || formData.department === "all" || loadingSubDepartments}
                                    >
                                        <SelectTrigger id="subDepartment">
                                            <SelectValue placeholder="Select Sub Department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Sub Departments</SelectItem>
                                            {subDepartments.map((subDept) => (
                                                <SelectItem key={subDept.id} value={subDept.id}>
                                                    {subDept.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Employee Multi-Select */}
                            <div className="space-y-2">
                                <Label htmlFor="employee">
                                    Select Employees (Optional)
                                </Label>
                                <MultiSelect
                                    options={employeeOptions}
                                    value={selectedEmployeeIds}
                                    onValueChange={handleEmployeeSelectionChange}
                                    placeholder="Select specific employees..."
                                    disabled={isPending}
                                />
                                <p className="text-sm text-muted-foreground">
                                    {selectedEmployeeIds.length > 0
                                        ? `${selectedEmployeeIds.length} employees selected`
                                        : `All ${filteredEmployees.length} employees in filter`}
                                </p>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end pt-4 border-t">
                                <Button type="submit" disabled={isPending} size="lg">
                                    {isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Calculating...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="h-4 w-4 mr-2" />
                                            Preview Payroll
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            ) : (
                <Card className="border-0 shadow-lg bg-card animate-in fade-in zoom-in-95 duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div>
                            <CardTitle className="text-2xl font-bold">Preview Payroll</CardTitle>
                            <CardDescription>Review and edit payroll details before confirming.</CardDescription>
                        </div>
                        <div className="flex space-x-2">
                            <Button variant="outline" onClick={() => setStep("select")} disabled={isPending}>
                                <Undo className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                            <Button onClick={handleConfirm} disabled={isPending}>
                                {isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Confirm Payroll
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[150px]">Employee</TableHead>
                                        <TableHead>Salary Breakdown</TableHead>
                                        <TableHead>Increment/Decrement</TableHead>
                                        <TableHead>Allowances Breakdown</TableHead>
                                        <TableHead>Overtime</TableHead>
                                        <TableHead>Bonuses</TableHead>
                                        <TableHead>Deductions Breakdown</TableHead>
                                        <TableHead>Attendance</TableHead>
                                        <TableHead>Tax</TableHead>
                                        <TableHead>Net Salary</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.map((row, index) => (
                                        <TableRow key={row.employeeId}>
                                            <TableCell className="font-medium">
                                                <div>{row.employeeName}</div>
                                                <div className="text-xs text-muted-foreground">{row.employeeCode}</div>
                                            </TableCell>
                                            <TableCell>
                                                {row.salaryBreakup && row.salaryBreakup.length > 0 ? (
                                                    <div className="space-y-1 text-xs">
                                                        {row.salaryBreakup.map((b: any) => (
                                                            <div key={b.id} className="flex justify-between gap-4">
                                                                <span className="text-muted-foreground">{b.name} ({b.percentage ? b.percentage + '%' : '-'}):</span>
                                                                <span>{Math.round(b.amount || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    row.basicSalary?.toLocaleString()
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.incrementBreakup && row.incrementBreakup.length > 0 ? (
                                                    <div className="space-y-1 text-xs">
                                                        {row.incrementBreakup.map((inc: any, idx: number) => (
                                                            <div key={inc.id || idx} className="space-y-0.5">
                                                                <div className="flex justify-between gap-4">
                                                                    <span className={`font-medium ${inc.type === 'Increment' ? 'text-green-600' : 'text-destructive'}`}>
                                                                        {inc.type}:
                                                                    </span>
                                                                    <span className={inc.type === 'Increment' ? 'text-green-600' : 'text-destructive'}>
                                                                        {inc.method === 'Amount'
                                                                            ? `+${inc.amount?.toLocaleString() || '0'}`
                                                                            : `+${inc.percentage || '0'}%`}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between gap-4 text-muted-foreground">
                                                                    <span className="text-xs">
                                                                        {new Date(inc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                    </span>
                                                                    <span className="text-xs">
                                                                        {inc.oldSalary?.toLocaleString()} → {inc.newSalary?.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                {inc.daysBefore > 0 && (
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {inc.daysBefore} days @ old salary
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">No change</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.allowanceBreakup && row.allowanceBreakup.length > 0 ? (
                                                    <div className="space-y-1 text-xs">
                                                        {row.allowanceBreakup.map((a: any) => (
                                                            <div key={a.id} className="flex justify-between gap-4">
                                                                <span className="text-muted-foreground">{a.name}:</span>
                                                                <span>{a.amount?.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                        <div className="pt-1 mt-1 border-t flex justify-between gap-4 font-semibold">
                                                            <span>Total:</span>
                                                            <span>{row.totalAllowances?.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">No allowances</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.overtimeBreakup && row.overtimeBreakup.length > 0 ? (
                                                    <div className="space-y-1 text-xs">
                                                        {row.overtimeBreakup.map((ot: any) => (
                                                            <div key={ot.id} className="flex justify-between gap-4">
                                                                <span className="text-muted-foreground">
                                                                    {ot.title || 'Overtime'}
                                                                    {ot.weekdayHours > 0 && <span className="ml-1">(WD: {ot.weekdayHours}h)</span>}
                                                                    {ot.holidayHours > 0 && <span className="ml-1">(HD: {ot.holidayHours}h)</span>}
                                                                </span>
                                                                <span>{ot.amount?.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                        <div className="pt-1 mt-1 border-t flex justify-between gap-4 font-semibold">
                                                            <span>Total:</span>
                                                            <span>{row.overtimeAmount?.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">No overtime</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.bonusBreakup && row.bonusBreakup.length > 0 ? (
                                                    <div className="space-y-1 text-xs">
                                                        {row.bonusBreakup.map((b: any) => (
                                                            <div key={b.id} className="flex justify-between gap-4">
                                                                <span className="text-muted-foreground">{b.name}:</span>
                                                                <span>{b.amount?.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                        <div className="pt-1 mt-1 border-t flex justify-between gap-4 font-semibold">
                                                            <span>Total:</span>
                                                            <span>{row.bonusAmount?.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">No bonuses</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.deductionBreakup && row.deductionBreakup.length > 0 ? (
                                                    <div className="space-y-1 text-xs">
                                                        {row.deductionBreakup.map((d: any) => (
                                                            <div key={d.id} className="flex justify-between gap-4">
                                                                <span className="text-muted-foreground">{d.name}:</span>
                                                                <span>{d.amount?.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                        <div className="pt-1 mt-1 border-t flex justify-between gap-4 font-semibold">
                                                            <span>Total:</span>
                                                            <span>{row.totalDeductions?.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">No deductions</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.attendanceBreakup ? (
                                                    <div className="space-y-1 text-xs">
                                                        {row.attendanceBreakup.absent.count > 0 && (
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-muted-foreground">
                                                                    Absent ({row.attendanceBreakup.absent.count}):
                                                                </span>
                                                                <span className="text-destructive">
                                                                    {row.attendanceBreakup.absent.amount?.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {row.attendanceBreakup.late.count > 0 && (
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-muted-foreground">
                                                                    Late ({row.attendanceBreakup.late.count}
                                                                    {row.attendanceBreakup.late.chargeableCount !== undefined &&
                                                                        row.attendanceBreakup.late.chargeableCount !== row.attendanceBreakup.late.count &&
                                                                        `/${row.attendanceBreakup.late.chargeableCount}`}):
                                                                </span>
                                                                <span className="text-destructive">
                                                                    {row.attendanceBreakup.late.amount?.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {row.attendanceBreakup.halfDay && row.attendanceBreakup.halfDay.count > 0 && (
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-muted-foreground">
                                                                    Half Day ({row.attendanceBreakup.halfDay.count}):
                                                                </span>
                                                                <span className="text-destructive">
                                                                    {row.attendanceBreakup.halfDay.amount?.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {row.attendanceBreakup.shortDay && row.attendanceBreakup.shortDay.count > 0 && (
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-muted-foreground">
                                                                    Short Day ({row.attendanceBreakup.shortDay.count}):
                                                                </span>
                                                                <span className="text-destructive">
                                                                    {row.attendanceBreakup.shortDay.amount?.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {row.attendanceBreakup.leave && row.attendanceBreakup.leave.count > 0 && (
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-green-600">
                                                                    Leave ({row.attendanceBreakup.leave.count}):
                                                                </span>
                                                                <span className="text-green-600">—</span>
                                                            </div>
                                                        )}
                                                        {(row.attendanceBreakup.absent.count > 0 ||
                                                            (row.attendanceBreakup.late.amount && row.attendanceBreakup.late.amount > 0) ||
                                                            (row.attendanceBreakup.halfDay && row.attendanceBreakup.halfDay.count > 0) ||
                                                            (row.attendanceBreakup.shortDay && row.attendanceBreakup.shortDay.count > 0)) && (
                                                                <div className="pt-1 mt-1 border-t flex justify-between gap-4 font-semibold">
                                                                    <span>Total:</span>
                                                                    <span className="text-destructive">
                                                                        {row.attendanceDeduction?.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        {row.attendanceBreakup.absent.count === 0 &&
                                                            row.attendanceBreakup.late.count === 0 &&
                                                            (!row.attendanceBreakup.halfDay || row.attendanceBreakup.halfDay.count === 0) &&
                                                            (!row.attendanceBreakup.shortDay || row.attendanceBreakup.shortDay.count === 0) &&
                                                            (!row.attendanceBreakup.leave || row.attendanceBreakup.leave.count === 0) && (
                                                                <span className="text-xs text-muted-foreground">No issues</span>
                                                            )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        {row.attendanceDeduction > 0
                                                            ? row.attendanceDeduction?.toLocaleString()
                                                            : "No deduction"}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.taxBreakup ? (
                                                    <div className="space-y-1 text-xs">
                                                        {row.taxBreakup.rebateBreakup && row.taxBreakup.rebateBreakup.length > 0 && (
                                                            <>
                                                                {row.taxBreakup.rebateBreakup.map((rebate: any) => (
                                                                    <div key={rebate.id} className="flex justify-between gap-4">
                                                                        <span className="text-green-600">
                                                                            {rebate.name}:
                                                                        </span>
                                                                        <span className="text-green-600">
                                                                            -{rebate.amount?.toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                <div className="flex justify-between gap-4 text-xs">
                                                                    <span className="text-muted-foreground">Total Rebate:</span>
                                                                    <span className="text-green-600">-{row.taxBreakup.totalRebate?.toLocaleString()}</span>
                                                                </div>
                                                                <div className="pt-1 mt-1 border-t"></div>
                                                            </>
                                                        )}
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-muted-foreground">Taxable Income (Annual):</span>
                                                            <span>{row.taxBreakup.taxableIncome?.toLocaleString()}</span>
                                                        </div>
                                                        {row.taxBreakup.taxSlab && (
                                                            <div className="flex justify-between gap-4 text-xs">
                                                                <span className="text-muted-foreground">
                                                                    Slab ({row.taxBreakup.taxSlab.rate}%):
                                                                </span>
                                                                <span>
                                                                    {row.taxBreakup.taxSlab.minAmount?.toLocaleString()} - {row.taxBreakup.taxSlab.maxAmount?.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="pt-1 mt-1 border-t flex justify-between gap-4 font-semibold">
                                                            <span>Monthly Tax:</span>
                                                            <span className="text-destructive">
                                                                {row.taxDeduction?.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span>{row.taxDeduction?.toFixed(2) || "0.00"}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-bold text-green-600">
                                                {row.netSalary?.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground">Total Payout</div>
                                <div className="text-2xl font-bold">
                                    {previewData.reduce((acc, curr) => acc + (curr.netSalary || 0), 0).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
