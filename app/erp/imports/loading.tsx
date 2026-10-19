import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ImportHistoryLoading() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Stats Strip Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border border-border">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-muted/30 p-4 rounded-xl border border-border">
        <Skeleton className="h-10 w-full md:w-80" />
        <Skeleton className="h-10 w-full md:w-48" />
        <Skeleton className="h-10 w-full md:w-48" />
        <Skeleton className="h-10 w-24 ml-auto" />
      </div>

      {/* Table Card Skeleton */}
      <Card className="overflow-hidden border border-border">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    </div>
  );
}
