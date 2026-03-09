'use client';

import { useState, useEffect } from 'react';
import { WarehouseForm } from '../warehouse-form';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { warehouseApi, Warehouse } from '@/lib/api';
import { Plus, Edit, Trash2, Building2, ArrowLeft, History, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AddWarehousePage() {
    const router = useRouter();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        loadWarehouses();
    }, []);

    const loadWarehouses = async () => {
        setLoading(true);
        try {
            const data = await warehouseApi.getAll();
            setWarehouses(data);
        } catch (error) {
            console.error('Failed to load warehouses:', error);
            toast.error('Failed to load warehouses');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this warehouse?')) return;

        try {
            await warehouseApi.delete(id);
            toast.success('Warehouse deleted successfully');
            loadWarehouses();
        } catch (error) {
            console.error('Failed to delete warehouse:', error);
            toast.error('Failed to delete warehouse');
        }
    };

    const handleSuccess = () => {
        setShowForm(false);
        loadWarehouses();
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Warehouse Management</h1>
                        <p className="text-muted-foreground">View and manage storage locations.</p>
                    </div>
                </div>
                {!showForm && (
                    <Button onClick={() => setShowForm(true)} className="font-bold shadow-md">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Warehouse
                    </Button>
                )}
                {showForm && (
                    <Button variant="outline" onClick={() => setShowForm(false)} className="font-bold shadow-sm">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                )}
            </div>

            {showForm && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <Card className="border-2 border-primary/20 shadow-lg">
                        <CardHeader className="bg-primary/5 rounded-t-lg">
                            <CardTitle>Register New Warehouse</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <WarehouseForm onSuccess={handleSuccess} />
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                <Card className="shadow-sm border-2">
                    <CardHeader className="bg-muted/30">
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            Existing Warehouses
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {loading ? (
                            <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                Loading warehouses...
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-bold">Code</TableHead>
                                        <TableHead className="font-bold">Name</TableHead>
                                        <TableHead className="font-bold">Type</TableHead>
                                        <TableHead className="font-bold">Address</TableHead>
                                        <TableHead className="font-bold text-center">Status</TableHead>
                                        <TableHead className="text-right font-bold">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {warehouses.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-48 text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Building2 className="h-8 w-8 text-muted-foreground/30" />
                                                    No warehouses found. Start by adding one.
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        warehouses.map((w) => (
                                            <TableRow key={w.id} className="hover:bg-muted/50 transition-colors">
                                                <TableCell className="font-mono font-bold text-sm text-primary">{w.code}</TableCell>
                                                <TableCell>
                                                    <span className="font-semibold">{w.name}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-background">{w.type}</Badge>
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate text-muted-foreground text-sm">{w.address || '-'}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={w.isActive ? 'default' : 'secondary'} className={w.isActive ? 'bg-green-600' : ''}>
                                                        {w.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right space-x-1">
                                                    <Button variant="ghost" size="icon" asChild className="hover:text-primary">
                                                        <Link href={`/erp/inventory/warehouse/edit/${w.id}`}>
                                                            <Edit className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDelete(w.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
