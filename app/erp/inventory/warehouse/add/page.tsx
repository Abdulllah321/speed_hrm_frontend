'use client';

import { WarehouseForm } from '../warehouse-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft, List } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddWarehousePage() {
    const router = useRouter();

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Add Warehouse</h1>
                        <p className="text-muted-foreground">Register a new storage location in the system.</p>
                    </div>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/erp/inventory/warehouse">
                        <List className="h-4 w-4 mr-2" />
                        Warehouse List
                    </Link>
                </Button>
            </div>

            <WarehouseForm />
        </div>
    );
}
