"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

export default function AddLoanTypePage() {
  const [loanTypes, setLoanTypes] = useState([{ id: 1, name: "" }]);

  const addMore = () => {
    setLoanTypes([...loanTypes, { id: Date.now(), name: "" }]);
  };

  const removeLoanType = (id: number) => {
    if (loanTypes.length > 1) {
      setLoanTypes(loanTypes.filter((lt) => lt.id !== id));
    }
  };

  const updateLoanType = (id: number, name: string) => {
    setLoanTypes(loanTypes.map((lt) => (lt.id === id ? { ...lt, name } : lt)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validTypes = loanTypes.filter((lt) => lt.name.trim());
    if (validTypes.length === 0) {
      toast.error("Please enter at least one loan type");
      return;
    }
    toast.success(`${validTypes.length} loan type(s) created successfully`);
  };

  const handleClear = () => {
    setLoanTypes([{ id: 1, name: "" }]);
  };

  return (
      <div className="w-full px-4">
      <div className="mb-6">
        <Link href="/dashboard/master/loan-types/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Loan Type</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {loanTypes.map((lt, index) => (
              <div key={lt.id} className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`loan-type-${lt.id}`}>
                    Loan Type Name {loanTypes.length > 1 && `#${index + 1}`}
                  </Label>
                  <Input
                    id={`loan-type-${lt.id}`}
                    value={lt.name}
                    onChange={(e) => updateLoanType(lt.id, e.target.value)}
                    placeholder="Enter loan type name"
                  />
                </div>
                {loanTypes.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLoanType(lt.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex gap-2 pt-4">
              <Button type="submit">Submit</Button>
              <Button type="button" variant="outline" onClick={handleClear}>
                Clear
              </Button>
              <Button type="button" variant="secondary" onClick={addMore}>
                <Plus className="h-4 w-4 mr-2" />
                Add More Loan Type
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

