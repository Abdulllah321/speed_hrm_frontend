"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createCustomer, getCustomers, type Customer, deleteCustomer, updateCustomer } from "@/lib/actions/customer";
import DataTable from "@/components/common/data-table";
import { columns, type CustomerRow } from "./columns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FormValues {
  code: string;
  name: string;
  address?: string;
  contactNo?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Customer | null>(null);
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { code: "", name: "", address: "", contactNo: "" },
  });

  useEffect(() => {
    getCustomers().then((data) => {
      setCustomers(Array.isArray(data) ? data : []);
    });
  }, []);

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const res = await createCustomer(data);
      if (res?.status) {
        toast.success("Customer created");
        reset();
        const list = await getCustomers();
        setCustomers(Array.isArray(list) ? list : []);
      } else {
        toast.error(res?.message || "Failed");
      }
    });
  };

  const reload = async () => {
    const list = await getCustomers();
    setCustomers(Array.isArray(list) ? list : []);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteCustomer(id);
      if (res?.status) {
        await reload();
      } else {
        toast.error(res?.message || "Delete failed");
      }
    });
  };

  const handleMultiDelete = (ids: string[]) => {
    startTransition(async () => {
      await Promise.all(ids.map((id) => deleteCustomer(id)));
      await reload();
    });
  };

  const handleRowEdit = (item: CustomerRow) => {
    setEditItem(item);
    setEditOpen(true);
  };

  const submitRowEdit = async () => {
    if (!editItem) return;
    startTransition(async () => {
      const { id, code, name, address, contactNo } = editItem;
      const res = await updateCustomer(id, { code, name, address, contactNo });
      if (res?.status) {
        toast.success("Customer updated");
        setEditOpen(false);
        await reload();
      } else {
        toast.error(res?.message || "Update failed");
      }
    });
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
      </div>
      <div className="grid gap-4 grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Setup Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-12 gap-4">
              <div className="col-span-3 space-y-2">
                <Label>Code</Label>
                <Input {...register("code", { required: true })} placeholder="Code" />
              </div>
              <div className="col-span-3 space-y-2">
                <Label>Name of Customer</Label>
                <Input {...register("name", { required: true })} placeholder="Name of Customer" />
              </div>
              <div className="col-span-4 space-y-2">
                <Label>Address</Label>
                <Input {...register("address")} placeholder="Address" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Contact No.</Label>
                <Input {...register("contactNo")} placeholder="Contact No." />
              </div>
              <div className="col-span-12">
                <Button type="submit" disabled={isPending}>Submit</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customers List</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable<CustomerRow>
              columns={columns}
              data={customers.map((c) => ({ ...c, id: c.id.toString() }))}
              searchFields={[
                { key: "code", label: "Code" },
                { key: "name", label: "Name of Customer" },
              ]}
              onRowDelete={(item) => handleDelete(item.id)}
              onRowEdit={handleRowEdit}
              onMultiDelete={handleMultiDelete}
              tableId="customers-list"
            />
          </CardContent>
        </Card>
      </div>
      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update customer details</DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="grid grid-cols-2 gap-3 py-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={editItem.code}
                  onChange={(e) =>
                    setEditItem({ ...editItem, code: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Name of Customer</Label>
                <Input
                  value={editItem.name}
                  onChange={(e) =>
                    setEditItem({ ...editItem, name: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Input
                  value={editItem.address || ""}
                  onChange={(e) =>
                    setEditItem({ ...editItem, address: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Contact No.</Label>
                <Input
                  value={editItem.contactNo || ""}
                  onChange={(e) =>
                    setEditItem({ ...editItem, contactNo: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitRowEdit} disabled={isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
