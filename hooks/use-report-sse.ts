"use client";

import { useEffect, useState } from "react";

export interface ReportSseState {
  status: "idle" | "queued" | "active" | "processing" | "completed" | "failed";
  progressPercent: number;
  queuePosition: number;
  waitingCount: number;
  failedReason?: string;
  error?: string | null;
}

export function useReportSse(jobId: string | null): ReportSseState {
  const [state, setState] = useState<ReportSseState>({
    status: "idle",
    progressPercent: 0,
    queuePosition: 0,
    waitingCount: 0,
  });

  useEffect(() => {
    if (!jobId) {
      setState({
        status: "idle",
        progressPercent: 0,
        queuePosition: 0,
        waitingCount: 0,
      });
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const streamUrl = `${baseUrl}/api/stock-ledger/available-stock-summary/stream/${jobId}`;

    const eventSource = new EventSource(streamUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { status, progress, queuePosition, waitingCount, failedReason } = payload;

        let normalizedStatus: ReportSseState["status"] = "processing";
        if (status === "waiting" || status === "delayed" || status === "queued") {
          normalizedStatus = "queued";
        } else if (status === "active" || status === "processing") {
          normalizedStatus = "processing";
        } else if (status === "completed") {
          normalizedStatus = "completed";
        } else if (status === "failed") {
          normalizedStatus = "failed";
        }

        setState({
          status: normalizedStatus,
          progressPercent: progress || (normalizedStatus === "completed" ? 100 : 0),
          queuePosition: queuePosition || 0,
          waitingCount: waitingCount || 0,
          failedReason: failedReason,
          error: normalizedStatus === "failed" ? (failedReason || "Report calculation failed") : null,
        });

        if (normalizedStatus === "completed" || normalizedStatus === "failed") {
          eventSource.close();
        }
      } catch (err: any) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE connection warning:", err);
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  return state;
}
