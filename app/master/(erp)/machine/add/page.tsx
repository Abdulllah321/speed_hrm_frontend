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
import { createMachines } from "@/lib/actions/machine";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { PermissionGuard } from "@/components/auth/permission-guard";

export default function AddMachinePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [machines, setMachines] = useState([{ id: 1, name: "" }]);

  const addRow = () => {
    setMachines([...machines, { id: Date.now(), name: "" }]);
  };

  const removeRow = (id: number) => {
    if (machines.length > 1) {
      setMachines(machines.filter((d) => d.id !== id));
    }
  };

  const updateName = (id: number, name: string) => {
    setMachines(
      machines.map((d) => (d.id === id ? { ...d, name } : d))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = machines.map((d) => d.name.trim()).filter(Boolean);

    if (names.length === 0) {
      toast.error("Please enter at least one machine name");
      return;
    }

    startTransition(async () => {
      const result = await createMachines(names);
      if (result.status) {
        toast.success(result.message);
        router.push("/master/machine/list");
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    // <PermissionGuard permissions="machine.create">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/master/machine/list">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Machines</CardTitle>
            <CardDescription>
              Create one or more machines for your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <Label>Machine Names</Label>
                {machines.map((item, index) => (
                  <div key={item.id} className="flex gap-2">
                    <Input
                      placeholder={`Machine ${index + 1}`}
                      value={item.name}
                      onChange={(e) => updateName(item.id, e.target.value)}
                      disabled={isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(item.id)}
                      disabled={machines.length === 1 || isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRow}
                  disabled={isPending}
                >
                  Add Another Line
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Machines
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    // </PermissionGuard>
  );
}
