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
    createdAt: string;
    completedAt: string | null;
}

export function useUploadProgress(uploadId: string | null, uploadType: 'item' | 'hscode' = 'item') {
    const [data, setData] = useState<UploadStatusResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [speed, setSpeed] = useState(0);
    const [prevProcessed, setPrevProcessed] = useState(0);
    const [prevTimestamp, setPrevTimestamp] = useState(Date.now());
    const eventSourceRef = useRef<EventSource | null>(null);

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
                credentials: "include"
            });
            const result = await response.json();
            if (result.status && result.data) {
                setData(result.data);
                setError(null);
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
            stopStreaming();
            return;
        }

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
                        // Prevent reverting to an active state if we are already done
                        if (!['completed', 'failed', 'validated'].includes(updated.status)) {
                            updated.status = payload.status || updated.status;
                        }
                        updated.message = payload.message || updated.message;
                    } else if (type === 'progress') {
                        updated.progress = payload.progress ?? updated.progress;
                        updated.processedRecords = payload.processedRecords ?? updated.processedRecords;
                        updated.successRecords = payload.successRecords ?? updated.successRecords;
                        updated.failedRecords = payload.failedRecords ?? updated.failedRecords;

                        // Prevent progress events from resetting completed status back to processing
                        if (['completed', 'failed', 'validated'].includes(updated.status) && payload.status === 'processing') {
                            // keep the terminal status
                        } else if (payload.status) {
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
            } catch (err) {
                console.error('Failed to parse SSE event:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.warn('SSE Connection error, might be closing normally or shifting to fallback:', err);
            // We could implement polling fallback here if needed, but for now SSE is primary.
        };

        return () => {
            stopStreaming();
        };
    }, [uploadId, fetchInitialStatus, stopStreaming, getApiEndpoint]);

    // Speed calculation
    useEffect(() => {
        if (!data?.processedRecords) return;

        const now = Date.now();
        const timeDiff = (now - prevTimestamp) / 1000;
        const processedDiff = data.processedRecords - prevProcessed;

        if (timeDiff >= 1 && processedDiff > 0) {
            setSpeed(Math.round(processedDiff / timeDiff));
            setPrevProcessed(data.processedRecords);
            setPrevTimestamp(now);
        }
    }, [data?.processedRecords, prevProcessed, prevTimestamp]);

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
