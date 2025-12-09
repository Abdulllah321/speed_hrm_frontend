"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2, FileText, Printer } from "lucide-react";
import Link from "next/link";
import { getExitClearanceById, type ExitClearance } from "@/lib/actions/exit-clearance";

export default function ViewExitClearancePage() {
  const params = useParams();
  const router = useRouter();
  const clearanceId = params.id as string;
  const [clearance, setExitClearance] = useState<ExitClearance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExitClearance = async () => {
      try {
        setLoading(true);
        const result = await getExitClearanceById(clearanceId);
        if (result.status && result.data) {
          setExitClearance(result.data as any);
        } else {
          toast.error(result.message || "Failed to fetch exit clearance");
          router.push("/dashboard/exit-clearance/list");
        }
      } catch (error) {
        console.error("Error fetching exit clearance:", error);
        toast.error("Failed to fetch exit clearance");
        router.push("/dashboard/exit-clearance/list");
      } finally {
        setLoading(false);
      }
    };

    if (clearanceId) {
      fetchExitClearance();
    }
  }, [clearanceId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!clearance) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Exit clearance not found</p>
        <Link href="/dashboard/exit-clearance/list">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>
    );
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-[90%] mx-auto pb-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard/exit-clearance/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      <div className="border rounded-xl p-4 space-y-6">
        {/* Profile Header */}
      <Card>
  <CardHeader>
    <div className="flex flex-col items-center text-center gap-2">

      <div>
        <CardTitle className="text-2xl">
          {clearance.employeeName}
        </CardTitle>

        <CardDescription className="text-base mt-1">
          Exit Clearance Record
        </CardDescription>

        <div className="mt-2 flex gap-2 justify-center">
          <Badge
            variant={
              clearance.approvalStatus === "approved"
                ? "default"
                : clearance.approvalStatus === "pending"
                ? "secondary"
                : "destructive"
            }
          >
            {clearance.approvalStatus || "pending"}
          </Badge>
        </div>
      </div>

    </div>
  </CardHeader>
</Card>


        {/* Employee Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Employee Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Employee Name</Label>
              <p className="font-medium">{clearance.employeeName}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Designation</Label>
              <p className="font-medium">{clearance.designation || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Department</Label>
              <p className="font-medium">{clearance.department || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Sub Department</Label>
              <p className="font-medium">{clearance.subDepartment || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Location</Label>
              <p className="font-medium">{clearance.location || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Reporting Manager</Label>
              <p className="font-medium">{clearance.reportingManager || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Exit Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Exit Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Last Working Date</Label>
              <p className="font-medium">{formatDate(clearance.lastWorkingDate)}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Contract End Date</Label>
              <p className="font-medium">{formatDate(clearance.contractEnd)}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Leaving Reason</Label>
              <p className="font-medium">{clearance.leavingReason || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Date</Label>
              <p className="font-medium">{formatDate(clearance.date)}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Approval Status</Label>
              <p className="font-medium capitalize">{clearance.approvalStatus || "Pending"}</p>
            </div>
          </CardContent>
        </Card>

        {/* IT Department Clearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">IT Department Clearance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={clearance.itAccessControl ? "default" : "secondary"}>
                {clearance.itAccessControl ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Access Control</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.itPasswordInactivated ? "default" : "secondary"}>
                {clearance.itPasswordInactivated ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Password Inactivated</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.itLaptopReturned ? "default" : "secondary"}>
                {clearance.itLaptopReturned ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Laptop Returned</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.itEquipment ? "default" : "secondary"}>
                {clearance.itEquipment ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Equipment</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.itWifiDevice ? "default" : "secondary"}>
                {clearance.itWifiDevice ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">WiFi Device</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.itMobileDevice ? "default" : "secondary"}>
                {clearance.itMobileDevice ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Mobile Device</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.itSimCard ? "default" : "secondary"}>
                {clearance.itSimCard ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">SIM Card</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.itBillsSettlement ? "default" : "secondary"}>
                {clearance.itBillsSettlement ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Bills Settlement</Label>
            </div>
          </CardContent>
        </Card>

        {/* Finance Department Clearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Finance Department Clearance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={clearance.financeAdvance ? "default" : "secondary"}>
                {clearance.financeAdvance ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Advance</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.financeLoan ? "default" : "secondary"}>
                {clearance.financeLoan ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Loan</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.financeOtherLiabilities ? "default" : "secondary"}>
                {clearance.financeOtherLiabilities ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Other Liabilities</Label>
            </div>
          </CardContent>
        </Card>

        {/* Admin Department Clearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Admin Department Clearance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={clearance.adminVehicle ? "default" : "secondary"}>
                {clearance.adminVehicle ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Vehicle</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.adminKeys ? "default" : "secondary"}>
                {clearance.adminKeys ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Keys</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.adminOfficeAccessories ? "default" : "secondary"}>
                {clearance.adminOfficeAccessories ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Office Accessories</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.adminMobilePhone ? "default" : "secondary"}>
                {clearance.adminMobilePhone ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Mobile Phone</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.adminVisitingCards ? "default" : "secondary"}>
                {clearance.adminVisitingCards ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Visiting Cards</Label>
            </div>
          </CardContent>
        </Card>

        {/* HR Department Clearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">HR Department Clearance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={clearance.hrEobi ? "default" : "secondary"}>
                {clearance.hrEobi ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">EOBI</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.hrProvidentFund ? "default" : "secondary"}>
                {clearance.hrProvidentFund ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Provident Fund</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.hrIdCard ? "default" : "secondary"}>
                {clearance.hrIdCard ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">ID Card</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.hrMedical ? "default" : "secondary"}>
                {clearance.hrMedical ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Medical</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.hrThumbImpression ? "default" : "secondary"}>
                {clearance.hrThumbImpression ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Thumb Impression</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.hrLeavesRemaining ? "default" : "secondary"}>
                {clearance.hrLeavesRemaining ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Leaves Remaining</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clearance.hrOtherCompensation ? "default" : "secondary"}>
                {clearance.hrOtherCompensation ? "✓" : "✗"}
              </Badge>
              <Label className="text-sm">Other Compensation</Label>
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        {clearance.note && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{clearance.note}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
