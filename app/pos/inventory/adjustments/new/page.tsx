"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getLocationById } from "@/lib/actions/location";
import { getWarehouses } from "@/lib/actions/warehouse";
import { NewPosAdjustmentForm } from "./new-pos-adjustment-form";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NewPosAdjustmentPage() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [warehouse, setWarehouse] = useState<{ id: string; name: string; code: string } | null>(null);
    const [location, setLocation] = useState<{ id: string; name: string; code: string } | null>(null);

    const locationId = user?.terminal?.location?.id || (user as any)?.locationId;

    useEffect(() => {
        const resolveLocationWarehouse = async () => {
            if (!locationId) return;
            setIsLoading(true);
            try {
                // Fetch the store location details
                const res = await getLocationById(locationId);
                if (res.status && res.data) {
                    setLocation({
                        id: res.data.id,
                        name: res.data.name,
                        code: res.data.code,
                    });
                } else {
                    toast.error("Failed to load store location context.");
                }

                // Fetch warehouses in system and pick the first active one as default
                const warehouses = await getWarehouses();
                const activeWh = warehouses.find(w => w.isActive) || warehouses[0];
                if (activeWh) {
                    setWarehouse({
                        id: activeWh.id,
                        name: activeWh.name,
                        code: activeWh.code,
                    });
                } else {
                    toast.error("No active warehouse found in the system.");
                }
            } catch (error) {
                console.error(error);
                toast.error("An error occurred while loading location context.");
            } finally {
                setIsLoading(false);
            }
        };

        resolveLocationWarehouse();
    }, [locationId]);

    if (!locationId) {
        return (
            <div className="p-6 max-w-md mx-auto mt-20">
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                    <CardContent className="pt-6 text-center space-y-4">
                        <ShieldAlert className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />
                        <h3 className="text-lg font-bold text-red-800 dark:text-red-300">Terminal Context Required</h3>
                        <p className="text-sm text-red-600 dark:text-red-400">
                            Please log in from an authorized terminal session to create stock adjustments.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-medium">Resolving store context...</p>
            </div>
        );
    }

    if (!warehouse) {
        return (
            <div className="p-6 max-w-md mx-auto mt-20">
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                    <CardContent className="pt-6 text-center space-y-4">
                        <ShieldAlert className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />
                        <h3 className="text-lg font-bold text-red-800 dark:text-red-300">No Warehouse Available</h3>
                        <p className="text-sm text-red-600 dark:text-red-400">
                            No warehouse is defined in the system. Please ask an ERP administrator to configure at least one warehouse.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <NewPosAdjustmentForm 
                warehouse={warehouse} 
                location={location!} 
            />
        </div>
    );
}
