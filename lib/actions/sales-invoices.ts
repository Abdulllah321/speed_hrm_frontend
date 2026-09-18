'use server';

import { authFetch } from '../auth';

export async function getSalesInvoiceById(id: string) {
  try {
    const res = await authFetch(`/sales/invoices/${id}`, {
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return { status: false, data: null, message: res.data?.message || 'Invoice not found' };
    }
    const data = res.data?.data ?? res.data;
    return { status: true, data };
  } catch (error: any) {
    return { status: false, data: null, message: error.message || 'Failed to fetch invoice' };
  }
}

export async function postSalesInvoice(id: string) {
  try {
    const res = await authFetch(`/sales/invoices/${id}/post`, {
      method: 'POST',
    });
    return { status: res.ok, data: res.data?.data ?? res.data, message: res.data?.message };
  } catch (error: any) {
    return { status: false, message: error.message || 'Failed to post invoice' };
  }
}

export async function cancelSalesInvoice(id: string) {
  try {
    const res = await authFetch(`/sales/invoices/${id}/cancel`, {
      method: 'POST',
    });
    return { status: res.ok, data: res.data?.data ?? res.data, message: res.data?.message };
  } catch (error: any) {
    return { status: false, message: error.message || 'Failed to cancel invoice' };
  }
}

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
