"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { createEOBIs } from "@/lib/actions/eobi";
import { toast } from "sonner";
import { ArrowLeft, CalendarIcon, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EOBIRow {
  id: number;
  employerContribution: string;
  employeeContribution: string;
  yearMonth: string;
  selectedDate?: Date;
}

export default function AddEOBIPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [eobis, setEobis] = useState<EOBIRow[]>([
    { id: 1, employerContribution: "", employeeContribution: "", yearMonth: "", selectedDate: undefined },
  ]);

  const addRow = () => {
    setEobis([
      ...eobis,
      { id: Date.now(), employerContribution: "", employeeContribution: "", yearMonth: "", selectedDate: undefined },
    ]);
  };

  const removeRow = (id: number) => {
    if (eobis.length > 1) setEobis(eobis.filter((e) => e.id !== id));
  };

  const updateField = (id: number, field: keyof EOBIRow, value: string | Date | undefined) => {
    setEobis(eobis.map((e) => {
      if (e.id === id) {
        if (field === "selectedDate" && value instanceof Date) {
          // Use the first day of the selected month for consistency
          const firstDayOfMonth = new Date(value.getFullYear(), value.getMonth(), 1);
          const formattedDate = format(firstDayOfMonth, "MMMM yyyy");
          return { ...e, selectedDate: firstDayOfMonth, yearMonth: formattedDate };
        }
        return { ...e, [field]: value };
      }
      return e;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = eobis
      .filter((e) => e.employerContribution && e.employeeContribution && e.yearMonth.trim())
      .map((e) => ({
        name: `EOBI ${e.yearMonth}`, // Auto-generate name from yearMonth
        employerContribution: parseFloat(e.employerContribution),
        employeeContribution: parseFloat(e.employeeContribution),
        yearMonth: e.yearMonth.trim(),
      }));

    if (items.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    startTransition(async () => {
      const result = await createEOBIs(items);
      if (result.status) {
        toast.success(result.message);
        router.push("/master/eobi/list");
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/master/eobi/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add EOBI</CardTitle>
          <CardDescription>Create one or more EOBI records</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {eobis.map((eobi, index) => (
              <div key={eobi.id} className="space-y-4 border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-medium">
                    EOBI {index + 1}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(eobi.id)}
                    disabled={eobis.length === 1 || isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Employer Contribution *</Label>
                    <Input
                      type="number"
                      placeholder="2000"
                      value={eobi.employerContribution}
                      onChange={(e) =>
                        updateField(eobi.id, "employerContribution", e.target.value)
                      }
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Employee Contribution *</Label>
                    <Input
                      type="number"
                      placeholder="400"
                      value={eobi.employeeContribution}
                      onChange={(e) =>
                        updateField(eobi.id, "employeeContribution", e.target.value)
                      }
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Year & Month *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !eobi.selectedDate && "text-muted-foreground"
                          )}
                          disabled={isPending}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {eobi.selectedDate ? (
                            format(eobi.selectedDate, "MMMM yyyy")
                          ) : (
                            <span>Pick a month</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={eobi.selectedDate}
                          onSelect={(date) => updateField(eobi.id, "selectedDate", date)}
                          captionLayout="dropdown"
                          fromYear={2020}
                          toYear={2030}
                          disabled={isPending}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-2 justify-between">
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create {eobis.length > 1 ? `${eobis.length} EOBIs` : "EOBI"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
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
