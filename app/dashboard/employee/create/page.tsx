"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { EmployeeForm } from "@/components/employee-form";
import type { Department, SubDepartment } from "@/lib/actions/department";
import type { EmployeeGrade } from "@/lib/actions/employee-grade";
import type { Designation } from "@/lib/actions/designation";
import type { MaritalStatus } from "@/lib/actions/marital-status";
import type { EmployeeStatus } from "@/lib/actions/employee-status";
import type { Branch } from "@/lib/actions/branch";
import type { State, City } from "@/lib/actions/city";
import type { Equipment } from "@/lib/actions/equipment";
import type { WorkingHoursPolicy } from "@/lib/actions/working-hours-policy";
import type { LeavesPolicy } from "@/lib/actions/leaves-policy";
import type { Qualification } from "@/lib/actions/qualification";
import type { Institute } from "@/lib/actions/institute";
import type { Employee } from "@/lib/actions/employee";
import { searchEmployeeForRejoin, rejoinEmployee, getEmployeesForDropdown, type EmployeeDropdownOption } from "@/lib/actions/employee";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Autocomplete } from "@/components/ui/autocomplete";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, UserPlus, UserCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function CreateEmployeePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "rejoin">("create");

  // Dropdown data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [employeeGrades, setEmployeeGrades] = useState<EmployeeGrade[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<MaritalStatus[]>([]);
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeStatus[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [workingHoursPolicies, setWorkingHoursPolicies] = useState<WorkingHoursPolicy[]>([]);
  const [leavesPolicies, setLeavesPolicies] = useState<LeavesPolicy[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [employeeList, setEmployeeList] = useState<EmployeeDropdownOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Rejoin state
  const [rejoinCnic, setRejoinCnic] = useState("");
  const [searchingCnic, setSearchingCnic] = useState(false);
  const [foundEmployee, setFoundEmployee] = useState<Employee | null>(null);
  const [canRejoin, setCanRejoin] = useState(false);
  const [rejoinError, setRejoinError] = useState("");
  
  // Rejoin form data
  const [rejoinData, setRejoinData] = useState({
    employeeId: "",
    attendanceId: "",
    joiningDate: null as unknown as Date,
    departmentId: "",
    subDepartmentId: "",
    designationId: "",
    employeeGradeId: "",
    employmentStatusId: "",
    employeeSalary: 0,
    branchId: "",
    workingHoursPolicyId: "",
    leavesPolicyId: "",
    reportingManager: "",
    remarks: "",
  });
  const [submittingRejoin, setSubmittingRejoin] = useState(false);

  // Fetch dropdown data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [formDataRes, employeesRes] = await Promise.all([
          fetch(`/api/data/employee-create`, { cache: "no-store" }),
          getEmployeesForDropdown(),
        ]);
        const json = await formDataRes.json();
        if (json.status) {
          const d = json.data || {};
          setDepartments(d.departments || []);
          setEmployeeGrades(d.employeeGrades || []);
          setDesignations(d.designations || []);
          setMaritalStatuses(d.maritalStatuses || []);
          setEmployeeStatuses(d.employeeStatuses || []);
          setBranches(d.branches || []);
          setStates(d.states || []);
          setEquipments(d.equipments || []);
          setWorkingHoursPolicies(d.workingHoursPolicies || []);
          setLeavesPolicies(d.leavesPolicies || []);
          setQualifications(d.qualifications || []);
          setInstitutes(d.institutes || []);
        } else {
          toast.error(json.message || "Failed to load form data");
        }
        if (employeesRes.status && employeesRes.data) {
          setEmployeeList(employeesRes.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load form data");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handleQualificationAdded = (qualification: { id: string; name: string }) => {
    setQualifications((prev) => [...prev, { ...qualification, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Qualification]);
  };

  const handleInstituteAdded = (institute: { id: string; name: string }) => {
    setInstitutes((prev) => [...prev, { ...institute, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Institute]);
  };

  // Search for employee by CNIC
  const handleSearchCnic = async () => {
    if (!rejoinCnic.trim()) {
      toast.error("Please enter a CNIC number");
      return;
    }

    setSearchingCnic(true);
    setFoundEmployee(null);
    setCanRejoin(false);
    setRejoinError("");

    try {
      const result = await searchEmployeeForRejoin(rejoinCnic.trim());
      
      if (result.status && result.canRejoin && result.data) {
        setFoundEmployee(result.data);
        setCanRejoin(true);
        
        // Pre-fill rejoin form with existing data (except employeeId, attendanceId, joiningDate)
        const emp = result.data as any;
        setRejoinData({
          employeeId: "",
          attendanceId: "",
          joiningDate: null as unknown as Date, // Not prefilled
          departmentId: emp.departmentId || emp.department || "",
          subDepartmentId: emp.subDepartmentId || emp.subDepartment || "",
          designationId: emp.designationId || emp.designation || "",
          employeeGradeId: emp.employeeGradeId || emp.employeeGrade || "",
          employmentStatusId: emp.employmentStatusId || emp.employmentStatus || "",
          employeeSalary: emp.employeeSalary || 0,
          branchId: emp.branchId || emp.branch || "",
          workingHoursPolicyId: emp.workingHoursPolicyId || emp.workingHoursPolicy || "",
          leavesPolicyId: emp.leavesPolicyId || emp.leavesPolicy || "",
          reportingManager: emp.reportingManager || "",
          remarks: "",
        });
        
        toast.success(result.message);
      } else {
        setRejoinError(result.message || "Employee not found or cannot be rejoined");
        if (result.data) {
          setFoundEmployee(result.data as Employee);
        }
      }
    } catch (error) {
      console.error("Error searching CNIC:", error);
      setRejoinError("Failed to search for employee");
    } finally {
      setSearchingCnic(false);
    }
  };

  // Handle rejoin submission
  const handleRejoinSubmit = async () => {
    if (!foundEmployee) return;

    if (!rejoinData.employeeId.trim()) {
      toast.error("New Employee ID is required");
      return;
    }
    if (!rejoinData.attendanceId.trim()) {
      toast.error("New Attendance ID is required");
      return;
    }
    const joiningDateValue = rejoinData.joiningDate;
    if (!joiningDateValue || (joiningDateValue instanceof Date && isNaN(joiningDateValue.getTime()))) {
      toast.error("Rejoining Date is required");
      return;
    }

    setSubmittingRejoin(true);

    try {
      const result = await rejoinEmployee({
        cnic: foundEmployee.cnicNumber,
        ...rejoinData,
        joiningDate: rejoinData.joiningDate instanceof Date ? rejoinData.joiningDate.toISOString() : new Date(rejoinData.joiningDate).toISOString(),
      });

      if (result.status) {
        toast.success(result.message || "Employee rejoined successfully!");
        router.push("/dashboard/employee/list");
      } else {
        toast.error(result.message || "Failed to rejoin employee");
      }
    } catch (error) {
      console.error("Error rejoining employee:", error);
      toast.error("Failed to rejoin employee");
    } finally {
      setSubmittingRejoin(false);
    }
  };

  // Reset rejoin form
  const handleResetRejoin = () => {
    setRejoinCnic("");
    setFoundEmployee(null);
    setCanRejoin(false);
    setRejoinError("");
    setRejoinData({
      employeeId: "",
      attendanceId: "",
      joiningDate: null as unknown as Date,
      departmentId: "",
      subDepartmentId: "",
      designationId: "",
      employeeGradeId: "",
      employmentStatusId: "",
      employeeSalary: 0,
      branchId: "",
      workingHoursPolicyId: "",
      leavesPolicyId: "",
      reportingManager: "",
      remarks: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Add Employee</h2>
          <p className="text-muted-foreground">Create a new employee or rejoin an existing one</p>
        </div>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as "create" | "rejoin")} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            New Employee
          </TabsTrigger>
          <TabsTrigger value="rejoin" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Rejoin Employee
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6">
          <EmployeeForm
            mode="create"
            departments={departments}
            subDepartments={subDepartments}
            employeeGrades={employeeGrades}
            designations={designations}
            maritalStatuses={maritalStatuses}
            employeeStatuses={employeeStatuses}
            branches={branches}
            states={states}
            cities={cities}
            equipments={equipments}
            workingHoursPolicies={workingHoursPolicies}
            leavesPolicies={leavesPolicies}
            qualifications={qualifications}
            institutes={institutes}
            loadingData={loadingData}
            onQualificationAdded={handleQualificationAdded}
            onInstituteAdded={handleInstituteAdded}
          />
        </TabsContent>

        <TabsContent value="rejoin" className="mt-6 space-y-6">
          {/* CNIC Search Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search by CNIC
              </CardTitle>
              <CardDescription>
                Enter the CNIC of the employee who left and wants to rejoin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="cnic">CNIC Number <span className="text-destructive">*</span></Label>
                  <Input
                    id="cnic"
                    placeholder="Enter CNIC (e.g., 12345-1234567-1)"
                    value={rejoinCnic}
                    onChange={(e) => setRejoinCnic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchCnic()}
                  />
                </div>
                <Button onClick={handleSearchCnic} disabled={searchingCnic || !rejoinCnic.trim()}>
                  {searchingCnic ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
                {foundEmployee && (
                  <Button variant="outline" onClick={handleResetRejoin}>
                    Reset
                  </Button>
                )}
              </div>

              {/* Error Message */}
              {rejoinError && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Cannot Rejoin</p>
                    <p className="text-sm text-muted-foreground">{rejoinError}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Found Employee Details */}
          {foundEmployee && canRejoin && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Employee Found
                    </CardTitle>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                      Rejoining
                    </Badge>
                  </div>
                  <CardDescription>
                    Review the employee details and update the required fields for rejoining
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Employee Name</p>
                      <p className="font-medium">{foundEmployee.employeeName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Previous Employee ID</p>
                      <p className="font-medium">{foundEmployee.employeeId}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">CNIC</p>
                      <p className="font-medium">{foundEmployee.cnicNumber}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Previous Joining Date</p>
                      <p className="font-medium">
                        {foundEmployee.joiningDate ? format(new Date(foundEmployee.joiningDate), 'dd MMM yyyy') : '-'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Contact</p>
                      <p className="font-medium">{foundEmployee.contactNumber}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant="destructive">{foundEmployee.status}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rejoin Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Rejoining Details</CardTitle>
                  <CardDescription>
                    Enter the new details for the rejoining employee. Fields marked with * are required.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>New Employee ID <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="Enter new Employee ID"
                        value={rejoinData.employeeId}
                        onChange={(e) => setRejoinData({ ...rejoinData, employeeId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>New Attendance ID <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="Enter new Attendance ID"
                        value={rejoinData.attendanceId}
                        onChange={(e) => setRejoinData({ ...rejoinData, attendanceId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rejoining Date <span className="text-destructive">*</span></Label>
                      <DatePicker
                        value={rejoinData.joiningDate instanceof Date ? rejoinData.joiningDate.toISOString().split('T')[0] : rejoinData.joiningDate || ""}
                        onChange={(value) => setRejoinData({ ...rejoinData, joiningDate: value ? new Date(value) : (null as unknown as Date) })}
                        placeholder="Select rejoining date"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Autocomplete
                        options={departments.map((d) => ({ value: d.id, label: d.name }))}
                        value={rejoinData.departmentId}
                        onValueChange={(v) => setRejoinData({ ...rejoinData, departmentId: v || "", subDepartmentId: "" })}
                        placeholder="Select department"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Designation</Label>
                      <Autocomplete
                        options={designations.map((d) => ({ value: d.id, label: d.name }))}
                        value={rejoinData.designationId}
                        onValueChange={(v) => setRejoinData({ ...rejoinData, designationId: v || "" })}
                        placeholder="Select designation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employee Grade</Label>
                      <Autocomplete
                        options={employeeGrades.map((g) => ({ value: g.id, label: g.grade }))}
                        value={rejoinData.employeeGradeId}
                        onValueChange={(v) => setRejoinData({ ...rejoinData, employeeGradeId: v || "" })}
                        placeholder="Select grade"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <Autocomplete
                        options={branches.map((b) => ({ value: b.id, label: b.name }))}
                        value={rejoinData.branchId}
                        onValueChange={(v) => setRejoinData({ ...rejoinData, branchId: v || "" })}
                        placeholder="Select branch"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Working Hours Policy</Label>
                      <Autocomplete
                        options={workingHoursPolicies.map((p) => ({ value: p.id, label: p.name }))}
                        value={rejoinData.workingHoursPolicyId}
                        onValueChange={(v) => setRejoinData({ ...rejoinData, workingHoursPolicyId: v || "" })}
                        placeholder="Select policy"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Leaves Policy</Label>
                      <Autocomplete
                        options={leavesPolicies.map((p) => ({ value: p.id, label: p.name }))}
                        value={rejoinData.leavesPolicyId}
                        onValueChange={(v) => setRejoinData({ ...rejoinData, leavesPolicyId: v || "" })}
                        placeholder="Select policy"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Salary</Label>
                      <Input
                        type="number"
                        placeholder="Enter salary"
                        value={rejoinData.employeeSalary || ""}
                        onChange={(e) => setRejoinData({ ...rejoinData, employeeSalary: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Reporting Manager</Label>
                      <Autocomplete
                        options={employeeList.map((e) => ({ value: e.id, label: `${e.employeeName} (${e.employeeId})` }))}
                        value={rejoinData.reportingManager}
                        onValueChange={(v) => setRejoinData({ ...rejoinData, reportingManager: v || "" })}
                        placeholder="Select reporting manager"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Remarks</Label>
                    <Textarea
                      placeholder="Enter any remarks for this rejoining..."
                      value={rejoinData.remarks}
                      onChange={(e) => setRejoinData({ ...rejoinData, remarks: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button variant="outline" onClick={handleResetRejoin}>
                      Cancel
                    </Button>
                    <Button onClick={handleRejoinSubmit} disabled={submittingRejoin}>
                      {submittingRejoin ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Rejoin Employee
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Empty State */}
          {!foundEmployee && !searchingCnic && !rejoinError && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <UserCheck className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">Search for Employee</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Enter the CNIC number of the employee who previously left and wants to rejoin the organization.
                  The system will find their records and allow you to update their details for rejoining.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
