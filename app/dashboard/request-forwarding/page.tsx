"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, CheckCircle2 } from "lucide-react";
import { getEmployeesForDropdown, type EmployeeDropdownOption } from "@/lib/actions/employee";
import { getDepartments, type Department } from "@/lib/actions/department";
import { toast } from "sonner";
import { RequestForwardingForm, type RequestType, type RequestForwardingFormData } from "@/components/request-forwarding/request-forwarding-form";

export default function RequestForwardingPage() {
  const [activeTab, setActiveTab] = useState<RequestType>("exemption");

  const [employees, setEmployees] = useState<EmployeeDropdownOption[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Separate form data for each request type
  const [exemptionFormData, setExemptionFormData] = useState<RequestForwardingFormData>({
    approvalFlow: "auto-approved",
    levels: [],
  });

  const [attendanceFormData, setAttendanceFormData] = useState<RequestForwardingFormData>({
    approvalFlow: "auto-approved",
    levels: [],
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [employeesResult, departmentsResult] = await Promise.all([
          getEmployeesForDropdown(),
          getDepartments(),
        ]);

        if (employeesResult.status && employeesResult.data) {
          setEmployees(employeesResult.data);
        }

        if (departmentsResult.status && departmentsResult.data) {
          setDepartments(departmentsResult.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Wrapper functions for form data updates
  const handleExemptionFormDataChange = (updates: Partial<RequestForwardingFormData>) => {
    setExemptionFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleAttendanceFormDataChange = (updates: Partial<RequestForwardingFormData>) => {
    setAttendanceFormData((prev) => ({ ...prev, ...updates }));
  };

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
    },
    {
      value: "attendance" as RequestType,
      label: "Attendance Request Forwarding",
      icon: CheckCircle2,
      title: "Attendance Request Forwarding Configuration",
      description: "Set up approval workflows for attendance requests",
      formData: attendanceFormData,
      onFormDataChange: handleAttendanceFormDataChange,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Request Forwarding</h2>
        <p className="text-muted-foreground">Configure approval workflows for different request types</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RequestType)} className="w-full">
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
              <RequestForwardingForm
                requestType={tab.value}
                formData={tab.formData}
                onFormDataChange={tab.onFormDataChange}
                employees={employees}
                departments={departments}
                loadingData={loadingData}
                title={tab.title}
                description={tab.description}
                icon={Icon}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
