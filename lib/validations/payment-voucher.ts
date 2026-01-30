import { z } from "zod";

export const paymentVoucherDetailSchema = z.object({
    accountId: z.string().min(1, "Account is required"),
    debit: z.coerce.number().min(0).default(0),
});

export const paymentVoucherSchema = z.object({
    type: z.enum(["bank", "cash"]),
    isAdvance: z.boolean().default(false),
    pvNo: z.string().min(1, "PV Number is required"),
    pvDate: z.date({
        required_error: "PV Date is required",
    }),
    refBillNo: z.string().optional(),
    billDate: z.date().optional(),
    // Bank specific fields
    chequeNo: z.string().optional(),
    chequeDate: z.date().optional(),
    // Main credit account
    creditAccountId: z.string().min(1, "Credit Account is required"),
    creditAmount: z.coerce.number().min(0.01, "Amount must be greater than 0"),

    isTaxApplicable: z.boolean().default(false),
    description: z.string().min(1, "Description is required"),
    details: z.array(paymentVoucherDetailSchema).min(1, "At least one detail row is required"),
}).refine(data => {
    if (data.type === "bank") {
        return !!data.chequeNo && !!data.chequeDate;
    }
    return true;
}, {
    message: "Cheque details are required for Bank payments",
    path: ["chequeNo"],
}).refine(data => {
    const totalDebit = data.details.reduce((sum, item) => sum + item.debit, 0);
    return Math.abs(totalDebit - data.creditAmount) < 0.01;
}, {
    message: "Total Debits must equal Credit Amount",
    path: ["details"],
});

export type PaymentVoucherFormValues = z.infer<typeof paymentVoucherSchema>;
