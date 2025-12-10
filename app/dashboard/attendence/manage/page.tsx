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
    fromDate: "",
    toDate: "",
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

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
    if (!formData.employeeId || !formData.fromDate || !formData.toDate) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsPending(true);
    try {
      // TODO: Replace with actual API call to submit attendance data
      console.log("Submitting attendance data:", formData);
      toast.success("Attendance record created successfully");
      // Reset form or redirect as needed
      setFormData({
        employeeId: "",
        employeeName: "",
        department: "",
        subDepartment: "",
        fromDate: "",
        toDate: "",
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
    <div className="max-w-4xl mx-auto pb-10">
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
            <CardTitle>Employee Information</CardTitle>
            <CardDescription>Select employee to manage attendance</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
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
          </CardContent>
        </Card>

        {/* Date Range */}
        <Card>
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
            <CardDescription>Specify the attendance period</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Date *</Label>
              <Input
                type="date"
                value={formData.fromDate}
                onChange={(e) => updateField("fromDate", e.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>To Date *</Label>
              <Input
                type="date"
                value={formData.toDate}
                onChange={(e) => updateField("toDate", e.target.value)}
                required
                disabled={isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-2 sticky bottom-4 bg-background p-4 border rounded-lg shadow-lg">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Attendance
          </Button>
          <Button type="button" variant="outline" onClick={() => setFormData({
            employeeId: "",
            employeeName: "",
            department: "",
            subDepartment: "",
            fromDate: "",
            toDate: "",
          })}>
            Clear
          </Button>
        </div>
      </form>

      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Upload Attendance File</DialogTitle>
            <DialogDescription className="text-base">
              Select a CSV file to upload attendance records. It will be stored in backend public/csv and parsed here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <Label className="text-base mb-2 block">Choose File</Label>
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="h-12"
              />
            </div>
            {selectedFile ? (
              <p className="text-sm text-muted-foreground bg-green-50 border border-green-200 rounded-lg p-4">
                <span className="font-semibold">Selected:</span> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            ) : (
              <p className="text-sm text-muted-foreground bg-gray-50 border border-gray-200 rounded-lg p-4">
                <span className="font-semibold">Allowed format:</span> CSV up to 5 MB
              </p>
            )}
            <div className="bg-muted border border-border rounded-lg p-6">
  <p className="text-base font-semibold text-foreground mb-3">
    Need a template?
  </p>

  <p className="text-sm text-muted-foreground mb-4">
    Download our sample CSV file to see the correct format for uploading attendance records.
  </p>

  <Button asChild variant="outline" size="lg">
    <a href="/attendance_samples.csv" download>
      <Download className="h-5 w-5 mr-2" />
      Download Sample Format
    </a>
  </Button>
</div>

          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUploadDialog(false);
                setSelectedFile(null);
              }}
              size="lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleFileUpload}
              disabled={uploadPending}
              size="lg"
            >
              {uploadPending && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
              Upload File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
