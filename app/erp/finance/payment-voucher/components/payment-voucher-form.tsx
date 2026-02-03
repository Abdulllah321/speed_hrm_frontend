"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentVoucherSchema, type PaymentVoucherFormValues } from "@/lib/validations/payment-voucher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Plus, Trash2, Loader2, CreditCard, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createPaymentVoucher } from "@/lib/actions/payment-voucher";
import { ChartOfAccount } from "@/lib/actions/chart-of-account";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

export function PaymentVoucherForm({ accounts }: { accounts: ChartOfAccount[] }) {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);

    const form = useForm<PaymentVoucherFormValues>({
        resolver: zodResolver(paymentVoucherSchema) as any,
        defaultValues: {
            type: "bank",
            isAdvance: false,
            pvNo: "",
            pvDate: new Date(),
            refBillNo: "",
            billDate: undefined,
            chequeNo: "",
            chequeDate: undefined,
            creditAccountId: "",
            creditAmount: 0,
            isTaxApplicable: false,
            description: "",
            details: [{ accountId: "", debit: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "details",
    });

    const voucherType = form.watch("type");

    // Auto-generate PV No based on type
    useEffect(() => {
        const prefix = voucherType === "bank" ? "BPV" : "CPV";
        const datePart = `${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        form.setValue("pvNo", `${prefix}${datePart}${randomPart}`);
    }, [voucherType, form]);

    const onSubmit: SubmitHandler<PaymentVoucherFormValues> = async (values) => {
        try {
            setIsPending(true);
            const result = await createPaymentVoucher(values);
            if (result.status) {
                toast.success(result.message);
                router.push("/finance/payment-voucher/list");
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        } finally {
            setIsPending(false);
        }
    };

    const watchDetails = form.watch("details") || [];
    const totalDebit = watchDetails.reduce((sum, detail) => sum + (Number(detail.debit) || 0), 0);
    const creditAmount = form.watch("creditAmount") || 0;
    const isBalanced = Math.abs(totalDebit - creditAmount) < 0.01;

    return (
        <Card className="w-full">
            <CardHeader className="border-b flex flex-row items-center justify-between">
                <CardTitle>{voucherType === "bank" ? "Create Bank Payment Voucher Form" : "Create Cash Payment Voucher Form"}</CardTitle>
                <Tabs value={voucherType} onValueChange={(val) => form.setValue("type", val as "bank" | "cash")} className="w-[300px]">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="bank" className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Bank
                        </TabsTrigger>
                        <TabsTrigger value="cash" className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Cash
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8">

                    <div className="flex items-center space-x-2">
                        <Controller
                            control={form.control}
                            name="isAdvance"
                            render={({ field }) => (
                                <Checkbox
                                    id="isAdvance"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                        />
                        <Label htmlFor="isAdvance" className="text-sm font-medium leading-none">Advance Payment</Label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">PV No</Label>
                            <Input {...form.register("pvNo")} disabled className="bg-muted font-medium" />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">PV Date <span className="text-destructive">*</span></Label>
                            <Controller
                                control={form.control}
                                name="pvDate"
                                render={({ field }) => (
                                    <DatePicker
                                        value={field.value ? field.value.toISOString().split('T')[0] : ""}
                                        onChange={(date) => field.onChange(new Date(date))}
                                    />
                                )}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Ref / Bill No.</Label>
                            <Input {...form.register("refBillNo")} placeholder="-" />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Bill Date</Label>
                            <Controller
                                control={form.control}
                                name="billDate"
                                render={({ field }) => (
                                    <DatePicker
                                        value={field.value ? field.value.toISOString().split('T')[0] : ""}
                                        onChange={(date) => field.onChange(new Date(date))}
                                    />
                                )}
                            />
                        </div>
                    </div>

                    {voucherType === "bank" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/20 rounded-lg border border-dashed border-primary/20">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase font-semibold">Cheque No <span className="text-destructive">*</span></Label>
                                <Input {...form.register("chequeNo")} placeholder="Enter Cheque No" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase font-semibold">Cheque Date <span className="text-destructive">*</span></Label>
                                <Controller
                                    control={form.control}
                                    name="chequeDate"
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value ? field.value.toISOString().split('T')[0] : ""}
                                            onChange={(date) => field.onChange(new Date(date))}
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b pb-6">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Credit From (Account) <span className="text-destructive">*</span></Label>
                            <Controller
                                control={form.control}
                                name="creditAccountId"
                                render={({ field }) => (
                                    <Autocomplete
                                        options={accounts.map(acc => ({ value: acc.id, label: `${acc.code} - ${acc.name}` }))}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        placeholder="Select Bank/Cash Account"
                                    />
                                )}
                            />
                            {form.formState.errors.creditAccountId && (
                                <p className="text-xs text-destructive">{form.formState.errors.creditAccountId.message}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Amount <span className="text-destructive">*</span></Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...form.register("creditAmount", { valueAsNumber: true })}
                                className="text-lg font-bold"
                            />
                            {form.formState.errors.creditAmount && (
                                <p className="text-xs text-destructive">{form.formState.errors.creditAmount.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold">{voucherType === "bank" ? "Bank" : "Cash"} Payment Voucher Detail</h3>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => append({ accountId: "", debit: 0 })}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add More PV's Rows
                            </Button>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-[#EAEEF2] dark:bg-muted font-bold">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Account Head</th>
                                        <th className="px-4 py-3 text-left w-[200px]">Debit <span className="text-destructive">*</span></th>
                                        <th className="px-4 py-3 text-center w-[80px]">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {fields.map((field, index) => (
                                        <tr key={field.id}>
                                            <td className="px-4 py-3">
                                                <Controller
                                                    control={form.control}
                                                    name={`details.${index}.accountId`}
                                                    render={({ field }) => (
                                                        <Autocomplete
                                                            options={accounts.map(acc => ({ value: acc.id, label: `${acc.code} - ${acc.name}` }))}
                                                            value={field.value}
                                                            onValueChange={field.onChange}
                                                            placeholder="Select Account"
                                                        />
                                                    )}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...form.register(`details.${index}.debit`, { valueAsNumber: true })}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => remove(index)}
                                                    disabled={fields.length === 1}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-muted/50 dark:bg-muted/30 font-bold border-t">
                                    <tr>
                                        <td className="px-4 py-3 text-right">Totals:</td>
                                        <td className="px-4 py-3">
                                            <div className={cn(
                                                "p-2 rounded border text-lg",
                                                isBalanced ? "bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                                            )}>
                                                {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Controller
                            control={form.control}
                            name="isTaxApplicable"
                            render={({ field }) => (
                                <Checkbox
                                    id="isTaxApplicable"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                        />
                        <Label htmlFor="isTaxApplicable" className="text-sm font-medium leading-none">Tax Applicable</Label>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase font-semibold">Description <span className="text-destructive">*</span></Label>
                        <Textarea {...form.register("description")} placeholder="Enter payment description..." className="min-h-[100px]" />
                    </div>

                    <div className="flex justify-center pt-6 border-t font-primary">
                        <Button
                            type="submit"
                            disabled={isPending || !isBalanced || creditAmount <= 0}
                            className="px-20 h-14 text-xl font-bold rounded-xl shadow-lg"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit"
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
