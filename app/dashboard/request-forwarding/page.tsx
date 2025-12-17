"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const approvalLevelTypes = ["Multi Level", "Auto Approval"];
const types = ["Specific Employee", "Department", "All Employees"];
const approvalTypes = ["One Level", "Two Level", "Three Level"];

export default function AttendanceRequestForwardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("exemption");

  const [formData, setFormData] = useState({
    approvalLevelType: "",
    approvalType: "",
    type1: "",
    type2: "",
    type3: "",
    approvalType1: "",
    approvalType2: "",
    approvalType3: "",
  });

  const getLevelCount = () => {
    if (formData.approvalType === "One Level") return 1;
    if (formData.approvalType === "Two Level") return 2;
    if (formData.approvalType === "Three Level") return 3;
    return 0;
  };

  const updateField = (field: string, value: string) => {
    // Reset dynamic fields when approval type changes
    if (field === "approvalType") {
      setFormData((prev) => ({
        ...prev,
        approvalType: value,
        type1: "",
        type2: "",
        type3: "",
        approvalType1: "",
        approvalType2: "",
        approvalType3: "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const validateForm = () => {
    if (!formData.approvalLevelType || !formData.approvalType) {
      return false;
    }
    
    const levelCount = getLevelCount();
    for (let i = 1; i <= levelCount; i++) {
      const typeField = `type${i}` as keyof typeof formData;
      const approvalTypeField = `approvalType${i}` as keyof typeof formData;
      
      if (!formData[typeField] || !formData[approvalTypeField] || !String(formData[approvalTypeField]).trim()) {
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fill all required fields");
      return;
    }

    startTransition(async () => {
      try {
        // TODO: Replace with actual API call
        const levelCount = getLevelCount();
        const submissionData: any = {
          approvalLevelType: formData.approvalLevelType,
          approvalType: formData.approvalType,
        };
        
        for (let i = 1; i <= levelCount; i++) {
          submissionData[`type${i}`] = formData[`type${i}` as keyof typeof formData];
          submissionData[`approvalType${i}`] = formData[`approvalType${i}` as keyof typeof formData];
        }
        
        console.log("Submitting request forwarding:", {
          tab: activeTab,
          ...submissionData,
        });
        
        toast.success(`${activeTab === "exemption" ? "Exemption" : "Attendance"} Request Forwarding submitted successfully`);
        
        // Reset form
        setFormData({
          approvalLevelType: "",
          approvalType: "",
          type1: "",
          type2: "",
          type3: "",
          approvalType1: "",
          approvalType2: "",
          approvalType3: "",
        });
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to submit request forwarding");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Request Forwarding</h2>
        <p className="text-muted-foreground">Manage request forwarding settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="exemption">Exemption Request Forwarding</TabsTrigger>
          
        </TabsList>

        <TabsContent value="exemption">
          <form onSubmit={handleSubmit}>
            <Card>
         
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>
                        Approval Level Type: <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.approvalLevelType}
                        onValueChange={(value) => updateField("approvalLevelType", value)}
                        disabled={isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select approval level type" />
                        </SelectTrigger>
                        <SelectContent>
                          {approvalLevelTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {Array.from({ length: getLevelCount() }).map((_, index) => {
                      const levelNum = index + 1;
                      return (
                        <div key={`type-${levelNum}`} className="space-y-2">
                          <Label>
                            Type: <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={formData[`type${levelNum}` as keyof typeof formData] as string}
                            onValueChange={(value) => updateField(`type${levelNum}`, value)}
                            disabled={isPending}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {types.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>
                        Approval Type: <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.approvalType}
                        onValueChange={(value) => updateField("approvalType", value)}
                        disabled={isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select approval type" />
                        </SelectTrigger>
                        <SelectContent>
                          {approvalTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {Array.from({ length: getLevelCount() }).map((_, index) => {
                      const levelNum = index + 1;
                      return (
                        <div key={`approval-type-${levelNum}`} className="space-y-2">
                          <Label>
                            Approval Type {levelNum}: <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={formData[`approvalType${levelNum}` as keyof typeof formData] as string}
                            onChange={(e) => updateField(`approvalType${levelNum}`, e.target.value)}
                            placeholder={`Enter approval type ${levelNum}`}
                            disabled={isPending}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button type="submit" disabled={isPending} className="bg-green-600 hover:bg-green-700">
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Submit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

  
      </Tabs>
    </div>
  );
}

