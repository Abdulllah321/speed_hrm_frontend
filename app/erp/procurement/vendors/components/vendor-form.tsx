"use client";

import { createVendor } from "@/lib/actions/procurement";
import { getChartOfAccounts, ChartOfAccount } from "@/lib/actions/chart-of-account";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vendorSchema, type VendorFormValues } from "@/lib/validations/vendor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, Globe } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function VendorForm() {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);

    useEffect(() => {
        getChartOfAccounts().then(res => {
            if (res.status && Array.isArray(res.data)) {
                setAccounts(res.data);
            }
        });
    }, []);

    const form = useForm<VendorFormValues>({
        resolver: zodResolver(vendorSchema) as any,
        defaultValues: {
            type: "local",
            code: "",
            name: "",
            address: "",
            contactPerson: "",
            contactNumber: "",
            nature: undefined,
            cnic: "",
            ntn: "",
            strn: "",
            srb: "",
            pra: "",
            ict: "",
            brand: "",
            chartOfAccountId: "",
        },
    });

    const vendorType = form.watch("type");

    const onSubmit: SubmitHandler<VendorFormValues> = async (values) => {
        try {
            setIsPending(true);
            const result = await createVendor(values);
            if (result.status) {
                toast.success(result.message);
                // router.push("/erp/procurement/vendors/list"); // Redirect to list if it existed
                form.reset();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="border-b flex flex-row items-center justify-between">
                <CardTitle>{vendorType === "local" ? "Create Local Supplier" : "Create Import Supplier"}</CardTitle>
                <Tabs value={vendorType} onValueChange={(val) => form.setValue("type", val as "local" | "import")} className="w-[300px]">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="local" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Local
                        </TabsTrigger>
                        <TabsTrigger value="import" className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Import
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8">

                    {/* Basic Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Code <span className="text-destructive">*</span></Label>
                            <Input {...form.register("code")} placeholder="Enter Supplier Code" />
                            {form.formState.errors.code && (
                                <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Name of Supplier <span className="text-destructive">*</span></Label>
                            <Input {...form.register("name")} placeholder="Enter Supplier Name" />
                            {form.formState.errors.name && (
                                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase font-semibold">Address <span className="text-destructive">*</span></Label>
                        <Textarea {...form.register("address")} placeholder="Enter Address" />
                        {form.formState.errors.address && (
                            <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Contact Person</Label>
                            <Input {...form.register("contactPerson")} placeholder="Enter Contact Person" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Contact Number</Label>
                            <Input {...form.register("contactNumber")} placeholder="Enter Contact Number" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase font-semibold">Chart of Account <span className="text-destructive">*</span></Label>
                        <Controller
                            control={form.control}
                            name="chartOfAccountId"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map((acc) => (
                                            <SelectItem key={acc.id} value={acc.id}>
                                                {acc.code} - {acc.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {form.formState.errors.chartOfAccountId && (
                            <p className="text-xs text-destructive">{form.formState.errors.chartOfAccountId.message}</p>
                        )}
                    </div>

                    {/* Tax & Registration Details - Common for Both */}
                    <div className="space-y-6 border-t pt-6">
                        <h3 className="text-lg font-semibold">Tax & Registration Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase font-semibold">CNIC No.</Label>
                                <Input {...form.register("cnic")} placeholder="Enter CNIC" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase font-semibold">NTN No.</Label>
                                <Input {...form.register("ntn")} placeholder="Enter NTN" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase font-semibold">STRN No.</Label>
                                <Input {...form.register("strn")} placeholder="Enter STRN" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase font-semibold">SRB No.</Label>
                                <Input {...form.register("srb")} placeholder="Enter SRB" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase font-semibold">PRA No.</Label>
                                <Input {...form.register("pra")} placeholder="Enter PRA" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase font-semibold">ICT No.</Label>
                                <Input {...form.register("ict")} placeholder="Enter ICT" />
                            </div>
                        </div>
                    </div>

                    {/* Local Supplier Specific Fields */}
                    {vendorType === "local" && (
                        <div className="space-y-6 border-t pt-6">
                            <h3 className="text-lg font-semibold">Local Consignment Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase font-semibold">Nature <span className="text-destructive">*</span></Label>
                                    <Controller
                                        control={form.control}
                                        name="nature"
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Nature" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GOODS">Goods</SelectItem>
                                                    <SelectItem value="SERVICES">Services</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {form.formState.errors.nature && (
                                        <p className="text-xs text-destructive">{form.formState.errors.nature.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Import Supplier Specific Fields */}
                    {vendorType === "import" && (
                        <div className="space-y-6 border-t pt-6">
                            <h3 className="text-lg font-semibold">Import Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase font-semibold">Brand <span className="text-destructive">*</span></Label>
                                    <Input {...form.register("brand")} placeholder="e.g. NIKE, ADIDAS" />
                                    {form.formState.errors.brand && (
                                        <p className="text-xs text-destructive">{form.formState.errors.brand.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-6 border-t font-primary">
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Supplier
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
