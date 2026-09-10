import { getApiBaseUrl } from "./utils";

export interface StreamNdjsonOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  onLine: (parsedLine: any) => void;
  onError?: (error: any) => void;
  onDone?: () => void;
}

/**
 * High-performance progressive NDJSON streaming reader.
 * Streams decompressed JSON chunks line-by-line over HTTP.
 * Enables AI-style real-time incremental rendering of large datasets.
 */
export async function streamNdjson(
  endpointPath: string,
  options: StreamNdjsonOptions
): Promise<void> {
  const { headers = {}, signal, onLine, onError, onDone } = options;

  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;
  const fullUrl = `${baseUrl}${cleanEndpoint}`;

  try {
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Accept: "application/x-ndjson, application/json",
        ...headers,
      },
      credentials: "include",
      signal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(
        `Failed to stream NDJSON (HTTP ${response.status}): ${errBody || response.statusText}`
      );
    }

    if (!response.body) {
      throw new Error("Response body is not readable for streaming");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last partial line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          onLine(parsed);
        } catch (parseErr) {
          console.warn("[streamNdjson] Skipping malformed line:", trimmed, parseErr);
        }
      }
    }

    // Process any remaining bytes in buffer
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim());
        onLine(parsed);
      } catch (parseErr) {
        console.warn("[streamNdjson] Skipping trailing malformed line:", buffer, parseErr);
      }
    }

    onDone?.();
  } catch (err: any) {
    if (err.name === "AbortError") {
      // User aborted stream cleanly
      return;
    }
    onError?.(err);
  }
}

export interface SalesListStreamCallbacks {
  onMeta: (meta: {
    reportType: "merged" | "separate";
    dateRange: { startDate?: string; endDate?: string };
    locationNames: string;
    locations: any[];
    totalInvoices: number;
  }) => void;
  onBatch: (invoices: any[], startIndex?: number, count?: number) => void;
  onComplete: (grandTotals: any, totalInvoices: number) => void;
  onError: (err: any) => void;
}

export async function streamSalesListResult(
  jobId: string,
  callbacks: SalesListStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  let receivedInvoicesCount = 0;

  await streamNdjson(`/pos-sales/reports/sales-list/result/${jobId}?format=ndjson`, {
    signal,
    onLine: (msg) => {
      if (msg.type === "meta") {
        callbacks.onMeta(msg);
      } else if (msg.type === "invoices" && Array.isArray(msg.invoices)) {
        receivedInvoicesCount += msg.invoices.length;
        callbacks.onBatch(msg.invoices, msg.startIndex, msg.count);
      } else if (msg.type === "totals") {
        callbacks.onComplete(msg.grandTotals, msg.totalInvoices || receivedInvoicesCount);
      }
    },
    onError: callbacks.onError,
  });
}
