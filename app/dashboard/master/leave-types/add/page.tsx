"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

export default function AddLeaveTypePage() {
  const [leaveTypes, setLeaveTypes] = useState([{ id: 1, name: "" }]);

  const addMore = () => {
    setLeaveTypes([...leaveTypes, { id: Date.now(), name: "" }]);
  };

  const removeLeaveType = (id: number) => {
    if (leaveTypes.length > 1) {
      setLeaveTypes(leaveTypes.filter((lt) => lt.id !== id));
    }
  };

  const updateLeaveType = (id: number, name: string) => {
    setLeaveTypes(leaveTypes.map((lt) => (lt.id === id ? { ...lt, name } : lt)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validTypes = leaveTypes.filter((lt) => lt.name.trim());
    if (validTypes.length === 0) {
      toast.error("Please enter at least one leave type");
      return;
    }
    toast.success(`${validTypes.length} leave type(s) created successfully`);
  };

  const handleClear = () => {
    setLeaveTypes([{ id: 1, name: "" }]);
  };

  return (
    <div className="w-full px-10">
      <div className="mb-6">
        <Link href="/dashboard/master/leave-types/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Leave Type</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {leaveTypes.map((lt, index) => (
              <div key={lt.id} className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`leave-type-${lt.id}`}>
                    Leave Type Name {leaveTypes.length > 1 && `#${index + 1}`}
                  </Label>
                  <Input
                    id={`leave-type-${lt.id}`}
                    value={lt.name}
                    onChange={(e) => updateLeaveType(lt.id, e.target.value)}
                    placeholder="Enter leave type name"
                  />
                </div>
                {leaveTypes.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLeaveType(lt.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex gap-2 pt-4">
              <Button type="submit">Submit</Button>
              <Button type="button" variant="outline" onClick={handleClear}>
                Clear
              </Button>
              <Button type="button" variant="secondary" onClick={addMore}>
                <Plus className="h-4 w-4 mr-2" />
                Add More Leave Type
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

