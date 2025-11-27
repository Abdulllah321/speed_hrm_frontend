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
import { createEOBIs } from "@/lib/actions/eobi";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";

interface EOBIRow {
  id: number;
  name: string;
  amount: string;
  yearMonth: string;
}

export default function AddEOBIPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [eobis, setEobis] = useState<EOBIRow[]>([
    { id: 1, name: "", amount: "", yearMonth: "" },
  ]);

  const addRow = () => {
    setEobis([
      ...eobis,
      { id: Date.now(), name: "", amount: "", yearMonth: "" },
    ]);
  };

  const removeRow = (id: number) => {
    if (eobis.length > 1) setEobis(eobis.filter((e) => e.id !== id));
  };

  const updateField = (id: number, field: keyof EOBIRow, value: string) => {
    setEobis(eobis.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = eobis
      .filter((e) => e.name.trim() && e.amount && e.yearMonth.trim())
      .map((e) => ({
        name: e.name.trim(),
        amount: parseFloat(e.amount),
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
        router.push("/dashboard/master/eobi/list");
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/master/eobi/list">
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
                    <Label>Name *</Label>
                    <Input
                      placeholder="EOBI name"
                      value={eobi.name}
                      onChange={(e) =>
                        updateField(eobi.id, "name", e.target.value)
                      }
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      placeholder="500"
                      value={eobi.amount}
                      onChange={(e) =>
                        updateField(eobi.id, "amount", e.target.value)
                      }
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Year & Month *</Label>
                    <Input
                      placeholder="January 2024"
                      value={eobi.yearMonth}
                      onChange={(e) =>
                        updateField(eobi.id, "yearMonth", e.target.value)
                      }
                      disabled={isPending}
                    />
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
