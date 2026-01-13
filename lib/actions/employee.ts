'use server';

import { getAccessToken } from '../auth';
import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function getAuthHeaders() {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export interface Employee {
  id: string;
  employeeId: string;
  employeeName: string;
  fatherHusbandName: string;
  department: string;
  subDepartment?: string | null;
  employeeGrade: string;
  attendanceId: string;
  designation: string;
  maritalStatus?: string | null;
  employmentStatus: string | null;
  probationExpiryDate?: string | null;
  cnicNumber: string;
  cnicExpiryDate?: string | null;
  lifetimeCnic: boolean;
  joiningDate?: string | null;
  dateOfBirth?: string | null;
  nationality: string;
  gender: string;
  contactNumber: string;
  emergencyContactNumber?: string | null;
  emergencyContactPerson?: string | null;
  personalEmail?: string | null;
  officialEmail?: string | null;
  country: string;
  province: string;
  city: string;
  employeeSalary: number;
  eobi: boolean;
  eobiNumber?: string | null;
  providentFund: boolean;
  overtimeApplicable: boolean;
  daysOff?: string | null;
  reportingManager: string | null;
  workingHoursPolicy: string;
  location: string;
  leavesPolicy: string;
  allowRemoteAttendance: boolean;
  currentAddress?: string | null;
  permanentAddress?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountTitle?: string | null;
  status: string;
  equipmentAssignments?: Array<{
    id: string;
    equipmentId: string;
    equipment?: {
      id: string;
      name: string;
    };
    assignedDate: string;
    returnedDate?: string | null;
    status: string;
  }>;
  createdAt: string;
  updatedAt: string;
  // Optional mapped name fields from backend
  departmentName?: string;
  subDepartmentName?: string | null;
  designationName?: string;
  employeeGradeName?: string;
  locationName?: string;
  countryName?: string;
  provinceName?: string;
  cityName?: string;
  maritalStatusName?: string;
  workingHoursPolicyName?: string;
  leavesPolicyName?: string;
  employmentStatusName?: string;
  qualifications?: Array<{
    id: string;
    qualification: string;
    instituteId?: string | null;
    countryId?: string | null;
    stateId?: string | null;
    cityId?: string | null;
    year?: number | null;
    grade?: string | null;
    documentUrl?: string | null;
  }>;
}

// Get all employees
export async function getEmployees(): Promise<{ status: boolean; data?: Employee[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employees`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch employees' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching employees:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch employees. Please check your connection.'
    };
  }
}

// Lightweight employee data for dropdowns/selects
export interface EmployeeDropdownOption {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentId: string | null;
  subDepartmentId: string | null;
  departmentName: string | null;
  subDepartmentName?: string | null;
  designationName?: string | null;
  providentFund?: boolean;
}

// Get employees for dropdown (minimal fields)
export async function getEmployeesForDropdown(): Promise<{ status: boolean; data?: EmployeeDropdownOption[]; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employees/dropdown`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch employees' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching employees for dropdown:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch employees.'
    };
  }
}

// Get employee by id
export async function getEmployeeById(id: string): Promise<{ status: boolean; data?: Employee; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employees/${id}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch employee' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching employee:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch employee'
    };
  }
}

// Create employee
export async function createEmployee(data: {
  employeeId: string;
  employeeName: string;
  fatherHusbandName: string;
  department: string;
  subDepartment?: string;
  employeeGrade: string;
  attendanceId: string;
  designation: string;
  maritalStatus?: string;
  employmentStatus?: string;
  probationExpiryDate?: string;
  cnicNumber: string;
  cnicExpiryDate?: string;
  lifetimeCnic: boolean;
  joiningDate?: string;
  dateOfBirth?: string;
  nationality: string;
  gender: string;
  contactNumber: string;
  emergencyContactNumber?: string;
  emergencyContactPersonName?: string;
  personalEmail?: string;
  officialEmail?: string;
  country: string;
  state: string;
  city: string;
  employeeSalary: string;
  eobi: boolean;
  eobiNumber?: string;
  providentFund: boolean;
  overtimeApplicable: boolean;
  daysOff?: string;
  reportingManager?: string;
  workingHoursPolicy: string;
  location?: string;
  leavesPolicy: string;
  allowRemoteAttendance: boolean;
  currentAddress?: string;
  permanentAddress?: string;
  bankName?: string;
  accountNumber?: string;
  accountTitle?: string;
  selectedEquipments?: string[];
  accountType?: string;
  password?: string;
  roles?: string;
  avatarUrl?: string;
  eobiDocumentUrl?: string;
  documentUrls?: Record<string, string>;
  qualifications?: Array<{
    qualification: string;
    instituteId?: string;
    countryId?: string;
    stateId?: string;
    cityId?: string;
    year?: string;
    grade?: string;
    documentUrl?: string;
  }>;
}): Promise<{ status: boolean; data?: Employee; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to create employee' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    if (result.status) {
      revalidatePath('/hr/employee/list');
    }
    return result;
  } catch (error) {
    console.error('Error creating employee:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to create employee' };
  }
}

// Update employee
export async function updateEmployee(
  id: string,
  data: Partial<Employee> & {
    qualifications?: Array<{
      qualification: string;
      instituteId?: string;
      countryId?: string;
      stateId?: string;
      cityId?: string;
      year?: string;
      grade?: string;
      documentUrl?: string;
    }>;
  }
): Promise<{ status: boolean; data?: Employee; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employees/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to update employee' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    if (result.status) {
      revalidatePath('/hr/employee/list');
    }
    return result;
  } catch (error) {
    console.error('Error updating employee:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to update employee' };
  }
}

// Delete employee
export async function deleteEmployee(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/employees/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to delete employee' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    if (result.status) {
      revalidatePath('/hr/employee/list');
    }
    return result;
  } catch (error) {
    console.error('Error deleting employee:', error);
    return { status: false, message: error instanceof Error ? error.message : 'Failed to delete employee' };
  }
}

// Lightweight interface for attendance management
export interface EmployeeForAttendance {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentId: string;
  subDepartmentId?: string | null;
  workingHoursPolicyId: string;
  department?: {
    id: string;
    name: string;
  };
  subDepartment?: {
    id: string;
    name: string;
  } | null;
  workingHoursPolicy?: {
    id: string;
    name: string;
    startWorkingHours: string;
    endWorkingHours: string;
  } | null;
}

// Get employees for attendance management (lightweight, only required fields)
export async function getEmployeesForAttendance(filters?: { departmentId?: string; subDepartmentId?: string }): Promise<{ status: boolean; data?: EmployeeForAttendance[]; message?: string }> {
  try {
    const params = new URLSearchParams();
    if (filters?.departmentId) {
      params.append('departmentId', filters.departmentId);
    }
    if (filters?.subDepartmentId) {
      params.append('subDepartmentId', filters.subDepartmentId);
    }

    const url = `${API_URL}/employees/for-attendance${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch employees' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching employees for attendance:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch employees. Please check your connection.'
    };
  }
}

// Search for inactive employee by CNIC for rejoining
export async function searchEmployeeForRejoin(cnic: string): Promise<{
  status: boolean;
  canRejoin?: boolean;
  data?: Employee;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_URL}/employees/rejoin/search?cnic=${encodeURIComponent(cnic)}`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to search employee' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error searching employee for rejoin:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to search employee.',
    };
  }
}

// Rejoin an inactive employee - accepts ALL fields except CNIC (which is passed separately)
export async function rejoinEmployee(data: {
  cnic: string;
  employeeId: string;
  attendanceId: string;
  joiningDate: string | Date;
  // All employee fields that can be updated on rejoin
  employeeName?: string;
  fatherHusbandName?: string;
  departmentId?: string;
  department?: string;
  subDepartmentId?: string;
  subDepartment?: string;
  employeeGradeId?: string;
  employeeGrade?: string;
  designationId?: string;
  designation?: string;
  maritalStatusId?: string;
  maritalStatus?: string;
  employmentStatusId?: string;
  employmentStatus?: string;
  probationExpiryDate?: string;
  cnicExpiryDate?: string;
  lifetimeCnic?: boolean;
  dateOfBirth?: string;
  nationality?: string;
  gender?: string;
  contactNumber?: string;
  emergencyContactNumber?: string;
  emergencyContactPerson?: string;
  emergencyContactPersonName?: string;
  personalEmail?: string;
  officialEmail?: string;
  countryId?: string;
  country?: string;
  stateId?: string;
  state?: string;
  cityId?: string;
  city?: string;
  area?: string;
  employeeSalary?: number | string;
  eobi?: boolean;
  eobiNumber?: string;
  eobiDocumentUrl?: string;
  documentUrls?: Record<string, string>;
  providentFund?: boolean;
  overtimeApplicable?: boolean;
  daysOff?: string;
  reportingManager?: string;
  workingHoursPolicyId?: string;
  workingHoursPolicy?: string;
  locationId?: string;
  location?: string;
  leavesPolicyId?: string;
  leavesPolicy?: string;
  allowRemoteAttendance?: boolean;
  currentAddress?: string;
  permanentAddress?: string;
  bankName?: string;
  accountNumber?: string;
  accountTitle?: string;
  remarks?: string;
}): Promise<{ status: boolean; data?: Employee; message?: string; changedFields?: string[] }> {
  try {
    // Prepare the data for the API
    const payload: any = {
      cnic: data.cnic,
      employeeId: data.employeeId,
      attendanceId: data.attendanceId,
    };

    if (data.joiningDate !== undefined) payload.joiningDate = data.joiningDate instanceof Date ? data.joiningDate.toISOString() : data.joiningDate;

    // Add all optional fields if provided
    if (data.employeeName !== undefined) payload.employeeName = data.employeeName;
    if (data.fatherHusbandName !== undefined) payload.fatherHusbandName = data.fatherHusbandName;
    if (data.departmentId !== undefined) payload.departmentId = data.departmentId;
    if (data.department !== undefined) payload.department = data.department;
    if (data.subDepartmentId !== undefined) payload.subDepartmentId = data.subDepartmentId;
    if (data.subDepartment !== undefined) payload.subDepartment = data.subDepartment;
    if (data.employeeGradeId !== undefined) payload.employeeGradeId = data.employeeGradeId;
    if (data.employeeGrade !== undefined) payload.employeeGrade = data.employeeGrade;
    if (data.designationId !== undefined) payload.designationId = data.designationId;
    if (data.designation !== undefined) payload.designation = data.designation;
    if (data.maritalStatusId !== undefined) payload.maritalStatusId = data.maritalStatusId;
    if (data.maritalStatus !== undefined) payload.maritalStatus = data.maritalStatus;
    if (data.employmentStatusId !== undefined) payload.employmentStatusId = data.employmentStatusId;
    if (data.employmentStatus !== undefined) payload.employmentStatus = data.employmentStatus;
    if (data.probationExpiryDate !== undefined) payload.probationExpiryDate = data.probationExpiryDate;
    if (data.cnicExpiryDate !== undefined) payload.cnicExpiryDate = data.cnicExpiryDate;
    if (data.lifetimeCnic !== undefined) payload.lifetimeCnic = data.lifetimeCnic;
    if (data.dateOfBirth !== undefined) payload.dateOfBirth = data.dateOfBirth;
    if (data.nationality !== undefined) payload.nationality = data.nationality;
    if (data.gender !== undefined) payload.gender = data.gender;
    if (data.contactNumber !== undefined) payload.contactNumber = data.contactNumber;
    if (data.emergencyContactNumber !== undefined) payload.emergencyContactNumber = data.emergencyContactNumber;
    if (data.emergencyContactPerson !== undefined) payload.emergencyContactPerson = data.emergencyContactPerson;
    if (data.emergencyContactPersonName !== undefined) payload.emergencyContactPerson = data.emergencyContactPersonName;
    if (data.personalEmail !== undefined) payload.personalEmail = data.personalEmail;
    if (data.officialEmail !== undefined) payload.officialEmail = data.officialEmail;
    if (data.countryId !== undefined) payload.countryId = data.countryId;
    if (data.country !== undefined) payload.country = data.country;
    if (data.stateId !== undefined) payload.stateId = data.stateId;
    if (data.state !== undefined) payload.state = data.state;
    if (data.cityId !== undefined) payload.cityId = data.cityId;
    if (data.city !== undefined) payload.city = data.city;
    if (data.area !== undefined) payload.area = data.area;
    if (data.employeeSalary !== undefined) {
      payload.employeeSalary = typeof data.employeeSalary === 'string' ? parseFloat(data.employeeSalary) : data.employeeSalary;
    }
    if (data.eobi !== undefined) payload.eobi = data.eobi;
    if (data.eobiNumber !== undefined) payload.eobiNumber = data.eobiNumber;
    if (data.eobiDocumentUrl !== undefined) payload.eobiDocumentUrl = data.eobiDocumentUrl;
    if (data.documentUrls !== undefined) payload.documentUrls = data.documentUrls;
    if (data.providentFund !== undefined) payload.providentFund = data.providentFund;
    if (data.overtimeApplicable !== undefined) payload.overtimeApplicable = data.overtimeApplicable;
    if (data.daysOff !== undefined) payload.daysOff = data.daysOff;
    if (data.reportingManager !== undefined) payload.reportingManager = data.reportingManager;
    if (data.workingHoursPolicyId !== undefined) payload.workingHoursPolicyId = data.workingHoursPolicyId;
    if (data.workingHoursPolicy !== undefined) payload.workingHoursPolicy = data.workingHoursPolicy;
    if (data.locationId !== undefined) payload.locationId = data.locationId;
    if (data.location !== undefined) payload.location = data.location;
    if (data.leavesPolicyId !== undefined) payload.leavesPolicyId = data.leavesPolicyId;
    if (data.leavesPolicy !== undefined) payload.leavesPolicy = data.leavesPolicy;
    if (data.allowRemoteAttendance !== undefined) payload.allowRemoteAttendance = data.allowRemoteAttendance;
    if (data.currentAddress !== undefined) payload.currentAddress = data.currentAddress;
    if (data.permanentAddress !== undefined) payload.permanentAddress = data.permanentAddress;
    if (data.bankName !== undefined) payload.bankName = data.bankName;
    if (data.accountNumber !== undefined) payload.accountNumber = data.accountNumber;
    if (data.accountTitle !== undefined) payload.accountTitle = data.accountTitle;
    if (data.remarks !== undefined) payload.remarks = data.remarks;

    const res = await fetch(`${API_URL}/employees/rejoin`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to rejoin employee' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    const result = await res.json();
    if (result.status) {
      revalidatePath('/hr/employee');
    }
    return result;
  } catch (error) {
    console.error('Error rejoining employee:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to rejoin employee.',
    };
  }
}

// Get rejoining history for an employee
export async function getEmployeeRejoiningHistory(employeeId: string): Promise<{
  status: boolean;
  data?: Array<{
    id: string;
    previousEmployeeId: string;
    newEmployeeId: string;
    previousAttendanceId: string;
    newAttendanceId: string;
    previousExitDate: string;
    rejoiningDate: string;
    remarks?: string;
    createdAt: string;
  }>;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_URL}/employees/${employeeId}/rejoining-history`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch history' }));
      return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching rejoining history:', error);
    return {
      status: false,
      message: error instanceof Error ? error.message : 'Failed to fetch rejoining history.',
    };
  }
}

