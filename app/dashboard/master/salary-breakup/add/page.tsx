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
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

type SalaryBreakupEntry = {
  id: number;
  typeName: string;
  percent: string;
  isTaxable: string;
};

export default function AddSalaryBreakupPage() {
  const [entries, setEntries] = useState<SalaryBreakupEntry[]>([
    { id: 1, typeName: "", percent: "", isTaxable: "" },
  ]);

  const addMore = () => {
    setEntries([...entries, { id: Date.now(), typeName: "", percent: "", isTaxable: "" }]);
  };

  const removeEntry = (id: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  const updateEntry = (id: number, field: keyof SalaryBreakupEntry, value: string) => {
    setEntries(entries.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = entries.filter((e) => e.typeName && e.percent && e.isTaxable);
    if (valid.length === 0) {
      toast.error("Please fill all required fields");
      return;
    }
    toast.success(`${valid.length} salary breakup(s) created successfully`);
  };

  const handleClear = () => {
    setEntries([{ id: 1, typeName: "", percent: "", isTaxable: "" }]);
  };

  return (
    <div className="w-full px-10">
      <div className="mb-6">
        <Link href="/dashboard/master/salary-breakup/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Salary Breakup</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-end gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                  <div className="space-y-2">
                    <Label>
                      Type Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={entry.typeName}
                      onChange={(e) => updateEntry(entry.id, "typeName", e.target.value)}
                      placeholder="e.g., Basic, House Rent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Percent (%) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={entry.percent}
                      onChange={(e) => updateEntry(entry.id, "percent", e.target.value)}
                      placeholder="e.g., 10, 20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Is Taxable <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={entry.isTaxable}
                      onValueChange={(value) => updateEntry(entry.id, "isTaxable", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {entries.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeEntry(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={addMore}>
                <Plus className="h-4 w-4 mr-2" />
                Add More
              </Button>
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

