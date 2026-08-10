'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { salesReturnApi, SalesReturn } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PermissionGuard } from "@/components/auth/permission-guard";

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function SalesReturnsPage() {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadReturns();
  }, [statusFilter]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const data = await salesReturnApi.list(statusFilter !== 'ALL' ? { status: statusFilter } : undefined);
      setReturns(data);
    } catch (error) {
      console.error('Error loading sales returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sales return?')) return;
    try {
      await salesReturnApi.delete(id);
      loadReturns();
    } catch (error) {
      console.error('Error deleting sales return:', error);
      alert('Error deleting sales return');
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading sales returns...</div>;
  }

  return (
    <PermissionGuard permissions="erp.sales.invoice.read">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Sales Returns</h1>
            <p className="text-gray-600">Manage goods returned by customers</p>
          </div>
          <Link href="/erp/sales/sales-returns/create" transitionTypes={["nav-forward"]}>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Create Sales Return
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Returns Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Returns ({returns.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {returns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No sales returns found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Return #</th>
                      <th className="text-left p-3">Source</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Warehouse</th>
                      <th className="text-left p-3">Return Type</th>
                      <th className="text-left p-3">Amount</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map((returnItem) => {
                      const sourceDoc = returnItem.salesInvoice?.invoiceNo || returnItem.deliveryChallan?.challanNo || 'N/A';
                      return (
                        <tr key={returnItem.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{returnItem.returnNumber}</td>
                          <td className="p-3 font-mono text-xs">{sourceDoc}</td>
                          <td className="p-3">{returnItem.customer?.name || 'Unknown'}</td>
                          <td className="p-3">{returnItem.warehouse?.name || 'N/A'}</td>
                          <td className="p-3">
                            <Badge variant="outline">{returnItem.returnType}</Badge>
                          </td>
                          <td className="p-3 font-semibold">{formatCurrency(returnItem.totalAmount)}</td>
                          <td className="p-3">
                            <Badge className={(statusColors as any)[returnItem.status]}>
                              {returnItem.status}
                            </Badge>
                          </td>
                          <td className="p-3">{formatDate(returnItem.returnDate)}</td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Link href={`/erp/sales/sales-returns/${returnItem.id}`} transitionTypes={["nav-forward"]}>
                                <Button size="sm" variant="outline">
                                  <Eye className="w-4 h-4 mr-1" /> View
                                </Button>
                              </Link>
                              {returnItem.status === 'DRAFT' && (
                                <>
                                  <Link href={`/erp/sales/sales-returns/${returnItem.id}/edit`} transitionTypes={["nav-forward"]}>
                                    <Button size="sm" variant="outline">
                                      <Edit className="w-4 h-4 mr-1" /> Edit
                                    </Button>
                                  </Link>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => handleDelete(returnItem.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
