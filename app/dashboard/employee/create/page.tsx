"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

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
import { FileUpload } from "@/components/ui/file-upload";
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
import { createEmployee } from "@/lib/actions/employee";

// CNIC validation regex
const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
const validateCNIC = (value: string) => {
  return cnicRegex.test(value);
};

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Account number validation regex
const accountNumberRegex = /^\d{7,26}$/;

// Zod Validation Schema
const employeeFormSchema = z.object({
  // Basic Information
  employeeId: z
    .string()
    .min(1, "Employee ID is required")
    .min(5, "Employee ID must be at least 5 characters")
    .max(20, "Employee ID must not exceed 20 characters"),
  
  employeeName: z
    .string()
    .min(1, "Employee Name is required")
    .min(3, "Employee Name must be at least 3 characters")
    .max(100, "Employee Name must not exceed 100 characters"),
  
  fatherHusbandName: z
    .string()
    .min(1, "Father/Husband Name is required")
    .min(3, "Father/Husband Name must be at least 3 characters")
    .max(100, "Father/Husband Name must not exceed 100 characters"),
  
  department: z
    .string()
    .min(1, "Department is required"),
  
  subDepartment: z
    .string()
    .optional(),
  
  employeeGrade: z
    .string()
    .min(1, "Employee Grade is required"),
  
  attendanceId: z
    .string()
    .min(1, "Attendance ID is required")
    .min(3, "Attendance ID must be at least 3 characters")
    .max(20, "Attendance ID must not exceed 20 characters"),
  
  designation: z
    .string()
    .min(1, "Designation is required"),
  
  maritalStatus: z
    .string()
    .min(1, "Marital Status is required"),
  
  employmentStatus: z
    .string()
    .min(1, "Employment Status is required"),
  
  probationExpiryDate: z
    .string()
    .optional(),
  
  cnicNumber: z
    .string()
    .min(1, "CNIC Number is required")
    .refine(
      (value) => validateCNIC(value),
      "CNIC must be in format: 00000-0000000-0"
    ),
  
  cnicExpiryDate: z
    .string()
    .optional(),
  
  lifetimeCnic: z
    .boolean()
    .default(false),
  
  joiningDate: z
    .string()
    .min(1, "Joining Date is required")
    .refine(
      (date) => {
        const selectedDate = new Date(date);
        return selectedDate <= new Date();
      },
      "Joining Date cannot be in the future"
    ),
  
  dateOfBirth: z
    .string()
    .min(1, "Date of Birth is required")
    .refine(
      (date) => {
        const dob = new Date(date);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        return age >= 18;
      },
      "Employee must be at least 18 years old"
    ),
  
  nationality: z
    .string()
    .min(1, "Nationality is required"),
  
  gender: z
    .string()
    .min(1, "Gender is required"),
  
  contactNumber: z
    .string()
    .min(1, "Contact Number is required")
    .refine(
      (value) => /^03\d{2}-\d{7}$|^\+92\d{10}$/.test(value.replace(/\s/g, "")),
      "Contact Number must be in format: 03XX-XXXXXXX"
    ),
  
  emergencyContactNumber: z
    .string()
    .optional()
    .refine(
      (value) => !value || /^03\d{2}-\d{7}$|^\+92\d{10}$/.test(value.replace(/\s/g, "")),
      "Emergency Contact Number must be in format: 03XX-XXXXXXX"
    ),
  
  emergencyContactPersonName: z
    .string()
    .optional(),
  
  personalEmail: z
    .string()
    .optional()
    .refine(
      (value) => !value || emailRegex.test(value),
      "Personal Email must be a valid email address"
    ),
  
  officialEmail: z
    .string()
    .min(1, "Official Email is required")
    .email("Official Email must be a valid email address"),
  
  country: z
    .string()
    .min(1, "Country is required"),
  
  state: z
    .string()
    .min(1, "State is required"),
  
  city: z
    .string()
    .min(1, "City is required"),
  
  employeeSalary: z
    .string()
    .min(1, "Employee Salary is required")
    .refine(
      (value) => {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
      },
      "Employee Salary must be a positive number"
    ),
  
  // Benefits
  eobi: z
    .boolean()
    .default(false),
  
  eobiNumber: z
    .string()
    .optional()
    .refine(
      (value) => !value || /^\d{7,10}$/.test(value),
      "EOBI Number must contain only digits"
    ),
  
  providentFund: z
    .boolean()
    .default(false),
  
  overtimeApplicable: z
    .boolean()
    .default(false),
  
  daysOff: z
    .string()
    .optional(),
  
  reportingManager: z
    .string()
    .min(1, "Reporting Manager is required")
    .min(3, "Reporting Manager name must be at least 3 characters"),
  
  workingHoursPolicy: z
    .string()
    .min(1, "Working Hours Policy is required"),
  
  branch: z
    .string()
    .min(1, "Branch is required"),
  
  leavesPolicy: z
    .string()
    .min(1, "Leaves Policy is required"),
  
  allowRemoteAttendance: z
    .boolean()
    .default(false),
  
  // Address Information
  currentAddress: z
    .string()
    .optional(),
  
  permanentAddress: z
    .string()
    .optional(),
  
  // Bank Account Details
  bankName: z
    .string()
    .min(1, "Bank Name is required"),
  
  accountNumber: z
    .string()
    .min(1, "Account Number is required")
    .refine(
      (value) => accountNumberRegex.test(value),
      "Account Number must be between 7-26 digits"
    ),
  
  accountTitle: z
    .string()
    .min(1, "Account Title is required")
    .min(3, "Account Title must be at least 3 characters")
    .max(100, "Account Title must not exceed 100 characters"),
  
  // Login Credentials
  accountType: z
    .string()
    .optional(),
  
  password: z
    .string()
    .optional()
    .refine(
      (value) => !value || value.length >= 6,
      "Password must be at least 6 characters"
    ),
  
  roles: z
    .string()
    .optional(),
  
  // Equipment
  selectedEquipments: z
    .array(z.string())
    .default([]),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

export default function CreateEmployeePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
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
      currentAddress: "",
      permanentAddress: "",
      bankName: "",
      accountNumber: "",
      accountTitle: "",
      selectedEquipments: [],
      accountType: "",
      password: "",
      roles: "",
    },
    mode: "onBlur",
  });

  // Watch form values
  const formValues = watch();
  const department = watch("department");
  const state = watch("state");
  const eobi = watch("eobi");

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

  // Profile pic and documents state
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

  // Multi-step wizard
  const stepLabels = [
    "Basic Info",
    "Contact & Address",
    "Bank & Login",
    "Equipments & Documents",
  ];
  const [step, setStep] = useState(0);

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
      if (!department) {
        setSubDepartments([]);
        setValue("subDepartment", "");
        setLoadingSubDepartments(false);
        return;
      }

      try {
        setLoadingSubDepartments(true);
        const res = await getSubDepartmentsByDepartment(department);
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
  }, [department, setValue]);

  // Fetch cities when state changes
  useEffect(() => {
    const fetchCities = async () => {
      if (!state) {
        setCities([]);
        setValue("city", "");
        setLoadingCities(false);
        return;
      }

      try {
        setLoadingCities(true);
        const res = await getCitiesByState(state);
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
  }, [state, setValue]);

  // Handle profile pic upload
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

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setValue("password", password);
    toast.success("Password generated!");
  };

  const handleFileChange = (key: string, file: File | null) => {
    setDocuments((prev) => ({ ...prev, [key]: file }));
  };

  const RequiredLabel = ({ children }: { children: string }) => {
    const parts = children.split(" *");
    return parts.length > 1 ? (
      <>
        {parts[0]} <span className="text-red-500">*</span>
      </>
    ) : (
      children
    );
  };

  // Validation for each step - Zod will handle validation automatically
  const validateStep = async (currentStep: number) => {
    if (currentStep === 0) {
      const fields = [
        "employeeId",
        "employeeName",
        "fatherHusbandName",
        "department",
        "employeeGrade",
        "attendanceId",
        "designation",
        "maritalStatus",
        "employmentStatus",
        "joiningDate",
        "dateOfBirth",
        "nationality",
        "gender",
        "contactNumber",
        "officialEmail",
        "country",
        "state",
        "city",
        "workingHoursPolicy",
        "branch",
        "leavesPolicy",
        "reportingManager",
        "employeeSalary",
        "cnicNumber",
      ];
      
      const results = await Promise.all(
        fields.map(field => trigger(field as keyof EmployeeFormData))
      );
      
      return results.every(result => result);
    }

    if (currentStep === 1) {
      const results = await trigger("officialEmail");
      return results;
    }

    if (currentStep === 2) {
      const fields = ["bankName", "accountNumber", "accountTitle"];
      const results = await Promise.all(
        fields.map(field => trigger(field as keyof EmployeeFormData))
      );
      return results.every(result => result);
    }

    return true;
  };

  const goNext = async () => {
    const isValid = await validateStep(step);
    if (!isValid) {
      toast.error("Please fill required fields in this step");
      return;
    }
    setStep((s) => Math.min(s + 1, stepLabels.length - 1));
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const onSubmit = async (data: EmployeeFormData) => {
    // Zod validation has already been done by the form resolver
    startTransition(async () => {
      try {
        const result = await createEmployee({
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          fatherHusbandName: data.fatherHusbandName,
          department: data.department,
          subDepartment: data.subDepartment || undefined,
          employeeGrade: data.employeeGrade,
          attendanceId: data.attendanceId,
          designation: data.designation,
          maritalStatus: data.maritalStatus,
          employmentStatus: data.employmentStatus,
          probationExpiryDate: data.probationExpiryDate || undefined,
          cnicNumber: data.cnicNumber,
          cnicExpiryDate: data.cnicExpiryDate || undefined,
          lifetimeCnic: data.lifetimeCnic,
          joiningDate: data.joiningDate,
          dateOfBirth: data.dateOfBirth,
          nationality: data.nationality,
          gender: data.gender,
          contactNumber: data.contactNumber,
          emergencyContactNumber: data.emergencyContactNumber || undefined,
          emergencyContactPersonName:
            data.emergencyContactPersonName || undefined,
          personalEmail: data.personalEmail || undefined,
          officialEmail: data.officialEmail,
          country: data.country,
          state: data.state,
          city: data.city,
          employeeSalary: data.employeeSalary,
          eobi: data.eobi,
          eobiNumber: data.eobiNumber || undefined,
          providentFund: data.providentFund,
          overtimeApplicable: data.overtimeApplicable,
          daysOff: data.daysOff || undefined,
          reportingManager: data.reportingManager,
          workingHoursPolicy: data.workingHoursPolicy,
          branch: data.branch,
          leavesPolicy: data.leavesPolicy,
          allowRemoteAttendance: data.allowRemoteAttendance,
          currentAddress: data.currentAddress || undefined,
          permanentAddress: data.permanentAddress || undefined,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          accountTitle: data.accountTitle,
          selectedEquipments: data.selectedEquipments,
          accountType: data.accountType || undefined,
          password: data.password || undefined,
          roles: data.roles || undefined,
        });

        if (result.status) {
          toast.success(result.message || "Employee created successfully");
          router.push("/dashboard/employee/list");
        } else {
          toast.error(result.message || "Failed to create employee");
        }
      } catch (error) {
        console.error("Error creating employee:", error);
        toast.error("Failed to create employee");
      }
    });
  };

  return (
    <div className="max-w-[90%] mx-auto pb-10">
      <div className="mb-6">
        <Link href="/dashboard/employee/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>
      <div className="border rounded-xl p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {stepLabels.map((label, idx) => {
              const isActive = idx === step;
              const isDone = idx < step;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : isDone
                      ? "bg-muted text-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="h-6 w-6 rounded-full bg-background border flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>

          {step === 0 && (
            <>
              {/* Profile Picture Upload */}
              <Card className="border-none shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    Profile Picture
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-6">
                    <div 
                      className="relative cursor-pointer group"
                      onClick={() => document.getElementById("profile-pic-input")?.click()}
                    >
                      {profilePicPreview ? (
                        <img
                          src={profilePicPreview}
                          alt="Profile preview"
                          className="w-40 h-40 rounded-full object-cover border-4 border-border group-hover:opacity-80 transition-opacity"
                        />
                      ) : (
                        <div className="w-40 h-40 rounded-full bg-muted flex items-center justify-center border-4 border-border group-hover:bg-muted/80 transition-colors">
                          <img
                            src="/profileicon.svg"
                            alt="Default profile"
                            className="w-20 h-20"
                          />
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <input
                      id="profile-pic-input"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePicChange}
                      className="hidden"
                      disabled={isPending}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Basic Information */}
              <Card className="border-none shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    Basic Information
                  </CardTitle>
                  <CardDescription>Enter employee's basic details</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label><RequiredLabel>Employee ID *</RequiredLabel></Label>
                    <Input
                      placeholder="456XXXXXXXXXX"
                      {...register("employeeId")}
                      disabled={isPending}
                    />
                    {errors.employeeId && (
                      <p className="text-xs text-red-500">{errors.employeeId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Employee Name *</RequiredLabel></Label>
                    <Input
                     placeholder="(eg John Doe)"
                      {...register("employeeName")}
                      disabled={isPending}
                    />
                    {errors.employeeName && (
                      <p className="text-xs text-red-500">{errors.employeeName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Father / Husband Name *</RequiredLabel></Label>
                    <Input
                     placeholder="(eg Richard Roe)"
                      {...register("fatherHusbandName")}
                      disabled={isPending}
                    />
                    {errors.fatherHusbandName && (
                      <p className="text-xs text-red-500">{errors.fatherHusbandName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Department *</RequiredLabel></Label>
                    <Controller
                      name="department"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                      )}
                    />
                    {errors.department && (
                      <p className="text-xs text-red-500">{errors.department.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Sub Department</Label>
                    <Controller
                      name="subDepartment"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={
                            isPending ||
                            !department ||
                            loadingData ||
                            loadingSubDepartments
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !department
                                  ? "Select Department first"
                                  : loadingSubDepartments
                                  ? "Loading..."
                                  : "Select Sub Department"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {loadingSubDepartments ? (
                              <div className="p-4 text-center text-sm">
                                Loading...
                              </div>
                            ) : subDepartments.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
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
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Employee Grade *</RequiredLabel></Label>
                    <Controller
                      name="employeeGrade"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                      )}
                    />
                    {errors.employeeGrade && (
                      <p className="text-xs text-red-500">{errors.employeeGrade.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Attendance ID *</RequiredLabel></Label>
                    <Input
                     placeholder="(eg ATT-00123)"
                      {...register("attendanceId")}
                      disabled={isPending}
                    />
                    {errors.attendanceId && (
                      <p className="text-xs text-red-500">{errors.attendanceId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Designation *</RequiredLabel></Label>
                    <Controller
                      name="designation"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                      )}
                    />
                    {errors.designation && (
                      <p className="text-xs text-red-500">{errors.designation.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Marital Status *</RequiredLabel></Label>
                    <Controller
                      name="maritalStatus"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                      )}
                    />
                    {errors.maritalStatus && (
                      <p className="text-xs text-red-500">{errors.maritalStatus.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Employment Status *</RequiredLabel></Label>
                    <Controller
                      name="employmentStatus"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                      )}
                    />
                    {errors.employmentStatus && (
                      <p className="text-xs text-red-500">{errors.employmentStatus.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Probation / Internship Expiry Date</Label>
                    <Input
                      type="date"
                      {...register("probationExpiryDate")}
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>CNIC Number *</RequiredLabel></Label>
                    <Controller
                      name="cnicNumber"
                      control={control}
                      render={({ field }) => (
                        <Input
                          placeholder="00000-0000000-0"
                          value={field.value}
                          onChange={(e) => {
                            const formatted = formatCNIC(e.target.value);
                            field.onChange(formatted);
                          }}
                          maxLength={15}
                          disabled={isPending}
                        />
                      )}
                    />
                    {errors.cnicNumber && (
                      <p className="text-xs text-red-500">{errors.cnicNumber.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>CNIC Expiry Date</Label>
                    <Input
                      type="date"
                      {...register("cnicExpiryDate")}
                      disabled={isPending || formValues.lifetimeCnic}
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <Controller
                        name="lifetimeCnic"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            id="lifetimeCnic"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
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
                    <Label><RequiredLabel>Joining Date *</RequiredLabel></Label>
                    <Input
                      type="date"
                      {...register("joiningDate")}
                      disabled={isPending}
                    />
                    {errors.joiningDate && (
                      <p className="text-xs text-red-500">{errors.joiningDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Date of Birth *</RequiredLabel></Label>
                    <Input
                      type="date"
                      {...register("dateOfBirth")}
                      disabled={isPending}
                    />
                    {errors.dateOfBirth && (
                      <p className="text-xs text-red-500">{errors.dateOfBirth.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Nationality *</RequiredLabel></Label>
                    <Controller
                      name="nationality"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                      )}
                    />
                    {errors.nationality && (
                      <p className="text-xs text-red-500">{errors.nationality.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Gender *</RequiredLabel></Label>
                    <Controller
                      name="gender"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                      )}
                    />
                    {errors.gender && (
                      <p className="text-xs text-red-500">{errors.gender.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Contact Number *</RequiredLabel></Label>
                    <Input
                      placeholder="03XX-XXXXXXX"
                      {...register("contactNumber")}
                      disabled={isPending}
                    />
                    {errors.contactNumber && (
                      <p className="text-xs text-red-500">{errors.contactNumber.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Emergency Contact Number</Label>
                    <Input
                     placeholder="03XX-XXXXXXX"
                      {...register("emergencyContactNumber")}
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Emergency Contact Person Name</Label>
                    <Input
                     placeholder="(eg Jane Doe)"
                      {...register("emergencyContactPersonName")}
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Personal Email</Label>
                    <Input
                     placeholder="(eg jone@gmail.com)"
                      type="email"
                      {...register("personalEmail")}
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Official Email *</RequiredLabel></Label>
                    <Input
                    placeholder="(eg jone@gmail.com)"
                      type="email"
                      {...register("officialEmail")}
                      disabled={isPending}
                    />
                    {errors.officialEmail && (
                      <p className="text-xs text-red-500">{errors.officialEmail.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Country *</RequiredLabel></Label>
                    <Input
                      {...register("country")}
                      disabled={isPending}
                    />
                    {errors.country && (
                      <p className="text-xs text-red-500">{errors.country.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>State *</RequiredLabel></Label>
                    <Controller
                      name="state"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                      )}
                    />
                    {errors.state && (
                      <p className="text-xs text-red-500">{errors.state.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>City *</RequiredLabel></Label>
                    <Controller
                      name="city"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={
                            isPending || !state || loadingData || loadingCities
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                loadingCities
                                  ? "Loading..."
                                  : state
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
                      )}
                    />
                    {errors.city && (
                      <p className="text-xs text-red-500">{errors.city.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Employee Salary (Compensation) *</RequiredLabel></Label>
                    <Input
                      type="number"
                      {...register("employeeSalary")}
                      disabled={isPending}
                    />
                    {errors.employeeSalary && (
                      <p className="text-xs text-red-500">{errors.employeeSalary.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>EOBI</Label>
                    <div className="flex items-center gap-4 h-10">
                      <Controller
                        name="eobi"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            id="eobi"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <label htmlFor="eobi" className="text-sm cursor-pointer">
                        Applicable
                      </label>
                    </div>
                  </div>

                  {eobi && (
                    <>
                      <div className="space-y-2">
                        <Label>EOBI Number</Label>
                        <Input
                          {...register("eobiNumber")}
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
                      <Controller
                        name="providentFund"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            id="pf"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <label htmlFor="pf" className="text-sm cursor-pointer">
                        Applicable
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Overtime Applicable</Label>
                    <div className="flex items-center gap-4 h-10">
                      <Controller
                        name="overtimeApplicable"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            id="ot"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <label htmlFor="ot" className="text-sm cursor-pointer">
                        Yes
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Days Off</Label>
                    <Controller
                      name="daysOff"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Reporting Manager *</RequiredLabel></Label>
                    <Input
                      {...register("reportingManager")}
                      disabled={isPending}
                    />
                    {errors.reportingManager && (
                      <p className="text-xs text-red-500">{errors.reportingManager.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Working Hours Policy *</RequiredLabel></Label>
                    <Controller
                      name="workingHoursPolicy"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                      )}
                    />
                    {errors.workingHoursPolicy && (
                      <p className="text-xs text-red-500">{errors.workingHoursPolicy.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Branch *</RequiredLabel></Label>
                    <Controller
                      name="branch"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                      )}
                    />
                    {errors.branch && (
                      <p className="text-xs text-red-500">{errors.branch.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Leaves Policy *</RequiredLabel></Label>
                    <Controller
                      name="leavesPolicy"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                      )}
                    />
                    {errors.leavesPolicy && (
                      <p className="text-xs text-red-500">{errors.leavesPolicy.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Allow Remote Attendance</Label>
                    <div className="flex items-center gap-4 h-10">
                      <Controller
                        name="allowRemoteAttendance"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            id="remote"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <label htmlFor="remote" className="text-sm cursor-pointer">
                        Yes
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {step === 1 && (
            <>
              {/* Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Address Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Current Address</Label>
                    <Textarea
                      placeholder="(e.g., House No. 123, Street Name, City, Province)"
                      {...register("currentAddress")}
                      disabled={isPending}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Permanent Address</Label>
                    <Textarea
                      placeholder="(e.g., House No. 456, Street Name, City, Province)"
                      {...register("permanentAddress")}
                      disabled={isPending}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {step === 2 && (
            <>
              {/* Bank Account Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Bank Account Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label><RequiredLabel>Bank Name *</RequiredLabel></Label>
                    <Controller
                      name="bankName"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                      )}
                    />
                    {errors.bankName && (
                      <p className="text-xs text-red-500">{errors.bankName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Account Number *</RequiredLabel></Label>
                    <Input
                      {...register("accountNumber")}
                      disabled={isPending}
                    />
                    {errors.accountNumber && (
                      <p className="text-xs text-red-500">{errors.accountNumber.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label><RequiredLabel>Account Title *</RequiredLabel></Label>
                    <Input
                      {...register("accountTitle")}
                      disabled={isPending}
                    />
                    {errors.accountTitle && (
                      <p className="text-xs text-red-500">{errors.accountTitle.message}</p>
                    )}
                  </div>
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
                    <Controller
                      name="accountType"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="flex gap-2">
                      <Input
                        {...register("password")}
                        disabled={isPending}
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
                    <Controller
                      name="roles"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
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
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {step === 3 && (
            <>
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
                        <Controller
                          name="selectedEquipments"
                          control={control}
                          render={({ field }) => (
                            <Switch
                              id={equipment.id}
                              checked={field.value.includes(equipment.id)}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...field.value, equipment.id]
                                  : field.value.filter((id) => id !== equipment.id);
                                field.onChange(newValue);
                              }}
                              disabled={isPending || loadingData}
                            />
                          )}
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
                        No equipments available. Please add equipments in master data.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Document Uploads */}
              <Card>
                <CardHeader>
                  <CardTitle>Employee Document Uploads</CardTitle>
                  <CardDescription>Upload required documents</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Upload CV</Label>
                    <FileUpload
                      id="cv"
                      onChange={(files) => handleFileChange("cv", files?.[0] || null)}
                    />
                  </div>

                  <div>
                    <Label>Upload Education Degrees</Label>
                    <FileUpload
                      id="educationDegrees"
                      onChange={(files) => handleFileChange("educationDegrees", files?.[0] || null)}
                    />
                  </div>

                  <div>
                    <Label>Upload Passport Size Photos (2)</Label>
                    <FileUpload
                      id="passportPhotos"
                      onChange={(files) => handleFileChange("passportPhotos", files?.[0] || null)}
                    />
                  </div>

                  <div>
                    <Label>Upload CNIC</Label>
                    <FileUpload
                      id="cnic"
                      onChange={(files) => handleFileChange("cnic", files?.[0] || null)}
                    />
                  </div>

                  <div>
                    <Label>Clearance Letter (if any)</Label>
                    <FileUpload
                      id="clearanceLetter"
                      onChange={(files) => handleFileChange("clearanceLetter", files?.[0] || null)}
                    />
                  </div>

                  <div>
                    <Label>Fit & Proper Criteria Form</Label>
                    <FileUpload
                      id="fitProperCriteria"
                      onChange={(files) => handleFileChange("fitProperCriteria", files?.[0] || null)}
                    />
                  </div>

                  <div>
                    <Label>Affirmation – Company Service Rules</Label>
                    <FileUpload
                      id="serviceRulesAffirmation"
                      onChange={(files) => handleFileChange("serviceRulesAffirmation", files?.[0] || null)}
                    />
                  </div>

                  <div>
                    <Label>Affirmation – VIS Code of Conduct 2019</Label>
                    <FileUpload
                      id="codeOfConduct"
                      onChange={(files) => handleFileChange("codeOfConduct", files?.[0] || null)}
                    />
                  </div>

                  <div>
                    <Label>Upload Non-Disclosure Agreement (NDA)</Label>
                    <FileUpload
                      id="nda"
                      onChange={(files) => handleFileChange("nda", files?.[0] || null)}
                    />
                  </div>

                  <div>
                    <Label>Information Secrecy / Confidentiality Form</Label>
                    <FileUpload
                      id="secrecyForm"
                      onChange={(files) => handleFileChange("secrecyForm", files?.[0] || null)}
                    />
                  </div>

                  <div>
                    <Label>Investment Disclosure Form</Label>
                    <FileUpload
                      id="investmentDisclosure"
                      onChange={(files) => handleFileChange("investmentDisclosure", files?.[0] || null)}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Submit / Navigation Buttons */}
          <div className="flex gap-2 justify-end ">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={isPending}
              >
                Back
              </Button>
            )}
            {step < stepLabels.length - 1 && (
              <Button type="button" onClick={goNext} disabled={isPending}>
                Next
              </Button>
            )}
            {step === stepLabels.length - 1 && (
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Employee
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}