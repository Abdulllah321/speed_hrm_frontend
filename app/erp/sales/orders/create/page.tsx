"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Filter, Trash2, Package, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [baseMargin, setBaseMargin] = useState(0);
  const [cashMargin, setCashMargin] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [orderDiscountPct, setOrderDiscountPct] = useState(0);
  const [notes, setNotes] = useState("");

  // Handle Customer Selection & Auto-populate Margins
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setBaseMargin(Number(customer.baseMargin || 0));
      setCashMargin(Number(customer.cashMargin || 0));
    }
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

  // Calculate totals & margins FBR style
  const marginPct = baseMargin + cashMargin;

  const itemDetails = selectedItems.map(item => {
    const retailPrice = Number(item.salePrice || 0);
    const itemTaxRate = Number(item.taxRate || 18);
    const quantity = Number(item.quantity || 0);
    const manualDiscount = Number(item.discount || 0);

    // 1. Calculate WOST: Retail / (1 + TaxRate/100)
    const wostUnit = retailPrice / (1 + itemTaxRate / 100);
    const wostTotal = wostUnit * quantity;

    // 2. Calculate customer margin discount on WOST
    const marginDiscount = wostTotal * (marginPct / 100);
    
    // 3. After Discount value: WOST - discount
    const afterDiscount = wostTotal - marginDiscount;

    // 4. Apply manual order discount (Additional Discount %) on afterDiscount base
    const discountedBase = afterDiscount * (1 - orderDiscountPct / 100);

    // 5. Calculate Sales Tax on discounted base
    const itemTaxAmount = discountedBase * (itemTaxRate / 100);

    // 6. Total for the item: (Discounted Base + Tax) - manual discount
    const itemTotal = (discountedBase + itemTaxAmount) - manualDiscount;

    return {
      ...item,
      wostTotal,
      marginDiscount,
      afterDiscount,
      discountedBase,
      itemTaxAmount,
      itemTotal
    };
  });

  const grossTotal = itemDetails.reduce((sum, item) => sum + item.wostTotal, 0);
  const baseMarginAmount = (grossTotal * baseMargin) / 100;
  const cashMarginAmount = (grossTotal * cashMargin) / 100;
  const totalMarginDeduction = baseMarginAmount + cashMarginAmount;
  const subtotal = grossTotal - totalMarginDeduction; // Net Subtotal
  const orderDiscountAmount = (subtotal * orderDiscountPct) / 100;
  const taxableAmount = subtotal - orderDiscountAmount; // Subtotal after Additional Discount
  const taxAmount = itemDetails.reduce((sum, item) => sum + item.itemTaxAmount, 0);
  const grandTotal = taxableAmount + taxAmount;

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
        baseMargin,
        cashMargin,
        taxRate,
        discount: orderDiscountAmount,
        items: selectedItems.map(item => ({
          itemId: item.id,
          quantity: item.quantity,
          salePrice: item.salePrice,
          discount: item.discount,
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
                        {customer.name} (Trader ID: {customer.traderId || 'N/A'}{customer.subCode ? ` | Sub: ${customer.subCode}` : ''}) — Margin: {Number(customer.baseMargin || 0)}% + {Number(customer.cashMargin || 0)}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Warehouse *</Label>
                <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      <TableHead className="w-[200px]">Item</TableHead>
                      <TableHead className="w-[110px]">Retail Price</TableHead>
                      <TableHead className="w-[90px]">Qty</TableHead>
                      <TableHead className="text-right w-[120px]">WOST (Excl. Tax)</TableHead>
                      <TableHead className="text-right w-[120px]">Discount</TableHead>
                      <TableHead className="text-right w-[120px]">Sales Tax</TableHead>
                      <TableHead className="text-right w-[120px]">Total (Incl. Tax)</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemDetails.map((item) => {
                      const totalItemDiscount = item.marginDiscount + (item.afterDiscount - item.discountedBase) + (item.discount || 0);
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
                              className="w-24 h-8 text-xs font-medium"
                              min="0"
                              step="0.01"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                              className="w-16 h-8 text-xs font-medium"
                              min="1"
                              max={item.availableStock}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(item.wostTotal)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-amber-600">
                            {totalItemDiscount > 0 ? `-${formatCurrency(totalItemDiscount)}` : 'PKR 0'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-blue-600">
                            <div>+{formatCurrency(item.itemTaxAmount)}</div>
                            <span className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 inline-block mt-0.5 font-sans">
                              {item.taxRate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm text-primary">
                            {formatCurrency(item.itemTotal)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 h-8 w-8 p-0"
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

        {/* Order Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Order Configuration & Margins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-emerald-700 dark:text-emerald-400 font-semibold">Base Margin (%)</Label>
                <Input
                  type="number"
                  value={baseMargin}
                  onChange={(e) => setBaseMargin(Number(e.target.value))}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-blue-700 dark:text-blue-400 font-semibold">Cash Margin (%)</Label>
                <Input
                  type="number"
                  value={cashMargin}
                  onChange={(e) => setCashMargin(Number(e.target.value))}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>Manual Order Discount (%)</Label>
                <Input
                  type="number"
                  value={orderDiscountPct}
                  onChange={(e) => setOrderDiscountPct(Number(e.target.value))}
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label>Notes</Label>
              <Textarea
                placeholder="Order notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        {selectedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Subtotal:</span>
                  <span>{formatCurrency(grossTotal)}</span>
                </div>
                {baseMargin > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Base Margin ({baseMargin}% Cut):</span>
                    <span>-{formatCurrency(baseMarginAmount)}</span>
                  </div>
                )}
                {cashMargin > 0 && (
                  <div className="flex justify-between text-blue-600 font-medium">
                    <span>Cash Margin ({cashMargin}% Cut):</span>
                    <span>-{formatCurrency(cashMarginAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-b py-1">
                  <span>Net Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {orderDiscountPct > 0 && (
                  <>
                    <div className="flex justify-between text-amber-600">
                      <span>Additional Discount ({orderDiscountPct}%):</span>
                      <span>-{formatCurrency(orderDiscountAmount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-gray-700 border-b pb-1">
                      <span>Net Subtotal after Discount:</span>
                      <span>{formatCurrency(taxableAmount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span>Tax ({taxRate}%):</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-xl border-t pt-2 text-primary">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(grandTotal)}</span>
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
    </div>
  );
}