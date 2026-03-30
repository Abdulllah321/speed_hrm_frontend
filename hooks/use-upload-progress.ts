import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiBaseUrl } from '@/lib/utils';

export interface UploadStats {
    totalRecords: number;
    processedRecords: number;
    successRecords: number;
    failedRecords: number;
    skippedRecords: number;
    progress: number;
}

export interface UploadError {
    row: number;
    reason: string;
    data: any;
}

export interface UploadStatusResponse {
    uploadId: string;
    filename: string;
    status: 'pending' | 'validating' | 'validated' | 'processing' | 'completed' | 'failed' | 'cancelled';
    totalRecords: number;
    processedRecords: number;
    successRecords: number;
    failedRecords: number;
    skippedRecords: number;
    progress: number;
    jobState: string;
    errors: UploadError[];
    message?: string;
    recsPerSec?: number;
    memoryUsageMB?: number;
    createdAt: string;
    completedAt: string | null;
}

export function useUploadProgress(uploadId: string | null, uploadType: 'item' | 'hscode' = 'item') {
    const [data, setData] = useState<UploadStatusResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [speed, setSpeed] = useState(0);
    const prevProcessedRef = useRef(0);
    const prevTimestampRef = useRef(Date.now());
    const eventSourceRef = useRef<EventSource | null>(null);
    const isTerminalRef = useRef(false); // stops reconnects once job is done

    const stopStreaming = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    }, []);

    const getApiEndpoint = useCallback((endpoint: string) => {
        const baseUrl = getApiBaseUrl();
        if (uploadType === 'hscode') {
            return `${baseUrl}/master/hs-codes/bulk-upload/${endpoint}`;
        }
        return `${baseUrl}/items/bulk-upload/${endpoint}`;
    }, [uploadType]);

    const fetchInitialStatus = useCallback(async () => {
        if (!uploadId) return;
        try {
            const response = await fetch(getApiEndpoint(`${uploadId}/status`), {
                credentials: "include",
                signal: AbortSignal.timeout(8000), // never hang longer than 8s
            });
            const result = await response.json();
            if (result.status && result.data) {
                setData(result.data);
                setError(null);
                // If already terminal when we first load, don't open SSE
                if (['completed', 'failed', 'cancelled'].includes(result.data.status)) {
                    isTerminalRef.current = true;
                }
            } else {
                setError(result.message || 'Failed to fetch status');
            }
        } catch (err) {
            console.error('Initial fetch failed:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
    }, [uploadId, getApiEndpoint]);

    useEffect(() => {
        if (!uploadId) {
            setData(null);
            setSpeed(0);
            isTerminalRef.current = false;
            stopStreaming();
            return;
        }

        isTerminalRef.current = false;

        // Fetch initial status once — gives us data before first SSE event arrives
        fetchInitialStatus();

        // Setup SSE
        const url = getApiEndpoint(`${uploadId}/events`);
        const eventSource = new EventSource(url, { withCredentials: true });
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const eventData = JSON.parse(event.data);
                const { type, data: payload } = eventData;

                setData((prev) => {
                    const base = prev || {
                        uploadId: uploadId || '',
                        filename: '',
                        status: 'pending',
                        totalRecords: 0,
                        processedRecords: 0,
                        successRecords: 0,
                        failedRecords: 0,
                        skippedRecords: 0,
                        progress: 0,
                        jobState: 'active',
                        errors: [],
                        createdAt: new Date().toISOString(),
                        completedAt: null
                    } as UploadStatusResponse;

                    const updated = { ...base };

                    if (type === 'status') {
                        if (!['completed', 'failed', 'validated'].includes(updated.status)) {
                            updated.status = payload.status || updated.status;
                        }
                        updated.message = payload.message || updated.message;
                        if (payload.progress !== undefined) updated.progress = payload.progress;
                    } else if (type === 'progress') {
                        updated.progress = payload.progress ?? updated.progress;
                        updated.processedRecords = payload.processedRecords ?? updated.processedRecords;
                        updated.successRecords = payload.successRecords ?? updated.successRecords;
                        updated.failedRecords = payload.failedRecords ?? updated.failedRecords;
                        updated.recsPerSec = payload.recsPerSec ?? updated.recsPerSec;
                        updated.memoryUsageMB = payload.memoryUsageMB ?? updated.memoryUsageMB;
                        if (!['completed', 'failed'].includes(updated.status) && payload.status) {
                            updated.status = payload.status;
                        }
                    } else if (type === 'completed') {
                        updated.status = payload.status || 'completed';
                        updated.successRecords = payload.successRecords ?? updated.successRecords;
                        updated.failedRecords = payload.failedRecords ?? updated.failedRecords;
                        updated.totalRecords = payload.totalRecords ?? updated.totalRecords;
                        updated.errors = payload.errors || updated.errors;
                        updated.progress = 100;
                    } else if (type === 'failed') {
                        updated.status = 'failed';
                        updated.message = payload.message;
                    }

                    return updated;
                });

                // Close SSE once terminal — no point keeping the connection open
                if (['completed', 'failed', 'validated', 'cancelled'].includes(type) ||
                    ['completed', 'failed', 'cancelled'].includes(payload?.status)) {
                    isTerminalRef.current = true;
                    stopStreaming();
                }
            } catch (err) {
                console.error('Failed to parse SSE event:', err);
            }
        };

        eventSource.onerror = () => {
            // If job is done, don't reconnect — just close cleanly
            if (isTerminalRef.current) {
                stopStreaming();
                return;
            }
            // Otherwise browser will auto-reconnect — that's fine, log quietly
            console.warn('SSE connection dropped, browser will retry...');
        };

        return () => {
            stopStreaming();
        };
    }, [uploadId, getApiEndpoint, stopStreaming]); // fetchInitialStatus removed from deps — called once on mount only

    // Speed calculation using refs to avoid stale closure issues
    useEffect(() => {
        if (!data?.processedRecords) return;

        const now = Date.now();
        const timeDiff = (now - prevTimestampRef.current) / 1000;
        const processedDiff = data.processedRecords - prevProcessedRef.current;

        if (timeDiff >= 1 && processedDiff > 0) {
            setSpeed(Math.round(processedDiff / timeDiff));
            prevProcessedRef.current = data.processedRecords;
            prevTimestampRef.current = now;
        }
    }, [data?.processedRecords]);

    return {
        data,
        loading,
        error,
        speed,
        isComplete: data?.status === 'completed' || data?.status === 'validated',
        isValidated: data?.status === 'validated',
        isValidating: data?.status === 'validating',
        isFailed: data?.status === 'failed',
        isProcessing: data?.status === 'processing' || data?.status === 'validating',
        isCancelled: data?.status === 'cancelled',
        refetch: fetchInitialStatus,
    };
}
