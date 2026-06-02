import type { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

/** True when Railway/runtime provides a real Postgres URL (not Docker build dummy). */
export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  if (!url) return false;
  if (/127\.0\.0\.1:5432\/build/.test(url)) return false;
  return true;
}

function createClient(): PrismaClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require("@prisma/client");
  return new PrismaClient({ log: [] });
}

function getClient(): PrismaClient | null {
  if (!isDatabaseConfigured()) return null;
  if (!global._prisma) {
    global._prisma = createClient();
  }
  return global._prisma;
}

/** Lazy Prisma client — no connection when DATABASE_URL is unset (Frontend on Railway without Postgres). */
const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    if (!client) {
      if (prop === "then") return undefined;
      const missing = () => {
        throw new Error("DATABASE_URL is not configured on this service");
      };
      if (typeof prop === "string" && prop.startsWith("$")) {
        return missing;
      }
      return new Proxy(missing, {
        get: () => missing,
        apply: () => missing(),
      });
    }
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;
