"use client";

import { useState, useTransition } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Autocomplete } from "@/components/ui/autocomplete";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import {
  getEmployeesForDropdown,
  type EmployeeDropdownOption,
} from "@/lib/actions/employee";
import { createOvertimeRequest, type OvertimeType } from "@/lib/actions/overtime";
import { DatePicker } from "@/components/ui/date-picker";

interface CreateOvertimeClientProps {
  initialEmployees: EmployeeDropdownOption[];
}

export function CreateOvertimeClient({
  initialEmployees,
}: CreateOvertimeClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [employees] = useState<EmployeeDropdownOption[]>(initialEmployees);

  const [formData, setFormData] = useState({
    employeeId: "",
    overtimeType: "" as OvertimeType | "",
    title: "",
    description: "",
    date: "",
    weekdayOvertimeHours: "0",
    holidayOvertimeHours: "0",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.employeeId) {
      toast.error("Please select an employee");
      return;
    }

    if (!formData.overtimeType) {
      toast.error("Please select overtime type");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    if (!formData.date || !formData.date.trim()) {
      toast.error("Please select a date");
      return;
    }

    const weekdayHours = parseFloat(formData.weekdayOvertimeHours);
    const holidayHours = parseFloat(formData.holidayOvertimeHours);

    if (isNaN(weekdayHours) || weekdayHours < 0) {
      toast.error("Please enter valid weekday overtime hours");
      return;
    }

    if (isNaN(holidayHours) || holidayHours < 0) {
      toast.error("Please enter valid holiday overtime hours");
      return;
    }

    if (weekdayHours === 0 && holidayHours === 0) {
      toast.error("Please enter at least one overtime hour (weekday or holiday)");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createOvertimeRequest({
          employeeId: formData.employeeId,
          overtimeType: formData.overtimeType as OvertimeType,
          title: formData.title.trim(),
          description: formData.description.trim(),
          date: formData.date,
          weekdayOvertimeHours: weekdayHours,
          holidayOvertimeHours: holidayHours,
        });

        if (result.status) {
          toast.success(result.message || "Overtime request created successfully");
          router.push("/dashboard/payroll-setup/overtime/view");
        } else {
          toast.error(result.message || "Failed to create overtime request");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to create overtime request");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-6">
        <Link href="/dashboard/payroll-setup/overtime/view">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 shadow-lg bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold">Overtime Request</CardTitle>
            <CardDescription className="text-base">
              Fill in the details to create an overtime request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* First Row - 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employee */}
              <div className="space-y-2">
                <Label htmlFor="employee">
                  Employee <span className="text-destructive">*</span>
                </Label>
                <Autocomplete
                  options={employees.map((e) => ({
                    value: e.id,
                    label: `${e.employeeName} (${e.employeeId})`,
                  }))}
                  value={formData.employeeId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, employeeId: value || "" }))
                  }
                  placeholder="Select employee"
                  disabled={isPending}
                />
              </div>

              {/* Overtime Type */}
              <div className="space-y-2">
                <Label htmlFor="overtimeType">
                  Overtime Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.overtimeType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, overtimeType: value as OvertimeType }))
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="overtimeType">
                    <SelectValue placeholder="Select One" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekday">Weekday Overtime</SelectItem>
                    <SelectItem value="holiday">Holiday Overtime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Second Row - Description full width */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Enter description"
                disabled={isPending}
                rows={4}
                required
              />
            </div>

            {/* Third Row - 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Title"
                  disabled={isPending}
                  required
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">
                  Date <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  value={formData.date}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, date: value }))
                  }
                  disabled={isPending}
                  placeholder="mm/dd/yyyy"
                />
              </div>
            </div>

            {/* Fourth Row - 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Weekday Overtime Hours */}
              <div className="space-y-2">
                <Label htmlFor="weekdayOvertimeHours">
                  Weekday Overtime Hours <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="weekdayOvertimeHours"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weekdayOvertimeHours}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, weekdayOvertimeHours: e.target.value }))
                  }
                  placeholder="0"
                  disabled={isPending}
                  required
                />
              </div>

              {/* Holiday Overtime Hours */}
              <div className="space-y-2">
                <Label htmlFor="holidayOvertimeHours">
                  Holiday Overtime Hours <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="holidayOvertimeHours"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.holidayOvertimeHours}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, holidayOvertimeHours: e.target.value }))
                  }
                  placeholder="0"
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={isPending} size="lg">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

