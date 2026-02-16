'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { purchaseRequisitionApi } from '@/lib/api';
import { getItems } from '@/lib/actions/items';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormValues {
    requestedBy: string;
    department: string;
    requestDate: string;
    notes: string;
    items: {
        itemId: string;
        description: string;
        requiredQty: number;
        neededByDate: string;
    }[];
}

interface Item {
    id: string;
    itemId: string;
    sku: string;
    description?: string;
}

export default function CreatePurchaseRequisition() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<Item[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    // Default values
    const { control, register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            requestedBy: 'Current User', // Should be fetched from auth context
            department: '',
            requestDate: new Date().toISOString().split('T')[0],
            items: [{ itemId: '', description: '', requiredQty: 1, neededByDate: '' }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'items'
    });

    useEffect(() => {
        const fetchItems = async () => {
            try {
                setLoadingItems(true);
                const response = await getItems();
                if (response.status) {
                    setItems(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch items", error);
                toast.error("Failed to load items");
            } finally {
                setLoadingItems(false);
            }
        };
        fetchItems();
    }, []);

    const onSubmit = async (data: FormValues) => {
        try {
            setLoading(true);
            await purchaseRequisitionApi.create({
                ...data,
                items: data.items.map(item => ({
                    ...item,
                    requiredQty: Number(item.requiredQty), // Ensure number
                    neededByDate: item.neededByDate ? new Date(item.neededByDate) : undefined
                }))
            });
            toast.success('Purchase Requisition created successfully');
            router.push('/erp/procurement/purchase-requisition');
        } catch (error) {
            console.error(error);
            toast.error('Failed to create requisition');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Create Requisition</h1>
                <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Requisition Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="requestedBy">Requested By</Label>
                            <Input id="requestedBy" {...register('requestedBy', { required: true })} />
                            {errors.requestedBy && <span className="text-red-500 text-sm">Required</span>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <Input id="department" {...register('department')} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="requestDate">Request Date</Label>
                            <Controller
                                control={control}
                                name="requestDate"
                                render={({ field }) => (
                                    <DatePicker
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Pick a date"
                                    />
                                )}
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea id="notes" {...register('notes')} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Items</CardTitle>
                        <Button type="button" size="sm" onClick={() => append({ itemId: '', description: '', requiredQty: 1, neededByDate: '' })}>
                            Add Item
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-4 items-start border-b pb-4">
                                <div className="col-span-4 space-y-2">
                                    <Label>Item</Label>
                                    <Controller
                                        control={control}
                                        name={`items.${index}.itemId`}
                                        rules={{ required: true }}
                                        render={({ field: itemField }) => (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className={cn(
                                                            "w-full justify-between font-normal",
                                                            !itemField.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {itemField.value
                                                            ? items.find((item) => item.itemId === itemField.value)?.itemId || items.find((item) => item.itemId === itemField.value)?.sku || "Select item"
                                                            : "Select item"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[300px] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search item..." />
                                                        <CommandEmpty>No item found.</CommandEmpty>
                                                        <CommandGroup>
                                                            <CommandList>
                                                                {items.map((item) => (
                                                                    <CommandItem
                                                                        key={item.id}
                                                                        value={`${item.itemId} ${item.sku} ${item.description}`}
                                                                        onSelect={() => {
                                                                            itemField.onChange(item.itemId);
                                                                            setValue(`items.${index}.description`, item.description || item.sku); 
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                item.itemId === itemField.value ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {item.itemId} - {item.sku}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandList>
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    />
                                </div>
                                <div className="col-span-3 space-y-2">
                                    <Label>Description</Label>
                                    <Input {...register(`items.${index}.description` as const)} placeholder="Description" />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Quantity</Label>
                                    <Input type="number" step="0.01" {...register(`items.${index}.requiredQty` as const, { required: true, min: 0.01 })} />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Needed By</Label>
                                    <Controller
                                        control={control}
                                        name={`items.${index}.neededByDate`}
                                        render={({ field: dateField }) => (
                                            <DatePicker
                                                value={dateField.value}
                                                onChange={dateField.onChange}
                                                placeholder="Pick a date"
                                            />
                                        )}
                                    />
                                </div>
                                <div className="col-span-1 pt-8">
                                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                        X
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Submitting...' : 'Create Draft'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
