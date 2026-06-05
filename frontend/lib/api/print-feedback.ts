/** User-facing message after POST to print server. */
export interface PrintFeedbackResponse {
  detail?: string;
  tables_count?: number;
  order_number?: string;
  printer_confirmed?: boolean;
}

export function formatPrintSuccessMessage(
  res: PrintFeedbackResponse,
  fallbackTables?: number,
): string {
  if (res.detail?.trim()) return res.detail.trim();
  const n = res.tables_count ?? fallbackTables;
  const order = res.order_number?.trim();
  let msg = "נשלח להדפסה בהצלחה";
  if (order) msg += ` — ${order}`;
  if (n != null && n > 0) msg += ` (${n} טבלאות)`;
  if (res.printer_confirmed) msg += " · המדפסת אישרה";
  return `${msg} 🖨️`;
}
