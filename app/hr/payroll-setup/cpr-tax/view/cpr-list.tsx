'use client';

import { useState, useMemo } from 'react';
import DataTable from '@/components/common/data-table';
import { columns, type CprTaxRow } from './columns';
import { Button } from '@/components/ui/button';
import { Printer, Download, Plus, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CprTaxRecord, queueCprTaxesExport } from '@/lib/actions/cpr-tax';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { EmployeeMultiSelect } from '@/components/employees/employee-multi-select';

interface CprListProps {
  initialData?: CprTaxRecord[];
}

export function CprList({ initialData = [] }: CprListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentMonth = searchParams.get('month') || '';
  const currentYear = searchParams.get('year') || '';

  // Parse initial Month-Year values from URL query params
  const [monthYears, setMonthYears] = useState<string[]>(() => {
    const monthsParam = searchParams.get('months');
    if (monthsParam) {
      return monthsParam.split(',').filter(Boolean);
    }
    if (currentYear && currentMonth) {
      return [`${currentYear}-${currentMonth.padStart(2, '0')}`];
    }
    return [];
  });

  // Parse initial Employee selections from URL query params
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(() => {
    const empParam = searchParams.get('employeeIds');
    if (empParam) {
      return empParam.split(',').filter(Boolean);
    }
    return [];
  });

  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Transform API records to CprTaxRow format
  const data = useMemo<CprTaxRow[]>(() => {
    return initialData.map((record, index) => {
      const carVal = record.carAmount !== null ? Number(record.carAmount) : null;
      const monthlyCarBenefit = carVal !== null ? (carVal * 0.05) / 12 : null;

      return {
        id: record.id,
        sNo: index + 1,
        employeeId: record.employeeId,
        employeeCode: record.employee?.employeeId || '—',
        employeeName: record.employee?.employeeName || '—',
        name: record.name || '—',
        cnic: record.cnic || '—',
        cprNo: record.cprNo || '—',
        city: record.city || '—',
        carAmount: carVal,
        monthlyCarBenefit,
        ntn: record.ntn || '—',
        taxableAmountAnnual: record.taxableAmountAnnual !== null ? Number(record.taxableAmountAnnual) : null,
        taxableAmountGross: record.taxableAmountGross !== null ? Number(record.taxableAmountGross) : null,
        taxAmountMonthlyTax: record.taxAmountMonthlyTax !== null ? Number(record.taxAmountMonthlyTax) : null,
        taxAmountAnnual: record.taxAmountAnnual !== null ? Number(record.taxAmountAnnual) : null,
        taxPeriod: record.taxPeriod || '—',
        paymentDate: record.paymentDate || null,
      };
    });
  }, [initialData]);

  const filteredData = useMemo(() => {
    let result = data;

    if (selectedEmployeeIds.length > 0) {
      const empSet = new Set(selectedEmployeeIds);
      result = result.filter((row) => row.employeeId && empSet.has(row.employeeId));
    }

    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase().trim();
      result = result.filter((row) => {
        return (
          row.name.toLowerCase().includes(searchLower) ||
          row.cnic.toLowerCase().includes(searchLower) ||
          row.cprNo.toLowerCase().includes(searchLower) ||
          row.employeeName.toLowerCase().includes(searchLower) ||
          row.employeeCode.toLowerCase().includes(searchLower) ||
          (row.city && row.city.toLowerCase().includes(searchLower)) ||
          (row.ntn && row.ntn.toLowerCase().includes(searchLower))
        );
      });
    }

    return result;
  }, [data, searchQuery, selectedEmployeeIds]);

  const handleMonthYearChange = (val: string | string[]) => {
    const selected = Array.isArray(val) ? val : [val];
    setMonthYears(selected);
    
    const params = new URLSearchParams(searchParams.toString());
    if (selected.length > 0) {
      params.set('months', selected.join(','));
    } else {
      params.delete('months');
      params.delete('month');
      params.delete('year');
    }
    const queryString = params.toString();
    router.push(`/hr/payroll-setup/cpr-tax/view${queryString ? `?${queryString}` : ''}`);
  };

  const handleEmployeeChange = (empIds: string[]) => {
    setSelectedEmployeeIds(empIds);

    const params = new URLSearchParams(searchParams.toString());
    if (empIds.length > 0) {
      params.set('employeeIds', empIds.join(','));
    } else {
      params.delete('employeeIds');
    }
    const queryString = params.toString();
    router.push(`/hr/payroll-setup/cpr-tax/view${queryString ? `?${queryString}` : ''}`);
  };

  const handleClearFilter = () => {
    setMonthYears([]);
    setSelectedEmployeeIds([]);
    router.push('/hr/payroll-setup/cpr-tax/view');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      'S.No',
      'Employee ID',
      'Employee Name',
      'Taxpayer Name',
      'Taxpayer CNIC',
      'CPR Number',
      'Car Amount',
      'Car Perk (5%/12)',
      'Taxable Amount Annual',
      'Taxable Amount Gross',
      'Annual Tax Amount',
      'Monthly Tax Amount',
      'Tax Period',
      'Payment Date',
      'City',
      'NTN',
    ];

    const rows = filteredData.map((row, idx) => {
      let formattedDate = '—';
      if (row.paymentDate) {
        const date = new Date(row.paymentDate);
        formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }

      return [
        idx + 1,
        row.employeeCode,
        row.employeeName,
        row.name,
        row.cnic,
        row.cprNo,
        row.carAmount !== null ? row.carAmount.toString() : '—',
        row.monthlyCarBenefit !== null ? row.monthlyCarBenefit.toFixed(2) : '—',
        row.taxableAmountAnnual !== null ? row.taxableAmountAnnual.toString() : '—',
        row.taxableAmountGross !== null ? row.taxableAmountGross.toString() : '—',
        row.taxAmountAnnual !== null ? row.taxAmountAnnual.toString() : '—',
        row.taxAmountMonthlyTax !== null ? row.taxAmountMonthlyTax.toString() : '—',
        row.taxPeriod,
        formattedDate,
        row.city,
        row.ntn,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cpr_tax_records_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('CPR Tax records exported successfully');
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await queueCprTaxesExport({
        search: searchQuery,
        months: monthYears.join(','),
        employeeIds: selectedEmployeeIds.join(','),
      });
      if (res.status) {
        toast.success(res.message || "Export queued successfully. You'll be notified when it's ready.");
      } else {
        toast.error(res.message || 'Failed to queue export');
      }
    } catch (err) {
      toast.error('An error occurred while queuing export');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header and Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">CPR Tax Form Records</h2>
          <p className="text-muted-foreground">
            Search, print, export and manage CPR tax entries
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/hr/payroll-setup/cpr-tax/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create CPR Tax
            </Button>
          </Link>
          <Button variant="secondary" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="secondary" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="secondary" onClick={handleExportExcel} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-4 bg-muted/20 p-4 border border-border/50 rounded-xl flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground/80 whitespace-nowrap">Month-Year:</span>
          <MonthYearPicker
            value={monthYears}
            onChange={handleMonthYearChange}
            placeholder="Select Month & Year"
            className="w-[240px]"
            multiple={true}
          />
        </div>

        <div className="flex items-center gap-3 min-w-[280px] max-w-[400px] flex-1">
          <span className="text-sm font-semibold text-foreground/80 whitespace-nowrap">Employees:</span>
          <EmployeeMultiSelect
            value={selectedEmployeeIds}
            onValueChange={handleEmployeeChange}
            placeholder="All Employees"
            className="w-full"
            maxDisplayedItems={2}
          />
        </div>

        {(monthYears.length > 0 || selectedEmployeeIds.length > 0) && (
          <Button variant="outline" size="sm" onClick={handleClearFilter} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Data Table */}
      <DataTable<CprTaxRow>
        columns={columns}
        data={filteredData}
        manualFiltering={true}
        onSearchChange={setSearchQuery}
        searchFields={[
          { key: 'name', label: 'Taxpayer Name' },
          { key: 'cnic', label: 'Taxpayer CNIC' },
          { key: 'cprNo', label: 'CPR Number' },
          { key: 'employeeName', label: 'Employee Name' },
          { key: 'employeeCode', label: 'Employee ID' },
          { key: 'taxPeriod', label: 'Tax Period' },
        ]}
        tableId="cpr-tax-list"
      />
    </div>
  );
}
