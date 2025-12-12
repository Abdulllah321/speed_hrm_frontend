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
import { getDepartments, type Department } from "@/lib/actions/department";
import { getEmployeeGrades, type EmployeeGrade } from "@/lib/actions/employee-grade";
import { getDesignations, type Designation } from "@/lib/actions/designation";
import { getMaritalStatuses, type MaritalStatus } from "@/lib/actions/marital-status";
import { getEmployeeStatuses, type EmployeeStatus } from "@/lib/actions/employee-status";
import { getBranches, type Branch } from "@/lib/actions/branch";
import { getStates, getCitiesByState, type State, type City } from "@/lib/actions/city";
import { getWorkingHoursPolicies, type WorkingHoursPolicy } from "@/lib/actions/working-hours-policy";
import { getLeavesPolicies, type LeavesPolicy } from "@/lib/actions/leaves-policy";
import { getEmployees } from "@/lib/actions/employee";

export default function ViewEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dropdown data for mapping IDs to names
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employeeGrades, setEmployeeGrades] = useState<EmployeeGrade[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<MaritalStatus[]>([]);
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeStatus[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [workingHoursPolicies, setWorkingHoursPolicies] = useState<WorkingHoursPolicy[]>([]);
  const [leavesPolicies, setLeavesPolicies] = useState<LeavesPolicy[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Fetch dropdown data for mapping
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [
          deptsRes,
          gradesRes,
          designationsRes,
          maritalRes,
          statusesRes,
          branchesRes,
          statesRes,
          workingHoursRes,
          leavesRes,
          employeesRes,
        ] = await Promise.all([
          getDepartments(),
          getEmployeeGrades(),
          getDesignations(),
          getMaritalStatuses(),
          getEmployeeStatuses(),
          getBranches(),
          getStates(),
          getWorkingHoursPolicies(),
          getLeavesPolicies(),
          getEmployees(),
        ]);

        if (deptsRes.status) setDepartments(deptsRes.data || []);
        if (gradesRes.status) setEmployeeGrades(gradesRes.data || []);
        if (designationsRes.status) setDesignations(designationsRes.data || []);
        if (maritalRes.status) setMaritalStatuses(maritalRes.data || []);
        if (statusesRes.status) setEmployeeStatuses(statusesRes.data || []);
        if (branchesRes.status) setBranches(branchesRes.data || []);
        if (statesRes.status) setStates(statesRes.data || []);
        if (workingHoursRes.status) setWorkingHoursPolicies(workingHoursRes.data || []);
        if (leavesRes.status) setLeavesPolicies(leavesRes.data || []);
        if (employeesRes.status) setEmployees(employeesRes.data || []);
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      }
    };

    fetchDropdownData();
  }, []);

  // Fetch cities when employee province is available
  useEffect(() => {
    if (!employee?.province) return;
    const fetchCities = async () => {
      try {
        const res = await getCitiesByState(employee.province);
        if (res.status) {
          setCities(res.data || []);
        }
      } catch (error) {
        console.error("Error fetching cities:", error);
      }
    };
    fetchCities();
  }, [employee?.province]);

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

  // Helper functions to map IDs to names
  const getDepartmentName = (id: string | null | undefined) => {
    if (!id) return "N/A";
    const dept = departments.find(d => d.id === id);
    return dept?.name || (employee as any).departmentName || id;
  };

  const getSubDepartmentName = (id: string | null | undefined) => {
    if (!id) return "N/A";
    const dept = departments.find(d => d.id === employee?.department);
    const subDept = dept?.subDepartments?.find(sd => sd.id === id);
    return subDept?.name || (employee as any).subDepartmentName || id;
  };

  const getEmployeeGradeName = (id: string | null | undefined) => {
    if (!id) return "N/A";
    const grade = employeeGrades.find(g => g.id === id);
    return grade?.grade || (employee as any).employeeGradeName || id;
  };

  const getDesignationName = (id: string | null | undefined) => {
    if (!id) return "N/A";
    const designation = designations.find(d => d.id === id);
    return designation?.name || (employee as any).designationName || id;
  };

  const getMaritalStatusName = (id: string | null | undefined) => {
    if (!id) return "N/A";
    const status = maritalStatuses.find(ms => ms.id === id);
    return status?.name || (employee as any).maritalStatusName || id;
  };

  const getEmploymentStatusName = (id: string | null | undefined) => {
    if (!id) return "N/A";
    const status = employeeStatuses.find(es => es.id === id);
    return status?.status || (employee as any).employmentStatusName || id;
  };

  const getBranchName = (id: string | null | undefined) => {
    if (!id) return "N/A";
    const branch = branches.find(b => b.id === id);
    return branch?.name || (employee as any).branchName || id;
  };

  const getStateName = (id: string | null | undefined) => {
    if (!id) return "N/A";
    const state = states.find(s => s.id === id);
    return state?.name || (employee as any).provinceName || id;
  };

  const getCityName = (id: string | null | undefined) => {
    if (!id) return "N/A";
    const city = cities.find(c => c.id === id);
    return city?.name || (employee as any).cityName || id;
  };

  const getWorkingHoursPolicyName = (id: string | null | undefined) => {
    if (!id) return "N/A";
    const policy = workingHoursPolicies.find(p => p.id === id);
    return policy?.name || (employee as any).workingHoursPolicyName || id;
  };

  const getLeavesPolicyName = (id: string | null | undefined) => {
    if (!id) return "N/A";
    const policy = leavesPolicies.find(p => p.id === id);
    return policy?.name || (employee as any).leavesPolicyName || id;
  };

  const getReportingManagerName = (id: string | null | undefined) => {
    if (!id) return "N/A";
    const manager = employees.find(e => e.id === id);
    return manager ? `${manager.employeeName} (${manager.employeeId})` : (employee as any).reportingManagerName || id;
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
<Card className="border-none shadow-none">
  <CardHeader>
    <div className="flex flex-col items-center text-center gap-4">

      {/* Centered Profile Image */}
      <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-2 border-border">
        <User className="w-16 h-16 text-muted-foreground" />
      </div>

      {/* Name, ID, Status */}
      <div>
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
<Card className="border-none shadow-none">
  <CardHeader>
    <CardTitle className="text-lg font-semibold">Basic Information</CardTitle>
    <CardDescription>Employee personal & job-related details</CardDescription>
  </CardHeader>

  <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

      {/** REUSABLE INFO BLOCK */}
 {[
  { label: "Employee ID", value: employee.employeeId },
  { label: "Employee Name", value: employee.employeeName },
  { label: "Father / Husband Name", value: employee.fatherHusbandName || "N/A" },
  { label: "Department", value: getDepartmentName(employee.department) },
  { label: "Sub Department", value: getSubDepartmentName(employee.subDepartment) },
  { label: "Employee Grade", value: getEmployeeGradeName(employee.employeeGrade) },
  { label: "Attendance ID", value: employee.attendanceId || "N/A" },
  { label: "Designation", value: getDesignationName(employee.designation) },
  { label: "Marital Status", value: getMaritalStatusName(employee.maritalStatus) },
  { label: "Employment Status", value: getEmploymentStatusName(employee.employmentStatus) },
  { label: "Probation Expiry Date", value: formatDate(employee.probationExpiryDate) },
  { label: "CNIC Number", value: formatCNIC(employee.cnicNumber) },
  { label: "CNIC Expiry Date", value: employee.lifetimeCnic ? "Lifetime" : formatDate(employee.cnicExpiryDate) },
  { label: "Joining Date", value: formatDate(employee.joiningDate) },
  { label: "Date of Birth", value: formatDate(employee.dateOfBirth) },
  { label: "Nationality", value: employee.nationality || "N/A" },
  { label: "Gender", value: employee.gender || "N/A" },
  { label: "Contact Number", value: employee.contactNumber || "N/A" },
  { label: "Emergency Contact Number", value: employee.emergencyContactNumber || "N/A" },
  { label: "Emergency Contact Person", value: employee.emergencyContactPerson || "N/A" },
  { label: "Personal Email", value: employee.personalEmail || "N/A" },
  { label: "Official Email", value: employee.officialEmail || "N/A" },
  { label: "Country", value: employee.country || "N/A" },
  { label: "State / Province", value: getStateName(employee.province) },
  { label: "City", value: getCityName(employee.city) },
  { label: "Employee Salary", value: `PKR ${Number(employee.employeeSalary).toLocaleString()}` },
  { label: "EOBI", value: employee.eobi ? "Yes" : "No" },
  ...(employee.eobi ? [{ label: "EOBI Number", value: employee.eobiNumber || "N/A" }] : []),
  { label: "Provident Fund", value: employee.providentFund ? "Yes" : "No" },
  { label: "Overtime Applicable", value: employee.overtimeApplicable ? "Yes" : "No" },
  { label: "Days Off", value: employee.daysOff || "N/A" },
  { label: "Reporting Manager", value: getReportingManagerName(employee.reportingManager) },
  { label: "Working Hours Policy", value: getWorkingHoursPolicyName(employee.workingHoursPolicy) },
  { label: "Branch", value: getBranchName(employee.branch) },
  { label: "Leaves Policy", value: getLeavesPolicyName(employee.leavesPolicy) },
  { label: "Allow Remote Attendance", value: employee.allowRemoteAttendance ? "Yes" : "No" },
].map((item, index) => (
  <div
    key={index}
    className="p-4 border rounded-lg bg-muted/10 hover:bg-muted/20 transition"
  >
    <p className="text-xs text-muted-foreground">{item.label}</p>
    <p className="text-gray-900 font-semibold text-1xl mt-1">
      {item.value}
    </p>
  </div>
))}


    </div>
  </CardContent>
</Card>










{/* Address Information */}
<Card className="border-none shadow-none">
  <CardHeader>
    <CardTitle>Address Information</CardTitle>
  </CardHeader>

  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {[
      { label: "Current Address", value: employee.currentAddress },
      { label: "Permanent Address", value: employee.permanentAddress },
    ].map((item, index) => (
      <div
        key={index}
        className="p-4 border rounded-lg bg-muted/10 hover:bg-muted/20 transition"
      >
        <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
        <p className="text-gray-900 font-semibold text-1xl mt-1">
          {item.value || "N/A"}
        </p>
      </div>
    ))}
  </CardContent>
</Card>



{/* Bank Account Details */}
<Card className="border-none shadow-none">
  <CardHeader>
    <CardTitle>Bank Account Details</CardTitle>
  </CardHeader>

  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {[
      { label: "Bank Name", value: employee.bankName },
      { label: "Account Number", value: employee.accountNumber },
      { label: "Account Title", value: employee.accountTitle },
    ].map((item, index) => (
      <div
        key={index}
        className="p-4 border rounded-lg bg-muted/10 hover:bg-muted/20 transition"
      >
        <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
        <p className="text-gray-900 font-semibold text-1xl mt-1">
          {item.value || "N/A"}
        </p>
      </div>
    ))}
  </CardContent>
</Card>


{/* Equipment Issued */}
<Card className="border-none shadow-none">
  <CardHeader>
    <CardTitle>Equipment Issued</CardTitle>
  </CardHeader>

  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {[
      { label: "Mouse", value: employee.mouse },
    ].map((item, index) => {
      const valStr = item.value ? "Issued" : "Not Issued";

      return (
        <div
          key={index}
          className="p-4 border rounded-lg bg-muted/10 hover:bg-muted/20 transition"
        >
          <p className="text-xs font-medium text-muted-foreground">
            {item.label}
          </p>

          <p className="text-gray-900 font-semibold text-1xl mt-1">
            {valStr}
          </p>
        </div>
      );
    })}
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
                  <Label className="text-xs text-muted-foreground">Account Type</Label>
                  <p className="font-medium">{employee.accountType}</p>
                </div>
              )}
              {employee.roles && (
                <div>
                  <Label className="text-xs text-muted-foreground">Roles</Label>
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


