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
import { createUom } from "@/lib/actions/uom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { PermissionGuard } from "@/components/auth/permission-guard";

export default function AddUomPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState([{ id: 1, name: "" }]);

  const addRow = () => {
    setItems([...items, { id: Date.now(), name: "" }]);
  };

  const removeRow = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter((i) => i.id !== id));
    }
  };

  const updateField = (id: number, value: string) => {
    setItems(items.map((i) => (i.id === id ? { ...i, name: value } : i)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeItems = items.filter((i) => i.name.trim());

    if (activeItems.length === 0) {
      toast.error("Please enter at least one UOM name");
      return;
    }

    startTransition(async () => {
      let successCount = 0;
      for (const item of activeItems) {
        const result = await createUom({ name: item.name.trim() });
        if (result.status) {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} units of measurement`);
        router.push("/master/unit-of-measurement/list");
      } else {
        toast.error("Failed to create UOMs");
      }
    });
  };

  return (
    <PermissionGuard permissions="erp.uom.create">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/master/unit-of-measurement/list">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Units of Measurement</CardTitle>
            <CardDescription>Create one or more units of measurement</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <Label>UOM Names</Label>
                {items.map((item, index) => (
                  <div key={item.id} className="flex gap-2">
                    <Input
                      placeholder={`UOM Name ${index + 1}`}
                      value={item.name}
                      onChange={(e) => updateField(item.id, e.target.value)}
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
                    Create {items.length > 1 ? `${items.length} Units` : "Unit"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
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
    </PermissionGuard>
  );
}
