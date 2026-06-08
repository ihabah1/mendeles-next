import { NextRequest } from "next/server";

import { proxyToDjangoPrint } from "@/lib/api/print-proxy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return proxyToDjangoPrint(req, "confirm/");
}
