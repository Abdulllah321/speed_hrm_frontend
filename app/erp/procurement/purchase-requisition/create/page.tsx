'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Trash2, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import axios from 'axios';

interface FormValues {
    department: string;
    requestDate: string;
    notes: string;
    type?: string;
    goodsType?: string; // CONSUMABLE, FRESH
    items: {
        itemId: string;
        requiredQty: number;
    }[];
}

interface Item {
    id: string;
    itemId: string;
    sku: string;
    description?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

// Helper to get cookie
function getCookie(name: string): string {
    if (typeof document === "undefined") return "";
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || "";
    return "";
}

async function apiFetch<T>(endpoint: string, options?: any): Promise<T> {
    const companyId = getCookie("companyId");
    const companyCode = getCookie("companyCode");

    const response = await axios({
        url: `${API_BASE}${endpoint}`,
        method: options?.method || "GET",
        data: options?.body,
        headers: {
            "Content-Type": "application/json",
            ...(companyId ? { "x-company-id": companyId } : {}),
            ...(companyCode ? { "x-tenant-id": companyCode } : {}),
        },
        withCredentials: true,
    });
    return response.data;
}

export default function CreatePurchaseRequisition() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<Item[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
    const [selectedSubDepartmentId, setSelectedSubDepartmentId] = useState<string>('');
    const [prAutoNumber] = useState<string>('Auto'); // display-only
    
    // Single search state for the main search input
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [addedItems, setAddedItems] = useState<{id: string, itemId: string, description: string, requiredQty: number}[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Default values
    const { control, register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            department: '',
            requestDate: new Date().toISOString().split('T')[0],
            type: 'local',
            goodsType: 'CONSUMABLE', // Default to CONSUMABLE
            items: []
        }
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingItems(true);
                const response = await getItems();
                if (response.status) {
                    setItems(response.data);
                }
                const [deptRes, subDeptRes] = await Promise.all([
                    getDepartments(),
                    getSubDepartments(),
                ]);
                setDepartments(deptRes.data || []);
                setSubDepartments(subDeptRes.data || []);
            } catch (error) {
                console.error("Failed to fetch items", error);
                toast.error("Failed to load items");
            } finally {
                setLoadingItems(false);
            }
        };
        fetchData();
    }, []);

    // Auto-focus search input on mount
    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);

    // ─── Keyboard shortcuts ─────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // F2 → Focus search input
            if (e.key === "F2") {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // ─── Search Functionality ─────────────────────────────────
    const handleSearchChange = useCallback((query: string) => {
        setSearchQuery(query);
        // Clear selected item if user is typing something different
        if (selectedItem && query !== (selectedItem.description || selectedItem.itemId)) {
            setSelectedItem(null);
        }
    }, [selectedItem]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length >= 2 && !selectedItem) {
                setIsSearching(true);
                try {
                    const res = await apiFetch<{ status: boolean; data: any[] }>(
                        `/pos-sales/lookup?q=${encodeURIComponent(searchQuery.trim())}`
                    );
                    if (res.status && res.data) {
                        setSearchResults(res.data);
                    } else {
                        setSearchResults([]);
                    }
                } catch {
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedItem]);

    const handleSelectItem = useCallback((item: any) => {
        setSelectedItem(item);
        setSearchQuery(item.description || item.itemId);
        setSearchResults([]); // Clear search results immediately
        toast.success(`Selected: ${item.description || item.itemId}`);
    }, []);

    const handleSearchSubmit = useCallback(async () => {
        if (!searchQuery.trim()) return;

        try {
            const res = await apiFetch<{ status: boolean; data: any }>(
                `/pos-sales/scan?barcode=${encodeURIComponent(searchQuery.trim())}`
            );
            if (res.status && res.data) {
                const item = res.data;
                setSelectedItem(item);
                setSearchQuery(item.description || item.itemId);
                setSearchResults([]); // Clear search results
                toast.success(`Selected: ${item.description || item.itemId}`);
            } else {
                toast.error("Item not found");
            }
        } catch {
            toast.error("Failed to find item");
        }
    }, [searchQuery]);

    const handleAddItem = useCallback(() => {
        if (!selectedItem || !quantity || quantity <= 0) {
            toast.error("Please select an item and enter a valid quantity");
            return;
        }

        // Check if item already exists
        const existingIndex = addedItems.findIndex(item => item.itemId === selectedItem.itemId);
        if (existingIndex >= 0) {
            // Update quantity of existing item
            const updatedItems = [...addedItems];
            updatedItems[existingIndex].requiredQty += quantity;
            setAddedItems(updatedItems);
            toast.success(`Updated quantity for ${selectedItem.description || selectedItem.itemId}`);
        } else {
            // Add new item
            const newItem = {
                id: selectedItem.id,
                itemId: selectedItem.itemId,
                description: selectedItem.description || selectedItem.itemId,
                requiredQty: quantity
            };
            setAddedItems(prev => [...prev, newItem]);
            toast.success(`Added ${selectedItem.description || selectedItem.itemId}`);
        }

        // Reset form
        setSelectedItem(null);
        setSearchQuery('');
        setQuantity(1);
        searchInputRef.current?.focus();
    }, [selectedItem, quantity, addedItems]);

    const handleUpdateQuantity = useCallback((itemId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            toast.error("Quantity must be greater than 0");
            return;
        }
        setAddedItems(prev => 
            prev.map(item => 
                item.itemId === itemId 
                    ? { ...item, requiredQty: newQuantity }
                    : item
            )
        );
    }, []);

    const handleRemoveItem = useCallback((itemId: string) => {
        setAddedItems(prev => prev.filter(item => item.itemId !== itemId));
        toast.success("Item removed");
    }, []);

    const onSubmit = async (data: FormValues) => {
        try {
            setLoading(true);
            
            if (addedItems.length === 0) {
                toast.error('Please add at least one item');
                setLoading(false);
                return;
            }

            const pr = await purchaseRequisitionApi.create({
                ...data,
                items: addedItems.map(item => ({
                    itemId: item.itemId,
                    requiredQty: item.requiredQty,
                })),
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

            {/* Keyboard shortcut hints */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-muted">F2</span>
                <span>Focus Search</span>
                <span className="text-border">|</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">Enter</span>
                <span>Select Item</span>
                <span className="text-border">|</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">Tab</span>
                <span>Next Field</span>
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
                                    setValue('department', subName || (departments.find(d => d.id === selectedDepartmentId)?.name || ''));
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
                        <div className="space-y-2">
                            <Label>Goods Type</Label>
                            <Controller
                                control={control}
                                name="goodsType"
                                render={({ field }) => (
                                    <Select value={field.value || ''} onValueChange={field.onChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Goods Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                                            <SelectItem value="FRESH">Fresh Goods</SelectItem>
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
                    <CardHeader>
                        <CardTitle>Add Items</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Single search input */}
                        <div className="grid grid-cols-12 gap-4 items-end">
                            <div className="col-span-6 space-y-2">
                                <Label className="text-sm font-semibold">Item Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        ref={searchInputRef}
                                        placeholder="Search by Item ID, SKU, Barcode, or Description..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleSearchSubmit();
                                            }
                                        }}
                                        className="pl-9 bg-muted/50 border-input h-10 w-full"
                                    />

                                    {/* Autocomplete Dropdown */}
                                    {searchQuery.trim().length > 0 && 
                                     !selectedItem &&
                                     (searchResults.length > 0 || isSearching) && (
                                        <div className="absolute left-0 right-0 top-12 bg-popover border border-border shadow-md rounded-md overflow-hidden z-50 max-h-64 overflow-y-auto">
                                            {isSearching ? (
                                                <div className="p-3 text-sm text-muted-foreground flex items-center justify-center">
                                                    Searching...
                                                </div>
                                            ) : (
                                                <ul className="flex flex-col">
                                                    {searchResults.map((item) => (
                                                        <li
                                                            key={item.id}
                                                            className="px-4 py-2 hover:bg-muted cursor-pointer flex items-center justify-between border-b border-border/50 last:border-0"
                                                            onClick={() => handleSelectItem(item)}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold">{item.description || 'Unknown Item'}</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    ID: {item.itemId} | SKU: {item.sku || '-'}
                                                                </span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Show selected item */}
                                {selectedItem && (
                                    <div className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        Selected: {selectedItem.description || selectedItem.itemId}
                                    </div>
                                )}
                            </div>
                            
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm font-semibold">Required Quantity</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddItem();
                                        }
                                    }}
                                    className="h-10"
                                />
                            </div>
                            
                            <div className="col-span-3">
                                <Button
                                    type="button"
                                    onClick={handleAddItem}
                                    disabled={!selectedItem || !quantity || quantity <= 0}
                                    className="h-10 w-full"
                                >
                                    Add Item
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Added Items List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Added Items ({addedItems.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {addedItems.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No items added yet. Search and add items above.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {addedItems.map((item, index) => (
                                    <div key={item.itemId} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                                        <div className="flex-1">
                                            <div className="font-medium">{item.description}</div>
                                            <div className="text-sm text-muted-foreground">ID: {item.itemId}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <Label className="text-sm">Qty:</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={item.requiredQty}
                                                    onChange={(e) => handleUpdateQuantity(item.itemId, Number(e.target.value))}
                                                    className="w-20 h-8 text-sm"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleRemoveItem(item.itemId)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
