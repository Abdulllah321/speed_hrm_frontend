"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, CheckCircle2 } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<RequestType>(initialRequestType);
  
  // Store configs for both tabs (initially only active tab has data)
  const [exemptionConfig, setExemptionConfig] = useState<RequestForwardingConfiguration | null>(
    initialRequestType === "exemption" ? initialConfig : null
  );
  const [attendanceConfig, setAttendanceConfig] = useState<RequestForwardingConfiguration | null>(
    initialRequestType === "attendance" ? initialConfig : null
  );

  // Sync activeTab with URL searchParams and update configs when props change
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam === "exemption" || typeParam === "attendance") {
      setActiveTab(typeParam);
    }
    
    // Update configs when initialConfig changes (after server refetch)
    if (initialRequestType === "exemption") {
      setExemptionConfig(initialConfig);
    } else if (initialRequestType === "attendance") {
      setAttendanceConfig(initialConfig);
    }
  }, [searchParams, initialRequestType, initialConfig]);

  // Update URL when tab changes (triggers server-side refetch)
  const handleTabChange = (value: RequestType) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", value);
    router.push(`/dashboard/request-forwarding?${params.toString()}`, { scroll: false });
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
        approverType: level.approverType as any,
        departmentHeadMode: level.departmentHeadMode as "auto" | "specific" | undefined,
        specificEmployeeId: level.specificEmployeeId || undefined,
        departmentId: level.departmentId || undefined,
        subDepartmentId: level.subDepartmentId || undefined,
      })),
    };
  };

  const [exemptionFormData, setExemptionFormData] = useState<RequestForwardingFormData>(
    getInitialFormData(exemptionConfig)
  );

  const [attendanceFormData, setAttendanceFormData] = useState<RequestForwardingFormData>(
    getInitialFormData(attendanceConfig)
  );

  // Wrapper functions for form data updates - memoized to prevent unnecessary re-renders
  const handleExemptionFormDataChange = useCallback((updates: Partial<RequestForwardingFormData>) => {
    setExemptionFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleAttendanceFormDataChange = useCallback((updates: Partial<RequestForwardingFormData>) => {
    setAttendanceFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Tab configuration
  const tabs = [
    {
      value: "exemption" as RequestType,
      label: "Exception Request Forwarding",
      icon: Settings,
      title: "Exception Request Forwarding Configuration",
      description: "Set up approval workflows for exception requests",
      formData: exemptionFormData,
      onFormDataChange: handleExemptionFormDataChange,
      config: exemptionConfig,
    },
    {
      value: "attendance" as RequestType,
      label: "Attendance Request Forwarding",
      icon: CheckCircle2,
      title: "Attendance Request Forwarding Configuration",
      description: "Set up approval workflows for attendance requests",
      formData: attendanceFormData,
      onFormDataChange: handleAttendanceFormDataChange,
      config: attendanceConfig,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Request Forwarding</h2>
        <p className="text-muted-foreground">Configure approval workflows for different request types</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as RequestType)} className="w-full">
        <TabsList variant="card" className="grid w-full max-w-2xl grid-cols-2">
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
                  formData={tab.formData}
                  onFormDataChange={tab.onFormDataChange}
                  employees={employees}
                  departments={departments}
                  loadingData={false}
                  title={tab.title}
                  description={tab.description}
                  icon={Icon}
                  initialConfigId={tab.config?.id || null}
                  initialConfigLoaded={!!tab.config}
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
