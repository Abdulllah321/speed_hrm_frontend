"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";

export default function AddDesignationPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [designations, setDesignations] = useState([{ id: 1, name: "" }]);

  const addMoreField = () => {
    setDesignations([...designations, { id: Date.now(), name: "" }]);
  };

  const removeField = (id: number) => {
    if (designations.length > 1) {
      setDesignations(designations.filter((d) => d.id !== id));
    }
  };

  const updateField = (id: number, value: string) => {
    setDesignations(designations.map((d) => (d.id === id ? { ...d, name: value } : d)));
  };

  const clearForm = () => {
    setDesignations([{ id: 1, name: "" }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validDesignations = designations.filter((d) => d.name.trim());
    if (validDesignations.length === 0) {
      toast.error("Please enter at least one designation name");
      return;
    }

    startTransition(async () => {
      try {
        // TODO: Replace with actual API call
        // For now, simulating API call
        for (const designation of validDesignations) {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api"}/designations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: designation.name }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Failed to create designation");
          }
        }
        toast.success(`${validDesignations.length} designation(s) created successfully`);
        router.push("/dashboard/master/designation/list");
      } catch (error: any) {
        toast.error(error.message || "Failed to create designation");
      }
    });
  };

  return (
    <div className="w-full px-10">
      <div className="mb-6">
        <Link href="/dashboard/master/designation/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Designation</CardTitle>
          <CardDescription>Create new designation(s) for your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {designations.map((designation, index) => (
              <div key={designation.id} className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`designation-${designation.id}`}>
                    Designation Name {designations.length > 1 && `#${index + 1}`}
                  </Label>
                  <Input
                    id={`designation-${designation.id}`}
                    placeholder="Enter designation name"
                    value={designation.name}
                    onChange={(e) => updateField(designation.id, e.target.value)}
                    disabled={isPending}
                  />
                </div>
                {designations.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(designation.id)}
                    disabled={isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addMoreField}
              disabled={isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add More Designation
            </Button>

            <div className="flex gap-2 pt-4 border-t">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit
              </Button>
              <Button type="button" variant="outline" onClick={clearForm} disabled={isPending}>
                Clear Form
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

