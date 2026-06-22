"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useForm, useFieldArray, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { receiptVoucherSchema, type ReceiptVoucherFormValues } from "@/lib/validations/receipt-voucher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, CreditCard, Wallet, Copy, Upload } from "lucide-react";
import { VoucherImportModal } from "@/components/finance/voucher-import-modal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createReceiptVoucher, updateReceiptVoucher, getAllCustomers, getPendingInvoicesByCustomer, type ReceiptVoucher } from "@/lib/actions/receipt-voucher";
import { ChartOfAccount } from "@/lib/actions/chart-of-account";
import { ChartOfAccountSelect, getSharedTree } from "@/components/ui/chart-of-account-select";
import { cn } from "@/lib/utils";
import { calculateTaxForAccount } from "@/lib/utils/tax-calculator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { CheckIcon, ChevronDownIcon, Tag } from "lucide-react";

// ─── Tag account selector ─────────────────────────────────────────────────────
function TagAccountSelect({ children, value, onValueChange, disabled, id }: {
    children: ChartOfAccount[];
    value?: string;
    onValueChange: (v: string) => void;
    disabled?: boolean;
    id?: string;
}) {
    const [open, setOpen] = useState(false);
    const selected = children.find((c) => c.id === value);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button id={id} type="button" disabled={disabled} className={cn(
                    "flex items-center w-full h-8 px-2 rounded-md border border-dashed border-input bg-background text-xs cursor-pointer select-none text-left",
                    "hover:bg-accent hover:text-accent-foreground transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                    open && "ring-1 ring-ring/20",
                    disabled && "pointer-events-none opacity-50"
                )}>
                    <Tag className="h-3 w-3 shrink-0 text-muted-foreground mr-1.5" />
                    <span className={cn("flex-1 min-w-0 truncate", !selected && "text-muted-foreground")}>
                        {selected ? `${selected.code} - ${selected.name}` : "Tag sub-account (optional)"}
                    </span>
                    <ChevronDownIcon className={cn("ml-1 h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start" sideOffset={4}>
                <Command>
                    <CommandInput placeholder="Search sub-account..." className="h-8 text-xs" />
                    <CommandList className="max-h-52">
                        <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">No sub-accounts found.</CommandEmpty>
                        <CommandGroup>
                            {value && (
                                <CommandItem value="__clear__" onSelect={() => { onValueChange(""); setOpen(false); }} className="text-xs text-muted-foreground italic">
                                    Clear tag
                                </CommandItem>
                            )}
                            {children.map((child) => (
                                <CommandItem key={child.id} value={`${child.code} ${child.name}`} onSelect={() => { onValueChange(child.id); setOpen(false); }} className="flex items-center gap-2 text-xs">
                                    <span className="font-mono text-muted-foreground shrink-0">{child.code}</span>
                                    <span className="flex-1 truncate">{child.name}</span>
                                    {value === child.id && <CheckIcon className="h-3 w-3 shrink-0 text-primary" />}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

type InvoiceReceiptEntry = {
    salesInvoiceId: string;
    invoiceNo: string;
    grandTotal: number;
    paidAmount: number;
    balanceAmount: number;
    receivingNow: number;
};

export function ReceiptVoucherForm({ initialData }: { initialData?: any }) {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
    const [selectedInvoices, setSelectedInvoices] = useState<InvoiceReceiptEntry[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [tree, setTree] = useState<ChartOfAccount[]>([]);

    const form = useForm<ReceiptVoucherFormValues>({
        resolver: zodResolver(receiptVoucherSchema) as any,
        defaultValues: {
            type: initialData?.type || "bank",
            rvNo: initialData?.rvNo || "",
            rvDate: initialData?.rvDate ? new Date(initialData.rvDate) : new Date(),
            refBillNo: initialData?.refBillNo || "",
            billDate: initialData?.billDate ? new Date(initialData.billDate) : undefined,
            chequeNo: initialData?.chequeNo || "",
            chequeDate: initialData?.chequeDate ? new Date(initialData.chequeDate) : undefined,
            description: initialData?.description || "",
            customerId: initialData?.customerId || "",
            isAdvance: initialData?.isAdvance ?? false,
            taxType: (initialData?.taxType as "Taxable" | "BTL" | "REIMB") ?? "Taxable",
            invoices: initialData?.invoices || [],
            details: initialData?.details
                ? initialData.details.map((d: any) => ({
                      accountId: d.accountId,
                      tagAccountId: d.tagAccountId || "",
                      debit: Math.round(Number(d.debit) || 0),
                      credit: Math.round(Number(d.credit) || 0),
                      narration: d.narration || "",
                      refBillNo: d.refBillNo || "",
                      refBillNo2: d.refBillNo2 || "",
                      taxType: (d.taxType as "Taxable" | "BTL" | "REIMB") ?? "Taxable",
                  }))
                : [
                      { accountId: "", tagAccountId: "", debit: 0, credit: 0, narration: "", refBillNo: "", refBillNo2: "", taxType: "Taxable" as "Taxable" | "BTL" | "REIMB" },
                      { accountId: "", tagAccountId: "", debit: 0, credit: 0, narration: "", refBillNo: "", refBillNo2: "", taxType: "Taxable" as "Taxable" | "BTL" | "REIMB" },
                  ],
        },
    });

    const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "details" });
    const watchDetails = form.watch("details") || [];
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [filterAccountId, setFilterAccountId] = useState<string>("");

    const selectedAccountIds = useMemo(() => {
        return Array.from(new Set(watchDetails.map((d: any) => d.accountId).filter(Boolean)));
    }, [watchDetails.map((d: any) => d.accountId).join(",")]);

    const filterOptions = useMemo(() => {
        return selectedAccountIds.map(id => {
            const node = findInTree(tree, id);
            return {
                value: id,
                label: node ? `${node.code} - ${node.name}` : id
            };
        });
    }, [selectedAccountIds, tree]);
    const voucherType = form.watch("type");

    const moveToNextRowOrAppend = (index: number) => {
        const isLast = index === fields.length - 1;
        if (isLast) {
            append({
                accountId: "",
                tagAccountId: "",
                debit: 0,
                credit: 0,
                narration: "",
                refBillNo: "",
                refBillNo2: "",
                taxType: "Taxable" as "Taxable" | "BTL" | "REIMB",
            });
            setTimeout(() => {
                document.getElementById(`details-${index + 1}-accountId`)?.focus();
            }, 50);
        } else {
            document.getElementById(`details-${index + 1}-accountId`)?.focus();
        }
    };

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        index: number,
        field: 'narration' | 'refBillNo' | 'refBillNo2' | 'debit' | 'credit'
    ) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (field === 'narration') {
                document.getElementById(`details-${index}-refBillNo`)?.focus();
            } else if (field === 'refBillNo') {
                document.getElementById(`details-${index}-refBillNo2`)?.focus();
            } else if (field === 'refBillNo2') {
                document.getElementById(`details-${index}-debit`)?.focus();
            } else if (field === 'debit') {
                const debitVal = Number(e.currentTarget.value) || 0;
                if (debitVal > 0) {
                    moveToNextRowOrAppend(index);
                } else {
                    document.getElementById(`details-${index}-credit`)?.focus();
                }
            } else if (field === 'credit') {
                moveToNextRowOrAppend(index);
            }
        } else if (e.key === 'Tab' && !e.shiftKey && (field === 'debit' || field === 'credit')) {
            if (field === 'debit') {
                const debitVal = Number(e.currentTarget.value) || 0;
                if (debitVal > 0) {
                    e.preventDefault();
                    moveToNextRowOrAppend(index);
                }
            } else if (field === 'credit') {
                e.preventDefault();
                moveToNextRowOrAppend(index);
            }
        }
    };

    // Poll for shared tree
    useEffect(() => {
        const initial = getSharedTree();
        if (initial.length > 0) { setTree(initial); return; }
        const id = setInterval(() => {
            const t = getSharedTree();
            if (t.length > 0) { setTree(t); clearInterval(id); }
        }, 300);
        return () => clearInterval(id);
    }, []);

    // Clear tagAccountId when accountId changes for a row
    const prevAccountIds = useRef<Record<number, string>>({});
    
    useEffect(() => {
        watchDetails.forEach((detail: any, index: number) => {
            const accountId = detail.accountId;
            if (prevAccountIds.current[index] !== undefined && prevAccountIds.current[index] !== accountId) {
                form.setValue(`details.${index}.tagAccountId`, "");
            }
            prevAccountIds.current[index] = accountId;
        });
    }, [watchDetails.map((d: any) => d.accountId).join(",")]);

    const prevDetailsRef = useRef<Array<{ accountId: string; tagAccountId: string }>>([]);
    const prevTaxableAmountRef = useRef<number>(0);

    function findInTree(nodes: ChartOfAccount[], id: string): ChartOfAccount | undefined {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children?.length) { const f = findInTree(node.children, id); if (f) return f; }
        }
    }
    const rowChildren = useMemo(() => {
        return watchDetails.map((detail: any) => {
            if (!detail.accountId || tree.length === 0) return [];
            return findInTree(tree, detail.accountId)?.children ?? [];
        });
    }, [watchDetails.map((d: any) => d.accountId).join(","), tree]);

    useEffect(() => {
        if (initialData) return;
        const prefix = voucherType === "bank" ? "BRV" : "CRV";
        const datePart = `${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
        form.setValue("rvNo", `${prefix}${datePart}${Math.floor(1000 + Math.random() * 9000)}`);
    }, [voucherType, form, initialData]);

    useEffect(() => {
        getAllCustomers().then(r => {
            setCustomers(r.status ? r.data : []);
            setLoadingCustomers(false);
        });
    }, []);

    // Load selected invoices from initialData
    useEffect(() => {
        if (initialData && initialData.invoices && Array.isArray(initialData.invoices)) {
            const mappedInvoices = initialData.invoices.map((inv: any) => {
                const si = inv.salesInvoice || {};
                return {
                    salesInvoiceId: inv.salesInvoiceId,
                    invoiceNo: si.invoiceNo || "",
                    grandTotal: Number(si.grandTotal) || 0,
                    paidAmount: Number(si.paidAmount) || 0,
                    balanceAmount: Number(si.balanceAmount) || 0,
                    receivingNow: Number(inv.receivedAmount) || 0,
                };
            });
            setSelectedInvoices(mappedInvoices);
        }
    }, [initialData]);

    const selectedCustomerId = form.watch("customerId");
    useEffect(() => {
        if (selectedCustomerId) {
            getPendingInvoicesByCustomer(selectedCustomerId).then(r => {
                let list = (r.status ? r.data : []).filter((inv: any) => Number(inv.balanceAmount) > 0);
                if (initialData?.invoices && Array.isArray(initialData.invoices)) {
                    initialData.invoices.forEach((inv: any) => {
                        if (!list.find((x: any) => x.id === inv.salesInvoiceId)) {
                            const si = inv.salesInvoice || {};
                            list.push({
                                id: inv.salesInvoiceId,
                                invoiceNo: si.invoiceNo || "",
                                grandTotal: Number(si.grandTotal) || 0,
                                paidAmount: Number(si.paidAmount) || 0,
                                balanceAmount: Number(si.balanceAmount) || 0,
                            });
                        }
                    });
                }
                setPendingInvoices(list);
            });
        } else {
            setPendingInvoices([]);
            setSelectedInvoices([]);
        }
    }, [selectedCustomerId, initialData]);

    const toggleInvoice = (invoice: any) => {
        setSelectedInvoices(prev => {
            const exists = prev.find(i => i.salesInvoiceId === invoice.id);
            if (exists) return prev.filter(i => i.salesInvoiceId !== invoice.id);
            return [...prev, {
                salesInvoiceId: invoice.id,
                invoiceNo: invoice.invoiceNo,
                grandTotal: Number(invoice.grandTotal),
                paidAmount: Number(invoice.paidAmount),
                balanceAmount: Number(invoice.balanceAmount),
                receivingNow: Number(invoice.balanceAmount),
            }];
        });
    };

    const updateReceivingNow = (id: string, value: number) => {
        setSelectedInvoices(prev => prev.map(i => i.salesInvoiceId === id ? { ...i, receivingNow: value } : i));
    };

    const totalInvoiceReceipts = selectedInvoices.reduce((s, i) => s + (i.receivingNow || 0), 0);

    const duplicateToDebit = (fromIndex: number) => {
        const fromRow = form.getValues(`details.${fromIndex}`);
        const creditVal = Math.round(Number(fromRow.credit) || 0);
        
        const targetIndex = fromIndex + 1;
        const currentDetails = form.getValues("details") || [];
        
        if (targetIndex < currentDetails.length) {
            form.setValue(`details.${targetIndex}.debit`, creditVal, { shouldValidate: true });
            form.setValue(`details.${targetIndex}.credit`, 0, { shouldValidate: true });
            form.setValue(`details.${targetIndex}.narration`, fromRow.narration || "", { shouldValidate: true });
            form.setValue(`details.${targetIndex}.refBillNo`, fromRow.refBillNo || "", { shouldValidate: true });
            form.setValue(`details.${targetIndex}.refBillNo2`, fromRow.refBillNo2 || "", { shouldValidate: true });
            form.setValue(`details.${targetIndex}.taxType`, fromRow.taxType ?? "Taxable", { shouldValidate: true });
            if (fromRow.accountId) {
                form.setValue(`details.${targetIndex}.accountId`, fromRow.accountId, { shouldValidate: true });
            }
            if (fromRow.tagAccountId) {
                form.setValue(`details.${targetIndex}.tagAccountId`, fromRow.tagAccountId, { shouldValidate: true });
            }
            toast.success(`Copied details from Row ${fromIndex + 1} to Row ${targetIndex + 1} as Debit.`);
        } else {
            append({
                accountId: fromRow.accountId || "",
                tagAccountId: fromRow.tagAccountId || "",
                debit: creditVal,
                credit: 0,
                narration: fromRow.narration || "",
                refBillNo: fromRow.refBillNo || "",
                refBillNo2: fromRow.refBillNo2 || "",
                taxType: fromRow.taxType ?? "Taxable"
            });
            toast.success(`Duplicated Row ${fromIndex + 1} to a new Debit Row.`);
        }
    };

    // Watch for changes in detail rows to auto-balance and calculate taxes
    const watchDetailsString = watchDetails.map((d: any) => `${d.credit}-${d.accountId}-${d.tagAccountId}-${d.taxType}`).join(",");
    useEffect(() => {
        // Calculate total taxable amount (based on credits for RV)
        const taxableAmount = watchDetails.reduce((sum: number, detail: any) => {
            return sum + (detail.taxType === "Taxable" ? Math.round(Number(detail.credit) || 0) : 0);
        }, 0);

        let totalTaxAmount = 0;

        const prevTaxableAmount = prevTaxableAmountRef.current;
        const prevDetails = prevDetailsRef.current;
        const taxableAmountChanged = taxableAmount !== prevTaxableAmount;

        // Auto-calculate taxes for any recognized tax rows
        if (tree.length > 0) {
            watchDetails.forEach((detail: any, index: number) => {
                const prev = prevDetails[index] || { accountId: "", tagAccountId: "" };
                const triggerChanged = 
                    detail.accountId !== prev.accountId || 
                    detail.tagAccountId !== prev.tagAccountId ||
                    taxableAmountChanged;

                if (detail.accountId && detail.tagAccountId) {
                    const accountNode = findInTree(tree, detail.accountId);
                    const tagNode = accountNode?.children?.find(c => c.id === detail.tagAccountId);

                    if (accountNode?.code && tagNode?.code) {
                        if (taxableAmount > 0) {
                            const calculatedTax = calculateTaxForAccount(accountNode.code, tagNode.code, taxableAmount);
                            if (calculatedTax !== null) {
                                const roundedTax = Math.round(calculatedTax);
                                if (triggerChanged) {
                                    form.setValue(`details.${index}.debit`, roundedTax, { shouldValidate: true });
                                    form.setValue(`details.${index}.credit`, 0, { shouldValidate: true });
                                    totalTaxAmount += roundedTax;
                                } else {
                                    // Use user's manual entry (subtracting any credit to get net debit impact)
                                    totalTaxAmount += Math.round(Number(detail.debit) || 0) - Math.round(Number(detail.credit) || 0);
                                }
                            }
                        } else {
                            if (triggerChanged) {
                                form.setValue(`details.${index}.debit`, 0, { shouldValidate: true });
                            } else {
                                totalTaxAmount += Math.round(Number(detail.debit) || 0) - Math.round(Number(detail.credit) || 0);
                            }
                        }
                    }
                }

            });
        }

        // ALWAYS sync the ref to current watchDetails, whether tree is loaded or not!
        watchDetails.forEach((detail: any, index: number) => {
            prevDetails[index] = {
                accountId: detail.accountId || "",
                tagAccountId: detail.tagAccountId || "",
            };
        });

        // Clean up extra rows in the ref if any were deleted
        if (prevDetailsRef.current.length > watchDetails.length) {
            prevDetailsRef.current = prevDetailsRef.current.slice(0, watchDetails.length);
        }
        // Update the global taxable amount ref
        prevTaxableAmountRef.current = taxableAmount;

        // Find the first row with credit amount (customer row)
        const customerRowIndex = watchDetails.findIndex((detail: any) => Math.round(Number(detail.credit) || 0) > 0);
        
        // Find the second row with account selected but no credit and no tag (bank/company row)
        const bankRowIndex = watchDetails.findIndex((detail: any, index: number) => 
            index !== customerRowIndex && 
            detail.accountId && 
            Math.round(Number(detail.credit) || 0) === 0 &&
            !detail.tagAccountId
        );
        
        // Auto-fill debit
        if (customerRowIndex >= 0 && bankRowIndex >= 1) {
            const customerCreditAmount = Math.round(Number(watchDetails[customerRowIndex].credit) || 0);
            const currentBankDebit = Math.round(Number(watchDetails[bankRowIndex].debit) || 0);
            
            const expectedBankDebit = Math.round(Math.max(0, customerCreditAmount - totalTaxAmount));
            
            if (customerCreditAmount > 0 && currentBankDebit !== expectedBankDebit) {
                // Auto-fill the debit amount in the bank row
                form.setValue(`details.${bankRowIndex}.debit`, expectedBankDebit, { shouldValidate: true });
                form.setValue(`details.${bankRowIndex}.credit`, 0, { shouldValidate: true });
            }
        }
    }, [watchDetailsString, tree, form]);

    const totalDebit = watchDetails.reduce((sum: number, detail: any) => sum + (Number(detail.debit) || 0), 0);
    const totalCredit = watchDetails.reduce((sum: number, detail: any) => sum + (Number(detail.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

    // Auto-save draft logic (multiple drafts keyed by rvNo)
    const watchAllFields = form.watch();
    const voucherNo = watchAllFields.rvNo;
    useEffect(() => {
        if (initialData || !voucherNo) return;
        const draftData = {
            formValues: watchAllFields,
            selectedInvoices,
        };
        const timeout = setTimeout(() => {
            const draftsJson = localStorage.getItem("receipt-voucher-drafts") || "{}";
            try {
                const drafts = JSON.parse(draftsJson);
                drafts[voucherNo] = {
                    voucherNo,
                    updatedAt: new Date().toISOString(),
                    ...draftData,
                };
                localStorage.setItem("receipt-voucher-drafts", JSON.stringify(drafts));
            } catch (e) {
                console.error("Error saving draft", e);
            }
        }, 1000);
        return () => clearTimeout(timeout);
    }, [watchAllFields, voucherNo, selectedInvoices, initialData]);

    // Restore draft logic
    useEffect(() => {
        if (initialData) return;

        // Check if there's a specific draftId query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const urlDraftId = urlParams.get("draftId");

        const draftsJson = localStorage.getItem("receipt-voucher-drafts");
        if (!draftsJson) return;

        try {
            const drafts = JSON.parse(draftsJson);

            if (urlDraftId) {
                const draft = drafts[urlDraftId];
                if (draft && draft.formValues) {
                    if (draft.formValues.rvDate) draft.formValues.rvDate = new Date(draft.formValues.rvDate);
                    if (draft.formValues.billDate) draft.formValues.billDate = new Date(draft.formValues.billDate);
                    if (draft.formValues.chequeDate) draft.formValues.chequeDate = new Date(draft.formValues.chequeDate);
                    form.reset(draft.formValues);
                    if (draft.selectedInvoices) setSelectedInvoices(draft.selectedInvoices);
                    toast.success(`Restored draft: ${urlDraftId}`);
                }
            } else {
                const draftKeys = Object.keys(drafts);
                if (draftKeys.length === 1) {
                    const singleKey = draftKeys[0];
                    const draft = drafts[singleKey];
                    const hasFormDetails = draft.formValues?.details?.some((d: { accountId?: string; debit?: number; credit?: number }) => d.accountId || (d.debit ?? 0) > 0 || (d.credit ?? 0) > 0);
                    const hasInvoices = draft.selectedInvoices?.length > 0;
                    const hasDescriptionOrCustomer = draft.formValues?.description || draft.formValues?.customerId;

                    if (hasFormDetails || hasInvoices || hasDescriptionOrCustomer) {
                        toast(`You have an unsaved draft (${singleKey}).`, {
                            action: {
                                label: "Restore",
                                onClick: () => {
                                    if (draft.formValues) {
                                        if (draft.formValues.rvDate) draft.formValues.rvDate = new Date(draft.formValues.rvDate);
                                        if (draft.formValues.billDate) draft.formValues.billDate = new Date(draft.formValues.billDate);
                                        if (draft.formValues.chequeDate) draft.formValues.chequeDate = new Date(draft.formValues.chequeDate);
                                        form.reset(draft.formValues);
                                    }
                                    if (draft.selectedInvoices) setSelectedInvoices(draft.selectedInvoices);
                                    toast.success("Draft restored!");
                                }
                            },
                            cancel: {
                                label: "Discard",
                                onClick: () => {
                                    delete drafts[singleKey];
                                    localStorage.setItem("receipt-voucher-drafts", JSON.stringify(drafts));
                                }
                            },
                            duration: 15000,
                        });
                    }
                } else if (draftKeys.length > 1) {
                    toast(`You have ${draftKeys.length} pending drafts.`, {
                        action: {
                            label: "View Drafts",
                            onClick: () => {
                                router.push("/erp/finance/receipt-voucher/list");
                            }
                        },
                        duration: 15000,
                    });
                }
            }
        } catch (e) {
            console.error("Failed to parse drafts", e);
        }
    }, [initialData, form, router]);

    const onSubmit: SubmitHandler<ReceiptVoucherFormValues> = async (values) => {
        try {
            setIsPending(true);
            
            console.log('Form submission started');
            console.log('Form values:', values);

            if (selectedInvoices.length > 0 && totalInvoiceReceipts > totalDebit + 0.01) {
                toast.error(`Invoice receipts (${totalInvoiceReceipts.toLocaleString()}) exceed voucher debit (${totalDebit.toLocaleString()})`);
                return;
            }

            // Find debit account and amount from details
            const debitEntry = watchDetails.find(detail => Number(detail.debit) > 0);
            const mainDebitAccountId = debitEntry?.accountId || "";

            const finalData = {
                ...values,
                debitAccountId: mainDebitAccountId || values.debitAccountId,
                debitAmount: totalDebit || values.debitAmount,
                details: watchDetails
                    .filter(detail => Math.round(Number(detail.debit) || 0) > 0 || Math.round(Number(detail.credit) || 0) > 0)
                    .map(detail => ({
                        accountId: detail.accountId,
                        tagAccountId: detail.tagAccountId || undefined,
                        debit: Math.round(Number(detail.debit) || 0),
                        credit: Math.round(Number(detail.credit) || 0),
                        narration: detail.narration || undefined,
                        refBillNo: detail.refBillNo || undefined,
                        refBillNo2: detail.refBillNo2 || undefined,
                        taxType: detail.taxType ?? "Taxable",
                    })),
                invoices: selectedInvoices.length > 0
                    ? selectedInvoices.map(i => ({ salesInvoiceId: i.salesInvoiceId, receivedAmount: i.receivingNow }))
                    : undefined,
            };

            console.log('Final data being sent:', finalData);

            const result = initialData
                ? await updateReceiptVoucher(initialData.id, finalData)
                : await createReceiptVoucher(finalData);
            
            console.log('API result:', result);

            if (result.status) {
                if (!initialData && voucherNo) {
                    const draftsJson = localStorage.getItem("receipt-voucher-drafts");
                    if (draftsJson) {
                        try {
                            const drafts = JSON.parse(draftsJson);
                            delete drafts[voucherNo];
                            localStorage.setItem("receipt-voucher-drafts", JSON.stringify(drafts));
                        } catch {}
                    }
                }
                toast.success(result.message);
                router.push("/erp/finance/receipt-voucher/list");
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error('Form submission error:', error);
            toast.error("An unexpected error occurred");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="border-b flex flex-row items-center justify-between">
                <CardTitle>{initialData ? "Edit Receipt Voucher" : `Create ${voucherType === "bank" ? "Bank" : "Cash"} Receipt Voucher`}</CardTitle>
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

                    {/* ── Advance Receipt toggle + guidance ── */}
                    <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
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
                            <Label htmlFor="isAdvance" className="text-sm font-semibold leading-none cursor-pointer">
                                Advance Receipt
                                <span className="ml-2 font-normal text-muted-foreground">(receiving payment before a sales invoice is created)</span>
                            </Label>
                        </div>

                        {form.watch("isAdvance") ? (
                            <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 text-xs space-y-1.5">
                                <p className="font-semibold text-blue-800 dark:text-blue-300">✦ Advance Receipt — account heads to use:</p>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div className="bg-white dark:bg-blue-950/40 rounded p-2 border border-blue-100 dark:border-blue-800">
                                        <p className="font-bold text-blue-700 dark:text-blue-400">Row 1 — Credit</p>
                                        <p className="text-blue-900 dark:text-blue-200 font-mono">Customer Advance Account / Payable</p>
                                        <p className="text-muted-foreground mt-0.5">Records the liability of advance receipt</p>
                                    </div>
                                    <div className="bg-white dark:bg-blue-950/40 rounded p-2 border border-blue-100 dark:border-blue-800">
                                        <p className="font-bold text-blue-700 dark:text-blue-400">Row 2 — Debit</p>
                                        <p className="text-blue-900 dark:text-blue-200 font-mono">Bank / Cash account</p>
                                        <p className="text-muted-foreground mt-0.5">Money entering your bank or cash</p>
                                    </div>
                                </div>
                                <p className="text-muted-foreground pt-1">Leave invoices unchecked. This will be booked as a customer advance.</p>
                            </div>
                        ) : (
                            <div className="rounded-md bg-muted/40 border border-border p-3 text-xs space-y-1.5">
                                <p className="font-semibold text-foreground">✦ Regular Receipt — account heads to use:</p>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div className="bg-background rounded p-2 border border-border">
                                        <p className="font-bold">Row 1 — Credit</p>
                                        <p className="font-mono text-muted-foreground">Accounts Receivable (A/R) / Customers</p>
                                        <p className="text-muted-foreground mt-0.5">Clears the customer outstanding balance</p>
                                    </div>
                                    <div className="bg-background rounded p-2 border border-border">
                                        <p className="font-bold">Row 2 — Debit</p>
                                        <p className="font-mono text-muted-foreground">Bank / Cash account</p>
                                        <p className="text-muted-foreground mt-0.5">The received amount entering bank or cash</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">RV No</Label>
                            <Input {...form.register("rvNo")} disabled className="bg-muted font-medium" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">RV Date</Label>
                            <Controller control={form.control} name="rvDate" render={({ field }) => (
                                <DatePicker value={field.value ? field.value.toISOString().split('T')[0] : ""} onChange={(d) => field.onChange(new Date(d))} />
                            )} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Ref / Bill No.</Label>
                            <Input {...form.register("refBillNo")} placeholder="-" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Bill Date</Label>
                            <Controller control={form.control} name="billDate" render={({ field }) => (
                                <DatePicker value={field.value ? field.value.toISOString().split('T')[0] : ""} onChange={(d) => field.onChange(new Date(d))} />
                            )} />
                        </div>
                    </div>

                    {voucherType === "bank" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg border border-dashed border-primary/20">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase font-semibold">Cheque No</Label>
                                <Input {...form.register("chequeNo")} placeholder="Enter Cheque No" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase font-semibold">Cheque Date</Label>
                                <Controller control={form.control} name="chequeDate" render={({ field }) => (
                                    <DatePicker value={field.value ? field.value.toISOString().split('T')[0] : ""} onChange={(d) => field.onChange(new Date(d))} />
                                )} />
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 p-4 rounded-lg border border-dashed border-primary/20">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Customer <span className="font-normal normal-case">(optional)</span></Label>
                            <Controller control={form.control} name="customerId" render={({ field }) => (
                                <Autocomplete
                                    options={customers.map(c => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder={loadingCustomers ? "Loading customers..." : "Select Customer (Optional)"}
                                    disabled={loadingCustomers}
                                />
                            )} />
                        </div>

                        {selectedCustomerId && (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase font-semibold">
                                    Sales Invoices
                                    <span className="ml-2 font-normal normal-case text-muted-foreground">(check to receive payment — leave blank for advance receipt)</span>
                                </Label>

                                {pendingInvoices.length === 0 ? (
                                    <p className="text-xs text-amber-500 py-2">No pending invoices — receipt will be recorded as advance against this customer.</p>
                                ) : (
                                    <div className="rounded-lg border border-border overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted text-muted-foreground">
                                                <tr>
                                                    <th className="px-3 py-2 text-left w-8"></th>
                                                    <th className="px-3 py-2 text-left">Invoice No</th>
                                                    <th className="px-3 py-2 text-right">Total</th>
                                                    <th className="px-3 py-2 text-right">Paid</th>
                                                    <th className="px-3 py-2 text-right">Balance</th>
                                                    <th className="px-3 py-2 text-right w-36">Receiving Now</th>
                                                    <th className="px-3 py-2 text-center w-20">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {pendingInvoices.map((inv: any) => {
                                                    const entry = selectedInvoices.find(i => i.salesInvoiceId === inv.id);
                                                    const isChecked = !!entry;
                                                    const receivingNow = entry?.receivingNow ?? 0;
                                                    const willBeFullyPaid = isChecked && Math.abs(receivingNow - Number(inv.balanceAmount)) < 0.01;
                                                    return (
                                                        <tr key={inv.id} className={isChecked ? "bg-primary/5" : "hover:bg-muted/30"}>
                                                            <td className="px-3 py-2">
                                                                <Checkbox checked={isChecked} onCheckedChange={() => toggleInvoice(inv)} />
                                                            </td>
                                                            <td className="px-3 py-2 font-medium">{inv.invoiceNo}</td>
                                                            <td className="px-3 py-2 text-right tabular-nums">{Number(inv.grandTotal).toLocaleString()}</td>
                                                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{Number(inv.paidAmount).toLocaleString()}</td>
                                                            <td className="px-3 py-2 text-right tabular-nums font-semibold text-red-500">{Number(inv.balanceAmount).toLocaleString()}</td>
                                                            <td className="px-3 py-2">
                                                                <Input
                                                                    type="number" step="0.01" min={0} max={Number(inv.balanceAmount)}
                                                                    value={isChecked ? receivingNow : ""}
                                                                    disabled={!isChecked || Number(inv.balanceAmount) <= 0}
                                                                    onChange={e => updateReceivingNow(inv.id, Number(e.target.value))}
                                                                    className="h-8 text-right font-mono text-sm"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                {isChecked && (
                                                                    <Badge variant={willBeFullyPaid ? "default" : "secondary"} className="text-[10px]">
                                                                        {willBeFullyPaid ? "Full" : "Partial"}
                                                                    </Badge>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            {selectedInvoices.length > 0 && (
                                                <tfoot className="border-t border-border bg-muted/50 font-semibold text-sm">
                                                    <tr>
                                                        <td colSpan={5} className="px-3 py-2 text-right text-muted-foreground">Total invoice receipts:</td>
                                                        <td className={`px-3 py-2 text-right tabular-nums font-mono ${totalInvoiceReceipts > totalDebit + 0.01 ? "text-red-500" : "text-green-600"}`}>
                                                            {totalInvoiceReceipts.toLocaleString()}
                                                        </td>
                                                        <td />
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </table>
                                    </div>
                                )}

                                {totalInvoiceReceipts > totalDebit + 0.01 && (
                                    <p className="text-xs text-red-500 font-medium">
                                        ⚠ Invoice receipts ({totalInvoiceReceipts.toLocaleString()}) exceed voucher debit ({totalDebit.toLocaleString()}).
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-foreground">{voucherType === "bank" ? "Bank" : "Cash"} Receipt Voucher Detail</h2>
                                {form.watch("isAdvance") ? (
                                    <p className="text-xs text-muted-foreground mt-0.5">Debit: <span className="font-mono font-semibold">Bank / Cash account</span> &nbsp;|&nbsp; Credit: <span className="font-mono font-semibold">Customer Advance Account</span></p>
                                ) : (
                                    <p className="text-xs text-muted-foreground mt-0.5">Debit: <span className="font-mono font-semibold">Bank / Cash account</span> &nbsp;|&nbsp; Credit: <span className="font-mono font-semibold">A/R PARTIES</span></p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsImportModalOpen(true)}
                                    disabled={isPending}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Import Excel/CSV
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => append({ accountId: "", tagAccountId: "", debit: 0, credit: 0, narration: "", refBillNo: "", refBillNo2: "", taxType: "Taxable" as "Taxable" | "BTL" | "REIMB" })}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add More RV Rows
                                </Button>
                            </div>
                        </div>

                        {/* Filter Bar */}
                        {selectedAccountIds.length > 0 && (
                            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-dashed">
                                <span className="text-xs font-semibold text-muted-foreground uppercase">Filter by Account Head:</span>
                                <div className="w-[300px]">
                                    <Autocomplete
                                        options={filterOptions}
                                        value={filterAccountId}
                                        onValueChange={setFilterAccountId}
                                        placeholder="All Accounts"
                                        searchPlaceholder="Search selected accounts..."
                                    />
                                </div>
                                {filterAccountId && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setFilterAccountId("")}
                                        className="text-xs text-destructive hover:bg-destructive/10 h-9 px-3"
                                    >
                                        Clear Filter
                                    </Button>
                                )}
                            </div>
                        )}

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
                                    {fields.map((field, index) => {
                                        const detail = watchDetails[index] || {};
                                        const shouldHide = filterAccountId && detail.accountId && detail.accountId !== filterAccountId;
                                        return (
                                            <tr
                                                key={field.id}
                                                className={cn(
                                                    "hover:bg-gray-50/50 dark:hover:bg-muted/50 align-top",
                                                    shouldHide && "hidden"
                                                )}
                                            >
                                            <td className="px-4 py-3">
                                                <Controller
                                                    control={form.control}
                                                    name={`details.${index}.accountId`}
                                                    render={({ field }) => (
                                                        <ChartOfAccountSelect
                                                            id={`details-${index}-accountId`}
                                                            value={field.value}
                                                            onValueChange={(val) => {
                                                                field.onChange(val);
                                                                const t = getSharedTree();
                                                                if (t.length > 0) setTree([...t]);
                                                                setTimeout(() => {
                                                                    const nodes = t.length > 0 ? t : tree;
                                                                    const node = findInTree(nodes, val);
                                                                    const hasChildren = (node?.children?.length ?? 0) > 0;
                                                                    if (hasChildren) {
                                                                        document.getElementById(`details-${index}-tagAccountId`)?.focus();
                                                                    } else {
                                                                        document.getElementById(`details-${index}-narration`)?.focus();
                                                                    }
                                                                }, 50);
                                                            }}
                                                            placeholder="Select Account"
                                                            excludeTags={true}
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
                                                {(rowChildren[index]?.length ?? 0) > 0 && (
                                                    <div className="mt-1.5">
                                                        <Controller
                                                            control={form.control}
                                                            name={`details.${index}.tagAccountId`}
                                                            render={({ field }) => (
                                                                <TagAccountSelect
                                                                    id={`details-${index}-tagAccountId`}
                                                                    children={rowChildren[index]}
                                                                    value={field.value ?? ""}
                                                                    onValueChange={(val) => {
                                                                        field.onChange(val);
                                                                        setTimeout(() => {
                                                                            document.getElementById(`details-${index}-narration`)?.focus();
                                                                        }, 50);
                                                                    }}
                                                                    disabled={isPending}
                                                                />
                                                            )}
                                                        />
                                                    </div>
                                                )}
                                                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 border-t pt-2 border-gray-100 dark:border-muted/20">
                                                    <div className="sm:col-span-4">
                                                        <Input
                                                            id={`details-${index}-narration`}
                                                            placeholder="Line Narration (optional)"
                                                            {...form.register(`details.${index}.narration`)}
                                                            onKeyDown={(e) => handleKeyDown(e, index, 'narration')}
                                                            disabled={isPending}
                                                            className="h-8 text-xs border-gray-300 dark:border-input"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <Input
                                                            id={`details-${index}-refBillNo`}
                                                            placeholder="Ref 1"
                                                            {...form.register(`details.${index}.refBillNo`)}
                                                            onKeyDown={(e) => handleKeyDown(e, index, 'refBillNo')}
                                                            disabled={isPending}
                                                            className="h-8 text-xs border-gray-300 dark:border-input"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <Input
                                                            id={`details-${index}-refBillNo2`}
                                                            placeholder="Ref 2"
                                                            {...form.register(`details.${index}.refBillNo2`)}
                                                            onKeyDown={(e) => handleKeyDown(e, index, 'refBillNo2')}
                                                            disabled={isPending}
                                                            className="h-8 text-xs border-gray-300 dark:border-input"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-4 flex items-center gap-0.5 pl-1 select-none">
                                                        <Controller
                                                            control={form.control}
                                                            name={`details.${index}.taxType`}
                                                            render={({ field }) => (
                                                                <RadioGroup
                                                                    value={field.value ?? "Taxable"}
                                                                    onValueChange={field.onChange}
                                                                    disabled={isPending}
                                                                    className="flex gap-1"
                                                                >
                                                                    {(["Taxable", "BTL", "REIMB"] as const).map((opt) => (
                                                                        <Label
                                                                            key={opt}
                                                                            className={cn(
                                                                                "flex items-center gap-1 cursor-pointer px-2 py-1 rounded text-[11px] font-medium border transition-colors",
                                                                                field.value === opt
                                                                                    ? "bg-primary text-primary-foreground border-primary"
                                                                                    : "border-gray-300 dark:border-input text-muted-foreground hover:bg-accent"
                                                                            )}
                                                                        >
                                                                            <RadioGroupItem value={opt} className="sr-only" />
                                                                            {opt}
                                                                        </Label>
                                                                    ))}
                                                                </RadioGroup>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Input
                                                    id={`details-${index}-debit`}
                                                    type="number"
                                                    step="1"
                                                    placeholder="0"
                                                    {...form.register(`details.${index}.debit`, {
                                                        valueAsNumber: true,
                                                        onChange: (e) => {
                                                            const rawVal = Number(e.target.value) || 0;
                                                            const roundedVal = Math.round(rawVal);
                                                            if (rawVal !== roundedVal) {
                                                                form.setValue(`details.${index}.debit`, roundedVal, { shouldValidate: true });
                                                            }
                                                            if (roundedVal > 0) {
                                                                form.setValue(`details.${index}.credit`, 0, { shouldValidate: true });
                                                            }
                                                        }
                                                    })}
                                                    onKeyDown={(e) => handleKeyDown(e, index, 'debit')}
                                                    disabled={isPending}
                                                    className="h-10 border-gray-300 dark:border-input font-medium"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <Input
                                                    id={`details-${index}-credit`}
                                                    type="number"
                                                    step="1"
                                                    placeholder="0"
                                                    {...form.register(`details.${index}.credit`, {
                                                        valueAsNumber: true,
                                                        onChange: (e) => {
                                                            const rawVal = Number(e.target.value) || 0;
                                                            const roundedVal = Math.round(rawVal);
                                                            if (rawVal !== roundedVal) {
                                                                form.setValue(`details.${index}.credit`, roundedVal, { shouldValidate: true });
                                                            }
                                                            if (roundedVal > 0) {
                                                                form.setValue(`details.${index}.debit`, 0, { shouldValidate: true });
                                                            }
                                                        }
                                                    })}
                                                    onKeyDown={(e) => handleKeyDown(e, index, 'credit')}
                                                    disabled={isPending}
                                                    className="h-10 border-gray-300 dark:border-input font-medium"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {Number(watchDetails[index]?.credit) > 0 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Duplicate to Debit Row"
                                                            onClick={() => duplicateToDebit(index)}
                                                            disabled={isPending}
                                                            className="rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    )}
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
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })}
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

                    {/* Description */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase font-semibold">Description</Label>
                        <Textarea {...form.register("description")} placeholder="Enter description for this receipt voucher" />
                        {form.formState.errors.description && (
                            <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
                        )}
                    </div>

                    <div className="flex justify-center pt-6 border-t">
                        <Button type="submit" disabled={isPending || !isBalanced}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {initialData ? "Update Receipt Voucher" : "Create Receipt Voucher"}
                        </Button>
                    </div>

                    <VoucherImportModal
                        open={isImportModalOpen}
                        onOpenChange={setIsImportModalOpen}
                        voucherType="receipt"
                        onImportComplete={(importedRows) => {
                            replace(importedRows);
                            toast.success(`Successfully imported ${importedRows.length} rows.`);
                        }}
                    />
                </form>
            </CardContent>
        </Card>
    );
}