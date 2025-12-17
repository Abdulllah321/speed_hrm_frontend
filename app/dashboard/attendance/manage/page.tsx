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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, Download } from "lucide-react";
import Link from "next/link";
import { FileUpload } from "@/components/ui/file-upload";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { getEmployees } from "@/lib/actions/employee";
import { createAttendance, createAttendanceForDateRange, bulkUploadAttendance, type Attendance } from "@/lib/actions/attendance";
import { format } from "date-fns";

interface Employee {
  id: string;
  employeeId: string;
  employeeName: string;
  department?: string;
  subDepartment?: string;
}

export default function AttendanceManagePage() {
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPending, setUploadPending] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    employeeDbId: "", // Internal ID from database
    employeeName: "",
    department: "",
    subDepartment: "",
    dateRange: {
      from: new Date(),
      to: new Date(),
    } as DateRange,
    checkIn: "",
    checkOut: "",
    status: "present",
    isRemote: false,
    location: "",
    notes: "",
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const result = await getEmployees();
        if (result.status && result.data) {
          const mappedEmployees = result.data.map((emp: any) => ({
            id: emp.id,
            employeeId: emp.employeeId,
            employeeName: emp.employeeName,
            department: typeof emp.department === 'string' ? emp.department : (emp.department as any)?.name || '',
            subDepartment: typeof emp.subDepartment === 'string' ? emp.subDepartment : (emp.subDepartment as any)?.name || '',
          }));
          setEmployees(mappedEmployees);
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

  const handleEmployeeChange = (employeeDbId: string) => {
    const selected = employees.find((e) => e.id === employeeDbId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        employeeDbId: selected.id,
        employeeId: selected.employeeId,
        employeeName: selected.employeeName,
        department: selected.department || "",
        subDepartment: selected.subDepartment || "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeDbId || !formData.dateRange.from || !formData.dateRange.to) {
      toast.error("Please fill all required fields (Employee and Date Range)");
      return;
    }

    setIsPending(true);
    try {
      const fromDate = formData.dateRange.from;
      const toDate = formData.dateRange.to;
      const isSingleDate = format(fromDate, 'yyyy-MM-dd') === format(toDate, 'yyyy-MM-dd');

      let result;
      
      if (isSingleDate) {
        // Single date - use createAttendance
        const checkInDateTime = formData.checkIn 
          ? new Date(`${format(fromDate, 'yyyy-MM-dd')}T${formData.checkIn}`)
          : undefined;
        const checkOutDateTime = formData.checkOut 
          ? new Date(`${format(fromDate, 'yyyy-MM-dd')}T${formData.checkOut}`)
          : undefined;

        result = await createAttendance({
          employeeId: formData.employeeDbId,
          date: fromDate,
          checkIn: checkInDateTime,
          checkOut: checkOutDateTime,
          status: formData.status,
          isRemote: formData.isRemote,
          location: formData.location || undefined,
          notes: formData.notes || undefined,
        });
      } else {
        // Date range - use createAttendanceForDateRange
        result = await createAttendanceForDateRange({
          employeeId: formData.employeeDbId,
          fromDate: fromDate,
          toDate: toDate,
          checkIn: formData.checkIn || undefined,
          checkOut: formData.checkOut || undefined,
          status: formData.status,
          isRemote: formData.isRemote,
          location: formData.location || undefined,
          notes: formData.notes || undefined,
        });
      }

      if (result.status) {
        if (isSingleDate) {
          toast.success("Attendance record created successfully");
        } else {
          const dateRangeResult = result as { status: boolean; data?: Attendance[]; errors?: Array<{ date: string; error: string }>; message?: string };
          const successCount = dateRangeResult.data?.length || 0;
          const errorCount = dateRangeResult.errors?.length || 0;
          if (errorCount > 0) {
            toast.warning(`${successCount} records created, ${errorCount} failed. Check console for details.`);
            console.error("Failed records:", dateRangeResult.errors);
          } else {
            toast.success(`${successCount} attendance records created successfully`);
          }
        }
        
        // Reset form
        setFormData({
          employeeId: "",
          employeeDbId: "",
          employeeName: "",
          department: "",
          subDepartment: "",
          dateRange: {
            from: new Date(),
            to: new Date(),
          } as DateRange,
          checkIn: "",
          checkOut: "",
          status: "present",
          isRemote: false,
          location: "",
          notes: "",
        });
      } else {
        toast.error(result.message || "Failed to create attendance record");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to create attendance record");
    } finally {
      setIsPending(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error("Please choose a file first");
      return;
    }
    setUploadPending(true);
    try {
      const result = await bulkUploadAttendance(selectedFile);
      
      if (result.status) {
        const successCount = result.data?.length || 0;
        const errorCount = result.errors?.length || 0;
        if (errorCount > 0) {
          toast.warning(`${successCount} records imported, ${errorCount} failed. Check console for details.`);
          console.error("Failed records:", result.errors);
        } else {
          toast.success(`${successCount} attendance records imported successfully`);
        }
        setUploadDialog(false);
        setSelectedFile(null);
      } else {
        toast.error(result.message || "Failed to upload attendance file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload attendance file");
    } finally {
      setUploadPending(false);
    }
  };

  return (
    <div className="max-w-4xl  mx-auto pb-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard/attendance">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <Button variant="secondary" onClick={() => setUploadDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Attendance File
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Information */}
        <Card>
  <CardHeader>
    <CardTitle>Attendance Details</CardTitle>
    <CardDescription>
      Select employee and specify the attendance period
    </CardDescription>
  </CardHeader>
  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
    {/* Employee Information */}
    <div className="space-y-2">
      <Label>Employee ID/Name *</Label>
      {loading ? (
        <div className="h-10 bg-muted rounded animate-pulse" />
      ) : (
        <Select
          value={formData.employeeDbId}
          onValueChange={handleEmployeeChange}
          disabled={isPending || loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.length === 0 ? (
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

    <div className="space-y-2">
      <Label>Department</Label>
      <Input value={formData.department} disabled className="bg-muted" />
    </div>

    <div className="space-y-2">
      <Label>Sub Department</Label>
      <Input value={formData.subDepartment} disabled className="bg-muted" />
    </div>

    {/* Date Range */}
    <div className="space-y-2 md:col-span-2 lg:col-span-2">
      <Label>Date Range *</Label>
      <DateRangePicker
        initialDateFrom={formData.dateRange.from}
        initialDateTo={formData.dateRange.to}
        showCompare={false}
        onUpdate={(values) => {
          if (values.range) {
            setFormData({
              ...formData,
              dateRange: values.range,
            });
          }
        }}
      />
    </div>
  </CardContent>
</Card>

        {/* Attendance Details */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Details</CardTitle>
            <CardDescription>
              Enter check-in/check-out times and other details
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Check In Time */}
            <div className="space-y-2">
              <Label htmlFor="checkIn">Check In Time</Label>
              <Input
                id="checkIn"
                type="time"
                value={formData.checkIn}
                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty if not applicable
              </p>
            </div>

            {/* Check Out Time */}
            <div className="space-y-2">
              <Label htmlFor="checkOut">Check Out Time</Label>
              <Input
                id="checkOut"
                type="time"
                value={formData.checkOut}
                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty if not applicable
              </p>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                disabled={isPending}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Remote Work */}
            <div className="space-y-2">
              <Label htmlFor="isRemote">Remote Work</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="isRemote"
                  checked={formData.isRemote}
                  onCheckedChange={(checked) => setFormData({ ...formData, isRemote: checked })}
                  disabled={isPending}
                />
                <Label htmlFor="isRemote" className="cursor-pointer">
                  {formData.isRemote ? "Yes" : "No"}
                </Label>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                type="text"
                placeholder="e.g., Office, Client Site, Remote"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                disabled={isPending}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes or remarks..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={isPending}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>


        {/* Submit */}
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFormData({
                employeeId: "",
                employeeDbId: "",
                employeeName: "",
                department: "",
                subDepartment: "",
                dateRange: {
                  from: new Date(),
                  to: new Date(),
                } as DateRange,
                checkIn: "",
                checkOut: "",
                status: "present",
                isRemote: false,
                location: "",
                notes: "",
              })
            }
            disabled={isPending}
          >
            Clear
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Attendance
          </Button>
        </div>
      </form>

      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Upload Attendance File</DialogTitle>
            <DialogDescription>
              Select a CSV file to upload attendance records. It will be stored in backend public/csv and parsed here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <FileUpload
              id="attendance-file-upload"
              accept=".csv,text/csv"
              onChange={(files) => {
                if (files && files.length > 0) {
                  setSelectedFile(files[0]);
                } else {
                  setSelectedFile(null);
                }
              }}
            />
            <div className="border border-primary/20 rounded-lg p-3 bg-primary/5">
              <p className="text-sm text-primary mb-2">Need a template?</p>
              <Button asChild variant="outline" size="sm" className="bg-primary! text-white! hover:bg-primary/90!">
  <a href="/employee_samples.xlsx" download>
    <Download className="h-4 w-4 mr-2" />
    Download Sample Template
  </a>
</Button>

            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUploadDialog(false);
                setSelectedFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleFileUpload}
              disabled={uploadPending || !selectedFile}
            >
              {uploadPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
