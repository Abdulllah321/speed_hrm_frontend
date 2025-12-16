"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, Key } from "lucide-react";
import Link from "next/link";
import { FileUpload } from "@/components/ui/file-upload";
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
import { createEmployee, updateEmployee, getEmployees, type Employee } from "@/lib/actions/employee";
import { BasicInfoSection } from "@/app/dashboard/employee/create/components/basic-info-section";
import { QualificationSection } from "@/app/dashboard/employee/create/components/qualification-section";
import { uploadFile } from "@/lib/upload";
import { DateSection } from "@/app/dashboard/employee/create/components/date-section";
import { getCountries } from "@/lib/actions/city";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// CNIC validation regex
const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
const validateCNIC = (value: string) => {
  return cnicRegex.test(value);
};

// CNIC formatting function - converts raw digits to formatted CNIC
const formatCNICValue = (value: string): string => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 5) {
    return digits;
  } else if (digits.length <= 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  } else {
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
  }
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
   ,
  
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
      (value) => !value || value.trim() === "" || /^\d{7,10}$/.test(value.trim()),
      "EOBI Number must be 7-10 digits"
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
    .optional(),
  
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
    .optional()
    .refine(
      (val) => !val || val.trim().length > 0,
      "Bank Name cannot be empty if provided"
    ),

  accountNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || accountNumberRegex.test(val),
      "Account Number must be between 7-26 digits"
    ),

  accountTitle: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 3,
      "Account Title must be at least 3 characters"
    )
    .refine(
      (val) => !val || val.length <= 100,
      "Account Title must not exceed 100 characters"
    ),

  avatarUrl: z.string().optional(),
  eobiDocumentUrl: z.string().optional(),
  
  // Equipment
  selectedEquipments: z
    .array(z.string())
    .default([]),

  // Qualifications
  qualifications: z
    .array(
      z.object({
        qualification: z.string().optional(),
        instituteId: z.string().optional(),
        stateId: z.string().optional(),
        cityId: z.string().optional(),
        year: z.union([z.string(), z.number()]).optional(),
        grade: z.string().optional(),
      })
    )
    .default([])
    .optional(),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

interface EmployeeFormProps {
  mode: "create" | "edit";
  initialData?: Employee;
  departments: Department[];
  subDepartments: SubDepartment[];
  employeeGrades: EmployeeGrade[];
  designations: Designation[];
  maritalStatuses: MaritalStatus[];
  employeeStatuses: EmployeeStatus[];
  branches: Branch[];
  states: State[];
  cities: City[];
  equipments: Equipment[];
  workingHoursPolicies: WorkingHoursPolicy[];
  leavesPolicies: LeavesPolicy[];
  qualifications?: Qualification[];
  institutes?: Institute[];
  loadingData: boolean;
  onQualificationAdded?: (qualification: { id: string; name: string }) => void;
  onInstituteAdded?: (institute: { id: string; name: string }) => void;
}

export function EmployeeForm({
  mode,
  initialData,
  departments,
  subDepartments: initialSubDepartments,
  employeeGrades,
  designations,
  maritalStatuses,
  employeeStatuses,
  branches,
  states,
  cities: initialCities,
  equipments,
  workingHoursPolicies,
  leavesPolicies,
  qualifications = [],
  institutes = [],
  loadingData,
  onQualificationAdded,
  onInstituteAdded,
}: EmployeeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // React Hook Form with Zod validation
  const form = useForm({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: initialData ? {
      employeeId: initialData.employeeId || "",
      employeeName: initialData.employeeName || "",
      fatherHusbandName: initialData.fatherHusbandName || "",
      department: initialData.department || "",
      subDepartment: initialData.subDepartment || "",
      employeeGrade: initialData.employeeGrade || "",
      attendanceId: initialData.attendanceId || "",
      designation: initialData.designation || "",
      maritalStatus: initialData.maritalStatus || "",
      employmentStatus: initialData.employmentStatus || "",
      probationExpiryDate: initialData.probationExpiryDate || "",
      cnicNumber: formatCNICValue(initialData.cnicNumber || ""),
      cnicExpiryDate: initialData.cnicExpiryDate || "",
      lifetimeCnic: initialData.lifetimeCnic || false,
      joiningDate: initialData.joiningDate || "",
      dateOfBirth: initialData.dateOfBirth || "",
      nationality: initialData.nationality || "",
      gender: initialData.gender || "",
      contactNumber: initialData.contactNumber || "",
      emergencyContactNumber: initialData.emergencyContactNumber || "",
      emergencyContactPersonName: (initialData as any).emergencyContactPersonName || initialData.emergencyContactPerson || "",
      personalEmail: initialData.personalEmail || "",
      officialEmail: initialData.officialEmail || "",
      country: initialData.country || "Pakistan",
      state: initialData.province || "",
      city: initialData.city || "",
      employeeSalary: initialData.employeeSalary?.toString() || "",
      eobi: initialData.eobi || false,
      eobiNumber: initialData.eobiNumber || "",
      providentFund: initialData.providentFund || false,
      overtimeApplicable: initialData.overtimeApplicable || false,
      daysOff: initialData.daysOff || "",
      reportingManager: initialData.reportingManager || "",
      workingHoursPolicy: initialData.workingHoursPolicy || "",
      branch: initialData.branch || "",
      leavesPolicy: initialData.leavesPolicy || "",
      allowRemoteAttendance: initialData.allowRemoteAttendance || false,
      currentAddress: initialData.currentAddress ?? "",
      permanentAddress: initialData.permanentAddress ?? "",
      bankName: initialData.bankName || "",
      accountNumber: initialData.accountNumber || "",
      accountTitle: initialData.accountTitle || "",
      selectedEquipments: (initialData as any).equipmentAssignments 
        ? (initialData as any).equipmentAssignments.map((ea: any) => ea.equipment?.id || ea.equipmentId).filter(Boolean)
        : [],
      avatarUrl: (initialData as any).avatarUrl || "",
      eobiDocumentUrl: (initialData as any).eobiDocumentUrl || "",
      qualifications: (initialData as any).qualifications && Array.isArray((initialData as any).qualifications) && (initialData as any).qualifications.length > 0
        ? (initialData as any).qualifications.map((q: any) => ({
            qualification: q.qualificationId || q.qualification || "",
            instituteId: q.instituteId || "",
            stateId: q.stateId || "",
            cityId: q.cityId || "",
            year: q.year?.toString() || "",
            grade: q.grade || "",
          }))
        : [{
            qualification: "",
            instituteId: "",
            stateId: "",
            cityId: "",
            year: "",
            grade: "",
          }],
    } : {
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
      avatarUrl: "",
      eobiDocumentUrl: "",
      qualifications: [{
        qualification: "",
        instituteId: "",
        stateId: "",
        cityId: "",
        year: "",
        grade: "",
      }],
    },
    mode: "onChange",
    reValidateMode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = form;

  // Watch form values
  const department = watch("department");
  const state = watch("state");
  const avatarUrl = watch("avatarUrl");

  // Local state for dynamic dropdowns
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>(initialSubDepartments);
  const [cities, setCities] = useState<City[]>(initialCities);
  const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; employeeName: string; employeeId: string }[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Fetch employees for reporting manager dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const result = await getEmployees();
        if (result.status && result.data) {
          setEmployees(result.data.map(emp => ({
            id: emp.id,
            employeeName: emp.employeeName,
            employeeId: emp.employeeId
          })));
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

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
  const daysOff = ["Sunday", "Saturday-Sunday", "Friday", "Friday-Saturday"];

  // Profile pic and documents state
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(
    (initialData as any)?.avatarUrl || null
  );

  // Sync profilePicPreview with avatarUrl form value
  useEffect(() => {
    if (avatarUrl && avatarUrl.trim() !== '') {
      setProfilePicPreview(avatarUrl);
    }
  }, [avatarUrl]);

  // Initialize preview from initialData when component mounts
  useEffect(() => {
    if ((initialData as any)?.avatarUrl && !profilePicPreview) {
      setProfilePicPreview((initialData as any).avatarUrl);
    }
  }, []);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

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
  const [documentUrls, setDocumentUrls] = useState<{ [key: string]: string }>({});

  // Multi-step wizard
  const stepLabels = [
    "Basic Info",
    "Qualification",
    "Contact & Address",
    "Bank & Login",
    "Equipments & Documents",
  ];
  const [step, setStep] = useState(0);

  // Countries state
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  // Fetch countries
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoadingCountries(true);
        const result = await getCountries();
        if (result.status && result.data) {
          setCountries(result.data.map(c => ({ id: c.id, name: c.name })));
        }
      } catch (error) {
        console.error("Error fetching countries:", error);
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchCountries();
  }, []);

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

  // Initialize sub-departments when editing with initialData
  useEffect(() => {
    if (mode === "edit" && initialData?.department && departments.length > 0) {
      const deptId = typeof initialData.department === 'string' 
        ? initialData.department 
        : (initialData.department as any)?.id;
      if (deptId) {
        const selected = departments.find((d) => d.id === deptId);
        if (selected?.subDepartments) {
          setSubDepartments(selected.subDepartments);
        }
      }
    }
  }, [mode, initialData?.department, departments]);

  // Handle sub-departments change
  useEffect(() => {
    if (!department) {
      setSubDepartments([]);
      setValue("subDepartment", "");
      setLoadingSubDepartments(false);
      return;
    }
    const selected = departments.find((d) => d.id === department);
    setSubDepartments(selected?.subDepartments || []);
    setLoadingSubDepartments(false);
  }, [department, departments, setValue]);

  // Auto-select default working hours policy and leaves policy
  useEffect(() => {
    if (mode === "create" && !initialData && workingHoursPolicies.length > 0 && leavesPolicies.length > 0) {
      // Find default working hours policy
      const defaultWorkingHoursPolicy = workingHoursPolicies.find(p => p.isDefault);
      if (defaultWorkingHoursPolicy) {
        const currentValue = watch("workingHoursPolicy");
        if (!currentValue) {
          setValue("workingHoursPolicy", defaultWorkingHoursPolicy.id, { shouldValidate: false });
        }
      }

      // Find default leaves policy
      const defaultLeavesPolicy = leavesPolicies.find(p => p.isDefault);
      if (defaultLeavesPolicy) {
        const currentValue = watch("leavesPolicy");
        if (!currentValue) {
          setValue("leavesPolicy", defaultLeavesPolicy.id, { shouldValidate: false });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingHoursPolicies, leavesPolicies, mode, initialData]);

  // Initialize cities when editing with initialData
  useEffect(() => {
    if (mode === "edit" && initialData?.province && states.length > 0) {
      const stateId = typeof initialData.province === 'string' 
        ? initialData.province 
        : (initialData.province as any)?.id;
      if (stateId) {
        const fetchCities = async () => {
          try {
            setLoadingCities(true);
            const { getCitiesByState } = await import("@/lib/actions/city");
            const res = await getCitiesByState(stateId);
            if (res.status && res.data) {
              setCities(res.data);
            }
          } catch (error) {
            console.error("Error fetching cities:", error);
          } finally {
            setLoadingCities(false);
          }
        };
        fetchCities();
      }
    }
  }, [mode, initialData?.province, states.length]);

  // Handle cities change
  useEffect(() => {
    const run = async () => {
      if (!state) {
        setCities([]);
        setValue("city", "");
        setLoadingCities(false);
        return;
      }
      try {
        setLoadingCities(true);
        const { getCitiesByState } = await import("@/lib/actions/city");
        const res = await getCitiesByState(state);
        if (res.status && res.data) {
          setCities(res.data);
        } else {
          toast.error(res.message || "Failed to load cities");
        }
      } catch {
        toast.error("Failed to load cities");
      } finally {
        setLoadingCities(false);
      }
    };
    const timer = setTimeout(run, 250);
    return () => clearTimeout(timer);
  }, [state, setValue]);

  // Handle profile pic upload
  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = URL.createObjectURL(file);
    setCropSrc(src);
    setCropDialogOpen(true);
  };

  const onCropComplete = (_: any, areaPixels: any) => setCroppedAreaPixels(areaPixels);

  async function getCroppedBlob(imageSrc: string, area: any): Promise<Blob> {
    const image: HTMLImageElement = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageSrc;
    });
    const canvas = document.createElement('canvas');
    canvas.width = area.width;
    canvas.height = area.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      image,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      area.width,
      area.height
    );
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9));
  }

  const handleCropDialogClose = (open: boolean) => {
    if (!open) {
      // Reset all crop state when dialog closes
      setCropSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
    setCropDialogOpen(open);
  };

  const confirmCropAndUpload = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const reader = new FileReader();
      reader.onloadend = () => setProfilePicPreview(reader.result as string);
      reader.readAsDataURL(file);
      const uploaded = await uploadFile(file);
      setValue("avatarUrl", uploaded.url);
      toast.success("Profile picture uploaded");
      
      // Close dialog - state will be reset by handleCropDialogClose
      handleCropDialogClose(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload profile picture");
      // Close dialog even on error
      handleCropDialogClose(false);
    }
  };


  const handleFileChange = async (key: string, file: File | null) => {
    setDocuments((prev) => ({ ...prev, [key]: file }));
    if (file) {
      try {
        const uploaded = await uploadFile(file);
        setDocumentUrls((prev) => ({ ...prev, [key]: uploaded.url }));
        if (key === "eobi") {
          setValue("eobiDocumentUrl", uploaded.url);
        }
        toast.success("File uploaded");
      } catch (err: any) {
        toast.error(err?.message || "Failed to upload file");
      }
    }
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

  // Validation for each step
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
      // Qualification step - no required fields, all optional
      return true;
    }

    if (currentStep === 2) {
      const results = await trigger("officialEmail");
      return results;
    }

    if (currentStep === 3) {
      const fields = ["bankName", "accountNumber", "accountTitle"];
      const results = await Promise.all(
        fields.map(field => trigger(field as keyof EmployeeFormData))
      );
      return results.every(result => result);
    }

    return true;
  };

  const goNext = async () => {
    console.log("➡️ Next button clicked, current step:", step);
    const isValid = await validateStep(step);
    console.log("✅ Step validation result:", isValid);
    if (!isValid) {
      console.log("❌ Validation failed for step:", step);
      console.log("🔍 Current form errors:", errors);
      toast.error("Please fill required fields in this step");
      return;
    }
    setStep((s) => Math.min(s + 1, stepLabels.length - 1));
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const onSubmit = async (data: EmployeeFormData) => {
    console.log("✅ Form submitted! Mode:", mode);
    console.log("📋 Form data:", data);
    console.log("🔍 Form errors:", errors);
    
    startTransition(async () => {
      console.log("🚀 Start transition called");
      try {
        if (mode === "create") {
          console.log("📝 Creating new employee...");
          // Prepare employee data
          const employeeData = {
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
            reportingManager: data.reportingManager || "",
            workingHoursPolicy: data.workingHoursPolicy,
            branch: data.branch,
            leavesPolicy: data.leavesPolicy,
            allowRemoteAttendance: data.allowRemoteAttendance,
            currentAddress: data.currentAddress || undefined,
            permanentAddress: data.permanentAddress || undefined,
            bankName: data.bankName || "",
            accountNumber: data.accountNumber || "",
            accountTitle: data.accountTitle || "",
            selectedEquipments: data.selectedEquipments,
            avatarUrl: data.avatarUrl || undefined,
            eobiDocumentUrl: data.eobiDocumentUrl || undefined,
            documentUrls: Object.keys(documentUrls).length > 0 ? documentUrls : undefined,
            qualifications: data.qualifications && Array.isArray(data.qualifications) && data.qualifications.length > 0
              ? data.qualifications.map((q: any) => ({
                  qualification: q.qualification || "",
                  instituteId: q.instituteId || undefined,
                  countryId: q.countryId || undefined,
                  stateId: q.stateId || undefined,
                  cityId: q.cityId || undefined,
                  year: q.year ? String(q.year) : undefined,
                  grade: q.grade || undefined,
                }))
              : undefined,
          };

          // Debug: Log the data being sent (remove sensitive data in production)
          console.log("🚀 Creating employee with data:", employeeData);

          const result = await createEmployee(employeeData);

          console.log("📥 Employee creation response:", result);

          if (result.status) {
            toast.success(result.message || "Employee created successfully");
            router.push("/dashboard/employee/list");
          } else {
            console.error("❌ Employee creation failed:", result);
            toast.error(result.message || "Failed to create employee");
          }
        } else if (mode === "edit" && initialData) {
          const employeeData = {
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
            employeeSalary: parseFloat(data.employeeSalary) || 0,
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
            bankName: data.bankName || "",
            accountNumber: data.accountNumber || "",
            accountTitle: data.accountTitle || "",
            selectedEquipments: data.selectedEquipments,
            avatarUrl: data.avatarUrl || undefined,
            eobiDocumentUrl: data.eobiDocumentUrl || undefined,
            documentUrls: Object.keys(documentUrls).length > 0 ? documentUrls : undefined,
            qualifications: data.qualifications && Array.isArray(data.qualifications) && data.qualifications.length > 0
              ? data.qualifications.map((q: any) => ({
                  qualification: q.qualification || "",
                  instituteId: q.instituteId || undefined,
                  countryId: q.countryId || undefined,
                  stateId: q.stateId || undefined,
                  cityId: q.cityId || undefined,
                  year: q.year ? String(q.year) : undefined,
                  grade: q.grade || undefined,
                }))
              : undefined,
          };

          console.log("🔄 Updating employee with data:", employeeData);

          const result = await updateEmployee(initialData.id, employeeData as any);

          console.log("📥 Employee update response:", result);

          if (result.status) {
            toast.success(result.message || "Employee updated successfully");
            router.push("/dashboard/employee/list");
          } else {
            console.error("❌ Employee update failed:", result);
            toast.error(result.message || "Failed to update employee");
          }
        }
      } catch (error) {
        console.error("💥 Error in employee form submission:", error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : mode === "create" 
            ? "Failed to create employee. Please check console for details." 
            : "Failed to update employee. Please check console for details.";
        toast.error(errorMessage);
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard/employee/list">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </Link>
      </div>
      <div className="rounded-2xl border bg-muted/10 p-6">
        <form 
          onSubmit={handleSubmit(
            onSubmit,
            (errors) => {
              console.log("❌ Form validation failed!");
              console.log("🔍 Validation errors:", errors);
              console.log("📋 Current form values:", form.getValues());
              toast.error("Please fix all validation errors before submitting");
            }
          )} 
          className="space-y-6"
        >
          <div className="flex flex-wrap items-center gap-3">   
            {stepLabels.map((label, idx) => {
              const isActive = idx === step;
              const isDone = idx < step;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                      : isDone
                      ? "bg-muted text-foreground ring-1 ring-border"
                      : "bg-muted text-muted-foreground ring-1 ring-border"
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
           <Card className="border-0 shadow-none bg-muted/50">
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
                          onError={(e) => {
                            console.error('❌ Image failed to load:', profilePicPreview);
                            console.error('❌ Error:', e);
                            setProfilePicPreview(null);
                          }}
                          onLoad={() => {
                            console.log('✅ Image loaded successfully:', profilePicPreview);
                          }}
                        />
                      ) : (
                        <div className="w-40 h-40 rounded-full bg-muted flex items-center justify-center border-4 border-border group-hover:bg-muted/80 transition-colors">
                          <img
                            src="/profileicon.svg"
                            alt="Default profile"
                            className="w-20 h-20 dark:invert"
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
            <Dialog open={cropDialogOpen} onOpenChange={handleCropDialogClose}>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>Crop Profile Picture</DialogTitle>
                </DialogHeader>
                <div className="relative w-full h-80 bg-muted rounded-md overflow-hidden">
                  {cropSrc && (
                    <Cropper
                      image={cropSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  )}
                </div>
                <DialogFooter>
                  <div className="flex w-full justify-end gap-2">
                    <Button variant="outline" onClick={() => handleCropDialogClose(false)}>Cancel</Button>
                    <Button onClick={confirmCropAndUpload}>Save</Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
              </Card>


              {/* Basic Information */}
              <Card className="border-0 shadow-none bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    Basic Information
                  </CardTitle>
                  <CardDescription>Enter employee&apos;s basic details</CardDescription>
                </CardHeader>
                <CardContent>
                  <BasicInfoSection
                    form={form}
                    isPending={isPending}
                    loadingData={loadingData}
                    departments={departments}
                    subDepartments={subDepartments}
                    department={department}
                    loadingSubDepartments={loadingSubDepartments}
                    employeeGrades={employeeGrades}
                    designations={designations}
                    maritalStatuses={maritalStatuses}
                    employeeStatuses={employeeStatuses}
                    errors={errors}
                    formatCNIC={formatCNIC}
                    nationalities={nationalities}
                    genders={genders}
                    states={states}
                    cities={cities}
                    state={state}
                    loadingCities={loadingCities}
                    daysOff={daysOff}
                    workingHoursPolicies={workingHoursPolicies}
                    branches={branches}
                    leavesPolicies={leavesPolicies}
                    documents={documents}
                    handleFileChange={handleFileChange}
                    employees={employees}
                  />
                  <DateSection form={form} isPending={isPending} errors={errors} />
                </CardContent>
              </Card>
            </>
          )}

          {step === 1 && (
            <>
              {/* Qualification Section */}
              <Card className="border-0 shadow-none bg-muted/50">
                <CardHeader>
                  {/* <CardTitle className="text-lg font-semibold">
                    Qualifications
                  </CardTitle>
                  <CardDescription>Add employee qualifications</CardDescription> */}
                </CardHeader>
                <CardContent>
                  <QualificationSection
                    form={form}
                    isPending={isPending}
                    loadingData={loadingData}
                    qualifications={(qualifications || []).map(q => ({ id: q.id, name: q.name }))}
                    institutes={(institutes || []).map(i => ({ id: i.id, name: i.name }))}
                    states={states.map(s => ({ id: s.id, name: s.name }))}
                    cities={cities.map(c => ({ id: c.id, name: c.name, stateId: (c as any).stateId }))}
                    errors={errors}
                    onQualificationAdded={onQualificationAdded}
                    onInstituteAdded={onInstituteAdded}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {step === 2 && (
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

          {step === 3 && (
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

            </>
          )}

          {step === 4 && (
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
                              checked={(field.value ?? []).includes(equipment.id)}
                              onCheckedChange={(checked) => {
                                const current = Array.isArray(field.value) ? field.value : [];
                                const newValue = checked
                                  ? [...current, equipment.id]
                                  : current.filter((id) => id !== equipment.id);
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
                  <div className="flex flex-col items-center">
                    <Label className="text-center">Upload CV</Label>
                    <FileUpload
                      id="cv"
                      onChange={(files) => handleFileChange("cv", files?.[0] || null)}
                    />
                  </div>

                  <div className="flex flex-col items-center">
                    <Label className="text-center">Upload Education Degrees</Label>
                    <FileUpload
                      id="educationDegrees"
                      onChange={(files) =>
                        handleFileChange("educationDegrees", files?.[0] || null)
                      }
                    />
                  </div>

                  <div className="flex flex-col items-center">
                    <Label className="text-center">Upload Passport Size Photos (2)</Label>
                    <FileUpload
                      id="passportPhotos"
                      onChange={(files) =>
                        handleFileChange("passportPhotos", files?.[0] || null)
                      }
                    />
                  </div>

                  <div className="flex flex-col items-center">
                    <Label className="text-center">Upload CNIC</Label>
                    <FileUpload
                      id="cnic"
                      onChange={(files) => handleFileChange("cnic", files?.[0] || null)}
                    />
                  </div>

                  <div className="flex flex-col items-center">
                    <Label className="text-center">Clearance Letter (if any)</Label>
                    <FileUpload
                      id="clearanceLetter"
                      onChange={(files) =>
                        handleFileChange("clearanceLetter", files?.[0] || null)
                      }
                    />
                  </div>

                  <div className="flex flex-col items-center">
                    <Label className="text-center">Fit & Proper Criteria Form</Label>
                    <FileUpload
                      id="fitProperCriteria"
                      onChange={(files) =>
                        handleFileChange("fitProperCriteria", files?.[0] || null)
                      }
                    />
                  </div>

                  <div className="flex flex-col items-center">
                    <Label className="text-center">Affirmation – Company Service Rules</Label>
                    <FileUpload
                      id="serviceRulesAffirmation"
                      onChange={(files) =>
                        handleFileChange("serviceRulesAffirmation", files?.[0] || null)
                      }
                    />
                  </div>

                  <div className="flex flex-col items-center">
                    <Label className="text-center">Affirmation – VIS Code of Conduct 2019</Label>
                    <FileUpload
                      id="codeOfConduct"
                      onChange={(files) =>
                        handleFileChange("codeOfConduct", files?.[0] || null)
                      }
                    />
                  </div>

                  <div className="flex flex-col items-center">
                    <Label className="text-center">Upload Non-Disclosure Agreement (NDA)</Label>
                    <FileUpload
                      id="nda"
                      onChange={(files) => handleFileChange("nda", files?.[0] || null)}
                    />
                  </div>

                  <div className="flex flex-col items-center">
                    <Label className="text-center">Information Secrecy / Confidentiality Form</Label>
                    <FileUpload
                      id="secrecyForm"
                      onChange={(files) =>
                        handleFileChange("secrecyForm", files?.[0] || null)
                      }
                    />
                  </div>

                  <div className="flex flex-col items-center">
                    <Label className="text-center">Investment Disclosure Form</Label>
                    <FileUpload
                      id="investmentDisclosure"
                      onChange={(files) =>
                        handleFileChange("investmentDisclosure", files?.[0] || null)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Submit / Navigation Buttons */}
          <div className="flex gap-2 justify-end">
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
              <Button 
                type="submit" 
                disabled={isPending} 
                className="flex-1"
                onClick={(e) => {
                  console.log("🖱️ Submit button clicked!");
                  console.log("📊 Current step:", step);
                  console.log("📋 Form values:", form.getValues());
                  console.log("❌ Form errors:", form.formState.errors);
                  console.log("✅ Form is valid:", form.formState.isValid);
                  console.log("⏳ Is pending:", isPending);
                  // Let form submit normally - don't prevent default
                }}
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === "create" ? "Create Employee" : "Update Employee"}
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
