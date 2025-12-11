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
import { createHoliday } from "@/lib/actions/holiday";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AddHolidayPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: "",
    dateRange: {
      from: new Date(),
      to: new Date(),
    } as DateRange,
    status: "active",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Holiday name is required");
      return;
    }

    if (!formData.dateRange.from || !formData.dateRange.to) {
      toast.error("Both start date and end date are required");
      return;
    }

    // Convert dates to ISO strings
    const dateFrom = formData.dateRange.from.toISOString();
    const dateTo = formData.dateRange.to.toISOString();

    startTransition(async () => {
      const result = await createHoliday({
        name: formData.name,
        dateFrom,
        dateTo,
        status: formData.status,
      });

      if (result.status) {
        toast.success(result.message);
        router.push(`/dashboard/holidays/list?newItemId=${result.data?.id}`);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/holidays/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Holiday</CardTitle>
          <CardDescription>
            Create a new holiday with a date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Holiday Name</Label>
              <Input
                id="name"
                placeholder="e.g., Eid Holiday"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Holiday Date Range</Label>
              <DateRangePicker
                initialDateFrom={formData.dateRange.from}
                initialDateTo={formData.dateRange.to}
                showCompare={false}
                onUpdate={(values) => {
                  if (values.range) {
                    setFormData({
                      ...formData,
                      dateRange: values.range,
                    });
                  }
                }}
                dateRange={{
                  oldestDate: new Date(2020, 0, 1),
                  latestDate: new Date(2100, 11, 31),
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                disabled={isPending}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Holiday
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
