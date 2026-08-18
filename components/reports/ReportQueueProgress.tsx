"use client";

import React from "react";
import { Loader2, Clock, AlertTriangle, Cpu, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportQueueProgressProps {
  jobId: string | null;
  status: "idle" | "queued" | "active" | "processing" | "completed" | "failed";
  progressPercent: number;
  message?: string;
  queuePosition: number;
  waitingCount: number;
  failedReason?: string;
  title?: string;
  className?: string;
}

export function ReportQueueProgress({
  jobId,
  status,
  progressPercent,
  message,
  queuePosition,
  waitingCount,
  failedReason,
  title = "Stock Report",
  className,
}: ReportQueueProgressProps) {
  if (!jobId || status === "idle" || status === "completed") {
    return null;
  }

  const isQueued = status === "queued";
  const isProcessing = status === "processing" || status === "active";
  const isFailed = status === "failed";

  return (
    <div
      className={cn(
        "no-print rounded-xl border p-5 shadow-lg transition-all duration-300 my-4",
        isQueued && "border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-500/30",
        isProcessing && "border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-500/30",
        isFailed && "border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-500/30",
        className
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              "p-2.5 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
              isQueued && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              isProcessing && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
              isFailed && "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
          >
            {isQueued && <Clock className="h-6 w-6 animate-pulse" />}
            {isProcessing && <Loader2 className="h-6 w-6 animate-spin" />}
            {isFailed && <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {isQueued && `${title} Queued & Waiting`}
                {isProcessing && `Generating ${title}`}
                {isFailed && `${title} Generation Failed`}
              </h3>
              {isQueued && (
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-sm">
                  Queue Position #{queuePosition > 0 ? queuePosition : 1}
                </span>
              )}
              {isProcessing && (
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-sm flex items-center gap-1">
                  <Cpu className="h-3 w-3 animate-pulse" /> Worker Executing
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-1 font-medium flex items-center gap-1.5">
              {isQueued && (
                <>
                  There are <span className="font-bold text-foreground">{waitingCount}</span> reports in queue ahead of you. Your position is #<span className="font-bold text-foreground">{queuePosition}</span> and will execute automatically when worker completes preceding jobs.
                </>
              )}
              {isProcessing && (
                <>
                  <Activity className="h-3.5 w-3.5 text-blue-500 shrink-0 animate-pulse" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {message || "Processing background queries across ledgers, locations, and pricing tiers..."}
                  </span>
                </>
              )}
              {isFailed && (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  {failedReason || "An error occurred while generating background report."}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Progress Bar Display */}
        {isProcessing && (
          <div className="w-full md:w-72 shrink-0 space-y-1.5 bg-white/60 dark:bg-slate-900/60 p-3 rounded-lg border border-blue-200/50 dark:border-blue-900/30 shadow-sm">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                Calculating...
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-mono text-sm font-extrabold">
                {progressPercent}%
              </span>
            </div>
            <div className="h-3 w-full bg-blue-100 dark:bg-blue-950 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 transition-all duration-300 rounded-full shadow-sm"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
