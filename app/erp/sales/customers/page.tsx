"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Eye, Trash2, Upload, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { customerApi, Customer } from "@/lib/api";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { CustomerBulkUploadModal } from "@/components/customers/customer-bulk-upload-modal";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { queueCustomersExport } from "@/lib/actions/customers";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    traderId: "",
    subCode: "",
    name: "",
    company: "",
    brands: "",
    baseMargin: 0,
    cashMargin: 0,
    remarks: "",
    address: "",
    deliveryAddress: "",
    contactNo: "",
    email: "",
    cnicNo: "",
    ntn: "",
    strn: "",
  });

  // Load customers
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerApi.getAll(searchTerm);
      setCustomers(response.data);
    } catch (error) {
      toast.error("Failed to load customers");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Search customers
  useEffect(() => {
    const debounce = setTimeout(() => {
      loadCustomers();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const resetForm = () => {
    setFormData({
      traderId: "",
      subCode: "",
      name: "",
      company: "",
      brands: "",
      baseMargin: 0,
      cashMargin: 0,
      remarks: "",
      address: "",
      deliveryAddress: "",
      contactNo: "",
      email: "",
      cnicNo: "",
      ntn: "",
      strn: "",
    });
    setEditingCustomer(null);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      traderId: customer.traderId || "",
      subCode: customer.subCode || "",
      name: customer.name || "",
      company: customer.company || "",
      brands: customer.brands || "",
      baseMargin: customer.baseMargin || 0,
      cashMargin: customer.cashMargin || 0,
      remarks: customer.remarks || "",
      address: customer.address || "",
      deliveryAddress: customer.deliveryAddress || "",
      contactNo: customer.contactNo || "",
      email: customer.email || "",
      cnicNo: customer.cnicNo || "",
      ntn: customer.ntn || "",
      strn: customer.strn || "",
    });
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        name: formData.name || formData.company || "Unnamed Customer",
        baseMargin: Number(formData.baseMargin) || 0,
        cashMargin: Number(formData.cashMargin) || 0,
      };

      if (editingCustomer) {
        await customerApi.update(editingCustomer.id, payload);
        toast.success("Customer updated successfully");
      } else {
        await customerApi.create(payload);
        toast.success("Customer created successfully");
      }
      resetForm();
      setIsCreateOpen(false);
      loadCustomers();
    } catch (error: any) {
      const errMsg = error?.message || "Failed to save customer";
      toast.error(errMsg);
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      await customerApi.delete(id);
      toast.success("Customer deleted successfully");
      loadCustomers();
    } catch (error) {
      toast.error("Failed to delete customer");
      console.error(error);
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const result = await queueCustomersExport(searchTerm);
      if (result.status) {
        toast.success("Export queued — you'll get a notification when your file is ready.", {
          duration: 6000,
        });
      } else {
        toast.error(result.message || "Failed to queue export");
      }
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading customers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permissions="erp.sales.customer.read">
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customers & Traders</h1>
            <p className="text-muted-foreground">
              Manage trader profiles, base/cash margins, and customer accounts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isExporting || customers.length === 0}
              className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isExporting ? "Queuing…" : "Export"}
            </Button>
            <PermissionGuard permissions="erp.sales.customer.create" fallback={null}>
              <Dialog open={isCreateOpen} onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Trader / Customer
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>{editingCustomer ? "Edit Customer / Trader" : "Add New Customer / Trader"}</DialogTitle>
                      <DialogDescription>
                        Set up company details, margins, tax IDs, and addresses.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                      {/* Row 1: Trader ID & Sub Code */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="traderId">Trader ID (System Generated)</Label>
                          <Input
                            id="traderId"
                            value={formData.traderId}
                            onChange={(e) => setFormData({ ...formData, traderId: e.target.value })}
                            placeholder="Auto-generated if left empty"
                          />
                        </div>
                        <div>
                          <Label htmlFor="subCode">Sub Code</Label>
                          <Input
                            id="subCode"
                            value={formData.subCode}
                            onChange={(e) => setFormData({ ...formData, subCode: e.target.value })}
                            placeholder="e.g. 310001"
                          />
                        </div>
                      </div>

                      {/* Row 2: Customer/Company Name & Brands */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="name">Company / Customer Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value, company: e.target.value })}
                            placeholder="e.g. ZAHEER ASSOCIATES"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="brands">Brands</Label>
                          <Input
                            id="brands"
                            value={formData.brands}
                            onChange={(e) => setFormData({ ...formData, brands: e.target.value })}
                            placeholder="e.g. Nike / Under Armour"
                          />
                        </div>
                      </div>

                      {/* Row 3: Base Margin % & Cash Margin % */}
                      <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg border">
                        <div>
                          <Label htmlFor="baseMargin" className="text-primary font-bold">Base Margin (%)</Label>
                          <Input
                            id="baseMargin"
                            type="number"
                            step="0.01"
                            value={formData.baseMargin}
                            onChange={(e) => setFormData({ ...formData, baseMargin: parseFloat(e.target.value) || 0 })}
                            placeholder="e.g. 35"
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">Deducted from sales gross total</p>
                        </div>
                        <div>
                          <Label htmlFor="cashMargin" className="text-primary font-bold">Cash Margin (%)</Label>
                          <Input
                            id="cashMargin"
                            type="number"
                            step="0.01"
                            value={formData.cashMargin}
                            onChange={(e) => setFormData({ ...formData, cashMargin: parseFloat(e.target.value) || 0 })}
                            placeholder="e.g. 3"
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">Additional margin deduction</p>
                        </div>
                      </div>

                      {/* Row 4: Tax Numbers & CNIC */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="ntn">NTN (National Tax No)</Label>
                          <Input
                            id="ntn"
                            value={formData.ntn}
                            onChange={(e) => setFormData({ ...formData, ntn: e.target.value })}
                            placeholder="e.g. 1623094-9"
                          />
                        </div>
                        <div>
                          <Label htmlFor="strn">STRN / GST No</Label>
                          <Input
                            id="strn"
                            value={formData.strn}
                            onChange={(e) => setFormData({ ...formData, strn: e.target.value })}
                            placeholder="e.g. 32-77-8762-207-86"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cnicNo">CNIC</Label>
                          <Input
                            id="cnicNo"
                            value={formData.cnicNo}
                            onChange={(e) => setFormData({ ...formData, cnicNo: e.target.value })}
                            placeholder="CNIC No"
                          />
                        </div>
                      </div>

                      {/* Row 5: Contact & Email */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="contactNo">Contact No.</Label>
                          <Input
                            id="contactNo"
                            value={formData.contactNo}
                            onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                            placeholder="0300-855 2662"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="customer@example.com"
                          />
                        </div>
                      </div>

                      {/* Row 6: Address & Delivery Address */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="address">Address</Label>
                          <Textarea
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Main office/shop address"
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="deliveryAddress">Delivery Address</Label>
                          <Textarea
                            id="deliveryAddress"
                            value={formData.deliveryAddress}
                            onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                            placeholder="Warehouse / delivery address"
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Row 7: Remarks */}
                      <div>
                        <Label htmlFor="remarks">Remarks</Label>
                        <Input
                          id="remarks"
                          value={formData.remarks}
                          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                          placeholder="e.g. On Both / On All"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                      <Button type="submit">{editingCustomer ? "Update Customer" : "Create Customer"}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </PermissionGuard>

            <PermissionGuard permissions="erp.sales.customer.create" fallback={null}>
              <Button onClick={() => setBulkOpen(true)} variant={"outline"} >
                <Upload className="mr-2 h-4 w-4" />
                Bulk Import
              </Button>
              <CustomerBulkUploadModal
                open={bulkOpen}
                onOpenChange={setBulkOpen}
                onSuccess={loadCustomers}
              />
            </PermissionGuard>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, sub code, trader ID, brands, NTN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trader / Sub Code</TableHead>
                <TableHead>Customer / Company</TableHead>
                <TableHead>Brands</TableHead>
                <TableHead className="text-center">Base Margin</TableHead>
                <TableHead className="text-center">Cash Margin</TableHead>
                <TableHead>Tax IDs (NTN / STRN)</TableHead>
                <TableHead>Contact & Address</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm
                        ? "No customers found matching your search."
                        : "No customers found. Create your first customer."}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-mono text-xs">
                      {customer.subCode || "—"}
                      {customer.traderId && (
                        <div className="text-[11px] text-muted-foreground font-sans">ID: {customer.traderId}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {customer.name}
                      {customer.company && customer.company !== customer.name && (
                        <div className="text-xs font-normal text-muted-foreground">{customer.company}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {customer.brands || "—"}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-emerald-600">
                      {Number(customer.baseMargin || 0)}%
                    </TableCell>
                    <TableCell className="text-center font-semibold text-blue-600">
                      {Number(customer.cashMargin || 0)}%
                    </TableCell>
                    <TableCell className="text-xs">
                      {customer.ntn && <div>NTN: {customer.ntn}</div>}
                      {customer.strn && <div>STRN: {customer.strn}</div>}
                      {!customer.ntn && !customer.strn && "—"}
                    </TableCell>
                    <TableCell className="text-xs max-w-xs truncate">
                      <div>{customer.contactNo || customer.email || "—"}</div>
                      <div className="text-muted-foreground truncate">{customer.address || "—"}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span
                        className={
                          (customer.balance || 0) > 0 ? "text-red-600" : "text-green-600"
                        }
                      >
                        {formatCurrency(customer.balance || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(customer)}>
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDelete(customer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PermissionGuard>
  );
}
