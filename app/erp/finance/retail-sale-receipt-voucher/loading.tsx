import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export default function RetailSaleReceiptVoucherLoading() {
  return (
    <div className="flex-1 flex flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/erp/finance">Finance</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/erp/finance/retail-sale-receipt-voucher/list">Retail Sale Receipt Voucher</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>List</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 bg-[#F8F9FA] dark:bg-background">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-1">
            <Skeleton className="h-6 w-72" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border bg-white p-3.5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>

        {/* Main Card with Tabs & Table */}
        <Card className="shadow-xs border bg-white">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <Skeleton className="h-9 w-80 rounded-lg" />
              <Skeleton className="h-4 w-44" />
            </div>

            <div className="flex gap-2 p-2 bg-slate-50 rounded-lg border">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-md" />
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-lg border">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>

            <div className="rounded-md border bg-white dark:bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><Skeleton className="h-4 w-4" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-28" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-36" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-4 w-28 ml-auto" /></TableHead>
                    <TableHead className="text-center"><Skeleton className="h-4 w-20 mx-auto" /></TableHead>
                    <TableHead className="w-20"><Skeleton className="h-4 w-12" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 rounded-md" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-4 w-36" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
