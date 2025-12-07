"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createBonusTypes } from "@/lib/actions/bonus-type";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";

export default function AddBonusTypePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState([{ id: 1, name: "" }]);

  const addRow = () => {
    setItems([...items, { id: Date.now(), name: "" }]);
  };

  const removeRow = (id: number) => {
    if (items.length > 1) setItems(items.filter((it) => it.id !== id));
  };

  const updateName = (id: number, name: string) => {
    setItems(items.map((it) => (it.id === id ? { ...it, name } : it)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = items.map((it) => ({ name: it.name.trim() })).filter((it) => it.name);
    if (!payload.length) {
      toast.error("Please enter at least one bonus type name");
      return;
    }

    startTransition(async () => {
      const result = await createBonusTypes(payload);
      if (result.status) {
        toast.success(result.message);
        router.push("/dashboard/master/bonus-types/list");
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/master/bonus-types/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Bonus Types</CardTitle>
          <CardDescription>Create one or more bonus types for your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <Label>Bonus Type Names</Label>
              {items.map((item, index) => (
                <div key={item.id} className="flex gap-2">
                  <Input
                    placeholder={`Bonus Type ${index + 1}`}
                    value={item.name}
                    onChange={(e) => updateName(item.id, e.target.value)}
                    disabled={isPending}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(item.id)}
                    disabled={items.length === 1 || isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-between">
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create {items.length > 1 ? `${items.length} Bonus Types` : "Bonus Type"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              </div>
              <button type="button" onClick={addRow} disabled={isPending} className="text-sm text-primary hover:underline disabled:opacity-50">
                + Add more
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

