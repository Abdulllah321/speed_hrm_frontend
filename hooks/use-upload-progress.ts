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
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
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

export function useUploadProgress(uploadId: string | null) {
    const [data, setData] = useState<UploadStatusResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [speed, setSpeed] = useState(0); // records per second
    const [prevProcessed, setPrevProcessed] = useState(0);
    const [prevTimestamp, setPrevTimestamp] = useState(Date.now());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const fetchStatus = useCallback(async () => {
        if (!uploadId) return;

        try {
            const response = await fetch(`${getApiBaseUrl()}/items/bulk-upload/${uploadId}/status`, {
                credentials: "include"
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();

            if (result.status && result.data) {
                const newData = result.data as UploadStatusResponse;
                setData(newData);

                // Calculate speed
                const now = Date.now();
                const timeDiff = (now - prevTimestamp) / 1000;
                const processedDiff = newData.processedRecords - prevProcessed;

                if (timeDiff > 0 && processedDiff > 0) {
                    const currentSpeed = processedDiff / timeDiff;
                    setSpeed(Math.round(currentSpeed));
                }
                setData(newData);
                setPrevProcessed(newData.processedRecords);
                setPrevTimestamp(now);
            }
        } catch (err) {
            console.error('Failed to fetch upload status:', err);
            // Don't set error state to avoid interrupting UI unless it's a persistent failure
        }
    }, [uploadId, prevProcessed, prevTimestamp]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (uploadId && data?.status !== 'completed' && data?.status !== 'failed' && data?.status !== 'cancelled') {
            interval = setInterval(fetchStatus, 1500);
        } else if (interval) {
            clearInterval(interval);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [uploadId, data?.status, fetchStatus]);

    useEffect(() => {
        if (uploadId) {
            setLoading(true);
            fetchStatus().finally(() => setLoading(false));
        } else {
            setData(null);
            setError(null);
            setSpeed(0);
            setPrevProcessed(0);
        }
    }, [uploadId]);

    return {
        data,
        loading,
        error,
        speed,
        isComplete: data?.status === 'completed',
        isFailed: data?.status === 'failed',
        isProcessing: data?.status === 'processing',
        isCancelled: data?.status === 'cancelled',
    };
}
