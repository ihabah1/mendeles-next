/** Maps Django API shapes to UI-friendly field names used across pages. */
import type { Order as ApiOrder, OrderSet } from "./types";

export interface UiOrder {
  id: number;
  orderNumber: string;
  tablesCount: number;
  totalIls: number;
  status: string;
  drawDate: string;
  createdAt: string;
  hasScan?: boolean;
  sets: OrderSet[];
  isDouble: boolean;
  lotteryId: number | null;
  hasInvoice: boolean;
  invoiceDocNumber: string;
  invoicePdfLink: string;
  invoiceIssuedAt: string | null;
  printedAt: string | null;
  scannedAt: string | null;
}

export interface UiTransaction {
  id: number;
  type: string;
  amountIls: number;
  description: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "ממתין 🕐",
  paid: "שולם ✅",
  printing: "בדפוס 🖨️",
  printed: "הודפס 🖨️",
  shipped: "נשלח 📬",
  sent: "נשלח 📬",
  completed: "הושלם ✅",
  delivered: "הוגש ✅",
  cancelled: "בוטל ❌",
};

export function orderStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function mapApiOrder(o: ApiOrder): UiOrder {
  return {
    id: o.id,
    orderNumber: o.order_number,
    tablesCount: o.forms_count,
    totalIls: Number(o.amount_ils),
    status: o.status,
    drawDate: o.draw_name || "",
    createdAt: o.created_at,
    hasScan: Boolean(o.has_scan),
    sets: o.sets_json || [],
    isDouble: Boolean(o.is_double),
    lotteryId: o.lottery_id ?? null,
    hasInvoice: Boolean(o.has_invoice),
    invoiceDocNumber: o.invoice_doc_number || "",
    invoicePdfLink: o.invoice_pdf_link || "",
    invoiceIssuedAt: o.invoice_issued_at ?? null,
    printedAt: o.printed_at ?? null,
    scannedAt: o.scanned_at ?? null,
  };
}

export function mapApiOrders(results: ApiOrder[]): UiOrder[] {
  return results.map(mapApiOrder);
}
