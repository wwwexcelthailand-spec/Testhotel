import { PrismaClient } from "@prisma/client";

// ถ้ามี SUPABASE_DATABASE_URL ที่เป็น postgresql:// แต่ไม่มี DATABASE_URL ให้ map อัตโนมัติ
if (!process.env.DATABASE_URL && process.env.SUPABASE_DATABASE_URL?.startsWith("postgresql://")) {
  process.env.DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
