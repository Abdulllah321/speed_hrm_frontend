"use client";

import { useState, useEffect } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { getEmployeesForDropdown, type EmployeeDropdownOption } from "@/lib/actions/employee";
import { getDepartments, getSubDepartmentsByDepartment, type Department, type SubDepartment } from "@/lib/actions/department";
import { DatePicker } from "@/components/ui/date-picker";

export default function CreateAdvanceSalaryPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeDropdownOption[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);

  const [formData, setFormData] = useState({
    department: "all",
    subDepartment: "all",
    employeeId: "",
    employeeName: "",
    amount: "",
    neededOn: "",
    deductionMonthYear: "",
    reason: "",
  });

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDropdownOption | null>(null);

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const result = await getDepartments();
        if (result.status && result.data) {
          setDepartments(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch departments:", error);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const result = await getEmployeesForDropdown();
        if (result.status && result.data) {
          setEmployees(result.data);
        } else {
          toast.error(result.message || "Failed to load employees");
          setEmployees([]);
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to load employees");
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Fetch sub-departments when department changes
  useEffect(() => {
    const fetchSubDepartments = async () => {
      if (formData.department && formData.department !== "all") {
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
        }
      } else {
        setSubDepartments([]);
        setFormData((prev) => ({ ...prev, subDepartment: "all" }));
      }
    };

    fetchSubDepartments();
  }, [formData.department]);

  // Filter employees based on department and sub-department
  useEffect(() => {
    let filtered = [...employees];

    if (formData.department && formData.department !== "all") {
      filtered = filtered.filter((emp) => emp.departmentId === formData.department);
    }

    if (formData.subDepartment && formData.subDepartment !== "all") {
      filtered = filtered.filter((emp) => emp.subDepartmentId === formData.subDepartment);
    }

    // If employee is selected but doesn't match filter, clear it
    if (selectedEmployee && !filtered.find((e) => e.id === selectedEmployee.id)) {
      setFormData((prev) => ({ ...prev, employeeId: "", employeeName: "" }));
      setSelectedEmployee(null);
    }
  }, [formData.department, formData.subDepartment, employees, selectedEmployee]);

  const handleDepartmentChange = (departmentId: string) => {
    setFormData((prev) => ({
      ...prev,
      department: departmentId,
      subDepartment: "all",
      employeeId: "",
      employeeName: "",
    }));
    setSelectedEmployee(null);
  };

  const handleSubDepartmentChange = (subDepartmentId: string) => {
    setFormData((prev) => ({
      ...prev,
      subDepartment: subDepartmentId,
      employeeId: "",
      employeeName: "",
    }));
    setSelectedEmployee(null);
  };

  const handleEmployeeChange = async (employeeId: string) => {
    const selected = employees.find((e) => e.id === employeeId);
    if (selected) {
      setSelectedEmployee(selected);
      
      // Auto-select department from employee
      const empDepartmentId = selected.departmentId || "all";
      
      // Fetch sub-departments for the selected employee's department
      if (selected.departmentId) {
        try {
          const result = await getSubDepartmentsByDepartment(selected.departmentId);
          if (result.status && result.data) {
            setSubDepartments(result.data);
          }
        } catch (error) {
          console.error("Failed to fetch sub-departments:", error);
        }
      }
      
      // Auto-populate department and sub-department from employee
      setFormData((prev) => ({
        ...prev,
        employeeId: selected.id,
        employeeName: selected.employeeName,
        department: empDepartmentId,
        subDepartment: selected.subDepartmentId || "all",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.amount || !formData.neededOn || !formData.deductionMonthYear || !formData.reason) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsPending(true);
    try {
      // TODO: Replace with actual API call
      // const result = await createAdvanceSalary(formData);
      toast.success("Advance salary request created successfully");
      
      // Redirect to view page
      router.push("/dashboard/payroll-setup/advance-Salary/view");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to create advance salary request");
    } finally {
      setIsPending(false);
    }
  };

  const handleClear = () => {
    setFormData({
      department: "all",
      subDepartment: "all",
      employeeId: "",
      employeeName: "",
      amount: "",
      neededOn: "",
      deductionMonthYear: "",
      reason: "",
    });
    setSelectedEmployee(null);
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="mb-6">
        <Link href="/dashboard/payroll-setup/advance-Salary/view">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Create Advance Salary Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Advance Salary Form</CardTitle>
            <CardDescription>
              Fill in the details to create an advance salary request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* First Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={formData.department}
                  onValueChange={handleDepartmentChange}
                  disabled={isPending}
                >
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>Sub Department</Label>
                <Select
                  value={formData.subDepartment}
                  onValueChange={handleSubDepartmentChange}
                  disabled={isPending || formData.department === "all" || !formData.department || subDepartments.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No Record Found" />
                  </SelectTrigger>
                  <SelectContent>
                    {subDepartments.length === 0 ? (
                      <SelectItem value="no-subdept" disabled>
                        No Record Found
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

              <div className="space-y-2">
                <Label>
                  Employee <span className="text-red-500">*</span>
                </Label>
                {loading ? (
                  <div className="h-10 bg-muted rounded animate-pulse" />
                ) : (
                  <Select
                    value={formData.employeeId}
                    onValueChange={handleEmployeeChange}
                    disabled={isPending || loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None selected" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.length === 0 ? (
                        <SelectItem value="no-employees" disabled>
                          No employees found
                        </SelectItem>
                      ) : (
                        employees
                          .filter((emp) => {
                            if (formData.department && formData.department !== "all") {
                              if (emp.departmentId !== formData.department) return false;
                            }
                            if (formData.subDepartment && formData.subDepartment !== "all") {
                              if (emp.subDepartmentId !== formData.subDepartment) return false;
                            }
                            return true;
                          })
                          .map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.employeeId} -- {e.employeeName}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  Amount: <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  placeholder="Enter amount"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Advance Salary to be Needed On <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  value={formData.neededOn}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, neededOn: value }))
                  }
                  disabled={isPending}
                  placeholder="mm/dd/yyyy"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Deduction Month & Year <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="month"
                  value={formData.deductionMonthYear}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, deductionMonthYear: e.target.value }))
                  }
                  disabled={isPending}
                  className="w-full"
                  placeholder="----------"
                />
              </div>
            </div>

            {/* Third Row */}
            <div className="space-y-2">
              <Label>
                Reason (Detail) <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formData.reason}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Enter reason details"
                rows={4}
                disabled={isPending}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit and Clear Buttons */}
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isPending}
          >
            Clear Form
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit
          </Button>
        </div>
      </form>
    </div>
  );
}

