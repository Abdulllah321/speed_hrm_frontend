'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, FileSpreadsheet, FileText, Loader2, RefreshCw, Search } from 'lucide-react';
import { authFetch } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/utils';
import { PermissionGuard } from '@/components/auth/permission-guard';

export interface PoRegisterVariantRow {
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PoRegisterProductGroup {
  articleCode: string;
  articleName: string;
  variants: PoRegisterVariantRow[];
  totalQuantity: number;
  totalAmount: number;
}

export interface PoRegisterSubcategoryGroup {
  subCategoryName: string;
  products: PoRegisterProductGroup[];
  totalQuantity: number;
  totalAmount: number;
}

export interface PoRegisterCategoryGroup {
  categoryName: string;
  subcategories: PoRegisterSubcategoryGroup[];
  totalQuantity: number;
  totalAmount: number;
}

export interface PoRegisterDocumentGroup {
  poId: string;
  poNumber: string;
  docNoDisplay: string;
  orderDate: string;
  supplierName: string;
  supplierLocation: string;
  orderType?: string;
  goodsType?: string;
  status: string;
  categories: PoRegisterCategoryGroup[];
  totalQuantity: number;
  totalAmount: number;
}

export interface PoRegisterBrandGroup {
  brandId: string;
  brandName: string;
  documents: PoRegisterDocumentGroup[];
  totalQuantity: number;
  totalAmount: number;
}

export interface PoRegisterReportResult {
  brands: PoRegisterBrandGroup[];
  grandTotals: {
    quantity: number;
    amount: number;
  };
  startDate: string;
  endDate: string;
  appliedFilters: {
    brandId?: string;
    vendorId?: string;
    orderType?: string;
    goodsType?: string;
    status?: string;
    search?: string;
  };
}

export default function PurchaseOrderRegisterPage() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [orderType, setOrderType] = useState('ALL');
  const [goodsType, setGoodsType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);

  const [reportData, setReportData] = useState<PoRegisterReportResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Export State
  const [exportState, setExportState] = useState<'idle' | 'queueing' | 'processing' | 'completed' | 'failed'>('idle');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'pdf'>('xlsx');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportJobId, setExportJobId] = useState<string | null>(null);

  useEffect(() => {
    fetchOptions();
    fetchReport();
  }, []);

  const fetchOptions = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const [brandRes, vendorRes] = await Promise.all([
        authFetch(`${baseUrl}/master/brand`),
        authFetch(`${baseUrl}/vendors`),
      ]);

      if (brandRes.ok && brandRes.data) {
        const bList = Array.isArray(brandRes.data) ? brandRes.data : brandRes.data.data || [];
        setBrands(bList);
      }
      if (vendorRes.ok && vendorRes.data) {
        const vList = Array.isArray(vendorRes.data) ? vendorRes.data : vendorRes.data.data || [];
        setVendors(vList);
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const baseUrl = getApiBaseUrl();
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedBrand && selectedBrand !== 'ALL') params.append('brandId', selectedBrand);
      if (selectedVendor && selectedVendor !== 'ALL') params.append('vendorId', selectedVendor);
      if (orderType && orderType !== 'ALL') params.append('orderType', orderType);
      if (goodsType && goodsType !== 'ALL') params.append('goodsType', goodsType);
      if (status && status !== 'ALL') params.append('status', status);
      if (search) params.append('search', search);

      const res = await authFetch(`${baseUrl}/api/purchase-order/register-report?${params.toString()}`);
      if (res.ok && res.data) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Error fetching PO Register report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    try {
      setExportFormat(format);
      setExportState('queueing');
      setExportProgress(0);

      const baseUrl = getApiBaseUrl();
      const res = await authFetch(`${baseUrl}/api/purchase-order/register-report/export`, {
        method: 'POST',
        body: JSON.stringify({
          startDate,
          endDate,
          brandId: selectedBrand !== 'ALL' ? selectedBrand : undefined,
          vendorId: selectedVendor !== 'ALL' ? selectedVendor : undefined,
          orderType: orderType !== 'ALL' ? orderType : undefined,
          goodsType: goodsType !== 'ALL' ? goodsType : undefined,
          status: status !== 'ALL' ? status : undefined,
          format,
          search: search || undefined,
        }),
      });

      if (res.ok && res.data?.jobId) {
        const jobId = res.data.jobId;
        setExportJobId(jobId);
        setExportState('processing');

        const interval = setInterval(async () => {
          try {
            const statusRes = await authFetch(`${baseUrl}/api/purchase-order/register-report/export/${jobId}/status`);
            if (statusRes.ok && statusRes.data) {
              setExportProgress(statusRes.data.progress || 0);
              if (statusRes.data.state === 'completed') {
                setExportState('completed');
                clearInterval(interval);
                // Trigger auto download
                window.open(`${baseUrl}/api/purchase-order/register-report/export/${jobId}/download`, '_blank');
              } else if (statusRes.data.state === 'failed') {
                setExportState('failed');
                clearInterval(interval);
              }
            }
          } catch (e) {
            console.error('Error checking export status:', e);
          }
        }, 2000);
      } else {
        setExportState('failed');
      }
    } catch (err) {
      console.error('Error initiating export:', err);
      setExportState('failed');
    }
  };

  const handleDownloadCompleted = () => {
    if (exportJobId) {
      const baseUrl = getApiBaseUrl();
      window.open(`${baseUrl}/api/purchase-order/register-report/export/${exportJobId}/download`, '_blank');
    }
  };

  return (
    <PermissionGuard permissions="erp.procurement.po.read">
      <div className="p-6 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link href="/erp/procurement/purchase-order">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Purchase Order Register Report
              </h1>
              <p className="text-sm text-slate-500">
                Hierarchical PO ledger grouped by Brand, Document, Category, Subcategory, Article & Variant details.
              </p>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            {exportState === 'completed' ? (
              <Button onClick={handleDownloadCompleted} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                <Download className="mr-2 h-4 w-4" /> Download {exportFormat.toUpperCase()}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleExport('xlsx')}
                  disabled={exportState === 'queueing' || exportState === 'processing'}
                  className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400"
                >
                  {exportState === 'processing' && exportFormat === 'xlsx' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating {exportProgress}%
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Export Excel
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleExport('pdf')}
                  disabled={exportState === 'queueing' || exportState === 'processing'}
                  className="border-rose-600 text-rose-700 hover:bg-rose-50 dark:border-rose-500 dark:text-rose-400"
                >
                  {exportState === 'processing' && exportFormat === 'pdf' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating {exportProgress}%
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4 text-rose-600" /> Export PDF
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters Card */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Report Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 mt-1" />
              </div>

              <div>
                <Label className="text-xs">End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 mt-1" />
              </div>

              <div>
                <Label className="text-xs">Brand</Label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full h-9 mt-1 rounded-md border border-slate-200 dark:border-slate-800 bg-background px-3 text-xs"
                >
                  <option value="ALL">All Brands</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">Supplier / Vendor</Label>
                <select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="w-full h-9 mt-1 rounded-md border border-slate-200 dark:border-slate-800 bg-background px-3 text-xs"
                >
                  <option value="ALL">All Suppliers</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">Order Type</Label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="w-full h-9 mt-1 rounded-md border border-slate-200 dark:border-slate-800 bg-background px-3 text-xs"
                >
                  <option value="ALL">All Order Types</option>
                  <option value="LOCAL">LOCAL</option>
                  <option value="IMPORT">IMPORT</option>
                </select>
              </div>

              <div>
                <Label className="text-xs">Goods Type</Label>
                <select
                  value={goodsType}
                  onChange={(e) => setGoodsType(e.target.value)}
                  className="w-full h-9 mt-1 rounded-md border border-slate-200 dark:border-slate-800 bg-background px-3 text-xs"
                >
                  <option value="ALL">All Goods Types</option>
                  <option value="FRESH">FRESH</option>
                  <option value="CONSUMABLE">CONSUMABLE</option>
                </select>
              </div>

              <div>
                <Label className="text-xs">Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-9 mt-1 rounded-md border border-slate-200 dark:border-slate-800 bg-background px-3 text-xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="PENDING_CHECKER">PENDING CHECKER</option>
                  <option value="PENDING_AUTHORIZER">PENDING AUTHORIZER</option>
                  <option value="OPEN">OPEN</option>
                  <option value="PARTIALLY_RECEIVED">PARTIALLY RECEIVED</option>
                  <option value="RECEIVED">RECEIVED</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div>
                <Label className="text-xs">Search</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search PO #, Supplier, Article..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-9 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" onClick={fetchReport} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Visual Report Card Preview */}
        <Card className="bg-white border border-slate-200 shadow-sm p-6 text-slate-900 font-sans">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
          ) : !reportData || reportData.brands.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No purchase order records match the selected filter criteria.
            </div>
          ) : (
            <div className="space-y-8">
              {/* Report Header Title */}
              <div className="relative text-center border-b pb-4">
                <h2 className="text-xl font-bold text-red-600 underline tracking-wide">
                  Purchase Order Register
                </h2>
                <div className="absolute right-0 top-0 text-red-600 font-bold underline text-sm">
                  {reportData.startDate} - {reportData.endDate}
                </div>
              </div>

              {/* Brands Hierarchy Loop */}
              {reportData.brands.map((brand) => (
                <div key={brand.brandId} className="space-y-6">
                  {/* Brand Level Header */}
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-teal-700 border-b-2 border-teal-700 inline-block px-8 pb-1 tracking-wider uppercase">
                      {brand.brandName}
                    </h3>
                  </div>

                  {/* Documents Loop */}
                  {brand.documents.map((doc) => (
                    <div key={doc.poId} className="space-y-3">
                      {/* Document Card Header Box */}
                      <div className="border border-slate-900 bg-slate-50/50 p-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-6">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Document #</span>
                            <span className="text-red-600 font-bold text-base underline">{doc.docNoDisplay}</span>
                            <span className="text-slate-500 text-[11px] ml-1.5">({doc.poNumber})</span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Date</span>
                            <span className="font-semibold text-slate-800">{doc.orderDate}</span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Supplier</span>
                            <span className="font-semibold text-slate-900">{doc.supplierName}</span>
                            <span className="text-slate-500 ml-2">({doc.supplierLocation})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {doc.orderType && <Badge variant="outline" className="text-[10px] font-semibold">{doc.orderType}</Badge>}
                          {doc.goodsType && <Badge variant="outline" className="text-[10px] font-semibold">{doc.goodsType}</Badge>}
                          <Badge className="text-[10px] font-semibold bg-slate-800 text-white">{doc.status}</Badge>
                        </div>
                      </div>

                      {/* Main Report Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-900 text-left font-bold text-slate-800">
                              <th className="py-1.5 px-2 w-[55%]">GPC / Category / Product</th>
                              <th className="py-1.5 px-2 text-center w-[20%]">Color</th>
                              <th className="py-1.5 px-2 text-center w-[12%]">Size</th>
                              <th className="py-1.5 px-2 text-right w-[13%]">Quantity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {doc.categories.map((cat, catIdx) => (
                              <React.Fragment key={catIdx}>
                                {/* Category Header (Green) */}
                                <tr className="border-b border-slate-100">
                                  <td className="py-1 px-2 font-bold text-emerald-700 uppercase">
                                    {cat.categoryName}
                                  </td>
                                  <td></td>
                                  <td></td>
                                  <td className="py-1 px-2 text-right font-bold text-emerald-700">
                                    {cat.totalQuantity.toLocaleString()}
                                  </td>
                                </tr>

                                {cat.subcategories.map((subCat, subIdx) => (
                                  <React.Fragment key={subIdx}>
                                    {/* Subcategory Header (Purple) */}
                                    <tr className="border-b border-slate-100">
                                      <td className="py-1 pl-6 pr-2 font-bold text-purple-700 uppercase">
                                        {subCat.subCategoryName}
                                      </td>
                                      <td></td>
                                      <td></td>
                                      <td className="py-1 px-2 text-right font-bold text-purple-700">
                                        {subCat.totalQuantity.toLocaleString()}
                                      </td>
                                    </tr>

                                    {subCat.products.map((prod, prodIdx) => (
                                      <React.Fragment key={prodIdx}>
                                        {/* Product / Article Header (Blue) */}
                                        <tr>
                                          <td className="py-1 pl-12 pr-2 font-bold text-blue-600">
                                            <div className="underline">{prod.articleCode}</div>
                                            <div className="text-[11px]">{prod.articleName}</div>
                                          </td>
                                          <td></td>
                                          <td></td>
                                          <td className="py-1 px-2 text-right font-bold text-blue-600 align-top">
                                            {prod.totalQuantity.toLocaleString()}
                                          </td>
                                        </tr>

                                        {/* Variant Detail Rows */}
                                        {prod.variants.map((v, vIdx) => (
                                          <tr key={vIdx} className="hover:bg-slate-50 border-b border-slate-50">
                                            <td className="py-0.5 pl-16"></td>
                                            <td className="py-0.5 text-center text-slate-700 font-medium">{v.color}</td>
                                            <td className="py-0.5 text-center text-slate-700 font-medium">{v.size}</td>
                                            <td className="py-0.5 text-right font-semibold text-slate-900 pr-2">{v.quantity.toLocaleString()}</td>
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
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PermissionGuard>
  );
}
import React from 'react';
