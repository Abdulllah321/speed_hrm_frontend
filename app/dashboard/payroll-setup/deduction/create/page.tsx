"use client";

import { useState, useEffect } from "react";
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
import { ArrowLeft, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { getEmployeesForDropdown, type EmployeeDropdownOption } from "@/lib/actions/employee";
import { getDepartments, getSubDepartmentsByDepartment, type Department, type SubDepartment } from "@/lib/actions/department";
import { format } from "date-fns";

interface DeductionDetail {
  id: string;
  monthYear: string;
  employeeName: string;
  deductionType: string;
  remarks: string;
  deductionAmount: string;
}

export default function CreateDeductionPage() {
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeDropdownOption[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [deductionDetails, setDeductionDetails] = useState<DeductionDetail[]>([]);

  const [formData, setFormData] = useState({
    department: "all",
    subDepartment: "all",
    employeeId: "",
    employeeName: "",
    deductionType: "",
    remarks: "",
    amount: "",
    monthYear: "",
    isTaxable: "Yes",
    taxPercentage: "100",
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.deductionType || !formData.amount || !formData.monthYear) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsPending(true);
    try {
      // Simulate search - in real implementation, this would call an API
      // Format month-year for display
      const monthYearDisplay = formData.monthYear 
        ? format(new Date(formData.monthYear + "-01"), "MMMM yyyy")
        : "";
      
      const newDetail: DeductionDetail = {
        id: Date.now().toString(),
        monthYear: monthYearDisplay,
        employeeName: formData.employeeName,
        deductionType: formData.deductionType,
        remarks: formData.remarks,
        deductionAmount: formData.amount,
      };

      setDeductionDetails([newDetail]);
      toast.success("Deduction details found");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to search deduction details");
    } finally {
      setIsPending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (deductionDetails.length === 0) {
      toast.error("Please search for deduction details first");
      return;
    }

    if (!formData.employeeId || !formData.deductionType || !formData.amount || !formData.monthYear) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsPending(true);
    try {
      // TODO: Replace with actual API call
      // const result = await createDeduction(deductionDetails);
      toast.success("Deduction created successfully");
      
      // Reset form
      setFormData({
        department: "all",
        subDepartment: "all",
        employeeId: "",
        employeeName: "",
        deductionType: "",
        remarks: "",
        amount: "",
        monthYear: "",
        isTaxable: "Yes",
        taxPercentage: "100",
      });
      setDeductionDetails([]);
      setSelectedEmployee(null);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to create deduction");
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
      deductionType: "",
      remarks: "",
      amount: "",
      monthYear: "",
      isTaxable: "Yes",
      taxPercentage: "100",
    });
    setDeductionDetails([]);
    setSelectedEmployee(null);
  };

  const handleMonthYearChange = (value: string) => {
    setFormData((prev) => ({ ...prev, monthYear: value }));
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

      <form onSubmit={handleSearch} className="space-y-6">
        {/* Create Deduction Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Deduction Form</CardTitle>
            <CardDescription>
              Fill in the details to create a deduction record
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
                    <SelectValue placeholder="Select Sub Department" />
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Remarks:</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, remarks: e.target.value }))
                  }
                  placeholder="Enter remarks"
                  rows={3}
                  disabled={isPending}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Select Deduction Type: <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.deductionType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, deductionType: value }))
                  }
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Deduction Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Loan">Loan</SelectItem>
                    <SelectItem value="Advance">Advance</SelectItem>
                    <SelectItem value="Tax">Tax</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Deduction Amount: <span className="text-red-500">*</span>
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
            </div>

            {/* Third Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>
                  Month-Year <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="month"
                  value={formData.monthYear}
                  onChange={(e) => handleMonthYearChange(e.target.value)}
                  disabled={isPending}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Is Taxable: <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.isTaxable}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, isTaxable: value }))
                  }
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tax Percentage:</Label>
                <Input
                  type="number"
                  value={formData.taxPercentage}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, taxPercentage: e.target.value }))
                  }
                  placeholder="Enter tax percentage"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2 flex items-end">
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deduction Details Table */}
        {deductionDetails.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Deduction Details</CardTitle>
              <CardDescription>
                Review and manage deduction details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Month-Year</th>
                      <th className="text-left p-3 font-semibold">Employee Name</th>
                      <th className="text-left p-3 font-semibold">Deduction Type</th>
                      <th className="text-left p-3 font-semibold">Remarks</th>
                      <th className="text-left p-3 font-semibold">Deduction Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deductionDetails.map((detail) => (
                      <tr key={detail.id} className="border-b">
                        <td className="p-3">
                          <Input
                            value={detail.monthYear}
                            onChange={(e) => {
                              setDeductionDetails((prev) =>
                                prev.map((d) =>
                                  d.id === detail.id
                                    ? { ...d, monthYear: e.target.value }
                                    : d
                                )
                              );
                            }}
                            className="w-full"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={detail.employeeName}
                            onChange={(e) => {
                              setDeductionDetails((prev) =>
                                prev.map((d) =>
                                  d.id === detail.id
                                    ? { ...d, employeeName: e.target.value }
                                    : d
                                )
                              );
                            }}
                            className="w-full"
                          />
                        </td>
                        <td className="p-3">
                          <Select
                            value={detail.deductionType}
                            onValueChange={(value) => {
                              setDeductionDetails((prev) =>
                                prev.map((d) =>
                                  d.id === detail.id
                                    ? { ...d, deductionType: value }
                                    : d
                                )
                              );
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Loan">Loan</SelectItem>
                              <SelectItem value="Advance">Advance</SelectItem>
                              <SelectItem value="Tax">Tax</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Input
                            value={detail.remarks}
                            onChange={(e) => {
                              setDeductionDetails((prev) =>
                                prev.map((d) =>
                                  d.id === detail.id
                                    ? { ...d, remarks: e.target.value }
                                    : d
                                )
                              );
                            }}
                            className="w-full"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            value={detail.deductionAmount}
                            onChange={(e) => {
                              setDeductionDetails((prev) =>
                                prev.map((d) =>
                                  d.id === detail.id
                                    ? { ...d, deductionAmount: e.target.value }
                                    : d
                                )
                              );
                            }}
                            className="w-full"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit and Clear Buttons */}
        {deductionDetails.length > 0 && (
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
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

