'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Autocomplete } from '@/components/ui/autocomplete';
import { EmployeeSelect } from '@/components/employees/employee-select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { getDepartments, getSubDepartmentsByDepartment } from '@/lib/actions/department';
import { getEmployeeById } from '@/lib/actions/employee';
import { createCprTax } from '@/lib/actions/cpr-tax';

export default function CreateCprTaxPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [subDepartments, setSubDepartments] = useState<any[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);

  const [formData, setFormData] = useState({
    departmentId: '',
    subDepartmentId: '',
    employeeId: '',
    cnic: '',
    name: '',
    city: '',
    cprNo: '',
    carAmount: '',
    ntn: '',
    taxableAmountAnnual: '',
    taxableAmountGross: '',
    taxAmountMonthlyTax: '',
    taxPeriod: '',
    paymentDate: '',
  });

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const result = await getDepartments();
        if (result.status && result.data) {
          setDepartments(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch sub-departments when department changes
  useEffect(() => {
    const fetchSubDeps = async () => {
      if (formData.departmentId) {
        try {
          const result = await getSubDepartmentsByDepartment(formData.departmentId);
          if (result.status && result.data) {
            setSubDepartments(result.data);
          } else {
            setSubDepartments([]);
          }
        } catch (error) {
          console.error('Failed to fetch sub departments:', error);
          setSubDepartments([]);
        }
      } else {
        setSubDepartments([]);
      }
    };
    fetchSubDeps();
  }, [formData.departmentId]);

  // Handle employee selection to auto-fill CNIC and Name
  const handleEmployeeChange = async (employeeId: string) => {
    setFormData((prev) => ({ ...prev, employeeId }));
    
    if (employeeId) {
      setEmployeeLoading(true);
      try {
        const result = await getEmployeeById(employeeId);
        if (result.status && result.data) {
          setFormData((prev) => ({
            ...prev,
            name: result.data.employeeName || '',
            cnic: result.data.cnicNumber || '',
          }));
          toast.info('Auto-filled Employee Name and CNIC');
        }
      } catch (error) {
        console.error('Failed to load employee details:', error);
      } finally {
        setEmployeeLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cnic.trim()) {
      toast.error('CNIC is required');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!formData.cprNo.trim()) {
      toast.error('CPR Number is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employeeId: formData.employeeId || undefined,
        cnic: formData.cnic.trim(),
        name: formData.name.trim(),
        city: formData.city.trim() || undefined,
        cprNo: formData.cprNo.trim(),
        carAmount: formData.carAmount ? parseFloat(formData.carAmount) : undefined,
        ntn: formData.ntn.trim() || undefined,
        taxableAmountAnnual: formData.taxableAmountAnnual ? parseFloat(formData.taxableAmountAnnual) : undefined,
        taxableAmountGross: formData.taxableAmountGross ? parseFloat(formData.taxableAmountGross) : undefined,
        taxAmountMonthlyTax: formData.taxAmountMonthlyTax ? parseFloat(formData.taxAmountMonthlyTax) : undefined,
        taxPeriod: formData.taxPeriod.trim() || undefined,
        paymentDate: formData.paymentDate ? new Date(formData.paymentDate).toISOString() : undefined,
      };

      const result = await createCprTax(payload);

      if (result.status) {
        toast.success(result.message || 'CPR Tax record created successfully');
        router.push('/hr/payroll-setup/cpr-tax/view');
      } else {
        toast.error(result.message || 'Failed to create CPR Tax record');
      }
    } catch (error) {
      console.error('Error creating CPR Tax record:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header and Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/hr/payroll-setup/cpr-tax/view">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create CPR Tax Form</h1>
            <p className="text-sm text-muted-foreground">Add new CPR Tax records manually</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-lg border border-border/50">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle>CPR Tax Information</CardTitle>
            <CardDescription>
              Link this record to an employee or enter the taxpayer details directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            {/* Employee Matching Fields (Optional) */}
            <div className="bg-muted/10 border border-dashed border-border p-4 rounded-xl space-y-4">
              <h3 className="text-sm font-semibold text-foreground/80">Employee Linking (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Department filter */}
                <div className="space-y-2">
                  <Label htmlFor="department">Filter Department</Label>
                  <Autocomplete
                    options={departments.map((dept) => ({
                      value: dept.id,
                      label: dept.name,
                    }))}
                    value={formData.departmentId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        departmentId: value,
                        subDepartmentId: '',
                        employeeId: '',
                      }))
                    }
                    placeholder="Select Department"
                    searchPlaceholder="Search department..."
                  />
                </div>

                {/* Sub Department filter */}
                <div className="space-y-2">
                  <Label htmlFor="subDepartment">Filter Sub Department</Label>
                  <Autocomplete
                    options={subDepartments.map((subDept) => ({
                      value: subDept.id,
                      label: subDept.name,
                    }))}
                    value={formData.subDepartmentId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        subDepartmentId: value,
                        employeeId: '',
                      }))
                    }
                    placeholder={formData.departmentId ? 'Select Sub Department' : 'Select department first'}
                    searchPlaceholder="Search sub department..."
                    disabled={!formData.departmentId}
                  />
                </div>

                {/* Employee selection */}
                <div className="space-y-2">
                  <Label htmlFor="employee">Select Employee</Label>
                  <EmployeeSelect
                    value={formData.employeeId}
                    onValueChange={handleEmployeeChange}
                    departmentId={formData.departmentId || undefined}
                    subDepartmentId={formData.subDepartmentId || undefined}
                    placeholder="Select Employee"
                    searchPlaceholder="Search employee..."
                  />
                </div>
              </div>
            </div>

            {/* Main taxpayer fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Payer Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Taxpayer Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter taxpayer name"
                    required
                    disabled={employeeLoading}
                  />
                  {employeeLoading && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Payer CNIC */}
              <div className="space-y-2">
                <Label htmlFor="cnic">
                  Taxpayer CNIC <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="cnic"
                    value={formData.cnic}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cnic: e.target.value }))}
                    placeholder="e.g. 42501-1498900-1"
                    required
                    disabled={employeeLoading}
                  />
                  {employeeLoading && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* CPR Number */}
              <div className="space-y-2">
                <Label htmlFor="cprNo">
                  CPR Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cprNo"
                  value={formData.cprNo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cprNo: e.target.value }))}
                  placeholder="e.g. IT-20260529-0101-1714853"
                  required
                />
              </div>

              {/* Tax Payer NTN */}
              <div className="space-y-2">
                <Label htmlFor="ntn">Taxpayer NTN (Optional)</Label>
                <Input
                  id="ntn"
                  value={formData.ntn}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ntn: e.target.value }))}
                  placeholder="e.g. 1234567-8"
                />
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city">City (Optional)</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="e.g. KARACHI"
                />
              </div>

              {/* Car Amount */}
              <div className="space-y-2">
                <Label htmlFor="carAmount">Car Amount (Optional)</Label>
                <Input
                  id="carAmount"
                  type="number"
                  value={formData.carAmount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, carAmount: e.target.value }))}
                  placeholder="e.g. 2209835"
                />
              </div>

              {/* Taxable Amount Annual */}
              <div className="space-y-2">
                <Label htmlFor="taxableAmountAnnual">Taxable Amount Annual (Optional)</Label>
                <Input
                  id="taxableAmountAnnual"
                  type="number"
                  value={formData.taxableAmountAnnual}
                  onChange={(e) => setFormData((prev) => ({ ...prev, taxableAmountAnnual: e.target.value }))}
                  placeholder="Annual Taxable Amount"
                />
              </div>

              {/* Taxable Amount Gross */}
              <div className="space-y-2">
                <Label htmlFor="taxableAmountGross">Taxable Amount Gross (Optional)</Label>
                <Input
                  id="taxableAmountGross"
                  type="number"
                  value={formData.taxableAmountGross}
                  onChange={(e) => setFormData((prev) => ({ ...prev, taxableAmountGross: e.target.value }))}
                  placeholder="Gross Taxable Amount"
                />
              </div>

              {/* Tax Amount Monthly Tax */}
              <div className="space-y-2">
                <Label htmlFor="taxAmountMonthlyTax">Monthly Tax Amount (Optional)</Label>
                <Input
                  id="taxAmountMonthlyTax"
                  type="number"
                  value={formData.taxAmountMonthlyTax}
                  onChange={(e) => setFormData((prev) => ({ ...prev, taxAmountMonthlyTax: e.target.value }))}
                  placeholder="Monthly Tax Amount"
                />
              </div>

              {/* Tax Period */}
              <div className="space-y-2">
                <Label htmlFor="taxPeriod">Tax Period (Optional)</Label>
                <Input
                  id="taxPeriod"
                  value={formData.taxPeriod}
                  onChange={(e) => setFormData((prev) => ({ ...prev, taxPeriod: e.target.value }))}
                  placeholder="e.g. 2026-05"
                />
              </div>

              {/* Payment Date */}
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date (Optional)</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, paymentDate: e.target.value }))}
                />
              </div>

            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <Link href="/hr/payroll-setup/cpr-tax/view">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading || employeeLoading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save CPR Tax
                  </>
                )}
              </Button>
            </div>

          </CardContent>
        </Card>
      </form>
    </div>
  );
}
