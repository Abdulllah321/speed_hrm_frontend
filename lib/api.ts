import { getApiBaseUrl } from "./utils";

import axios from 'axios';


const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

async function fetchApi<T>(endpoint: string, options?: any): Promise<T> {
  // Helper to get cookie value in browser
  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return '';
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
    return '';
  };

  const companyId = getCookie('companyId');
  const companyCode = getCookie('companyCode');

  try {
    const response = await axios({
      url: `${API_BASE}${endpoint}`,
      method: options?.method || 'GET',
      data: options?.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
      headers: {
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(companyId ? { 'x-company-id': companyId } : {}),
        ...(companyCode ? { 'x-tenant-id': companyCode } : {}),
        ...options?.headers,
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || 'Something went wrong');
  }
}

// Department API
export const departmentApi = {
  getAll: () => fetchApi<{ status: boolean; data: Department[] }>('/departments'),
  getById: (id: number) => fetchApi<{ status: boolean; data: Department }>(`/departments/${id}`),
  create: (name: string) => fetchApi<{ status: boolean; data: Department; message: string }>('/departments', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  update: (id: number, name: string) => fetchApi<{ status: boolean; data: Department; message: string }>(`/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  }),
  delete: (id: number) => fetchApi<{ status: boolean; message: string }>(`/departments/${id}`, {
    method: 'DELETE',
  }),
};

// Sub-Department API
export const subDepartmentApi = {
  getAll: () => fetchApi<{ status: boolean; data: SubDepartment[] }>('/sub-departments'),
  getByDepartment: (departmentId: number) => fetchApi<{ status: boolean; data: SubDepartment[] }>(`/sub-departments/department/${departmentId}`),
  create: (name: string, departmentId: number) => fetchApi<{ status: boolean; data: SubDepartment; message: string }>('/sub-departments', {
    method: 'POST',
    body: JSON.stringify({ name, departmentId }),
  }),
  update: (id: number, name: string, departmentId?: number) => fetchApi<{ status: boolean; data: SubDepartment; message: string }>(`/sub-departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, departmentId }),
  }),
  delete: (id: number) => fetchApi<{ status: boolean; message: string }>(`/sub-departments/${id}`, {
    method: 'DELETE',
  }),
};

export interface DashboardStats {
  overview: {
    totalEmployees: number;
    inactiveEmployees: number;
    presentToday: number;
    absentToday: number;
    pendingLeaves: number;
    pendingAttendanceQueries: number;
  };
  departmentStats: {
    name: string;
    count: number;
  }[];
}

export interface Employee {
  id: string;
  employeeId: string;
  employeeName: string;
  fatherHusbandName?: string;
  cnicNumber?: string;
  cnicExpiryDate?: string;
  lifetimeCnic?: boolean;
  joiningDate?: string;
  dateOfBirth?: string;
  nationality?: string;
  gender?: string;
  contactNumber?: string;
  emergencyContactNumber?: string;
  emergencyContactPersonName?: string;
  personalEmail?: string;
  officialEmail?: string;
  currentAddress?: string;
  permanentAddress?: string;
  bankName?: string;
  accountNumber?: string;
  accountTitle?: string;
  accountType?: string;
  employeeSalary?: number;
  department?: { id: string; name: string } | string;
  subDepartment?: { id: string; name: string } | string;
  designation?: { id: string; name: string } | string;
  employeeGrade?: { id: string; grade: string } | string;
  maritalStatus?: { id: string; name: string } | string;
  employmentStatus?: { id: string; status: string } | string;
  country?: { id: string; name: string } | string;
  state?: { id: string; name: string } | string;
  city?: { id: string; name: string } | string;
  workingHoursPolicy?: { id: string; name: string } | string;
  leavesPolicy?: { id: string; name: string } | string;

  // Relation objects for display
  departmentRelation?: { id: string; name: string };
  subDepartmentRelation?: { id: string; name: string };
  designationRelation?: { id: string; name: string };
  employeeGradeRelation?: { id: string; grade: string };
  maritalStatusRelation?: { id: string; name: string };
  employmentStatusRelation?: { id: string; status: string };
  countryRelation?: { id: string; name: string };
  stateRelation?: { id: string; name: string };
  cityRelation?: { id: string; name: string };
  workingHoursPolicyRelation?: {
    id: string;
    name: string;
    startWorkingHours?: string;
    endWorkingHours?: string;
    startBreakTime?: string;
    endBreakTime?: string;
    lateStartTime?: string;
    shortDayMins?: number;
  };
  leavesPolicyRelation?: { id: string; name: string };
  avatarUrl?: string | null;
  qualifications?: {
    id: string;
    degree: string;
    institution: string;
    passingYear: string;
    gradeOrDivision?: string;
  }[];
  createdAt: string;
  updatedAt: string;
  status: string;
}

export const employeeApi = {
  getProfile: (id: string, includeHistory: boolean = false) =>
    fetchApi<{ status: boolean; data: Employee }>(`/employees/${id}?includeHistory=${includeHistory}`),
};

export const dashboardApi = {
  getStats: () => fetchApi<DashboardStats>('/dashboard/stats'),
  getEmployeeStats: () => fetchApi<EmployeeDashboardStats>('/dashboard/employee-stats'),
};

export interface EmployeeDashboardStats {
  overview: {
    presentMonth: number;
    absentMonth: number;
    lateMonth: number;
    pendingLeaves: number;
    pendingAttendanceQueries: number;
  };
  upcomingHoliday?: {
    name: string;
    dateFrom: string;
    dateTo: string;
  };
  recentActivities: {
    date: string;
    checkIn?: string;
    checkOut?: string;
    status: string;
  }[];
}

// Types
export interface Department {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  subDepartments?: SubDepartment[];
}

export interface SubDepartment {
  id: number;
  name: string;
  departmentId: number;
  department?: Department;
  createdAt: string;
  updatedAt: string;
}

// Purchase Requisition Types and API
export interface PurchaseRequisition {
  id: string;
  prNumber: string;
  requestedBy: string;
  department?: string;
  requestDate: string;
  status: string;
  notes?: string;
  items: PurchaseRequisitionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRequisitionItem {
  id: string;
  itemId: string;
  description?: string;
  requiredQty: string;
  neededByDate?: string;
}

export const purchaseRequisitionApi = {
  getAll: (status?: string) => fetchApi<PurchaseRequisition[]>(`/purchase-requisition${status ? `?status=${status}` : ''}`),
  getById: (id: string) => fetchApi<PurchaseRequisition>(`/purchase-requisition/${id}`),
  create: (data: any) => fetchApi<PurchaseRequisition>('/purchase-requisition', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchApi<PurchaseRequisition>(`/purchase-requisition/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchApi<void>(`/purchase-requisition/${id}`, {
    method: 'DELETE',
  }),
};


// RFQ Types and API

export interface RfqVendor {
  id: string;
  vendorId: string;
  sentAt?: string;
  responseStatus: string;
  vendor: {
    id: string;
    code: string;
    name: string;
    email?: string;
    contactNo?: string;
  };
}

export interface RequestForQuotation {
  id: string;
  rfqNumber: string;
  purchaseRequisitionId: string;
  rfqDate: string;
  status: string;
  notes?: string;
  vendors: RfqVendor[];
  purchaseRequisition: PurchaseRequisition;
  createdAt: string;
  updatedAt: string;
}

export const rfqApi = {
  getAll: (status?: string) => fetchApi<RequestForQuotation[]>(`/rfq${status ? `?status=${status}` : ''}`),
  getById: (id: string) => fetchApi<RequestForQuotation>(`/rfq/${id}`),
  create: (data: any) => fetchApi<RequestForQuotation>('/rfq', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  addVendors: (id: string, vendorIds: string[]) => fetchApi<RequestForQuotation>(`/rfq/${id}/vendors`, {
    method: 'POST',
    body: JSON.stringify({ vendorIds }),
  }),
  markAsSent: (id: string) => fetchApi<RequestForQuotation>(`/rfq/${id}/send`, {
    method: 'POST',
  }),
  update: (id: string, data: any) => fetchApi<RequestForQuotation>(`/rfq/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchApi<void>(`/rfq/${id}`, {
    method: 'DELETE',
  }),
};

// Item API
export interface MasterItem {
  id: string;
  code: string;
  name: string;
  itemClass?: { name: string };
  itemSubclass?: { name: string };
  uom?: { name: string };
  description?: string;
}

export const itemApi = {
  getAll: () => fetchApi<{ status: boolean; data: MasterItem[] }>('/master/erp/item'),
  getById: (id: string) => fetchApi<{ status: boolean; data: MasterItem }>(`/master/erp/item/${id}`),
};


// Vendor Quotation Types and API

export interface VendorQuotationItem {
  id: string;
  itemId: string;
  description?: string;
  quotedQty: string;
  unitPrice: string;
  taxPercent: string;
  discountPercent: string;
  lineTotal: string;
}

export interface VendorQuotation {
  id: string;
  rfqId: string;
  vendorId: string;
  quotationDate: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  notes?: string;
  items: VendorQuotationItem[];
  vendor: {
    id: string;
    code: string;
    name: string;
    email?: string;
    contactNo?: string;
  };
  rfq: RequestForQuotation;
  createdAt: string;
  updatedAt: string;
}

export const vendorQuotationApi = {
  getAll: (rfqId?: string) => fetchApi<VendorQuotation[]>(`/vendor-quotation${rfqId ? `?rfqId=${rfqId}` : ''}`),
  getById: (id: string) => fetchApi<VendorQuotation>(`/vendor-quotation/${id}`),
  compare: (rfqId: string) => fetchApi<VendorQuotation[]>(`/vendor-quotation/compare/${rfqId}`),
  create: (data: any) => fetchApi<VendorQuotation>('/vendor-quotation', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  submit: (id: string) => fetchApi<VendorQuotation>(`/vendor-quotation/${id}/submit`, {
    method: 'POST',
  }),
  select: (id: string) => fetchApi<VendorQuotation>(`/vendor-quotation/${id}/select`, {
    method: 'POST',
  }),
  update: (id: string, data: any) => fetchApi<VendorQuotation>(`/vendor-quotation/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchApi<void>(`/vendor-quotation/${id}`, {
    method: 'DELETE',
  }),
};

// Purchase Order Types and API

export interface PurchaseOrderItem {
  id: string;
  itemId: string;
  description?: string;
  quantity: string;
  unitPrice: string;
  taxPercent: string;
  discountPercent: string;
  lineTotal: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorQuotationId: string;
  vendorId: string;
  rfqId?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  notes?: string;
  items: PurchaseOrderItem[];
  vendor: {
    name: string;
    code: string;
  };
  vendorQuotation?: VendorQuotation;
  createdAt: string;
  updatedAt: string;
}

export const purchaseOrderApi = {
  getAll: () => fetchApi<PurchaseOrder[]>('/purchase-order'),
  getById: (id: string) => fetchApi<PurchaseOrder>(`/purchase-order/${id}`),
  create: (data: { vendorQuotationId: string; notes?: string; expectedDeliveryDate?: string }) =>
    fetchApi<PurchaseOrder>('/purchase-order', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, status: string) =>
    fetchApi<PurchaseOrder>(`/purchase-order/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
