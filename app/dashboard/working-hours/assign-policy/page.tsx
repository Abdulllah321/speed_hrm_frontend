"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import { CalendarProvider } from "@/components/ui/calendar/contexts/calendar-context";
import { PolicyAssignmentCalendar } from "@/components/ui/calendar/components/policy-assignment-calendar";
import { PolicyCalendarHeader } from "@/components/ui/calendar/components/policy-calendar-header";
import { getEmployees, type Employee } from "@/lib/actions/employee";
import { getWorkingHoursPolicies, type WorkingHoursPolicy } from "@/lib/actions/working-hours-policy";
import { getDepartments, type Department, type SubDepartment } from "@/lib/actions/department";
import { parseISO, format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from "date-fns";
import type { IEvent, IUser } from "@/components/ui/calendar/interfaces";
import type { TEventColor } from "@/components/ui/calendar/types";

// Policy Assignment Interface
interface PolicyAssignment {
  id: string;
  employeeId: string;
  policyId: string;
  policyName: string;
  startDate: string;
  endDate: string;
  color: TEventColor;
}

// Mock data structure - Replace with API calls later
const POLICY_COLORS: TEventColor[] = ["blue", "green", "red", "yellow", "purple", "orange", "gray"];

export default function AssignWorkingHoursPage() {
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [policies, setPolicies] = useState<WorkingHoursPolicy[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedSubDepartmentId, setSelectedSubDepartmentId] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [assignments, setAssignments] = useState<PolicyAssignment[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Fetch departments and policies on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [departmentsRes, policiesRes] = await Promise.all([
          getDepartments(),
          getWorkingHoursPolicies(),
        ]);

        if (departmentsRes.status && departmentsRes.data) {
          setDepartments(departmentsRes.data);
        }
        if (policiesRes.status && policiesRes.data) {
          setPolicies(policiesRes.data);
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Extract sub-departments from selected department
  useEffect(() => {
    if (!selectedDepartmentId) {
      setSubDepartments([]);
      setSelectedSubDepartmentId("");
      setEmployees([]);
      setSelectedEmployeeId("");
      return;
    }

    // Get sub-departments from the selected department
    const selectedDepartment = departments.find((dept) => dept.id === selectedDepartmentId);
    if (selectedDepartment && selectedDepartment.subDepartments) {
      setSubDepartments(selectedDepartment.subDepartments);
    } else {
      setSubDepartments([]);
    }
    
    // Reset sub-department and employee selection
    setSelectedSubDepartmentId("");
    setEmployees([]);
    setSelectedEmployeeId("");
  }, [selectedDepartmentId, departments]);

  // Fetch employees when sub-department is selected
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!selectedSubDepartmentId) {
        setEmployees([]);
        setSelectedEmployeeId("");
        return;
      }

      try {
        setLoadingEmployees(true);
        const res = await getEmployees();
        if (res.status && res.data) {
          // Filter employees by selected sub-department
          // The backend maps subDepartment to name, so we need to match by name
          const selectedSubDept = subDepartments.find(sd => sd.id === selectedSubDepartmentId);
          if (!selectedSubDept) {
            setEmployees([]);
            setSelectedEmployeeId("");
            return;
          }

          const filteredEmployees = res.data.filter((emp) => {
            // Match by sub-department name (most reliable)
            if (emp.subDepartmentName === selectedSubDept.name) return true;
            // Also check subDepartment field (which might be name or ID)
            if (emp.subDepartment === selectedSubDept.name) return true;
            // Fallback: check if subDepartment matches the ID
            if (emp.subDepartment === selectedSubDepartmentId) return true;
            return false;
          });
          setEmployees(filteredEmployees);
        } else {
          setEmployees([]);
        }
        // Reset employee selection
        setSelectedEmployeeId("");
      } catch (error) {
        console.error(error);
        toast.error("Failed to load employees");
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [selectedSubDepartmentId, subDepartments]);

  // Convert assignments to calendar events
  const calendarEvents = useMemo<IEvent[]>(() => {
    if (!selectedEmployeeId) return [];

    const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
    if (!selectedEmployee) return [];

    return assignments
      .filter((assignment) => assignment.employeeId === selectedEmployeeId)
      .map((assignment, index) => ({
        id: index + 1,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        title: assignment.policyName,
        color: assignment.color,
        description: `Policy: ${assignment.policyName}`,
        user: {
          id: selectedEmployee.id,
          name: selectedEmployee.employeeName,
          picturePath: null,
        },
      }));
  }, [assignments, selectedEmployeeId, employees]);

  // Convert employees to calendar users
  const calendarUsers = useMemo<IUser[]>(() => {
    return employees.map((emp) => ({
      id: emp.id,
      name: emp.employeeName,
      picturePath: null,
    }));
  }, [employees]);

  const handleDateClick = (date: Date) => {
    if (!selectedEmployeeId) {
      toast.error("Please select an employee first");
      return;
    }
    
    // If we already have a start date, set end date. Otherwise, set start date.
    if (selectedDateRange.start && !selectedDateRange.end) {
      // If clicking the same date or earlier, reset
      if (date <= selectedDateRange.start) {
        setSelectedDateRange({ start: date, end: null });
      } else {
        setSelectedDateRange({ start: selectedDateRange.start, end: date });
      }
    } else {
      setSelectedDateRange({ start: date, end: null });
    }
    
    setIsAssignDialogOpen(true);
  };

  const handleAssignPolicy = async () => {
    if (!selectedEmployeeId || !selectedPolicyId || !selectedDateRange.start) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsPending(true);
    try {
      const selectedPolicy = policies.find((p) => p.id === selectedPolicyId);
      if (!selectedPolicy) {
        toast.error("Policy not found");
        return;
      }

      const endDate = selectedDateRange.end || selectedDateRange.start;
      const colorIndex = assignments.length % POLICY_COLORS.length;

      const newAssignment: PolicyAssignment = {
        id: Date.now().toString(),
        employeeId: selectedEmployeeId,
        policyId: selectedPolicyId,
        policyName: selectedPolicy.name,
        startDate: selectedDateRange.start.toISOString(),
        endDate: endDate.toISOString(),
        color: POLICY_COLORS[colorIndex],
      };

      // TODO: Replace with actual API call
      // await assignPolicyToEmployee(newAssignment);
      
      setAssignments((prev) => [...prev, newAssignment]);
      toast.success(`Policy "${selectedPolicy.name}" assigned successfully`);
      setIsAssignDialogOpen(false);
      setSelectedDateRange({ start: null, end: null });
      setSelectedPolicyId("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to assign policy");
    } finally {
      setIsPending(false);
    }
  };

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  return (
    <div className="max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard/working-hours">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Employee Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Employee</CardTitle>
          <CardDescription>Choose department, sub-department, and employee to assign working hours policies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Department Selection */}
            <div className="space-y-2">
              <Label>Department *</Label>
              {loading ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : (
                <Select
                  value={selectedDepartmentId}
                  onValueChange={setSelectedDepartmentId}
                  disabled={isPending || loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Sub-Department Selection */}
            <div className="space-y-2">
              <Label>Sub-Department *</Label>
              <Select
                value={selectedSubDepartmentId}
                onValueChange={setSelectedSubDepartmentId}
                disabled={!selectedDepartmentId || isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedDepartmentId ? "Select sub-department" : "Select department first"} />
                </SelectTrigger>
                <SelectContent>
                  {subDepartments.length === 0 && selectedDepartmentId ? (
                    <SelectItem value="no-sub-dept" disabled>
                      No sub-departments found
                    </SelectItem>
                  ) : (
                    subDepartments.map((subDept) => (
                      <SelectItem key={subDept.id} value={subDept.id}>
                        {subDept.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Employee Selection */}
            <div className="space-y-2">
              <Label>Employee *</Label>
              {loadingEmployees ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : (
                <Select
                  value={selectedEmployeeId}
                  onValueChange={setSelectedEmployeeId}
                  disabled={!selectedSubDepartmentId || isPending || loadingEmployees}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedSubDepartmentId ? "Select employee" : "Select sub-department first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 && selectedSubDepartmentId ? (
                      <SelectItem value="no-employees" disabled>
                        No employees found
                      </SelectItem>
                    ) : (
                      employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.employeeName} ({e.employeeId})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Employee Details */}
          {selectedEmployee && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <p className="text-sm">
                <span className="font-medium">Department:</span> {selectedEmployee.departmentName || selectedEmployee.department}
              </p>
              {selectedEmployee.subDepartmentName && (
                <p className="text-sm">
                  <span className="font-medium">Sub Department:</span> {selectedEmployee.subDepartmentName}
                </p>
              )}
              <p className="text-sm">
                <span className="font-medium">Current Policy:</span> {selectedEmployee.workingHoursPolicyName || "N/A"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar */}
      {selectedEmployeeId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Policy Assignment Calendar
            </CardTitle>
            <CardDescription>
              Click on dates to assign policies. Different colors represent different policies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarProvider users={calendarUsers} events={calendarEvents}>
              <div className="mx-auto flex max-w-screen-2xl flex-col gap-4">
                <div className="overflow-hidden rounded-xl border">
                  <PolicyCalendarHeader events={calendarEvents} />
                  <PolicyAssignmentCalendar onDateClick={handleDateClick} />
                </div>
              </div>
            </CalendarProvider>
          </CardContent>
        </Card>
      )}

      {/* Policy Legend */}
      {selectedEmployeeId && assignments.filter((a) => a.employeeId === selectedEmployeeId).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Assigned Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments
                .filter((a) => a.employeeId === selectedEmployeeId)
                .map((assignment) => {
                  const policy = policies.find((p) => p.id === assignment.policyId);
                  return (
                    <div
                      key={assignment.id}
                      className="p-4 border rounded-lg flex items-start gap-3"
                    >
                      <div
                        className={`w-4 h-4 rounded mt-1 bg-${assignment.color}-500`}
                        style={{
                          backgroundColor:
                            assignment.color === "blue"
                              ? "#3b82f6"
                              : assignment.color === "green"
                              ? "#10b981"
                              : assignment.color === "red"
                              ? "#ef4444"
                              : assignment.color === "yellow"
                              ? "#eab308"
                              : assignment.color === "purple"
                              ? "#a855f7"
                              : assignment.color === "orange"
                              ? "#f97316"
                              : "#6b7280",
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{assignment.policyName}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(assignment.startDate), "MMM d, yyyy")} -{" "}
                          {format(parseISO(assignment.endDate), "MMM d, yyyy")}
                        </p>
                        {policy && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {policy.startWorkingHours} - {policy.endWorkingHours}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Policy Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Working Hours Policy</DialogTitle>
            <DialogDescription>
              Select a policy to assign for the selected date range
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="p-3 bg-muted rounded-md">
                {selectedDateRange.start && (
                  <p className="text-sm">
                    <span className="font-medium">Start:</span>{" "}
                    {format(selectedDateRange.start, "MMM d, yyyy")}
                  </p>
                )}
                {selectedDateRange.end && (
                  <p className="text-sm">
                    <span className="font-medium">End:</span>{" "}
                    {format(selectedDateRange.end, "MMM d, yyyy")}
                  </p>
                )}
                {!selectedDateRange.end && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Click on another date to set end date, or leave blank for single day
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Policy *</Label>
              <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a policy" />
                </SelectTrigger>
                <SelectContent>
                  {policies.map((policy) => (
                    <SelectItem key={policy.id} value={policy.id}>
                      <div>
                        <p className="font-medium">{policy.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {policy.startWorkingHours} - {policy.endWorkingHours}
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignDialogOpen(false);
                setSelectedDateRange({ start: null, end: null });
                setSelectedPolicyId("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignPolicy} disabled={isPending || !selectedPolicyId}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
