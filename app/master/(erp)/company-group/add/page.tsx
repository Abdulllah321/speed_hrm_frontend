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
import { createCompanyGroups } from "@/lib/actions/company-group";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
// import { PermissionGuard } from "@/components/auth/permission-guard";

export default function AddCompanyGroupPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState([{ id: 1, name: "" }]);

  const addRow = () => {
    setItems([...items, { id: Date.now(), name: "" }]);
  };

  const removeRow = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter((d) => d.id !== id));
    }
  };

  const updateName = (id: number, name: string) => {
    setItems(
      items.map((d) => (d.id === id ? { ...d, name } : d))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = items.map((d) => d.name.trim()).filter(Boolean);

    if (names.length === 0) {
      toast.error("Please enter at least one name");
      return;
    }

    startTransition(async () => {
      const result = await createCompanyGroups(names);
      if (result.status) {
        toast.success(result.message);
        router.push("/master/company-group/list");
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    // <PermissionGuard permissions="master.company-group.create">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/master/company-group/list">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Company Groups</CardTitle>
            <CardDescription>
              Create one or more company groups for your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <Label>Company Group Names</Label>
                {items.map((item, index) => (
                  <div key={item.id} className="flex gap-2">
                    <Input
                      placeholder={`Company Group ${index + 1}`}
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
                  Save Company Groups
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    // </PermissionGuard>
  );
}
