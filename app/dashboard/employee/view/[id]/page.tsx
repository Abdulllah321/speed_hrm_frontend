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
import { ArrowLeft, Loader2, User, Edit } from "lucide-react";
import Link from "next/link";
import { getEmployeeById, type Employee } from "@/lib/actions/employee";

export default function ViewEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const result = await getEmployeeById(employeeId);
        if (result.status && result.data) {
          setEmployee(result.data as any);
        } else {
          toast.error(result.message || "Failed to fetch employee");
          router.push("/dashboard/employee/list");
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
        toast.error("Failed to fetch employee");
        router.push("/dashboard/employee/list");
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchEmployee();
    }
  }, [employeeId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Employee not found</p>
        <Link href="/dashboard/employee/list">
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

  const formatCNIC = (cnic: string) => {
    if (!cnic) return "N/A";
    const cleaned = cnic.replace(/-/g, "");
    if (cleaned.length === 13) {
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12)}`;
    }
    return cnic;
  };

  return (
    <div className="max-w-[90%] mx-auto pb-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard/employee/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
        <Link href={`/dashboard/employee/edit/${employeeId}`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit Employee
          </Button>
        </Link>
      </div>

      <div className="border rounded-xl p-4 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                  <User className="w-16 h-16 text-muted-foreground" />
                </div>
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{employee.employeeName}</CardTitle>
                <CardDescription className="text-base mt-1">
                  {employee.employeeId}
                </CardDescription>
                <div className="mt-2">
                  <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                    {employee.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Employee ID</Label>
              <p className="font-medium">{employee.employeeId}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Employee Name</Label>
              <p className="font-medium">{employee.employeeName}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Father / Husband Name</Label>
              <p className="font-medium">{employee.fatherHusbandName || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Department</Label>
              <p className="font-medium">{(employee as any).departmentName || employee.department || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Sub Department</Label>
              <p className="font-medium">{(employee as any).subDepartmentName || employee.subDepartment || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Employee Grade</Label>
              <p className="font-medium">{(employee as any).employeeGradeName || employee.employeeGrade || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Attendance ID</Label>
              <p className="font-medium">{employee.attendanceId || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Designation</Label>
              <p className="font-medium">{(employee as any).designationName || employee.designation || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Marital Status</Label>
              <p className="font-medium">{(employee as any).maritalStatusName || employee.maritalStatus || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Employment Status</Label>
              <p className="font-medium">{(employee as any).employmentStatusName || employee.employmentStatus || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Probation Expiry Date</Label>
              <p className="font-medium">{formatDate(employee.probationExpiryDate)}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">CNIC Number</Label>
              <p className="font-medium">{formatCNIC(employee.cnicNumber)}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">CNIC Expiry Date</Label>
              <p className="font-medium">
                {employee.lifetimeCnic ? "Lifetime" : formatDate(employee.cnicExpiryDate)}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Joining Date</Label>
              <p className="font-medium">{formatDate(employee.joiningDate)}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Date of Birth</Label>
              <p className="font-medium">{formatDate(employee.dateOfBirth)}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Nationality</Label>
              <p className="font-medium">{employee.nationality || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Gender</Label>
              <p className="font-medium">{employee.gender || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Contact Number</Label>
              <p className="font-medium">{employee.contactNumber || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Emergency Contact Number</Label>
              <p className="font-medium">{employee.emergencyContactNumber || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Emergency Contact Person</Label>
              <p className="font-medium">{employee.emergencyContactPerson || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Personal Email</Label>
              <p className="font-medium">{employee.personalEmail || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Official Email</Label>
              <p className="font-medium">{employee.officialEmail || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Country</Label>
              <p className="font-medium">{employee.country || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">State / Province</Label>
              <p className="font-medium">{(employee as any).provinceName || employee.province || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">City</Label>
              <p className="font-medium">{(employee as any).cityName || employee.city || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Employee Salary</Label>
              <p className="font-medium">PKR {Number(employee.employeeSalary).toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">EOBI</Label>
              <p className="font-medium">{employee.eobi ? "Yes" : "No"}</p>
            </div>
            {employee.eobi && (
              <div>
                <Label className="text-sm text-muted-foreground">EOBI Number</Label>
                <p className="font-medium">{employee.eobiNumber || "N/A"}</p>
              </div>
            )}
            <div>
              <Label className="text-sm text-muted-foreground">Provident Fund</Label>
              <p className="font-medium">{employee.providentFund ? "Yes" : "No"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Overtime Applicable</Label>
              <p className="font-medium">{employee.overtimeApplicable ? "Yes" : "No"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Days Off</Label>
              <p className="font-medium">{employee.daysOff || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Reporting Manager</Label>
              <p className="font-medium">{employee.reportingManager || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Working Hours Policy</Label>
              <p className="font-medium">{(employee as any).workingHoursPolicyName || employee.workingHoursPolicy || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Branch</Label>
              <p className="font-medium">{(employee as any).branchName || employee.branch || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Leaves Policy</Label>
              <p className="font-medium">{(employee as any).leavesPolicyName || employee.leavesPolicy || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Allow Remote Attendance</Label>
              <p className="font-medium">{employee.allowRemoteAttendance ? "Yes" : "No"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Current Address</Label>
              <p className="font-medium mt-1">{employee.currentAddress || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Permanent Address</Label>
              <p className="font-medium mt-1">{employee.permanentAddress || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Bank Account Details */}
        <Card>
          <CardHeader>
            <CardTitle>Bank Account Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Bank Name</Label>
              <p className="font-medium">{employee.bankName || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Account Number</Label>
              <p className="font-medium">{employee.accountNumber || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Account Title</Label>
              <p className="font-medium">{employee.accountTitle || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Issued */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Issued</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {employee.laptop && <Badge variant="outline">Laptop</Badge>}
              {employee.card && <Badge variant="outline">Card</Badge>}
              {employee.mobileSim && <Badge variant="outline">Mobile SIM</Badge>}
              {employee.key && <Badge variant="outline">Key</Badge>}
              {employee.tools && <Badge variant="outline">Tools</Badge>}
              {!employee.laptop && !employee.card && !employee.mobileSim && !employee.key && !employee.tools && (
                <p className="text-muted-foreground">No equipment issued</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Login Credentials */}
        {(employee.accountType || employee.roles) && (
          <Card>
            <CardHeader>
              <CardTitle>Login Credentials</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {employee.accountType && (
                <div>
                  <Label className="text-sm text-muted-foreground">Account Type</Label>
                  <p className="font-medium">{employee.accountType}</p>
                </div>
              )}
              {employee.roles && (
                <div>
                  <Label className="text-sm text-muted-foreground">Roles</Label>
                  <p className="font-medium">{employee.roles}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

