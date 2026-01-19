"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, DollarSign, CreditCard, Clock, Wallet } from "lucide-react";
import { RequestForwardingForm, type RequestType, type RequestForwardingFormData } from "@/components/request-forwarding/request-forwarding-form";
import { type EmployeeDropdownOption } from "@/lib/actions/employee";
import { type Department } from "@/lib/actions/department";
import { type RequestForwardingConfiguration } from "@/lib/actions/request-forwarding";

interface RequestForwardingClientProps {
  employees: EmployeeDropdownOption[];
  departments: Department[];
  initialRequestType: RequestType;
  initialConfig: RequestForwardingConfiguration | null;
}

export function RequestForwardingClient({
  employees,
  departments,
  initialRequestType,
  initialConfig,
}: RequestForwardingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const activeTab: RequestType =
    typeParam === "attendance" ||
    typeParam === "advance-salary" ||
    typeParam === "loan" ||
    typeParam === "leave-application" ||
    typeParam === "leave-encashment"
      ? typeParam
      : initialRequestType;

  // Update URL when tab changes (triggers server-side refetch)
  const handleTabChange = (value: RequestType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", value);
    router.push(`/hr/request-forwarding?${params.toString()}`, { scroll: false });
  };

  // Initialize form data from server-side fetched configs
  const getInitialFormData = (config: RequestForwardingConfiguration | null): RequestForwardingFormData => {
    if (!config) {
      return {
        approvalFlow: "auto-approved",
        levels: [],
      };
    }

    return {
      approvalFlow: config.approvalFlow as "auto-approved" | "multi-level",
      levels: config.approvalLevels.map((level) => ({
        level: level.level,
        approverType: level.approverType as RequestForwardingFormData["levels"][number]["approverType"],
        departmentHeadMode: level.departmentHeadMode as "auto" | "specific" | undefined,
        specificEmployeeId: level.specificEmployeeId || undefined,
        departmentId: level.departmentId || undefined,
        subDepartmentId: level.subDepartmentId || undefined,
      })),
    };
  };

  const [formData, setFormData] = useState<RequestForwardingFormData>(() => getInitialFormData(initialConfig));
  const handleFormDataChange = useCallback((updates: Partial<RequestForwardingFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Tab configuration
  const tabs = [
    {
      value: "attendance" as RequestType,
      label: "Attendance",
      icon: CheckCircle2,
      title: "Attendance Request Forwarding Configuration",
      description: "Set up approval workflows for attendance requests",
    },
    {
      value: "advance-salary" as RequestType,
      label: "Advance Salary",
      icon: DollarSign,
      title: "Advance Salary Request Forwarding Configuration",
      description: "Set up approval workflows for advance salary requests",
    },
    {
      value: "loan" as RequestType,
      label: "Loan",
      icon: CreditCard,
      title: "Loan Request Forwarding Configuration",
      description: "Set up approval workflows for loan requests",
    },
    {
      value: "leave-application" as RequestType,
      label: "Leave",
      icon: Clock,
      title: "Leave Application Request Forwarding Configuration",
      description: "Set up approval workflows for leave applications",
    },
    {
      value: "leave-encashment" as RequestType,
      label: "Leave Encashment",
      icon: Wallet,
      title: "Leave Encashment Request Forwarding Configuration",
      description: "Set up approval workflows for leave encashment requests",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Request Forwarding</h2>
        <p className="text-muted-foreground">Configure approval workflows for different request types</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as RequestType)} className="w-full">
        <TabsList variant="card" className="grid w-full max-w-6xl grid-cols-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsContent key={tab.value} value={tab.value} className="mt-6">
              {activeTab === tab.value && (
                <RequestForwardingForm
                  requestType={tab.value}
                  formData={formData}
                  onFormDataChange={handleFormDataChange}
                  employees={employees}
                  departments={departments}
                  loadingData={false}
                  title={tab.title}
                  description={tab.description}
                  icon={Icon}
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
