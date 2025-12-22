"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Gift, Users, Building2, DollarSign, Calendar, Percent } from "lucide-react";
import Link from "next/link";
import { getEmployeesForDropdown, getEmployeeById, type EmployeeDropdownOption, type Employee } from "@/lib/actions/employee";
import { getDepartments, getSubDepartmentsByDepartment, type Department, type SubDepartment } from "@/lib/actions/department";
import { getBonusTypes, type BonusType } from "@/lib/actions/bonus-type";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { Autocomplete } from "@/components/ui/autocomplete";
import { MultiSelect } from "@/components/ui/multi-select";

// Zod validation schema
const bonusIssueFormSchema = z.object({
  departmentId: z.string().optional(),
  subDepartmentId: z.string().optional(),
  employeeIds: z
    .array(z.string())
    .min(1, "At least one employee must be selected"),
  bonusTypeId: z.string().min(1, "Bonus type is required"),
  amount: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true; // Optional, validated in onSubmit
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      {
        message: "Amount must be a positive number",
      }
    ),
  percentage: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true; // Optional, validated in onSubmit
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 100;
      },
      {
        message: "Percentage must be between 0 and 100",
      }
    ),
  bonusMonthYear: z
    .string()
    .min(1, "Bonus month and year is required")
    .regex(/^\d{4}-\d{2}$/, "Invalid month-year format (YYYY-MM)"),
  notes: z
    .string()
    .max(1000, "Notes must not exceed 1000 characters")
    .optional(),
});

type BonusIssueFormData = z.infer<typeof bonusIssueFormSchema>;

export default function IssueBonusPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);
  const [loadingBonusTypes, setLoadingBonusTypes] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState<{ [key: string]: boolean }>({});
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<EmployeeDropdownOption[]>([]);
  const [employeeDetails, setEmployeeDetails] = useState<{ [key: string]: Employee }>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [bonusTypes, setBonusTypes] = useState<BonusType[]>([]);
  const [selectedBonusType, setSelectedBonusType] = useState<BonusType | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  const form = useForm<BonusIssueFormData>({
    resolver: zodResolver(bonusIssueFormSchema),
    defaultValues: {
      departmentId: undefined,
      subDepartmentId: undefined,
      employeeIds: [],
      bonusTypeId: "",
      amount: "",
      percentage: "",
      bonusMonthYear: "",
      notes: "",
    },
    mode: "onBlur",
  });

  const selectedDepartmentId = form.watch("departmentId");
  const selectedSubDepartmentId = form.watch("subDepartmentId");
  const selectedBonusTypeId = form.watch("bonusTypeId");
  const selectedEmployeeIdsForm = form.watch("employeeIds");

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

  // Fetch bonus types on mount
  useEffect(() => {
    const fetchBonusTypes = async () => {
      setLoadingBonusTypes(true);
      try {
        const result = await getBonusTypes();
        if (result.status && result.data) {
          setBonusTypes(result.data.filter(bt => bt.status === 'active'));
        } else {
          toast.error(result.message || "Failed to load bonus types");
          setBonusTypes([]);
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to load bonus types");
        setBonusTypes([]);
      } finally {
        setLoadingBonusTypes(false);
      }
    };
    fetchBonusTypes();
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

  // Fetch employee details when employees are selected
  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      const newEmployeeIds = selectedEmployeeIdsForm.filter(id => !employeeDetails[id]);
      if (newEmployeeIds.length === 0) return;

      for (const empId of newEmployeeIds) {
        setLoadingEmployees(prev => ({ ...prev, [empId]: true }));
        try {
          const result = await getEmployeeById(empId);
          if (result.status && result.data) {
            setEmployeeDetails(prev => ({ ...prev, [empId]: result.data as Employee }));
          }
        } catch (error) {
          console.error(`Failed to fetch employee ${empId}:`, error);
        } finally {
          setLoadingEmployees(prev => ({ ...prev, [empId]: false }));
        }
      }
    };

    fetchEmployeeDetails();
  }, [selectedEmployeeIdsForm, employeeDetails]);

  // Update selected bonus type when bonusTypeId changes
  useEffect(() => {
    if (selectedBonusTypeId) {
      const bonusType = bonusTypes.find(bt => bt.id === selectedBonusTypeId);
      setSelectedBonusType(bonusType || null);
      if (bonusType?.calculationType === "Amount") {
        form.setValue("percentage", "");
        if (bonusType.amount) {
          form.setValue("amount", bonusType.amount.toString());
        }
      } else if (bonusType?.calculationType === "Percentage") {
        form.setValue("amount", "");
        if (bonusType.percentage) {
          form.setValue("percentage", bonusType.percentage.toString());
        }
      }
    } else {
      setSelectedBonusType(null);
    }
  }, [selectedBonusTypeId, bonusTypes, form]);

  // Calculate bonus amounts when employees or bonus type changes
  useEffect(() => {
    if (selectedBonusType && selectedEmployeeIdsForm.length > 0) {
      if (selectedBonusType.calculationType === "Percentage") {
        const percentage = parseFloat(form.getValues("percentage") || "0");
        if (percentage > 0) {
          // Calculate amount for each employee based on their salary
          const calculatedAmounts = selectedEmployeeIdsForm.map(empId => {
            const emp = employeeDetails[empId];
            if (emp?.employeeSalary) {
              return (Number(emp.employeeSalary) * percentage) / 100;
            }
            return 0;
          });
          // Show average or total in a summary (we'll handle per-employee in the backend)
        }
      }
    }
  }, [selectedBonusType, selectedEmployeeIdsForm, employeeDetails, form]);

  // Fetch sub-departments when department changes
  useEffect(() => {
    const fetchSubDepartments = async () => {
      if (selectedDepartmentId) {
        setLoadingSubDepartments(true);
        try {
          const result = await getSubDepartmentsByDepartment(selectedDepartmentId);
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
        form.setValue("subDepartmentId", undefined);
      }
    };

    fetchSubDepartments();
  }, [selectedDepartmentId, form]);

  // Filter employees based on department and sub-department
  const filteredEmployees = useMemo(() => {
    let filtered = [...employees];

    if (selectedDepartmentId) {
      filtered = filtered.filter((emp) => emp.departmentId === selectedDepartmentId);
    }

    if (selectedSubDepartmentId) {
      filtered = filtered.filter((emp) => emp.subDepartmentId === selectedSubDepartmentId);
    }

    return filtered;
  }, [employees, selectedDepartmentId, selectedSubDepartmentId]);

  // Employee options for MultiSelect
  const employeeOptions = useMemo(() => {
    return filteredEmployees.map((emp) => ({
      value: emp.id,
      label: `${emp.employeeName} (${emp.employeeId})`,
      description: emp.departmentName || undefined,
    }));
  }, [filteredEmployees]);

  // Bonus type options for Autocomplete
  const bonusTypeOptions = useMemo(() => {
    return bonusTypes.map((bt) => ({
      value: bt.id,
      label: `${bt.name} (${bt.calculationType === "Amount" ? `Fixed: ${bt.amount || "N/A"}` : `Percentage: ${bt.percentage || "N/A"}%`})`,
    }));
  }, [bonusTypes]);

  // Calculate total bonus amount for preview
  const totalBonusAmount = useMemo(() => {
    if (!selectedBonusType || selectedEmployeeIdsForm.length === 0) return 0;

    if (selectedBonusType.calculationType === "Amount") {
      const amount = parseFloat(form.getValues("amount") || "0");
      return amount * selectedEmployeeIdsForm.length;
    } else {
      const percentage = parseFloat(form.getValues("percentage") || "0");
      if (percentage <= 0) return 0;
      
      return selectedEmployeeIdsForm.reduce((total, empId) => {
        const emp = employeeDetails[empId];
        if (emp?.employeeSalary) {
          return total + (Number(emp.employeeSalary) * percentage) / 100;
        }
        return total;
      }, 0);
    }
  }, [selectedBonusType, selectedEmployeeIdsForm, employeeDetails, form]);

  const onSubmit = async (data: BonusIssueFormData) => {
    try {
      setSubmitting(true);
      
      // Validate based on bonus type
      if (selectedBonusType) {
        if (selectedBonusType.calculationType === "Amount" && !data.amount) {
          toast.error("Amount is required for this bonus type");
          return;
        }
        if (selectedBonusType.calculationType === "Percentage" && !data.percentage) {
          toast.error("Percentage is required for this bonus type");
          return;
        }
      }

      // TODO: Implement issueBonus action
      // For now, just show success message
      toast.success(`Bonus issued successfully for ${data.employeeIds.length} employee(s). Total amount: PKR ${totalBonusAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`);
      
      // router.push("/dashboard/payroll-setup/bonus/view");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to issue bonus");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="mb-6">
        <Link href="/dashboard/payroll-setup/bonus/view">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Issue Bonus
              </CardTitle>
              <CardDescription>
                Issue bonus to one or more employees based on the selected bonus type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Department and Sub Department Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Department
                      </FormLabel>
                      <FormControl>
                        <Autocomplete
                          options={[
                            { value: "", label: "All Departments" },
                            ...departments.map((dept) => ({
                              value: dept.id,
                              label: dept.name,
                            })),
                          ]}
                          value={field.value ?? ""}
                          onValueChange={(value) => {
                            const newValue = value === "" ? undefined : value;
                            field.onChange(newValue);
                            form.setValue("subDepartmentId", undefined);
                            form.setValue("employeeIds", []);
                          }}
                          placeholder="Select Department (Optional)"
                          searchPlaceholder="Search department..."
                          emptyMessage="No departments found"
                          disabled={form.formState.isSubmitting || submitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subDepartmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Sub Department
                      </FormLabel>
                      <FormControl>
                        {loadingSubDepartments ? (
                          <div className="h-10 bg-muted rounded-md animate-pulse" />
                        ) : (
                          <Autocomplete
                            options={[
                              { value: "", label: "All Sub Departments" },
                              ...subDepartments.map((subDept) => ({
                                value: subDept.id,
                                label: subDept.name,
                              })),
                            ]}
                            value={field.value ?? ""}
                            onValueChange={(value) => {
                              const newValue = value === "" ? undefined : value;
                              field.onChange(newValue);
                              form.setValue("employeeIds", []);
                            }}
                            placeholder={
                              !selectedDepartmentId
                                ? "Select department first"
                                : "Select Sub Department (Optional)"
                            }
                            searchPlaceholder="Search sub department..."
                            emptyMessage="No sub departments found"
                            disabled={
                              form.formState.isSubmitting ||
                              submitting ||
                              !selectedDepartmentId ||
                              subDepartments.length === 0
                            }
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Employees Multi-Select */}
              <FormField
                control={form.control}
                name="employeeIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Employees <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      {loading ? (
                        <div className="h-10 bg-muted rounded-md animate-pulse" />
                      ) : (
                        <MultiSelect
                          options={employeeOptions}
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedEmployeeIds(value);
                          }}
                          placeholder="Select one or more employees"
                          searchPlaceholder="Search employees..."
                          emptyMessage="No employees found"
                          disabled={form.formState.isSubmitting || submitting || loading}
                          maxDisplayedItems={3}
                          showSelectAll={true}
                          icon={<Users className="h-3 w-3" />}
                        />
                      )}
                    </FormControl>
                    <FormDescription>
                      {field.value.length > 0 && `${field.value.length} employee(s) selected`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bonus Type */}
              <FormField
                control={form.control}
                name="bonusTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Bonus Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      {loadingBonusTypes ? (
                        <div className="h-10 bg-muted rounded-md animate-pulse" />
                      ) : (
                        <Autocomplete
                          options={bonusTypeOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select bonus type"
                          searchPlaceholder="Search bonus type..."
                          emptyMessage="No bonus types found"
                          disabled={form.formState.isSubmitting || submitting || loadingBonusTypes}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount or Percentage based on bonus type */}
              {selectedBonusType?.calculationType === "Amount" ? (
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Bonus Amount <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={selectedBonusType.amount ? selectedBonusType.amount.toString() : "0.00"}
                          disabled={form.formState.isSubmitting || submitting || !!selectedBonusType.amount}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {selectedBonusType.amount
                          ? `Fixed amount: ${selectedBonusType.amount} (pre-filled from bonus type)`
                          : "Enter the bonus amount per employee"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : selectedBonusType?.calculationType === "Percentage" ? (
                <FormField
                  control={form.control}
                  name="percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Bonus Percentage <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder={selectedBonusType.percentage ? selectedBonusType.percentage.toString() : "0.00"}
                          disabled={form.formState.isSubmitting || submitting || !!selectedBonusType.percentage}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {selectedBonusType.percentage
                          ? `Fixed percentage: ${selectedBonusType.percentage}% (pre-filled from bonus type). Amount will be calculated based on each employee's salary.`
                          : "Enter the bonus percentage (0-100%). Amount will be calculated based on each employee's salary."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              {/* Bonus Month-Year */}
              <FormField
                control={form.control}
                name="bonusMonthYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Bonus Month & Year <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <MonthYearPicker
                        value={field.value}
                        onChange={field.onChange}
                        disabled={form.formState.isSubmitting || submitting}
                        placeholder="Select month and year"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Total Bonus Preview */}
              {selectedBonusType && selectedEmployeeIdsForm.length > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Bonus Amount</p>
                      <p className="text-2xl font-bold text-primary">
                        PKR {totalBonusAmount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        For {selectedEmployeeIdsForm.length} employee(s)
                        {selectedBonusType.calculationType === "Percentage" && form.getValues("percentage") && (
                          <span> at {form.getValues("percentage")}% of salary</span>
                        )}
                      </p>
                    </div>
                    <Gift className="h-8 w-8 text-primary/50" />
                  </div>
                </div>
              )}

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any additional notes or comments (optional)..."
                        rows={3}
                        disabled={form.formState.isSubmitting || submitting}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional notes or comments about this bonus issue (max 1000 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit and Clear Buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={form.formState.isSubmitting || submitting}
            >
              Clear Form
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || submitting}
            >
              {(form.formState.isSubmitting || submitting) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Issue Bonus
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
