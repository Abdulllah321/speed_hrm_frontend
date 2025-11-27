"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { ArrowLeft, CalendarIcon, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type TaxEntry = {
  id: number;
  taxName: string;
  salaryFrom: string;
  salaryTo: string;
  percentage: string;
  amountPerYear: string;
  monthYear: Date | undefined;
};

export default function AddTaxPage() {
  const [taxes, setTaxes] = useState<TaxEntry[]>([
    {
      id: 1,
      taxName: "",
      salaryFrom: "",
      salaryTo: "",
      percentage: "",
      amountPerYear: "",
      monthYear: undefined,
    },
  ]);

  const addMoreTax = () => {
    setTaxes([
      ...taxes,
      {
        id: Date.now(),
        taxName: "",
        salaryFrom: "",
        salaryTo: "",
        percentage: "",
        amountPerYear: "",
        monthYear: undefined,
      },
    ]);
  };

  const removeTax = (id: number) => {
    if (taxes.length > 1) {
      setTaxes(taxes.filter((t) => t.id !== id));
    }
  };

  const updateTax = (id: number, field: keyof TaxEntry, value: string | Date | undefined) => {
    setTaxes(taxes.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validTaxes = taxes.filter((t) => t.taxName && t.salaryFrom && t.salaryTo && t.percentage);
    if (validTaxes.length === 0) {
      toast.error("Please fill all required fields");
      return;
    }
    toast.success(`${validTaxes.length} tax(es) created successfully`);
  };

  const handleClear = () => {
    setTaxes([
      {
        id: 1,
        taxName: "",
        salaryFrom: "",
        salaryTo: "",
        percentage: "",
        amountPerYear: "",
        monthYear: undefined,
      },
    ]);
  };

  return (
    <div className="w-full px-10">
      <div className="mb-6">
        <Link href="/dashboard/master/tax-slabs/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Taxes Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {taxes.map((tax, index) => (
              <div key={tax.id} className="relative border rounded-lg p-4 space-y-4">
                {taxes.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeTax(tax.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Tax Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={tax.taxName}
                      onChange={(e) => updateTax(tax.id, "taxName", e.target.value)}
                      placeholder="Enter tax name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Monthly Salary Range From <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={tax.salaryFrom}
                      onChange={(e) => updateTax(tax.id, "salaryFrom", e.target.value)}
                      placeholder="e.g., 50000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Monthly Salary Range To <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={tax.salaryTo}
                      onChange={(e) => updateTax(tax.id, "salaryTo", e.target.value)}
                      placeholder="e.g., 100000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Percentage of Tax <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tax.percentage}
                      onChange={(e) => updateTax(tax.id, "percentage", e.target.value)}
                      placeholder="e.g., 5.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tax Amount Per Year</Label>
                    <Input
                      type="number"
                      value={tax.amountPerYear}
                      onChange={(e) => updateTax(tax.id, "amountPerYear", e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Tax Month & Year <span className="text-destructive">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !tax.monthYear && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {tax.monthYear ? format(tax.monthYear, "MMMM yyyy") : "Select month & year"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={tax.monthYear}
                          onSelect={(date) => updateTax(tax.id, "monthYear", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-4 justify-center sm:justify-end">
              <Button type="button" variant="default" onClick={addMoreTax} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add More Taxes
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                Submit
              </Button>
              <Button type="button" variant="secondary" onClick={handleClear} className="w-full sm:w-auto">
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

