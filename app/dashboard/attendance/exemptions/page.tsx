"use client";

import { useState, useTransition, useEffect } from "react";
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
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { getEmployees } from "@/lib/actions/employee";
import type { Employee } from "@/lib/actions/employee";

const flagTypes = ["Late", "Absent", "Early Leave", "Missing Check-in", "Missing Check-out", "Other"];
const exemptionTypes = ["Medical Emergency", "Family Emergency", "Official Duty", "Approved Leave", "System Error", "Other"];

export default function AttendanceExemptionPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    attendanceDate: "",
    flagType: "",
    exemptionType: "",
    reason: "",
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const result = await getEmployees();
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
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.attendanceDate || !formData.flagType || !formData.exemptionType || !formData.reason.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    startTransition(async () => {
      try {
        // TODO: Replace with actual API call to create attendance exemption
        console.log("Submitting attendance exemption:", formData);
        toast.success("Attendance exemption request submitted successfully");
        
        // Reset form
        setFormData({
          employeeId: "",
          employeeName: "",
          attendanceDate: "",
          flagType: "",
          exemptionType: "",
          reason: "",
        });
        
        // Optionally redirect to list page
        // router.push("/dashboard/attendance/exemptions/list");
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to submit attendance exemption request");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-6">
        <Link href="/dashboard/attendance">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Attendance
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Information */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
            <CardDescription>Select employee for attendance exemption request</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
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
          </CardContent>
        </Card>

        {/* Exemption Details */}
        <Card>
          <CardHeader>
            <CardTitle>Exemption Details</CardTitle>
            <CardDescription>Provide details for the attendance exemption request</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Attendance Date *</Label>
              <DatePicker
                value={formData.attendanceDate}
                onChange={(value) => updateField("attendanceDate", value || "")}
                placeholder="Select attendance date"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Flag Type *</Label>
              <Select
                value={formData.flagType}
                onValueChange={(value) => updateField("flagType", value)}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select flag type" />
                </SelectTrigger>
                <SelectContent>
                  {flagTypes.map((flag) => (
                    <SelectItem key={flag} value={flag}>
                      {flag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Exemption Type *</Label>
              <Select
                value={formData.exemptionType}
                onValueChange={(value) => updateField("exemptionType", value)}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select exemption type" />
                </SelectTrigger>
                <SelectContent>
                  {exemptionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Reason *</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => updateField("reason", e.target.value)}
                placeholder="Enter reason for attendance exemption..."
                rows={4}
                required
                disabled={isPending}
              />
            </div>

            <div className="flex gap-2 justify-end md:col-span-2 mt-4">
            

              <Button type="submit" disabled={isPending} size="sm">
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Request
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setFormData({
                    employeeId: "",
                    employeeName: "",
                    attendanceDate: "",
                    flagType: "",
                    exemptionType: "",
                    reason: "",
                  })
                }
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

