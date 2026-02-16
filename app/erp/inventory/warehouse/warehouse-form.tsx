'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { warehouseApi, Warehouse } from '@/lib/api';
import { toast } from 'sonner';
import { Save, X, Building2 } from 'lucide-react';

interface WarehouseFormProps {
    id?: string;
}

export function WarehouseForm({ id }: WarehouseFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!!id);
    const [formData, setFormData] = useState<Partial<Warehouse>>({
        code: '',
        name: '',
        type: 'GENERAL',
        address: '',
        description: '',
        isActive: true,
    });

    useEffect(() => {
        if (id) {
            loadWarehouse();
        }
    }, [id]);

    const loadWarehouse = async () => {
        try {
            const data = await warehouseApi.getById(id!);
            setFormData(data);
        } catch (error) {
            console.error('Failed to load warehouse:', error);
            toast.error('Failed to load warehouse details');
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (id) {
                await warehouseApi.update(id, formData);
                toast.success('Warehouse updated successfully');
            } else {
                await warehouseApi.create(formData);
                toast.success('Warehouse created successfully');
            }
            router.push('/erp/inventory/warehouse');
        } catch (error: any) {
            console.error('Failed to save warehouse:', error);
            toast.error(error.message || 'Failed to save warehouse');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-10 text-center">Loading details...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {id ? 'Edit Warehouse' : 'New Warehouse'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Warehouse Code</Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="e.g. WH-KHI-01"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type">Storage Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(val) => setFormData({ ...formData, type: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GENERAL">General</SelectItem>
                                    <SelectItem value="RAW_MATERIAL">Raw Material</SelectItem>
                                    <SelectItem value="FINISHED_GOODS">Finished Goods</SelectItem>
                                    <SelectItem value="COLD_STORAGE">Cold Storage</SelectItem>
                                    <SelectItem value="QUARANTINE">Quarantine</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Warehouse Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Central Karachi Hub"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Physical Address</Label>
                        <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Full street address..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Additional notes about this warehouse..."
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Switch
                            id="isActive"
                            checked={formData.isActive}
                            onCheckedChange={(val) => setFormData({ ...formData, isActive: val })}
                        />
                        <Label htmlFor="isActive">Active Status</Label>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/erp/inventory/warehouse')}
                >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Warehouse'}
                </Button>
            </div>
        </form>
    );
}
