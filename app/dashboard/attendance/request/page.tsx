"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { createAttendanceRequestQuery, getAllAttendanceRequestQueries } from "@/lib/actions/attendance-request-query";
import type { AttendanceRequestQuery } from "@/lib/actions/attendance-request-query";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-Picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getAllEmployeesForClearance } from "@/lib/actions/exit-clearance";
import type { Employee } from "@/lib/actions/exit-clearance";
import DataTable from "@/components/common/data-table";
import { columns } from "../request-list/columns";

export default function AttendanceRequestQueryPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRequests, setUserRequests] = useState<AttendanceRequestQuery[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    department: "",
    subDepartment: "",
    attendanceDate: "",
    clockInTimeRequest: "",
    clockOutTimeRequest: "",
    breakIn: "",
    breakOut: "",
    query: "",
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const result = await getAllEmployeesForClearance();
        if (result.status && result.data) {
          setEmployees(result.data);
        } else {
          toast.error(result.message || "Failed to load employees");
        }
      } catch (error) {
        console.error("Failed to fetch employees:", error);
        toast.error("Failed to load employees");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Fetch user's requests when employee is selected
  useEffect(() => {
    const fetchUserRequests = async () => {
      if (!formData.employeeId) {
        setUserRequests([]);
        return;
      }

      setLoadingRequests(true);
      try {
        const result = await getAllAttendanceRequestQueries();
        if (result.status && result.data) {
          // Filter requests for the selected employee
          const filtered = result.data.filter(
            (req) => req.employeeId === formData.employeeId
          );
          setUserRequests(filtered);
        } else {
          console.error("Failed to load requests:", result.message);
        }
      } catch (error) {
        console.error("Failed to fetch requests:", error);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchUserRequests();
  }, [formData.employeeId]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEmployeeChange = (employeeId: string) => {
    const selected = employees.find((e) => e.id === employeeId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        employeeId: selected.id,
        employeeName: selected.employeeName,
        department: selected.department,
        subDepartment: selected.subDepartment || "",
      }));
    }
  };

  const resetForm = () => {
    setFormData((prev) => ({
      ...prev,
      attendanceDate: "",
      clockInTimeRequest: "",
      clockOutTimeRequest: "",
      breakIn: "",
      breakOut: "",
      query: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.attendanceDate || !formData.query) {
      toast.error("Please fill required fields");
      return;
    }
    startTransition(async () => {
      try {
        const result = await createAttendanceRequestQuery({
          employeeId: formData.employeeId || null,
          employeeName: formData.employeeName || null,
          department: formData.department || null,
          subDepartment: formData.subDepartment || null,
          attendanceDate: formData.attendanceDate,
          clockInTimeRequest: formData.clockInTimeRequest || null,
          clockOutTimeRequest: formData.clockOutTimeRequest || null,
          breakIn: formData.breakIn || null,
          breakOut: formData.breakOut || null,
          query: formData.query,
          approvalStatus: "pending",
        });

        if (result.status) {
          toast.success(result.message || "Attendance request query created successfully");
          // Clear form fields (keep employee selection)
          resetForm();
          // Refresh user requests
          const refreshResult = await getAllAttendanceRequestQueries();
          if (refreshResult.status && refreshResult.data) {
            const filtered = refreshResult.data.filter(
              (req) => req.employeeId === formData.employeeId
            );
            setUserRequests(filtered);
          }
          // Optionally redirect or stay on page
          // router.push("/dashboard/attendance/request-list");
        } else {
          toast.error(result.message || "Failed to create attendance request query");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to create attendance request query");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-6">
        <Link href="/dashboard/attendance/request-list">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back to List</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Attendance Request Query Information */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Request Query</CardTitle>
            <CardDescription>Submit your attendance time correction request</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employee Name *</Label>
              {loading ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : (
                <Select value={formData.employeeId} onValueChange={handleEmployeeChange} disabled={isPending || loading}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.employeeName} ({e.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input 
                value={formData.department} 
                disabled 
                className="bg-muted" 
                placeholder="Select employee to see department"
              />
            </div>
            <div className="space-y-2">
              <Label>Sub Department</Label>
              <Input 
                value={formData.subDepartment} 
                disabled 
                className="bg-muted" 
                placeholder="Select employee to see sub department"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Attendance Date *</Label>
              <DatePicker
                value={formData.attendanceDate}
                onChange={(value: string) => updateField("attendanceDate", value)}
                disabled={isPending}
                placeholder="Select attendance date"
              />
            </div>
            <div className="space-y-2">
              <Label>Clock Inn Time Request To Change *</Label>
              <TimePicker
                value={formData.clockInTimeRequest}
                onChange={(value: string) => updateField("clockInTimeRequest", value)}
                disabled={isPending}
                placeholder="Select clock in time"
              />
            </div>
            <div className="space-y-2">
              <Label>Clock Out Time Request To Change *</Label>
              <TimePicker
                value={formData.clockOutTimeRequest}
                onChange={(value: string) => updateField("clockOutTimeRequest", value)}
                disabled={isPending}
                placeholder="Select clock out time"
              />
            </div>
            <div className="space-y-2">
              <Label>Break In *</Label>
              <TimePicker
                value={formData.breakIn}
                onChange={(value: string) => updateField("breakIn", value)}
                disabled={isPending}
                placeholder="Select break in time"
              />
            </div>
            <div className="space-y-2">
              <Label>Break Out *</Label>
              <TimePicker
                value={formData.breakOut}
                onChange={(value: string) => updateField("breakOut", value)}
                disabled={isPending}
                placeholder="Select break out time"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Query *</Label>
              <Textarea
                value={formData.query}
                onChange={(e) => updateField("query", e.target.value)}
                placeholder="Enter your query or reason for the attendance correction..."
                rows={4}
                disabled={isPending}
                required
              />
  <div className="flex space-x-4 mt-4 justify-end">
  <Button type="submit" disabled={isPending} className="w-32">
    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
    Submit Request
  </Button>
  <Button type="button" variant="outline" className="w-32" onClick={() => router.back()}>
    Cancel
  </Button>
</div>


            </div>
          </CardContent>
        </Card>

        {/* Submit */}
      
      </form>

      {/* User's Requests Data Table */}
      {formData.employeeId && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>My Requests</CardTitle>
            <CardDescription>
              View all your attendance request queries for {formData.employeeName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : userRequests.length > 0 ? (
              <DataTable
                columns={columns}
                data={userRequests.map((req, index) => ({
                  ...req,
                  id: req.id,
                  sNo: index + 1,
                }))}
                searchFields={[
                  { key: "query", label: "Query" },
                  { key: "attendanceDate", label: "Date" },
                  { key: "approvalStatus", label: "Status" },
                ]}
                filters={[
                  {
                    key: "approvalStatus",
                    label: "Status",
                    options: [
                      { value: "all", label: "All Status" },
                      { value: "pending", label: "Pending" },
                      { value: "approved", label: "Approved" },
                      { value: "rejected", label: "Rejected" },
                    ],
                  },
                ]}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No requests found for this employee.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

