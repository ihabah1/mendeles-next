/* eslint-disable @typescript-eslint/no-explicit-any */
const { PrismaClient } = require("@prisma/client");

declare global { var _prisma: any; }

export const prisma: any =
  global._prisma ||
  new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") {
  global._prisma = prisma;
}

export default prisma;
