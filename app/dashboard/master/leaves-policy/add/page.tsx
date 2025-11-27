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
import { ArrowLeft, UserPlus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

const leaveTypeOptions = [
  "Annual",
  "Casual",
  "Sick",
  "Paternity Leave",
  "Other",
  "Carry Forward",
  "Bereavement Leave",
  "Religious Leave",
];

export default function AddLeavesPolicyPage() {
  const [formData, setFormData] = useState({
    policyName: "",
    dateFrom: "",
    dateTill: "",
    fullDayRate: "",
    halfDayRate: "",
    shortLeaveRate: "",
  });

  const [leaveAllocations, setLeaveAllocations] = useState([
    { id: 1, leaveType: "", noOfLeaves: "" },
  ]);

  const addMoreLeaveType = () => {
    setLeaveAllocations([
      ...leaveAllocations,
      { id: Date.now(), leaveType: "", noOfLeaves: "" },
    ]);
  };

  const removeLeaveAllocation = (id: number) => {
    if (leaveAllocations.length > 1) {
      setLeaveAllocations(leaveAllocations.filter((la) => la.id !== id));
    }
  };

  const updateLeaveAllocation = (id: number, field: string, value: string) => {
    setLeaveAllocations(
      leaveAllocations.map((la) =>
        la.id === id ? { ...la, [field]: value } : la
      )
    );
  };

  const totalLeaves = leaveAllocations.reduce(
    (sum, la) => sum + (parseInt(la.noOfLeaves) || 0),
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.policyName || !formData.dateFrom || !formData.dateTill) {
      toast.error("Please fill all required fields");
      return;
    }
    toast.success("Leave policy created successfully");
  };

  const handleClear = () => {
    setFormData({
      policyName: "",
      dateFrom: "",
      dateTill: "",
      fullDayRate: "",
      halfDayRate: "",
      shortLeaveRate: "",
    });
    setLeaveAllocations([{ id: 1, leaveType: "", noOfLeaves: "" }]);
  };

  // Get already selected leave types
  const selectedTypes = leaveAllocations
    .map((la) => la.leaveType)
    .filter(Boolean);

  return (
    <div className="w-full px-10">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Link href="/dashboard/master/leaves-policy/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
        <Link href="/dashboard/master/leaves-policy/manual-leaves">
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Manual Leaves
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Leaves Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="policyName">Leaves Policy Name *</Label>
                <Input
                  id="policyName"
                  value={formData.policyName}
                  onChange={(e) =>
                    setFormData({ ...formData, policyName: e.target.value })
                  }
                  placeholder="Enter policy name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFrom">Policy Date From *</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={formData.dateFrom}
                  onChange={(e) =>
                    setFormData({ ...formData, dateFrom: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTill">Policy Date Till *</Label>
                <Input
                  id="dateTill"
                  type="date"
                  value={formData.dateTill}
                  onChange={(e) =>
                    setFormData({ ...formData, dateTill: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullDayRate">Full Day Deduction Rate *</Label>
                <Input
                  id="fullDayRate"
                  type="number"
                  step="0.01"
                  value={formData.fullDayRate}
                  onChange={(e) =>
                    setFormData({ ...formData, fullDayRate: e.target.value })
                  }
                  placeholder="e.g., 1.0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="halfDayRate">Half Day Deduction Rate *</Label>
                <Input
                  id="halfDayRate"
                  type="number"
                  step="0.01"
                  value={formData.halfDayRate}
                  onChange={(e) =>
                    setFormData({ ...formData, halfDayRate: e.target.value })
                  }
                  placeholder="e.g., 0.5"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="shortLeaveRate">
                  Short Leave Deduction Rate *
                </Label>
                <Input
                  id="shortLeaveRate"
                  type="number"
                  step="0.01"
                  value={formData.shortLeaveRate}
                  onChange={(e) =>
                    setFormData({ ...formData, shortLeaveRate: e.target.value })
                  }
                  placeholder="e.g., 0.25"
                  required
                />
              </div>
            </div>

            {/* Leave Types Section */}
            <div className="space-y-4">
              {leaveAllocations.map((la, index) => (
                <div
                  key={la.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 flex-1 w-full">
                    <div className="space-y-2">
                      <Label>
                        Leaves Type: <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={la.leaveType}
                        onValueChange={(value) =>
                          updateLeaveAllocation(la.id, "leaveType", value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {leaveTypeOptions
                            .filter(
                              (type) =>
                                !selectedTypes.includes(type) ||
                                type === la.leaveType
                            )
                            .map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        No. of Leaves:{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        value={la.noOfLeaves}
                        onChange={(e) =>
                          updateLeaveAllocation(
                            la.id,
                            "noOfLeaves",
                            e.target.value
                          )
                        }
                        placeholder="Enter number"
                      />
                    </div>
                  </div>
                  {leaveAllocations.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 mt-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeLeaveAllocation(la.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {/* Total */}
              <div className="flex items-center justify-end gap-4 pt-2">
                <Label className="font-semibold">Total</Label>
                <div className="w-32 sm:w-48 h-10 bg-muted rounded-md flex items-center justify-center font-medium">
                  {totalLeaves}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 justify-center sm:justify-end">
              <Button
                type="button"
                variant="default"
                onClick={addMoreLeaveType}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More Leaves Type
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
              >
                Submit
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleClear}
                className="w-full sm:w-auto"
              >
                Clear Form
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
