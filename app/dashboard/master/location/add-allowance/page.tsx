"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const departments = ["HR", "IT", "Finance", "Marketing", "Operations"];
const subDepartments: Record<string, string[]> = {
  HR: ["Recruitment", "Payroll", "Training"],
  IT: ["Development", "Support", "Infrastructure"],
  Finance: ["Accounts", "Audit", "Tax"],
  Marketing: ["Digital", "Brand", "PR"],
  Operations: ["Logistics", "Quality", "Production"],
};
const employees = [
  { id: 1, name: "John Doe" },
  { id: 2, name: "Jane Smith" },
  { id: 3, name: "Mike Johnson" },
  { id: 4, name: "Sarah Williams" },
];

export default function AddLocationAllowancePage() {
  const [formData, setFormData] = useState({
    department: "",
    subDepartment: "",
    employee: "",
    station: "",
    amount: "",
  });

  const availableSubDepts = formData.department
    ? subDepartments[formData.department] || []
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.department || !formData.subDepartment || !formData.employee || !formData.station || !formData.amount) {
      toast.error("Please fill all required fields");
      return;
    }
    toast.success("Location allowance created successfully");
    handleClear();
  };

  const handleClear = () => {
    setFormData({
      department: "",
      subDepartment: "",
      employee: "",
      station: "",
      amount: "",
    });
  };

  return (
    <div className="w-full px-10">
      <div className="mb-6">
        <Link href="/dashboard/master/location/list-allowance">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Location Allowance</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Department <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) =>
                    setFormData({ ...formData, department: value, subDepartment: "" })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Sub Department <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.subDepartment}
                  onValueChange={(value) =>
                    setFormData({ ...formData, subDepartment: value })
                  }
                  disabled={!formData.department}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={formData.department ? "Select Sub Department" : "Select department first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubDepts.map((subDept) => (
                      <SelectItem key={subDept} value={subDept}>
                        {subDept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Employee <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.employee}
                  onValueChange={(value) =>
                    setFormData({ ...formData, employee: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Station <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.station}
                  onValueChange={(value) =>
                    setFormData({ ...formData, station: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Station" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_station">IN Station</SelectItem>
                    <SelectItem value="out_station">OUT Station</SelectItem>
                    <SelectItem value="in_station_food_fuel">IN Station Food/Fuel</SelectItem>
                    <SelectItem value="out_station_food_fuel">OUT Station Food/Fuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>
                  Allowance Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter amount"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit">Submit</Button>
              <Button type="button" variant="outline" onClick={handleClear}>
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

