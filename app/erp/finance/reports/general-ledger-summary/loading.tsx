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
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function GeneralLedgerSummaryLoading() {
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
              <BreadcrumbLink href="#">Reports</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>General Ledger Summary</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 bg-[#F8F9FA] dark:bg-background">
        <Card className="shadow-xs border bg-white dark:bg-card">
          <CardHeader className="border-b flex flex-row items-center justify-between pb-4">
            <div className="space-y-1">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg border bg-slate-50/50">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>

            <div className="rounded-md border bg-white dark:bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28"><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-36" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20 font-mono" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto font-bold" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
