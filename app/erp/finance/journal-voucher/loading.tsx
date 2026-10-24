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

export default function JournalVoucherLoading() {
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
              <BreadcrumbLink href="/erp/finance/journal-voucher/list">Journal Voucher</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>List</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 bg-[#F8F9FA] dark:bg-background">
        <Card className="shadow-xs">
          <CardHeader className="border-b flex flex-row items-center justify-between pb-4">
            <Skeleton className="h-6 w-36" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-28" />
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg border">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>

            <div className="rounded-md border bg-white dark:bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><Skeleton className="h-4 w-4" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-28" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-44" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableHead>
                    <TableHead className="text-center"><Skeleton className="h-4 w-20 mx-auto" /></TableHead>
                    <TableHead className="w-16"><Skeleton className="h-4 w-12" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell className="text-right"></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
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
