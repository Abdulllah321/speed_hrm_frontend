import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExportCenterLoading() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Page Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Folders Sidebar Skeleton */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Right Side: Exports Table Skeleton */}
        <div className="lg:col-span-3 space-y-4">
          {/* Toolbar Skeleton */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border">
            <Skeleton className="h-10 w-full md:w-80" />
            <div className="flex w-full md:w-auto gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>

          {/* Table Card Skeleton */}
          <Card className="overflow-hidden border border-border">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
