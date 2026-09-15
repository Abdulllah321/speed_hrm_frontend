"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Filter, Trash2, Package, Info, FileSpreadsheet, Warehouse as WarehouseIcon } from "lucide-react";
import { SalesOrderBulkItemUploadModal } from "@/components/sales/sales-order-bulk-item-upload-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { salesOrderApi, customerApi, warehouseApi, inventoryApi, brandApi, categoryApi, Customer } from "@/lib/api";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface SelectedItem {
  id: string;
  sku: string;
  description: string;
  costPrice: number;
  salePrice: number;
  quantity: number;
  discount: number;
  total: number;
  availableStock: number;
  taxRate: number;
}

export default function CreateSalesOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Create Order Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
  };

  // Item Selection State
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [itemOptions, setItemOptions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState("");

  // Filter State
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<{
    brandIds: string[];
    categoryIds: string[];
  }>({ brandIds: [], categoryIds: [] });

  // Bulk upload state
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Handle bulk import
  const handleBulkImportComplete = (importedItems: any[]) => {
    let addedCount = 0;
    let skippedCount = 0;
    importedItems.forEach((importItem) => {
      const alreadyExists = selectedItems.some((s) => s.id === importItem.id);
      if (alreadyExists) {
        skippedCount++;
        return;
      }
      const newItem: SelectedItem = {
        id: importItem.id,
        sku: importItem.sku,
        description: importItem.description,
        costPrice: importItem.salePrice || 0,
        salePrice: importItem.salePrice || 0,
        quantity: importItem.quantity,
        discount: 0,
        total: importItem.salePrice * importItem.quantity || 0,
        availableStock: importItem.availableStock,
        taxRate: importItem.taxRate || 0,
      };
      setSelectedItems((prev) => [...prev, newItem]);
      addedCount++;
    });
    if (skippedCount > 0) {
      toast.info(addedCount + ' item(s) added. ' + skippedCount + ' duplicate(s) skipped.');
    }
  };

  // Load data
  useEffect(() => {
    loadCustomers();
    loadWarehouses();
    loadFilterData();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await customerApi.getAll();
      setCustomers(response.data);
    } catch (error) {
      console.error("Failed to load customers:", error);
    }
  };

  const loadWarehouses = async () => {
    try {
      const response = await warehouseApi.getAll();
      setWarehouses(response);
      if (response && response.length > 0) {
        const logisticWh = response.find((w: any) =>
          w.name?.toLowerCase().includes('logistic') ||
          w.code?.toLowerCase().includes('logistic') ||
          w.code === 'C40001'
        );
        setSelectedWarehouseId(logisticWh ? logisticWh.id : response[0].id);
      }
    } catch (error) {
      console.error("Failed to load warehouses:", error);
    }
  };

  const loadFilterData = async () => {
    try {
      const [brandsRes, catsRes] = await Promise.allSettled([
        brandApi.getAll(),
        categoryApi.getAll(),
      ]);

      if (brandsRes.status === 'fulfilled' && brandsRes.value.status) {
        setBrands(brandsRes.value.data);
      }
      if (catsRes.status === 'fulfilled' && catsRes.value.status) {
        setCategories(catsRes.value.data);
      }
    } catch (error) {
      console.error("Failed to load filter data:", error);
    }
  };

  // Search items
  const searchItems = async (query: string) => {
    if ((!query || query.length < 2) && appliedFilters.brandIds.length === 0 && appliedFilters.categoryIds.length === 0) {
      setItemOptions([]);
      return;
    }

    if (!selectedWarehouseId) {
      toast.error("Please select a warehouse first");
      return;
    }

    setSearchLoading(true);
    try {
      const res = await inventoryApi.search(query, selectedWarehouseId, undefined, appliedFilters);
      if (res.status && res.data) {
        const options = res.data.map((item: any) => ({
          value: item.id,
          label: `${item.sku} - ${item.description}`,
          description: `Available: ${item.totalQuantity || 0} | Cost: Rs. ${item.unitCost || 0}`,
          item: {
            ...item,
            availableStock: item.totalQuantity || 0,
            costPrice: item.unitCost || 0,
          }
        }));
        setItemOptions(options);
        if (!isPopoverOpen) setIsPopoverOpen(true);
      }
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Add item to order
  const addItem = (itemData: any) => {
    const isSelected = selectedItems.find(i => i.id === itemData.id);
    if (isSelected) {
      // If already selected, don't add again but show message
      toast.warning("Item already added to order");
      return;
    }

    const newItem: SelectedItem = {
      id: itemData.id,
      sku: itemData.sku,
      description: itemData.description,
      costPrice: itemData.unitPrice || 0,
      salePrice: itemData.unitPrice || 0,
      quantity: 1,
      discount: 0,
      total: itemData.unitPrice || 0,
      availableStock: itemData.availableStock,
      taxRate: Number(itemData.taxRate1 || 0),
    };

    setSelectedItems(prev => [...prev, newItem]);
    // Don't close popover to allow multiple selections
    // setItemSearchQuery("");
    // setIsPopoverOpen(false);
  };

  // Update item
  const updateItem = (id: string, field: keyof SelectedItem, value: number) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Remove item
  const removeItem = (id: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id));
  };

  // Calculate simple order totals (Retail Price * Quantity)
  const totalQuantity = selectedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalAmount = selectedItems.reduce((sum, item) => sum + ((Number(item.salePrice) || 0) * (Number(item.quantity) || 0)), 0);

  // Item search
  useEffect(() => {
    const debounce = setTimeout(() => {
      searchItems(itemSearchQuery);
    }, 300);
    return () => clearTimeout(debounce);
  }, [itemSearchQuery, selectedWarehouseId, appliedFilters]);

  const handleCreateOrder = async () => {
    if (!selectedCustomerId || !selectedWarehouseId || selectedItems.length === 0) {
      toast.error("Please fill all required fields and add at least one item");
      return;
    }

    try {
      setLoading(true);
      const orderData = {
        customerId: selectedCustomerId,
        warehouseId: selectedWarehouseId,
        items: selectedItems.map(item => ({
          itemId: item.id,
          quantity: item.quantity,
          salePrice: item.salePrice,
          discount: 0,
        })),
      };

      await salesOrderApi.create(orderData);
      toast.success("Sales order created successfully");
      router.push("/erp/sales/orders");
    } catch (error) {
      toast.error("Failed to create sales order");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <Link href="/erp/sales/orders" transitionTypes={["nav-back"]}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create Sales Order</h1>
            <p className="text-muted-foreground">
              Create a new sales order for a customer
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/erp/sales/orders" transitionTypes={["nav-back"]}>
              Cancel
            </Link>
          </Button>
          <Button onClick={handleCreateOrder} disabled={selectedItems.length === 0 || loading}>
            {loading ? "Creating..." : "Create Order"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Customer & Warehouse Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select value={selectedCustomerId} onValueChange={handleCustomerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} (Trader ID: {customer.traderId || 'N/A'}{customer.subCode ? ` | Sub: ${customer.subCode}` : ''})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Warehouse *</Label>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                    Fixed: Logistic Area
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-muted/60 border rounded-md text-sm font-semibold text-gray-800">
                  <WarehouseIcon className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                  <span>
                    {warehouses.find((w) => w.id === selectedWarehouseId)?.name || 'LOGISTIC AREA'} ({warehouses.find((w) => w.id === selectedWarehouseId)?.code || 'C40001'})
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Item Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Add Items
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedItems.length} Items Selected</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!selectedWarehouseId) {
                      toast.error("Please select a warehouse first before bulk uploading.");
                      return;
                    }
                    setIsBulkUploadOpen(true);
                  }}
                  className="text-violet-700 border-violet-200 hover:bg-violet-50"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFilterOpen(true)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {(appliedFilters.brandIds.length + appliedFilters.categoryIds.length) > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {appliedFilters.brandIds.length + appliedFilters.categoryIds.length}
                    </Badge>
                  )}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
              <Label className="text-sm font-semibold mb-3 block">Search & Multi-Select Items</Label>
              <div className="space-y-3">
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Type SKU or description to search items..."
                        value={itemSearchQuery}
                        onChange={(e) => setItemSearchQuery(e.target.value)}
                        onFocus={() => itemSearchQuery.length >= 2 && setIsPopoverOpen(true)}
                        className="pl-10 h-10 border-primary/20 focus-visible:ring-primary shadow-sm"
                        disabled={!selectedWarehouseId}
                      />
                      {searchLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        </div>
                      )}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[600px] p-0 shadow-xl" align="start">
                    <Command shouldFilter={false}>
                      <CommandList className="max-h-[400px]">
                        {itemOptions.length === 0 ? (
                          <div className="py-6 px-4 text-center space-y-1">
                            {searchLoading ? (
                              <p className="text-sm text-muted-foreground">Searching...</p>
                            ) : itemSearchQuery.length > 0 ? (
                              <>
                                <p className="text-sm font-medium text-muted-foreground">No items match "{itemSearchQuery}"</p>
                                <p className="text-xs text-muted-foreground">Try a different SKU or description.</p>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                {!selectedWarehouseId ? "Please select a warehouse first" : "Type at least 2 characters to search items"}
                              </p>
                            )}
                          </div>
                        ) : (
                          <CommandGroup>
                            <div className="flex items-center justify-between px-3 py-2 border-b border-muted/50">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search Results</span>
                                <span className="text-xs text-muted-foreground">({itemOptions.length})</span>
                              </div>
                              <button
                                type="button"
                                className="text-xs text-primary underline underline-offset-2 hover:text-primary/70 transition-colors"
                                onClick={() => {
                                  const unselected = itemOptions
                                    .map((o: any) => o.item)
                                    .filter((item: any) => !selectedItems.some(s => s.id === item.id));
                                  unselected.forEach((item: any) => addItem(item));
                                }}
                              >
                                Select all
                              </button>
                            </div>
                            <ScrollArea className="h-[350px]">
                              {itemOptions.map((option) => {
                                const item = (option as any).item;
                                const isSelected = selectedItems.some(i => i.id === item.id);
                                return (
                                  <CommandItem
                                    key={item.id}
                                    value={`${item.sku} ${item.description}`}
                                    onSelect={() => addItem(item)}
                                    className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer transition-all duration-200 border-b border-muted/50 last:border-0 ${
                                      isSelected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-accent"
                                    }`}
                                  >
                                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border leading-none font-bold ${
                                          isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-muted-foreground/20"
                                        }`}>
                                          {item.sku}
                                        </span>
                                        <span className={`truncate text-sm ${
                                          isSelected ? "font-bold text-primary" : "font-medium"
                                        }`}>
                                          {item.description}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                          <Package className="h-3 w-3" />
                                          Stock: <span className={`font-bold ${item.availableStock > 0 ? "text-foreground" : "text-destructive"}`}>{item.availableStock}</span>
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                          Price: {formatCurrency(item.unitPrice || 0)}
                                        </span>
                                        {isSelected && (
                                          <Badge variant="outline" className="h-4 text-[9px] px-1 bg-primary/5 text-primary border-primary/20">Added</Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="shrink-0 flex items-center justify-center w-8">
                                      {isSelected ? (
                                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                          <div className="h-2 w-2 bg-white rounded-full"></div>
                                        </div>
                                      ) : (
                                        <Plus className="h-4 w-4 text-muted-foreground opacity-50" />
                                      )}
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </ScrollArea>
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-primary/5 p-2 rounded border border-primary/5">
                  <div className="flex items-center gap-2 text-primary font-medium italic">
                    <Info className="h-3 w-3" />
                    <span>Click items in the list to add them. Popover stays open for multiple selections.</span>
                  </div>
                  <div className="font-semibold">
                    {selectedItems.length} items selected
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Selected Items */}
        {selectedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Selected Items ({selectedItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-xs">
                      <TableHead className="w-[45%]">Item</TableHead>
                      <TableHead className="w-[20%]">Retail Price</TableHead>
                      <TableHead className="w-[15%]">Qty</TableHead>
                      <TableHead className="text-right w-[15%]">Total</TableHead>
                      <TableHead className="w-[5%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItems.map((item) => {
                      const rowTotal = (Number(item.salePrice) || 0) * (Number(item.quantity) || 0);
                      return (
                        <TableRow key={item.id} className="text-xs">
                          <TableCell>
                            <div>
                              <div className="font-semibold text-sm">{item.sku}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">{item.description}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">Stock: {item.availableStock}</div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Input
                              type="number"
                              value={item.salePrice}
                              onChange={(e) => updateItem(item.id, 'salePrice', Number(e.target.value))}
                              className="w-28 h-8 text-xs font-medium"
                              min="0"
                              step="0.01"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                              className="w-20 h-8 text-xs font-medium"
                              min="1"
                              max={item.availableStock}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-sm">
                            {formatCurrency(rowTotal)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 h-8 w-8 p-0 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}



        {/* Order Summary */}
        {selectedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Total Items:</span>
                  <span className="font-semibold text-foreground">{selectedItems.length}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Total Quantity:</span>
                  <span className="font-semibold text-foreground">{totalQuantity}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-3 text-primary">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filter Sheet */}
      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filter Items</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Brands</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {brands.map((brand) => (
                  <label key={brand.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={appliedFilters.brandIds.includes(brand.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAppliedFilters(prev => ({
                            ...prev,
                            brandIds: [...prev.brandIds, brand.id]
                          }));
                        } else {
                          setAppliedFilters(prev => ({
                            ...prev,
                            brandIds: prev.brandIds.filter(id => id !== brand.id)
                          }));
                        }
                      }}
                    />
                    <span className="text-sm">{brand.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={appliedFilters.categoryIds.includes(category.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAppliedFilters(prev => ({
                            ...prev,
                            categoryIds: [...prev.categoryIds, category.id]
                          }));
                        } else {
                          setAppliedFilters(prev => ({
                            ...prev,
                            categoryIds: prev.categoryIds.filter(id => id !== category.id)
                          }));
                        }
                      }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setAppliedFilters({ brandIds: [], categoryIds: [] })}
            >
              Clear All
            </Button>
            <Button onClick={() => setIsFilterOpen(false)}>
              Apply Filters
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Bulk Item Upload Modal */}
      <SalesOrderBulkItemUploadModal
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        warehouseId={selectedWarehouseId}
        warehouseName={warehouses.find(w => w.id === selectedWarehouseId)?.name}
        onImportComplete={handleBulkImportComplete}
      />
    </div>
  );
}