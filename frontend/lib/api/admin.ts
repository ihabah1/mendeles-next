/** Admin dashboard service — staff-only endpoints on the Django API. */
import api from "./client";
import type { UiOrder } from "./mappers";

export interface AdminStats {
  total_users: number;
  new_today: number;
  active_subs: number;
  pending_orders: number;
  total_revenue: number;
  total_wins: number;
  total_prize: number;
}

export interface IntegrationStatus {
  configured: boolean;
  hint?: string | null;
  api_url?: string;
  doctype?: string;
}

export interface IntegrationLogEntry {
  id: number;
  source: string;
  level: string;
  message: string;
  orderId: number | null;
  orderNumber: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export const adminService = {
  async stats(): Promise<AdminStats> {
    const { data } = await api.get<AdminStats>("/admin/stats/");
    return data;
  },

  async orders(status?: string): Promise<{
    orders: UiOrder[];
    count: number;
    integrations?: { icount: IntegrationStatus; print: IntegrationStatus };
    logs?: IntegrationLogEntry[];
  }> {
    const { data } = await api.get<{
      orders: UiOrder[];
      count: number;
      integrations?: { icount: IntegrationStatus; print: IntegrationStatus };
      logs?: IntegrationLogEntry[];
    }>("/admin/orders/", { params: status ? { status } : undefined });
    return data;
  },

  async integrationLogs(params?: {
    source?: string;
    limit?: number;
  }): Promise<{
    logs: IntegrationLogEntry[];
    integrations: { icount: IntegrationStatus; print: IntegrationStatus };
  }> {
    const { data } = await api.get<{
      logs: IntegrationLogEntry[];
      integrations: { icount: IntegrationStatus; print: IntegrationStatus };
    }>("/admin/integration-logs/", { params });
    return data;
  },

  async updateOrderStatus(orderId: number, status: string): Promise<void> {
    await api.patch("/admin/orders/", { order_id: orderId, status });
  },

  async printOrder(orderId: number): Promise<{
    detail: string;
    tables_count?: number;
    order_number?: string;
    printer_confirmed?: boolean;
  }> {
    const { data } = await api.post<{
      detail: string;
      tables_count?: number;
      order_number?: string;
      printer_confirmed?: boolean;
    }>(`/admin/orders/${orderId}/print/`);
    return data;
  },

  async issueInvoice(orderId: number): Promise<{
    detail: string;
    doc_number?: string;
    pdf_link?: string;
    invoice_issued_at?: string;
  }> {
    const { data } = await api.post<{
      detail: string;
      doc_number?: string;
      pdf_link?: string;
      invoice_issued_at?: string;
    }>(`/admin/orders/${orderId}/invoice/`);
    return data;
  },

  async getInvoice(orderId: number): Promise<{
    doc_number: string;
    doc_id?: string;
    pdf_link?: string | null;
    invoice_issued_at?: string | null;
  }> {
    const { data } = await api.get<{
      doc_number: string;
      doc_id?: string;
      pdf_link?: string | null;
      invoice_issued_at?: string | null;
    }>(`/admin/orders/${orderId}/invoice/`);
    return data;
  },
};
