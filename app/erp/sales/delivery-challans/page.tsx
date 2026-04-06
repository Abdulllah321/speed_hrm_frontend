"use client";

import { useState, useEffect } from "react";
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
import { deliveryChallanApi, salesOrderApi } from "@/lib/api";
import { toast } from "sonner";

// Sample data - Remove this dummy data
const sampleChallans: any[] = []; // Empty array instead of dummy data

export default function DeliveryChallansPage() {
  const [challans, setChallans] = useState(sampleChallans);
  const [salesOrders, setSalesOrders] = useState<any[]>([]); // Add state for sales orders
  const [selectedOrder, setSelectedOrder] = useState<any>(null); // Add state for selected order
  const [deliveryItems, setDeliveryItems] = useState<any[]>([]); // Add state for delivery items
  const [formData, setFormData] = useState({
    driverName: '',
    vehicleNo: '',
    transportMode: ''
  }); // Add form state
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false); // Add loading state for create button

  // Load data on component mount
  useEffect(() => {
    loadChallans();
    loadSalesOrders();
  }, []);

  const loadChallans = async () => {
    try {
      setLoading(true);
      const response = await deliveryChallanApi.getAll();
      console.log('Challans API response:', response); // Debug log
      
      // Handle both array and object response formats
      const challansData = Array.isArray(response) ? response : (response.data || response);
      console.log('Challans data:', challansData); // Debug log
      console.log('Challans data type:', typeof challansData, 'Is array:', Array.isArray(challansData)); // Debug log
      
      if (Array.isArray(challansData)) {
        setChallans(challansData);
        console.log('Set challans to:', challansData.length, 'items'); // Debug log
      } else {
        console.error('Challans data is not an array:', challansData);
        setChallans([]);
      }
    } catch (error) {
      toast.error("Failed to load delivery challans");
      console.error('Load challans error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSalesOrders = async () => {
    try {
      const response = await salesOrderApi.getAll();
      console.log('Sales orders API response:', response); // Debug log
      
      // Filter only confirmed sales orders that can be delivered
      const confirmedOrders = response.data?.filter((order: any) => 
        order.status === 'CONFIRMED' || order.status === 'PARTIALLY_DELIVERED'
      ) || [];
      setSalesOrders(confirmedOrders);
      console.log('Sales orders loaded:', confirmedOrders); // Debug log
    } catch (error) {
      toast.error("Failed to load sales orders");
      console.error('Load sales orders error:', error);
    }
  };

  const handleOrderSelection = async (orderId: string) => {
    try {
      const order = salesOrders.find(o => o.id === orderId);
      setSelectedOrder(order);
      
      if (order && order.items) {
        // Set delivery items with default delivery quantities
        const items = order.items.map((item: any) => ({
          ...item,
          deliveredQty: item.quantity, // Default to full quantity
        }));
        setDeliveryItems(items);
        console.log('Order items loaded:', items); // Debug log
      }
    } catch (error) {
      toast.error("Failed to load order details");
      console.error(error);
    }
  };

  // Calculate totals
  const totalQuantity = deliveryItems.reduce((sum, item) => sum + (item.deliveredQty || 0), 0);
  const totalAmount = deliveryItems.reduce((sum, item) => sum + ((item.deliveredQty || 0) * (item.salePrice || 0)), 0);

  const handleCreateChallan = async () => {
    try {
      setCreateLoading(true);
      
      if (!selectedOrder) {
        toast.error("Please select a sales order");
        return;
      }

      if (!formData.driverName || !formData.vehicleNo) {
        toast.error("Please fill in driver name and vehicle number");
        return;
      }

      if (deliveryItems.length === 0) {
        toast.error("No items to deliver");
        return;
      }

      const challanData = {
        salesOrderId: selectedOrder.id,
        driverName: formData.driverName,
        vehicleNo: formData.vehicleNo,
        transportMode: formData.transportMode || 'ROAD',
        items: deliveryItems.map(item => ({
          itemId: item.itemId,
          deliveredQty: Number(item.deliveredQty),
          salePrice: Number(item.salePrice)
        }))
      };

      console.log('Creating challan with data:', challanData); // Debug log
      console.log('Items data types:', challanData.items.map(item => ({
        itemId: typeof item.itemId,
        deliveredQty: typeof item.deliveredQty,
        salePrice: typeof item.salePrice
      }))); // Debug log

      const createResponse = await deliveryChallanApi.create(challanData);
      console.log('Create challan response:', createResponse); // Debug log
      
      toast.success("Delivery challan created successfully");
      
      // Reset form and close dialog
      setSelectedOrder(null);
      setDeliveryItems([]);
      setFormData({ driverName: '', vehicleNo: '', transportMode: '' });
      setIsCreateOpen(false);
      
      // Reload challans
      console.log('Reloading challans after creation...'); // Debug log
      await loadChallans();
      console.log('Challans reloaded successfully'); // Debug log
    } catch (error) {
      toast.error("Failed to create delivery challan");
      console.error('Create challan error:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredChallans = challans.filter(
    (challan) =>
      challan.challanNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (challan.customer?.name || challan.customer)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (challan.salesOrder?.orderNo || challan.salesOrder)?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('Current challans state:', challans); // Debug log
  console.log('Filtered challans:', filteredChallans); // Debug log

  const handleCancelChallan = async (challanId: string) => {
    try {
      if (!confirm('Are you sure you want to cancel this delivery challan? This will restore the inventory.')) {
        return;
      }

      await deliveryChallanApi.cancel(challanId);
      toast.success("Delivery challan cancelled successfully");
      
      // Reload challans
      loadChallans();
    } catch (error) {
      toast.error("Failed to cancel delivery challan");
      console.error('Cancel challan error:', error);
    }
  };

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
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Delivery Challan</DialogTitle>
              <DialogDescription>
                Create a delivery challan from a sales order
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Sales Order</Label>
                <Select onValueChange={handleOrderSelection}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select sales order" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.orderNo} - {order.customer?.name || order.customer}
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
                  value={formData.driverName}
                  onChange={(e) => setFormData(prev => ({ ...prev, driverName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Vehicle No</Label>
                <Input
                  className="col-span-3"
                  placeholder="ABC-123"
                  value={formData.vehicleNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicleNo: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Transport Mode</Label>
                <Select onValueChange={(value) => setFormData(prev => ({ ...prev, transportMode: value }))}>
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
                <h4 className="font-medium mb-4">Delivery Items</h4>
                
                {deliveryItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="mb-2">📦</div>
                    <p>Select a sales order to view items</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliveryItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {item.item?.sku || item.itemId}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.item?.description || 'No description'}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            Unit Price: Rs. {(item.salePrice || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">Qty: {item.deliveredQty}</div>
                          <div className="text-sm text-muted-foreground">
                            Total: Rs. {((item.deliveredQty || 0) * (item.salePrice || 0)).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {deliveryItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Total Quantity:</span>
                      <span className="font-medium">{totalQuantity} items</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Amount:</span>
                      <span className="text-green-600">Rs. {totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateChallan} disabled={createLoading}>
                {createLoading ? "Creating..." : "Create Challan"}
              </Button>
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading delivery challans...
                </TableCell>
              </TableRow>
            ) : filteredChallans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="text-muted-foreground">
                    <div className="mb-2">📦</div>
                    <p>No delivery challans found</p>
                    {searchTerm && <p className="text-sm">Try adjusting your search terms</p>}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredChallans.map((challan) => (
                <TableRow key={challan.id}>
                  <TableCell className="font-medium">{challan.challanNo || 'N/A'}</TableCell>
                  <TableCell>{challan.salesOrder?.orderNo || challan.salesOrder || 'N/A'}</TableCell>
                  <TableCell>{challan.customer?.name || challan.customer || 'N/A'}</TableCell>
                  <TableCell>
                    {challan.challanDate 
                      ? new Date(challan.challanDate).toLocaleDateString() 
                      : challan.createdAt 
                        ? new Date(challan.createdAt).toLocaleDateString()
                        : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{challan.driverName || 'N/A'}</div>
                      <div className="text-muted-foreground">{challan.vehicleNo || 'N/A'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(challan.status || 'PENDING')}>
                      {challan.status || 'PENDING'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm">
                      <div>Rs. {(challan.totalAmount || 0).toLocaleString()}</div>
                      <div className="text-muted-foreground">{challan.totalQty || 0} items</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" title="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {challan.status === "PENDING" && (
                        <>
                          <Button variant="ghost" size="sm" title="Mark Delivered">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Cancel Challan"
                            onClick={() => handleCancelChallan(challan.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <span className="text-xs">✕</span>
                          </Button>
                        </>
                      )}
                      {challan.status === "DELIVERED" && (
                        <Button variant="ghost" size="sm" title="Create Invoice">
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}