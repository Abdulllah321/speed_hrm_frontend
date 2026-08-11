import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DeliveryNoteLoading() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-8 w-52" />
          </div>
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>

      {/* Filter Bar Skeleton */}
      <Card className="border-2 shadow-xs">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-dashed">
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
            <Skeleton className="h-9 w-36 rounded-md" />
          </div>
        </CardContent>
      </Card>

      {/* Table Skeleton */}
      <Card className="overflow-hidden shadow-xs border-2">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-4 font-bold"><Skeleton className="h-4 w-24" /></th>
                  <th className="p-4 font-bold"><Skeleton className="h-4 w-20" /></th>
                  <th className="p-4 font-bold"><Skeleton className="h-4 w-32" /></th>
                  <th className="p-4 font-bold"><Skeleton className="h-4 w-32" /></th>
                  <th className="p-4 font-bold"><Skeleton className="h-4 w-28" /></th>
                  <th className="p-4 font-bold text-center"><Skeleton className="h-4 w-12 mx-auto" /></th>
                  <th className="p-4 font-bold"><Skeleton className="h-4 w-20" /></th>
                  <th className="p-4 font-bold text-right"><Skeleton className="h-4 w-16 ml-auto" /></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-4">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-4 space-y-1">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-28" />
                    </td>
                    <td className="p-4 space-y-1">
                      <Skeleton className="h-6 w-28 rounded-full" />
                      <Skeleton className="h-3 w-24" />
                    </td>
                    <td className="p-4 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </td>
                    <td className="p-4 text-center">
                      <Skeleton className="h-5 w-10 mx-auto" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
