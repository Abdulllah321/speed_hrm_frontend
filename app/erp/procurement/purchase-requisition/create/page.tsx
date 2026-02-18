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
import { getDepartments, getSubDepartments, type Department, type SubDepartment } from '@/lib/actions/department';
import { getCategories, type Category } from '@/lib/actions/category';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
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
    department: string;
    requestDate: string;
    notes: string;
    type?: string;
    items: {
        itemId: string;
        description: string;
        requiredQty: number;
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
    const [departments, setDepartments] = useState<Department[]>([]);
    const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
    const [selectedSubDepartmentId, setSelectedSubDepartmentId] = useState<string>('');
    const [prAutoNumber] = useState<string>('Auto'); // display-only

    // Default values
    const { control, register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            department: '',
            requestDate: new Date().toISOString().split('T')[0],
            type: 'local',
            items: [{ itemId: '', description: '', requiredQty: 1 }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'items'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingItems(true);
                const response = await getItems();
                if (response.status) {
                    setItems(response.data);
                }
                const [deptRes, subDeptRes, catRes] = await Promise.all([
                    getDepartments(),
                    getSubDepartments(),
                    getCategories(),
                ]);
                setDepartments(deptRes.data || []);
                setSubDepartments(subDeptRes.data || []);
                setCategories((catRes.data || []).filter((c) => !c.parentId));
            } catch (error) {
                console.error("Failed to fetch items", error);
                toast.error("Failed to load items");
            } finally {
                setLoadingItems(false);
            }
        };
        fetchData();
    }, []);

    const onSubmit = async (data: FormValues) => {
        try {
            setLoading(true);
            const pr = await purchaseRequisitionApi.create({
                ...data,
                items: data.items.map(item => ({
                    ...item,
                    requiredQty: Number(item.requiredQty)
                }))
            });
            toast.success('Purchase Requisition submitted for approval');
            router.push(`/erp/procurement/purchase-requisition/${pr.id}`);
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
                            <Label htmlFor="prNumber">PR No</Label>
                            <Input id="prNumber" value={prAutoNumber} disabled />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Select
                                value={selectedDepartmentId}
                                onValueChange={(val) => {
                                    setSelectedDepartmentId(val);
                                    const deptName = departments.find(d => d.id === val)?.name || '';
                                    setValue('department', deptName);
                                    setSelectedSubDepartmentId('');
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map((d) => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Sub Department</Label>
                            <Select
                                value={selectedSubDepartmentId}
                                onValueChange={(val) => {
                                    setSelectedSubDepartmentId(val);
                                    const subName = subDepartments.find(s => s.id === val)?.name || '';
                                    setValue('department', subName || (departments.find(d=>d.id===selectedDepartmentId)?.name || ''));
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Sub Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subDepartments.filter(s => s.departmentId === selectedDepartmentId).map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Controller
                                control={control}
                                name="type"
                                render={({ field }) => (
                                    <Select value={field.value || ''} onValueChange={field.onChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="local">Local</SelectItem>
                                            <SelectItem value="import">Import</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                                <div className="col-span-3 space-y-2">
                                    <Label>Category</Label>
                                    <Select
                                        onValueChange={() => {}}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-3 space-y-2">
                                    <Label>Item Code</Label>
                                    <Controller
                                        control={control}
                                        name={`items.${index}.itemId`}
                                        rules={{ required: true }}
                                        render={({ field: itemField }) => (
                                            <Select
                                                value={itemField.value || ''}
                                                onValueChange={(val) => {
                                                    itemField.onChange(val);
                                                    const it = items.find(i => i.itemId === val);
                                                    setValue(`items.${index}.description`, it?.description || it?.sku || '');
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {items.map((it) => (
                                                        <SelectItem key={it.id} value={it.itemId}>
                                                            {it.itemId}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                                <div className="col-span-3 space-y-2">
                                    <Label>Item Name</Label>
                                    <Input {...register(`items.${index}.description` as const)} placeholder="Item Name" disabled />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Quantity</Label>
                                    <Input type="number" step="0.01" {...register(`items.${index}.requiredQty` as const, { required: true, min: 0.01 })} />
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
                        {loading ? 'Submitting...' : 'Submit'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
