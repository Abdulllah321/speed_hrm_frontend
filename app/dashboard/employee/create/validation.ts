// import { z } from "zod";

// // CNIC validation
// const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
// const validateCNIC = (value: string) => {
//   return cnicRegex.test(value);
// };

// // Email validation
// const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// // Phone validation (Pakistani format)
// const phoneRegex = /^(\+92|0)[0-9]{10}$/;

// // Account number validation (basic check)
// const accountNumberRegex = /^\d{7,26}$/;

// export const employeeFormSchema = z.object({
//   // Basic Information
//   employeeId: z
//     .string()
//     .min(1, "Employee ID is required")
//     .min(5, "Employee ID must be at least 5 characters")
//     .max(20, "Employee ID must not exceed 20 characters"),
  
//   employeeName: z
//     .string()
//     .min(1, "Employee Name is required")
//     .min(3, "Employee Name must be at least 3 characters")
//     .max(100, "Employee Name must not exceed 100 characters"),
  
//   fatherHusbandName: z
//     .string()
//     .min(1, "Father/Husband Name is required")
//     .min(3, "Father/Husband Name must be at least 3 characters")
//     .max(100, "Father/Husband Name must not exceed 100 characters"),
  
//   department: z
//     .string()
//     .min(1, "Department is required"),
  
//   subDepartment: z
//     .string()
//     .optional(),
  
//   employeeGrade: z
//     .string()
//     .min(1, "Employee Grade is required"),
  
//   attendanceId: z
//     .string()
//     .min(1, "Attendance ID is required")
//     .min(3, "Attendance ID must be at least 3 characters")
//     .max(20, "Attendance ID must not exceed 20 characters"),
  
//   designation: z
//     .string()
//     .min(1, "Designation is required"),
  
//   maritalStatus: z
//     .string()
//     .min(1, "Marital Status is required"),
  
//   employmentStatus: z
//     .string()
//     .min(1, "Employment Status is required"),
  
//   probationExpiryDate: z
//     .string()
//     .optional(),
  
//   cnicNumber: z
//     .string()
//     .min(1, "CNIC Number is required")
//     .refine(
//       (value) => validateCNIC(value),
//       "CNIC must be in format: 00000-0000000-0"
//     ),
  
//   cnicExpiryDate: z
//     .string()
//     .optional(),
  
//   lifetimeCnic: z
//     .boolean()
//     .default(false),
  
//   joiningDate: z
//     .string()
//     .min(1, "Joining Date is required")
//     .refine(
//       (date) => {
//         const selectedDate = new Date(date);
//         return selectedDate <= new Date();
//       },
//       "Joining Date cannot be in the future"
//     ),
  
//   dateOfBirth: z
//     .string()
//     .min(1, "Date of Birth is required")
//     .refine(
//       (date) => {
//         const dob = new Date(date);
//         const today = new Date();
//         const age = today.getFullYear() - dob.getFullYear();
//         return age >= 18;
//       },
//       "Employee must be at least 18 years old"
//     ),
  
//   nationality: z
//     .string()
//     .min(1, "Nationality is required"),
  
//   gender: z
//     .string()
//     .min(1, "Gender is required"),
  
//   contactNumber: z
//     .string()
//     .min(1, "Contact Number is required")
//     .refine(
//       (value) => /^03\d{2}-\d{7}$|^\+92\d{10}$/.test(value.replace(/\s/g, "")),
//       "Contact Number must be in format: 03XX-XXXXXXX"
//     ),
  
//   emergencyContactNumber: z
//     .string()
//     .optional()
//     .refine(
//       (value) => !value || /^03\d{2}-\d{7}$|^\+92\d{10}$/.test(value.replace(/\s/g, "")),
//       "Emergency Contact Number must be in format: 03XX-XXXXXXX"
//     ),
  
//   emergencyContactPersonName: z
//     .string()
//     .optional(),
  
//   personalEmail: z
//     .string()
//     .optional()
//     .refine(
//       (value) => !value || emailRegex.test(value),
//       "Personal Email must be a valid email address"
//     ),
  
//   officialEmail: z
//     .string()
//     .min(1, "Official Email is required")
//     .email("Official Email must be a valid email address"),
  
//   country: z
//     .string()
//     .min(1, "Country is required"),
  
//   state: z
//     .string()
//     .min(1, "State is required"),
  
//   city: z
//     .string()
//     .min(1, "City is required"),
  
//   employeeSalary: z
//     .string()
//     .min(1, "Employee Salary is required")
//     .refine(
//       (value) => {
//         const num = parseFloat(value);
//         return !isNaN(num) && num > 0;
//       },
//       "Employee Salary must be a positive number"
//     ),
  
//   // Benefits
//   eobi: z
//     .boolean()
//     .default(false),
  
//   eobiNumber: z
//     .string()
//     .optional()
//     .refine(
//       (value) => !value || /^\d{7,10}$/.test(value),
//       "EOBI Number must contain only digits"
//     ),
  
//   providentFund: z
//     .boolean()
//     .default(false),
  
//   overtimeApplicable: z
//     .boolean()
//     .default(false),
  
//   daysOff: z
//     .string()
//     .optional(),
  
//   reportingManager: z
//     .string()
//     .min(1, "Reporting Manager is required")
//     .min(3, "Reporting Manager name must be at least 3 characters"),
  
//   workingHoursPolicy: z
//     .string()
//     .min(1, "Working Hours Policy is required"),
  
//   branch: z
//     .string()
//     .min(1, "Branch is required"),
  
//   leavesPolicy: z
//     .string()
//     .min(1, "Leaves Policy is required"),
  
//   allowRemoteAttendance: z
//     .boolean()
//     .default(false),
  
//   // Address Information
//   currentAddress: z
//     .string()
//     .optional(),
  
//   permanentAddress: z
//     .string()
//     .optional(),
  
//   // Bank Account Details
//   bankName: z
//     .string()
//     .min(1, "Bank Name is required"),
  
//   accountNumber: z
//     .string()
//     .min(1, "Account Number is required")
//     .refine(
//       (value) => accountNumberRegex.test(value),
//       "Account Number must be between 7-26 digits"
//     ),
  
//   accountTitle: z
//     .string()
//     .min(1, "Account Title is required")
//     .min(3, "Account Title must be at least 3 characters")
//     .max(100, "Account Title must not exceed 100 characters"),
  
//   // Login Credentials
//   accountType: z
//     .string()
//     .optional(),
  
//   password: z
//     .string()
//     .optional()
//     .refine(
//       (value) => !value || value.length >= 6,
//       "Password must be at least 6 characters"
//     ),
  
//   roles: z
//     .string()
//     .optional(),
  
//   // Equipment
//   selectedEquipments: z
//     .array(z.string())
//     .default([]),
// });

// export type EmployeeFormData = z.infer<typeof employeeFormSchema>;
