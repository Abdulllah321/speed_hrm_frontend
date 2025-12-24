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
}

export function GeneratePayrollClient({
    initialDepartments,
    initialEmployees,
}: GeneratePayrollClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [departments] = useState<Department[]>(initialDepartments);
    const [employees] = useState<EmployeeDropdownOption[]>(initialEmployees);
    const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
    const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);
    const [step, setStep] = useState<"select" | "preview">("select");
    const [previewData, setPreviewData] = useState<any[]>([]);

    // Mock user - replace with real auth context
    // const { user } = useUser();
    const mockUserId = "user-id-placeholder";

    const [formData, setFormData] = useState({
        department: "all",
        subDepartment: "all",
        monthYear: "",
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
        row.grossSalary = row.basicSalary + row.totalAllowances + row.overtimeAmount + row.bonusAmount;

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
                    generatedBy: mockUserId,
                    details: previewData
                });

                if (result.status) {
                    toast.success(result.message);
                    router.push("/dashboard/payroll");
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
                <Link href="/dashboard/payroll">
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
                                        onChange={(value) =>
                                            setFormData((prev) => ({ ...prev, monthYear: value }))
                                        }
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
                                        <TableHead>Ad-Hoc Allowances</TableHead>
                                        <TableHead>Overtime</TableHead>
                                        <TableHead>Bonuses</TableHead>
                                        <TableHead>Deductions (AdHoc)</TableHead>
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
                                                                <span>{b.amount?.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    row.basicSalary?.toLocaleString()
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="w-24 h-8"
                                                    value={row.totalAllowances}
                                                    onChange={(e) => handleInputChange(index, 'totalAllowances', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="w-24 h-8"
                                                    value={row.overtimeAmount}
                                                    onChange={(e) => handleInputChange(index, 'overtimeAmount', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="w-24 h-8"
                                                    value={row.bonusAmount}
                                                    onChange={(e) => handleInputChange(index, 'bonusAmount', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="w-24 h-8"
                                                    value={row.totalDeductions}
                                                    onChange={(e) => handleInputChange(index, 'totalDeductions', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>{row.taxDeduction?.toFixed(2)}</TableCell>
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
