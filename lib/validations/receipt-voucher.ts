import { z } from "zod";

export const receiptVoucherDetailSchema = z.object({
    accountId: z.string().min(1, "Account is required"),
    credit: z.coerce.number().min(0).default(0),
});

export const receiptVoucherSchema = z.object({
    type: z.enum(["bank", "cash"]),
    rvNo: z.string().min(1, "RV Number is required"),
    rvDate: z.date(),
    refBillNo: z.string().optional(),
    billDate: z.date().optional(),
    // Bank specific fields
    chequeNo: z.string().optional(),
    chequeDate: z.date().optional(),

    // Main debit account (where money is coming in)
    debitAccountId: z.string().min(1, "Debit Account is required"),
    debitAmount: z.coerce.number().min(0.01, "Amount must be greater than 0"),

    description: z.string().min(1, "Description is required"),
    details: z.array(receiptVoucherDetailSchema).min(1, "At least one detail row is required"),
}).refine(data => {
    if (data.type === "bank") {
        return !!data.chequeNo && !!data.chequeDate;
    }
    return true;
}, {
    message: "Cheque details are required for Bank receipts",
    path: ["chequeNo"],
}).refine(data => {
    const totalCredit = data.details.reduce((sum, item) => sum + item.credit, 0);
    return Math.abs(totalCredit - data.debitAmount) < 0.01;
}, {
    message: "Total Credits must equal Debit Amount",
    path: ["details"],
});

export type ReceiptVoucherFormValues = z.infer<typeof receiptVoucherSchema>;
