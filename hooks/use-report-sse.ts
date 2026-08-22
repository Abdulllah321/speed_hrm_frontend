"use client";

import { useEffect, useState } from "react";

export interface ReportSseState {
  status: "idle" | "queued" | "active" | "processing" | "completed" | "failed";
  progressPercent: number;
  message?: string;
  stage?: string;
  queuePosition: number;
  waitingCount: number;
  failedReason?: string;
  error?: string | null;
}

export function useReportSse(
  jobId: string | null,
  reportType: "available" | "valuation" | "overall-reserved" | "transaction-detail" | "cost-of-sales" = "available"
): ReportSseState {
  const [state, setState] = useState<ReportSseState>({
    status: "idle",
    progressPercent: 0,
    message: "",
    stage: "",
    queuePosition: 0,
    waitingCount: 0,
  });

  useEffect(() => {
    if (!jobId) {
      setState({
        status: "idle",
        progressPercent: 0,
        message: "",
        stage: "",
        queuePosition: 0,
        waitingCount: 0,
      });
      return;
    }

    // Immediately reset state when switching to a new jobId
    setState({
      status: "queued",
      progressPercent: 5,
      message: "Submitting report calculation job to background queue...",
      stage: "INIT",
      queuePosition: 1,
      waitingCount: 0,
    });

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const endpoint =
      reportType === "valuation"
        ? `/api/stock-ledger/valuation-report/stream/${jobId}`
        : reportType === "overall-reserved"
        ? `/api/stock-ledger/overall-available-reserved-stock/stream/${jobId}`
        : reportType === "transaction-detail"
        ? `/api/stock-ledger/stock-transaction-detail/stream/${jobId}`
        : reportType === "cost-of-sales"
        ? `/api/pos-sales/reports/cost-of-sales/stream/${jobId}`
        : `/api/stock-ledger/available-stock-summary/stream/${jobId}`;
    const streamUrl = `${baseUrl}${endpoint}`;

    const eventSource = new EventSource(streamUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { status, progress, message, stage, queuePosition, waitingCount, failedReason } = payload;

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
          message: message || (normalizedStatus === "completed" ? "Report computation complete!" : ""),
          stage: stage || (normalizedStatus === "completed" ? "READY" : "PROCESSING"),
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
  }, [jobId, reportType]);

  return state;
}
