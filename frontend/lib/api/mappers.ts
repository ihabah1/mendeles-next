/** Maps Django API shapes to UI-friendly field names used across pages. */
import type { Order as ApiOrder } from "./types";

export interface UiOrder {
  id: number;
  orderNumber: string;
  tablesCount: number;
  totalIls: number;
  status: string;
  drawDate: string;
  createdAt: string;
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
  };
}

export function mapApiOrders(results: ApiOrder[]): UiOrder[] {
  return results.map(mapApiOrder);
}
