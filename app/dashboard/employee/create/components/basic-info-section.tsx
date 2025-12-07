"use client";

import { Controller, useWatch } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Option = { id: string; name: string };

export function BasicInfoSection({ form, isPending, loadingData, departments, subDepartments, department, loadingSubDepartments, employeeGrades, designations, maritalStatuses, employeeStatuses, errors, formatCNIC, nationalities, genders, states, cities, state, loadingCities, daysOff, workingHoursPolicies, branches, leavesPolicies, documents, handleFileChange }: {
  form: UseFormReturn<any>;
  isPending: boolean;
  loadingData: boolean;
  departments: Option[];
  subDepartments: Option[];
  department?: string;
  loadingSubDepartments: boolean;
  employeeGrades: { id: string; grade: string }[];
  designations: Option[];
  maritalStatuses: Option[];
  employeeStatuses: { id: string; status: string }[];
  errors: Record<string, { message?: string }>;
  formatCNIC: (val: string) => string;
  nationalities: string[];
  genders: string[];
  states: Option[];
  cities: { id: string; name: string }[];
  state?: string;
  loadingCities: boolean;
  daysOff: string[];
  workingHoursPolicies: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  leavesPolicies: { id: string; name: string }[];
  documents: Record<string, File | null>;
  handleFileChange: (key: string, file: File | null) => void;
}) {
  const { register, control } = form;
  const lifetimeCnic = useWatch({ control, name: "lifetimeCnic" });
  const isEobi = useWatch({ control, name: "eobi" });
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="col-span-1 md:col-span-3 text-sm font-semibold text-muted-foreground">Employment Details</div>
      <div className="space-y-2">
        <Label>Employee ID <span className="text-destructive">*</span></Label>
        <Input placeholder="456XXXXXXXXXX" {...register("employeeId")} disabled={isPending} />
        {errors?.employeeId && <p className="text-xs text-red-500">{errors.employeeId.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Employee Name <span className="text-destructive">*</span></Label>
        <Input placeholder="(eg John Doe)" {...register("employeeName")} disabled={isPending} />
        {errors?.employeeName && <p className="text-xs text-red-500">{errors.employeeName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Father / Husband Name <span className="text-destructive">*</span></Label>
        <Input placeholder="(eg Richard Roe)" {...register("fatherHusbandName")} disabled={isPending} />
        {errors?.fatherHusbandName && <p className="text-xs text-red-500">{errors.fatherHusbandName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Department <span className="text-destructive">*</span></Label>
        <Controller name="department" control={control} render={({ field }) => (
          <Autocomplete options={departments.map(d => ({ value: d.id, label: d.name }))} value={field.value as string | undefined} onValueChange={field.onChange} placeholder="Select Department" disabled={isPending || loadingData} />
        )} />
        {errors?.department && <p className="text-xs text-red-500">{errors.department.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Sub Department</Label>
        <Controller name="subDepartment" control={control} render={({ field }) => (
          <Autocomplete options={subDepartments.map(sd => ({ value: sd.id, label: sd.name }))} value={field.value as string | undefined} onValueChange={field.onChange} placeholder={department ? "Select Sub Department" : "Select Department first"} disabled={isPending || !department || loadingData || loadingSubDepartments} isLoading={loadingSubDepartments} />
        )} />
      </div>
      <div className="space-y-2">
        <Label>Employee Grade <span className="text-destructive">*</span></Label>
        <Controller name="employeeGrade" control={control} render={({ field }) => (
          <Autocomplete options={employeeGrades.map(g => ({ value: g.id, label: g.grade }))} value={field.value as string | undefined} onValueChange={field.onChange} placeholder="Select Grade" disabled={isPending || loadingData} />
        )} />
        {errors?.employeeGrade && <p className="text-xs text-red-500">{errors.employeeGrade.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Attendance ID <span className="text-destructive">*</span></Label>
        <Input placeholder="(eg ATT-00123)" {...register("attendanceId")} disabled={isPending} />
        {errors?.attendanceId && <p className="text-xs text-red-500">{errors.attendanceId.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Designation <span className="text-destructive">*</span></Label>
        <Controller name="designation" control={control} render={({ field }) => (
          <Autocomplete options={designations.map(d => ({ value: d.id, label: d.name }))} value={field.value as string | undefined} onValueChange={field.onChange} placeholder="Select Designation" disabled={isPending || loadingData} />
        )} />
        {errors?.designation && <p className="text-xs text-red-500">{errors.designation.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Marital Status <span className="text-destructive">*</span></Label>
        <Controller name="maritalStatus" control={control} render={({ field }) => (
          <Autocomplete options={maritalStatuses.map(ms => ({ value: ms.id, label: ms.name }))} value={field.value as string | undefined} onValueChange={field.onChange} placeholder="Select Marital Status" disabled={isPending || loadingData} />
        )} />
        {errors?.maritalStatus && <p className="text-xs text-red-500">{errors.maritalStatus.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Employment Status <span className="text-destructive">*</span></Label>
        <Controller name="employmentStatus" control={control} render={({ field }) => (
          <Autocomplete options={employeeStatuses.map(es => ({ value: es.id, label: es.status }))} value={field.value as string | undefined} onValueChange={field.onChange} placeholder="Select Employment Status" disabled={isPending || loadingData} />
        )} />
        {errors?.employmentStatus && <p className="text-xs text-red-500">{errors.employmentStatus.message}</p>}
      </div>
      <div className="col-span-1 md:col-span-3 text-sm font-semibold text-muted-foreground">Identification</div>
      <div className="space-y-2">
        <Label>Probation / Internship Expiry Date</Label>
        <Controller name="probationExpiryDate" control={control} render={({ field }) => (
          <DatePicker value={field.value as string | undefined} onChange={field.onChange} disabled={isPending} />
        )} />
      </div>

      <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label>CNIC Number <span className="text-destructive">*</span></Label>
          <Controller name="cnicNumber" control={control} render={({ field }) => (
            <Input
              placeholder="00000-0000000-0"
              value={(field.value as string | undefined) || ""}
              onChange={(e) => field.onChange(formatCNIC(e.target.value))}
              maxLength={15}
              disabled={isPending}
            />
          )} />
          {errors?.cnicNumber && <p className="text-xs text-red-500">{errors.cnicNumber.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>CNIC Expiry Date</Label>
          <Controller name="cnicExpiryDate" control={control} render={({ field }) => (
            <DatePicker value={field.value as string | undefined} onChange={field.onChange} disabled={isPending || !!lifetimeCnic} />
          )} />
          <div className="flex items-center gap-2 mt-1">
            <Controller name="lifetimeCnic" control={control} render={({ field }) => (
              <Switch id="lifetimeCnic" checked={!!field.value} onCheckedChange={field.onChange} />
            )} />
            <label htmlFor="lifetimeCnic" className="text-sm cursor-pointer">Lifetime CNIC</label>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Joining Date <span className="text-destructive">*</span></Label>
          <Controller name="joiningDate" control={control} render={({ field }) => (
            <DatePicker value={field.value as string | undefined} onChange={field.onChange} disabled={isPending} />
          )} />
          {errors?.joiningDate && <p className="text-xs text-red-500">{errors.joiningDate.message}</p>}
        </div>
      </div>

      <div className="col-span-1 md:col-span-3 text-sm font-semibold text-muted-foreground">Personal Details</div>
      <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Nationality <span className="text-destructive">*</span></Label>
          <Controller name="nationality" control={control} render={({ field }) => (
            <Select value={field.value as string | undefined} onValueChange={field.onChange} disabled={isPending}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{nationalities.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}</SelectContent>
            </Select>
          )} />
          {errors?.nationality && <p className="text-xs text-red-500">{errors.nationality.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Gender <span className="text-destructive">*</span></Label>
          <Controller name="gender" control={control} render={({ field }) => (
            <Select value={field.value as string | undefined} onValueChange={field.onChange} disabled={isPending}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{genders.map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}</SelectContent>
            </Select>
          )} />
          {errors?.gender && <p className="text-xs text-red-500">{errors.gender.message}</p>}
        </div>
      </div>

      <div className="col-span-1 md:col-span-3 text-sm font-semibold text-muted-foreground">Contact</div>
      <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Contact Number <span className="text-destructive">*</span></Label>
          <Input placeholder="03XX-XXXXXXX" {...register("contactNumber")} disabled={isPending} />
          {errors?.contactNumber && <p className="text-xs text-red-500">{errors.contactNumber.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Emergency Contact Number</Label>
          <Input placeholder="03XX-XXXXXXX" {...register("emergencyContactNumber")} disabled={isPending} />
        </div>
        <div className="space-y-2">
          <Label>Emergency Contact Person Name</Label>
          <Input placeholder="(eg Jane Doe)" {...register("emergencyContactPersonName")} disabled={isPending} />
        </div>
        <div className="space-y-2">
          <Label>Personal Email</Label>
          <Input placeholder="(eg jone@gmail.com)" type="email" {...register("personalEmail")} disabled={isPending} />
        </div>
        <div className="space-y-2">
          <Label>Official Email <span className="text-destructive">*</span></Label>
          <Input placeholder="(eg jone@gmail.com)" type="email" {...register("officialEmail")} disabled={isPending} />
          {errors?.officialEmail && <p className="text-xs text-red-500">{errors.officialEmail.message}</p>}
        </div>
      </div>

      <div className="col-span-1 md:col-span-3 text-sm font-semibold text-muted-foreground">Location</div>
      <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label>Country <span className="text-destructive">*</span></Label>
          <Input {...register("country")} disabled={isPending} />
          {errors?.country && <p className="text-xs text-red-500">{errors.country.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>State <span className="text-destructive">*</span></Label>
          <Controller name="state" control={control} render={({ field }) => (
            <Autocomplete options={states.map((s) => ({ value: s.id, label: s.name }))} value={field.value as string | undefined} onValueChange={field.onChange} placeholder="Select State" disabled={isPending || loadingData} />
          )} />
          {errors?.state && <p className="text-xs text-red-500">{errors.state.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>City <span className="text-destructive">*</span></Label>
          <Controller name="city" control={control} render={({ field }) => (
            <Autocomplete options={cities.map((c) => ({ value: c.id, label: c.name }))} value={field.value as string | undefined} onValueChange={field.onChange} placeholder={state ? "Select City" : "Select State first"} disabled={isPending || !state || loadingData || loadingCities} isLoading={loadingCities} />
          )} />
          {errors?.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
        </div>
      </div>

      <div className="col-span-1 md:col-span-3 text-sm font-semibold text-muted-foreground">Compensation & Policies</div>
      <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label>Employee Salary (Compensation) <span className="text-destructive">*</span></Label>
          <Input type="number" {...register("employeeSalary")} disabled={isPending} />
          {errors?.employeeSalary && <p className="text-xs text-red-500">{errors.employeeSalary.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>EOBI</Label>
          <div className="flex items-center gap-4 h-10">
            <Controller name="eobi" control={control} render={({ field }) => (
              <Switch id="eobi" checked={!!field.value} onCheckedChange={field.onChange} />
            )} />
            <label htmlFor="eobi" className="text-sm cursor-pointer">Applicable</label>
          </div>
        </div>
        {isEobi ? (
          <>
            <div className="space-y-2">
              <Label>EOBI Number</Label>
              <Input {...register("eobiNumber")} disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label>EOBI Document</Label>
              <Input
                type="file"
                onChange={(e) => handleFileChange("eobi", e.target.files?.[0] || null)}
                className="flex-1"
                disabled={isPending}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              {documents.eobi && (
                <p className="text-xs text-muted-foreground">{documents.eobi.name}</p>
              )}
            </div>
          </>
        ) : null}
        <div className="space-y-2">
          <Label>Provident Fund</Label>
          <div className="flex items-center gap-4 h-10">
            <Controller name="providentFund" control={control} render={({ field }) => (
              <Switch id="pf" checked={!!field.value} onCheckedChange={field.onChange} />
            )} />
            <label htmlFor="pf" className="text-sm cursor-pointer">Applicable</label>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Overtime Applicable</Label>
          <div className="flex items-center gap-4 h-10">
            <Controller name="overtimeApplicable" control={control} render={({ field }) => (
              <Switch id="ot" checked={!!field.value} onCheckedChange={field.onChange} />
            )} />
            <label htmlFor="ot" className="text-sm cursor-pointer">Yes</label>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Days Off</Label>
          <Controller name="daysOff" control={control} render={({ field }) => (
            <Select value={field.value as string | undefined} onValueChange={field.onChange} disabled={isPending}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{daysOff.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
            </Select>
          )} />
        </div>
        <div className="space-y-2">
          <Label>Reporting Manager <span className="text-destructive">*</span></Label>
          <Input {...register("reportingManager")} disabled={isPending} />
          {errors?.reportingManager && <p className="text-xs text-red-500">{errors.reportingManager.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Working Hours Policy <span className="text-destructive">*</span></Label>
          <Controller name="workingHoursPolicy" control={control} render={({ field }) => (
            <Autocomplete options={workingHoursPolicies.map((p) => ({ value: p.id, label: p.name }))} value={field.value as string | undefined} onValueChange={field.onChange} placeholder="Select Working Hours Policy" disabled={isPending || loadingData} />
          )} />
          {errors?.workingHoursPolicy && <p className="text-xs text-red-500">{errors.workingHoursPolicy.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Branch <span className="text-destructive">*</span></Label>
          <Controller name="branch" control={control} render={({ field }) => (
            <Autocomplete options={branches.map((b) => ({ value: b.id, label: b.name }))} value={field.value as string | undefined} onValueChange={field.onChange} placeholder="Select Branch" disabled={isPending || loadingData} />
          )} />
          {errors?.branch && <p className="text-xs text-red-500">{errors.branch.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Leaves Policy <span className="text-destructive">*</span></Label>
          <Controller name="leavesPolicy" control={control} render={({ field }) => (
            <Select value={field.value as string | undefined} onValueChange={field.onChange} disabled={isPending || loadingData}>
              <SelectTrigger><SelectValue placeholder="Select Leave Policy" /></SelectTrigger>
              <SelectContent>{leavesPolicies.map((policy) => (<SelectItem key={policy.id} value={policy.id}>{policy.name}</SelectItem>))}</SelectContent>
            </Select>
          )} />
          {errors?.leavesPolicy && <p className="text-xs text-red-500">{errors.leavesPolicy.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Allow Remote Attendance</Label>
          <div className="flex items-center gap-4 h-10">
            <Controller name="allowRemoteAttendance" control={control} render={({ field }) => (
              <Switch id="remote" checked={!!field.value} onCheckedChange={field.onChange} />
            )} />
            <label htmlFor="remote" className="text-sm cursor-pointer">Yes</label>
          </div>
        </div>
      </div>
    </div>
  );
}
