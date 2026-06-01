import type { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require("@prisma/client");
  return new PrismaClient({ log: ["error"] });
}

function getClient(): PrismaClient {
  if (!global._prisma) {
    global._prisma = createClient();
  }
  return global._prisma;
}

/** Lazy Prisma client — safe for Next.js production builds (generate runs in `npm run build`). */
const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;
