import { NextRequest } from "next/server";

import { proxyToDjangoPrint } from "@/lib/api/print-proxy";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await ctx.params;
  return proxyToDjangoPrint(req, `scan/${orderId}/`);
}
