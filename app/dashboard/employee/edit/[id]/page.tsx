"use client";

import { useState, useTransition, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, Key, X, User } from "lucide-react";
import Link from "next/link";
import {
  getDepartments,
  getSubDepartmentsByDepartment,
  type Department,
  type SubDepartment,
} from "@/lib/actions/department";
import {
  getEmployeeGrades,
  type EmployeeGrade,
} from "@/lib/actions/employee-grade";
import { getDesignations, type Designation } from "@/lib/actions/designation";
import {
  getMaritalStatuses,
  type MaritalStatus,
} from "@/lib/actions/marital-status";
import {
  getEmployeeStatuses,
  type EmployeeStatus,
} from "@/lib/actions/employee-status";
import { getBranches, type Branch } from "@/lib/actions/branch";
import {
  getStates,
  getCitiesByState,
  type State,
  type City,
} from "@/lib/actions/city";
import { getEquipments, type Equipment } from "@/lib/actions/equipment";
import {
  getWorkingHoursPolicies,
  type WorkingHoursPolicy,
} from "@/lib/actions/working-hours-policy";
import {
  getLeavesPolicies,
  type LeavesPolicy,
} from "@/lib/actions/leaves-policy";
import { getEmployeeById, updateEmployee } from "@/lib/actions/employee";

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;
  const [isPending, startTransition] = useTransition();
  const [loadingEmployee, setLoadingEmployee] = useState(true);

  // Dropdown data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [employeeGrades, setEmployeeGrades] = useState<EmployeeGrade[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<MaritalStatus[]>([]);
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeStatus[]>(
    []
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [workingHoursPolicies, setWorkingHoursPolicies] = useState<
    WorkingHoursPolicy[]
  >([]);
  const [leavesPolicies, setLeavesPolicies] = useState<LeavesPolicy[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Static options
  const nationalities = [
    "Pakistani",
    "American",
    "British",
    "Canadian",
    "Other",
  ];
  const genders = ["Male", "Female", "Other"];
  const banks = [
    "HBL",
    "UBL",
    "MCB",
    "Allied Bank",
    "Bank Alfalah",
    "Meezan Bank",
    "Standard Chartered",
  ];
  const accountTypes = ["Admin", "Employee", "Manager", "HR"];
  const roles = ["Super Admin", "Admin", "HR Manager", "Employee", "Viewer"];
  const daysOff = ["Sunday", "Saturday-Sunday", "Friday", "Friday-Saturday"];

  // Basic Information
  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    fatherHusbandName: "",
    department: "",
    subDepartment: "",
    employeeGrade: "",
    attendanceId: "",
    designation: "",
    maritalStatus: "",
    employmentStatus: "",
    probationExpiryDate: "",
    cnicNumber: "",
    cnicExpiryDate: "",
    lifetimeCnic: false,
    joiningDate: "",
    dateOfBirth: "",
    nationality: "",
    gender: "",
    contactNumber: "",
    emergencyContactNumber: "",
    emergencyContactPersonName: "",
    personalEmail: "",
    officialEmail: "",
    country: "Pakistan",
    state: "",
    city: "",
    employeeSalary: "",
    eobi: false,
    eobiNumber: "",
    providentFund: false,
    overtimeApplicable: false,
    daysOff: "",
    reportingManager: "",
    workingHoursPolicy: "",
    branch: "",
    leavesPolicy: "",
    allowRemoteAttendance: false,
    // Address
    currentAddress: "",
    permanentAddress: "",
    // Bank
    bankName: "",
    accountNumber: "",
    accountTitle: "",
    // Items Issued (will be dynamic from equipments)
    selectedEquipments: [] as string[],
    // Login
    accountType: "",
    password: "",
    roles: "",
  });

  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(
    null
  );

  const [documents, setDocuments] = useState<{ [key: string]: File | null }>({
    cv: null,
    educationDegrees: null,
    passportPhotos: null,
    cnic: null,
    clearanceLetter: null,
    fitProperCriteria: null,
    serviceRulesAffirmation: null,
    codeOfConduct: null,
    nda: null,
    secrecyForm: null,
    investmentDisclosure: null,
    eobi: null,
  });

  // CNIC formatting function
  const formatCNIC = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 5) {
      return digits;
    } else if (digits.length <= 12) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    } else {
      return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(
        12,
        13
      )}`;
    }
  };

  // Format date for input field
  const formatDateForInput = (date: string | null | undefined): string => {
    if (!date) return "";
    try {
      return new Date(date).toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  // Load employee data
  useEffect(() => {
    const fetchEmployee = async () => {
      if (!employeeId) return;
      try {
        setLoadingEmployee(true);
        const [result, equipmentsResult] = await Promise.all([
          getEmployeeById(employeeId),
          getEquipments(),
        ]);
        
        if (result.status && result.data) {
          const emp = result.data;
          
          // Map boolean equipment fields back to equipment IDs
          const selectedEquipmentIds: string[] = [];
          if (equipmentsResult.status && equipmentsResult.data) {
            const equipmentList = equipmentsResult.data;
            equipmentList.forEach((equipment) => {
              const name = equipment.name.toLowerCase();
              if (
                (emp.laptop && name.includes('laptop')) ||
                (emp.card && (name.includes('card') || name.includes('id card'))) ||
                (emp.mobileSim && (name.includes('sim') || name.includes('mobile sim'))) ||
                (emp.key && (name.includes('key') || name.includes('keys'))) ||
                (emp.tools && name.includes('tool'))
              ) {
                selectedEquipmentIds.push(equipment.id);
              }
            });
          }
          
          setFormData({
            employeeId: emp.employeeId || "",
            employeeName: emp.employeeName || "",
            fatherHusbandName: emp.fatherHusbandName || "",
            department: emp.department || "",
            subDepartment: emp.subDepartment || "",
            employeeGrade: emp.employeeGrade || "",
            attendanceId: emp.attendanceId || "",
            designation: emp.designation || "",
            maritalStatus: emp.maritalStatus || "",
            employmentStatus: emp.employmentStatus || "",
            probationExpiryDate: formatDateForInput(emp.probationExpiryDate),
            cnicNumber: formatCNIC(emp.cnicNumber || ""),
            cnicExpiryDate: formatDateForInput(emp.cnicExpiryDate),
            lifetimeCnic: emp.lifetimeCnic || false,
            joiningDate: formatDateForInput(emp.joiningDate),
            dateOfBirth: formatDateForInput(emp.dateOfBirth),
            nationality: emp.nationality || "",
            gender: emp.gender || "",
            contactNumber: emp.contactNumber || "",
            emergencyContactNumber: emp.emergencyContactNumber || "",
            emergencyContactPersonName: emp.emergencyContactPerson || "",
            personalEmail: emp.personalEmail || "",
            officialEmail: emp.officialEmail || "",
            country: emp.country || "Pakistan",
            state: (emp as any).province || emp.province || "",
            city: emp.city || "",
            employeeSalary: String(emp.employeeSalary || ""),
            eobi: emp.eobi || false,
            eobiNumber: emp.eobiNumber || "",
            providentFund: emp.providentFund || false,
            overtimeApplicable: emp.overtimeApplicable || false,
            daysOff: emp.daysOff || "",
            reportingManager: emp.reportingManager || "",
            workingHoursPolicy: emp.workingHoursPolicy || "",
            branch: emp.branch || "",
            leavesPolicy: emp.leavesPolicy || "",
            allowRemoteAttendance: emp.allowRemoteAttendance || false,
            currentAddress: emp.currentAddress || "",
            permanentAddress: emp.permanentAddress || "",
            bankName: emp.bankName || "",
            accountNumber: emp.accountNumber || "",
            accountTitle: emp.accountTitle || "",
            selectedEquipments: selectedEquipmentIds,
            accountType: emp.accountType || "",
            password: "",
            roles: emp.roles || "",
          });
        } else {
          toast.error(result.message || "Failed to load employee");
          router.push("/dashboard/employee/list");
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
        toast.error("Failed to load employee");
        router.push("/dashboard/employee/list");
      } finally {
        setLoadingEmployee(false);
      }
    };

    fetchEmployee();
  }, [employeeId, router]);

  // Fetch dropdown data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [
          deptsRes,
          gradesRes,
          designationsRes,
          maritalRes,
          statusesRes,
          branchesRes,
          statesRes,
          equipmentsRes,
          workingHoursRes,
          leavesRes,
        ] = await Promise.all([
          getDepartments(),
          getEmployeeGrades(),
          getDesignations(),
          getMaritalStatuses(),
          getEmployeeStatuses(),
          getBranches(),
          getStates(),
          getEquipments(),
          getWorkingHoursPolicies(),
          getLeavesPolicies(),
        ]);

        if (deptsRes.status) setDepartments(deptsRes.data || []);
        if (gradesRes.status) setEmployeeGrades(gradesRes.data || []);
        if (designationsRes.status) setDesignations(designationsRes.data || []);
        if (maritalRes.status) setMaritalStatuses(maritalRes.data || []);
        if (statusesRes.status) setEmployeeStatuses(statusesRes.data || []);
        if (branchesRes.status) setBranches(branchesRes.data || []);
        if (statesRes.status) setStates(statesRes.data || []);
        if (equipmentsRes.status) setEquipments(equipmentsRes.data || []);
        if (workingHoursRes.status)
          setWorkingHoursPolicies(workingHoursRes.data || []);
        if (leavesRes.status) setLeavesPolicies(leavesRes.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load form data");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Fetch sub-departments when department changes
  useEffect(() => {
    const fetchSubDepartments = async () => {
      if (!formData.department) {
        setSubDepartments([]);
        setFormData((prev) => ({ ...prev, subDepartment: "" }));
        setLoadingSubDepartments(false);
        return;
      }

      try {
        setLoadingSubDepartments(true);
        const res = await getSubDepartmentsByDepartment(formData.department);
        if (res.status) {
          setSubDepartments(res.data || []);
        } else {
          toast.error("Failed to load sub-departments");
        }
      } catch (error) {
        console.error("Error fetching sub-departments:", error);
        toast.error("Failed to load sub-departments");
      } finally {
        setLoadingSubDepartments(false);
      }
    };

    fetchSubDepartments();
  }, [formData.department]);

  // Fetch cities when state changes
  useEffect(() => {
    const fetchCities = async () => {
      if (!formData.state) {
        setCities([]);
        setFormData((prev) => ({ ...prev, city: "" }));
        setLoadingCities(false);
        return;
      }

      try {
        setLoadingCities(true);
        const res = await getCitiesByState(formData.state);
        if (res.status) {
          setCities(res.data || []);
        } else {
          toast.error(res.message || "Failed to load cities");
        }
      } catch (error) {
        console.error("Error fetching cities:", error);
        toast.error("Failed to load cities");
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, [formData.state]);

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePic(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    updateField("password", password);
    toast.success("Password generated!");
  };

  const handleFileChange = (key: string, file: File | null) => {
    setDocuments((prev) => ({ ...prev, [key]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.employeeId ||
      !formData.employeeName ||
      !formData.officialEmail
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateEmployee(employeeId, {
          employeeId: formData.employeeId,
          employeeName: formData.employeeName,
          fatherHusbandName: formData.fatherHusbandName,
          department: formData.department,
          subDepartment: formData.subDepartment || null,
          employeeGrade: formData.employeeGrade,
          attendanceId: formData.attendanceId,
          designation: formData.designation,
          maritalStatus: formData.maritalStatus,
          employmentStatus: formData.employmentStatus,
          probationExpiryDate: formData.probationExpiryDate || null,
          cnicNumber: formData.cnicNumber.replace(/-/g, ""),
          cnicExpiryDate: formData.cnicExpiryDate || null,
          lifetimeCnic: formData.lifetimeCnic,
          joiningDate: formData.joiningDate,
          dateOfBirth: formData.dateOfBirth,
          nationality: formData.nationality,
          gender: formData.gender,
          contactNumber: formData.contactNumber,
          emergencyContactNumber: formData.emergencyContactNumber || null,
          emergencyContactPerson: formData.emergencyContactPersonName || null,
          personalEmail: formData.personalEmail || null,
          officialEmail: formData.officialEmail,
          country: formData.country,
          province: formData.state,
          city: formData.city,
          employeeSalary: parseFloat(formData.employeeSalary) || 0,
          eobi: formData.eobi,
          eobiNumber: formData.eobiNumber || null,
          providentFund: formData.providentFund,
          overtimeApplicable: formData.overtimeApplicable,
          daysOff: formData.daysOff || null,
          reportingManager: formData.reportingManager,
          workingHoursPolicy: formData.workingHoursPolicy,
          branch: formData.branch,
          leavesPolicy: formData.leavesPolicy,
          allowRemoteAttendance: formData.allowRemoteAttendance,
          currentAddress: formData.currentAddress || null,
          permanentAddress: formData.permanentAddress || null,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountTitle: formData.accountTitle,
          selectedEquipments: formData.selectedEquipments,
          accountType: formData.accountType || null,
          password: formData.password || null,
          roles: formData.roles || null,
        } as any);

        if (result.status) {
          toast.success(result.message || "Employee updated successfully");
          router.push("/dashboard/employee/list");
        } else {
          toast.error(result.message || "Failed to update employee");
        }
      } catch (error) {
        console.error("Error updating employee:", error);
        toast.error("Failed to update employee");
      }
    });
  };

  const FileUploadField = ({
    label,
    fieldKey,
  }: {
    label: string;
    fieldKey: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="file"
          onChange={(e) =>
            handleFileChange(fieldKey, e.target.files?.[0] || null)
          }
          className="flex-1"
          disabled={isPending}
        />
        {documents[fieldKey] && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleFileChange(fieldKey, null)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {documents[fieldKey] && (
        <p className="text-xs text-muted-foreground">
          {documents[fieldKey]?.name}
        </p>
      )}
    </div>
  );

  if (loadingEmployee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className=" max-w-[90%] mx-auto pb-10">
      <div className="mb-6">
        <Link href="/dashboard/employee/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>
      <div className="border rounded-xl p-4 ">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Same form structure as create page - I'll include the key sections */}
          {/* Profile Picture Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Profile Picture
              </CardTitle>
              <CardDescription>
                Upload employee's profile picture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {profilePicPreview ? (
                    <img
                      src={profilePicPreview}
                      alt="Profile preview"
                      className="w-32 h-32 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                      <User className="w-16 h-16" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="profilePic">Upload Profile Picture</Label>
                  <Input
                    id="profilePic"
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePicChange}
                    disabled={isPending}
                    className="cursor-pointer"
                  />
                  {profilePic && (
                    <p className="text-xs text-muted-foreground">
                      {profilePic.name}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information - Same as create page but with pre-filled values */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Basic Information
              </CardTitle>
              <CardDescription>Update employee's basic details</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Employee ID *</Label>
                <Input
                  value={formData.employeeId}
                  onChange={(e) => updateField("employeeId", e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Employee Name *</Label>
                <Input
                  value={formData.employeeName}
                  onChange={(e) => updateField("employeeName", e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Father / Husband Name *</Label>
                <Input
                  value={formData.fatherHusbandName}
                  onChange={(e) =>
                    updateField("fatherHusbandName", e.target.value)
                  }
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(v) => updateField("department", v)}
                  disabled={isPending || loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sub Department *</Label>
                <Select
                  value={formData.subDepartment}
                  onValueChange={(v) => updateField("subDepartment", v)}
                  disabled={
                    isPending ||
                    !formData.department ||
                    loadingData ||
                    loadingSubDepartments
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingSubDepartments
                          ? "Loading..."
                          : formData.department
                          ? "Select Sub Department"
                          : "Select Department first"
                      }
                    />
                    {loadingSubDepartments && (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {loadingSubDepartments ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : subDepartments.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        No sub-departments found
                      </div>
                    ) : (
                      subDepartments.map((sd) => (
                        <SelectItem key={sd.id} value={sd.id}>
                          {sd.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employee Grade *</Label>
                <Select
                  value={formData.employeeGrade}
                  onValueChange={(v) => updateField("employeeGrade", v)}
                  disabled={isPending || loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeGrades.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Attendance ID *</Label>
                <Input
                  value={formData.attendanceId}
                  onChange={(e) => updateField("attendanceId", e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Designation *</Label>
                <Select
                  value={formData.designation}
                  onValueChange={(v) => updateField("designation", v)}
                  disabled={isPending || loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Marital Status *</Label>
                <Select
                  value={formData.maritalStatus}
                  onValueChange={(v) => updateField("maritalStatus", v)}
                  disabled={isPending || loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Marital Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {maritalStatuses.map((ms) => (
                      <SelectItem key={ms.id} value={ms.id}>
                        {ms.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employment Status *</Label>
                <Select
                  value={formData.employmentStatus}
                  onValueChange={(v) => updateField("employmentStatus", v)}
                  disabled={isPending || loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Employment Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeStatuses.map((es) => (
                      <SelectItem key={es.id} value={es.id}>
                        {es.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Probation / Internship Expiry Date *</Label>
                <Input
                  type="date"
                  value={formData.probationExpiryDate}
                  onChange={(e) =>
                    updateField("probationExpiryDate", e.target.value)
                  }
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>CNIC Number *</Label>
                <Input
                  placeholder="00000-0000000-0"
                  value={formData.cnicNumber}
                  onChange={(e) => {
                    const formatted = formatCNIC(e.target.value);
                    updateField("cnicNumber", formatted);
                  }}
                  maxLength={15}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>CNIC Expiry Date</Label>
                <Input
                  type="date"
                  value={formData.cnicExpiryDate}
                  onChange={(e) =>
                    updateField("cnicExpiryDate", e.target.value)
                  }
                  disabled={isPending || formData.lifetimeCnic}
                />
                <div className="flex items-center gap-2 mt-1">
                  <Switch
                    id="lifetimeCnic"
                    checked={formData.lifetimeCnic}
                    onCheckedChange={(c) => updateField("lifetimeCnic", !!c)}
                  />
                  <label
                    htmlFor="lifetimeCnic"
                    className="text-sm cursor-pointer"
                  >
                    Lifetime CNIC
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Joining Date *</Label>
                <Input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => updateField("joiningDate", e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth *</Label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField("dateOfBirth", e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Nationality *</Label>
                <Select
                  value={formData.nationality}
                  onValueChange={(v) => updateField("nationality", v)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {nationalities.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(v) => updateField("gender", v)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {genders.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contact Number *</Label>
                <Input
                  placeholder="03XX-XXXXXXX"
                  value={formData.contactNumber}
                  onChange={(e) => updateField("contactNumber", e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Number</Label>
                <Input
                  value={formData.emergencyContactNumber}
                  onChange={(e) =>
                    updateField("emergencyContactNumber", e.target.value)
                  }
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Person Name</Label>
                <Input
                  value={formData.emergencyContactPersonName}
                  onChange={(e) =>
                    updateField("emergencyContactPersonName", e.target.value)
                  }
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Personal Email</Label>
                <Input
                  type="email"
                  value={formData.personalEmail}
                  onChange={(e) => updateField("personalEmail", e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Official Email *</Label>
                <Input
                  type="email"
                  value={formData.officialEmail}
                  onChange={(e) => updateField("officialEmail", e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Country *</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Select
                  value={formData.state}
                  onValueChange={(v) => updateField("state", v)}
                  disabled={isPending || loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>City *</Label>
                <Select
                  value={formData.city}
                  onValueChange={(v) => updateField("city", v)}
                  disabled={
                    isPending || !formData.state || loadingData || loadingCities
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingCities
                          ? "Loading..."
                          : formData.state
                          ? "Select City"
                          : "Select State first"
                      }
                    />
                    {loadingCities && (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {loadingCities ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : cities.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        No cities found
                      </div>
                    ) : (
                      cities.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employee Salary (Compensation) *</Label>
                <Input
                  type="number"
                  value={formData.employeeSalary}
                  onChange={(e) =>
                    updateField("employeeSalary", e.target.value)
                  }
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>EOBI</Label>
                <div className="flex items-center gap-4 h-10">
                  <Switch
                    id="eobi"
                    checked={formData.eobi}
                    onCheckedChange={(c) => updateField("eobi", !!c)}
                  />
                  <label htmlFor="eobi" className="text-sm cursor-pointer">
                    Applicable
                  </label>
                </div>
              </div>
              {formData.eobi && (
                <>
                  <div className="space-y-2">
                    <Label>EOBI Number</Label>
                    <Input
                      value={formData.eobiNumber}
                      onChange={(e) =>
                        updateField("eobiNumber", e.target.value)
                      }
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>EOBI Document</Label>
                    <Input
                      type="file"
                      onChange={(e) =>
                        handleFileChange("eobi", e.target.files?.[0] || null)
                      }
                      className="flex-1"
                      disabled={isPending}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    {documents.eobi && (
                      <p className="text-xs text-muted-foreground">
                        {documents.eobi.name}
                      </p>
                    )}
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Provident Fund</Label>
                <div className="flex items-center gap-4 h-10">
                  <Switch
                    id="pf"
                    checked={formData.providentFund}
                    onCheckedChange={(c) => updateField("providentFund", !!c)}
                  />
                  <label htmlFor="pf" className="text-sm cursor-pointer">
                    Applicable
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Overtime Applicable</Label>
                <div className="flex items-center gap-4 h-10">
                  <Switch
                    id="ot"
                    checked={formData.overtimeApplicable}
                    onCheckedChange={(c) =>
                      updateField("overtimeApplicable", !!c)
                    }
                  />
                  <label htmlFor="ot" className="text-sm cursor-pointer">
                    Yes
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Days Off</Label>
                <Select
                  value={formData.daysOff}
                  onValueChange={(v) => updateField("daysOff", v)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOff.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reporting Manager *</Label>
                <Input
                  value={formData.reportingManager}
                  onChange={(e) =>
                    updateField("reportingManager", e.target.value)
                  }
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Working Hours Policy *</Label>
                <Select
                  value={formData.workingHoursPolicy}
                  onValueChange={(v) => updateField("workingHoursPolicy", v)}
                  disabled={isPending || loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Working Hours Policy" />
                  </SelectTrigger>
                  <SelectContent>
                    {workingHoursPolicies.map((policy) => (
                      <SelectItem key={policy.id} value={policy.id}>
                        {policy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch *</Label>
                <Select
                  value={formData.branch}
                  onValueChange={(v) => updateField("branch", v)}
                  disabled={isPending || loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Leaves Policy *</Label>
                <Select
                  value={formData.leavesPolicy}
                  onValueChange={(v) => updateField("leavesPolicy", v)}
                  disabled={isPending || loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Leave Policy" />
                  </SelectTrigger>
                  <SelectContent>
                    {leavesPolicies.map((policy) => (
                      <SelectItem key={policy.id} value={policy.id}>
                        {policy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Allow Remote Attendance</Label>
                <div className="flex items-center gap-4 h-10">
                  <Switch
                    id="remote"
                    checked={formData.allowRemoteAttendance}
                    onCheckedChange={(c) =>
                      updateField("allowRemoteAttendance", !!c)
                    }
                  />
                  <label htmlFor="remote" className="text-sm cursor-pointer">
                    Yes
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Address</Label>
                <Textarea
                  value={formData.currentAddress}
                  onChange={(e) =>
                    updateField("currentAddress", e.target.value)
                  }
                  disabled={isPending}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Permanent Address</Label>
                <Textarea
                  value={formData.permanentAddress}
                  onChange={(e) =>
                    updateField("permanentAddress", e.target.value)
                  }
                  disabled={isPending}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Bank Account Details */}
          <Card>
            <CardHeader>
              <CardTitle>Bank Account Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Bank Name *</Label>
                <Select
                  value={formData.bankName}
                  onValueChange={(v) => updateField("bankName", v)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Account Number *</Label>
                <Input
                  value={formData.accountNumber}
                  onChange={(e) => updateField("accountNumber", e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Account Title *</Label>
                <Input
                  value={formData.accountTitle}
                  onChange={(e) => updateField("accountTitle", e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* Employee Items Issued */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Items Issued</CardTitle>
              <CardDescription>
                Select items issued to the employee from master equipments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                {equipments.map((equipment) => (
                  <div key={equipment.id} className="flex items-center gap-2">
                    <Switch
                      id={equipment.id}
                      checked={formData.selectedEquipments.includes(
                        equipment.id
                      )}
                      onCheckedChange={(checked) => {
                        setFormData((prev) => ({
                          ...prev,
                          selectedEquipments: checked
                            ? [...prev.selectedEquipments, equipment.id]
                            : prev.selectedEquipments.filter(
                                (id) => id !== equipment.id
                              ),
                        }));
                      }}
                      disabled={isPending || loadingData}
                    />
                    <label
                      htmlFor={equipment.id}
                      className="text-sm cursor-pointer"
                    >
                      {equipment.name}
                    </label>
                  </div>
                ))}
                {equipments.length === 0 && !loadingData && (
                  <p className="text-sm text-muted-foreground">
                    No equipments available. Please add equipments in master
                    data.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document Uploads */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Document Uploads</CardTitle>
              <CardDescription>
                Upload required documents (multiple files supported)
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUploadField label="Upload CV" fieldKey="cv" />
              <FileUploadField
                label="Upload Education Degrees"
                fieldKey="educationDegrees"
              />
              <FileUploadField
                label="Upload Passport Size Photos (2)"
                fieldKey="passportPhotos"
              />
              <FileUploadField label="Upload CNIC" fieldKey="cnic" />
              <FileUploadField
                label="Clearance Letter (if any)"
                fieldKey="clearanceLetter"
              />
              <FileUploadField
                label="Fit & Proper Criteria Form"
                fieldKey="fitProperCriteria"
              />
              <FileUploadField
                label="Affirmation – Company Service Rules"
                fieldKey="serviceRulesAffirmation"
              />
              <FileUploadField
                label="Affirmation – VIS Code of Conduct 2019"
                fieldKey="codeOfConduct"
              />
              <FileUploadField
                label="Upload Non-Disclosure Agreement (NDA)"
                fieldKey="nda"
              />
              <FileUploadField
                label="Information Secrecy / Confidentiality Form"
                fieldKey="secrecyForm"
              />
              <FileUploadField
                label="Investment Disclosure Form"
                fieldKey="investmentDisclosure"
              />
            </CardContent>
          </Card>

          {/* Login Credentials */}
          <Card>
            <CardHeader>
              <CardTitle>Login Credentials</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select
                  value={formData.accountType}
                  onValueChange={(v) => updateField("accountType", v)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    disabled={isPending}
                    placeholder="Leave blank to keep current password"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generatePassword}
                    disabled={isPending}
                  >
                    <Key className="h-4 w-4 mr-1" />
                    Generate
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Roles</Label>
                <Select
                  value={formData.roles}
                  onValueChange={(v) => updateField("roles", v)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-2 justify-center bottom-4 bg-background p-4  rounded-lg shadow-lg">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Employee
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

