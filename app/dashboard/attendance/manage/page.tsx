"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, Download } from "lucide-react";
import Link from "next/link";
import { FileUpload } from "@/components/ui/file-upload";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";

interface Employee {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  subDepartment: string;
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
    employeeName: "",
    department: "",
    subDepartment: "",
    dateRange: {
      from: new Date(),
      to: new Date(),
    } as DateRange,
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // TODO: Replace with actual API call to fetch employees
        // const result = await getAllEmployees();
        // if (result.status && result.data) {
        //   setEmployees(result.data);
        // }
        setEmployees([]);
        toast.info("Employee data will be loaded from API");
      } catch (error) {
        console.error("Failed to fetch employees:", error);
        toast.error("Failed to load employees");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const handleEmployeeChange = (employeeId: string) => {
    const selected = employees.find((e) => e.id === employeeId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        employeeId: selected.employeeId,
        employeeName: selected.employeeName,
        department: selected.department,
        subDepartment: selected.subDepartment || "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.dateRange.from || !formData.dateRange.to) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsPending(true);
    try {
      // Convert dates to ISO strings
      const fromDate = formData.dateRange.from.toISOString();
      const toDate = formData.dateRange.to.toISOString();
      
      // TODO: Replace with actual API call to submit attendance data
      console.log("Submitting attendance data:", {
        ...formData,
        fromDate,
        toDate,
      });
      toast.success("Attendance record created successfully");
      // Reset form or redirect as needed
      setFormData({
        employeeId: "",
        employeeName: "",
        department: "",
        subDepartment: "",
        dateRange: {
          from: new Date(),
          to: new Date(),
        } as DateRange,
      });
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
      // TODO: Replace with actual API call to upload attendance file
      console.log("Uploading file:", selectedFile);
      toast.success("Attendance file uploaded successfully");
      setUploadDialog(false);
      setSelectedFile(null);
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
          value={formData.employeeId}
          onValueChange={handleEmployeeChange}
          disabled={isPending || loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
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
        dateRange={{
          oldestDate: new Date(new Date().getFullYear(), 0, 1),
          latestDate: new Date(new Date().getFullYear(), 11, 31),
        }}
        isPreset={false}
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
                employeeName: "",
                department: "",
                subDepartment: "",
                dateRange: {
                  from: new Date(),
                  to: new Date(),
                } as DateRange,
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
              <Button asChild variant="outline" size="sm" className="!bg-primary !text-white hover:!bg-primary/90">
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
