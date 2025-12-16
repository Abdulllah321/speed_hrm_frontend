import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Edit } from "lucide-react";
import Link from "next/link";
import { getEmployeeById, getEmployees } from "@/lib/actions/employee";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewEmployeePage({ params }: PageProps) {
  const { id: employeeId } = await params;

  // Fetch employee with all relations and employees list for reporting manager
  const [employeeRes, employeesRes] = await Promise.all([
    getEmployeeById(employeeId),
    getEmployees(), // Only needed for reporting manager name lookup
  ]);

  if (!employeeRes.status || !employeeRes.data) {
    notFound();
  }

  const employee = employeeRes.data as any;
  const employees = employeesRes.status ? employeesRes.data || [] : [];

  // Helper functions to get names from relations
  // Backend returns relation objects under *Relation properties and also spreads them initially
  const getDepartmentName = () => {
    const dept = (employee as any).departmentRelation || (employee as any).department;
    return (dept && typeof dept === 'object' && dept.name) ? dept.name : "N/A";
  };

  const getSubDepartmentName = () => {
    const subDept = (employee as any).subDepartmentRelation || (employee as any).subDepartment;
    return (subDept && typeof subDept === 'object' && subDept.name) ? subDept.name : "N/A";
  };

  const getEmployeeGradeName = () => {
    const grade = (employee as any).employeeGradeRelation || (employee as any).employeeGrade;
    return (grade && typeof grade === 'object' && grade.grade) ? grade.grade : "N/A";
  };

  const getDesignationName = () => {
    const designation = (employee as any).designationRelation || (employee as any).designation;
    return (designation && typeof designation === 'object' && designation.name) ? designation.name : "N/A";
  };

  const getMaritalStatusName = () => {
    const maritalStatus = (employee as any).maritalStatusRelation || (employee as any).maritalStatus;
    return (maritalStatus && typeof maritalStatus === 'object' && maritalStatus.name) ? maritalStatus.name : "N/A";
  };

  const getEmploymentStatusName = () => {
    const employmentStatus = (employee as any).employmentStatusRelation || (employee as any).employmentStatus;
    return (employmentStatus && typeof employmentStatus === 'object' && employmentStatus.status) ? employmentStatus.status : "N/A";
  };

  const getBranchName = () => {
    const branch = (employee as any).branchRelation || (employee as any).branch;
    return (branch && typeof branch === 'object' && branch.name) ? branch.name : "N/A";
  };

  const getWorkingHoursPolicyName = () => {
    const policy = (employee as any).workingHoursPolicyRelation || (employee as any).workingHoursPolicy;
    return (policy && typeof policy === 'object' && policy.name) ? policy.name : "N/A";
  };

  const getLeavesPolicyName = () => {
    const policy = (employee as any).leavesPolicyRelation || (employee as any).leavesPolicy;
    return (policy && typeof policy === 'object' && policy.name) ? policy.name : "N/A";
  };

  const getReportingManagerName = () => {
    if (!employee.reportingManager) return "N/A";
    const manager = employees.find(e => e.id === employee.reportingManager);
    return manager ? `${manager.employeeName} (${manager.employeeId})` : employee.reportingManager;
  };

  const getStateName = () => {
    const state = (employee as any).stateRelation || (employee as any).provinceRelation || (employee as any).state;
    return (state && typeof state === 'object' && state.name) ? state.name : "N/A";
  };

  const getCityName = () => {
    const city = (employee as any).cityRelation || (employee as any).city;
    return (city && typeof city === 'object' && city.name) ? city.name : "N/A";
  };

  const getCountryName = () => {
    const country = (employee as any).countryRelation || (employee as any).country;
    return (country && typeof country === 'object' && country.name) ? country.name : "N/A";
  };

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

  // Helper function to get qualification name from relation object
  const getQualificationName = (qual: any) => {
    const qualification = qual?.qualification;
    return (qualification && typeof qualification === 'object' && qualification.name) 
      ? qualification.name 
      : "N/A";
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
              <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-2 border-border overflow-hidden">
                {employee.avatarUrl ? (
                  <img
                    src={employee.avatarUrl}
                    alt={employee.employeeName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-muted-foreground" />
                )}
              </div>
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
              {[
                { label: "Employee ID", value: employee.employeeId },
                { label: "Employee Name", value: employee.employeeName },
                { label: "Father / Husband Name", value: employee.fatherHusbandName || "N/A" },
                { label: "Department", value: getDepartmentName() },
                { label: "Sub Department", value: getSubDepartmentName() },
                { label: "Employee Grade", value: getEmployeeGradeName() },
                { label: "Attendance ID", value: employee.attendanceId || "N/A" },
                { label: "Designation", value: getDesignationName() },
                { label: "Marital Status", value: getMaritalStatusName() },
                { label: "Employment Status", value: getEmploymentStatusName() },
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
                { label: "Country", value: getCountryName() },
                { label: "State / Province", value: getStateName() },
                { label: "City", value: getCityName() },
                { label: "Employee Salary", value: `PKR ${Number(employee.employeeSalary).toLocaleString()}` },
                { label: "EOBI", value: employee.eobi ? "Yes" : "No" },
                ...(employee.eobi ? [{ label: "EOBI Number", value: employee.eobiNumber || "N/A" }] : []),
                { label: "Provident Fund", value: employee.providentFund ? "Yes" : "No" },
                { label: "Overtime Applicable", value: employee.overtimeApplicable ? "Yes" : "No" },
                { label: "Days Off", value: employee.daysOff || "N/A" },
                { label: "Reporting Manager", value: getReportingManagerName() },
                { label: "Working Hours Policy", value: getWorkingHoursPolicyName() },
                { label: "Branch", value: getBranchName() },
                { label: "Leaves Policy", value: getLeavesPolicyName() },
                { label: "Allow Remote Attendance", value: employee.allowRemoteAttendance ? "Yes" : "No" },
              ].map((item, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg bg-muted/10 hover:bg-muted/20 transition"
                >
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-foreground font-semibold text-1xl mt-1">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Qualification Section */}
        {employee.qualifications && Array.isArray(employee.qualifications) && employee.qualifications.length > 0 && (
          <Card className="border-none shadow-none">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Qualifications</CardTitle>
              <CardDescription>Employee educational qualifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employee.qualifications.map((qual: any, index: number) => (
                  <div key={qual.id || index} className="p-4 border rounded-lg bg-muted/30">
                    {employee.qualifications.length > 1 && (
                      <div className="text-sm font-medium text-muted-foreground mb-3">
                        Qualification {index + 1}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: "Qualification", value: getQualificationName(qual) },
                        { label: "Institute", value: (qual.institute as any)?.name || "N/A" },
                        { label: "Year", value: qual.year || "N/A" },
                        { label: "Grade", value: qual.grade || "N/A" },
                        { label: "State", value: (qual.state as any)?.name || "N/A" },
                        { label: "City", value: (qual.city as any)?.name || "N/A" },
                      ].map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="p-4 border rounded-lg bg-muted/10 hover:bg-muted/20 transition"
                        >
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="text-foreground font-semibold text-1xl mt-1">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                <p className="text-foreground font-semibold text-1xl mt-1">
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
                <p className="text-foreground font-semibold text-1xl mt-1">
                  {item.value || "N/A"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Equipment Issued */}
        {employee.equipmentAssignments && employee.equipmentAssignments.length > 0 && (
          <Card className="border-none shadow-none">
            <CardHeader>
              <CardTitle>Equipment Issued</CardTitle>
              <CardDescription>Equipment assigned to this employee</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {employee.equipmentAssignments.map((assignment: any) => (
                  <div
                    key={assignment.id}
                    className="p-4 border rounded-lg bg-muted/10 hover:bg-muted/20 transition"
                  >
                    <p className="text-xs text-muted-foreground">Equipment</p>
                    <p className="text-foreground font-semibold text-1xl mt-1">
                      {assignment.equipment?.name || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Assigned: {new Date(assignment.assignedDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
