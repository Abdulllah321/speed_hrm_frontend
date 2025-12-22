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
import { DatePicker } from "@/components/ui/date-picker";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Search, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  getEmployeesForDropdown,
  getEmployeeById,
  type EmployeeDropdownOption,
  type Employee,
} from "@/lib/actions/employee";
import {
  getSubDepartmentsByDepartment,
  type Department,
  type SubDepartment,
} from "@/lib/actions/department";
import { getEmployeeGrades, type EmployeeGrade } from "@/lib/actions/employee-grade";
import { getDesignations, type Designation } from "@/lib/actions/designation";
import { bulkCreateIncrements } from "@/lib/actions/increment";

interface EmployeeIncrementItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  previousDesignation?: string;
  previousSalary?: number;
  employeeGradeId: string;
  designationId: string;
  incrementType: "Increment" | "Decrement";
  incrementAmount?: number;
  incrementPercentage?: number;
  incrementMethod: "Amount" | "Percent";
  salary: number;
  promotionDate: string;
  currentMonth: string;
  monthsOfIncrement: number;
  notes: string;
}

interface CreateIncrementClientProps {
  initialDepartments: Department[];
  initialEmployees: EmployeeDropdownOption[];
  initialEmployeeGrades: EmployeeGrade[];
  initialDesignations: Designation[];
}

export function CreateIncrementClient({
  initialDepartments,
  initialEmployees,
  initialEmployeeGrades,
  initialDesignations,
}: CreateIncrementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [departments] = useState<Department[]>(initialDepartments);
  const [employees] = useState<EmployeeDropdownOption[]>(initialEmployees);
  const [employeeGrades] = useState<EmployeeGrade[]>(initialEmployeeGrades);
  const [designations] = useState<Designation[]>(initialDesignations);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);

  const [formData, setFormData] = useState({
    department: "all",
    subDepartment: "all",
    remarks: "",
    employeeGradeId: "",
    designationId: "",
    incrementType: "Increment" as "Increment" | "Decrement",
    incrementMethod: "Amount" as "Amount" | "Percent",
    incrementAmount: "",
    incrementPercentage: "",
    salary: "",
    promotionDate: "",
    currentMonth: "",
    monthsOfIncrement: "",
  });

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeeIncrements, setEmployeeIncrements] = useState<EmployeeIncrementItem[]>([]);
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState<Record<string, Employee>>({});
  const [loadingEmployeeDetails, setLoadingEmployeeDetails] = useState<Record<string, boolean>>({});

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

  const handleEmployeeSelectionChange = async (selectedIds: string[]) => {
    setSelectedEmployeeIds(selectedIds);
    // Remove increments for employees that are no longer selected
    setEmployeeIncrements(employeeIncrements.filter((item) => selectedIds.includes(item.employeeId)));
    
    // Fetch employee details for newly selected employees
    const newIds = selectedIds.filter(id => !selectedEmployeeDetails[id]);
    if (newIds.length > 0) {
      newIds.forEach(empId => {
        setLoadingEmployeeDetails(prev => ({ ...prev, [empId]: true }));
        getEmployeeById(empId).then(result => {
          if (result.status && result.data) {
            setSelectedEmployeeDetails(prev => ({ ...prev, [empId]: result.data! }));
          }
          setLoadingEmployeeDetails(prev => ({ ...prev, [empId]: false }));
        }).catch(() => {
          setLoadingEmployeeDetails(prev => ({ ...prev, [empId]: false }));
        });
      });
    }
    
    // Remove details for deselected employees
    const removedIds = Object.keys(selectedEmployeeDetails).filter(id => !selectedIds.includes(id));
    if (removedIds.length > 0) {
      setSelectedEmployeeDetails(prev => {
        const updated = { ...prev };
        removedIds.forEach(id => delete updated[id]);
        return updated;
      });
    }
  };

  // Prepare employee options for MultiSelect
  const employeeOptions: MultiSelectOption[] = filteredEmployees.map((emp) => ({
    value: emp.id,
    label: emp.employeeName,
    description: `${emp.employeeId}${emp.departmentName ? ` • ${emp.departmentName}` : ""}`,
  }));

  const handleSearch = () => {
    if (
      !formData.employeeGradeId ||
      !formData.designationId ||
      !formData.incrementType ||
      (!formData.incrementAmount && !formData.incrementPercentage) ||
      !formData.salary ||
      !formData.promotionDate ||
      !formData.currentMonth ||
      !formData.monthsOfIncrement
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    const incrementValue = formData.incrementMethod === "Amount" 
      ? parseFloat(formData.incrementAmount) 
      : parseFloat(formData.incrementPercentage);
    
    if (isNaN(incrementValue) || incrementValue <= 0) {
      toast.error("Please enter a valid increment/decrement value");
      return;
    }

    const salary = parseFloat(formData.salary);
    if (isNaN(salary) || salary <= 0) {
      toast.error("Please enter a valid salary");
      return;
    }

    const monthsOfIncrement = parseInt(formData.monthsOfIncrement);
    if (isNaN(monthsOfIncrement) || monthsOfIncrement <= 0) {
      toast.error("Please enter a valid number of months");
      return;
    }

    if (selectedEmployeeIds.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }

    const selectedGrade = employeeGrades.find((g) => g.id === formData.employeeGradeId);
    const selectedDesignation = designations.find((d) => d.id === formData.designationId);
    
    if (!selectedGrade || !selectedDesignation) {
      toast.error("Invalid grade or designation selected");
      return;
    }

    // Create increment items for all selected employees
    const newIncrements: EmployeeIncrementItem[] = selectedEmployeeIds.map((empId) => {
      const employee = employees.find((e) => e.id === empId);
      const employeeDetail = selectedEmployeeDetails[empId];
      
      // Get previous designation
      const getPreviousDesignation = () => {
        if (!employeeDetail) return "";
        const designation = (employeeDetail as any).designationRelation || (employeeDetail as any).designation;
        return (designation && typeof designation === 'object' && designation.name) ? designation.name : "";
      };
      
      return {
        id: `${empId}-${Date.now()}`,
        employeeId: empId,
        employeeName: employee?.employeeName || "",
        employeeCode: employee?.employeeId || "",
        previousDesignation: getPreviousDesignation(),
        previousSalary: employeeDetail?.employeeSalary || 0,
        employeeGradeId: formData.employeeGradeId,
        designationId: formData.designationId,
        incrementType: formData.incrementType,
        incrementAmount: formData.incrementMethod === "Amount" ? incrementValue : undefined,
        incrementPercentage: formData.incrementMethod === "Percent" ? incrementValue : undefined,
        incrementMethod: formData.incrementMethod,
        salary: salary,
        promotionDate: formData.promotionDate,
        currentMonth: formData.currentMonth,
        monthsOfIncrement: monthsOfIncrement,
        notes: formData.remarks || "",
      };
    });

    setEmployeeIncrements([...employeeIncrements, ...newIncrements]);
    toast.success(`Added increments for ${selectedEmployeeIds.length} employee(s)`);
  };

  const handleUpdateIncrement = (id: string, field: keyof EmployeeIncrementItem, value: any) => {
    setEmployeeIncrements(
      employeeIncrements.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleRemoveIncrement = (id: string) => {
    setEmployeeIncrements(employeeIncrements.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (employeeIncrements.length === 0) {
      toast.error("Please search and add at least one employee increment");
      return;
    }

    startTransition(async () => {
      try {
        const result = await bulkCreateIncrements({
          increments: employeeIncrements.map((item) => ({
            employeeId: item.employeeId,
            employeeGradeId: item.employeeGradeId,
            designationId: item.designationId,
            incrementType: item.incrementType,
            incrementAmount: item.incrementAmount,
            incrementPercentage: item.incrementPercentage,
            incrementMethod: item.incrementMethod,
            salary: item.salary,
            promotionDate: item.promotionDate,
            currentMonth: item.currentMonth,
            monthsOfIncrement: item.monthsOfIncrement,
            notes: item.notes || undefined,
          })),
        });

        if (result.status) {
          toast.success(result.message || "Increments created successfully");
          router.push("/dashboard/payroll-setup/increment/view");
        } else {
          toast.error(result.message || "Failed to create increments");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to create increments");
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="mb-6">
        <Link href="/dashboard/payroll-setup/increment/view">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 shadow-lg bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold">Create Employee Promotion Form</CardTitle>
            <CardDescription className="text-base">
              Fill in the details to create an increment/promotion record
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* First Row - 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department">
                  Department <span className="text-destructive">*</span>
                </Label>
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
                <Label htmlFor="subDepartment">
                  Sub Department <span className="text-destructive">*</span>
                </Label>
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

            {/* Previous Designation & Salary Table */}
            {selectedEmployeeIds.length > 0 && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Previous Designation & Salary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Designation</TableHead>
                          <TableHead>Salary</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEmployeeIds.map((empId) => {
                          const employee = employees.find((e) => e.id === empId);
                          const employeeDetail = selectedEmployeeDetails[empId];
                          const isLoading = loadingEmployeeDetails[empId];
                          
                          // Helper function to get designation name
                          const getDesignationName = () => {
                            if (!employeeDetail) return isLoading ? "Loading..." : "N/A";
                            const designation = (employeeDetail as any).designationRelation || (employeeDetail as any).designation;
                            return (designation && typeof designation === 'object' && designation.name) ? designation.name : "N/A";
                          };
                          
                          // Get salary
                          const getSalary = () => {
                            if (!employeeDetail) return isLoading ? "Loading..." : "N/A";
                            return employeeDetail.employeeSalary ? `PKR ${Number(employeeDetail.employeeSalary).toLocaleString()}` : "N/A";
                          };
                          
                          // Get joining date
                          const getDate = () => {
                            if (!employeeDetail) return isLoading ? "Loading..." : "N/A";
                            return employeeDetail.joiningDate ? new Date(employeeDetail.joiningDate).toLocaleDateString() : "N/A";
                          };
                          
                          return (
                            <TableRow key={empId}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{employee?.employeeName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {employee?.employeeId}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{getDesignationName()}</TableCell>
                              <TableCell>{getSalary()}</TableCell>
                              <TableCell>{getDate()}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

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

            {/* Third Row - Employee Grades and Designation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employee Grades */}
              <div className="space-y-2">
                <Label htmlFor="employeeGradeId">
                  Employee Grades <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.employeeGradeId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, employeeGradeId: value }))
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="employeeGradeId">
                    <SelectValue placeholder="Select Employee Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeGrades.length > 0 ? (
                      employeeGrades.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.grade}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-grades" disabled>
                        No employee grades available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Designation */}
              <div className="space-y-2">
                <Label htmlFor="designationId">
                  Designation <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.designationId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, designationId: value }))
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="designationId">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.length > 0 ? (
                      designations.map((designation) => (
                        <SelectItem key={designation.id} value={designation.id}>
                          {designation.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-designations" disabled>
                        No designations available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fourth Row - Increment/Decrement Type and Method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Increment/Decrement Type */}
              <div className="space-y-2">
                <Label htmlFor="incrementType">
                  Increment/Decrement Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.incrementType}
                  onValueChange={(value: "Increment" | "Decrement") =>
                    setFormData((prev) => ({ ...prev, incrementType: value }))
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="incrementType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Increment">Increment</SelectItem>
                    <SelectItem value="Decrement">Decrement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Increment/Decrement Method */}
              <div className="space-y-2">
                <Label>
                  Increment/Decrement <span className="text-destructive">*</span>
                </Label>
                <RadioGroup
                  value={formData.incrementMethod}
                  onValueChange={(value: "Amount" | "Percent") =>
                    setFormData((prev) => ({ ...prev, incrementMethod: value }))
                  }
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Amount" id="amount" />
                    <Label htmlFor="amount">Amount</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Percent" id="percent" />
                    <Label htmlFor="percent">Percent</Label>
                  </div>
                </RadioGroup>
                {formData.incrementMethod === "Amount" ? (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.incrementAmount}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, incrementAmount: e.target.value }))
                    }
                    placeholder="Enter amount"
                    disabled={isPending}
                    className="mt-2"
                  />
                ) : (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.incrementPercentage}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, incrementPercentage: e.target.value }))
                    }
                    placeholder="Enter percentage"
                    disabled={isPending}
                    className="mt-2"
                  />
                )}
              </div>
            </div>

            {/* Fifth Row - Salary, Promotion Date, Current Month, Months of Increment */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Salary */}
              <div className="space-y-2">
                <Label htmlFor="salary">
                  Salary <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="salary"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salary}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, salary: e.target.value }))
                  }
                  placeholder="0.00"
                  disabled={isPending}
                  required
                />
              </div>

              {/* Promotion / Increment Date */}
              <div className="space-y-2">
                <Label htmlFor="promotionDate">
                  Promotion / Increment Date <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  value={formData.promotionDate}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, promotionDate: value || "" }))
                  }
                  disabled={isPending}
                  placeholder="mm/dd/yyyy"
                />
              </div>

              {/* Select Current Month */}
              <div className="space-y-2">
                <Label htmlFor="currentMonth">
                  Select Current Month <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  value={formData.currentMonth}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, currentMonth: value || "" }))
                  }
                  disabled={isPending}
                  placeholder="mm/dd/yyyy"
                />
              </div>

              {/* Months of Increment */}
              <div className="space-y-2">
                <Label htmlFor="monthsOfIncrement">
                  Months of Increment <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="monthsOfIncrement"
                  type="number"
                  min="1"
                  value={formData.monthsOfIncrement}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, monthsOfIncrement: e.target.value }))
                  }
                  placeholder="Enter months"
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            {/* Search Button */}
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSearch}
                disabled={isPending}
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {/* Employee Increments Table */}
            {employeeIncrements.length > 0 && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Employee Increments</CardTitle>
                  <CardDescription>
                    Review and edit increments before submitting ({employeeIncrements.length} employee(s))
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Designation</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Increment</TableHead>
                          <TableHead>Salary</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeeIncrements.map((item) => (
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
                                value={item.employeeGradeId}
                                onValueChange={(value) => {
                                  handleUpdateIncrement(item.id, "employeeGradeId", value);
                                }}
                                disabled={isPending}
                              >
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {employeeGrades.map((grade) => (
                                    <SelectItem key={grade.id} value={grade.id}>
                                      {grade.grade}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.designationId}
                                onValueChange={(value) => {
                                  handleUpdateIncrement(item.id, "designationId", value);
                                }}
                                disabled={isPending}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {designations.map((designation) => (
                                    <SelectItem key={designation.id} value={designation.id}>
                                      {designation.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.incrementType}
                                onValueChange={(value: "Increment" | "Decrement") => {
                                  handleUpdateIncrement(item.id, "incrementType", value);
                                }}
                                disabled={isPending}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Increment">Increment</SelectItem>
                                  <SelectItem value="Decrement">Decrement</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {item.incrementMethod === "Amount" ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.incrementAmount || 0}
                                  onChange={(e) =>
                                    handleUpdateIncrement(
                                      item.id,
                                      "incrementAmount",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  disabled={isPending}
                                  className="w-[120px]"
                                />
                              ) : (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={item.incrementPercentage || 0}
                                  onChange={(e) =>
                                    handleUpdateIncrement(
                                      item.id,
                                      "incrementPercentage",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  disabled={isPending}
                                  className="w-[120px]"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.salary}
                                onChange={(e) =>
                                  handleUpdateIncrement(
                                    item.id,
                                    "salary",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={isPending}
                                className="w-[120px]"
                              />
                            </TableCell>
                            <TableCell>
                              <DatePicker
                                value={item.promotionDate}
                                onChange={(value) =>
                                  handleUpdateIncrement(item.id, "promotionDate", value || "")
                                }
                                disabled={isPending}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveIncrement(item.id)}
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
              <Button type="submit" disabled={isPending || employeeIncrements.length === 0} size="lg">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Submit ({employeeIncrements.length})
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

