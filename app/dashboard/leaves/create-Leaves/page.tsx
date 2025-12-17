"use client";

import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from "@/components/common/data-table";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getEmployees, type Employee } from "@/lib/actions/employee";
import { getEmployeeLeaveBalance, createLeaveApplication, type LeaveBalance, type EmployeeLeaveInfo } from "@/lib/actions/leave-application";
import { getLeaveRequests, type LeaveRequest } from "@/lib/actions/leave-requests";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const reasonOptions = [
  "Work-related commitments",
  "Personal work",
  "Family emergency",
  "Medical reasons",
  "Vacation",
  "Other",
];

const dayTypeOptions = [
  { value: "fullDay", label: "Full Day" },
  { value: "halfDay", label: "Half Day" },
  { value: "shortLeave", label: "Short Leave" },
];

export default function CreateLeavePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [leaveInfo, setLeaveInfo] = useState<EmployeeLeaveInfo | null>(null);
  const [employeeLeaveRequests, setEmployeeLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>("");
  const [dayType, setDayType] = useState<string>("fullDay");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [reasonForLeave, setReasonForLeave] = useState<string>("");
  const [addressWhileOnLeave, setAddressWhileOnLeave] = useState<string>("");

  // Load employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const result = await getEmployees();
        if (result.status && result.data) {
          // Show all employees (active and inactive)
          setEmployees(result.data);
        } else {
          toast.error(result.message || "Failed to load employees");
        }
      } catch (error) {
        console.error("Failed to fetch employees:", error);
        toast.error("Failed to load employees");
      }
    };

    fetchEmployees();
  }, []);

  // Load leave balance and requests when employee is selected
  useEffect(() => {
    const fetchLeaveData = async () => {
      if (!selectedEmployeeId) {
        setLeaveInfo(null);
        setEmployeeLeaveRequests([]);
        return;
      }

      try {
        setLoading(true);
        setLoadingRequests(true);
        
        // Fetch leave balance and requests in parallel
        const [balanceResult, requestsResult] = await Promise.all([
          getEmployeeLeaveBalance(selectedEmployeeId),
          getLeaveRequests({ employeeId: selectedEmployeeId }),
        ]);

        if (balanceResult.status && balanceResult.data) {
          setLeaveInfo(balanceResult.data);
        } else {
          toast.error(balanceResult.message || "Failed to load leave balance");
          setLeaveInfo(null);
        }

        if (requestsResult.status && requestsResult.data) {
          setEmployeeLeaveRequests(requestsResult.data);
        } else {
          setEmployeeLeaveRequests([]);
        }
      } catch (error) {
        console.error("Failed to fetch leave data:", error);
        toast.error("Failed to load leave data");
        setLeaveInfo(null);
        setEmployeeLeaveRequests([]);
      } finally {
        setLoading(false);
        setLoadingRequests(false);
      }
    };

    fetchLeaveData();
  }, [selectedEmployeeId]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!leaveInfo) return { total: 0, used: 0, remaining: 0 };
    return {
      total: leaveInfo.leaveBalances.reduce((sum, bal) => sum + bal.totalLeaves, 0),
      used: leaveInfo.leaveBalances.reduce((sum, bal) => sum + bal.usedLeaves, 0),
      remaining: leaveInfo.leaveBalances.reduce((sum, bal) => sum + bal.remainingLeaves, 0),
    };
  }, [leaveInfo]);

  // Status badge variant
  const getStatusVariant = (status?: string | null) => {
    if (!status) return "secondary";
    const statusLower = status.toLowerCase();
    if (statusLower === "approved") return "default";
    if (statusLower === "rejected") return "destructive";
    return "secondary";
  };

  // Table columns for leave balance
  const columns: ColumnDef<LeaveBalance>[] = useMemo(() => [
    {
      accessorKey: "index",
      header: "S No#",
      cell: ({ row }) => row.index + 1,
    },
    {
      accessorKey: "leaveTypeName",
      header: "Leaves Name",
    },
    {
      accessorKey: "totalLeaves",
      header: "No of leaves",
      cell: ({ row }) => row.original.totalLeaves,
    },
    {
      accessorKey: "usedLeaves",
      header: "Used/Deducted",
      cell: ({ row }) => row.original.usedLeaves,
    },
    {
      accessorKey: "remainingLeaves",
      header: "Remaining",
      cell: ({ row }) => row.original.remainingLeaves,
    },
  ], []);

  // Table columns for employee leave requests
  const requestColumns: ColumnDef<LeaveRequest>[] = useMemo(() => [
    {
      accessorKey: "index",
      header: "S No#",
      cell: ({ row }) => row.index + 1,
    },
    {
      accessorKey: "leaveTypeName",
      header: "Leave Type",
      cell: ({ row }) => row.original.leaveTypeName || row.original.leaveType,
    },
    {
      accessorKey: "dayType",
      header: "Day Type",
    },
    {
      accessorKey: "fromDate",
      header: "From Date",
      cell: ({ row }) => format(new Date(row.original.fromDate), "MM/dd/yyyy"),
    },
    {
      accessorKey: "toDate",
      header: "To Date",
      cell: ({ row }) => format(new Date(row.original.toDate), "MM/dd/yyyy"),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status || row.original.approval1Status;
        return status ? (
          <Badge variant={getStatusVariant(status)}>{status}</Badge>
        ) : (
          <Badge variant="secondary">Pending</Badge>
        );
      },
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ row }) => row.original.remarks || "-",
    },
  ], []);

  // Get available leave types from balance (only those with remaining leaves > 0)
  const availableLeaveTypes = useMemo(() => {
    if (!leaveInfo) return [];
    return leaveInfo.leaveBalances
      .filter(bal => bal.remainingLeaves > 0)
      .map(bal => ({
        id: bal.leaveTypeId,
        name: bal.leaveTypeName,
        remaining: bal.remainingLeaves,
      }));
  }, [leaveInfo]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    if (!selectedLeaveType) {
      toast.error("Please select a leave type");
      return;
    }

    if (!fromDate || !toDate) {
      toast.error("Please select from date and to date");
      return;
    }

    if (!reasonForLeave) {
      toast.error("Please select reason for leave");
      return;
    }

    if (!addressWhileOnLeave.trim()) {
      toast.error("Please enter address while on leave");
      return;
    }

    try {
      setSubmitting(true);
      const result = await createLeaveApplication({
        employeeId: selectedEmployeeId,
        leaveTypeId: selectedLeaveType,
        dayType: dayType as 'fullDay' | 'halfDay' | 'shortLeave',
        fromDate,
        toDate,
        reasonForLeave,
        addressWhileOnLeave,
      });

      if (result.status) {
        toast.success("Leave application submitted successfully");
        // Reset form
        handleClearForm();
        // Reload leave balance and requests
        if (selectedEmployeeId) {
          const [balanceResult, requestsResult] = await Promise.all([
            getEmployeeLeaveBalance(selectedEmployeeId),
            getLeaveRequests({ employeeId: selectedEmployeeId }),
          ]);
          
          if (balanceResult.status && balanceResult.data) {
            setLeaveInfo(balanceResult.data);
          }
          
          if (requestsResult.status && requestsResult.data) {
            setEmployeeLeaveRequests(requestsResult.data);
          }
        }
      } else {
        toast.error(result.message || "Failed to submit leave application");
      }
    } catch (error) {
      console.error("Failed to submit leave application:", error);
      toast.error("Failed to submit leave application");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle clear form
  const handleClearForm = () => {
    setSelectedLeaveType("");
    setDayType("fullDay");
    setFromDate("");
    setToDate("");
    setReasonForLeave("");
    setAddressWhileOnLeave("");
  };

  // Employee options - only show employees from employee table
  const employeeOptions = useMemo(() => {
    if (employees.length === 0) {
      return [{ value: "", label: "No employees available" }];
    }
    return [
      { value: "", label: "Select Employee" },
      ...employees.map((emp) => ({
        value: emp.id,
        label: `${emp.employeeId} -- ${emp.employeeName}`,
      })),
    ];
  }, [employees]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">LEAVES BALANCE</h2>
        <p className="text-muted-foreground">Apply for leave and view leave balance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Employee</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Employee ID</Label>
            <Autocomplete
              options={employeeOptions}
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
              placeholder="Select Employee"
              searchPlaceholder="Search Employee..."
            />
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {leaveInfo && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Taken Leaves</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {totals.used}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Remaining Leaves</div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {totals.remaining}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leave Balance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Leave Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={leaveInfo.leaveBalances}
                searchFields={[{ key: "leaveTypeName", label: "Leave Type" }]}
              />
            </CardContent>
          </Card>

          {/* Leave Application Form */}
          <Card>
            <CardHeader>
              <CardTitle className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-lg">
                SELECT LEAVE TYPE
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Leave Type Buttons */}
              <div className="flex flex-wrap gap-3">
                {availableLeaveTypes.map((leaveType) => (
                  <Button
                    key={leaveType.id}
                    type="button"
                    variant={selectedLeaveType === leaveType.id ? "default" : "outline"}
                    onClick={() => setSelectedLeaveType(leaveType.id)}
                    className={
                      selectedLeaveType === leaveType.id
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30"
                    }
                  >
                    {leaveType.name} ({leaveType.remaining} remaining)
                  </Button>
                ))}
              </div>

              {selectedLeaveType && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Day Type</Label>
                      <Select value={dayType} onValueChange={setDayType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Day Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {dayTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>From Date</Label>
                      <DatePicker
                        value={fromDate}
                        onChange={setFromDate}
                        placeholder="Select From Date"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>To Date</Label>
                      <DatePicker
                        value={toDate}
                        onChange={setToDate}
                        placeholder="Select To Date"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Reason For Leave</Label>
                    <Select value={reasonForLeave} onValueChange={setReasonForLeave}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {reasonOptions.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Address While on Leave</Label>
                    <Textarea
                      value={addressWhileOnLeave}
                      onChange={(e) => setAddressWhileOnLeave(e.target.value)}
                      placeholder="Enter address while on leave"
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearForm}
                      disabled={submitting}
                    >
                      Clear Form
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Submit
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Employee Leave Requests */}
          <Card>
            <CardHeader>
              <CardTitle>My Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : employeeLeaveRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No leave requests found for this employee.
                </div>
              ) : (
                <DataTable
                  columns={requestColumns}
                  data={employeeLeaveRequests}
                  searchFields={[
                    { key: "leaveTypeName", label: "Leave Type" },
                    { key: "status", label: "Status" },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

