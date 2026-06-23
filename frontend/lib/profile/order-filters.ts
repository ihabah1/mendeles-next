import type { UiOrder } from "@/lib/api";

export type DrawContext = {
  lastLotteryId: number | null;
  lastDrawDate: string | null;
};

export function isOrderActive(order: UiOrder, ctx: DrawContext): boolean {
  if (order.lotteryId != null && ctx.lastLotteryId != null) {
    return order.lotteryId > ctx.lastLotteryId;
  }
  const drawDate = order.drawDate?.slice(0, 10);
  if (drawDate && ctx.lastDrawDate) {
    return drawDate >= ctx.lastDrawDate;
  }
  if (drawDate) {
    const today = new Date().toISOString().slice(0, 10);
    return drawDate >= today;
  }
  return order.status !== "completed" && order.status !== "cancelled";
}

export function submissionStatusLabel(status: string, hasScan: boolean): string {
  if (hasScan || status === "completed") return "הוגש לדוכן";
  const map: Record<string, string> = {
    pending: "ממתין לתשלום",
    paid: "שולם — בתור",
    printing: "בהדפסה",
    printed: "הודפס — ממתין לסריקה",
    shipped: "נשלח",
    completed: "הושלם",
    cancelled: "בוטל",
  };
  return map[status] || status;
}

export function gameAndDrawLabel(order: UiOrder): string {
  const draw = order.drawDate?.slice(0, 10) || "—";
  const lotto = order.lotteryId ? `לוטו #${order.lotteryId}` : "לוטו";
  return `${lotto} · ${draw}`;
}

export function formatOrderDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}
