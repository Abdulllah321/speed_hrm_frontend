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
import { bulkCreateAllowances, type AllowanceHead } from "@/lib/actions/allowance";

interface EmployeeAllowanceItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  allowanceHeadId: string;
  allowanceHeadName: string;
  amount: number;
  type: string; // "recurring" | "specific"
  adjustmentMethod: string; // "distributed-remaining-months" | "deduct-current-month"
  isTaxable: boolean;
  taxPercentage: number;
  notes: string;
  monthYear: string; // Format: "YYYY-MM" - stored for each allowance item
}

interface CreateAllowanceClientProps {
  initialDepartments: Department[];
  initialEmployees: EmployeeDropdownOption[];
  initialAllowanceHeads: AllowanceHead[];
}

export function CreateAllowanceClient({
  initialDepartments,
  initialEmployees,
  initialAllowanceHeads,
}: CreateAllowanceClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [departments] = useState<Department[]>(initialDepartments);
  const [employees] = useState<EmployeeDropdownOption[]>(initialEmployees);
  const [allowanceHeads] = useState<AllowanceHead[]>(initialAllowanceHeads);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);

  const [formData, setFormData] = useState({
    department: "all",
    subDepartment: "all",
    remarks: "",
    allowanceAmount: "",
    allowanceType: "",
    allowanceTypeCategory: "specific", // "recurring" | "specific"
    monthYear: "" as string | string[], // Can be single string or array for multiple months
    isTaxable: "Yes",
    taxPercentage: "",
    adjustmentMethod: "distributed-remaining-months", // "distributed-remaining-months" | "deduct-current-month"
  });

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeeAllowances, setEmployeeAllowances] = useState<EmployeeAllowanceItem[]>([]);

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
    // Remove allowances for employees that are no longer selected
    setEmployeeAllowances(employeeAllowances.filter((item) => selectedIds.includes(item.employeeId)));
  };

  // Prepare employee options for MultiSelect
  const employeeOptions: MultiSelectOption[] = filteredEmployees.map((emp) => ({
    value: emp.id,
    label: emp.employeeName,
    description: `${emp.employeeId}${emp.departmentName ? ` • ${emp.departmentName}` : ""}`,
  }));

    const handleSearch = () => {
      if (!formData.allowanceAmount || !formData.allowanceType) {
        toast.error("Please fill all required fields (Allowance Amount, Allowance Type)");
        return;
      }

      if (formData.allowanceTypeCategory === "specific") {
        if (Array.isArray(formData.monthYear) && formData.monthYear.length === 0) {
          toast.error("Please select at least one month for specific allowance");
          return;
        } else if (!formData.monthYear) {
          toast.error("Please select month and year for specific allowance");
          return;
        }
      }

      const amount = parseFloat(formData.allowanceAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      if (selectedEmployeeIds.length === 0) {
        toast.error("Please select at least one employee");
        return;
      }

      const selectedAllowanceHead = allowanceHeads.find((h) => h.id === formData.allowanceType);
      if (!selectedAllowanceHead) {
        toast.error("Invalid allowance type selected");
        return;
      }

      // Get selected months - handle both single string and array
      const selectedMonths = Array.isArray(formData.monthYear) 
        ? formData.monthYear 
        : formData.monthYear 
          ? [formData.monthYear] 
          : [];

      // Create allowance items for all selected employees and months
      const newAllowances: EmployeeAllowanceItem[] = [];
      selectedEmployeeIds.forEach((empId) => {
        const employee = employees.find((e) => e.id === empId);
        selectedMonths.forEach((monthYear, monthIndex) => {
          newAllowances.push({
            id: `${empId}-${formData.allowanceType}-${monthYear}-${Date.now()}-${monthIndex}`,
            employeeId: empId,
            employeeName: employee?.employeeName || "",
            employeeCode: employee?.employeeId || "",
            allowanceHeadId: formData.allowanceType,
            allowanceHeadName: selectedAllowanceHead.name,
            amount: amount,
            type: formData.allowanceTypeCategory, // "recurring" or "specific"
            adjustmentMethod: formData.adjustmentMethod,
            isTaxable: formData.isTaxable === "Yes",
            taxPercentage: parseFloat(formData.taxPercentage) || 0,
            notes: formData.remarks || "",
            monthYear: monthYear, // Store the month-year for this specific allowance
          });
        });
      });

      setEmployeeAllowances([...employeeAllowances, ...newAllowances]);
      toast.success(`Added allowances for ${selectedEmployeeIds.length} employee(s) across ${selectedMonths.length} month(s)`);
    };

  const handleUpdateAllowance = (id: string, field: keyof EmployeeAllowanceItem, value: any) => {
    setEmployeeAllowances(
      employeeAllowances.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleRemoveAllowance = (id: string) => {
    setEmployeeAllowances(employeeAllowances.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (employeeAllowances.length === 0) {
      toast.error("Please search and add at least one employee allowance");
      return;
    }

    startTransition(async () => {
      try {
        // Group allowances by month-year to create multiple bulk requests
        const allowancesByMonth = new Map<string, typeof employeeAllowances>();
        
        employeeAllowances.forEach((item) => {
          const monthYear = item.monthYear || new Date().toISOString().slice(0, 7);
          if (!allowancesByMonth.has(monthYear)) {
            allowancesByMonth.set(monthYear, []);
          }
          allowancesByMonth.get(monthYear)!.push(item);
        });

        // Create allowances for each month-year group
        const results = await Promise.all(
          Array.from(allowancesByMonth.entries()).map(async ([monthYear, allowances]) => {
            const [year, month] = monthYear.split("-");
            return bulkCreateAllowances({
              month: month,
              year: year,
              date: `${monthYear}-01`,
              allowances: allowances.map((item) => ({
                employeeId: item.employeeId,
                allowanceHeadId: item.allowanceHeadId,
                amount: item.amount,
                type: item.type || "specific",
                adjustmentMethod: item.adjustmentMethod || "distributed-remaining-months",
                notes: item.notes || undefined,
                isTaxable: item.isTaxable,
                taxPercentage: item.taxPercentage > 0 ? item.taxPercentage : undefined,
              })),
            });
          })
        );

        // Check if all requests succeeded
        const allSuccessful = results.every((result) => result.status);
        if (allSuccessful) {
          const totalCreated = results.reduce((sum, result) => sum + (result.data?.length || 0), 0);
          toast.success(`Successfully created ${totalCreated} allowance(s) for ${allowancesByMonth.size} month(s)`);
          router.push("/hr/payroll-setup/allowance/view");
        } else {
          const failedResult = results.find((result) => !result.status);
          toast.error(failedResult?.message || "Failed to create some allowances");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to create allowances");
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="mb-6">
        <Link href="/hr/allowance/view">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 shadow-lg bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold">Create Allowance Form</CardTitle>
            <CardDescription className="text-base">
              Fill in the details to create an allowance record
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
              {/* Allowance Amount */}
              <div className="space-y-2">
                <Label htmlFor="allowanceAmount">
                  Allowance Amount: <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="allowanceAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.allowanceAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, allowanceAmount: e.target.value }))
                  }
                  placeholder="0.00"
                  disabled={isPending}
                  required
                />
              </div>

              {/* Allowance Type */}
              <div className="space-y-2">
                <Label htmlFor="allowanceType">
                  Select Allowance Type: <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.allowanceType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, allowanceType: value }))
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="allowanceType">
                    <SelectValue placeholder="Select Allowance Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowanceHeads.length > 0 ? (
                      allowanceHeads.map((head) => (
                        <SelectItem key={head.id} value={head.id}>
                          {head.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-heads" disabled>
                        No allowance types available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Allowance Type Category (Recurring/Specific) */}
              <div className="space-y-2">
                <Label htmlFor="allowanceTypeCategory">
                  Allowance Category: <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.allowanceTypeCategory}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, allowanceTypeCategory: value }))
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="allowanceTypeCategory">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="specific">Specific Month</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Month-Year */}
              <div className="space-y-2">
                <Label htmlFor="monthYear">
                  Month-Year {formData.allowanceTypeCategory === "specific" && <span className="text-destructive">*</span>}
                </Label>
                <MonthYearPicker
                  value={formData.monthYear}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, monthYear: value }))
                  }
                  disabled={isPending || formData.allowanceTypeCategory === "recurring"}
                  placeholder={formData.allowanceTypeCategory === "recurring" ? "Not required for recurring" : "Select month(s) and year"}
                  multiple={formData.allowanceTypeCategory === "specific"}
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

            {/* Fourth Row - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {/* Adjustment Method */}
              <div className="space-y-2">
                <Label htmlFor="adjustmentMethod">
                  Adjustment Method: <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.adjustmentMethod}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, adjustmentMethod: value }))
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="adjustmentMethod">
                    <SelectValue placeholder="Select adjustment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distributed-remaining-months">
                      Distributed in Remaining Months
                    </SelectItem>
                    <SelectItem value="deduct-current-month">
                      Deduct from Current Month
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Employee Allowances Table */}
            {employeeAllowances.length > 0 && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Employee Allowances</CardTitle>
                  <CardDescription>
                    Review and edit allowances before submitting ({employeeAllowances.length} employee(s))
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Month-Year</TableHead>
                          <TableHead>Allowance Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Taxable</TableHead>
                          <TableHead>Tax %</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeeAllowances.map((item) => {
                          const formatMonthYear = (monthYear: string) => {
                            if (!monthYear) return "—";
                            const [year, month] = monthYear.split("-");
                            const monthNames = [
                              "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                            ];
                            const monthIndex = parseInt(month) - 1;
                            return `${monthNames[monthIndex] || month} ${year}`;
                          };

                          return (
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
                              <span className="text-sm">{formatMonthYear(item.monthYear)}</span>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.allowanceHeadId}
                                onValueChange={(value) => {
                                  const head = allowanceHeads.find((h) => h.id === value);
                                  handleUpdateAllowance(item.id, "allowanceHeadId", value);
                                  if (head) {
                                    handleUpdateAllowance(item.id, "allowanceHeadName", head.name);
                                  }
                                }}
                                disabled={isPending}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {allowanceHeads.map((head) => (
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
                                  handleUpdateAllowance(
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
                                  handleUpdateAllowance(item.id, "isTaxable", value === "Yes")
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
                                  handleUpdateAllowance(
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
                                  handleUpdateAllowance(item.id, "notes", e.target.value)
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
                                onClick={() => handleRemoveAllowance(item.id)}
                                disabled={isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={isPending || employeeAllowances.length === 0} size="lg">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Allowances ({employeeAllowances.length})
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
