'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import { creditNoteApi, CreditNote } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PermissionGuard } from "@/components/auth/permission-guard";

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  APPROVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function CreditNotesPage() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCreditNotes();
  }, []);

  const loadCreditNotes = async () => {
    try {
      setLoading(true);
      const data = await creditNoteApi.getAll();
      setCreditNotes(data);
    } catch (error) {
      console.error('Error loading credit notes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading credit notes...</div>;
  }

  return (
    <PermissionGuard permissions="erp.sales.invoice.read">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Credit Notes</h1>
            <p className="text-gray-600">Customer financial adjustments and return credits</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Credit Notes ({creditNotes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {creditNotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No credit notes found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Credit Note #</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Amount</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Source Return</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditNotes.map((note) => (
                      <tr key={note.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{note.creditNoteNo}</td>
                        <td className="p-3">{note.customer?.name || 'N/A'}</td>
                        <td className="p-3 font-semibold text-green-600">{formatCurrency(note.amount)}</td>
                        <td className="p-3">
                          <Badge className={(statusColors as any)[note.status] || 'bg-gray-100'}>
                            {note.status}
                          </Badge>
                        </td>
                        <td className="p-3">{formatDate(note.date)}</td>
                        <td className="p-3 underline text-blue-600">
                          {note.salesReturn?.returnNumber ? (
                            <Link href={`/erp/sales/sales-returns/${note.salesReturnId}`} transitionTypes={["nav-forward"]}>
                              {note.salesReturn.returnNumber}
                            </Link>
                          ) : 'N/A'}
                        </td>
                        <td className="p-3">
                          <Link href={`/erp/sales/credit-notes/${note.id}`} transitionTypes={["nav-forward"]}>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" /> View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
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
