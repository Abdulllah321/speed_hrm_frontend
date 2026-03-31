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
import { createPaymentVoucher, getSuppliersWithPendingInvoices, getPendingInvoicesBySupplier, getAllSuppliers, getVendorWithAccounts } from "@/lib/actions/payment-voucher";
import { ChartOfAccount } from "@/lib/actions/chart-of-account";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

export function PaymentVoucherForm({ accounts }: { 
    accounts: ChartOfAccount[]; 
}) {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [loadingSuppliers, setLoadingSuppliers] = useState(true);
    const [suppliersError, setSuppliersError] = useState<string>("");

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
            supplierId: "",
            selectedInvoiceId: "",
            invoices: [],
            isTaxApplicable: false,
            description: "",
            details: [
                { accountId: "", debit: 0, credit: 0 },
                { accountId: "", debit: 0, credit: 0 },
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "details",
    });

    const voucherType = form.watch("type");

    // Load suppliers with pending invoices on component mount
    useEffect(() => {
        const loadSuppliers = async () => {
            console.log('Loading suppliers with pending invoices...');
            setLoadingSuppliers(true);
            setSuppliersError("");
            
            // First debug - check what invoices exist
            try {
                const { authFetch } = await import("@/lib/auth");
                const debugResponse = await authFetch("/finance/payment-vouchers/debug-invoices", {
                    cache: 'no-store'
                });
                if (debugResponse.ok) {
                    const debugData = debugResponse.data;
                    console.log('DEBUG - All invoices in database:', debugData);
                } else {
                    console.error('Debug endpoint failed:', debugResponse.status);
                }
            } catch (error) {
                console.error('Debug endpoint error:', error);
            }
            
            const result = await getSuppliersWithPendingInvoices();
            console.log('Suppliers result:', result);
            
            if (result.status) {
                console.log('Suppliers data:', result.data);
                setSuppliers(result.data);
                if (result.data.length === 0) {
                    setSuppliersError("No suppliers with pending invoices found");
                }
            } else {
                console.error('Failed to load suppliers:', result);
                setSuppliers([]);
                setSuppliersError(result.error || "Failed to load suppliers");
            }
            
            setLoadingSuppliers(false);
        };
        loadSuppliers();
    }, []);

    // Auto-generate PV No based on type
    useEffect(() => {
        const prefix = voucherType === "bank" ? "BPV" : "CPV";
        const datePart = `${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        form.setValue("pvNo", `${prefix}${datePart}${randomPart}`);
    }, [voucherType, form]);

    // Load pending invoices when supplier changes
    const selectedSupplierId = form.watch("supplierId");
    useEffect(() => {
        if (selectedSupplierId) {
            const loadPendingInvoices = async () => {
                const result = await getPendingInvoicesBySupplier(selectedSupplierId);
                if (result.status) {
                    setPendingInvoices(result.data);
                } else {
                    setPendingInvoices([]);
                }
            };
            loadPendingInvoices();
        } else {
            setPendingInvoices([]);
            setSelectedInvoice(null);
            form.setValue("selectedInvoiceId", "");
            form.setValue("creditAmount", 0);
        }
    }, [selectedSupplierId, form]);

    // When supplier changes, fetch their linked chart of accounts and pre-fill debit rows
    const selectedInvoiceId = form.watch("selectedInvoiceId");
    useEffect(() => {
        if (!selectedSupplierId) return;
        getVendorWithAccounts(selectedSupplierId).then(res => {
            if (res.status && res.data?.chartOfAccounts?.length > 0) {
                const linkedAccounts: { id: string }[] = res.data.chartOfAccounts;

                if (linkedAccounts.length === 1) {
                    // Single account — set first row
                    form.setValue("details.0.accountId", linkedAccounts[0].id);
                } else {
                    // Multiple accounts (e.g. GOODS/SERVICES vendor) — one row per account
                    // Ensure enough rows exist
                    const currentRows = form.getValues("details").length;
                    linkedAccounts.forEach((acc, i) => {
                        if (i < currentRows) {
                            form.setValue(`details.${i}.accountId`, acc.id);
                            form.setValue(`details.${i}.debit`, 0);
                            form.setValue(`details.${i}.credit`, 0);
                        } else {
                            append({ accountId: acc.id, debit: 0, credit: 0 });
                        }
                    });
                }
            }
        });
    }, [selectedSupplierId, form, append]);

    // Handle invoice selection — auto-fill amount from selected invoice
    useEffect(() => {
        if (selectedInvoiceId && pendingInvoices.length > 0) {
            const invoice = pendingInvoices.find(inv => inv.id === selectedInvoiceId);
            if (invoice) {
                setSelectedInvoice(invoice);
                const amount = Number(invoice.remainingAmount);
                form.setValue("refBillNo", invoice.invoiceNumber);
                form.setValue("billDate", new Date(invoice.invoiceDate));

                // Put full amount in first debit row — if vendor has 2 accounts,
                // user can manually split between the two rows
                form.setValue("details.0.debit", amount);
                form.setValue("details.0.credit", 0);
            }
        } else {
            setSelectedInvoice(null);
        }
    }, [selectedInvoiceId, pendingInvoices, form]);

    const onSubmit: SubmitHandler<PaymentVoucherFormValues> = async (values) => {
        try {
            setIsPending(true);
            
            // Calculate totals from details
            const totalDebit = watchDetails.reduce((sum, detail) => sum + (Number(detail.debit) || 0), 0);
            const totalCredit = watchDetails.reduce((sum, detail) => sum + (Number(detail.credit) || 0), 0);
            
            // Find the main credit account (bank account) from details
            const creditAccountEntry = watchDetails.find(detail => Number(detail.credit) > 0);
            const mainCreditAccountId = creditAccountEntry?.accountId || "";
            const mainCreditAmount = totalCredit;
            
            // Prepare invoice data if an invoice is selected
            const invoices = selectedInvoice ? [{
                purchaseInvoiceId: selectedInvoice.id,
                paidAmount: Number(selectedInvoice.remainingAmount)
            }] : [];

            // Remove frontend-only fields and prepare backend data
            const { selectedInvoiceId, ...cleanData } = values;

            // Prepare final data for backend with required fields
            const finalSubmitData = {
                ...cleanData,
                creditAccountId: mainCreditAccountId || values.creditAccountId, // Use derived or original
                creditAmount: mainCreditAmount || values.creditAmount, // Use derived or original
                invoices: invoices.length > 0 ? invoices : undefined
            };

            console.log('Final data for backend:', JSON.stringify(finalSubmitData, null, 2));

            const result = await createPaymentVoucher(finalSubmitData);
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

    // Watch for changes in detail rows to auto-balance
    const watchDetails = form.watch("details") || [];
    useEffect(() => {
        // Calculate total debit from all rows
        const totalDebit = watchDetails.reduce((sum, detail) => sum + (Number(detail.debit) || 0), 0);
        
        // Find the first row with debit amount (supplier row)
        const supplierRowIndex = watchDetails.findIndex(detail => Number(detail.debit) > 0);
        
        // Find the second row with account selected but no debit (bank/company row)
        const bankRowIndex = watchDetails.findIndex((detail, index) => 
            index !== supplierRowIndex && 
            detail.accountId && 
            Number(detail.debit) === 0
        );
        
        // If we have a supplier debit and a bank account selected, auto-fill credit
        if (supplierRowIndex >= 0 && bankRowIndex >= 1) {
            const supplierDebitAmount = Number(watchDetails[supplierRowIndex].debit);
            const currentBankCredit = Number(watchDetails[bankRowIndex].credit) || 0;
            
            if (supplierDebitAmount > 0 && currentBankCredit !== supplierDebitAmount) {
                // Auto-fill the credit amount in the bank row
                form.setValue(`details.${bankRowIndex}.credit`, supplierDebitAmount);
                form.setValue(`details.${bankRowIndex}.debit`, 0);
                console.log(`Auto-filled bank row credit: ${supplierDebitAmount}`);
            }
        }
    }, [watchDetails, form]);

    const totalDebit = watchDetails.reduce((sum, detail) => sum + (Number(detail.debit) || 0), 0);
    const totalCredit = watchDetails.reduce((sum, detail) => sum + (Number(detail.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

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
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">PV Date</Label>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg border border-dashed border-primary/20">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Supplier</Label>
                            <Controller
                                control={form.control}
                                name="supplierId"
                                render={({ field }) => (
                                    <Autocomplete
                                        options={suppliers.map(supplier => ({ 
                                            value: supplier.id, 
                                            label: `${supplier.code || supplier.name} - ${supplier.name} (${supplier._count?.purchaseInvoices || 0} pending)` 
                                        }))}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        placeholder={loadingSuppliers ? "Loading suppliers..." : "Select Supplier (Optional)"}
                                        disabled={loadingSuppliers}
                                    />
                                )}
                            />
                            {suppliersError && (
                                <p className="text-xs text-amber-600">{suppliersError}</p>
                            )}
                            {!loadingSuppliers && suppliers.length > 0 && (
                                <p className="text-xs text-green-600">{suppliers.length} suppliers with pending invoices</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Purchase Invoice</Label>
                            <Controller
                                control={form.control}
                                name="selectedInvoiceId"
                                render={({ field }) => (
                                    <Autocomplete
                                        options={pendingInvoices.map(invoice => ({ 
                                            value: invoice.id, 
                                            label: `${invoice.invoiceNumber} - ${Number(invoice.remainingAmount).toLocaleString()} remaining` 
                                        }))}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        placeholder="Select Purchase Invoice (Optional)"
                                        disabled={!selectedSupplierId}
                                    />
                                )}
                            />
                        </div>
                    </div>

                    {selectedInvoice && (
                        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Selected Invoice Details</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Invoice No:</span>
                                    <p className="font-medium">{selectedInvoice.invoiceNumber}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Original Total:</span>
                                    <p className="font-medium">{Number(selectedInvoice.totalAmount).toLocaleString()}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Returns/Adjustments:</span>
                                    <p className="font-medium text-amber-600">-{Number(selectedInvoice.returnAmount || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Paid Amount:</span>
                                    <p className="font-medium">{Number(selectedInvoice.paidAmount).toLocaleString()}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Net Outstanding:</span>
                                    <p className="font-medium text-red-600">{Number(selectedInvoice.remainingAmount).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    ✅ This invoice will be marked as <strong>FULLY_PAID</strong> after payment voucher creation
                                </p>
                            </div>
                        </div>
                    )}

                    {voucherType === "bank" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg border border-dashed border-primary/20">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase font-semibold">Cheque No</Label>
                                <Input {...form.register("chequeNo")} placeholder="Enter Cheque No" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase font-semibold">Cheque Date</Label>
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



                    <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-foreground">{voucherType === "bank" ? "Bank" : "Cash"} Payment Voucher Detail</h2>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => append({ accountId: "", debit: 0, credit: 0 })}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add More PV Rows
                                </Button>
                            </div>
                        </div>

                        <div className="border rounded-lg overflow-hidden border-gray-200 dark:border-border">
                            <table className="w-full text-sm">
                                <thead className="dark:bg-muted text-foreground border-b font-bold">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Account Head</th>
                                        <th className="px-4 py-3 text-left w-[180px]">Debit</th>
                                        <th className="px-4 py-3 text-left w-[180px]">Credit</th>
                                        <th className="px-4 py-3 text-center w-[80px]">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {fields.map((field, index) => (
                                        <tr key={field.id} className="hover:bg-gray-50/50 dark:hover:bg-muted/50">
                                            <td className="px-4 py-3">
                                                <Controller
                                                    control={form.control}
                                                    name={`details.${index}.accountId`}
                                                    render={({ field }) => (
                                                        <Autocomplete
                                                            options={accounts.map((acc) => ({
                                                                value: acc.id,
                                                                label: `${acc.code} - ${acc.name}`,
                                                            }))}
                                                            value={field.value}
                                                            onValueChange={field.onChange}
                                                            placeholder="Select Account"
                                                            disabled={isPending}
                                                            className="h-10 border-gray-300 dark:border-input"
                                                        />
                                                    )}
                                                />
                                                {form.formState.errors.details?.[index]?.accountId && (
                                                    <p className="text-[10px] text-destructive mt-1">
                                                        {form.formState.errors.details[index].accountId?.message}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0"
                                                    {...form.register(`details.${index}.debit`, {
                                                        valueAsNumber: true,
                                                        onChange: (e) => {
                                                            if (Number(e.target.value) > 0) {
                                                                form.setValue(`details.${index}.credit`, 0, { shouldValidate: true });
                                                            }
                                                        }
                                                    })}
                                                    disabled={isPending}
                                                    className="h-10 border-gray-300 dark:border-input font-medium"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0"
                                                    {...form.register(`details.${index}.credit`, {
                                                        valueAsNumber: true,
                                                        onChange: (e) => {
                                                            if (Number(e.target.value) > 0) {
                                                                form.setValue(`details.${index}.debit`, 0, { shouldValidate: true });
                                                            }
                                                        }
                                                    })}
                                                    disabled={isPending}
                                                    className="h-10 border-gray-300 dark:border-input font-medium"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {fields.length > 2 ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => remove(index)}
                                                        disabled={isPending}
                                                        className="rounded-full"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <span className="text-gray-300">---</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="font-bold border-t border-gray-200 dark:border-border">
                                    <tr>
                                        <td className="px-4 py-4 text-right pr-8 text-gray-600 dark:text-muted-foreground">Totals:</td>
                                        <td className="px-4 py-4 text-right text-lg">
                                            {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-4 text-right text-lg">
                                            {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {!isBalanced && totalDebit > 0 && (
                                                <div className="mx-auto w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" title="Out of Balance" />
                                            )}
                                            {isBalanced && totalDebit > 0 && (
                                                <div className="mx-auto w-2.5 h-2.5 rounded-full bg-green-500" title="Balanced" />
                                            )}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        {form.formState.errors.details?.root && (
                            <p className="text-sm text-destructive font-medium">{form.formState.errors.details.root.message}</p>
                        )}
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

                    <div className="space-y-2 pt-4">
                        <Label htmlFor="description" className="text-xs text-muted-foreground uppercase font-semibold">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Enter payment description..."
                            {...form.register("description")}
                            disabled={isPending}
                            className="min-h-[100px] border-gray-300 dark:border-input rounded-lg"
                        />
                        {form.formState.errors.description && (
                            <p className="text-xs text-destructive font-medium">{form.formState.errors.description.message}</p>
                        )}
                    </div>

                    <div className="flex justify-center pt-6 border-t">
                        <Button
                            type="submit"
                            disabled={isPending || !isBalanced}
                        >
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Payment Voucher
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
