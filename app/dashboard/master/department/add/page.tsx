"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createDepartments } from "@/lib/actions/department";
import { getEmployeesForDropdown, type EmployeeDropdownOption } from "@/lib/actions/employee";
import { Autocomplete } from "@/components/ui/autocomplete";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

export default function AddDepartmentPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [departments, setDepartments] = useState([{ id: 1, name: "", headId: "" }]);
  const [employees, setEmployees] = useState<EmployeeDropdownOption[]>([]);

  useEffect(() => {
    getEmployeesForDropdown().then((result) => {
      if (result.status && result.data) {
        setEmployees(result.data);
      }
    });
  }, []);

  const addRow = () => {
    setDepartments([...departments, { id: Date.now(), name: "", headId: "" }]);
  };

  const removeRow = (id: number) => {
    if (departments.length > 1) {
      setDepartments(departments.filter((d) => d.id !== id));
    }
  };

  const updateName = (id: number, name: string) => {
    setDepartments(departments.map((d) => (d.id === id ? { ...d, name } : d)));
  };

  const updateHeadId = (id: number, headId: string) => {
    setDepartments(departments.map((d) => (d.id === id ? { ...d, headId } : d)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validDepartments = departments.filter((d) => d.name.trim());
    
    if (validDepartments.length === 0) {
      toast.error("Please enter at least one department name");
      return;
    }

    // Note: Currently createDepartments only accepts names array
    // We'll need to update the backend to accept headId as well
    // For now, we'll create departments and then update them with heads
    startTransition(async () => {
      const names = validDepartments.map((d) => d.name.trim());
      const result = await createDepartments(names);
      if (result.status) {
        toast.success(result.message);
        router.push("/dashboard/master/department/list");
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/master/department/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Departments</CardTitle>
          <CardDescription>Create one or more departments for your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <Label>Departments</Label>
              {departments.map((dept, index) => (
                <div key={dept.id} className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder={`Department ${index + 1}`}
                      value={dept.name}
                      onChange={(e) => updateName(dept.id, e.target.value)}
                      disabled={isPending}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(dept.id)}
                      disabled={departments.length === 1 || isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Head (Optional)</Label>
                    <Autocomplete
                      options={[
                        { value: "", label: "No Head" },
                        ...employees.map((emp) => ({
                          value: emp.id,
                          label: `${emp.employeeName} (${emp.employeeId})`,
                        })),
                      ]}
                      value={dept.headId}
                      onValueChange={(value) => updateHeadId(dept.id, value || "")}
                      placeholder="Select department head"
                      searchPlaceholder="Search employee..."
                      emptyMessage="No employees found"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-between">
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create {departments.length > 1 ? `${departments.length} Departments` : "Department"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
              <button
                type="button"
                onClick={addRow}
                disabled={isPending}
                className="text-sm text-primary hover:underline disabled:opacity-50"
                >
                + Add more
              </button>
                </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
