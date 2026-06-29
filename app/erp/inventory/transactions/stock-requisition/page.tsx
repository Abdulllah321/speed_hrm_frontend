'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Autocomplete } from '@/components/ui/autocomplete';
import {
  warehouseApi,
  locationApi,
  brandApi,
  inventoryApi,
  stockRequisitionApi,
  Warehouse,
  WarehouseLocation,
} from '@/lib/api';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRightLeft,
  Search,
  Package,
  Save,
  Plus,
  Info,
  Loader2,
  WarehouseIcon,
  Trash2,
  FileSpreadsheet,
  Upload,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  History,
  Printer,
} from 'lucide-react';
import Link from 'next/link';

interface SRNItem {
  itemId: string;
  sku: string;
  description: string;
  color?: string | null;
  size?: string | null;
  category?: { id: string; name: string } | null;
  gender?: { id: string; name: string } | null;
  segment?: { id: string; name: string } | null;
  unitPrice: number;
  quantity: number;
}

export default function StockRequisitionPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  // Dropdown options
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [brands, setBrands] = useState<any[]>([]);

  // Requisitions List
  const [requisitions, setRequisitions] = useState<any[]>([]);

  // Create Requisition Form State
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [destLocationId, setDestLocationId] = useState<string>('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('New Arrival');
  const [remarks, setRemarks] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [financialYear, setFinancialYear] = useState<string>('25-26');

  // Manual items & Excel items list
  const [requisitionItems, setRequisitionItems] = useState<SRNItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingItems, setSearchingItems] = useState<boolean>(false);

  // Detail Sheet State
  const [selectedRequisition, setSelectedRequisition] = useState<any>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState<boolean>(false);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [stnQuantities, setStnQuantities] = useState<Record<string, number>>({});
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    loadDropdownData();
    loadRequisitions();
  }, []);

  const loadDropdownData = async () => {
    try {
      const [whs, locs, brs] = await Promise.all([
        warehouseApi.getAll(),
        locationApi.getAll(),
        brandApi.getAll(),
      ]);
      setWarehouses(whs);
      if (whs.length > 0) {
        setSelectedWarehouseId(whs[0].id);
      }
      if (locs.status) {
        setLocations(locs.data);
      }
      if (brs.status) {
        setBrands(brs.data);
      }
    } catch (error) {
      console.error('Failed to load metadata', error);
      toast.error('Failed to initialize form data');
    }
  };

  const loadRequisitions = async () => {
    setLoading(true);
    try {
      const res = await stockRequisitionApi.getAll();
      if (res.status) {
        setRequisitions(res.data);
      }
    } catch (error) {
      toast.error('Failed to load requisitions list');
    } finally {
      setLoading(false);
    }
  };

  // Search items in warehouse
  const handleItemSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchingItems(true);
    try {
      const res = await inventoryApi.search(val.trim(), selectedWarehouseId);
      if (res.status) {
        setSearchResults(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSearchingItems(false);
    }
  };

  const addManualItem = (item: any) => {
    // Check if already in list
    const exists = requisitionItems.find((i) => i.itemId === item.id);
    if (exists) {
      toast.info('Item already added to requisition');
      return;
    }

    const availableStock = typeof item.totalQuantity === 'number' ? item.totalQuantity : 0;
    if (availableStock <= 0) {
      toast.warning('This item has no available stock in selected warehouse');
      return;
    }

        const newItem: SRNItem = {
      itemId: item.id,
      sku: item.sku,
      description: item.description || '',
      color: item.color?.name || null,
      size: item.size?.name || null,
      category: item.category ? { id: item.category.id, name: item.category.name } : null,
      gender: item.gender ? { id: item.gender.id, name: item.gender.name } : null,
      segment: item.segment ? { id: item.segment.id, name: item.segment.name } : null,
      unitPrice: Number(item.unitPrice || 0),
      quantity: 1,
    };

    setRequisitionItems((prev) => [...prev, newItem]);
    setSearchQuery('');
    setSearchResults([]);
    toast.success(`Added ${item.sku}`);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await stockRequisitionApi.uploadExcel(formData);
      if (res.status && res.data.length > 0) {
        const parsedItems: SRNItem[] = res.data.map((item: any) => ({
          itemId: item.itemId,
          sku: item.sku,
          description: item.description || '',
          color: item.color || null,
          size: item.size || null,
          category: item.category || null,
          gender: item.gender || null,
          segment: item.segment || null,
          unitPrice: Number(item.unitPrice || 0),
          quantity: item.quantity,
        }));

        setRequisitionItems((prev) => {
          const merged = [...prev];
          parsedItems.forEach((newItem) => {
            const idx = merged.findIndex((i) => i.itemId === newItem.itemId);
            if (idx > -1) {
              merged[idx].quantity = newItem.quantity; // Overwrite or add quantity
            } else {
              merged.push(newItem);
            }
          });
          return merged;
        });

        toast.success(`Successfully parsed ${parsedItems.length} items from Excel.`);
      } else {
        toast.error('No items found in Excel');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse Excel sheet');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const updateItemQty = (itemId: string, qty: number) => {
    if (qty < 1) return;
    setRequisitionItems((prev) =>
      prev.map((item) => (item.itemId === itemId ? { ...item, quantity: qty } : item)),
    );
  };

  const removeItem = (itemId: string) => {
    setRequisitionItems((prev) => prev.filter((i) => i.itemId !== itemId));
    toast.info('Item removed');
  };

  const handlePrintPreview = () => {
    if (requisitionItems.length === 0) {
      toast.error('Please add at least one item first');
      return;
    }

    const draftSrn = {
      requisitionNo: 'SRN-DRAFT-XXXX',
      requisitionDate: new Date().toISOString(),
      financialYear,
      documentType,
      remarks,
      notes,
      toLocation: {
        name: locations.find((l) => l.id === destLocationId)?.name || 'DRAFT OUTLET',
      },
      fromWarehouse: {
        name: warehouses.find((w) => w.id === selectedWarehouseId)?.name || 'DRAFT WAREHOUSE',
      },
      brand: {
        name: selectedBrandId && selectedBrandId !== 'none'
          ? brands.find((b) => b.id === selectedBrandId)?.name
          : 'GENERAL',
      },
      items: requisitionItems.map((item) => ({
        quantity: item.quantity,
        item: {
          sku: item.sku,
          description: item.description,
          unitPrice: item.unitPrice || 0,
          category: item.category || null,
          gender: item.gender || null,
          segment: item.segment || null,
          size: { name: item.size || 'Free Size' },
          color: { name: item.color || 'Default' },
        },
      })),
    };

    localStorage.setItem('draft_srn', JSON.stringify(draftSrn));
    window.open('/erp/inventory/transactions/stock-requisition/slip/draft', '_blank');
  };

  const handleStartEdit = (req: any) => {
    setEditId(req.id);
    setSelectedWarehouseId(req.fromWarehouseId);
    setDestLocationId(req.toLocationId);
    setSelectedBrandId(req.brandId || 'none');
    setDocumentType(req.documentType);
    setFinancialYear(req.financialYear || '25-26');
    setRemarks(req.remarks || '');
    setNotes(req.notes || '');
    setRequisitionItems(
      req.items.map((item: any) => ({
        itemId: item.itemId,
        sku: item.item.sku,
        description: item.item.description || '',
        color: item.item.color?.name || null,
        size: item.item.size?.name || null,
        category: item.item.category || null,
        gender: item.item.gender || null,
        segment: item.item.segment || null,
        unitPrice: Number(item.item.unitPrice || 0),
        quantity: Number(item.quantity),
      }))
    );
    setDetailSheetOpen(false);
    setActiveTab('create');
    toast.info(`Editing Outlet Request: ${req.requisitionNo}`);
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setRequisitionItems([]);
    setRemarks('');
    setNotes('');
    toast.info('Edit cancelled');
  };

  const handleApproveRequisition = async (id: string) => {
    setSubmitting(true);
    try {
      const res = await stockRequisitionApi.approve(id);
      if (res.status) {
        toast.success('Stock Requisition Note approved and stock reserved!');
        setDetailSheetOpen(false);
        loadRequisitions();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve requisition note');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRequisition = async () => {
    if (!selectedWarehouseId) {
      toast.error('Please select source warehouse');
      return;
    }
    if (!destLocationId) {
      toast.error('Please select destination outlet');
      return;
    }
    if (requisitionItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fromWarehouseId: selectedWarehouseId,
        toLocationId: destLocationId,
        brandId: selectedBrandId || undefined,
        documentType,
        remarks,
        notes,
        financialYear,
        items: requisitionItems.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
        })),
      };

      if (editId) {
        const res = await stockRequisitionApi.update(editId, payload);
        if (res.status) {
          toast.success('Outlet Request updated successfully!');
          setEditId(null);
          setRequisitionItems([]);
          setRemarks('');
          setNotes('');
          loadRequisitions();
          setActiveTab('all');
        }
      } else {
        const res = await stockRequisitionApi.create(payload);
        if (res.status) {
          toast.success('Stock Requisition Note created and stock reserved!');
          setRequisitionItems([]);
          setRemarks('');
          setNotes('');
          loadRequisitions();
          setActiveTab('all');
        }
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to ${editId ? 'update' : 'create'} requisition note`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequisition = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this requisition? This will release reserved stock if active.')) {
      return;
    }
    try {
      const res = await stockRequisitionApi.cancel(id);
      if (res.status) {
        toast.success('Requisition cancelled successfully');
        loadRequisitions();
        if (selectedRequisition?.id === id) {
          setDetailSheetOpen(false);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel requisition');
    }
  };

  const openDetailSheet = (req: any) => {
    setSelectedRequisition(req);
    const qtys: Record<string, number> = {};
    req.items.forEach((item: any) => {
      qtys[item.itemId] = Number(item.quantity);
    });
    setStnQuantities(qtys);
    setIsConverting(false);
    setDetailSheetOpen(true);
  };

  const handleStnQtyChange = (itemId: string, val: number, maxQty: number) => {
    if (val < 0) return;
    if (val > maxQty) {
      toast.warning(`WH staff can minus quantity but cannot add. Max limit: ${maxQty}`);
      return;
    }
    setStnQuantities((prev) => ({
      ...prev,
      [itemId]: val,
    }));
  };

  const handleConvertToSTN = async () => {
    if (!selectedRequisition) return;

    const items = Object.entries(stnQuantities).map(([itemId, quantity]) => ({
      itemId,
      quantity,
    }));

    setSubmitting(true);
    try {
      const res = await stockRequisitionApi.convertToSTN(selectedRequisition.id, {
        items,
        notes: `Converted from SRN ${selectedRequisition.requisitionNo}`,
      });
      if (res.status) {
        toast.success('Successfully converted SRN to Stock Transfer Out (STN)!');
        setDetailSheetOpen(false);
        loadRequisitions();
        router.push('/erp/inventory/transactions/stock-transfer');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to convert requisition to STN');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge className="bg-amber-400 hover:bg-amber-500 text-black font-semibold">Draft (Outlet Request)</Badge>;
      case 'PENDING':
        return <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold">Pending</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-500 hover:bg-green-600 text-white font-semibold">Completed</Badge>;
      case 'PARTIALLY_FULFILLED':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">Partial</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-semibold">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
            Stock Requisition Note (SRN)
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage procurement-to-transfer workflow, block/reserve warehouse stocks, and track outlet replenishment requests.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="border-2 font-bold shadow-sm">
            <Link href="/erp/inventory/transactions/stock-requisition/pending">
              <Package className="h-4 w-4 mr-2 text-indigo-600" /> Warehouse Pending List
            </Link>
          </Button>
          <Button variant="outline" asChild className="border-2 font-bold shadow-sm">
            <Link href="/erp/inventory/transactions/stock-transfer">
              <ArrowLeft className="h-4 w-4 mr-2" /> Stock Transfer
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex justify-between items-center bg-white p-1 rounded-lg border shadow-sm">
          <TabsList className="bg-transparent border-0 gap-1">
            <TabsTrigger
              value="all"
              className="font-bold data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 px-6 py-2.5"
            >
              <History className="h-4 w-4 mr-2" />
              All Requisitions
            </TabsTrigger>
            <TabsTrigger
              value="create"
              className="font-bold data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 px-6 py-2.5"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Requisition
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: All Requisitions */}
        <TabsContent value="all">
          <Card className="border shadow-md">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xl font-bold text-gray-800">All Requisition History</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : requisitions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No stock requisition notes found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                      <TableHead className="font-bold">Requisition No</TableHead>
                      <TableHead className="font-bold">Date</TableHead>
                      <TableHead className="font-bold">From Warehouse</TableHead>
                      <TableHead className="font-bold">To Location</TableHead>
                      <TableHead className="font-bold">Brand</TableHead>
                      <TableHead className="font-bold">Type</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                      <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requisitions.map((req) => (
                      <TableRow key={req.id} className="hover:bg-indigo-50/20 transition-colors">
                        <TableCell className="font-bold text-indigo-600">{req.requisitionNo}</TableCell>
                        <TableCell>{new Date(req.requisitionDate).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{req.fromWarehouse?.name}</TableCell>
                        <TableCell className="font-medium">{req.toLocation?.name}</TableCell>
                        <TableCell>{req.brand?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-indigo-50/50">
                            {req.documentType}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openDetailSheet(req)}>
                              View Detail
                            </Button>
                            {(req.status === 'PENDING' || req.status === 'DRAFT') && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCancelRequisition(req.id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>



        {/* Tab 3: Create Requisition */}
        <TabsContent value="create">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Context Form */}
            <Card className="lg:col-span-1 border shadow-md">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg font-bold">
                  {editId ? 'Edit Requisition Header' : 'Requisition Header'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label>Source Warehouse (From)</Label>
                  <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Destination Location (Shop/Outlet)</Label>
                  <Select value={destLocationId} onValueChange={setDestLocationId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Outlet" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.code ? `${l.code} · ${l.name}` : l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Brand (Optional)</Label>
                  <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Brand Filter</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Document Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New Arrival">New Arrival</SelectItem>
                      <SelectItem value="Regular">Regular / General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Financial Year</Label>
                  <Input value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Input
                    placeholder="e.g. SU26 2ND SHIP NEW ARRIVALS"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    placeholder="Additional instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold mb-2"
                  size="lg"
                  disabled={submitting || requisitionItems.length === 0}
                  onClick={handleCreateRequisition}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" /> {editId ? 'Updating...' : 'Reserving...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" /> {editId ? 'Update Requisition' : 'Confirm & Reserve Stock'}
                    </>
                  )}
                </Button>

                {editId && (
                  <Button
                    className="w-full font-bold"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancel Edit
                  </Button>
                )}

                <Button
                  className="w-full border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-bold"
                  variant="outline"
                  size="lg"
                  disabled={requisitionItems.length === 0}
                  onClick={handlePrintPreview}
                >
                  <Printer className="h-5 w-5 mr-2" /> Print Preview
                </Button>
              </CardContent>
            </Card>

            {/* Right Items Grid & Upload */}
            <Card className="lg:col-span-3 border shadow-md">
              <CardHeader className="pb-3 border-b flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-bold">Items & Quantities</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-bold"
                    disabled={requisitionItems.length === 0}
                    onClick={handlePrintPreview}
                  >
                    <Printer className="h-4 w-4 mr-2" /> Print Preview
                  </Button>

                  {/* File Upload Button */}
                  <div className="relative">
                    <input
                      type="file"
                      id="excel-file-input"
                      className="hidden"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelUpload}
                      disabled={uploading}
                    />
                    <Button
                      variant="outline"
                      className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold cursor-pointer"
                      disabled={uploading}
                      onClick={() => document.getElementById('excel-file-input')?.click()}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" /> Bulk Excel Upload
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Manual Item Add bar */}
                <div className="relative">
                  <div className="flex items-center border rounded-md px-3 bg-gray-50/50">
                    <Search className="h-4 w-4 text-muted-foreground mr-2" />
                    <Input
                      placeholder="Type SKU or barcode to manually search and add..."
                      value={searchQuery}
                      onChange={(e) => handleItemSearch(e.target.value)}
                      className="border-0 shadow-none focus-visible:ring-0 bg-transparent py-6"
                    />
                    {searchingItems && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
                  </div>

                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto mt-1">
                      {searchResults.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center p-3 hover:bg-indigo-50 cursor-pointer transition-colors border-b last:border-b-0"
                          onClick={() => addManualItem(item)}
                        >
                          <div>
                            <p className="font-bold text-sm text-gray-800">{item.sku}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              Stock: {item.totalQuantity}
                            </span>
                            <Plus className="h-4 w-4 text-indigo-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {requisitionItems.length === 0 ? (
                  <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground flex flex-col items-center justify-center space-y-2 bg-gray-50/30">
                    <FileSpreadsheet className="h-10 w-10 text-indigo-300" />
                    <p className="font-semibold text-gray-600">Requisition List is empty</p>
                    <p className="text-xs max-w-md">
                      Add items manually by searching above, or click <strong>Bulk Excel Upload</strong> to import quantities from Column I of the consolidated GRN sheet.
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50/50">
                        <TableRow>
                          <TableHead className="font-bold">SKU</TableHead>
                          <TableHead className="font-bold">Description</TableHead>
                          <TableHead className="font-bold">Color/Size</TableHead>
                          <TableHead className="font-bold w-[150px]">Req Quantity</TableHead>
                          <TableHead className="text-right font-bold w-[80px]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requisitionItems.map((item) => (
                          <TableRow key={item.itemId} className="hover:bg-gray-50/40">
                            <TableCell className="font-bold text-gray-800">{item.sku}</TableCell>
                            <TableCell className="max-w-[250px] truncate">{item.description}</TableCell>
                            <TableCell>
                              <div className="flex gap-1.5">
                                {item.color && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {item.color}
                                  </Badge>
                                )}
                                {item.size && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {item.size}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => updateItemQty(item.itemId, parseInt(e.target.value) || 1)}
                                className="w-24 text-center font-bold"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                className="text-rose-500 hover:text-rose-700"
                                onClick={() => removeItem(item.itemId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Slide-out detail sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {selectedRequisition && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <SheetTitle className="text-2xl font-bold text-indigo-600">
                      {selectedRequisition.requisitionNo}
                    </SheetTitle>
                    <SheetDescription className="text-xs font-semibold text-gray-500 mt-1">
                      Created on {new Date(selectedRequisition.requisitionDate).toLocaleString()}
                    </SheetDescription>
                  </div>
                  <div>{getStatusBadge(selectedRequisition.status)}</div>
                </div>
              </SheetHeader>

              {/* SRN Metadata Info */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">FROM WAREHOUSE</span>
                  <span className="font-semibold text-gray-800">{selectedRequisition.fromWarehouse?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">TO OUTLET / SHOP</span>
                  <span className="font-semibold text-gray-800">{selectedRequisition.toLocation?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">DOCUMENT TYPE</span>
                  <span className="font-semibold text-indigo-600">{selectedRequisition.documentType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">FINANCIAL YEAR</span>
                  <span className="font-semibold text-gray-800">{selectedRequisition.financialYear || '-'}</span>
                </div>
                {selectedRequisition.remarks && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-xs">REMARKS</span>
                    <span className="text-gray-700">{selectedRequisition.remarks}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 flex items-center gap-1.5">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    Items Requisitioned
                  </h3>
                  {isConverting && (
                    <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> WH Picking mode (Quantities can only be decreased)
                    </Badge>
                  )}
                </div>

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-100/60">
                      <TableRow>
                        <TableHead className="font-bold">SKU</TableHead>
                        <TableHead className="font-bold">Description</TableHead>
                        <TableHead className="font-bold w-[120px] text-center">Req Qty</TableHead>
                        {selectedRequisition.status !== 'PENDING' && (
                          <TableHead className="font-bold w-[120px] text-center">Fulfilled Qty</TableHead>
                        )}
                        {isConverting && (
                          <TableHead className="font-bold w-[120px] text-center text-amber-700">
                            Transfer Qty
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRequisition.items.map((item: any) => {
                        const originalQty = Number(item.quantity);
                        const currentStnQty = stnQuantities[item.itemId] ?? originalQty;

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-semibold">{item.item?.sku}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{item.item?.description}</TableCell>
                            <TableCell className="text-center font-semibold">{originalQty}</TableCell>
                            {selectedRequisition.status !== 'PENDING' && (
                              <TableCell className="text-center font-bold text-green-600">
                                {Number(item.fulfilledQty)}
                              </TableCell>
                            )}
                            {isConverting && (
                              <TableCell className="bg-amber-50/40">
                                <Input
                                  type="number"
                                  min={0}
                                  max={originalQty}
                                  value={currentStnQty}
                                  onChange={(e) =>
                                    handleStnQtyChange(
                                      item.itemId,
                                      parseInt(e.target.value) || 0,
                                      originalQty,
                                    )
                                  }
                                  className="w-20 text-center mx-auto border-amber-300 focus-visible:ring-amber-500 font-bold"
                                />
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Action Footer */}
              <SheetFooter className="pt-4 border-t gap-2 sm:gap-0">
                {isConverting ? (
                  <div className="flex gap-2 w-full justify-end">
                    <Button variant="outline" onClick={() => setIsConverting(false)}>
                      Back to View
                    </Button>
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                      disabled={submitting}
                      onClick={handleConvertToSTN}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Converting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" /> Confirm & Issue STN
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-between w-full">
                    <div>
                      {(selectedRequisition.status === 'PENDING' || selectedRequisition.status === 'DRAFT') && (
                        <Button
                          variant="destructive"
                          onClick={() => handleCancelRequisition(selectedRequisition.id)}
                        >
                          Cancel Requisition
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {selectedRequisition.status === 'DRAFT' && (
                        <>
                          <Button
                            variant="outline"
                            className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-bold"
                            onClick={() => handleStartEdit(selectedRequisition)}
                          >
                            Edit
                          </Button>
                          <Button
                            className="bg-green-600 hover:bg-green-700 font-bold text-white"
                            onClick={() => handleApproveRequisition(selectedRequisition.id)}
                            disabled={submitting}
                          >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve & Reserve"}
                          </Button>
                        </>
                      )}
                      <Button variant="outline" asChild>
                        <Link
                          href={`/erp/inventory/transactions/stock-requisition/slip/${selectedRequisition.id}`}
                          target="_blank"
                        >
                          <Printer className="h-4 w-4 mr-1.5" /> Print
                        </Link>
                      </Button>
                      <Button variant="outline" onClick={() => setDetailSheetOpen(false)}>
                        Close
                      </Button>
                      {selectedRequisition.status === 'PENDING' && (
                        <Button
                          className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                          onClick={() => setIsConverting(true)}
                        >
                          Convert to STN
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
