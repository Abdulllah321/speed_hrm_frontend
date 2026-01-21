"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Employee } from "@/lib/api";
import { Clock, Calendar } from "lucide-react";

interface PoliciesContentProps {
    employee: Employee | null;
}

export function PoliciesContent({ employee }: PoliciesContentProps) {
    if (!employee) {
        return <div className="text-muted-foreground">Loading policies information...</div>;
    }
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            Working Hours Policy
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {employee.workingHoursPolicyRelation?.name || "N/A"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Assigned Schedule
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            Leaves Policy
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {employee.leavesPolicyRelation?.name || "N/A"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Assigned Leave Rules
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
