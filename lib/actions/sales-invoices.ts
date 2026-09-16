'use server';

import { authFetch } from '../auth';

export async function queueSalesInvoicesExport(invoiceIds: string[] = []) {
  try {
    const res = await authFetch('/sales-invoices/export', {
      method: 'POST',
      body: JSON.stringify({ invoiceIds }),
    });
    return { status: res.ok, data: res.data };
  } catch (error: any) {
    return { status: false, message: error.message || 'Failed to queue export' };
  }
}
