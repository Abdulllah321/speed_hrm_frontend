'use client';

import React from 'react';
import { Upload } from 'lucide-react';
import { GenericBulkUploadModal } from '@/components/master/generic-bulk-upload-modal';

interface ItemUpdateBulkUploadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    uploadId?: string | null;
    onUploadIdChange?: (id: string | null) => void;
}

export function ItemUpdateBulkUploadModal({
    open,
    onOpenChange,
    onSuccess,
    uploadId,
    onUploadIdChange,
}: ItemUpdateBulkUploadModalProps) {
    return (
        <GenericBulkUploadModal
            open={open}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
            uploadId={uploadId}
            onUploadIdChange={onUploadIdChange}
            uploadType="item-update"
            apiBasePath="items/bulk-update-prices"
            title="Bulk Item Update"
            description="Update item prices, tax rates, discount %, and season by Barcode or SKU. Uploading a new season archives the product's current active season into Old Season. Missing or empty fields in the sheet are skipped to preserve existing data."
            icon={Upload}
        />
    );
}
