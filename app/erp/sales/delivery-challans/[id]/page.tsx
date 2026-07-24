"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Truck, FileText, CheckCircle, X, Printer, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deliveryChallanApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { formatCurrency } from "@/lib/utils";

export function numberToWords(amount: number): string {
    const a = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = [
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ];

    const inWords = (num: number): string => {
        let n = Math.floor(num);
        if (n === 0) return "Zero";

        const convert = (n: number): string => {
            if (n < 20) return a[n];
            if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? "-" + a[n % 10] : "");
            if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convert(n % 100) : "");
            if (n < 1000000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
            if (n < 1000000000) return convert(Math.floor(n / 1000000)) + " Million" + (n % 1000000 !== 0 ? " " + convert(n % 1000000) : "");
            return convert(Math.floor(n / 1000000000)) + " Billion" + (n % 1000000000 !== 0 ? " " + convert(n % 1000000000) : "");
        };

        return convert(n) + " Only";
    };

    return `Rs. ${inWords(amount)}.`;
}

function fmt(n: number) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(n: number) {
  if (n === undefined || n === null || isNaN(n)) return '0';
  return n.toLocaleString('en-US');
}

function formatDateDisplay(d: string | Date | undefined) {
  if (!d) return 'N/A';
  const date = new Date(d);
  if (isNaN(date.getTime())) return 'N/A';
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function getFinancialYear(d: string | Date | undefined) {
  const date = d ? new Date(d) : new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  let startYear = month >= 6 ? year : year - 1;
  let endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

interface SizeItem {
  size: string;
  qty: number;
  totalValue: number;
}

interface ProductItem {
  sku: string;
  description: string;
  sellingPrice: number;
  totalQty: number;
  totalValue: number;
  sizes: SizeItem[];
}

interface BrandItem {
  name: string;
  totalQty: number;
  totalValue: number;
  products: ProductItem[];
}

interface CategoryItem {
  name: string;
  totalQty: number;
  totalValue: number;
  brands: BrandItem[];
}

function groupChallanItems(items: any[]): CategoryItem[] {
  if (!items || items.length === 0) return [];
  
  const categoryMap = new Map<string, CategoryItem>();

  items.forEach((item: any) => {
    const itemObj = item.item || {};
    const catName = (itemObj.category?.name || item.categoryName || 'GENERAL').toUpperCase();
    const brandName = (itemObj.brand?.name || itemObj.subCategory?.name || item.brandName || 'DEFAULT').toUpperCase();
    const sku = itemObj.sku || item.sku || 'N/A';
    const description = itemObj.description || item.description || 'N/A';
    const sizeName = itemObj.size?.name || itemObj.size?.code || item.size || '';
    const sellingPrice = Number(item.salePrice || item.unitPrice || 0);
    const qty = Number(item.deliveredQty || item.quantity || 0);
    const totalVal = qty * sellingPrice;

    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, {
        name: catName,
        totalQty: 0,
        totalValue: 0,
        brands: [],
      });
    }

    const category = categoryMap.get(catName)!;
    category.totalQty += qty;
    category.totalValue += totalVal;

    let brand = category.brands.find((b) => b.name === brandName);
    if (!brand) {
      brand = {
        name: brandName,
        totalQty: 0,
        totalValue: 0,
        products: [],
      };
      category.brands.push(brand);
    }
    brand.totalQty += qty;
    brand.totalValue += totalVal;

    let product = brand.products.find((p) => p.sku === sku && p.description === description && p.sellingPrice === sellingPrice);
    if (!product) {
      product = {
        sku,
        description,
        sellingPrice,
        totalQty: 0,
        totalValue: 0,
        sizes: [],
      };
      brand.products.push(product);
    }
    product.totalQty += qty;
    product.totalValue += totalVal;

    if (sizeName) {
      let sizeObj = product.sizes.find((s) => s.size === sizeName);
      if (!sizeObj) {
        sizeObj = {
          size: sizeName,
          qty: 0,
          totalValue: 0,
        };
        product.sizes.push(sizeObj);
      }
      sizeObj.qty += qty;
      sizeObj.totalValue += qty * sellingPrice;
    }
  });

  return Array.from(categoryMap.values());
}

export default function DeliveryChallanViewPage() {
  const params = useParams();
  const router = useRouter();
  const [challan, setChallan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = useAuth();
  const canDeliver = hasPermission('erp.sales.dc.deliver');
  const canCancel = hasPermission('erp.sales.dc.cancel');
  const canCreateInvoice = hasPermission('erp.sales.invoice.create');

  useEffect(() => {
    if (params.id) {
      loadChallan(params.id as string);
    }
  }, [params.id]);

  const loadChallan = async (id: string) => {
    try {
      setLoading(true);
      console.log('Loading challan with ID:', id);
      const response = await deliveryChallanApi.getById(id);
      console.log('API Response:', response);
      
      // Handle different response formats
      const challanData = response.data || response;
      console.log('Challan data:', challanData);
      setChallan(challanData);
    } catch (error) {
      console.error('Error loading challan:', error);
      toast.error("Failed to load delivery challan");
      router.push("/erp/sales/delivery-challans");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!challan) return;
    
    try {
      await deliveryChallanApi.markDelivered(challan.id);
      toast.success("Delivery challan marked as delivered");
      loadChallan(challan.id);
    } catch (error) {
      toast.error("Failed to mark as delivered");
      console.error(error);
    }
  };

  const handleCancel = async () => {
    if (!challan) return;
    
    if (!confirm('Are you sure you want to cancel this delivery challan? This will restore the inventory.')) {
      return;
    }
    
    try {
      await deliveryChallanApi.cancel(challan.id);
      toast.success("Delivery challan cancelled successfully");
      loadChallan(challan.id);
    } catch (error) {
      toast.error("Failed to cancel delivery challan");
      console.error(error);
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

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading delivery challan...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!challan) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Delivery challan not found</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permissions="erp.sales.dc.read">
    <>
      <style jsx global>{`
          @media print {
              body {
                  visibility: hidden;
              }
              #print-section {
                  visibility: visible;
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: auto;
                  margin: 0;
                  padding: 0;
                  background: white;
                  z-index: 9999;
              }
              #print-section * {
                  visibility: visible;
              }
              @page {
                  margin: 0;
                  size: auto;
              }
              header, nav, footer, aside, .banner {
                  display: none !important;
              }
          }
      `}</style>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <Link href="/erp/sales/delivery-challans" transitionTypes={["nav-back"]}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Delivery Challans
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Delivery Challan {challan.challanNo || 'N/A'}
              </h1>
              <p className="text-muted-foreground">
                Created on {challan.challanDate 
                  ? new Date(challan.challanDate).toLocaleDateString() 
                  : challan.createdAt 
                    ? new Date(challan.createdAt).toLocaleDateString()
                    : 'N/A'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(challan.status || 'PENDING')}>
              {challan.status || 'PENDING'}
            </Badge>
            
            {challan.status === "PENDING" && (
              <>
                {canDeliver && (
                  <Button size="sm" onClick={handleMarkDelivered}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Delivered
                  </Button>
                )}
                {canCancel && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCancel}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </>
            )}
            
            {challan.status === "DELIVERED" && canCreateInvoice && (
              <Button 
                size="sm"
                asChild
              >
                <Link href={`/erp/sales/invoices/create?challanId=${challan.id}`} transitionTypes={["nav-forward"]}>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Invoice
                </Link>
              </Button>
            )}

            <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-2">
                <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Challan Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">Order No:</span> {challan.salesOrder?.orderNo || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Customer:</span> {challan.customer?.name || challan.salesOrder?.customer?.name || 'N/A'}
                </div>
                {challan.customer?.deliveryAddress && (
                  <div>
                    <span className="font-medium text-primary">Delivery Address:</span> {challan.customer.deliveryAddress}
                  </div>
                )}
                <div>
                  <span className="font-medium">Order Date:</span> {challan.salesOrder?.orderDate 
                    ? new Date(challan.salesOrder.orderDate).toLocaleDateString() 
                    : 'N/A'
                  }
                </div>
                <div>
                  <span className="font-medium">Order Total:</span> {formatCurrency(challan.salesOrder?.grandTotal || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delivery Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">Challan No:</span> {challan.challanNo || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Challan Date:</span> {challan.challanDate 
                    ? new Date(challan.challanDate).toLocaleDateString() 
                    : challan.createdAt 
                      ? new Date(challan.createdAt).toLocaleDateString()
                      : 'N/A'
                  }
                </div>
                <div>
                  <span className="font-medium">Driver:</span> {challan.driverName || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Vehicle:</span> {challan.vehicleNo || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Transport Mode:</span> {challan.transportMode || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Status:</span> 
                  <Badge className={`ml-2 ${getStatusColor(challan.status || 'PENDING')}`}>
                    {challan.status || 'PENDING'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Delivery Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Delivery Items ({challan.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Delivered Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!challan.items || challan.items.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No items found
                        </TableCell>
                      </TableRow>
                    ) : (
                      challan.items.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.item?.description || item.description || 'N/A'}</div>
                            </div>
                          </TableCell>
                          <TableCell>{item.item?.sku || item.sku || 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.salePrice || item.unitPrice || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.deliveredQty || item.quantity || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency((item.deliveredQty || item.quantity || 0) * (item.salePrice || item.unitPrice || 0))}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Items:</span>
                  <span>{challan.totalQty || challan.items?.reduce((sum: number, item: any) => sum + (item.deliveredQty || item.quantity || 0), 0) || 0}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(challan.totalAmount || challan.items?.reduce((sum: number, item: any) => sum + ((item.deliveredQty || item.quantity || 0) * (item.salePrice || item.unitPrice || 0)), 0) || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {challan.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{challan.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Print View */}
      <div id="print-section" className="hidden print:block min-h-screen bg-white p-0">
        <div className="w-full max-w-[1000px] mx-auto bg-white text-black p-6 font-sans print:p-6 print:max-w-none box-border text-xs">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="w-1/4 flex items-center">
              <svg className="h-10 w-auto text-black fill-current" viewBox="0 0 24 24">
                <path d="M21.71 4.77C18.6 7.6 13.73 12.04 10.22 15.35C8.35 17.11 6.8 18.3 5.92 18.3C4.94 18.3 4.19 17.41 4.19 16.35C4.19 14.77 5.73 12.18 8.23 9.46C7.29 10.3 5.48 12.2 4.3 13.84C3.41 15.09 2.5 16.74 2.5 18.27C2.5 20.35 4.14 21.8 6.55 21.8C8.94 21.8 11.75 19.86 14.7 17.15C18.25 13.88 22.38 9.09 24 7.08L21.71 4.77Z" />
              </svg>
            </div>
            <div className="w-1/2 text-center">
              <h1 className="text-xl font-bold tracking-tight">Speed (Private) Limited</h1>
              <h2 className="text-lg font-bold">Delivery Challan</h2>
            </div>
            <div className="w-1/4"></div>
          </div>

          {/* Metadata Section */}
          <div className="space-y-1 mb-4 text-xs font-sans">
            <div className="grid grid-cols-3 gap-2">
              <div><span className="font-bold inline-block w-28">Financial Year :</span> {getFinancialYear(challan.challanDate)}</div>
              <div><span className="font-bold inline-block w-32">Document Status :</span> {challan.status === 'DELIVERED' || challan.status === 'INVOICED' ? 'Approved / Closed' : challan.status || 'Pending'}</div>
              <div><span className="font-bold inline-block w-24">Approved By :</span> {challan.driverName || 'Faisal'}</div>
            </div>

            <div className="grid grid-cols-1 gap-1">
              <div><span className="font-bold inline-block w-36">Stock Deliverd From :</span> {challan.warehouse?.name || challan.salesOrder?.warehouse?.name || 'Warehouse'}</div>
              <div><span className="font-bold inline-block w-36">Customer Name :</span> {challan.customer?.name || challan.salesOrder?.customer?.name || 'N/A'}</div>
              <div><span className="font-bold inline-block w-36">Address :</span> {challan.customer?.address || challan.salesOrder?.customer?.address || 'N/A'}</div>
              <div><span className="font-bold inline-block w-36">Delivery Address :</span> {challan.customer?.deliveryAddress || challan.salesOrder?.customer?.deliveryAddress || 'N/A'}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div><span className="font-bold inline-block w-36">D.C. No :</span> {challan.challanNo}</div>
              <div><span className="font-bold inline-block w-16">Date :</span> {formatDateDisplay(challan.challanDate || challan.createdAt)}</div>
            </div>

            <div className="grid grid-cols-1 gap-1">
              <div><span className="font-bold inline-block w-36">D.O.N. No :</span> {challan.salesOrder?.orderNo || 'N/A'}</div>
              <div><span className="font-bold inline-block w-36">Employee :</span> {challan.driverName || 'Faisal'}</div>
              <div><span className="font-bold inline-block w-36">Remarks :</span> {challan.notes || challan.salesOrder?.notes || 'N/A'}</div>
            </div>

            <div className="border-b-2 border-black pt-2 mb-2"></div>
          </div>

          {/* Grouped Items Table */}
          <table className="w-full text-xs font-sans border-collapse">
            <thead>
              <tr className="border-y-2 border-black font-bold">
                <th className="py-2 text-left w-[45%]">GPC / Category / Product</th>
                <th className="py-2 text-center w-[10%]">Size</th>
                <th className="py-2 text-right w-[15%]">Quantity</th>
                <th className="py-2 text-right w-[15%]">Selling Price (Rs.)</th>
                <th className="py-2 text-right w-[15%]">Total Value (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {groupChallanItems(challan.items || []).map((cat, catIdx) => (
                <React.Fragment key={catIdx}>
                  {/* Category Header Row */}
                  <tr className="border-t-2 border-black font-bold">
                    <td className="py-1 uppercase">{cat.name}</td>
                    <td className="py-1 text-center"></td>
                    <td className="py-1 text-right">{formatNumber(cat.totalQty)}</td>
                    <td className="py-1 text-right"></td>
                    <td className="py-1 text-right">{formatNumber(cat.totalValue)}</td>
                  </tr>
                  <tr className="border-b border-dotted border-black">
                    <td colSpan={5}></td>
                  </tr>

                  {cat.brands.map((brand, brandIdx) => (
                    <React.Fragment key={brandIdx}>
                      {/* Brand / SubCategory Row */}
                      <tr className="font-bold">
                        <td className="py-1 pl-4 uppercase">{brand.name}</td>
                        <td className="py-1 text-center"></td>
                        <td className="py-1 text-right">{formatNumber(brand.totalQty)}</td>
                        <td className="py-1 text-right"></td>
                        <td className="py-1 text-right">{formatNumber(brand.totalValue)}</td>
                      </tr>

                      {brand.products.map((prod, prodIdx) => (
                        <React.Fragment key={prodIdx}>
                          {/* SKU Row */}
                          <tr>
                            <td className="py-0.5 pl-8 text-gray-800 text-[11px]" colSpan={5}>
                              {prod.sku}
                            </td>
                          </tr>
                          {/* Description Row */}
                          <tr>
                            <td className="py-0.5 pl-8 font-semibold">{prod.description}</td>
                            <td className="py-0.5 text-center"></td>
                            <td className="py-0.5 text-right">{formatNumber(prod.totalQty)}</td>
                            <td className="py-0.5 text-right">{formatNumber(prod.sellingPrice)}</td>
                            <td className="py-0.5 text-right">{formatNumber(prod.totalValue)}</td>
                          </tr>
                          <tr className="border-b border-dotted border-black">
                            <td colSpan={5}></td>
                          </tr>

                          {/* Size Breakdown Rows */}
                          {prod.sizes.map((sz, szIdx) => (
                            <tr key={szIdx}>
                              <td className="py-0.5"></td>
                              <td className="py-0.5 text-center">{sz.size}</td>
                              <td className="py-0.5 text-right">{formatNumber(sz.qty)}</td>
                              <td className="py-0.5 text-right"></td>
                              <td className="py-0.5 text-right">{formatNumber(sz.totalValue)}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
    </PermissionGuard>
  );
}