'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RequestForQuotation } from '@/lib/api';
import { getRfqs, getRfq } from '@/lib/actions/rfq';
import { createVendorQuotation } from '@/lib/actions/vendor-quotations';
import { getVendors } from '@/lib/actions/procurement';
import { toast } from 'sonner';

interface Supplier {
    id: string;
    code: string;
    name: string;
}

interface FormValues {
    rfqId: string;
    vendorId: string;
    notes: string;
    items: {
        itemId: string;
        description: string;
        quotedQty: number;
        unitPrice: number;
        taxPercent: number;
        discountPercent: number;
    }[];
}

export default function CreateVendorQuotation() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [sentRfqs, setSentRfqs] = useState<RequestForQuotation[]>([]);
    const [selectedRfq, setSelectedRfq] = useState<RequestForQuotation | null>(null);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            items: []
        }
    });

    const { fields, replace } = useFieldArray({
        control,
        name: 'items'
    });

    const watchedRfqId = watch('rfqId');

    useEffect(() => {
        fetchSentRfqs();
        fetchSuppliers();
    }, []);

    useEffect(() => {
        if (watchedRfqId) {
            handleRfqSelect(watchedRfqId);
        }
    }, [watchedRfqId]);

    const fetchSentRfqs = async () => {
        try {
            const result = await getRfqs('SENT');
            if (result.status !== false) {
                setSentRfqs(result);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const result = await getVendors();
            if (result.status) {
                setSuppliers(result.data || []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleRfqSelect = async (rfqId: string) => {
        const rfqFromList = sentRfqs.find(r => r.id === rfqId);

        // Fetch full RFQ details if needed, or use from list
        let rfq = rfqFromList;
        if (!rfq?.purchaseRequisition?.items) {
            const result = await getRfq(rfqId);
            if (result) rfq = result;
        }

        setSelectedRfq(rfq || null);

        if (rfq) {
            // Pre-populate items from PR
            const prItems = rfq.purchaseRequisition?.items || [];
            replace(prItems.map(item => ({
                itemId: item.itemId,
                description: item.description || '',
                quotedQty: parseFloat(item.requiredQty),
                unitPrice: 0,
                taxPercent: 0,
                discountPercent: 0
            })));
        }
    };

    const onSubmit = async (data: FormValues) => {
        try {
            setLoading(true);
            const result = await createVendorQuotation(data);
            if (result.status !== false && result.id) {
                toast.success('Vendor quotation created successfully');
                router.push(`/erp/procurement/vendor-quotation/${result.id}`);
            } else {
                toast.error(result.message || 'Failed to create quotation');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while creating the quotation');
        } finally {
            setLoading(false);
        }
    };

    const availableVendors = selectedRfq?.vendors.map(v => v.vendor) || [];

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Create Vendor Quotation</h1>
                <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Quotation Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="rfqId">RFQ</Label>
                                <Select onValueChange={(value) => setValue('rfqId', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an RFQ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sentRfqs.map((rfq) => (
                                            <SelectItem key={rfq.id} value={rfq.id}>
                                                {rfq.rfqNumber} - {rfq.purchaseRequisition?.prNumber}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.rfqId && <span className="text-red-500 text-sm">Required</span>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="vendorId">Vendor</Label>
                                <Select onValueChange={(value) => setValue('vendorId', value)} disabled={!selectedRfq}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a vendor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableVendors.map((vendor) => (
                                            <SelectItem key={vendor.id} value={vendor.id}>
                                                {vendor.name} ({vendor.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.vendorId && <span className="text-red-500 text-sm">Required</span>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea id="notes" {...register('notes')} placeholder="Optional notes" />
                        </div>
                    </CardContent>
                </Card>

                {fields.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Item Pricing</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table className="w-full">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item ID</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead>Unit Price</TableHead>
                                            <TableHead>Tax %</TableHead>
                                            <TableHead>Disc %</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell className="font-medium">
                                                    <Input {...register(`items.${index}.itemId`)} readOnly className="w-32" />
                                                </TableCell>
                                                <TableCell>
                                                    <Input {...register(`items.${index}.description`)} readOnly className="w-48" />
                                                </TableCell>
                                                <TableCell>
                                                    <Input type="number" step="0.01" {...register(`items.${index}.quotedQty`, { valueAsNumber: true })} className="w-24" />
                                                </TableCell>
                                                <TableCell>
                                                    <Input type="number" step="0.01" {...register(`items.${index}.unitPrice`, { valueAsNumber: true, required: true })} className="w-32" placeholder="0.00" />
                                                </TableCell>
                                                <TableCell>
                                                    <Input type="number" step="0.01" {...register(`items.${index}.taxPercent`, { valueAsNumber: true })} className="w-20" placeholder="0" />
                                                </TableCell>
                                                <TableCell>
                                                    <Input type="number" step="0.01" {...register(`items.${index}.discountPercent`, { valueAsNumber: true })} className="w-20" placeholder="0" />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="flex justify-end">
                    <Button type="submit" disabled={loading || fields.length === 0}>
                        {loading ? 'Creating...' : 'Create Quotation'}
                    </Button>
                </div>
            </form>
        </div>
    );
}


