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
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import Link from "next/link";

interface Employee {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  subDepartment: string;
}

export default function AssignWorkingHoursPage() {
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    department: "",
    subDepartment: "",
  
  });

  // Fetch employees (replace with actual API)
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // Replace with actual API call
        setEmployees([
          { id: "1", employeeId: "E001", employeeName: "Alice", department: "HR", subDepartment: "Recruitment" },
          { id: "2", employeeId: "E002", employeeName: "Bob", department: "IT", subDepartment: "Support" },
        ]);
        toast.info("Employee data loaded");
      } catch (error) {
        console.error(error);
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
    if (!formData.employeeId) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsPending(true);
    try {
      console.log("Submitting Working Hours Policy:", formData);
      toast.success("Working Hours Policy saved successfully");
      // Reset form if needed
      setFormData({
        employeeId: "",
        employeeName: "",
        department: "",
        subDepartment: "",
      
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to save policy");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard/attendance">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Information */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
            <CardDescription>Select employee to assign working hours</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={formData.department} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Sub Department</Label>
              <Input value={formData.subDepartment} disabled className="bg-muted" />
            </div>
            <div className="flex space-x-4 mt-4 justify-end">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Policy
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() =>
              setFormData({
                employeeId: "",
                employeeName: "",
                department: "",
                subDepartment: "",
            
              })
            }
          >
            Clear
          </Button>
        </div>
          </CardContent>
        </Card>

        {/* Working Hours */}
   

        {/* Submit / Clear Buttons */}
        
      </form>
    </div>
  );
}
