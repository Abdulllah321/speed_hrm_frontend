'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calculator, Calendar, Car, FileText, User, ShieldCheck } from 'lucide-react';

export interface CprCalculationDetails {
  employeeCode?: string;
  employeeName?: string;
  name: string;
  cnic: string;
  cprNo?: string;
  city?: string | null;
  ntn?: string | null;
  taxPeriod?: string | null;
  carAmount?: number | null;
  carBenefit?: number | null;
  baseAnnualTaxable?: number | null;
  taxableAmountAnnual?: number | null;
  taxableAmountGross?: number | null;
  taxAmountAnnual?: number | null;
  taxAmountMonthlyTax?: number | null;
  ytdTaxDeducted?: number | null;
  remainingMonths?: number | null;
  slab?: {
    minAmount: number;
    maxAmount: number | null;
    rate: number;
    fixedAmount: number;
  } | null;
}

interface CprCalculationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: CprCalculationDetails | null;
}

const formatPKR = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return 'PKR 0';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(Number(amount));
};

export function CprCalculationModal({ open, onOpenChange, record }: CprCalculationModalProps) {
  if (!record) return null;

  const carVal = Number(record.carAmount || 0);
  const carBenefitVal = record.carBenefit !== undefined && record.carBenefit !== null 
    ? Number(record.carBenefit) 
    : carVal * 0.05;

  const totalAnnualTaxable = record.taxableAmountAnnual !== null && record.taxableAmountAnnual !== undefined
    ? Number(record.taxableAmountAnnual)
    : (Number(record.baseAnnualTaxable || 0) + carBenefitVal);

  const grossMonthly = Number(record.taxableAmountGross || 0);
  const annualTax = Number(record.taxAmountAnnual || 0);
  const monthlyTax = Number(record.taxAmountMonthlyTax || 0);
  const ytdTax = Number(record.ytdTaxDeducted || 0);
  const remainingMonths = Number(record.remainingMonths || 12);
  const remainingTax = Math.max(0, annualTax - ytdTax);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border border-border shadow-2xl">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  CPR Tax Calculation Preview
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Detailed step-by-step income tax calculation formula breakdown
                </DialogDescription>
              </div>
            </div>
            {record.taxPeriod && (
              <Badge variant="outline" className="px-3 py-1 text-sm bg-primary/5 text-primary border-primary/20">
                <Calendar className="h-3.5 w-3.5 mr-1.5 inline" />
                Tax Period: {record.taxPeriod}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4 text-sm">
          {/* Taxpayer & Employee Info Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                <User className="h-3.5 w-3.5 text-primary" /> Taxpayer Profile
              </div>
              <p className="font-semibold text-base text-foreground">{record.name}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">CNIC:</span> {record.cnic}
              </p>
              {record.cprNo && (
                <p className="text-xs text-muted-foreground font-mono">
                  <span className="font-medium text-foreground">CPR No:</span> {record.cprNo}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                <FileText className="h-3.5 w-3.5 text-primary" /> Employee Details
              </div>
              <p className="font-semibold text-foreground">
                {record.employeeName || '—'} {record.employeeCode ? `(${record.employeeCode})` : ''}
              </p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span><strong className="text-foreground">City:</strong> {record.city || '—'}</span>
                <span><strong className="text-foreground">NTN:</strong> {record.ntn || '—'}</span>
              </div>
            </div>
          </div>

          {/* Formula Steps */}
          <div className="space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Tax Calculation Breakdown
            </h3>

            {/* Step 1: Monthly Gross & Car Benefit */}
            <Card className="border border-border/60 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold text-foreground text-sm">Step 1: Monthly Taxable Salary & Car Perk</span>
                  <Badge variant="secondary" className="text-xs">Gross Income</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-background p-3 rounded-lg border border-border/40 space-y-1">
                    <span className="text-muted-foreground font-medium">Monthly Taxable Gross:</span>
                    <p className="text-base font-bold text-foreground">{formatPKR(grossMonthly)}</p>
                    <p className="text-[11px] text-muted-foreground">Sum of taxable basic salary & taxable allowances</p>
                  </div>

                  <div className="bg-background p-3 rounded-lg border border-border/40 space-y-1">
                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                      <Car className="h-3.5 w-3.5 text-blue-500" /> Car Perk Value & 5% Benefit:
                    </span>
                    <div className="flex justify-between items-center text-xs">
                      <span>Car Amount:</span>
                      <strong className="text-foreground">{formatPKR(carVal)}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs text-blue-600 font-semibold pt-1 border-t">
                      <span>Annual Car Benefit (5%):</span>
                      <span>+ {formatPKR(carBenefitVal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-emerald-600 font-medium">
                      <span>Monthly Car Benefit (5%/12):</span>
                      <span>{formatPKR(carBenefitVal / 12)} / mo</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Annual Taxable & Tax Slab */}
            <Card className="border border-border/60 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold text-foreground text-sm">Step 2: Total Annual Taxable Income & Tax Slab</span>
                  <Badge variant="secondary" className="text-xs">Tax Slab</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-background p-3 rounded-lg border border-border/40 space-y-1">
                    <span className="text-muted-foreground font-medium">Total Annual Taxable Income:</span>
                    <p className="text-lg font-extrabold text-primary">{formatPKR(totalAnnualTaxable)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Base Annual Income + 5% Car Benefit
                    </p>
                  </div>

                  <div className="bg-background p-3 rounded-lg border border-border/40 space-y-1">
                    <span className="text-muted-foreground font-medium">Matched FBR Tax Slab:</span>
                    {record.slab ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Slab Range:</span>
                          <strong className="text-foreground">
                            {formatPKR(record.slab.minAmount)} – {record.slab.maxAmount ? formatPKR(record.slab.maxAmount) : 'Above'}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Fixed Base Tax:</span>
                          <strong className="text-foreground">{formatPKR(record.slab.fixedAmount)}</strong>
                        </div>
                        <div className="flex justify-between text-emerald-600">
                          <span>Tax Rate on Excess:</span>
                          <strong>{record.slab.rate}%</strong>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">Standard Salary Slabs Applied</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Annual Tax & Remaining Months */}
            <Card className="border border-border/60 shadow-sm bg-muted/10">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-semibold text-foreground text-sm">Step 3: Annual Tax & Monthly Deduction Formula</span>
                  <Badge variant="default" className="text-xs bg-emerald-600">Final Calculation</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-background p-3 rounded-lg border border-border/40 space-y-1">
                    <span className="text-muted-foreground font-medium">Total Annual Tax:</span>
                    <p className="text-base font-bold text-foreground">{formatPKR(annualTax)}</p>
                  </div>

                  <div className="bg-background p-3 rounded-lg border border-border/40 space-y-1">
                    <span className="text-muted-foreground font-medium">YTD Tax Previously Paid:</span>
                    <p className="text-base font-bold text-amber-600">{formatPKR(ytdTax)}</p>
                    <p className="text-[10px] text-muted-foreground">Remaining: {formatPKR(remainingTax)}</p>
                  </div>

                  <div className="bg-background p-3 rounded-lg border border-border/40 space-y-1">
                    <span className="text-muted-foreground font-medium">Remaining Months in Tax Year:</span>
                    <p className="text-base font-bold text-foreground">{remainingMonths} Months</p>
                  </div>
                </div>

                {/* Final Formula Bar */}
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-center justify-between flex-wrap gap-4 mt-2">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                      Calculated Monthly Tax (CPR Tax)
                    </span>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Formula: ({formatPKR(annualTax)} – {formatPKR(ytdTax)}) ÷ {remainingMonths} Months
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {formatPKR(monthlyTax)}
                    </span>
                    <span className="text-xs text-muted-foreground block">/ Month</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
