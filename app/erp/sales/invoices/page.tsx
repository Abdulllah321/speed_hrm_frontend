"use client";

import { useState } from "react";
import { Plus, Search, Eye, Download, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Sample data
const sampleInvoices = [
  {
    id: "1",
    invoiceNo: "INV-001",
    salesOrder: "SO-001",
    deliveryChallan: "DC-001",
    customer: "ZAHID ASSOCIATES",
    invoiceDate: "2024-01-16",
    dueDate: "2024-02-15",
    status: "PAID",
    subtotal: 119048,
    taxAmount: 5952,
    grandTotal: 125000,
    paidAmount: 125000,
    balanceAmount: 0,
  },
  {
    id: "2",
    invoiceNo: "INV-002",
    salesOrder: "SO-002",
    deliveryChallan: "DC-002",
    customer: "NIZAM WATCH HOUSE",
    invoiceDate: "2024-01-17",
    dueDate: "2024-02-16",
    status: "PENDING",
    subtotal: 80952,
    taxAmount: 4048,
    grandTotal: 85000,
    paidAmount: 0,
    balanceAmount: 85000,
  },
  {
    id: "3",
    invoiceNo: "INV-003",
    salesOrder: "SO-003",
    deliveryChallan: "DC-003",
    customer: "INTERNATIONAL WATCH CO",
    invoiceDate: "2024-01-18",
    dueDate: "2024-02-17",
    status: "PARTIAL",
    subtotal: 190476,
    taxAmount: 9524,
    grandTotal: 200000,
    paidAmount: 100000,
    balanceAmount: 100000,
  },
];

const deliveryChallans = [
  { id: "1", challanNo: "DC-001", customer: "ZAHID ASSOCIATES", status: "DELIVERED" },
  { id: "2", challanNo: "DC-002", customer: "NIZAM WATCH HOUSE", status: "DELIVERED" },
  { id: "3", challanNo: "DC-004", customer: "GMT DISTRIBUTORS", status: "DELIVERED" },
];

export default function SalesInvoicesPage() {
  const [invoices, setInvoices] = useState(sampleInvoices);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.salesOrder.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-red-100 text-red-800";
      case "PARTIAL":
        return "bg-yellow-100 text-yellow-800";
      case "PAID":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatus = (invoice: any) => {
    if (invoice.balanceAmount === 0) return "Paid";
    if (invoice.paidAmount > 0) return "Partial";
    return "Pending";
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Invoices</h1>
          <p className="text-muted-foreground">
            Manage sales invoices and billing
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Sales Invoice</DialogTitle>
              <DialogDescription>
                Create an invoice from a delivered challan
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Delivery Challan</Label>
                <Select>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select delivery challan" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryChallans.map((challan) => (
                      <SelectItem key={challan.id} value={challan.id}>
                        {challan.challanNo} - {challan.customer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Due Date</Label>
                <Input
                  type="date"
                  className="col-span-3"
                  defaultValue={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />
              </div>
              <div className="col-span-4 p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Invoice Items</h4>
                <p className="text-sm text-muted-foreground">
                  Items from selected delivery challan will appear here.
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>Rs. 0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (5%):</span>
                    <span>Rs. 0</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Grand Total:</span>
                    <span>Rs. 0</span>
                  </div>
                </div>
              </div>
              <div className="col-span-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Important:</p>
                    <p>Creating this invoice will:</p>
                    <ul className="mt-1 ml-4 list-disc">
                      <li>Deduct stock from inventory</li>
                      <li>Create accounting entries (Receivable Dr, Sales Cr)</li>
                      <li>Update customer balance</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button>Create Invoice</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.invoiceNo}</TableCell>
                <TableCell>{invoice.customer}</TableCell>
                <TableCell>{invoice.invoiceDate}</TableCell>
                <TableCell>{invoice.dueDate}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(invoice.status)}>
                    {getPaymentStatus(invoice)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  Rs. {invoice.grandTotal.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <span className={invoice.balanceAmount > 0 ? "text-red-600" : "text-green-600"}>
                    Rs. {invoice.balanceAmount.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" title="View">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Download PDF">
                      <Download className="h-4 w-4" />
                    </Button>
                    {invoice.balanceAmount > 0 && (
                      <Button variant="ghost" size="sm" title="Record Payment">
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">Total Invoices</div>
          <div className="text-2xl font-bold">{invoices.length}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">Total Amount</div>
          <div className="text-2xl font-bold">
            Rs. {invoices.reduce((sum, inv) => sum + inv.grandTotal, 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">Outstanding</div>
          <div className="text-2xl font-bold text-red-600">
            Rs. {invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">Collected</div>
          <div className="text-2xl font-bold text-green-600">
            Rs. {invoices.reduce((sum, inv) => sum + inv.paidAmount, 0).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}