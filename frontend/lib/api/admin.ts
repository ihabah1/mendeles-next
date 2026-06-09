/** Admin dashboard service — staff-only endpoints on the Django API. */
import api from "./client";
import type { PreviewForm } from "@/components/admin/LottoFormPreview";
/** Admin dashboard order row (camelCase from /admin/orders/). */
export interface AdminOrder {
  id: number;
  orderNumber: string;
  tablesCount: number;
  totalIls: number;
  status: string;
  drawDate: string;
  createdAt: string;
  user?: { name: string; phone?: string; email?: string; username?: string | null };
  icountDocNumber?: string | null;
  icountPdfLink?: string | null;
  icountDocId?: string | null;
  invoiceIssuedAt?: string | null;
  printedAt?: string | null;
  scannedAt?: string | null;
  hasScan?: boolean;
}

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

  async orders(params?: {
    status?: string;
    q?: string;
    has_scan?: boolean;
    has_invoice?: boolean;
  }): Promise<{
    orders: AdminOrder[];
    count: number;
    integrations?: { icount: IntegrationStatus; print: IntegrationStatus };
    logs?: IntegrationLogEntry[];
  }> {
    const query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.q?.trim()) query.q = params.q.trim();
    if (params?.has_scan === true) query.has_scan = "true";
    if (params?.has_scan === false) query.has_scan = "false";
    if (params?.has_invoice === true) query.has_invoice = "true";
    if (params?.has_invoice === false) query.has_invoice = "false";
    const { data } = await api.get<{
      orders: AdminOrder[];
      count: number;
      integrations?: { icount: IntegrationStatus; print: IntegrationStatus };
      logs?: IntegrationLogEntry[];
    }>("/admin/orders/", { params: Object.keys(query).length ? query : undefined });
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
    queued?: boolean;
  }> {
    const { data } = await api.post<{
      detail: string;
      tables_count?: number;
      order_number?: string;
      printer_confirmed?: boolean;
      queued?: boolean;
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

  async refreshDraw(lotteryId?: string | number): Promise<{
    detail: string;
    last_draw: {
      date: string;
      numbers: number[];
      strong: number;
      lottery_id: number;
    };
    prizes: Record<string, { name: string; ils: number; winners?: number }>;
    updated_at?: string;
  }> {
    const { data } = await api.post("/admin/draw/refresh/", {
      lottery_id: lotteryId || undefined,
    });
    return data;
  },

  async getDraw(): Promise<{
    last_draw: {
      date: string;
      numbers: number[];
      strong: number;
      lottery_id: number;
    } | null;
    prizes: Record<string, { name: string; ils: number }> | null;
    updated_at?: string | null;
  }> {
    const { data } = await api.get("/admin/draw/");
    return data;
  },

  async checkWins(options?: { dry_run?: boolean }): Promise<{
    lottery_id: number;
    draw_date: string;
    dry_run: boolean;
    wins: number;
    credited: number;
    skipped_already: number;
    total_prize_ils: number;
    details: Array<{
      order_number: string;
      rank: string;
      prize_ils: number;
      status: string;
    }>;
  }> {
    const { data } = await api.post("/admin/lotto/check-wins/", {
      dry_run: options?.dry_run ?? false,
    });
    return data;
  },

  async getFormPreview(orderId: number): Promise<{
    orderId: number;
    orderNumber: string;
    forms: PreviewForm[];
    drawDate: string;
    isDouble: boolean;
    tablesCount: number;
    customerName: string;
  }> {
    const { data } = await api.get<{
      orderId: number;
      orderNumber: string;
      forms: PreviewForm[];
      drawDate: string;
      isDouble: boolean;
      tablesCount: number;
      customerName: string;
    }>(`/admin/orders/${orderId}/form-preview/`);
    return data;
  },

  async openOrderScan(orderId: number): Promise<void> {
    const { data } = await api.get<Blob>(`/orders/${orderId}/scan/`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(data);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
