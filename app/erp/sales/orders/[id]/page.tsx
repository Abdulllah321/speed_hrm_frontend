"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Truck, Edit, Trash2, CheckCircle, Printer } from "lucide-react";
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
import { salesOrderApi, SalesOrder } from "@/lib/api";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

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

interface ColorSizeBreakdown {
  color: string;
  size: string;
  qty: number;
  totalValue: number;
}

interface ProductGroup {
  sku: string;
  description: string;
  sellingPrice: number;
  totalQty: number;
  totalValue: number;
  items: ColorSizeBreakdown[];
}

interface SubCategoryGroup {
  name: string;
  totalQty: number;
  totalValue: number;
  products: ProductGroup[];
}

interface DivisionGroup {
  name: string;
  totalQty: number;
  totalValue: number;
  subCategories: SubCategoryGroup[];
}

interface CategoryGroup {
  name: string;
  totalQty: number;
  totalValue: number;
  divisions: DivisionGroup[];
}

function groupOrderItems(items: any[]): CategoryGroup[] {
  if (!items || items.length === 0) return [];

  const categoryMap = new Map<string, CategoryGroup>();

  items.forEach((item: any) => {
    const itemObj = item.item || {};
    const catName = (itemObj.category?.name || item.categoryName || 'FOOTWEAR').toUpperCase();
    const divName = (itemObj.gender?.name || itemObj.division?.name || item.divisionName || '').toUpperCase();
    const subCatName = (itemObj.brand?.name || itemObj.subCategory?.name || item.brandName || '').toUpperCase();
    const sku = itemObj.sku || item.sku || 'N/A';
    const description = itemObj.description || item.description || 'N/A';
    const color = itemObj.color?.name || item.color || '';
    const size = itemObj.size?.name || itemObj.size?.code || item.size || '';
    const sellingPrice = Number(item.salePrice || 0);
    const qty = Number(item.quantity || 0);
    const totalVal = qty * sellingPrice;

    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, { name: catName, totalQty: 0, totalValue: 0, divisions: [] });
    }
    const category = categoryMap.get(catName)!;
    category.totalQty += qty;
    category.totalValue += totalVal;

    let division = category.divisions.find((d) => d.name === divName);
    if (!division) {
      division = { name: divName, totalQty: 0, totalValue: 0, subCategories: [] };
      category.divisions.push(division);
    }
    division.totalQty += qty;
    division.totalValue += totalVal;

    let subCat = division.subCategories.find((s) => s.name === subCatName);
    if (!subCat) {
      subCat = { name: subCatName, totalQty: 0, totalValue: 0, products: [] };
      division.subCategories.push(subCat);
    }
    subCat.totalQty += qty;
    subCat.totalValue += totalVal;

    let product = subCat.products.find((p) => p.sku === sku && p.description === description && p.sellingPrice === sellingPrice);
    if (!product) {
      product = { sku, description, sellingPrice, totalQty: 0, totalValue: 0, items: [] };
      subCat.products.push(product);
    }
    product.totalQty += qty;
    product.totalValue += totalVal;

    product.items.push({
      color,
      size,
      qty,
      totalValue: totalVal,
    });
  });

  return Array.from(categoryMap.values());
}

export default function SalesOrderViewPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadOrder(params.id as string);
    }
  }, [params.id]);

  const loadOrder = async (id: string) => {
    try {
      setLoading(true);
      const response = await salesOrderApi.getById(id);
      const orderData = response.data || response;
      setOrder(orderData);
    } catch (error) {
      console.error('Error loading order:', error);
      toast.error("Failed to load sales order");
      router.push("/erp/sales/orders");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!order) return;
    
    try {
      await salesOrderApi.confirm(order.id);
      toast.success("Sales order confirmed successfully");
      loadOrder(order.id);
    } catch (error) {
      toast.error("Failed to confirm sales order");
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800";
      case "WAREHOUSE_VERIFIED":
        return "bg-green-100 text-green-800";
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
            <p className="mt-2 text-muted-foreground">Loading sales order...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Sales order not found</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }
          @page {
            size: auto;
            margin: 10mm;
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
              <Link href="/erp/sales/orders" transitionTypes={["nav-back"]}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Sales Order {order.orderNo}
              </h1>
              <p className="text-muted-foreground">
                Created on {new Date(order.orderDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(order.status)}>
              {order.status}
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Order Note
            </Button>

            {order.status === "DRAFT" && (
              <>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button size="sm" onClick={handleConfirm}>
                  <FileText className="h-4 w-4 mr-2" />
                  Confirm Order
                </Button>
              </>
            )}
            
            {order.status === "CONFIRMED" && (
              <Button 
                size="sm"
                asChild
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Link href={`/erp/sales/orders/${order.id}/verify`} transitionTypes={["nav-forward"]}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Warehouse Verify
                </Link>
              </Button>
            )}
            
            {order.status === "WAREHOUSE_VERIFIED" && (
              <Button 
                size="sm"
                asChild
              >
                <Link href={`/erp/sales/delivery-challans/create?salesOrderId=${order.id}`} transitionTypes={["nav-forward"]}>
                  <Truck className="h-4 w-4 mr-2" />
                  Create Delivery Challan
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          {/* Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">Name:</span> {order.customer.name}
                </div>
                <div>
                  <span className="font-medium">Code:</span> {order.customer.code}
                </div>
                {order.customer.email && (
                  <div>
                    <span className="font-medium">Email:</span> {order.customer.email}
                  </div>
                )}
                {order.customer.phone && (
                  <div>
                    <span className="font-medium">Phone:</span> {order.customer.phone}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">Order No:</span> {order.orderNo}
                </div>
                <div>
                  <span className="font-medium">Date:</span> {new Date(order.orderDate).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Warehouse:</span> {order.warehouse?.name || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Status:</span> 
                  <Badge className={`ml-2 ${getStatusColor(order.status)}`}>
                    {order.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items ({order.items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Sale Price</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.item?.description || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.item?.sku || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.salePrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.discount || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({order.taxRate}%):</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>{formatCurrency(order.discount || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(order.grandTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Print View */}
      <div id="print-section" className="hidden print:block min-h-screen bg-white p-0">
        <div className="w-full max-w-[1000px] mx-auto bg-white text-black p-6 font-sans print:p-6 print:max-w-none box-border text-xs">
          {/* Header Title */}
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold tracking-tight">Speed (Private) Limited</h1>
            <h2 className="text-lg font-bold">Delivery Order Note</h2>
            <div className="border-b-2 border-black my-2"></div>
            <div className="text-base font-bold tracking-widest py-1">NIKE</div>
            <div className="border-b-2 border-black my-2"></div>
          </div>

          {/* Metadata Fields Section */}
          <div className="space-y-1 mb-4 text-xs font-sans">
            <div className="grid grid-cols-3 gap-2">
              <div><span className="font-bold inline-block w-28">Financial Year :</span> {getFinancialYear(order.orderDate)}</div>
              <div></div>
              <div></div>
            </div>

            <div className="grid grid-cols-1 gap-1">
              <div><span className="font-bold inline-block w-36">Stock Deliverd From :</span> {order.warehouse?.name || 'Warehouse'}</div>
              <div><span className="font-bold inline-block w-36">Customer Name :</span> {order.customer?.name || 'N/A'}</div>
              <div><span className="font-bold inline-block w-36">Address :</span> {order.customer?.address || 'N/A'}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div><span className="font-bold inline-block w-36">D.O.N. No :</span> {order.orderNo}</div>
              <div><span className="font-bold inline-block w-16">Date :</span> {formatDateDisplay(order.orderDate)}</div>
            </div>

            <div className="grid grid-cols-1 gap-1">
              <div><span className="font-bold inline-block w-36">S.O.N. No :</span> 0</div>
              <div><span className="font-bold inline-block w-36">Employee :</span> Noman</div>
              <div><span className="font-bold inline-block w-36">Remarks :</span> {order.notes || 'SU-26 1ST SHIPMENT FW (BA)'}</div>
            </div>

            <div className="border-b-2 border-black pt-2 mb-2"></div>
          </div>

          {/* Grouped Items Table */}
          <table className="w-full text-xs font-sans border-collapse">
            <thead>
              <tr className="border-y-2 border-black font-bold">
                <th className="py-2 text-left w-[40%]">GPC / Category / Product</th>
                <th className="py-2 text-center w-[20%]">Color</th>
                <th className="py-2 text-center w-[10%]">Size</th>
                <th className="py-2 text-right w-[10%]">Quantity</th>
                <th className="py-2 text-right w-[10%]">Selling Price (Rs.)</th>
                <th className="py-2 text-right w-[10%]">Total Value (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {groupOrderItems(order.items || []).map((cat, catIdx) => (
                <React.Fragment key={catIdx}>
                  {/* Category Header Row */}
                  <tr className="border-t-2 border-black font-bold">
                    <td className="py-1 uppercase" colSpan={3}>{cat.name}</td>
                    <td className="py-1 text-right">{formatNumber(cat.totalQty)}</td>
                    <td className="py-1 text-right"></td>
                    <td className="py-1 text-right">{formatNumber(cat.totalValue)}</td>
                  </tr>
                  <tr className="border-b border-dotted border-black">
                    <td colSpan={6}></td>
                  </tr>

                  {cat.divisions.map((div, divIdx) => (
                    <React.Fragment key={divIdx}>
                      {/* Division / Gender Row (if present) */}
                      {div.name && (
                        <tr className="font-bold">
                          <td className="py-1 pl-4 uppercase" colSpan={3}>{div.name}</td>
                          <td className="py-1 text-right">{formatNumber(div.totalQty)}</td>
                          <td className="py-1 text-right"></td>
                          <td className="py-1 text-right">{formatNumber(div.totalValue)}</td>
                        </tr>
                      )}

                      {div.subCategories.map((sub, subIdx) => (
                        <React.Fragment key={subIdx}>
                          {/* Brand / SubCategory Row (if present) */}
                          {sub.name && (
                            <tr className="font-bold">
                              <td className="py-1 pl-8 uppercase" colSpan={3}>{sub.name}</td>
                              <td className="py-1 text-right">{formatNumber(sub.totalQty)}</td>
                              <td className="py-1 text-right"></td>
                              <td className="py-1 text-right">{formatNumber(sub.totalValue)}</td>
                            </tr>
                          )}
                          <tr className="border-b border-dotted border-black">
                            <td colSpan={6}></td>
                          </tr>

                          {sub.products.map((prod, prodIdx) => (
                            <React.Fragment key={prodIdx}>
                              {/* Product SKU Row */}
                              <tr>
                                <td className="py-0.5 pl-12 text-gray-800 text-[11px]" colSpan={6}>
                                  {prod.sku}
                                </td>
                              </tr>
                              {/* Product Description & Summary Row */}
                              <tr>
                                <td className="py-0.5 pl-12 font-semibold" colSpan={3}>{prod.description}</td>
                                <td className="py-0.5 text-right">{formatNumber(prod.totalQty)}</td>
                                <td className="py-0.5 text-right">{formatNumber(prod.sellingPrice)}</td>
                                <td className="py-0.5 text-right">{formatNumber(prod.totalValue)}</td>
                              </tr>
                              <tr className="border-b border-dotted border-black">
                                <td colSpan={6}></td>
                              </tr>

                              {/* Color & Size Breakdown Rows */}
                              {prod.items.map((it, itIdx) => (
                                <tr key={itIdx}>
                                  <td className="py-0.5"></td>
                                  <td className="py-0.5 text-center text-gray-800">{it.color}</td>
                                  <td className="py-0.5 text-center font-medium">{it.size}</td>
                                  <td className="py-0.5 text-right">{formatNumber(it.qty)}</td>
                                  <td className="py-0.5 text-right"></td>
                                  <td className="py-0.5 text-right">{formatNumber(it.totalValue)}</td>
                                </tr>
                              ))}
                            </React.Fragment>
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
  );
}