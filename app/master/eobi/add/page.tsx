"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, startTransition, addTransitionType } from "react";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AddEOBIPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    employerContribution: "",
    employeeContribution: "",
    region: "Punjab",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employerContribution || !formData.employeeContribution) {
      toast.error("Please fill in all required fields");
      return;
    }

    const employerContribution = parseFloat(formData.employerContribution);
    const employeeContribution = parseFloat(formData.employeeContribution);

    if (isNaN(employerContribution) || isNaN(employeeContribution)) {
      toast.error("Please enter valid contribution amounts");
      return;
    }

    // Create EOBI records for each selected month
    const items = [
      {
        name: `EOBI (${formData.region})`,
        employerContribution,
        employeeContribution,
        yearMonth: "Continuous",
        region: formData.region,
      },
    ];

    startTransition(async () => {
      const result = await createEOBIs(items);
      if (result.status) {
        toast.success(result.message);
        startTransition(() => {
          addTransitionType("nav-back");
          router.push("/master/eobi/list");
        });
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/master/eobi/list" transitionTypes={["nav-back"]}>
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
            <div className="space-y-4 border rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employerContribution">
                    Employer Contribution <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="employerContribution"
                    type="number"
                    placeholder="2000"
                    value={formData.employerContribution}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, employerContribution: e.target.value }))
                    }
                    disabled={isPending}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeContribution">
                    Employee Contribution <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="employeeContribution"
                    type="number"
                    placeholder="400"
                    value={formData.employeeContribution}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, employeeContribution: e.target.value }))
                    }
                    disabled={isPending}
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="region">
                    Region <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.region}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, region: val }))}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select EOBI Region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Punjab">Punjab</SelectItem>
                      <SelectItem value="Sindh">Sindh</SelectItem>
                      <SelectItem value="Islamabad">Islamabad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  startTransition(() => {
                    addTransitionType("nav-back");
                    router.back();
                  });
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create EOBI
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
