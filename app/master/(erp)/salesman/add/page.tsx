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
import { createSalesmen } from "@/lib/actions/salesman";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { PermissionGuard } from "@/components/auth/permission-guard";

export default function AddSalesmanPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [salesmen, setSalesmen] = useState([{ id: 1, name: "" }]);

  const addRow = () => {
    setSalesmen([...salesmen, { id: Date.now(), name: "" }]);
  };

  const removeRow = (id: number) => {
    if (salesmen.length > 1) {
      setSalesmen(salesmen.filter((d) => d.id !== id));
    }
  };

  const updateName = (id: number, name: string) => {
    setSalesmen(
      salesmen.map((d) => (d.id === id ? { ...d, name } : d))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = salesmen.map((d) => d.name.trim()).filter(Boolean);

    if (names.length === 0) {
      toast.error("Please enter at least one salesman name");
      return;
    }

    startTransition(async () => {
      const result = await createSalesmen(names);
      if (result.status) {
        toast.success(result.message);
        router.push("/master/salesman/list");
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <PermissionGuard permissions="salesman.create">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/master/salesman/list">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Salesmen</CardTitle>
            <CardDescription>
              Create one or more salesmen for your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <Label>Salesman Names</Label>
                {salesmen.map((item, index) => (
                  <div key={item.id} className="flex gap-2">
                    <Input
                      placeholder={`Salesman ${index + 1}`}
                      value={item.name}
                      onChange={(e) => updateName(item.id, e.target.value)}
                      disabled={isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(item.id)}
                      disabled={salesmen.length === 1 || isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-between">
                <div className="flex gap-2">
                  <Button type="submit" disabled={isPending}>
                    {isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Create{" "}
                    {salesmen.length > 1
                      ? `${salesmen.length} Salesmen`
                      : "Salesman"}
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
    </PermissionGuard>
  );
}
