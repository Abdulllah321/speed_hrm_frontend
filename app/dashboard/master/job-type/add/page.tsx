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

export default function AddJobTypePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [jobTypes, setJobTypes] = useState([{ id: 1, name: "" }]);

  const addMoreField = () => {
    setJobTypes([...jobTypes, { id: Date.now(), name: "" }]);
  };

  const removeField = (id: number) => {
    if (jobTypes.length > 1) {
      setJobTypes(jobTypes.filter((j) => j.id !== id));
    }
  };

  const updateField = (id: number, value: string) => {
    setJobTypes(jobTypes.map((j) => (j.id === id ? { ...j, name: value } : j)));
  };

  const clearForm = () => {
    setJobTypes([{ id: 1, name: "" }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validJobTypes = jobTypes.filter((j) => j.name.trim());
    if (validJobTypes.length === 0) {
      toast.error("Please enter at least one job type name");
      return;
    }

    startTransition(async () => {
      try {
        for (const jobType of validJobTypes) {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api"}/job-types`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: jobType.name }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Failed to create job type");
          }
        }
        toast.success(`${validJobTypes.length} job type(s) created successfully`);
        router.push("/dashboard/master/job-type/list");
      } catch (error: any) {
        toast.error(error.message || "Failed to create job type");
      }
    });
  };

  return (
    <div className="w-full px-10">
      <div className="mb-6">
        <Link href="/dashboard/master/job-type/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Job Type</CardTitle>
          <CardDescription>Create new job type(s) for your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {jobTypes.map((jobType, index) => (
              <div key={jobType.id} className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`jobtype-${jobType.id}`}>
                    Job Type Name {jobTypes.length > 1 && `#${index + 1}`}
                  </Label>
                  <Input
                    id={`jobtype-${jobType.id}`}
                    placeholder="Enter job type name"
                    value={jobType.name}
                    onChange={(e) => updateField(jobType.id, e.target.value)}
                    disabled={isPending}
                  />
                </div>
                {jobTypes.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(jobType.id)}
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
              Add More Job Type
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

