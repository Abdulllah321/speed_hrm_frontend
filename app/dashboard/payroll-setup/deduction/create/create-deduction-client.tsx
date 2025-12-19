"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Search, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  getEmployeesForDropdown,
  type EmployeeDropdownOption,
} from "@/lib/actions/employee";
import {
  getSubDepartmentsByDepartment,
  type Department,
  type SubDepartment,
} from "@/lib/actions/department";
import { bulkCreateDeductions, type DeductionHead } from "@/lib/actions/deduction";

interface EmployeeDeductionItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  deductionHeadId: string;
  deductionHeadName: string;
  amount: number;
  isTaxable: boolean;
  taxPercentage: number;
  notes: string;
}

interface CreateDeductionClientProps {
  initialDepartments: Department[];
  initialEmployees: EmployeeDropdownOption[];
  initialDeductionHeads: DeductionHead[];
}

export function CreateDeductionClient({
  initialDepartments,
  initialEmployees,
  initialDeductionHeads,
}: CreateDeductionClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [departments] = useState<Department[]>(initialDepartments);
  const [employees] = useState<EmployeeDropdownOption[]>(initialEmployees);
  const [deductionHeads] = useState<DeductionHead[]>(initialDeductionHeads);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);

  const [formData, setFormData] = useState({
    department: "all",
    subDepartment: "all",
    remarks: "",
    deductionAmount: "",
    deductionType: "",
    monthYear: "",
    isTaxable: "Yes",
    taxPercentage: "",
  });

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeeDeductions, setEmployeeDeductions] = useState<EmployeeDeductionItem[]>([]);

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

  // Filter employees based on department and sub-department
  const filteredEmployees = employees.filter((emp) => {
    if (formData.department && formData.department !== "all") {
      if (emp.departmentId !== formData.department) return false;
    }
    if (formData.subDepartment && formData.subDepartment !== "all") {
      if (emp.subDepartmentId !== formData.subDepartment) return false;
    }
    return true;
  });

  const handleDepartmentChange = (departmentId: string) => {
    setFormData((prev) => ({
      ...prev,
      department: departmentId,
      subDepartment: "all",
    }));
  };

  const handleSubDepartmentChange = (subDepartmentId: string) => {
    setFormData((prev) => ({
      ...prev,
      subDepartment: subDepartmentId,
    }));
  };

  const handleEmployeeSelectionChange = (selectedIds: string[]) => {
    setSelectedEmployeeIds(selectedIds);
    // Remove deductions for employees that are no longer selected
    setEmployeeDeductions(employeeDeductions.filter((item) => selectedIds.includes(item.employeeId)));
  };

  // Prepare employee options for MultiSelect
  const employeeOptions: MultiSelectOption[] = filteredEmployees.map((emp) => ({
    value: emp.id,
    label: emp.employeeName,
    description: `${emp.employeeId}${emp.departmentName ? ` • ${emp.departmentName}` : ""}`,
  }));

  const handleSearch = () => {
    if (!formData.deductionAmount || !formData.deductionType || !formData.monthYear) {
      toast.error("Please fill all required fields (Deduction Amount, Deduction Type, Month-Year)");
      return;
    }

    const amount = parseFloat(formData.deductionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (selectedEmployeeIds.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }

    const selectedDeductionHead = deductionHeads.find((h) => h.id === formData.deductionType);
    if (!selectedDeductionHead) {
      toast.error("Invalid deduction type selected");
      return;
    }

    // Create deduction items for all selected employees
    const newDeductions: EmployeeDeductionItem[] = selectedEmployeeIds.map((empId) => {
      const employee = employees.find((e) => e.id === empId);
      return {
        id: `${empId}-${formData.deductionType}-${Date.now()}`,
        employeeId: empId,
        employeeName: employee?.employeeName || "",
        employeeCode: employee?.employeeId || "",
        deductionHeadId: formData.deductionType,
        deductionHeadName: selectedDeductionHead.name,
        amount: amount,
        isTaxable: formData.isTaxable === "Yes",
        taxPercentage: parseFloat(formData.taxPercentage) || 0,
        notes: formData.remarks || "",
      };
    });

    setEmployeeDeductions([...employeeDeductions, ...newDeductions]);
    toast.success(`Added deductions for ${selectedEmployeeIds.length} employee(s)`);
  };

  const handleUpdateDeduction = (id: string, field: keyof EmployeeDeductionItem, value: any) => {
    setEmployeeDeductions(
      employeeDeductions.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleRemoveDeduction = (id: string) => {
    setEmployeeDeductions(employeeDeductions.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (employeeDeductions.length === 0) {
      toast.error("Please search and add at least one employee deduction");
      return;
    }

    if (!formData.monthYear) {
      toast.error("Please select month and year");
      return;
    }

    startTransition(async () => {
      try {
        const [year, month] = formData.monthYear.split("-");
        const result = await bulkCreateDeductions({
          month: month,
          year: year,
          date: `${formData.monthYear}-01`,
          deductions: employeeDeductions.map((item) => ({
            employeeId: item.employeeId,
            deductionHeadId: item.deductionHeadId,
            amount: item.amount,
            notes: item.notes || undefined,
            isTaxable: item.isTaxable,
            taxPercentage: item.taxPercentage > 0 ? item.taxPercentage : undefined,
          })),
        });

        if (result.status) {
          toast.success(result.message || "Deductions created successfully");
          router.push("/dashboard/payroll-setup/deduction/view");
        } else {
          toast.error(result.message || "Failed to create deductions");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to create deductions");
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="mb-6">
        <Link href="/dashboard/payroll-setup/deduction/view">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 shadow-lg bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold">Create Deduction Form</CardTitle>
            <CardDescription className="text-base">
              Fill in the details to create a deduction record
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* First Row - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department}
                  onValueChange={handleDepartmentChange}
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
                <Label htmlFor="subDepartment">Sub Department</Label>
                <Select
                  value={formData.subDepartment === "all" ? undefined : formData.subDepartment}
                  onValueChange={handleSubDepartmentChange}
                  disabled={
                    isPending ||
                    formData.department === "all" ||
                    !formData.department ||
                    loadingSubDepartments
                  }
                >
                  <SelectTrigger id="subDepartment">
                    <SelectValue
                      placeholder={
                        loadingSubDepartments
                          ? "Loading..."
                          : formData.department === "all" || !formData.department
                          ? "Select department first"
                          : subDepartments.length === 0
                          ? "No sub departments available"
                          : "Select Sub Department"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {subDepartments.length === 0 ? (
                      <SelectItem value="no-subdept" disabled>
                        {formData.department === "all" || !formData.department
                          ? "Select department first"
                          : "No sub departments found"}
                      </SelectItem>
                    ) : (
                      <>
                        <SelectItem value="all">All Sub Departments</SelectItem>
                        {subDepartments.map((subDept) => (
                          <SelectItem key={subDept.id} value={subDept.id}>
                            {subDept.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Employee Multi-Select */}
              <div className="space-y-2">
                <Label htmlFor="employee">
                  Employee <span className="text-destructive">*</span>
                </Label>
                <MultiSelect
                  options={employeeOptions}
                  value={selectedEmployeeIds}
                  onValueChange={handleEmployeeSelectionChange}
                  placeholder="Select employee(s)"
                  searchPlaceholder="Search employees..."
                  emptyMessage="No employees found"
                  disabled={isPending}
                  maxDisplayedItems={2}
                />
              </div>
            </div>

            {/* Second Row - Remarks full width */}
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, remarks: e.target.value }))
                }
                placeholder="Enter remarks"
                disabled={isPending}
              />
            </div>

            {/* Third Row - 4 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Deduction Amount */}
              <div className="space-y-2">
                <Label htmlFor="deductionAmount">
                  Deduction Amount: <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deductionAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.deductionAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, deductionAmount: e.target.value }))
                  }
                  placeholder="0.00"
                  disabled={isPending}
                  required
                />
              </div>

              {/* Deduction Type */}
              <div className="space-y-2">
                <Label htmlFor="deductionType">
                  Select Deduction Type: <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.deductionType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, deductionType: value }))
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="deductionType">
                    <SelectValue placeholder="Select Deduction Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {deductionHeads.length > 0 ? (
                      deductionHeads.map((head) => (
                        <SelectItem key={head.id} value={head.id}>
                          {head.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-heads" disabled>
                        No deduction types available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Month-Year */}
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

              {/* Search Button */}
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  type="button"
                  onClick={handleSearch}
                  disabled={isPending}
                  className="w-full"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>

            {/* Fourth Row - 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Is Taxable */}
              <div className="space-y-2">
                <Label htmlFor="isTaxable">
                  Is Taxable: <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.isTaxable}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, isTaxable: value }))
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="isTaxable">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tax Percentage */}
              <div className="space-y-2">
                <Label htmlFor="taxPercentage">Tax Percentage:</Label>
                <Input
                  id="taxPercentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.taxPercentage}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, taxPercentage: e.target.value }))
                  }
                  placeholder="Enter tax percentage"
                  disabled={isPending || formData.isTaxable === "No"}
                />
              </div>
            </div>

            {/* Employee Deductions Table */}
            {employeeDeductions.length > 0 && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Employee Deductions</CardTitle>
                  <CardDescription>
                    Review and edit deductions before submitting ({employeeDeductions.length} employee(s))
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Deduction Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Taxable</TableHead>
                          <TableHead>Tax %</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeeDeductions.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{item.employeeName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {item.employeeCode}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.deductionHeadId}
                                onValueChange={(value) => {
                                  const head = deductionHeads.find((h) => h.id === value);
                                  handleUpdateDeduction(item.id, "deductionHeadId", value);
                                  if (head) {
                                    handleUpdateDeduction(item.id, "deductionHeadName", head.name);
                                  }
                                }}
                                disabled={isPending}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {deductionHeads.map((head) => (
                                    <SelectItem key={head.id} value={head.id}>
                                      {head.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.amount}
                                onChange={(e) =>
                                  handleUpdateDeduction(
                                    item.id,
                                    "amount",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={isPending}
                                className="w-[120px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.isTaxable ? "Yes" : "No"}
                                onValueChange={(value) =>
                                  handleUpdateDeduction(item.id, "isTaxable", value === "Yes")
                                }
                                disabled={isPending}
                              >
                                <SelectTrigger className="w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Yes">Yes</SelectItem>
                                  <SelectItem value="No">No</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={item.taxPercentage}
                                onChange={(e) =>
                                  handleUpdateDeduction(
                                    item.id,
                                    "taxPercentage",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={isPending || !item.isTaxable}
                                className="w-[100px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.notes}
                                onChange={(e) =>
                                  handleUpdateDeduction(item.id, "notes", e.target.value)
                                }
                                placeholder="Notes"
                                disabled={isPending}
                                className="w-[200px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveDeduction(item.id)}
                                disabled={isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
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

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={isPending || employeeDeductions.length === 0} size="lg">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Deductions ({employeeDeductions.length})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
