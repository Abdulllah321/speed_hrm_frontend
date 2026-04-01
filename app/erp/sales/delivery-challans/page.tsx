"use client";

import { useState } from "react";
import { Plus, Search, Eye, FileText, Truck, CheckCircle } from "lucide-react";
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
const sampleChallans = [
  {
    id: "1",
    challanNo: "DC-001",
    salesOrder: "SO-001",
    customer: "ZAHID ASSOCIATES",
    challanDate: "2024-01-15",
    deliveryDate: "2024-01-16",
    status: "DELIVERED",
    driverName: "Ahmed Ali",
    vehicleNo: "ABC-123",
    totalQty: 150,
    totalAmount: 125000,
  },
  {
    id: "2",
    challanNo: "DC-002",
    salesOrder: "SO-002",
    customer: "NIZAM WATCH HOUSE",
    challanDate: "2024-01-16",
    deliveryDate: null,
    status: "PENDING",
    driverName: "Hassan Khan",
    vehicleNo: "XYZ-456",
    totalQty: 100,
    totalAmount: 85000,
  },
  {
    id: "3",
    challanNo: "DC-003",
    salesOrder: "SO-003",
    customer: "INTERNATIONAL WATCH CO",
    challanDate: "2024-01-17",
    deliveryDate: "2024-01-18",
    status: "INVOICED",
    driverName: "Muhammad Usman",
    vehicleNo: "DEF-789",
    totalQty: 200,
    totalAmount: 200000,
  },
];

const salesOrders = [
  { id: "1", orderNo: "SO-001", customer: "ZAHID ASSOCIATES" },
  { id: "2", orderNo: "SO-002", customer: "NIZAM WATCH HOUSE" },
  { id: "3", orderNo: "SO-004", customer: "GMT DISTRIBUTORS" },
];

export default function DeliveryChallansPage() {
  const [challans, setChallans] = useState(sampleChallans);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredChallans = challans.filter(
    (challan) =>
      challan.challanNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challan.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challan.salesOrder.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "INVOICED":
        return "bg-blue-100 text-blue-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Delivery Challans</h1>
          <p className="text-muted-foreground">
            Manage goods dispatch and delivery records
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Delivery Challan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Delivery Challan</DialogTitle>
              <DialogDescription>
                Create a delivery challan from a sales order
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Sales Order</Label>
                <Select>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select sales order" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.orderNo} - {order.customer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Driver Name</Label>
                <Input
                  className="col-span-3"
                  placeholder="Enter driver name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Vehicle No</Label>
                <Input
                  className="col-span-3"
                  placeholder="ABC-123"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Transport Mode</Label>
                <Select>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select transport mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SELF">Self Transport</SelectItem>
                    <SelectItem value="COURIER">Courier</SelectItem>
                    <SelectItem value="TRANSPORT">Transport Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Delivery Items</h4>
                <p className="text-sm text-muted-foreground">
                  Items from selected sales order will appear here with delivery quantities.
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Quantity:</span>
                    <span>0 items</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total Amount:</span>
                    <span>Rs. 0</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button>Create Challan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search challans..."
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
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="invoiced">Invoiced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Challan No</TableHead>
              <TableHead>Sales Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Challan Date</TableHead>
              <TableHead>Driver/Vehicle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredChallans.map((challan) => (
              <TableRow key={challan.id}>
                <TableCell className="font-medium">{challan.challanNo}</TableCell>
                <TableCell>{challan.salesOrder}</TableCell>
                <TableCell>{challan.customer}</TableCell>
                <TableCell>{challan.challanDate}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{challan.driverName}</div>
                    <div className="text-muted-foreground">{challan.vehicleNo}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(challan.status)}>
                    {challan.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-sm">
                    <div>Rs. {challan.totalAmount.toLocaleString()}</div>
                    <div className="text-muted-foreground">{challan.totalQty} items</div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" title="View">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {challan.status === "PENDING" && (
                      <Button variant="ghost" size="sm" title="Mark Delivered">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {challan.status === "DELIVERED" && (
                      <Button variant="ghost" size="sm" title="Create Invoice">
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}