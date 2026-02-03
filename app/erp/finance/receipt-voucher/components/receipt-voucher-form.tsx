"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { receiptVoucherSchema, type ReceiptVoucherFormValues } from "@/lib/validations/receipt-voucher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Plus, Trash2, Loader2, CreditCard, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createReceiptVoucher } from "@/lib/actions/receipt-voucher";
import { ChartOfAccount } from "@/lib/actions/chart-of-account";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ReceiptVoucherForm({ accounts }: { accounts: ChartOfAccount[] }) {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);

    const form = useForm<ReceiptVoucherFormValues>({
        resolver: zodResolver(receiptVoucherSchema) as any,
        defaultValues: {
            type: "bank",
            rvNo: "",
            rvDate: new Date(),
            refBillNo: "",
            billDate: undefined,
            chequeNo: "",
            chequeDate: undefined,
            description: "",
            debitAccountId: "",
            debitAmount: 0,
            details: [
                { accountId: "", credit: 0 },
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "details",
    });

    const voucherType = form.watch("type");

    // Auto-generate RV No based on type
    useEffect(() => {
        const prefix = voucherType === "bank" ? "BRV" : "CRV";
        const datePart = `${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        form.setValue("rvNo", `${prefix}${datePart}${randomPart}`);
    }, [voucherType, form]);

    const onSubmit: SubmitHandler<ReceiptVoucherFormValues> = async (values) => {
        try {
            setIsPending(true);
            const result = await createReceiptVoucher(values);
            if (result.status) {
                toast.success(result.message);
                router.push("/finance/receipt-voucher/list");
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
    const totalCredit = watchDetails.reduce((sum, detail) => sum + (Number(detail.credit) || 0), 0);
    const debitAmount = form.watch("debitAmount") || 0;
    const isBalanced = Math.abs(totalCredit - debitAmount) < 0.01 && debitAmount > 0;

    return (
        <Card className="w-full border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pb-6 flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold">
                    Create {voucherType === "bank" ? "Bank" : "Cash"} RECEIPT Voucher Form
                </CardTitle>
                <Tabs value={voucherType} onValueChange={(val) => form.setValue("type", val as "bank" | "cash")} className="w-[200px]">
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
            <CardContent className="px-0">
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">

                    {/* Top Row Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">RV No</Label>
                            <Input {...form.register("rvNo")} disabled className="bg-slate-200/50 border-slate-300 h-10 font-medium" />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">RV Date <span className="text-destructive">*</span></Label>
                            <Controller
                                control={form.control}
                                name="rvDate"
                                render={({ field }) => (
                                    <DatePicker
                                        className="h-10 border-slate-300 dark:border-input"
                                        value={field.value ? field.value.toISOString().split('T')[0] : ""}
                                        onChange={(date) => field.onChange(new Date(date))}
                                    />
                                )}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Ref / Bill No.</Label>
                            <Input {...form.register("refBillNo")} placeholder="Ref / Bill No" className="h-10 border-slate-300" />
                        </div>

                        {voucherType === "bank" ? (
                            <>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Cheque No <span className="text-destructive">*</span></Label>
                                    <Input {...form.register("chequeNo")} placeholder="Cheque No" className="h-10 border-slate-300 dark:border-input" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Cheque Date <span className="text-destructive">*</span></Label>
                                    <Controller
                                        control={form.control}
                                        name="chequeDate"
                                        render={({ field }) => (
                                            <DatePicker
                                                className="h-10 border-slate-300 dark:border-input"
                                                value={field.value ? field.value.toISOString().split('T')[0] : ""}
                                                onChange={(date) => field.onChange(new Date(date))}
                                            />
                                        )}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="col-span-2"></div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b pb-6">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Debit To (Account) <span className="text-destructive">*</span></Label>
                            <Controller
                                control={form.control}
                                name="debitAccountId"
                                render={({ field }) => (
                                    <Autocomplete
                                        options={accounts.map(acc => ({ value: acc.id, label: `${acc.code} - ${acc.name}` }))}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        placeholder="Select Bank/Cash Account"
                                    />
                                )}
                            />
                            {form.formState.errors.debitAccountId && (
                                <p className="text-xs text-destructive">{form.formState.errors.debitAccountId.message}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Total Amount <span className="text-destructive">*</span></Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...form.register("debitAmount", { valueAsNumber: true })}
                                className="text-lg font-bold"
                            />
                            {form.formState.errors.debitAmount && (
                                <p className="text-xs text-destructive">{form.formState.errors.debitAmount.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold">{voucherType === "bank" ? "Bank" : "Cash"} Receipt Voucher Detail</h3>
                            <div className="relative">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => append({ accountId: "", credit: 0 })}
                                    className="h-9 px-4 rounded-md font-bold"
                                >
                                    Add More RV's Rows
                                </Button>
                                <span className="absolute -top-2 -right-2 bg-slate-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm font-bold">
                                    {fields.length}
                                </span>
                            </div>
                        </div>

                        <div className="border border-slate-200 dark:border-border rounded-sm overflow-hidden shadow-sm">
                            <table className="w-full text-sm">
                                <thead className="bg-[#EAEEF2] dark:bg-muted font-bold text-slate-700 dark:text-foreground">
                                    <tr className="border-b border-slate-300 dark:border-border">
                                        <th className="px-4 py-3 text-left">Account Head</th>
                                        <th className="px-4 py-3 text-left w-[150px]">Credit <span className="text-destructive">*</span></th>
                                        <th className="px-4 py-3 text-center w-[80px]">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-border">
                                    {fields.map((field, index) => (
                                        <tr key={field.id} className="hover:bg-slate-50/50 dark:hover:bg-muted/50 transition-colors">
                                            <td className="px-2 py-2">
                                                <Controller
                                                    control={form.control}
                                                    name={`details.${index}.accountId`}
                                                    render={({ field }) => (
                                                        <Autocomplete
                                                            options={accounts.map(acc => ({ value: acc.id, label: `${acc.code} - ${acc.name}` }))}
                                                            value={field.value}
                                                            onValueChange={field.onChange}
                                                            placeholder="Select Account"
                                                            className="border-none bg-transparent focus-visible:ring-0 shadow-none h-10"
                                                        />
                                                    )}
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...form.register(`details.${index}.credit`, { valueAsNumber: true })}
                                                    placeholder="Credit"
                                                    className="border-slate-300 dark:border-input h-10 text-right font-medium"
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <div className="flex items-center justify-center text-slate-400">
                                                    {fields.length > 1 ? (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => remove(index)}
                                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs">---</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-white border-t-2 border-slate-800">
                                    <tr className="divide-x divide-slate-200">
                                        <td className="px-4 py-4 text-right font-bold bg-slate-50/30">Totals:</td>
                                        <td className="px-2 py-4">
                                            <div className={cn(
                                                "p-2 rounded-md border text-center font-bold text-lg min-h-[44px] flex items-center justify-center",
                                                totalCredit > 0 ? "bg-slate-100 dark:bg-muted/50 border-slate-300 dark:border-input text-slate-700 dark:text-foreground" : "bg-slate-100 dark:bg-muted/50 border-slate-300 dark:border-input text-transparent"
                                            )}>
                                                {totalCredit > 0 ? totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : ""}
                                            </div>
                                        </td>
                                        <td className="bg-slate-50/30 dark:bg-muted/30">
                                            <div className={cn(
                                                "p-2 rounded-md border text-center font-bold text-lg min-h-[44px] flex items-center justify-center",
                                                isBalanced ? "bg-green-100 border-green-200 text-green-700" : (totalCredit > 0) ? "bg-red-100 border-red-200 text-red-700" : "bg-slate-100 border-slate-300"
                                            )}>
                                                {isBalanced ? "✓" : (totalCredit > 0) ? "!" : ""}
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-1.5 pt-4">
                        <Label className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                            Description <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            {...form.register("description")}
                            placeholder="Type description here..."
                            className="min-h-[80px] border-slate-300 dark:border-input rounded-sm"
                        />
                    </div>

                    <div className="flex justify-center pt-8 font-primary">
                        <Button
                            type="submit"
                            disabled={isPending || !isBalanced}
                            className="px-16 h-12 text-lg font-bold rounded-md shadow-md transition-all active:scale-95"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
