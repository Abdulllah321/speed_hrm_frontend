'use client';

import { useState, useTransition } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreHorizontal, Trash2, Loader2, Pencil, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { deleteCprTax, updateCprTax } from '@/lib/actions/cpr-tax';
import { CprCalculationModal } from '@/components/cpr-tax/cpr-calculation-modal';


export interface CprTaxRow {
  id: string;
  sNo: number;
  employeeId: string | null;
  employeeCode: string;
  employeeName: string;
  name: string;
  cnic: string;
  cprNo: string;
  city: string;
  carAmount: number | null;
  ntn: string;
  taxableAmountAnnual: number | null;
  taxableAmountGross: number | null;
  taxAmountMonthlyTax: number | null;
  taxAmountAnnual: number | null;
  taxPeriod: string;
  paymentDate: string | null;
}

const formatPKR = (amount: number | null) => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const columns: ColumnDef<CprTaxRow>[] = [
  {
    accessorKey: 'sNo',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        S.No
      </div>
    ),
    cell: ({ row }) => <div className="text-sm font-medium">{row.getValue('sNo')}</div>,
    size: 60,
  },
  {
    accessorKey: 'employeeCode',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Employee ID
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-semibold text-primary">{row.getValue('employeeCode')}</div>
    ),
    size: 110,
    enableSorting: true,
  },
  {
    accessorKey: 'employeeName',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Emp Name
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium text-foreground">{row.getValue('employeeName')}</div>
    ),
    size: 140,
    enableSorting: true,
  },
  {
    accessorKey: 'name',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Taxpayer Name
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-medium text-foreground">{row.getValue('name')}</div>
    ),
    size: 140,
    enableSorting: true,
  },
  {
    accessorKey: 'cnic',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Taxpayer CNIC
      </div>
    ),
    cell: ({ row }) => <div className="text-sm text-foreground">{row.getValue('cnic')}</div>,
    size: 130,
    enableSorting: true,
  },
  {
    accessorKey: 'cprNo',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        CPR Number
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-mono font-medium text-foreground">{row.getValue('cprNo')}</div>
    ),
    size: 160,
    enableSorting: true,
  },
  {
    accessorKey: 'carAmount',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
        Car Amount
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-semibold text-right text-foreground">
        {formatPKR(row.getValue('carAmount'))}
      </div>
    ),
    size: 120,
    enableSorting: true,
  },
  {
    accessorKey: 'taxableAmountAnnual',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
        Taxable Annual
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-semibold text-right text-foreground">
        {formatPKR(row.getValue('taxableAmountAnnual'))}
      </div>
    ),
    size: 130,
    enableSorting: true,
  },
  {
    accessorKey: 'taxableAmountGross',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
        Taxable Gross
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-semibold text-right text-foreground">
        {formatPKR(row.getValue('taxableAmountGross'))}
      </div>
    ),
    size: 130,
    enableSorting: true,
  },
  {
    accessorKey: 'taxAmountAnnual',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
        Annual Tax
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-semibold text-right text-foreground">
        {formatPKR(row.getValue('taxAmountAnnual'))}
      </div>
    ),
    size: 130,
    enableSorting: true,
  },
  {
    accessorKey: 'taxAmountMonthlyTax',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
        Monthly Tax
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm font-semibold text-right text-foreground text-red-600 dark:text-red-400">
        {formatPKR(row.getValue('taxAmountMonthlyTax'))}
      </div>
    ),
    size: 120,
    enableSorting: true,
  },
  {
    accessorKey: 'taxPeriod',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Tax Period
      </div>
    ),
    cell: ({ row }) => <div className="text-sm font-medium text-foreground">{row.getValue('taxPeriod')}</div>,
    size: 100,
    enableSorting: true,
  },
  {
    accessorKey: 'paymentDate',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Payment Date
      </div>
    ),
    cell: ({ row }) => {
      const val = row.getValue('paymentDate');
      if (!val) return <div className="text-sm text-muted-foreground">—</div>;
      const date = new Date(val as string);
      return (
        <div className="text-sm text-foreground whitespace-nowrap">
          {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      );
    },
    size: 130,
    enableSorting: true,
  },
  {
    accessorKey: 'city',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        City
      </div>
    ),
    cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.getValue('city')}</div>,
    size: 100,
  },
  {
    accessorKey: 'ntn',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        NTN
      </div>
    ),
    cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.getValue('ntn')}</div>,
    size: 100,
  },
  {
    id: 'actions',
    header: () => (
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
        Actions
      </div>
    ),
    cell: ({ row }) => <RowActions row={row} />,
    size: 80,
    enableHiding: false,
  },
];

function RowActions({ row }: { row: any }) {
  const item = row.original;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [calcModalOpen, setCalcModalOpen] = useState(false);

  const [carAmount, setCarAmount] = useState(item.carAmount !== null ? String(item.carAmount) : '');
  const [cprNo, setCprNo] = useState(item.cprNo || '');
  const [name, setName] = useState(item.name || '');
  const [city, setCity] = useState(item.city || '');
  const [ntn, setNtn] = useState(item.ntn || '');

  const handleDeleteConfirm = async () => {
    startTransition(async () => {
      const result = await deleteCprTax(item.id);
      if (result.status) {
        toast.success(result.message || 'CPR Tax record deleted successfully');
        setDeleteDialog(false);
        router.refresh();
      } else {
        toast.error(result.message || 'Failed to delete CPR Tax record');
      }
    });
  };

  const handleEditConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateCprTax(item.id, {
        carAmount: carAmount ? parseFloat(carAmount) : 0,
        cprNo: cprNo || undefined,
        name: name || undefined,
        city: city || undefined,
        ntn: ntn || undefined,
      });
      if (result.status) {
        toast.success(result.message || 'CPR Tax record updated successfully');
        setEditDialog(false);
        router.refresh();
      } else {
        toast.error(result.message || 'Failed to update CPR Tax record');
      }
    });
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
          title="Preview Calculation Breakdown"
          onClick={() => setCalcModalOpen(true)}
        >
          <Eye className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setCalcModalOpen(true)}
              className="cursor-pointer"
            >
              <Eye className="mr-2 h-4 w-4 text-primary" />
              Preview Calculation
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setEditDialog(true)}
              className="cursor-pointer"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Record
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteDialog(true)}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Record
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CprCalculationModal
        open={calcModalOpen}
        onOpenChange={setCalcModalOpen}
        record={item}
      />


      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditConfirm}>
            <DialogHeader>
              <DialogTitle>Edit CPR Tax Record</DialogTitle>
              <DialogDescription>
                Update the details for <strong className="text-foreground">{item.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-cprNo" className="text-right">
                  CPR No
                </Label>
                <Input
                  id="edit-cprNo"
                  value={cprNo}
                  onChange={(e) => setCprNo(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-carAmount" className="text-right">
                  Car Amount
                </Label>
                <Input
                  id="edit-carAmount"
                  type="number"
                  step="0.01"
                  value={carAmount}
                  onChange={(e) => setCarAmount(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter car value"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-city" className="text-right">
                  City
                </Label>
                <Input
                  id="edit-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-ntn" className="text-right">
                  NTN
                </Label>
                <Input
                  id="edit-ntn"
                  value={ntn}
                  onChange={(e) => setNtn(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialog(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the CPR Tax record for{' '}
              <strong className="text-foreground">{item.name}</strong> (CPR No: {item.cprNo}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
